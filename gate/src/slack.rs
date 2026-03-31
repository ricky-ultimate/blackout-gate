use reqwest::Client;
use serde::Serialize;

use crate::config::SlackChannel;
use crate::engine::{EvalVerdict, Outcome};

#[derive(Serialize)]
struct SlackPayload {
    channel: String,
    text: String,
    blocks: Vec<SlackBlock>,
}

#[derive(Serialize)]
struct SlackBlock {
    #[serde(rename = "type")]
    kind: String,
    text: Option<SlackText>,
}

#[derive(Serialize)]
struct SlackText {
    #[serde(rename = "type")]
    kind: String,
    text: String,
}

pub async fn notify(webhook: &str, verdict: &EvalVerdict, channels: &[SlackChannel]) {
    let (icon, label) = match verdict.outcome {
        Outcome::Blocked => (":red_circle:", "Deployment Blocked"),
        Outcome::Warn => (":large_yellow_circle:", "Deployment Warning"),
        Outcome::Allowed => (":white_check_mark:", "Deployment Allowed"),
    };

    let repo = std::env::var("GITHUB_REPOSITORY").unwrap_or_else(|_| "unknown".into());
    let branch = std::env::var("GITHUB_REF_NAME").unwrap_or_else(|_| "unknown".into());
    let actor = std::env::var("GITHUB_ACTOR").unwrap_or_else(|_| "unknown".into());

    let summary = format!("{} *{}* — `{}`", icon, label, repo);

    let mut detail = format!(
        "*Branch:* `{}`\n*Triggered by:* {}\n*Reason:* {}",
        branch, actor, verdict.reason
    );

    if verdict.allow_override && !verdict.override_approvers.is_empty() {
        detail.push_str(&format!(
            "\n*Override approvers:* {}",
            verdict
                .override_approvers
                .iter()
                .map(|a| format!("@{}", a))
                .collect::<Vec<_>>()
                .join(", ")
        ));
    }

    let target_channels: Vec<String> = if channels.is_empty() {
        vec!["#deployments".to_string()]
    } else {
        channels.iter().map(|c| c.channel.clone()).collect()
    };

    let client = Client::new();

    for channel in target_channels {
        let payload = SlackPayload {
            channel: channel.clone(),
            text: format!("{} — {}", label, repo),
            blocks: vec![
                SlackBlock {
                    kind: "section".into(),
                    text: Some(SlackText {
                        kind: "mrkdwn".into(),
                        text: summary.clone(),
                    }),
                },
                SlackBlock {
                    kind: "section".into(),
                    text: Some(SlackText {
                        kind: "mrkdwn".into(),
                        text: detail.clone(),
                    }),
                },
            ],
        };

        let result = client.post(webhook).json(&payload).send().await;
        if let Err(e) = result {
            eprintln!("Failed to send Slack notification to {}: {}", channel, e);
        }
    }
}
