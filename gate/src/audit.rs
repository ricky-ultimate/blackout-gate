use reqwest::Client;
use serde::Serialize;

use crate::engine::{EvalVerdict, Outcome};

pub enum Action {
    Evaluated,
    Overridden,
}

#[derive(Serialize)]
struct AuditPayload<'a> {
    repo: &'a str,
    environment: &'a str,
    branch: Option<&'a str>,
    triggered_by: Option<&'a str>,
    outcome: &'a str,
    window_id: Option<&'a str>,
    window_name: Option<&'a str>,
    reason: &'a str,
}

pub async fn record(api_url: &str, api_key: &str, verdict: &EvalVerdict, action: Action) {
    let repo = std::env::var("GITHUB_REPOSITORY").unwrap_or_default();
    let branch = std::env::var("GITHUB_REF_NAME").unwrap_or_default();
    let triggered_by = std::env::var("GITHUB_ACTOR").unwrap_or_default();

    let outcome = match action {
        Action::Overridden => "overridden",
        Action::Evaluated => match verdict.outcome {
            Outcome::Allowed => "allowed",
            Outcome::Blocked => "blocked",
            Outcome::Warn => "warn",
        },
    };

    let payload = AuditPayload {
        repo: &repo,
        environment: &std::env::var("INPUT_ENVIRONMENT").unwrap_or_default(),
        branch: Some(&branch),
        triggered_by: Some(&triggered_by),
        outcome,
        window_id: verdict.window_id.as_deref(),
        window_name: verdict.window_name.as_deref(),
        reason: &verdict.reason,
    };

    let client = Client::new();
    let url = format!("{}/v1/evaluate", api_url.trim_end_matches('/'));

    let result = client
        .post(&url)
        .bearer_auth(api_key)
        .json(&payload)
        .send()
        .await;

    if let Err(e) = result {
        eprintln!("Failed to record audit log: {}", e);
    }
}
