use clap::{Parser, Subcommand, ValueEnum};
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::PathBuf;

mod commands;
mod config;
mod utils;

use commands::{approve, create, list, unlock};
use config::Config;

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
    capsule create -f document.pdf --unlock-time 1735689600000
    capsule create -f secret.txt --threshold 3
    capsule create -f image.jpg --price 1000000000
    capsule list
    capsule unlock abc123def456
    capsule approve abc123def456
")]
struct Cli {
    /// Configuration file path
    #[arg(short, long, global = true)]
    config: Option<PathBuf>,

    /// Sui network to use
    #[arg(short, long, global = true, value_enum)]
    network: Option<Network>,

    /// RPC URL (overrides network setting)
    #[arg(long, global = true)]
    rpc_url: Option<String>,

    /// IPFS URL
    #[arg(long, global = true)]
    ipfs_url: Option<String>,

    /// Private key file path
    #[arg(long, global = true)]
    private_key: Option<PathBuf>,

    /// Verbose output
    #[arg(short, long, global = true)]
    verbose: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Clone, ValueEnum)]
enum Network {
    Mainnet,
    Testnet,
    Devnet,
    Localnet,
}

impl std::fmt::Display for Network {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Network::Mainnet => write!(f, "mainnet"),
            Network::Testnet => write!(f, "testnet"),
            Network::Devnet => write!(f, "devnet"),
            Network::Localnet => write!(f, "localnet"),
        }
    }
}

#[derive(Subcommand)]
enum Commands {
    /// Create a new time capsule
    Create {
        /// Path to the file to encrypt
        #[arg(short, long)]
        file: PathBuf,

        /// Unlock time in milliseconds since epoch (for time-based capsules)
        #[arg(long, conflicts_with_all = ["threshold", "price"])]
        unlock_time: Option<u64>,

        /// Multisig threshold (for multisig capsules)
        #[arg(long, conflicts_with_all = ["unlock_time", "price"])]
        threshold: Option<u64>,

        /// Price in MIST (1 SUI = 1,000,000,000 MIST) (for paid capsules)
        #[arg(long, conflicts_with_all = ["unlock_time", "threshold"])]
        price: Option<u64>,

        /// Output format
        #[arg(short, long, value_enum, default_value = "human")]
        output: OutputFormat,

        /// Save encryption key to file
        #[arg(long)]
        save_key: Option<PathBuf>,
    },

    /// List all capsules owned by the user
    List {
        /// Output format
        #[arg(short, long, value_enum, default_value = "table")]
        output: OutputFormat,

        /// Show only capsules that can be unlocked
        #[arg(long)]
        unlockable: bool,

        /// Filter by capsule type
        #[arg(long, value_enum)]
        capsule_type: Option<CapsuleType>,

        /// Limit number of results
        #[arg(long)]
        limit: Option<usize>,
    },

    /// Unlock a capsule
    Unlock {
        /// Capsule ID to unlock
        capsule_id: String,

        /// Encryption key (base64 encoded) or path to key file
        #[arg(short, long)]
        key: Option<String>,

        /// Payment amount in MIST (for paid capsules)
        #[arg(long)]
        payment: Option<u64>,

        /// Output file path (if not specified, content is written to stdout)
        #[arg(short, long)]
        output: Option<PathBuf>,

        /// Force unlock without confirmation
        #[arg(long)]
        force: bool,
    },

    /// Approve a multisig capsule
    Approve {
        /// Capsule ID to approve
        capsule_id: String,

        /// Output format
        #[arg(short, long, value_enum, default_value = "human")]
        output: OutputFormat,
    },

    /// Show configuration
    Config {
        /// Show current configuration
        #[arg(long)]
        show: bool,

        /// Initialize configuration file
        #[arg(long)]
        init: bool,
    },
}

#[derive(Clone, ValueEnum)]
enum OutputFormat {
    Human,
    Json,
    Table,
    Csv,
}

#[derive(Clone, ValueEnum)]
enum CapsuleType {
    Time,
    Multisig,
    Payment,
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
    let config = Config::load(
        cli.config.as_deref(),
        cli.network.as_ref(),
        cli.rpc_url.as_ref(),
        cli.ipfs_url.as_ref(),
        cli.private_key.as_ref(),
        cli.verbose,
    )?;

    // Execute command
    match cli.command {
        Commands::Create {
            file,
            unlock_time,
            threshold,
            price,
            output,
            save_key,
        } => {
            create::execute(
                &config,
                file,
                unlock_time,
                threshold,
                price,
                output,
                save_key,
            )
            .await
        }

        Commands::List {
            output,
            unlockable,
            capsule_type,
            limit,
        } => list::execute(&config, output, unlockable, capsule_type, limit).await,

        Commands::Unlock {
            capsule_id,
            key,
            payment,
            output,
            force,
        } => unlock::execute(&config, capsule_id, key, payment, output, force).await,

        Commands::Approve { capsule_id, output } => {
            approve::execute(&config, capsule_id, output).await
        }

        Commands::Config { show, init } => config::handle_config_command(&config, show, init).await,
    }
}
