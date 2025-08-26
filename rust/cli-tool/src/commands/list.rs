use anyhow::Result;

use crate::config::Config;
use crate::utils::{create_sdk_client, load_private_key};
use crate::{CapsuleType, OutputFormat};

pub async fn execute(
    config: &Config,
    output_format: OutputFormat,
    unlockable: bool,
    capsule_type: Option<CapsuleType>,
    limit: Option<usize>,
) -> Result<()> {
    // Load private key to get user address
    let keypair = load_private_key(config)?;
    let user_address = keypair.public().to_sui_address();

    // Create SDK client
    let sdk = create_sdk_client(config).await?;

    println!("Listing capsules for address: {}", user_address);

    if unlockable {
        println!("Filtering: Only unlockable capsules");
    }

    if let Some(ref ctype) = capsule_type {
        println!(
            "Filtering: {} capsules only",
            match ctype {
                CapsuleType::Time => "Time-based",
                CapsuleType::Multisig => "Multisig",
                CapsuleType::Payment => "Payment",
            }
        );
    }

    if let Some(limit) = limit {
        println!("Limit: {} capsules", limit);
    }

    // TODO: Call SDK to get capsules
    // let capsules = sdk.get_capsules_by_owner_with_status(&user_address.to_string()).await?;

    // For now, create mock data
    let capsules = create_mock_capsules();

    // Apply filters
    let filtered_capsules: Vec<_> = capsules
        .into_iter()
        .filter(|capsule| {
            if unlockable && !capsule.can_unlock {
                return false;
            }

            if let Some(ref filter_type) = capsule_type {
                let capsule_matches = match (capsule.capsule_type.as_str(), filter_type) {
                    ("time", CapsuleType::Time) => true,
                    ("multisig", CapsuleType::Multisig) => true,
                    ("payment", CapsuleType::Payment) => true,
                    _ => false,
                };
                if !capsule_matches {
                    return false;
                }
            }

            true
        })
        .take(limit.unwrap_or(usize::MAX))
        .collect();

    if filtered_capsules.is_empty() {
        println!("No capsules found matching the criteria.");
        return Ok(());
    }

    // Format and display output
    match output_format {
        OutputFormat::Human => {
            println!("\nFound {} capsule(s):\n", filtered_capsules.len());

            for (i, capsule) in filtered_capsules.iter().enumerate() {
                println!("{}. Capsule ID: {}", i + 1, capsule.id);
                println!("   Type: {}", capsule.capsule_type);
                println!("   Status: {}", capsule.status);
                println!("   Created: {}", capsule.created_at);

                if capsule.can_unlock {
                    println!("   🔓 Ready to unlock");
                } else {
                    println!("   🔒 {}", capsule.unlock_info);
                }

                println!();
            }
        }

        OutputFormat::Json => {
            let json_output = serde_json::json!({
                "capsules": filtered_capsules,
                "total": filtered_capsules.len(),
            });
            println!("{}", serde_json::to_string_pretty(&json_output)?);
        }

        OutputFormat::Table => {
            println!(
                "{:<20} {:<10} {:<15} {:<20} {:<30}",
                "ID", "Type", "Status", "Created", "Unlock Info"
            );
            println!("{}", "-".repeat(95));

            for capsule in &filtered_capsules {
                println!(
                    "{:<20} {:<10} {:<15} {:<20} {:<30}",
                    &capsule.id[..std::cmp::min(18, capsule.id.len())],
                    capsule.capsule_type,
                    if capsule.can_unlock {
                        "Unlockable"
                    } else {
                        "Locked"
                    },
                    capsule.created_at,
                    &capsule.unlock_info[..std::cmp::min(28, capsule.unlock_info.len())],
                );
            }
        }

        OutputFormat::Csv => {
            println!("id,type,status,created_at,can_unlock,unlock_info");
            for capsule in &filtered_capsules {
                println!(
                    "{},{},{},{},{},\"{}\"",
                    capsule.id,
                    capsule.capsule_type,
                    capsule.status,
                    capsule.created_at,
                    capsule.can_unlock,
                    capsule.unlock_info,
                );
            }
        }
    }

    Ok(())
}

// Mock capsule data for testing
#[derive(serde::Serialize)]
struct MockCapsule {
    id: String,
    capsule_type: String,
    status: String,
    created_at: String,
    can_unlock: bool,
    unlock_info: String,
}

fn create_mock_capsules() -> Vec<MockCapsule> {
    vec![
        MockCapsule {
            id: "0x1234567890abcdef".to_string(),
            capsule_type: "time".to_string(),
            status: "locked".to_string(),
            created_at: "2024-01-15".to_string(),
            can_unlock: false,
            unlock_info: "Unlocks in 2 days".to_string(),
        },
        MockCapsule {
            id: "0xabcdef1234567890".to_string(),
            capsule_type: "multisig".to_string(),
            status: "locked".to_string(),
            created_at: "2024-01-10".to_string(),
            can_unlock: true,
            unlock_info: "3/3 approvals received".to_string(),
        },
        MockCapsule {
            id: "0x9876543210fedcba".to_string(),
            capsule_type: "payment".to_string(),
            status: "locked".to_string(),
            created_at: "2024-01-12".to_string(),
            can_unlock: false,
            unlock_info: "Payment required: 1.5 SUI".to_string(),
        },
    ]
}
