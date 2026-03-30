use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct BlackoutConfig {
    pub version: String,
    pub org: String,
    pub timezone: String,
    pub defaults: Defaults,
    pub windows: Vec<Window>,
    pub environments: HashMap<String, EnvironmentConfig>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct Defaults {
    pub verdict_on_match: Verdict,
    pub allow_override: bool,
    pub override_approvers: Vec<Approver>,
    pub notify: NotifyConfig,
}

#[derive(Debug, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Verdict {
    Block,
    Warn,
    Allow,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct Approver {
    pub github: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct NotifyConfig {
    pub slack: Vec<SlackChannel>,
    pub pr_comment: bool,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct SlackChannel {
    pub channel: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct Window {
    pub id: String,
    pub name: String,
    pub industry_template: Option<String>,
    pub recurrence: Option<Recurrence>,
    pub source: Option<ExternalSource>,
    pub verdict: Verdict,
    pub reason: String,
    pub allow_override: bool,
    pub override_approvers: Option<Vec<Approver>>,
    pub notify: NotifyConfig,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct Recurrence {
    #[serde(rename = "type")]
    pub kind: RecurrenceType,
    pub start: Option<String>,
    pub end: Option<String>,
    pub expressions: Option<Vec<String>>,
    pub duration_minutes: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RecurrenceType {
    Range,
    Cron,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct ExternalSource {
    #[serde(rename = "type")]
    pub kind: String,
    pub service_ids: Option<Vec<String>>,
    pub auth_secret: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct EnvironmentConfig {
    pub applies_to: Vec<String>,
    pub windows: Vec<String>,
}

pub fn load(path: &str) -> Result<BlackoutConfig, Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string(path)?;
    let config: BlackoutConfig = serde_yaml::from_str(&content)?;
    Ok(config)
}
