use crate::config::BlackoutConfig;

pub async fn fetch_maintenance_windows(
    _config: &BlackoutConfig,
    _api_key: &str,
) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    Ok(vec![])
}
