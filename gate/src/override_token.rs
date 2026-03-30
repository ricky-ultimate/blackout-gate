use crate::engine::EvalVerdict;

pub async fn validate(
    _token: &str,
    _api_url: &str,
    _api_key: &str,
    _verdict: &EvalVerdict,
) -> bool {
    false
}
