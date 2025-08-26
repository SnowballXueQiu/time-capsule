use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub network: String,
    pub rpc_url: String,
    pub ipfs_url: String,
    pub package_id: Option<String>,
    pub private_key_path: Option<PathBuf>,
    pub private_key: Option<String>,
    pub default_output_format: String,
    pub verbose: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            network: "devnet".to_string(),
            rpc_url: "https://fullnode.devnet.sui.io:443".to_string(),
            ipfs_url: "https://ipfs.infura.io:5001".to_string(),
            package_id: None,
            private_key_path: None,
            private_key: None,
            default_output_format: "human".to_string(),
            verbose: false,
        }
    }
}

impl Config {
    /// Load configuration from file and CLI arguments
    pub fn load(
        config_path: Option<&Path>,
        network: Option<&str>,
        rpc_url: Option<&String>,
        ipfs_url: Option<&String>,
        private_key: Option<&PathBuf>,
        verbose: bool,
    ) -> Result<Self> {
        let mut config = Self::default();

        // Load from config file if it exists
        if let Some(path) = config_path {
            config = Self::load_from_file(path)?;
        } else {
            // Try default config locations
            if let Some(default_config) = Self::find_default_config()? {
                config = Self::load_from_file(&default_config)?;
            }
        }

        // Override with CLI arguments
        if let Some(network) = network {
            config.network = network.to_string();
        }

        if let Some(rpc_url) = rpc_url {
            config.rpc_url = rpc_url.clone();
        }

        if let Some(ipfs_url) = ipfs_url {
            config.ipfs_url = ipfs_url.clone();
        }

        if let Some(private_key) = private_key {
            config.private_key_path = Some(private_key.clone());
        }

        if verbose {
            config.verbose = true;
        }

        // Load from environment variables
        config.load_from_env()?;

        Ok(config)
    }

    /// Load configuration from file
    pub fn load_from_file(path: &Path) -> Result<Self> {
        let content = fs::read_to_string(path)
            .with_context(|| format!("Failed to read config file: {}", path.display()))?;

        let config: Self = toml::from_str(&content)
            .with_context(|| format!("Failed to parse config file: {}", path.display()))?;

        Ok(config)
    }

    /// Find default configuration file
    fn find_default_config() -> Result<Option<PathBuf>> {
        // Check current directory
        let current_dir_config = PathBuf::from("capsule.toml");
        if current_dir_config.exists() {
            return Ok(Some(current_dir_config));
        }

        // Check home directory
        if let Some(home_dir) = dirs::home_dir() {
            let home_config = home_dir.join(".capsule").join("config.toml");
            if home_config.exists() {
                return Ok(Some(home_config));
            }
        }

        // Check XDG config directory
        if let Some(config_dir) = dirs::config_dir() {
            let xdg_config = config_dir.join("capsule").join("config.toml");
            if xdg_config.exists() {
                return Ok(Some(xdg_config));
            }
        }

        Ok(None)
    }

    /// Load configuration from environment variables
    fn load_from_env(&mut self) -> Result<()> {
        if let Ok(network) = env::var("CAPSULE_NETWORK") {
            self.network = network;
        }

        if let Ok(rpc_url) = env::var("CAPSULE_RPC_URL") {
            self.rpc_url = rpc_url;
        }

        if let Ok(ipfs_url) = env::var("CAPSULE_IPFS_URL") {
            self.ipfs_url = ipfs_url;
        }

        if let Ok(package_id) = env::var("CAPSULE_PACKAGE_ID") {
            self.package_id = Some(package_id);
        }

        if let Ok(private_key_path) = env::var("CAPSULE_PRIVATE_KEY_PATH") {
            self.private_key_path = Some(PathBuf::from(private_key_path));
        }

        Ok(())
    }

    /// Save configuration to file
    pub fn save_to_file(&self, path: &Path) -> Result<()> {
        // Create parent directories if they don't exist
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).with_context(|| {
                format!("Failed to create config directory: {}", parent.display())
            })?;
        }

        let content = toml::to_string_pretty(self).context("Failed to serialize configuration")?;

        fs::write(path, content)
            .with_context(|| format!("Failed to write config file: {}", path.display()))?;

        Ok(())
    }

    /// Get the effective RPC URL
    pub fn get_rpc_url(&self) -> String {
        self.rpc_url.clone()
    }

    /// Get the default config file path
    pub fn default_config_path() -> Result<PathBuf> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| anyhow::anyhow!("Could not determine config directory"))?;
        Ok(config_dir.join("capsule").join("config.toml"))
    }
}

/// Get default config file path
pub fn default_config_path() -> Result<PathBuf> {
    if let Some(config_dir) = dirs::config_dir() {
        Ok(config_dir.join("capsule").join("config.toml"))
    } else {
        Ok(PathBuf::from(".capsule").join("config.toml"))
    }
}

/// Handle config command
pub async fn handle_config_command(config: &Config, show: bool, init: bool) -> Result<()> {
    if init {
        let config_path = Config::default_config_path()?;
        let default_config = Config::default();

        if config_path.exists() {
            println!(
                "Configuration file already exists at: {}",
                config_path.display()
            );
            println!("Use --show to view current configuration");
            return Ok(());
        }

        default_config.save_to_file(&config_path)?;
        println!("Configuration file created at: {}", config_path.display());
        println!("Edit the file to customize your settings");
        return Ok(());
    }

    if show {
        println!("Current Configuration:");
        println!("Network: {}", config.network);
        println!("RPC URL: {}", config.get_rpc_url());
        println!("IPFS URL: {}", config.ipfs_url);

        if let Some(package_id) = &config.package_id {
            println!("Package ID: {}", package_id);
        } else {
            println!("Package ID: Not set");
        }

        if let Some(private_key_path) = &config.private_key_path {
            println!("Private Key Path: {}", private_key_path.display());
        } else {
            println!("Private Key Path: Not set");
        }

        println!("Default Output Format: {}", config.default_output_format);
        println!("Verbose: {}", config.verbose);

        return Ok(());
    }

    println!("Use --show to view current configuration or --init to create a new config file");
    Ok(())
}
