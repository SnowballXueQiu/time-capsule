use clap::{Parser, Subcommand};
use std::env;
use std::path::PathBuf;

use capsule_cli::{
    commands::{
        handle_approve, handle_approve_interactive, handle_create, handle_list,
        handle_list_interactive, handle_list_pending_approvals, handle_unlock,
        handle_unlock_interactive, ApproveArgs, CapsuleType, CreateArgs, ListArgs, UnlockArgs,
    },
    config::{handle_config_command, Config},
};

#[derive(Parser)]
#[command(name = "capsule")]
#[command(about = "A CLI tool for managing decentralized time capsules")]
#[command(version = "0.1.0")]
#[command(long_about = "
A command-line interface for creating, managing, and unlocking decentralized time capsules.
Time capsules allow you to encrypt and store content with various unlock conditions:
- Time-based: Unlock after a specific timestamp
- Multisig: Require multiple approvals to unlock
- Payment: Require payment to unlock

Examples:
    capsule create -f document.pdf -c time -t 1h
    capsule create -f secret.txt -c multisig --threshold 3 --approvers addr1,addr2,addr3
    capsule create -f image.jpg -c payment -p 1000000000
    capsule list
    capsule unlock -c abc123def456 -e <encryption_key>
    capsule approve -c abc123def456
")]
struct Cli {
    /// Configuration file path
    #[arg(short, long, global = true)]
    config: Option<PathBuf>,

    /// Sui network to use
    #[arg(short, long, global = true)]
    network: Option<String>,

    /// RPC URL (overrides network setting)
    #[arg(long, global = true)]
    rpc_url: Option<String>,

    /// IPFS URL
    #[arg(long, global = true)]
    ipfs_url: Option<String>,

    /// Private key file path
    #[arg(long, global = true)]
    private_key_path: Option<PathBuf>,

    /// Private key (inline)
    #[arg(long, global = true)]
    private_key: Option<String>,

    /// Verbose output
    #[arg(short, long, global = true)]
    verbose: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Create a new time capsule
    Create(CreateArgs),

    /// List time capsules
    List(ListArgs),

    /// Unlock a time capsule
    Unlock(UnlockArgs),

    /// Approve a multisig capsule
    Approve(ApproveArgs),

    /// Interactive commands
    #[command(subcommand)]
    Interactive(InteractiveCommands),

    /// Configuration management
    Config {
        /// Show current configuration
        #[arg(long)]
        show: bool,

        /// Initialize configuration file
        #[arg(long)]
        init: bool,
    },
}

#[derive(Subcommand)]
enum InteractiveCommands {
    /// Interactive capsule creation
    Create,
    /// Interactive capsule listing
    List,
    /// Interactive capsule unlocking
    Unlock,
    /// Interactive capsule approval
    Approve,
    /// List pending approvals
    PendingApprovals,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    // Initialize logging
    if cli.verbose {
        env::set_var("RUST_LOG", "debug");
    } else {
        env::set_var("RUST_LOG", "info");
    }
    env_logger::init();

    // Load configuration
    let mut config = Config::load(
        cli.config.as_deref(),
        cli.network.as_deref(),
        cli.rpc_url.as_ref(),
        cli.ipfs_url.as_ref(),
        cli.private_key_path.as_ref(),
        cli.verbose,
    )?;

    // Override config with CLI arguments
    if let Some(private_key) = cli.private_key {
        config.private_key = Some(private_key);
    }

    // Execute command
    match cli.command {
        Commands::Create(args) => handle_create(args, &config).await,
        Commands::List(args) => handle_list(args, &config).await,
        Commands::Unlock(args) => handle_unlock(args, &config).await,
        Commands::Approve(args) => handle_approve(args, &config).await,

        Commands::Interactive(interactive_cmd) => {
            match interactive_cmd {
                InteractiveCommands::Create => {
                    // For interactive create, we'll use dialoguer to build CreateArgs
                    handle_interactive_create(&config).await
                }
                InteractiveCommands::List => handle_list_interactive(&config).await,
                InteractiveCommands::Unlock => handle_unlock_interactive(&config).await,
                InteractiveCommands::Approve => handle_approve_interactive(&config).await,
                InteractiveCommands::PendingApprovals => {
                    handle_list_pending_approvals(&config).await
                }
            }
        }

        Commands::Config { show, init } => handle_config_command(&config, show, init).await,
    }
}

