use crate::config::Config;
use crate::file_processor::{BatchProcessor, FileProcessor};
use crate::sdk::{create_progress_bar, create_spinner};
use crate::utils::{
    future_timestamp, init_sdk, parse_duration, read_file_content, validate_sui_address,
};
use anyhow::{Context, Result};
use clap::Args;
use console::style;
use std::path::PathBuf;

#[derive(Args)]
pub struct CreateArgs {
    /// File or directory to create capsule from
    #[arg(short, long)]
    pub file: PathBuf,
    /// Type of capsule to create
    #[arg(long, value_enum)]
    pub capsule_type: CapsuleType,
    /// Unlock time for time-based capsules (e.g., "1h", "30m", "2d")
    #[arg(short = 't', long, required_if_eq("capsule_type", "time"))]
    pub unlock_time: Option<String>,
    /// Threshold for multisig capsules
    #[arg(long, required_if_eq("capsule_type", "multisig"))]
    pub threshold: Option<u64>,
    /// Approvers for multisig capsules (comma-separated addresses)
    #[arg(
        long,
        required_if_eq("capsule_type", "multisig"),
        value_delimiter = ','
    )]
    pub approvers: Vec<String>,
    /// Price for payment capsules (in MIST)
    #[arg(short, long, required_if_eq("capsule_type", "payment"))]
    pub price: Option<u64>,
    /// Process directory recursively
    #[arg(short, long)]
    pub recursive: bool,
    /// Maximum file size to process (in bytes)
    #[arg(long, default_value = "104857600")] // 100MB
    pub max_size: u64,
    /// Allowed file extensions (comma-separated)
    #[arg(long, value_delimiter = ',')]
    pub extensions: Vec<String>,
    /// Output format
    #[arg(long, default_value = "human")]
    pub format: String,
}

#[derive(clap::ValueEnum, Clone, Debug)]
pub enum CapsuleType {
    Time,
    Multisig,
    Payment,
}

pub async fn handle_create(args: CreateArgs, config: &Config) -> Result<()> {
    println!("{}", style("Creating Time Capsule").bold().cyan());
    println!("{}", "=".repeat(50));

    // Initialize SDK
    let spinner = create_spinner("Initializing SDK...");
    let sdk = init_sdk(config).await?;
    spinner.finish_with_message("SDK initialized ✓");

    // Validate arguments based on capsule type
    validate_create_args(&args)?;

    // Set up file processor
    let mut file_processor = FileProcessor::new()
        .with_max_size(args.max_size)
        .recursive(args.recursive);

    if !args.extensions.is_empty() {
        file_processor = file_processor.with_extensions(args.extensions.clone());
    }

    // Process files
    let spinner = create_spinner("Analyzing files...");
    let files = file_processor
        .process_path(&args.file)
        .context("Failed to process input path")?;
    spinner.finish_with_message(format!("Found {} files ✓", files.len()));

    // Validate files
    file_processor.validate_files(&files)?;

    // Create capsules
    if files.len() == 1 {
        // Single file
        let file_info = &files[0];
        let content = read_file_content(&file_info.path)?;

        println!(
            "\n{} Creating capsule for: {}",
            style("📦").cyan(),
            style(file_info.path.display()).bold()
        );
        println!(
            "File size: {}",
            crate::utils::format_file_size(file_info.size)
        );
        println!("MIME type: {}", file_info.mime_type);

        let pb = create_progress_bar(4, "Creating capsule...");

        let result = match args.capsule_type {
            CapsuleType::Time => {
                let duration = parse_duration(args.unlock_time.as_ref().unwrap())?;
                let unlock_time = future_timestamp(duration);
                println!(
                    "Unlock time: {}",
                    crate::utils::format_timestamp(unlock_time)
                );
                sdk.create_time_capsule(content, unlock_time, Some(&pb))
                    .await?
            }
            CapsuleType::Multisig => {
                let threshold = args.threshold.unwrap();
                let approvers = args.approvers.clone();
                println!("Threshold: {}/{}", threshold, approvers.len());
                println!("Approvers: {}", approvers.join(", "));
                sdk.create_multisig_capsule(content, threshold, approvers, Some(&pb))
                    .await?
            }
            CapsuleType::Payment => {
                let price = args.price.unwrap();
                println!("Price: {price} MIST");
                sdk.create_payment_capsule(content, price, Some(&pb))
                    .await?
            }
        };

        display_create_result(&result, &args.format)?;
    } else {
        // Batch processing
        println!(
            "\n{} Processing {} files in batch mode",
            style("📦").cyan(),
            style(files.len()).bold()
        );

        let (_multi_progress, main_pb) = file_processor.create_batch_progress(files.len());

        let batch_result = BatchProcessor::process_files_sequential(
            files,
            |file_info| {
                let sdk = &sdk;
                let args = &args;
                async move {
                    let content = read_file_content(&file_info.path)?;
                    let result = match args.capsule_type {
                        CapsuleType::Time => {
                            let duration = parse_duration(args.unlock_time.as_ref().unwrap())?;
                            let unlock_time = future_timestamp(duration);
                            sdk.create_time_capsule(content, unlock_time, None).await?
                        }
                        CapsuleType::Multisig => {
                            let threshold = args.threshold.unwrap();
                            let approvers = args.approvers.clone();
                            sdk.create_multisig_capsule(content, threshold, approvers, None)
                                .await?
                        }
                        CapsuleType::Payment => {
                            let price = args.price.unwrap();
                            sdk.create_payment_capsule(content, price, None).await?
                        }
                    };
                    Ok(format!(
                        "{} -> {}",
                        file_info.path.display(),
                        result.capsule_id
                    ))
                }
            },
            Some(&main_pb),
        )
        .await;

        BatchProcessor::display_results(&batch_result);

        // Enhanced error reporting
        if !batch_result.failed.is_empty() {
            use crate::file_processor::ErrorReporter;

            println!("\n{}", style("Error Summary").bold().red());
            println!("{}", "=".repeat(50));
            println!("{}", ErrorReporter::generate_error_summary(&batch_result));

            let suggestions = ErrorReporter::suggest_recovery_actions(&batch_result.failed);
            if !suggestions.is_empty() {
                println!("\n{}", style("Recovery Suggestions:").bold().yellow());
                for suggestion in suggestions {
                    println!("  • {suggestion}");
                }
            }
        }
    }

    Ok(())
}

