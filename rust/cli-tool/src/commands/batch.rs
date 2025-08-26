use crate::batch::{BatchExecutor, BatchOperationBuilder};
use crate::config::Config;
use crate::sdk::create_spinner;
use anyhow::{Context, Result};
use clap::Args;
use console::style;
use std::path::PathBuf;

#[derive(Args)]
pub struct BatchArgs {
    /// Input files or directories to process
    #[arg(short, long, required = true)]
    pub inputs: Vec<PathBuf>,
    
    /// Operation type: create-time, create-multisig, create-payment, unlock
    #[arg(short, long)]
    pub operation: String,
    
    /// Unlock time for time-based capsules (e.g., "1h", "30m", "2d")
    #[arg(short = 't', long)]
    pub unlock_time: Option<String>,
    
    /// Threshold for multisig capsules
    #[arg(long)]
    pub threshold: Option<u64>,
    
    /// Approvers for multisig capsules (comma-separated addresses)
    #[arg(long, value_delimiter = ',')]
    pub approvers: Vec<String>,
    
    /// Price for payment capsules (in MIST)
    #[arg(short, long)]
    pub price: Option<u64>,
    
    /// Encryption keys for unlock operations (comma-separated)
    #[arg(short, long, value_delimiter = ',')]
    pub encryption_keys: Vec<String>,
    
    /// Maximum concurrent operations
    #[arg(long, default_value = "4")]
    pub max_concurrent: usize,
    
    /// Number of retry attempts for failed operations
    #[arg(long, default_value = "3")]
    pub retry_attempts: u32,
    
    /// Continue processing even if some operations fail
    #[arg(long)]
    pub continue_on_error: bool,
    
