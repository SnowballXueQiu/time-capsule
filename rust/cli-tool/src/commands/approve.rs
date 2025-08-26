use crate::config::Config;
use crate::sdk::{create_progress_bar, create_spinner};
use crate::utils::{init_sdk, validate_sui_address};
use anyhow::{Context, Result};
use clap::Args;
use console::style;

#[derive(Args)]
pub struct ApproveArgs {
    /// Capsule ID to approve
    #[arg(short, long)]
    pub capsule_id: String,
    /// Output format
    #[arg(long, default_value = "human")]
    pub format: String,
}

pub async fn handle_approve(args: ApproveArgs, config: &Config) -> Result<()> {
    println!("{}", style("Approving Multisig Capsule").bold().cyan());
    println!("{}", "=".repeat(50));

    // Initialize SDK
    let spinner = create_spinner("Initializing SDK...");
    let sdk = init_sdk(config).await?;
    spinner.finish_with_message("SDK initialized ✓");

    // Validate arguments
    validate_approve_args(&args)?;

    println!(
        "\n{} Approving capsule: {}",
        style("✅").cyan(),
        style(&args.capsule_id).bold()
    );

    // Create progress bar
    let pb = create_progress_bar(3, "Submitting approval...");

    // Submit approval
    let result = sdk
        .approve_multisig_capsule(&args.capsule_id, Some(&pb))
        .await?;

    // Display result
    display_approve_result(&result, &args.format)?;

    Ok(())
}

fn validate_approve_args(args: &ApproveArgs) -> Result<()> {
    // Validate capsule ID format
    if args.capsule_id.is_empty() {
        anyhow::bail!("Capsule ID cannot be empty");
    }
    if !args.capsule_id.starts_with("0x") {
        anyhow::bail!("Capsule ID must start with '0x'");
    }

    Ok(())
}

fn display_approve_result(result: &crate::sdk::ApprovalResult, format: &str) -> Result<()> {
    if result.success {
        println!(
            "\n{}",
            style("Approval Submitted Successfully!").bold().green()
        );
        println!("{}", "=".repeat(50));

        match format {
            "json" => {
                let json = serde_json::to_value(result)?;
                println!("{}", serde_json::to_string_pretty(&json)?);
            }
            _ => {
                println!(
                    "{} {}",
                    style("Transaction:").bold(),
                    style(&result.transaction_digest).cyan()
                );
                println!(
                    "{} {}/{}",
                    style("Current Approvals:").bold(),
                    style(result.current_approvals).cyan(),
                    style(result.required_approvals).cyan()
                );

                if result.current_approvals >= result.required_approvals {
                    println!(
                        "\n{}",
                        style("🎉 Capsule is now ready to be unlocked!")
                            .bold()
                            .green()
                    );
                } else {
                    let remaining = result.required_approvals - result.current_approvals;
                    println!(
                        "\n{} {} more approval{} needed",
                        style("⏳").yellow(),
                        style(remaining).bold(),
                        if remaining == 1 { "" } else { "s" }
                    );
                }
            }
        }
    } else {
        println!("\n{}", style("Failed to Submit Approval").bold().red());
        println!("{}", "=".repeat(50));

        if let Some(ref error) = result.error {
            println!("{} {}", style("Error:").bold().red(), error);
        }

        println!("\n{}", style("Possible reasons:").bold().yellow());
        println!("• You are not an authorized approver for this capsule");
        println!("• You have already approved this capsule");
        println!("• Capsule does not exist or is not a multisig capsule");
        println!("• Network connectivity issues");
    }

    Ok(())
}

/// Interactive approve command that guides the user through the process
pub async fn handle_approve_interactive(config: &Config) -> Result<()> {
    use dialoguer::{Confirm, Input};

    println!("{}", style("Interactive Capsule Approval").bold().cyan());
    println!("{}", "=".repeat(50));

    // Get capsule ID
    let capsule_id: String = Input::new()
        .with_prompt("Enter capsule ID to approve")
        .validate_with(|input: &String| -> Result<(), &str> {
            if input.is_empty() {
                Err("Capsule ID cannot be empty")
            } else if !input.starts_with("0x") {
                Err("Capsule ID must start with '0x'")
            } else {
                Ok(())
            }
        })
        .interact_text()?;

    // Initialize SDK to get capsule info
    let spinner = create_spinner("Fetching capsule information...");
    let sdk = init_sdk(config).await?;

    // Get capsule status
    let status = sdk.get_capsule_status(&capsule_id).await?;
    spinner.finish_with_message("Capsule info retrieved ✓");

    // Display capsule information
    println!("\n{}", style("Capsule Information").bold());
    println!("{}", "-".repeat(30));
    println!("Type: {}", status.capsule_type);
    println!("Status: {}", status.status);

    if let Some(approvals) = status.approvals {
        println!(
            "Current Approvals: {}/{}",
            approvals.current, approvals.required
        );
        if !approvals.approvers.is_empty() {
            println!("Approvers:");
            for approver in &approvals.approvers {
                println!("  • {}", approver);
            }
        }
    }

    // Confirm approval
    let should_approve = Confirm::new()
        .with_prompt("Do you want to approve this capsule?")
        .default(true)
        .interact()?;

    if !should_approve {
        println!("Approval cancelled by user");
        return Ok(());
    }

    // Create approve args and proceed
    let args = ApproveArgs {
        capsule_id,
        format: "human".to_string(),
    };

    handle_approve(args, config).await
}

/// List pending approvals for the current user
pub async fn handle_list_pending_approvals(config: &Config) -> Result<()> {
    println!("{}", style("Pending Approvals").bold().cyan());
    println!("{}", "=".repeat(50));

    // Initialize SDK
    let spinner = create_spinner("Fetching pending approvals...");
    let sdk = init_sdk(config).await?;

    let pending = sdk.get_pending_approvals().await?;
    spinner.finish_with_message("Pending approvals retrieved ✓");

    if pending.is_empty() {
        println!("\n{}", style("No pending approvals found.").dim());
        return Ok(());
    }

    println!(
        "\n{} pending approval{} found:",
        style(pending.len()).bold(),
        if pending.len() == 1 { "" } else { "s" }
    );

    for (i, capsule) in pending.iter().enumerate() {
        println!(
            "\n{}. {}",
            style(i + 1).bold(),
            style(&capsule.capsule_id).cyan()
        );
        println!(
            "   Created: {}",
            crate::utils::format_timestamp(capsule.created_at)
        );
        println!(
            "   Approvals: {}/{}",
            capsule.current_approvals, capsule.required_approvals
        );

        if let Some(ref creator) = capsule.creator {
            println!("   Creator: {}", crate::utils::truncate_string(creator, 20));
        }
    }

    println!(
        "\n{}",
        style("Use 'approve --capsule-id <ID>' to approve a capsule").dim()
    );

    Ok(())
}
