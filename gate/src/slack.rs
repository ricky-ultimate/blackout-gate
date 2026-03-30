use reqwest::Client;
use serde::Serialize;

use crate::engine::{EvalVerdict, Outcome};

#[derive(Serialize)]
struct SlackPayload {
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

pub async fn notify(webhook: &str, verdict: &EvalVerdict) {
    let (icon, label) = match verdict.outcome {
        Outcome::Blocked => (":red_circle:", "Deployment Blocked"),
        Outcome::Warn => (":large_yellow_circle:", "Deployment Warning"),
        Outcome::Allowed => (":white_check_mark:", "Deployment Allowed"),
    };

    let repo = std::env::var("GITHUB_REPOSITORY").unwrap_or_else(|_| "unknown".into());
    let branch = std::env::var("GITHUB_REF_NAME").unwrap_or_else(|_| "unknown".into());
    let actor = std::env::var("GITHUB_ACTOR").unwrap_or_else(|_| "unknown".into());

    let summary = format!("{} *{}* — `{}`", icon, label, repo);

    let detail = format!(
        "*Branch:* `{}`\n*Triggered by:* {}\n*Reason:* {}",
        branch, actor, verdict.reason
    );

    let mut detail_with_approvers = detail;
    if verdict.allow_override && !verdict.override_approvers.is_empty() {
        detail_with_approvers.push_str(&format!(
            "\n*Override approvers:* {}",
            verdict
                .override_approvers
                .iter()
                .map(|a| format!("@{}", a))
                .collect::<Vec<_>>()
                .join(", ")
        ));
    }

    let payload = SlackPayload {
        text: format!("{} — {}", label, repo),
        blocks: vec![
            SlackBlock {
                kind: "section".into(),
                text: Some(SlackText {
                    kind: "mrkdwn".into(),
                    text: summary,
                }),
            },
            SlackBlock {
                kind: "section".into(),
                text: Some(SlackText {
                    kind: "mrkdwn".into(),
                    text: detail_with_approvers,
                }),
            },
        ],
    };

    let client = Client::new();

    let result = client.post(webhook).json(&payload).send().await;

    if let Err(e) = result {
        eprintln!("Failed to send Slack notification: {}", e);
    }
}