fn validate_create_args(args: &CreateArgs) -> Result<()> {
    // Validate file/directory exists
    if !args.file.exists() {
        anyhow::bail!("File or directory does not exist: {}", args.file.display());
    }

    // Validate capsule type specific arguments
    match args.capsule_type {
        CapsuleType::Time => {
            if args.unlock_time.is_none() {
                anyhow::bail!("Unlock time is required for time-based capsules");
            }
        }
        CapsuleType::Multisig => {
            if args.threshold.is_none() {
                anyhow::bail!("Threshold is required for multisig capsules");
            }
            if args.approvers.is_empty() {
                anyhow::bail!("Approvers are required for multisig capsules");
            }
            let threshold = args.threshold.unwrap();
            if threshold == 0 {
                anyhow::bail!("Threshold must be greater than 0");
            }
            if threshold > args.approvers.len() as u64 {
                anyhow::bail!("Threshold cannot be greater than number of approvers");
            }
            // Validate approver addresses
            for approver in &args.approvers {
                validate_sui_address(approver)
                    .with_context(|| format!("Invalid approver address: {approver}"))?;
            }
        }
        CapsuleType::Payment => {
            if args.price.is_none() {
                anyhow::bail!("Price is required for payment capsules");
            }
            if args.price.unwrap() == 0 {
                anyhow::bail!("Price must be greater than 0");
            }
        }
    }

    Ok(())
}

fn display_create_result(result: &crate::sdk::CreateCapsuleResult, format: &str) -> Result<()> {
    println!(
        "\n{}",
        style("Capsule Created Successfully!").bold().green()
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
                style("Capsule ID:").bold(),
                style(&result.capsule_id).cyan()
            );
            println!(
                "{} {}",
                style("Transaction:").bold(),
                style(&result.transaction_digest).cyan()
            );
            println!(
                "{} {}",
                style("IPFS CID:").bold(),
                style(&result.cid).cyan()
            );
            println!(
                "{} {}",
                style("Encryption Key:").bold(),
                style(&result.encryption_key).yellow()
            );
            println!("\n{}", style("⚠️  Important:").bold().yellow());
            println!("Save the encryption key securely. You will need it to unlock the capsule.");
            println!("The encryption key is not stored anywhere else and cannot be recovered.");
        }
    }

    Ok(())
}
