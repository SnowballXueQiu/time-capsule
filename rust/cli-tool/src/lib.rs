
pub mod batch;
pub mod commands;
pub mod config;
pub mod file_processor;
pub mod sdk;
pub mod utils;

pub use batch::*;
pub use config::Config;

#[cfg(test)]
mod tests {
    use super::*;
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

        // Test that get_rpc_url returns the configured rpc_url
        assert_eq!(config.get_rpc_url(), "https://fullnode.devnet.sui.io:443");

        // Test custom RPC URL override
        let mut config_custom = config.clone();
        config_custom.rpc_url = "https://custom.rpc.url".to_string();
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
