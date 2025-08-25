use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "capsule")]
#[command(about = "A CLI tool for managing decentralized time capsules")]
#[command(version = "0.1.0")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Create a new time capsule
    Create {
        /// Path to the file to encrypt
        #[arg(short, long)]
        file: PathBuf,
        
        /// Unlock time in milliseconds since epoch (for time-based capsules)
        #[arg(long)]
        unlock_time: Option<u64>,
        
        /// Multisig threshold (for multisig capsules)
        #[arg(long)]
        threshold: Option<u64>,
        
        /// Price in SUI (for paid capsules)
        #[arg(long)]
        price: Option<u64>,
    },
    
    /// List all capsules owned by the user
    List,
    
    /// Unlock a capsule
    Unlock {
        /// Capsule ID to unlock
        capsule_id: String,
    },
    
    /// Approve a multisig capsule
    Approve {
        /// Capsule ID to approve
        capsule_id: String,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    
    match cli.command {
        Commands::Create { file, unlock_time, threshold, price } => {
            println!("Creating capsule for file: {:?}", file);
            if let Some(time) = unlock_time {
                println!("Time-based unlock at: {}", time);
            }
            if let Some(threshold) = threshold {
                println!("Multisig threshold: {}", threshold);
            }
            if let Some(price) = price {
                println!("Payment required: {} SUI", price);
            }
            // TODO: Implement capsule creation logic
        },
        
        Commands::List => {
            println!("Listing all capsules...");
            // TODO: Implement capsule listing logic
        },
        
        Commands::Unlock { capsule_id } => {
            println!("Unlocking capsule: {}", capsule_id);
            // TODO: Implement capsule unlocking logic
        },
        
        Commands::Approve { capsule_id } => {
            println!("Approving capsule: {}", capsule_id);
            // TODO: Implement capsule approval logic
        },
    }
    
    Ok(())
}