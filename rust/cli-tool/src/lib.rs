use clap::ValueEnum;

pub mod commands;
pub mod config;
pub mod utils;

pub use config::Config;

#[derive(Clone, ValueEnum)]
pub enum Network {
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

#[derive(Clone, ValueEnum)]
pub enum OutputFormat {
    Human,
    Json,
    Table,
    Csv,
}

#[derive(Clone, ValueEnum)]
pub enum CapsuleType {
    Time,
    Multisig,
    Payment,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use tempfile::TempDir;

    #[test]
    fn test_config_default() {
        let config = Config::default();
        assert_eq!(config.network, "devnet");
        assert_eq!(config.ipfs_url, "https://ipfs.infura.io:5001");
        assert_eq!(config.default_output_format, "human");
        assert!(!config.verbose);
    }

    #[test]
    fn test_config_rpc_url() {
        let config = Config::default();

        // Test default networks
        let mut config_mainnet = config.clone();
        config_mainnet.network = "mainnet".to_string();
        assert_eq!(
            config_mainnet.get_rpc_url(),
            "https://fullnode.mainnet.sui.io:443"
        );

        let mut config_testnet = config.clone();
        config_testnet.network = "testnet".to_string();
        assert_eq!(
            config_testnet.get_rpc_url(),
            "https://fullnode.testnet.sui.io:443"
        );

        let mut config_devnet = config.clone();
        config_devnet.network = "devnet".to_string();
        assert_eq!(
            config_devnet.get_rpc_url(),
            "https://fullnode.devnet.sui.io:443"
        );

        let mut config_localnet = config.clone();
        config_localnet.network = "localnet".to_string();
        assert_eq!(config_localnet.get_rpc_url(), "http://127.0.0.1:9000");

        // Test custom RPC URL override
        let mut config_custom = config.clone();
        config_custom.rpc_url = Some("https://custom.rpc.url".to_string());
        assert_eq!(config_custom.get_rpc_url(), "https://custom.rpc.url");
    }

    #[tokio::test]
    async fn test_config_save_and_load() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("test_config.toml");

        // Create and save config
        let mut original_config = Config::default();
        original_config.network = "testnet".to_string();
        original_config.verbose = true;
        original_config.package_id = Some("0x123".to_string());

        original_config.save_to_file(&config_path).unwrap();

        // Load config back
        let loaded_config = Config::load_from_file(&config_path).unwrap();

        assert_eq!(loaded_config.network, "testnet");
        assert!(loaded_config.verbose);
        assert_eq!(loaded_config.package_id, Some("0x123".to_string()));
    }
}
