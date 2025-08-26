use crate::config::Config;
use crate::sdk::{create_spinner, CapsuleStatus};
use crate::utils::{format_file_size, format_timestamp, init_sdk, truncate_string};
use anyhow::{Context, Result};
use clap::Args;
use console::style;

#[derive(Args)]
pub struct ListArgs {
    /// Filter by capsule type
    #[arg(short, long)]
    pub capsule_type: Option<String>,
    /// Filter by status
    #[arg(short, long)]
    pub status: Option<String>,
    /// Show only capsules created by current user
    #[arg(long)]
    pub mine: bool,
    /// Maximum number of results to return
    #[arg(short, long, default_value = "50")]
    pub limit: u32,
    /// Skip this many results (for pagination)
    #[arg(long, default_value = "0")]
    pub offset: u32,
    /// Output format
    #[arg(long, default_value = "human")]
    pub format: String,
    /// Show detailed information
    #[arg(short, long)]
    pub detailed: bool,
}

pub async fn handle_list(args: ListArgs, config: &Config) -> Result<()> {
    println!("{}", style("Listing Time Capsules").bold().cyan());
    println!("{}", "=".repeat(50));

    // Initialize SDK
    let spinner = create_spinner("Fetching capsules...");
    let sdk = init_sdk(config).await?;

    // Build query parameters
    let mut query = crate::sdk::CapsuleQuery::new()
        .with_limit(args.limit)
        .with_offset(args.offset);

    if let Some(capsule_type) = &args.capsule_type {
        query = query.with_type(capsule_type);
    }

    if let Some(status) = &args.status {
        query = query.with_status(status);
    }

    if args.mine {
        query = query.mine_only();
    }

    // Fetch capsules
    let capsules = sdk.list_capsules(query).await?;
    spinner.finish_with_message(format!("Found {} capsules ✓", capsules.len()));

    // Display results
    display_capsules(&capsules, &args)?;

    Ok(())
}

fn display_capsules(capsules: &[CapsuleStatus], args: &ListArgs) -> Result<()> {
    if capsules.is_empty() {
        println!("\n{}", style("No capsules found.").dim());
        return Ok(());
    }

    match args.format.as_str() {
        "json" => {
            let json = serde_json::to_value(capsules)?;
            println!("{}", serde_json::to_string_pretty(&json)?);
        }
        "csv" => {
            display_csv(capsules)?;
        }
        _ => {
            if args.detailed {
                display_detailed(capsules)?;
            } else {
                display_table(capsules)?;
            }
        }
    }

    Ok(())
}

fn display_table(capsules: &[CapsuleStatus]) -> Result<()> {
    println!(
        "\n{:<20} {:<12} {:<10} {:<15} {:<20}",
        style("Capsule ID").bold(),
        style("Type").bold(),
        style("Status").bold(),
        style("Created").bold(),
        style("Unlock Info").bold()
    );
    println!("{}", "-".repeat(80));

    for capsule in capsules {
        let id_short = truncate_string(&capsule.capsule_id, 18);
        let created = format_timestamp(capsule.created_at);
        let created_short = truncate_string(&created, 13);

        let unlock_info = match capsule.capsule_type.as_str() {
            "time" => {
                if let Some(unlock_time) = capsule.unlock_time {
                    let time_str = format_timestamp(unlock_time);
                    truncate_string(&time_str, 18)
                } else {
                    "Unknown".to_string()
                }
            }
            "multisig" => {
                if let Some(ref approvals) = capsule.approvals {
                    format!("{}/{} approvals", approvals.current, approvals.required)
                } else {
                    "Unknown".to_string()
                }
            }
            "payment" => {
                if let Some(price) = capsule.price {
                    format!("{} MIST", price)
                } else {
                    "Unknown".to_string()
                }
            }
            _ => "Unknown".to_string(),
        };

        let status_colored = match capsule.status.as_str() {
            "locked" => style(&capsule.status).red(),
            "unlocked" => style(&capsule.status).green(),
            "ready" => style(&capsule.status).yellow(),
            _ => style(&capsule.status).dim(),
        };

        println!(
            "{:<20} {:<12} {:<10} {:<15} {:<20}",
            style(id_short).cyan(),
            capsule.capsule_type,
            status_colored,
            created_short,
            unlock_info
        );
    }

    println!(
        "\n{} capsule{} found",
        style(capsules.len()).bold(),
        if capsules.len() == 1 { "" } else { "s" }
    );

    Ok(())
}

