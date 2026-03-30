use reqwest::Client;
use serde::Serialize;

use crate::config::Verdict;
use crate::engine::EvalVerdict;

#[derive(Serialize)]
struct StatusPayload<'a> {
    state: &'a str,
    description: &'a str,
    context: &'a str,
}

#[derive(Serialize)]
struct CommentPayload {
    body: String,
}

fn verdict_to_state(verdict: &Verdict) -> &'static str {
    match verdict {
        Verdict::Block => "failure",
        Verdict::Warn => "success",
        Verdict::Allow => "success",
    }
}

pub async fn set_status(token: &str, verdict: Verdict, description: &str) {
    let repo = std::env::var("GITHUB_REPOSITORY").unwrap_or_default();
    let sha = std::env::var("GITHUB_SHA").unwrap_or_default();

    if repo.is_empty() || sha.is_empty() {
        eprintln!("GITHUB_REPOSITORY or GITHUB_SHA not set, skipping status update.");
        return;
    }

    let state = verdict_to_state(&verdict);
    let truncated = if description.len() > 140 {
        &description[..140]
    } else {
        description
    };

    let payload = StatusPayload {
        state,
        description: truncated,
        context: "Blackout Gate",
    };

    let client = Client::new();
    let url = format!("https://api.github.com/repos/{}/statuses/{}", repo, sha);

    let result = client
        .post(&url)
        .bearer_auth(token)
        .header("User-Agent", "blackout-gate")
        .header("Accept", "application/vnd.github+json")
        .json(&payload)
        .send()
        .await;

    if let Err(e) = result {
        eprintln!("Failed to set GitHub commit status: {}", e);
    }
}

pub async fn post_pr_comment(token: &str, verdict: &EvalVerdict) {
    let repo = std::env::var("GITHUB_REPOSITORY").unwrap_or_default();
    let pr_number = std::env::var("GITHUB_REF")
        .unwrap_or_default()
        .split('/')
        .nth(2)
        .unwrap_or("")
        .to_string();

    if repo.is_empty() || pr_number.is_empty() {
        return;
    }

    let icon = match verdict.outcome {
        crate::engine::Outcome::Blocked => "🔴",
        crate::engine::Outcome::Warn => "🟡",
        crate::engine::Outcome::Allowed => "✅",
    };

    let mut body = format!(
        "{} **Blackout Gate — {}**\n\n{}\n",
        icon,
        match verdict.outcome {
            crate::engine::Outcome::Blocked => "Deployment Blocked",
            crate::engine::Outcome::Warn => "Deployment Warning",
            crate::engine::Outcome::Allowed => "Deployment Allowed",
        },
        verdict.reason
    );

    if verdict.allow_override && !verdict.override_approvers.is_empty() {
        body.push_str(&format!(
            "\nOverride approvers: {}\n",
            verdict
                .override_approvers
                .iter()
                .map(|a| format!("@{}", a))
                .collect::<Vec<_>>()
                .join(", ")
        ));
    }

    let payload = CommentPayload { body };

    let client = Client::new();
    let url = format!(
        "https://api.github.com/repos/{}/issues/{}/comments",
        repo, pr_number
    );

    let result = client
        .post(&url)
        .bearer_auth(token)
        .header("User-Agent", "blackout-gate")
        .header("Accept", "application/vnd.github+json")
        .json(&payload)
        .send()
        .await;

    if let Err(e) = result {
        eprintln!("Failed to post PR comment: {}", e);
    }
}
