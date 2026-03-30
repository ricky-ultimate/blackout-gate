use reqwest::Client;
use serde::Deserialize;

use crate::config::BlackoutConfig;

#[derive(Deserialize)]
struct MaintenanceWindowsResponse {
    maintenance_windows: Vec<MaintenanceWindow>,
}

#[derive(Deserialize)]
struct MaintenanceWindow {
    id: String,
    #[serde(default)]
    services: Vec<PdService>,
}

#[derive(Deserialize)]
struct PdService {
    id: String,
}

pub async fn fetch_maintenance_windows(
    config: &BlackoutConfig,
    api_key: &str,
) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let service_ids: Vec<String> = config
        .windows
        .iter()
        .filter_map(|w| w.source.as_ref())
        .filter(|s| s.kind == "pagerduty")
        .filter_map(|s| s.service_ids.as_ref())
        .flatten()
        .cloned()
        .collect();

    if service_ids.is_empty() {
        return Ok(vec![]);
    }

    let client = Client::new();

    let query: Vec<(&str, &str)> = service_ids
        .iter()
        .map(|id| ("service_ids[]", id.as_str()))
        .collect();

    let resp = client
        .get("https://api.pagerduty.com/maintenance_windows")
        .header("Authorization", format!("Token token={}", api_key))
        .header("Accept", "application/vnd.pagerduty+json;version=2")
        .query(&query)
        .send()
        .await?;

    if !resp.status().is_success() {
        eprintln!("PagerDuty API returned status: {}", resp.status());
        return Ok(vec![]);
    }

    let body: MaintenanceWindowsResponse = resp.json().await?;

    let active_service_ids: Vec<String> = body
        .maintenance_windows
        .iter()
        .flat_map(|mw| mw.services.iter().map(|s| s.id.clone()))
        .collect();

    let matched_window_ids: Vec<String> = config
        .windows
        .iter()
        .filter(|w| {
            w.source
                .as_ref()
                .filter(|s| s.kind == "pagerduty")
                .and_then(|s| s.service_ids.as_ref())
                .map(|ids| ids.iter().any(|id| active_service_ids.contains(id)))
                .unwrap_or(false)
        })
        .map(|w| w.id.clone())
        .collect();

    Ok(matched_window_ids)
}
