use chrono::{DateTime, Duration, Utc};
use chrono_tz::Tz;
use cron::Schedule;
use std::str::FromStr;

use crate::config::{BlackoutConfig, RecurrenceType, Verdict, Window};

#[derive(Debug, Clone, PartialEq)]
pub enum Outcome {
    Allowed,
    Blocked,
    Warn,
}

#[derive(Debug, Clone)]
pub struct EvalVerdict {
    pub outcome: Outcome,
    pub window_id: Option<String>,
    pub window_name: Option<String>,
    pub reason: String,
    pub allow_override: bool,
    pub override_approvers: Vec<String>,
}

fn branch_matches(pattern: &str, branch: &str) -> bool {
    if pattern.ends_with("/*") {
        let prefix = &pattern[..pattern.len() - 2];
        branch.starts_with(&format!("{}/", prefix))
    } else {
        pattern == branch
    }
}

pub fn evaluate(
    config: &BlackoutConfig,
    environment: &str,
    branch: &str,
    external_windows: &[String],
) -> EvalVerdict {
    let tz: Tz = config.timezone.parse().unwrap_or(chrono_tz::UTC);
    let now_utc: DateTime<Utc> = Utc::now();

    let env_config = match config.environments.get(environment) {
        Some(e) => e,
        None => {
            return EvalVerdict {
                outcome: Outcome::Allowed,
                window_id: None,
                window_name: None,
                reason: format!("No configuration found for environment '{}'.", environment),
                allow_override: false,
                override_approvers: vec![],
            };
        }
    };

    if !branch.is_empty()
        && !env_config
            .applies_to
            .iter()
            .any(|p| branch_matches(p, branch))
    {
        return EvalVerdict {
            outcome: Outcome::Allowed,
            window_id: None,
            window_name: None,
            reason: format!(
                "Branch '{}' is not subject to environment '{}' gates.",
                branch, environment
            ),
            allow_override: false,
            override_approvers: vec![],
        };
    }

    for window_id in &env_config.windows {
        if external_windows.contains(window_id) {
            if let Some(window) = config.windows.iter().find(|w| &w.id == window_id) {
                return build_verdict(window);
            }
        }

        if let Some(window) = config.windows.iter().find(|w| &w.id == window_id) {
            if let Some(recurrence) = &window.recurrence {
                let matched = match recurrence.kind {
                    RecurrenceType::Range => {
                        let start = recurrence.start.as_deref().and_then(|s| {
                            DateTime::parse_from_rfc3339(s)
                                .ok()
                                .map(|d| d.with_timezone(&Utc))
                        });
                        let end = recurrence.end.as_deref().and_then(|s| {
                            DateTime::parse_from_rfc3339(s)
                                .ok()
                                .map(|d| d.with_timezone(&Utc))
                        });
                        match (start, end) {
                            (Some(s), Some(e)) => now_utc >= s && now_utc <= e,
                            _ => false,
                        }
                    }
                    RecurrenceType::Cron => {
                        let duration = recurrence.duration_minutes.unwrap_or(60);
                        recurrence.expressions.as_ref().map_or(false, |exprs| {
                            exprs.iter().any(|expr| {
                                Schedule::from_str(expr).ok().map_or(false, |schedule| {
                                    let window_duration = Duration::minutes(duration);
                                    let lookback = now_utc - window_duration;
                                    schedule
                                        .after(&lookback)
                                        .take_while(|t| t.with_timezone(&Utc) <= now_utc)
                                        .any(|t| {
                                            let start = t.with_timezone(&Utc);
                                            let end = start + window_duration;
                                            now_utc >= start && now_utc <= end
                                        })
                                })
                            })
                        })
                    }
                };

                if matched {
                    return build_verdict(window);
                }
            }
        }
    }

    EvalVerdict {
        outcome: Outcome::Allowed,
        window_id: None,
        window_name: None,
        reason: "No active blackout windows. Deployment permitted.".into(),
        allow_override: false,
        override_approvers: vec![],
    }
}

fn build_verdict(window: &Window) -> EvalVerdict {
    let outcome = match window.verdict {
        Verdict::Block => Outcome::Blocked,
        Verdict::Warn => Outcome::Warn,
        Verdict::Allow => Outcome::Allowed,
    };

    let approvers = window
        .override_approvers
        .as_ref()
        .map(|a| a.iter().map(|x| x.github.clone()).collect())
        .unwrap_or_default();

    EvalVerdict {
        outcome,
        window_id: Some(window.id.clone()),
        window_name: Some(window.name.clone()),
        reason: window.reason.clone(),
        allow_override: window.allow_override,
        override_approvers: approvers,
    }
}
