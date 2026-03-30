use crate::engine::EvalVerdict;

pub enum Action {
    Evaluated,
    Overridden,
}

pub async fn record(_api_url: &str, _api_key: &str, _verdict: &EvalVerdict, _action: Action) {}