    /// Process directories recursively
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

pub async fn handle_batch(args: BatchArgs, config: &Config) -> Result<()> {
    println!("{}", style("Batch Capsule Operations").bold().cyan());
    println!("{}", "=".repeat(50));

    // Validate arguments
    validate_batch_args(&args)?;

    // Build batch configuration
    let batch_config = build_batch_config(&args)?;

    // Create batch executor
    let spinner = create_spinner("Initializing batch executor...");
    let executor = BatchExecutor::new(batch_config, config).await?;
    spinner.finish_with_message("Batch executor initialized ");

    // Display operation summary
    display_operation_summary(&args);

    // Execute batch operation
    let result = executor.execute_batch(args.inputs.clone()).await
        .context("Failed to execute batch operation")?;

    // Display results
    match args.format.as_str() {
        "json" => {
            let json = serde_json::to_value(&result)?;
            println!("{}", serde_json::to_string_pretty(&json)?);
        }
        _ => {
            result.display_summary();
        }
    }

    // Exit with error code if any operations failed
    if !result.failed.is_empty() && !args.continue_on_error {
        std::process::exit(1);
    }

    Ok(())
}

fn validate_batch_args(args: &BatchArgs) -> Result<()> {
    // Validate inputs exist
    for input in &args.inputs {
        if !input.exists() {
            anyhow::bail!("Input path does not exist: {}", input.display());
        }
    }

    // Validate operation type and required parameters
    match args.operation.as_str() {
        "create-time" => {
            if args.unlock_time.is_none() {
                anyhow::bail!("--unlock-time is required for create-time operations");
            }
        }
        "create-multisig" => {
            if args.threshold.is_none() {
                anyhow::bail!("--threshold is required for create-multisig operations");
            }
            if args.approvers.is_empty() {
                anyhow::bail!("--approvers is required for create-multisig operations");
            }
            let threshold = args.threshold.unwrap();
            if threshold == 0 {
                anyhow::bail!("Threshold must be greater than 0");
            }
            if threshold > args.approvers.len() as u64 {
                anyhow::bail!("Threshold cannot be greater than number of approvers");
            }
        }
        "create-payment" => {
            if args.price.is_none() {
                anyhow::bail!("--price is required for create-payment operations");
            }
            if args.price.unwrap() == 0 {
                anyhow::bail!("Price must be greater than 0");
            }
        }
        "unlock" => {
            if args.encryption_keys.is_empty() {
                anyhow::bail!("--encryption-keys is required for unlock operations");
            }
        }
        _ => {
            anyhow::bail!("Invalid operation type: {}. Valid types: create-time, create-multisig, create-payment, unlock", args.operation);
        }
    }

    // Validate concurrent operations limit
    if args.max_concurrent == 0 {
        anyhow::bail!("Max concurrent operations must be greater than 0");
    }
    if args.max_concurrent > 20 {
        anyhow::bail!("Max concurrent operations cannot exceed 20");
    }

    Ok(())
}

fn build_batch_config(args: &BatchArgs) -> Result<crate::batch::BatchConfig> {
    let mut builder = BatchOperationBuilder::new()
        .max_concurrent(args.max_concurrent)
        .retry_attempts(args.retry_attempts)
        .continue_on_error(args.continue_on_error);

    builder = match args.operation.as_str() {
        "create-time" => {
            builder.create_time_capsules(args.unlock_time.as_ref().unwrap())?
        }
        "create-multisig" => {
            builder.create_multisig_capsules(args.threshold.unwrap(), args.approvers.clone())
        }
        "create-payment" => {
            builder.create_payment_capsules(args.price.unwrap())
        }
        "unlock" => {
            builder.unlock_capsules(args.encryption_keys.clone())
        }
        _ => unreachable!(), // Already validated
    };

    builder.build()
}

fn display_operation_summary(args: &BatchArgs) {
    println!("\n{}", style("Operation Summary").bold().yellow());
    println!("{}", "-".repeat(30));
    
    println!("Operation type: {}", style(&args.operation).cyan());
    println!("Input paths: {}", args.inputs.len());
    for input in &args.inputs {
        println!("   {}", input.display());
    }
    
    match args.operation.as_str() {
        "create-time" => {
            println!("Unlock time: {}", args.unlock_time.as_ref().unwrap());
        }
        "create-multisig" => {
            println!("Threshold: {}/{}", args.threshold.unwrap(), args.approvers.len());
            println!("Approvers: {}", args.approvers.join(", "));
        }
        "create-payment" => {
            println!("Price: {} MIST", args.price.unwrap());
        }
        "unlock" => {
            println!("Encryption keys: {} provided", args.encryption_keys.len());
        }
        _ => {}
    }
    
    println!("Max concurrent: {}", args.max_concurrent);
    println!("Retry attempts: {}", args.retry_attempts);
    println!("Continue on error: {}", args.continue_on_error);
    println!();
}

/// Interactive batch command that guides the user through the process
pub async fn handle_batch_interactive(config: &Config) -> Result<()> {
    use dialoguer::{Confirm, Input, Select};

    println!("{}", style("Interactive Batch Operations").bold().cyan());
    println!("{}", "=".repeat(50));

    // Get input paths
    let mut inputs = Vec::new();
    loop {
        let input: String = Input::new()
            .with_prompt("Enter file or directory path (or press Enter to finish)")
            .allow_empty(true)
            .interact_text()?;
        
        if input.is_empty() {
            break;
        }
        
        let path = PathBuf::from(input);
        if !path.exists() {
            println!("{} Path does not exist, skipping.", style("").yellow());
            continue;
        }
        
        inputs.push(path);
    }
    
    if inputs.is_empty() {
        anyhow::bail!("No input paths provided");
    }

    // Get operation type
    let operation_options = vec!["Create Time Capsules", "Create Multisig Capsules", "Create Payment Capsules", "Unlock Capsules"];
    let operation_selection = Select::new()
        .with_prompt("Select batch operation type")
        .items(&operation_options)
        .interact()?;

    let (operation, unlock_time, threshold, approvers, price, encryption_keys) = match operation_selection {
        0 => {
            let time_input: String = Input::new()
                .with_prompt("Enter unlock time (e.g., '1h', '30m', '2d')")
                .interact_text()?;
            ("create-time".to_string(), Some(time_input), None, Vec::new(), None, Vec::new())
        }
        1 => {
            let threshold: u64 = Input::new()
                .with_prompt("Enter approval threshold")
                .interact_text()?;
            let approvers_input: String = Input::new()
                .with_prompt("Enter approver addresses (comma-separated)")
                .interact_text()?;
            let approvers: Vec<String> = approvers_input
                .split(',')
                .map(|s| s.trim().to_string())
                .collect();
            ("create-multisig".to_string(), None, Some(threshold), approvers, None, Vec::new())
        }
        2 => {
            let price: u64 = Input::new()
                .with_prompt("Enter price in MIST")
                .interact_text()?;
            ("create-payment".to_string(), None, None, Vec::new(), Some(price), Vec::new())
        }
        3 => {
            let keys_input: String = Input::new()
                .with_prompt("Enter encryption keys (comma-separated)")
                .interact_text()?;
            let keys: Vec<String> = keys_input
                .split(',')
                .map(|s| s.trim().to_string())
                .collect();
            ("unlock".to_string(), None, None, Vec::new(), None, keys)
        }
        _ => unreachable!(),
    };

    // Get advanced options
    let max_concurrent: usize = Input::new()
        .with_prompt("Maximum concurrent operations")
        .default(4)
        .interact_text()?;

    let continue_on_error = Confirm::new()
        .with_prompt("Continue processing if some operations fail?")
        .default(true)
        .interact()?;

    // Create batch args and execute
    let args = BatchArgs {
        inputs,
        operation,
        unlock_time,
        threshold,
        approvers,
        price,
        encryption_keys,
        max_concurrent,
        retry_attempts: 3,
        continue_on_error,
        recursive: false,
        max_size: 104857600,
        extensions: Vec::new(),
        format: "human".to_string(),
    };

    handle_batch(args, config).await
}
