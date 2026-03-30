use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::engine::EvalVerdict;

#[derive(Serialize)]
struct ValidatePayload<'a> {
    token: &'a str,
    window_id: &'a str,
}

#[derive(Deserialize)]
struct ValidateResponse {
    valid: bool,
}

pub async fn validate(token: &str, api_url: &str, api_key: &str, verdict: &EvalVerdict) -> bool {
    let window_id = match verdict.window_id.as_deref() {
        Some(id) => id,
        None => return false,
    };

    let payload = ValidatePayload { token, window_id };

    let client = Client::new();
    let url = format!("{}/v1/overrides/validate", api_url.trim_end_matches('/'));

    let result = client
        .post(&url)
        .bearer_auth(api_key)
        .json(&payload)
        .send()
        .await;

    match result {
        Ok(resp) => {
            if resp.status().is_success() {
                resp.json::<ValidateResponse>()
                    .await
                    .map(|r| r.valid)
                    .unwrap_or(false)
            } else {
                false
            }
        }
        Err(e) => {
            eprintln!("Failed to validate override token: {}", e);
            false
        }
    }
}
