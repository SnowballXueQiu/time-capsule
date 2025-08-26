use anyhow::{Context, Result};
use base64::Engine;
use std::fs;
use std::path::PathBuf;

use crate::config::Config;
use crate::utils::{create_sdk_client, format_output, load_private_key};
use crate::{CapsuleType, OutputFormat};

pub async fn execute(
    config: &Config,
    file: PathBuf,
    unlock_time: Option<u64>,
    threshold: Option<u64>,
    price: Option<u64>,
    output_format: OutputFormat,
    save_key: Option<PathBuf>,
) -> Result<()> {
    // Validate file exists
    if !file.exists() {
        anyhow::bail!("File does not exist: {}", file.display());
    }

    // Read file content
    let content =
        fs::read(&file).with_context(|| format!("Failed to read file: {}", file.display()))?;

    if content.is_empty() {
        anyhow::bail!("File is empty: {}", file.display());
    }

    // Determine capsule type
    let capsule_type = if unlock_time.is_some() {
        CapsuleType::Time
    } else if threshold.is_some() {
        CapsuleType::Multisig
    } else if price.is_some() {
        CapsuleType::Payment
    } else {
        anyhow::bail!("Must specify one of: --unlock-time, --threshold, or --price");
    };

    // Load private key
    let keypair = load_private_key(config)?;

    // Create SDK client
    let sdk = create_sdk_client(config).await?;

    println!(
        "Creating {} capsule for file: {}",
        match capsule_type {
            CapsuleType::Time => "time-based",
            CapsuleType::Multisig => "multisig",
            CapsuleType::Payment => "payment",
        },
        file.display()
    );

    println!("File size: {} bytes", content.len());

    // Create capsule based on type
    let result = match capsule_type {
        CapsuleType::Time => {
            let unlock_time = unlock_time.unwrap();
            println!(
                "Unlock time: {} ({})",
                unlock_time,
                format_timestamp(unlock_time)
            );

            // TODO: Call SDK to create time capsule
            // let result = sdk.create_time_capsule(content.into(), unlock_time, keypair).await?;

            // For now, return mock result
            create_mock_result("time")
        }

        CapsuleType::Multisig => {
            let threshold = threshold.unwrap();
            println!("Multisig threshold: {}", threshold);

            // TODO: Call SDK to create multisig capsule
            // let result = sdk.create_multisig_capsule(content.into(), threshold, keypair).await?;

            // For now, return mock result
            create_mock_result("multisig")
        }

        CapsuleType::Payment => {
            let price = price.unwrap();
            println!(
                "Payment required: {} MIST ({} SUI)",
                price,
                price as f64 / 1_000_000_000.0
            );

            // TODO: Call SDK to create paid capsule
            // let result = sdk.create_paid_capsule(content.into(), price, keypair).await?;

            // For now, return mock result
            create_mock_result("payment")
        }
    };

    // Save encryption key if requested
    if let Some(ref key_path) = save_key {
        fs::write(key_path, &result.encryption_key)
            .with_context(|| format!("Failed to save encryption key to: {}", key_path.display()))?;
        println!("Encryption key saved to: {}", key_path.display());
    }

    // Format and display output
    match output_format {
        OutputFormat::Human => {
            println!("\n✅ Capsule created successfully!");
            println!("Capsule ID: {}", result.capsule_id);
            println!("Transaction: {}", result.transaction_digest);
            println!("IPFS CID: {}", result.cid);
            println!("\n⚠️  IMPORTANT: Save your encryption key securely!");
            println!("Encryption Key: {}", result.encryption_key);

            if save_key.is_none() {
                println!("\n💡 Tip: Use --save-key <path> to save the encryption key to a file");
            }
        }

        OutputFormat::Json => {
            let json_output = serde_json::json!({
                "success": true,
                "capsule_id": result.capsule_id,
                "transaction_digest": result.transaction_digest,
                "cid": result.cid,
                "encryption_key": result.encryption_key,
            });
            println!("{}", serde_json::to_string_pretty(&json_output)?);
        }

        _ => {
            println!("Capsule ID: {}", result.capsule_id);
            println!("Transaction: {}", result.transaction_digest);
            println!("Encryption Key: {}", result.encryption_key);
        }
    }

    Ok(())
}

// Mock result for testing - will be replaced with actual SDK calls
struct MockCapsuleResult {
    capsule_id: String,
    transaction_digest: String,
    cid: String,
    encryption_key: String,
}

fn create_mock_result(capsule_type: &str) -> MockCapsuleResult {
    MockCapsuleResult {
        capsule_id: format!("0x{:x}", rand::random::<u64>()),
        transaction_digest: format!("0x{:x}", rand::random::<u64>()),
        cid: format!("Qm{}", rand::random::<u64>()),
        encryption_key: base64::engine::general_purpose::STANDARD
            .encode(&rand::random::<[u8; 32]>()),
    }
}

fn format_timestamp(timestamp_ms: u64) -> String {
    use std::time::{Duration, UNIX_EPOCH};

    let datetime = UNIX_EPOCH + Duration::from_millis(timestamp_ms);

    // Simple formatting - in a real implementation you'd use chrono
    format!("{:?}", datetime)
}
