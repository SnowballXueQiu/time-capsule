use anyhow::Result;

use crate::config::Config;
use crate::utils::{create_sdk_client, load_private_key};
use crate::OutputFormat;

pub async fn execute(
    config: &Config,
    capsule_id: String,
    output_format: OutputFormat,
) -> Result<()> {
    // Load private key
    let keypair = load_private_key(config)?;
    let user_address = keypair.public().to_sui_address();

    // Create SDK client
    let sdk = create_sdk_client(config).await?;

    println!("Approving multisig capsule: {}", capsule_id);
    println!("Approver address: {}", user_address);

    // TODO: Get capsule information from SDK
    // let capsule = sdk.get_capsule_by_id(&capsule_id).await?;

    // For now, create mock capsule data
    let capsule = create_mock_capsule(&capsule_id);

    // Validate this is a multisig capsule
    if capsule.capsule_type != "multisig" {
        anyhow::bail!(
            "Capsule {} is not a multisig capsule (type: {})",
            capsule_id,
            capsule.capsule_type
        );
    }

    // Check if already unlocked
    if capsule.unlocked {
        println!("⚠️  Capsule has already been unlocked");
        return Ok(());
    }

    // Check if user has already approved
    if capsule.user_already_approved {
        println!("⚠️  You have already approved this capsule");
        return Ok(());
    }

    println!(
        "Current approvals: {}/{}",
        capsule.current_approvals, capsule.required_approvals
    );

    // TODO: Call SDK to approve capsule
    // let approval_result = sdk.approve_capsule(&capsule_id, keypair).await?;

    // For now, create mock approval result
    let approval_result = create_mock_approval_result();

    if !approval_result.success {
        anyhow::bail!(
            "Failed to approve capsule: {}",
            approval_result.error.unwrap_or_default()
        );
    }

    let new_approval_count = approval_result.current_approvals;
    let threshold = capsule.required_approvals;

    // Format and display output
    match output_format {
        OutputFormat::Human => {
            println!("✅ Approval submitted successfully!");
            println!("Transaction: {}", approval_result.transaction_digest);
            println!("Current approvals: {}/{}", new_approval_count, threshold);

            if new_approval_count >= threshold {
                println!("🎉 Threshold reached! Capsule can now be unlocked.");
            } else {
                let remaining = threshold - new_approval_count;
                println!("⏳ {} more approval(s) needed to unlock", remaining);
            }
        }

        OutputFormat::Json => {
            let json_output = serde_json::json!({
                "success": true,
                "capsule_id": capsule_id,
                "transaction_digest": approval_result.transaction_digest,
                "current_approvals": new_approval_count,
                "required_approvals": threshold,
                "threshold_reached": new_approval_count >= threshold,
            });
            println!("{}", serde_json::to_string_pretty(&json_output)?);
        }

        _ => {
            println!("Approved: {}", capsule_id);
            println!("Transaction: {}", approval_result.transaction_digest);
            println!("Approvals: {}/{}", new_approval_count, threshold);
        }
    }

    Ok(())
}

// Mock structures for testing
struct MockCapsule {
    capsule_type: String,
    unlocked: bool,
    user_already_approved: bool,
    current_approvals: u64,
    required_approvals: u64,
}

struct MockApprovalResult {
    success: bool,
    transaction_digest: String,
    current_approvals: u64,
    error: Option<String>,
}

fn create_mock_capsule(capsule_id: &str) -> MockCapsule {
    MockCapsule {
        capsule_type: "multisig".to_string(),
        unlocked: false,
        user_already_approved: false,
        current_approvals: 2,
        required_approvals: 3,
    }
}

fn create_mock_approval_result() -> MockApprovalResult {
    MockApprovalResult {
        success: true,
        transaction_digest: format!("0x{:x}", rand::random::<u64>()),
        current_approvals: 3,
        error: None,
    }
}