fn display_detailed(capsules: &[CapsuleStatus]) -> Result<()> {
    for (i, capsule) in capsules.iter().enumerate() {
        if i > 0 {
            println!();
        }

        println!("{}", style(format!("Capsule #{}", i + 1)).bold().cyan());
        println!("{}", "-".repeat(40));

        println!(
            "{} {}",
            style("ID:").bold(),
            style(&capsule.capsule_id).cyan()
        );
        println!("{} {}", style("Type:").bold(), capsule.capsule_type);

        let status_colored = match capsule.status.as_str() {
            "locked" => style(&capsule.status).red(),
            "unlocked" => style(&capsule.status).green(),
            "ready" => style(&capsule.status).yellow(),
            _ => style(&capsule.status).dim(),
        };
        println!("{} {}", style("Status:").bold(), status_colored);

        println!(
            "{} {}",
            style("Created:").bold(),
            format_timestamp(capsule.created_at)
        );

        if let Some(ref creator) = capsule.creator {
            println!("{} {}", style("Creator:").bold(), creator);
        }

        if let Some(size) = capsule.content_size {
            println!(
                "{} {}",
                style("Content Size:").bold(),
                format_file_size(size)
            );
        }

        if let Some(ref cid) = capsule.cid {
            println!("{} {}", style("IPFS CID:").bold(), cid);
        }

        // Type-specific information
        match capsule.capsule_type.as_str() {
            "time" => {
                if let Some(unlock_time) = capsule.unlock_time {
                    println!(
                        "{} {}",
                        style("Unlock Time:").bold(),
                        format_timestamp(unlock_time)
                    );

                    let now = crate::utils::current_timestamp_ms();
                    if unlock_time > now {
                        let remaining = unlock_time - now;
                        let remaining_str = format_duration_ms(remaining);
                        println!(
                            "{} {}",
                            style("Time Remaining:").bold(),
                            style(remaining_str).yellow()
                        );
                    } else {
                        println!(
                            "{} {}",
                            style("Time Remaining:").bold(),
                            style("Ready to unlock").green()
                        );
                    }
                }
            }
            "multisig" => {
                if let Some(ref approvals) = capsule.approvals {
                    println!(
                        "{} {}/{}",
                        style("Approvals:").bold(),
                        style(approvals.current).cyan(),
                        style(approvals.required).cyan()
                    );

                    if !approvals.approvers.is_empty() {
                        println!("{}", style("Approvers:").bold());
                        for approver in &approvals.approvers {
                            println!("  • {}", approver);
                        }
                    }
                }
            }
            "payment" => {
                if let Some(price) = capsule.price {
                    println!("{} {} MIST", style("Price:").bold(), style(price).cyan());
                }
            }
            _ => {}
        }

        if let Some(ref tx_digest) = capsule.transaction_digest {
            println!("{} {}", style("Transaction:").bold(), tx_digest);
        }
    }

    println!(
        "\n{} capsule{} found",
        style(capsules.len()).bold(),
        if capsules.len() == 1 { "" } else { "s" }
    );

    Ok(())
}

