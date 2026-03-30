use crate::engine::{EvalVerdict, Verdict};

pub async fn set_status(_token: &str, _verdict: Verdict, _description: &str) {}
pub async fn post_pr_comment(_token: &str, _verdict: &EvalVerdict) {}
