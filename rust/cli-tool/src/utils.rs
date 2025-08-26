use crate::config::Config;
use crate::sdk::CapsuleSDK;
use anyhow::{Context, Result};
use base64::Engine;
use std::fs;
use std::path::Path;

/// Format output based on format type
pub fn format_output(data: &serde_json::Value, format: &str) -> Result<String> {
    match format {
        "json" => Ok(serde_json::to_string_pretty(data)?),
        "human" => Ok(format!("{:#}", data)),
        _ => Ok(data.to_string()),
    }
}

/// Load private key from configuration
pub fn load_private_key(config: &Config) -> Result<String> {
    if let Some(key_path) = &config.private_key_path {
        fs::read_to_string(key_path)
            .with_context(|| format!("Failed to read private key from: {}", key_path.display()))
            .map(|s| s.trim().to_string())
    } else if let Some(key) = &config.private_key {
        Ok(key.clone())
    } else {
        anyhow::bail!("No private key configured. Set PRIVATE_KEY or PRIVATE_KEY_PATH");
    }
}

/// Initialize SDK with configuration
pub async fn init_sdk(config: &Config) -> Result<CapsuleSDK> {
    CapsuleSDK::new(config.clone())
        .await
        .context("Failed to initialize Capsule SDK")
}

/// Read file content safely
pub fn read_file_content(path: &Path) -> Result<Vec<u8>> {
    fs::read(path).with_context(|| format!("Failed to read file: {}", path.display()))
}

/// Write content to file safely
pub fn write_file_content(path: &Path, content: &[u8]) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create directory: {}", parent.display()))?;
    }
    fs::write(path, content).with_context(|| format!("Failed to write file: {}", path.display()))
}

/// Format file size in human readable format
pub fn format_file_size(size: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    let mut size = size as f64;
    let mut unit_index = 0;

    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }

    if unit_index == 0 {
        format!("{} {}", size as u64, UNITS[unit_index])
    } else {
        format!("{:.2} {}", size, UNITS[unit_index])
    }
}

/// Format timestamp in human readable format
pub fn format_timestamp(timestamp: u64) -> String {
    use chrono::{DateTime, TimeZone, Utc};
    let dt = Utc
        .timestamp_millis_opt(timestamp as i64)
        .single()
        .unwrap_or_else(|| Utc::now());
    dt.format("%Y-%m-%d %H:%M:%S UTC").to_string()
}

/// Validate Sui address format
pub fn validate_sui_address(address: &str) -> Result<()> {
    if !address.starts_with("0x") {
        anyhow::bail!("Sui address must start with '0x'");
    }
    let hex_part = &address[2..];
    if hex_part.len() != 64 {
        anyhow::bail!("Sui address must be 64 hex characters after '0x'");
    }
    if !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
        anyhow::bail!("Sui address contains invalid hex characters");
    }
    Ok(())
}

/// Parse time duration from string (e.g., "1h", "30m", "2d")
pub fn parse_duration(duration_str: &str) -> Result<u64> {
    let duration_str = duration_str.trim().to_lowercase();
    if duration_str.is_empty() {
        anyhow::bail!("Duration cannot be empty");
    }

    let (number_part, unit_part) = if let Some(pos) = duration_str.find(|c: char| c.is_alphabetic())
    {
        (&duration_str[..pos], &duration_str[pos..])
    } else {
        anyhow::bail!("Duration must include a unit (s, m, h, d)");
    };

    let number: u64 = number_part
        .parse()
        .with_context(|| format!("Invalid number in duration: {}", number_part))?;

    let multiplier = match unit_part {
        "s" | "sec" | "second" | "seconds" => 1,
        "m" | "min" | "minute" | "minutes" => 60,
        "h" | "hr" | "hour" | "hours" => 60 * 60,
        "d" | "day" | "days" => 60 * 60 * 24,
        "w" | "week" | "weeks" => 60 * 60 * 24 * 7,
        _ => anyhow::bail!("Invalid duration unit: {}. Use s, m, h, d, or w", unit_part),
    };

    Ok(number * multiplier * 1000) // Convert to milliseconds
}

/// Get current timestamp in milliseconds
pub fn current_timestamp_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

/// Calculate future timestamp from duration
pub fn future_timestamp(duration_ms: u64) -> u64 {
    current_timestamp_ms() + duration_ms
}

/// Check if timestamp is in the past
pub fn is_timestamp_past(timestamp: u64) -> bool {
    timestamp < current_timestamp_ms()
}

/// Truncate string to specified length with ellipsis
pub fn truncate_string(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}...", &s[..max_len.saturating_sub(3)])
    }
}

/// Validate IPFS CID format
pub fn validate_ipfs_cid(cid: &str) -> Result<()> {
    if cid.is_empty() {
        anyhow::bail!("CID cannot be empty");
    }
    // Basic CID validation - should start with Qm for v0 or b for v1
    if !cid.starts_with("Qm") && !cid.starts_with("b") {
        anyhow::bail!("Invalid CID format");
    }
    if cid.len() < 10 {
        anyhow::bail!("CID too short");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_duration() {
        assert_eq!(parse_duration("30s").unwrap(), 30_000);
        assert_eq!(parse_duration("5m").unwrap(), 300_000);
        assert_eq!(parse_duration("2h").unwrap(), 7_200_000);
        assert_eq!(parse_duration("1d").unwrap(), 86_400_000);
        assert!(parse_duration("invalid").is_err());
        assert!(parse_duration("30x").is_err());
    }

    #[test]
    fn test_validate_sui_address() {
        assert!(validate_sui_address(
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )
        .is_ok());
        assert!(validate_sui_address(
            "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )
        .is_err());
        assert!(validate_sui_address("0x123").is_err());
        assert!(validate_sui_address(
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdeg"
        )
        .is_err());
    }

    #[test]
    fn test_format_file_size() {
        assert_eq!(format_file_size(512), "512 B");
        assert_eq!(format_file_size(1024), "1.00 KB");
        assert_eq!(format_file_size(1536), "1.50 KB");
        assert_eq!(format_file_size(1048576), "1.00 MB");
    }

    #[test]
    fn test_truncate_string() {
        assert_eq!(truncate_string("hello", 10), "hello");
        assert_eq!(truncate_string("hello world", 8), "hello...");
        assert_eq!(truncate_string("hi", 8), "hi");
    }

    #[test]
    fn test_validate_ipfs_cid() {
        assert!(validate_ipfs_cid("QmTest123456789").is_ok());
        assert!(
            validate_ipfs_cid("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi")
                .is_ok()
        );
        assert!(validate_ipfs_cid("").is_err());
        assert!(validate_ipfs_cid("invalid").is_err());
        assert!(validate_ipfs_cid("Qm").is_err());
    }
}