fn display_csv(capsules: &[CapsuleStatus]) -> Result<()> {
    println!("capsule_id,type,status,created_at,unlock_time,approvals_current,approvals_required,price,creator,content_size,cid");

    for capsule in capsules {
        let unlock_time = capsule
            .unlock_time
            .map(|t| t.to_string())
            .unwrap_or_default();
        let approvals_current = capsule
            .approvals
            .as_ref()
            .map(|a| a.current.to_string())
            .unwrap_or_default();
        let approvals_required = capsule
            .approvals
            .as_ref()
            .map(|a| a.required.to_string())
            .unwrap_or_default();
        let price = capsule.price.map(|p| p.to_string()).unwrap_or_default();
        let empty_string = String::new();
        let creator = capsule.creator.as_ref().unwrap_or(&empty_string);
        let content_size = capsule
            .content_size
            .map(|s| s.to_string())
            .unwrap_or_default();
        let cid = capsule.cid.as_ref().unwrap_or(&empty_string);

        println!(
            "{},{},{},{},{},{},{},{},{},{},{}",
            capsule.capsule_id,
            capsule.capsule_type,
            capsule.status,
            capsule.created_at,
            unlock_time,
            approvals_current,
            approvals_required,
            price,
            creator,
            content_size,
            cid
        );
    }

    Ok(())
}

fn format_duration_ms(duration_ms: u64) -> String {
    let seconds = duration_ms / 1000;
    let minutes = seconds / 60;
    let hours = minutes / 60;
    let days = hours / 24;

    if days > 0 {
        format!("{} day{}", days, if days == 1 { "" } else { "s" })
    } else if hours > 0 {
        format!("{} hour{}", hours, if hours == 1 { "" } else { "s" })
    } else if minutes > 0 {
        format!("{} minute{}", minutes, if minutes == 1 { "" } else { "s" })
    } else {
        format!("{} second{}", seconds, if seconds == 1 { "" } else { "s" })
    }
}

/// Interactive list command with filtering options
pub async fn handle_list_interactive(config: &Config) -> Result<()> {
    use dialoguer::{Confirm, Input, MultiSelect, Select};

    println!("{}", style("Interactive Capsule Listing").bold().cyan());
    println!("{}", "=".repeat(50));

    // Filter by type
    let type_options = vec!["All", "Time", "Multisig", "Payment"];
    let type_selection = Select::new()
        .with_prompt("Filter by capsule type")
        .items(&type_options)
        .default(0)
        .interact()?;

    let capsule_type = if type_selection == 0 {
        None
    } else {
        Some(type_options[type_selection].to_lowercase())
    };

    // Filter by status
    let status_options = vec!["All", "Locked", "Ready", "Unlocked"];
    let status_selection = Select::new()
        .with_prompt("Filter by status")
        .items(&status_options)
        .default(0)
        .interact()?;

    let status = if status_selection == 0 {
        None
    } else {
        Some(status_options[status_selection].to_lowercase())
    };

    // Mine only
    let mine = Confirm::new()
        .with_prompt("Show only your capsules?")
        .default(false)
        .interact()?;

    // Limit
    let limit: u32 = Input::new()
        .with_prompt("Maximum number of results")
        .default(50)
        .validate_with(|input: &u32| -> Result<(), &str> {
            if *input == 0 {
                Err("Limit must be greater than 0")
            } else if *input > 1000 {
                Err("Limit cannot exceed 1000")
            } else {
                Ok(())
            }
        })
        .interact_text()?;

    // Format options
    let format_options = vec!["Table", "Detailed", "JSON", "CSV"];
    let format_selection = Select::new()
        .with_prompt("Output format")
        .items(&format_options)
        .default(0)
        .interact()?;

    let (format, detailed) = match format_selection {
        0 => ("human".to_string(), false),
        1 => ("human".to_string(), true),
        2 => ("json".to_string(), false),
        3 => ("csv".to_string(), false),
        _ => ("human".to_string(), false),
    };

    // Create list args and proceed
    let args = ListArgs {
        capsule_type,
        status,
        mine,
        limit,
        offset: 0,
        format,
        detailed,
    };

    handle_list(args, config).await
}