async fn handle_interactive_create(config: &Config) -> anyhow::Result<()> {
    use dialoguer::{Confirm, Input, Select};
    use std::path::PathBuf;

    println!(
        "{}",
        console::style("Interactive Capsule Creation").bold().cyan()
    );
    println!("{}", "=".repeat(50));

    // Get file path
    let file: String = Input::new()
        .with_prompt("Enter file or directory path")
        .validate_with(|input: &String| -> Result<(), &str> {
            let path = PathBuf::from(input);
            if !path.exists() {
                Err("File or directory does not exist")
            } else {
                Ok(())
            }
        })
        .interact_text()?;

    // Get capsule type
    let type_options = vec!["Time-based", "Multisig", "Payment"];
    let type_selection = Select::new()
        .with_prompt("Select capsule type")
        .items(&type_options)
        .interact()?;

    let capsule_type = match type_selection {
        0 => CapsuleType::Time,
        1 => CapsuleType::Multisig,
        2 => CapsuleType::Payment,
        _ => unreachable!(),
    };

    // Get type-specific parameters
    let (unlock_time, threshold, approvers, price) = match capsule_type {
        CapsuleType::Time => {
            let time_input: String = Input::new()
                .with_prompt("Enter unlock time (e.g., '1h', '30m', '2d')")
                .validate_with(|input: &String| -> Result<(), &str> {
                    if input.is_empty() {
                        Err("Unlock time cannot be empty")
                    } else {
                        Ok(())
                    }
                })
                .interact_text()?;
            (Some(time_input), None, Vec::new(), None)
        }
        CapsuleType::Multisig => {
            let threshold: u64 = Input::new()
                .with_prompt("Enter approval threshold")
                .validate_with(|input: &u64| -> Result<(), &str> {
                    if *input == 0 {
                        Err("Threshold must be greater than 0")
                    } else {
                        Ok(())
                    }
                })
                .interact_text()?;

            let approvers_input: String = Input::new()
                .with_prompt("Enter approver addresses (comma-separated)")
                .validate_with(|input: &String| -> Result<(), &str> {
                    if input.is_empty() {
                        Err("At least one approver is required")
                    } else {
                        let addrs: Vec<&str> = input.split(',').map(|s| s.trim()).collect();
                        if addrs.len() < threshold as usize {
                            Err("Number of approvers must be >= threshold")
                        } else {
                            Ok(())
                        }
                    }
                })
                .interact_text()?;

            let approvers: Vec<String> = approvers_input
                .split(',')
                .map(|s| s.trim().to_string())
                .collect();

            (None, Some(threshold), approvers, None)
        }
        CapsuleType::Payment => {
            let price: u64 = Input::new()
                .with_prompt("Enter price in MIST (1 SUI = 1,000,000,000 MIST)")
                .validate_with(|input: &u64| -> Result<(), &str> {
                    if *input == 0 {
                        Err("Price must be greater than 0")
                    } else {
                        Ok(())
                    }
                })
                .interact_text()?;
            (None, None, Vec::new(), Some(price))
        }
    };

    // Ask about recursive processing
    let recursive = if PathBuf::from(&file).is_dir() {
        Confirm::new()
            .with_prompt("Process directory recursively?")
            .default(true)
            .interact()?
    } else {
        false
    };

    // Create args and execute
    let args = CreateArgs {
        file: PathBuf::from(file),
        capsule_type,
        unlock_time,
        threshold,
        approvers,
        price,
        recursive,
        max_size: 104857600, // 100MB default
        extensions: Vec::new(),
        format: "human".to_string(),
    };

    handle_create(args, config).await
}
