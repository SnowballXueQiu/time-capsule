use anyhow::{Context, Result};
use base64::Engine;
use encryptor_wasi::encrypt_content;
use indicatif::{ProgressBar, ProgressStyle};
use ipfs_api_backend_hyper::{IpfsClient, TryFromUri};
use log::{debug, info, warn};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tokio::fs;

use crate::config::Config;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Capsule {
    pub id: String,
    pub owner: String,
    pub cid: String,
    pub content_hash: String,
    pub unlock_condition: UnlockCondition,
    pub created_at: u64,
    pub unlocked: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnlockCondition {
    pub condition_type: String,
    pub unlock_time: Option<u64>,
    pub threshold: Option<u64>,
    pub approvals: Vec<String>,
    pub price: Option<u64>,
    pub paid: bool,
}

#[derive(Debug, Clone)]
pub struct CapsuleCreationResult {
    pub capsule_id: String,
    pub transaction_digest: String,
    pub encryption_key: String,
    pub cid: String,
}

#[derive(Debug, Clone)]
pub struct UnlockResult {
    pub success: bool,
    pub content: Option<Vec<u8>>,
    pub content_type: Option<String>,
    pub error: Option<String>,
    pub transaction_digest: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ApprovalResult {
    pub success: bool,
    pub transaction_digest: String,
    pub current_approvals: u64,
    pub required_approvals: u64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreateCapsuleResult {
    pub capsule_id: String,
    pub transaction_digest: String,
    pub cid: String,
    pub encryption_key: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CapsuleStatus {
    pub capsule_id: String,
    pub capsule_type: String,
    pub status: String,
    pub created_at: u64,
    pub creator: Option<String>,
    pub content_size: Option<u64>,
    pub cid: Option<String>,
    pub unlock_time: Option<u64>,
    pub approvals: Option<ApprovalInfo>,
    pub price: Option<u64>,
    pub transaction_digest: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ApprovalInfo {
    pub current: u64,
    pub required: u64,
    pub approvers: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct CapsuleQuery {
    pub capsule_type: Option<String>,
    pub status: Option<String>,
    pub mine_only: bool,
    pub limit: u32,
    pub offset: u32,
}

impl Default for CapsuleQuery {
    fn default() -> Self {
        Self::new()
    }
}

impl CapsuleQuery {
    pub fn new() -> Self {
        Self {
            capsule_type: None,
            status: None,
            mine_only: false,
            limit: 50,
            offset: 0,
        }
    }

    pub fn with_type(mut self, capsule_type: &str) -> Self {
        self.capsule_type = Some(capsule_type.to_string());
        self
    }

    pub fn with_status(mut self, status: &str) -> Self {
        self.status = Some(status.to_string());
        self
    }

    pub fn mine_only(mut self) -> Self {
        self.mine_only = true;
        self
    }

    pub fn with_limit(mut self, limit: u32) -> Self {
        self.limit = limit;
        self
    }

    pub fn with_offset(mut self, offset: u32) -> Self {
        self.offset = offset;
        self
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct PendingApproval {
    pub capsule_id: String,
    pub created_at: u64,
    pub current_approvals: u64,
    pub required_approvals: u64,
    pub creator: Option<String>,
}

// Progress bar utilities
pub fn create_progress_bar(len: u64, message: &str) -> ProgressBar {
    let pb = ProgressBar::new(len);
    pb.set_style(
        ProgressStyle::default_bar()
            .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} {msg}")
            .unwrap()
            .progress_chars("#>-"),
    );
    pb.set_message(message.to_string());
    pb
}

pub fn create_spinner(message: &str) -> ProgressBar {
    let pb = ProgressBar::new_spinner();
    pb.set_style(
        ProgressStyle::default_spinner()
            .template("{spinner:.green} {msg}")
            .unwrap(),
    );
    pb.set_message(message.to_string());
    pb.enable_steady_tick(std::time::Duration::from_millis(100));
    pb
}

pub struct CapsuleSDK {
    config: Config,
    http_client: Client,
    ipfs_client: IpfsClient,
}

impl CapsuleSDK {
    pub async fn new(config: Config) -> Result<Self> {
        let http_client = Client::new();
        let ipfs_client =
            IpfsClient::from_str(&config.ipfs_url).context("Failed to create IPFS client")?;

        Ok(Self {
            config,
            http_client,
            ipfs_client,
        })
    }

    pub async fn get_capsules_by_owner(&self, owner: &str) -> Result<Vec<Capsule>> {
        info!("Fetching capsules for owner: {owner}");

        // Mock implementation - in real version would query Sui blockchain
        let mock_capsules = vec![
            Capsule {
                id: "0x1234567890abcdef".to_string(),
                owner: owner.to_string(),
                cid: "QmTest1234567890".to_string(),
                content_hash: "hash1".to_string(),
                unlock_condition: UnlockCondition {
                    condition_type: "time".to_string(),
                    unlock_time: Some(1735689600000),
                    threshold: None,
                    approvals: vec![],
                    price: None,
                    paid: false,
                },
                created_at: 1705689600000,
                unlocked: false,
            },
            Capsule {
                id: "0xabcdef1234567890".to_string(),
                owner: owner.to_string(),
                cid: "QmTest0987654321".to_string(),
                content_hash: "hash2".to_string(),
                unlock_condition: UnlockCondition {
                    condition_type: "multisig".to_string(),
                    unlock_time: None,
                    threshold: Some(3),
                    approvals: vec![
                        "0xapprover1".to_string(),
                        "0xapprover2".to_string(),
                        "0xapprover3".to_string(),
                    ],
                    price: None,
                    paid: false,
                },
                created_at: 1705689600000,
                unlocked: false,
            },
        ];

        Ok(mock_capsules)
    }

    pub async fn unlock_capsule(
        &self,
        capsule_id: &str,
        encryption_key: &str,
        payment: Option<u64>,
    ) -> Result<UnlockResult> {
        info!("Unlocking capsule: {} (payment: {:?})", capsule_id, payment);

        let pb = ProgressBar::new(4);
        pb.set_style(
            ProgressStyle::default_bar()
                .template(
                    "{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} {msg}",
                )
                .unwrap(),
        );

        pb.set_message("Validating unlock conditions...");
        pb.inc(1);

        // Mock validation - in real version would check blockchain state
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        pb.set_message("Executing unlock transaction...");
        pb.inc(1);

        // Mock blockchain transaction
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

        pb.set_message("Downloading from IPFS...");
        pb.inc(1);

        // Mock IPFS download and decryption
        let key_bytes = base64::engine::general_purpose::STANDARD
            .decode(encryption_key)
            .context("Invalid encryption key format")?;

        debug!(
            "Using encryption key of {} bytes for decryption",
            key_bytes.len()
        );

        // For mock implementation, just return mock content
        let mock_content = b"This is the decrypted content of the time capsule!".to_vec();

        pb.set_message("Complete!");
        pb.finish();

        Ok(UnlockResult {
            success: true,
            content: Some(mock_content),
            content_type: Some("text/plain".to_string()),
            error: None,
            transaction_digest: Some(format!("0x{:x}", rand::random::<u64>())),
        })
    }

    pub async fn approve_capsule(&self, capsule_id: &str) -> Result<ApprovalResult> {
        info!("Approving capsule: {capsule_id}");

        // Mock blockchain transaction
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

        Ok(ApprovalResult {
            success: true,
            transaction_digest: format!("0x{:x}", rand::random::<u64>()),
            current_approvals: 3,
            required_approvals: 3,
            error: None,
        })
    }

    // New methods needed by the commands
    pub async fn create_time_capsule(
        &self,
        content: Vec<u8>,
        unlock_time: u64,
        progress: Option<&ProgressBar>,
    ) -> Result<CreateCapsuleResult> {
        if let Some(pb) = progress {
            pb.set_message("Encrypting content...");
            pb.inc(1);
        }

        let encryption_key = self.generate_encryption_key();
        let encrypted_result =
            encrypt_content(&content, &encryption_key).context("Failed to encrypt content")?;

        if let Some(pb) = progress {
            pb.set_message("Uploading to IPFS...");
            pb.inc(1);
        }

        let cid = self.upload_to_ipfs(&encrypted_result.ciphertext).await?;

        if let Some(pb) = progress {
            pb.set_message("Creating blockchain transaction...");
            pb.inc(1);
        }

        let capsule_id = self
            .create_blockchain_capsule(&cid, unlock_time, "time")
            .await?;

        if let Some(pb) = progress {
            pb.set_message("Complete!");
            pb.finish();
        }

        Ok(CreateCapsuleResult {
            capsule_id,
            transaction_digest: format!("0x{:x}", rand::random::<u64>()),
            cid,
            encryption_key: base64::engine::general_purpose::STANDARD.encode(encryption_key),
        })
    }

    pub async fn create_multisig_capsule(
        &self,
        content: Vec<u8>,
        threshold: u64,
        approvers: Vec<String>,
        progress: Option<&ProgressBar>,
    ) -> Result<CreateCapsuleResult> {
        info!(
            "Creating multisig capsule with threshold {} and {} approvers",
            threshold,
            approvers.len()
        );

        if let Some(pb) = progress {
            pb.set_message("Encrypting content...");
            pb.inc(1);
        }

        let encryption_key = self.generate_encryption_key();
        let encrypted_result =
            encrypt_content(&content, &encryption_key).context("Failed to encrypt content")?;

        if let Some(pb) = progress {
            pb.set_message("Uploading to IPFS...");
            pb.inc(1);
        }

        let cid = self.upload_to_ipfs(&encrypted_result.ciphertext).await?;

        if let Some(pb) = progress {
            pb.set_message("Creating blockchain transaction...");
            pb.inc(1);
        }

        let capsule_id = self
            .create_blockchain_capsule(&cid, threshold, "multisig")
            .await?;

        if let Some(pb) = progress {
            pb.set_message("Complete!");
            pb.finish();
        }

        Ok(CreateCapsuleResult {
            capsule_id,
            transaction_digest: format!("0x{:x}", rand::random::<u64>()),
            cid,
            encryption_key: base64::engine::general_purpose::STANDARD.encode(encryption_key),
        })
    }

    pub async fn create_payment_capsule(
        &self,
        content: Vec<u8>,
        price: u64,
        progress: Option<&ProgressBar>,
    ) -> Result<CreateCapsuleResult> {
        if let Some(pb) = progress {
            pb.set_message("Encrypting content...");
            pb.inc(1);
        }

        let encryption_key = self.generate_encryption_key();
        let encrypted_result =
            encrypt_content(&content, &encryption_key).context("Failed to encrypt content")?;

        if let Some(pb) = progress {
            pb.set_message("Uploading to IPFS...");
            pb.inc(1);
        }

        let cid = self.upload_to_ipfs(&encrypted_result.ciphertext).await?;

        if let Some(pb) = progress {
            pb.set_message("Creating blockchain transaction...");
            pb.inc(1);
        }

        let capsule_id = self
            .create_blockchain_capsule(&cid, price, "payment")
            .await?;

        if let Some(pb) = progress {
            pb.set_message("Complete!");
            pb.finish();
        }

        Ok(CreateCapsuleResult {
            capsule_id,
            transaction_digest: format!("0x{:x}", rand::random::<u64>()),
            cid,
            encryption_key: base64::engine::general_purpose::STANDARD.encode(encryption_key),
        })
    }

    pub async fn unlock_and_decrypt(
        &self,
        capsule_id: &str,
        encryption_key: &str,
        payment: Option<u64>,
        progress: Option<&ProgressBar>,
    ) -> Result<UnlockResult> {
        info!(
            "Unlocking and decrypting capsule: {} (payment: {:?})",
            capsule_id, payment
        );

        if let Some(pb) = progress {
            pb.set_message("Validating unlock conditions...");
            pb.inc(1);
        }

        // Mock validation
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        if let Some(pb) = progress {
            pb.set_message("Executing unlock transaction...");
            pb.inc(1);
        }

        // Mock blockchain transaction
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

        if let Some(pb) = progress {
            pb.set_message("Downloading and decrypting...");
            pb.inc(1);
        }

        let key_bytes = base64::engine::general_purpose::STANDARD
            .decode(encryption_key)
            .context("Invalid encryption key format")?;

        debug!(
            "Using encryption key of {} bytes for decryption",
            key_bytes.len()
        );

        // Mock content
        let mock_content = b"This is the decrypted content of the time capsule!".to_vec();

        if let Some(pb) = progress {
            pb.set_message("Complete!");
            pb.finish();
        }

        Ok(UnlockResult {
            success: true,
            content: Some(mock_content),
            content_type: Some("text/plain".to_string()),
            error: None,
            transaction_digest: Some(format!("0x{:x}", rand::random::<u64>())),
        })
    }

    pub async fn approve_multisig_capsule(
        &self,
        capsule_id: &str,
        progress: Option<&ProgressBar>,
    ) -> Result<ApprovalResult> {
        info!("Approving multisig capsule: {}", capsule_id);

        if let Some(pb) = progress {
            pb.set_message("Submitting approval...");
            pb.inc(1);
        }

        // Mock blockchain transaction
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

        if let Some(pb) = progress {
            pb.set_message("Complete!");
            pb.finish();
        }

        Ok(ApprovalResult {
            success: true,
            transaction_digest: format!("0x{:x}", rand::random::<u64>()),
            current_approvals: 2,
            required_approvals: 3,
            error: None,
        })
    }

    pub async fn get_capsule_status(&self, capsule_id: &str) -> Result<CapsuleStatus> {
        // Mock implementation
        Ok(CapsuleStatus {
            capsule_id: capsule_id.to_string(),
            capsule_type: "multisig".to_string(),
            status: "locked".to_string(),
            created_at: 1705689600000,
            creator: Some("0x1234567890abcdef".to_string()),
            content_size: Some(1024),
            cid: Some("QmTest1234567890".to_string()),
            unlock_time: None,
            approvals: Some(ApprovalInfo {
                current: 1,
                required: 3,
                approvers: vec![
                    "0xapprover1".to_string(),
                    "0xapprover2".to_string(),
                    "0xapprover3".to_string(),
                ],
            }),
            price: None,
            transaction_digest: Some(format!("0x{:x}", rand::random::<u64>())),
        })
    }

    pub async fn list_capsules(&self, query: CapsuleQuery) -> Result<Vec<CapsuleStatus>> {
        // Mock implementation
        let mut capsules = vec![
            CapsuleStatus {
                capsule_id: "0x1234567890abcdef".to_string(),
                capsule_type: "time".to_string(),
                status: "locked".to_string(),
                created_at: 1705689600000,
                creator: Some("0x1234567890abcdef".to_string()),
                content_size: Some(2048),
                cid: Some("QmTest1234567890".to_string()),
                unlock_time: Some(1735689600000),
                approvals: None,
                price: None,
                transaction_digest: Some(format!("0x{:x}", rand::random::<u64>())),
            },
            CapsuleStatus {
                capsule_id: "0xabcdef1234567890".to_string(),
                capsule_type: "multisig".to_string(),
                status: "ready".to_string(),
                created_at: 1705689600000,
                creator: Some("0x1234567890abcdef".to_string()),
                content_size: Some(1024),
                cid: Some("QmTest0987654321".to_string()),
                unlock_time: None,
                approvals: Some(ApprovalInfo {
                    current: 3,
                    required: 3,
                    approvers: vec![
                        "0xapprover1".to_string(),
                        "0xapprover2".to_string(),
                        "0xapprover3".to_string(),
                    ],
                }),
                price: None,
                transaction_digest: Some(format!("0x{:x}", rand::random::<u64>())),
            },
        ];

        // Apply filters
        if let Some(ref capsule_type) = query.capsule_type {
            capsules.retain(|c| c.capsule_type == *capsule_type);
        }

        if let Some(ref status) = query.status {
            capsules.retain(|c| c.status == *status);
        }

        // Apply limit and offset
        let start = query.offset as usize;
        let end = std::cmp::min(start + query.limit as usize, capsules.len());

        if start < capsules.len() {
            capsules = capsules[start..end].to_vec();
        } else {
            capsules.clear();
        }

        Ok(capsules)
    }

    pub async fn get_pending_approvals(&self) -> Result<Vec<PendingApproval>> {
        // Mock implementation
        Ok(vec![
            PendingApproval {
                capsule_id: "0x1234567890abcdef".to_string(),
                created_at: 1705689600000,
                current_approvals: 1,
                required_approvals: 3,
                creator: Some("0xcreator123".to_string()),
            },
            PendingApproval {
                capsule_id: "0xabcdef1234567890".to_string(),
                created_at: 1705689600000,
                current_approvals: 2,
                required_approvals: 3,
                creator: Some("0xcreator456".to_string()),
            },
        ])
    }

    // Helper methods

    fn generate_encryption_key(&self) -> [u8; 32] {
        let mut key = [0u8; 32];
        for i in 0..32 {
            key[i] = rand::random::<u8>();
        }
        key
    }

    async fn upload_to_ipfs(&self, content: &[u8]) -> Result<String> {
        debug!(
            "Uploading {} bytes to IPFS using {}",
            content.len(),
            self.config.ipfs_url
        );

        // Mock IPFS upload - in real version would use ipfs_client
        let _client = &self.ipfs_client; // Would be used in real implementation
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

        // Generate mock CID
        let cid = format!("Qm{:x}", rand::random::<u64>());
        debug!("Generated CID: {cid}");

        Ok(cid)
    }

    async fn create_blockchain_capsule(
        &self,
        _cid: &str,
        value: u64,
        capsule_type: &str,
    ) -> Result<String> {
        debug!("Creating {capsule_type} capsule on blockchain with value: {value}");

        // Mock blockchain transaction - in real version would use http_client
        let _client = &self.http_client; // Would be used for Sui RPC calls
        tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;

        let capsule_id = format!("0x{:x}", rand::random::<u64>());
        debug!("Generated capsule ID: {capsule_id}");

        Ok(capsule_id)
    }
}

// Batch operations support
pub struct BatchOperation {
    pub files: Vec<std::path::PathBuf>,
    pub operation_type: String,
}

impl BatchOperation {
    pub async fn process_batch(
        &self,
        sdk: &CapsuleSDK,
        unlock_time: Option<u64>,
        threshold: Option<u64>,
        price: Option<u64>,
    ) -> Result<Vec<CreateCapsuleResult>> {
        let total_files = self.files.len();
        info!("Processing batch of {total_files} files");

        let pb = ProgressBar::new(total_files as u64);
        pb.set_style(ProgressStyle::default_bar()
            .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} Processing {msg}")
            .unwrap());

        let mut results = Vec::new();

        for file_path in self.files.iter() {
            pb.set_message(format!("{}", file_path.display()));

            match fs::read(file_path).await {
                Ok(content) => {
                    let result = if let Some(time) = unlock_time {
                        sdk.create_time_capsule(content, time, None).await
                    } else if let Some(threshold) = threshold {
                        sdk.create_multisig_capsule(content, threshold, vec![], None)
                            .await
                    } else if let Some(price) = price {
                        sdk.create_payment_capsule(content, price, None).await
                    } else {
                        return Err(anyhow::anyhow!("No unlock condition specified"));
                    };

                    match result {
                        Ok(res) => results.push(res),
                        Err(e) => warn!("Failed to process {}: {}", file_path.display(), e),
                    }
                }
                Err(e) => warn!("Failed to read {}: {}", file_path.display(), e),
            }

            pb.inc(1);
        }

        pb.finish_with_message("Batch processing complete");
        Ok(results)
    }
}
