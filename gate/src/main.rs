use std::env;
use std::process;

mod audit;
mod config;
mod engine;
mod github;
mod override_token;
mod pagerduty;
mod slack;

use config::Verdict;

#[tokio::main]
async fn main() {
    let cfg_path = env::var("INPUT_CONFIG").unwrap_or(".blackout/blackout.yaml".into());
    let environment = env::var("INPUT_ENVIRONMENT").expect("INPUT_ENVIRONMENT required");
    let api_url = env::var("INPUT_API_URL").expect("INPUT_API_URL required");
    let api_key = env::var("INPUT_API_KEY").expect("INPUT_API_KEY required");
    let github_token = env::var("INPUT_GITHUB_TOKEN").expect("INPUT_GITHUB_TOKEN required");
    let slack_webhook = env::var("INPUT_SLACK_WEBHOOK").ok();
    let pagerduty_key = env::var("INPUT_PAGERDUTY_API_KEY").ok();
    let override_token = env::var("INPUT_OVERRIDE_TOKEN").ok();

    let config = config::load(&cfg_path).expect("Failed to load blackout.yaml");

    let ref_name = env::var("GITHUB_REF_NAME").unwrap_or_default();

    let pd_windows = match pagerduty_key {
        Some(ref key) => pagerduty::fetch_maintenance_windows(&config, key)
            .await
            .unwrap_or_default(),
        None => vec![],
    };

    let verdict = engine::evaluate(&config, &environment, &ref_name, &pd_windows);

    let window_notify = verdict
        .window_id
        .as_ref()
        .and_then(|id| config.windows.iter().find(|w| &w.id == id))
        .map(|w| &w.notify);

    if let Some(token) = &override_token {
        if override_token::validate(token, &api_url, &api_key, &verdict).await {
            audit::record(&api_url, &api_key, &verdict, audit::Action::Overridden).await;
            github::set_status(&github_token, Verdict::Allow, "Override approved.").await;
            process::exit(0);
        }
    }

    audit::record(&api_url, &api_key, &verdict, audit::Action::Evaluated).await;

    match verdict.outcome {
        engine::Outcome::Allowed => {
            github::set_status(&github_token, Verdict::Allow, "No active blackout windows.").await;
            process::exit(0);
        }
        engine::Outcome::Warn => {
            github::set_status(&github_token, Verdict::Warn, &verdict.reason).await;
            if window_notify.map(|n| n.pr_comment).unwrap_or(true) {
                github::post_pr_comment(&github_token, &verdict).await;
            }
            if let Some(ref webhook) = slack_webhook {
                let channels = window_notify.map(|n| n.slack.as_slice()).unwrap_or(&[]);
                slack::notify(webhook, &verdict, channels).await;
            }
            process::exit(0);
        }
        engine::Outcome::Blocked => {
            github::set_status(&github_token, Verdict::Block, &verdict.reason).await;
            if window_notify.map(|n| n.pr_comment).unwrap_or(true) {
                github::post_pr_comment(&github_token, &verdict).await;
            }
            if let Some(ref webhook) = slack_webhook {
                let channels = window_notify.map(|n| n.slack.as_slice()).unwrap_or(&[]);
                slack::notify(webhook, &verdict, channels).await;
            }
            process::exit(1);
        }
    }
}
