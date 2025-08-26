use crate::config::Config;
use crate::sdk::{create_progress_bar, create_spinner};
use crate::utils::{init_sdk, write_file_content};
use anyhow::{Context, Result};
use base64::Engine;
use clap::Args;
use console::style;
use std::path::PathBuf;

#[derive(Args)]
pub struct UnlockArgs {
    /// Capsule ID to unlock
    #[arg(short, long)]
    pub capsule_id: String,
    /// Encryption key for the capsule
    #[arg(short, long)]
    pub encryption_key: String,
    /// Output file path (optional, defaults to capsule_id.bin)
    #[arg(short, long)]
    pub output: Option<PathBuf>,
    /// Payment amount for payment capsules (in MIST)
    #[arg(short, long)]
    pub payment: Option<u64>,
    /// Output format
    #[arg(long, default_value = "human")]
    pub format: String,
    /// Force overwrite existing output file
    #[arg(long)]
    pub force: bool,
}

pub async fn handle_unlock(args: UnlockArgs, config: &Config) -> Result<()> {
    println!("{}", style("Unlocking Time Capsule").bold().cyan());
    println!("{}", "=".repeat(50));

    // Initialize SDK
    let spinner = create_spinner("Initializing SDK...");
    let sdk = init_sdk(config).await?;
    spinner.finish_with_message("SDK initialized ✓");

    // Validate arguments
    validate_unlock_args(&args)?;

    // Determine output path
    let output_path = args
        .output
        .unwrap_or_else(|| PathBuf::from(format!("{}.bin", args.capsule_id)));

    // Check if output file exists
    if output_path.exists() && !args.force {
        anyhow::bail!(
            "Output file already exists: {}. Use --force to overwrite.",
            output_path.display()
        );
    }

    println!(
        "\n{} Unlocking capsule: {}",
        style("🔓").cyan(),
        style(&args.capsule_id).bold()
    );
    if let Some(payment) = args.payment {
        println!("Payment amount: {} MIST", payment);
    }
    println!("Output file: {}", output_path.display());

    // Create progress bar
    let pb = create_progress_bar(4, "Unlocking capsule...");

    // Unlock and decrypt the capsule
    let result = sdk
        .unlock_and_decrypt(
            &args.capsule_id,
            &args.encryption_key,
            args.payment,
            Some(&pb),
        )
        .await?;

    // Handle the result
    if result.success {
        if let Some(ref content) = result.content {
            // Write content to file
            write_file_content(&output_path, content)
                .context("Failed to write decrypted content to file")?;
            display_unlock_success(&result, &output_path, content.len(), &args.format)?;
        } else {
            anyhow::bail!("Unlock succeeded but no content was returned");
        }
    } else {
        display_unlock_failure(&result)?;
        anyhow::bail!("Failed to unlock capsule");
    }

    Ok(())
}

fn validate_unlock_args(args: &UnlockArgs) -> Result<()> {
    // Validate capsule ID format
    if args.capsule_id.is_empty() {
        anyhow::bail!("Capsule ID cannot be empty");
    }
    if !args.capsule_id.starts_with("0x") {
        anyhow::bail!("Capsule ID must start with '0x'");
    }

    // Validate encryption key format
    if args.encryption_key.is_empty() {
        anyhow::bail!("Encryption key cannot be empty");
    }

    // Try to decode the encryption key to validate format
    base64::engine::general_purpose::STANDARD
        .decode(&args.encryption_key)
        .context("Invalid encryption key format (must be base64)")?;

    // Validate payment amount if provided
    if let Some(payment) = args.payment {
        if payment == 0 {
            anyhow::bail!("Payment amount must be greater than 0");
        }
    }

    Ok(())
}

fn display_unlock_success(
    result: &crate::sdk::UnlockResult,
    output_path: &PathBuf,
    content_size: usize,
    format: &str,
) -> Result<()> {
    println!(
        "\n{}",
        style("Capsule Unlocked Successfully!").bold().green()
    );
    println!("{}", "=".repeat(50));

    match format {
        "json" => {
            let json = serde_json::json!({
                "success": result.success,
                "output_file": output_path.display().to_string(),
                "content_size": content_size,
                "transaction_digest": result.transaction_digest,
            });
            println!("{}", serde_json::to_string_pretty(&json)?);
        }
        _ => {
            println!(
                "{} {}",
                style("Output File:").bold(),
                style(output_path.display()).cyan()
            );
            println!(
                "{} {}",
                style("Content Size:").bold(),
                style(crate::utils::format_file_size(content_size as u64)).cyan()
            );
            if let Some(ref tx_digest) = result.transaction_digest {
                println!(
                    "{} {}",
                    style("Transaction:").bold(),
                    style(tx_digest).cyan()
                );
            }
            println!(
                "\n{}",
                style("✅ Content has been saved to the output file.").green()
            );
        }
    }

    Ok(())
}

fn display_unlock_failure(result: &crate::sdk::UnlockResult) -> Result<()> {
    println!("\n{}", style("Failed to Unlock Capsule").bold().red());
    println!("{}", "=".repeat(50));

    if let Some(ref error) = result.error {
        println!("{} {}", style("Error:").bold().red(), error);
    }

    println!("\n{}", style("Possible reasons:").bold().yellow());
    println!("• Unlock conditions not yet met (time not reached, insufficient approvals, payment not made)");
    println!("• Invalid encryption key");
    println!("• Capsule does not exist or has already been unlocked");
    println!("• Network connectivity issues");

    Ok(())
}

/// Interactive unlock command that guides the user through the process
pub async fn handle_unlock_interactive(config: &Config) -> Result<()> {
    use dialoguer::{Confirm, Input};

    println!("{}", style("Interactive Capsule Unlock").bold().cyan());
    println!("{}", "=".repeat(50));

    // Get capsule ID
    let capsule_id: String = Input::new()
        .with_prompt("Enter capsule ID")
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

    // Get encryption key
    let encryption_key: String = Input::new()
        .with_prompt("Enter encryption key")
        .validate_with(|input: &String| -> Result<(), &str> {
            if input.is_empty() {
                Err("Encryption key cannot be empty")
            } else if base64::engine::general_purpose::STANDARD
                .decode(input)
                .is_err()
            {
                Err("Invalid encryption key format (must be base64)")
            } else {
                Ok(())
            }
        })
        .interact_text()?;

    // Ask about payment
    let needs_payment = Confirm::new()
        .with_prompt("Is this a payment capsule that requires payment?")
        .default(false)
        .interact()?;

    let payment = if needs_payment {
        Some(
            Input::new()
                .with_prompt("Enter payment amount (in MIST)")
                .validate_with(|input: &u64| -> Result<(), &str> {
                    if *input == 0 {
                        Err("Payment amount must be greater than 0")
                    } else {
                        Ok(())
                    }
                })
                .interact_text()?,
        )
    } else {
        None
    };

    // Get output path
    let default_output = format!("{}.bin", capsule_id);
    let output_path: String = Input::new()
        .with_prompt("Enter output file path")
        .default(default_output)
        .interact_text()?;
    let output_path = PathBuf::from(output_path);

    // Check if file exists
    let force = if output_path.exists() {
        Confirm::new()
            .with_prompt("Output file already exists. Overwrite?")
            .default(false)
            .interact()?
    } else {
        false
    };

    if output_path.exists() && !force {
        anyhow::bail!("Operation cancelled by user");
    }

    // Create unlock args and proceed
    let args = UnlockArgs {
        capsule_id,
        encryption_key,
        output: Some(output_path),
        payment,
        format: "human".to_string(),
        force,
    };

    handle_unlock(args, config).await
}
