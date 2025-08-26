use anyhow::{Context, Result};
use std::fs;
use std::io::{self, Write};
use std::path::PathBuf;

use crate::config::Config;
use crate::utils::{create_sdk_client, load_private_key, read_key_input};

pub async fn execute(
    config: &Config,
    capsule_id: String,
    key: Option<String>,
    payment: Option<u64>,
    output: Option<PathBuf>,
    force: bool,
) -> Result<()> {
    // Load private key
    let keypair = load_private_key(config)?;

    // Create SDK client
    let sdk = create_sdk_client(config).await?;

    println!("Unlocking capsule: {}", capsule_id);

    // TODO: Get capsule information from SDK
    // let capsule = sdk.get_capsule_by_id(&capsule_id).await?;

    // For now, create mock capsule data
    let capsule = create_mock_capsule(&capsule_id);

    println!("Capsule type: {}", capsule.capsule_type);
    println!("Status: {}", capsule.status);

    // Validate unlock conditions
    if capsule.unlocked {
        println!("⚠️  Capsule has already been unlocked");
        return Ok(());
    }

    // Check unlock conditions
    match capsule.capsule_type.as_str() {
        "time" => {
            if !capsule.can_unlock {
                anyhow::bail!(
                    "Time-based unlock condition not yet met. {}",
                    capsule.unlock_info
                );
            }
            println!("✅ Time condition met");
        }

        "multisig" => {
            if !capsule.can_unlock {
                anyhow::bail!("Multisig condition not yet met. {}", capsule.unlock_info);
            }
            println!("✅ Multisig condition met");
        }

        "payment" => {
            let required_payment = capsule.required_payment.unwrap_or(0);
            let provided_payment = payment.unwrap_or(0);

            if provided_payment < required_payment {
                anyhow::bail!(
                    "Insufficient payment. Required: {} MIST ({} SUI), Provided: {} MIST ({} SUI)",
                    required_payment,
                    required_payment as f64 / 1_000_000_000.0,
                    provided_payment,
                    provided_payment as f64 / 1_000_000_000.0
                );
            }
            println!("✅ Payment condition met: {} MIST", provided_payment);
        }

        _ => {
            anyhow::bail!("Unknown capsule type: {}", capsule.capsule_type);
        }
    }

    // Get encryption key
    let encryption_key = if let Some(key_input) = key {
        read_key_input(&key_input)?
    } else {
        // Prompt for key
        print!("Enter encryption key (base64): ");
        io::stdout().flush()?;

        let mut input = String::new();
        io::stdin().read_line(&mut input)?;
        input.trim().to_string()
    };

    if encryption_key.is_empty() {
        anyhow::bail!("Encryption key is required");
    }

    // Confirm unlock if not forced
    if !force {
        print!("Proceed with unlocking? [y/N]: ");
        io::stdout().flush()?;

        let mut input = String::new();
        io::stdin().read_line(&mut input)?;

        if !input.trim().to_lowercase().starts_with('y') {
            println!("Unlock cancelled");
            return Ok(());
        }
    }

    println!("Unlocking capsule...");

    // TODO: Call SDK to unlock capsule
    // let unlock_result = sdk.unlock_and_decrypt(
    //     &capsule_id,
    //     &encryption_key,
    //     keypair,
    //     payment,
    // ).await?;

    // For now, create mock unlock result
    let unlock_result = create_mock_unlock_result();

    if !unlock_result.success {
        anyhow::bail!(
            "Failed to unlock capsule: {}",
            unlock_result.error.unwrap_or_default()
        );
    }

    println!("✅ Capsule unlocked successfully!");

    if let Some(content) = unlock_result.content {
        // Write content to output file or stdout
        if let Some(output_path) = output {
            fs::write(&output_path, &content).with_context(|| {
                format!("Failed to write content to: {}", output_path.display())
            })?;

            println!("Content saved to: {}", output_path.display());
            println!("Content size: {} bytes", content.len());
        } else {
            // Write to stdout
            println!("\n--- Content ---");

            // Try to display as text if it's valid UTF-8
            match String::from_utf8(content.clone()) {
                Ok(text) => {
                    println!("{}", text);
                }
                Err(_) => {
                    println!("Binary content ({} bytes)", content.len());
                    println!("Use --output <file> to save binary content to a file");
                }
            }
        }
    }

    if let Some(tx_digest) = unlock_result.transaction_digest {
        println!("Transaction: {}", tx_digest);
    }

    Ok(())
}

// Mock structures for testing
struct MockCapsule {
    capsule_type: String,
    status: String,
    unlocked: bool,
    can_unlock: bool,
    unlock_info: String,
    required_payment: Option<u64>,
}

struct MockUnlockResult {
    success: bool,
    content: Option<Vec<u8>>,
    transaction_digest: Option<String>,
    error: Option<String>,
}

fn create_mock_capsule(capsule_id: &str) -> MockCapsule {
    // Simple mock based on capsule ID pattern
    if capsule_id.contains("time") {
        MockCapsule {
            capsule_type: "time".to_string(),
            status: "ready".to_string(),
            unlocked: false,
            can_unlock: true,
            unlock_info: "Time condition met".to_string(),
            required_payment: None,
        }
    } else if capsule_id.contains("multisig") {
        MockCapsule {
            capsule_type: "multisig".to_string(),
            status: "ready".to_string(),
            unlocked: false,
            can_unlock: true,
            unlock_info: "3/3 approvals received".to_string(),
            required_payment: None,
        }
    } else {
        MockCapsule {
            capsule_type: "payment".to_string(),
            status: "locked".to_string(),
            unlocked: false,
            can_unlock: false,
            unlock_info: "Payment required".to_string(),
            required_payment: Some(1_000_000_000), // 1 SUI
        }
    }
}

fn create_mock_unlock_result() -> MockUnlockResult {
    MockUnlockResult {
        success: true,
        content: Some(b"This is the decrypted content of the time capsule!".to_vec()),
        transaction_digest: Some(format!("0x{:x}", rand::random::<u64>())),
        error: None,
    }
}
