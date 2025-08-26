use crate::config::Config;
use crate::file_processor::{BatchProcessor, FileInfo, FileProcessor};
use crate::sdk::CapsuleSDK;
use crate::utils::{future_timestamp, init_sdk, parse_duration, read_file_content};
use anyhow::{Context, Result};
use console::style;
use indicatif::ProgressBar;
use log::info;
use std::path::PathBuf;
use std::sync::Arc;

/// Batch operation types
#[derive(Debug, Clone)]
pub enum BatchOperationType {
    CreateTime {
        unlock_time: u64,
    },
    CreateMultisig {
        threshold: u64,
        approvers: Vec<String>,
    },
    CreatePayment {
        price: u64,
    },
    Unlock {
        encryption_keys: Vec<String>,
    },
}

/// Batch operation configuration
#[derive(Debug, Clone)]
pub struct BatchConfig {
    pub operation_type: BatchOperationType,
    pub max_concurrent: usize,
    pub retry_attempts: u32,
    pub retry_delay_ms: u64,
    pub continue_on_error: bool,
}

impl Default for BatchConfig {
    fn default() -> Self {
        Self {
            operation_type: BatchOperationType::CreateTime { unlock_time: 0 },
            max_concurrent: 4,
            retry_attempts: 3,
            retry_delay_ms: 1000,
            continue_on_error: true,
        }
    }
}

/// Batch operation executor
pub struct BatchExecutor {
    config: BatchConfig,
    sdk: Arc<CapsuleSDK>,
    file_processor: FileProcessor,
}

impl BatchExecutor {
    pub async fn new(config: BatchConfig, cli_config: &Config) -> Result<Self> {
        let sdk = Arc::new(init_sdk(cli_config).await?);
        let file_processor = FileProcessor::new();

        Ok(Self {
            config,
            sdk,
            file_processor,
        })
    }

    /// Execute batch operation on files
    pub async fn execute_batch(&self, input_paths: Vec<PathBuf>) -> Result<BatchOperationResult> {
        info!(
            "Starting batch operation with {} input paths",
            input_paths.len()
        );

        // Process all input paths to get file list
        let mut all_files = Vec::new();
        for path in input_paths {
            let files = self
                .file_processor
                .process_path(&path)
                .with_context(|| format!("Failed to process path: {}", path.display()))?;
            all_files.extend(files);
        }

        if all_files.is_empty() {
            return Ok(BatchOperationResult::empty());
        }

        // Validate files
        self.file_processor.validate_files(&all_files)?;

        println!(
            "\n{} Starting batch operation on {} files",
            style("").cyan(),
            style(all_files.len()).bold()
        );

        // Create progress tracking
        let (_multi_progress, main_pb) = self.file_processor.create_batch_progress(all_files.len());

        // Execute based on operation type
        let result = match &self.config.operation_type {
            BatchOperationType::CreateTime { unlock_time } => {
                self.execute_create_time_batch(all_files, *unlock_time, &main_pb)
                    .await?
            }
            BatchOperationType::CreateMultisig {
                threshold,
                approvers,
            } => {
                self.execute_create_multisig_batch(
                    all_files,
                    *threshold,
                    approvers.clone(),
                    &main_pb,
                )
                .await?
            }
            BatchOperationType::CreatePayment { price } => {
                self.execute_create_payment_batch(all_files, *price, &main_pb)
                    .await?
            }
            BatchOperationType::Unlock { encryption_keys } => {
                self.execute_unlock_batch(all_files, encryption_keys.clone(), &main_pb)
                    .await?
            }
        };

        main_pb.finish_with_message(format!(
            "Batch complete: {} successful, {} failed",
            result.successful.len(),
            result.failed.len()
        ));

        Ok(result)
    }

    async fn execute_create_time_batch(
        &self,
        files: Vec<FileInfo>,
        unlock_time: u64,
        progress_bar: &ProgressBar,
    ) -> Result<BatchOperationResult> {
        let sdk = self.sdk.clone();

        let batch_result = BatchProcessor::process_files(
            files,
            move |file_info| {
                let sdk = sdk.clone();
                async move {
                    let content = read_file_content(&file_info.path)?;
                    let result = sdk.create_time_capsule(content, unlock_time, None).await?;
                    Ok(format!(
                        "{} -> {}",
                        file_info.path.display(),
                        result.capsule_id
                    ))
                }
            },
            Some(progress_bar),
        )
        .await;

        Ok(BatchOperationResult::from_batch_result(batch_result))
    }

    async fn execute_create_multisig_batch(
        &self,
        files: Vec<FileInfo>,
        threshold: u64,
        approvers: Vec<String>,
        progress_bar: &ProgressBar,
    ) -> Result<BatchOperationResult> {
        let sdk = self.sdk.clone();

        let batch_result = BatchProcessor::process_files(
            files,
            move |file_info| {
                let sdk = sdk.clone();
                let approvers = approvers.clone();
                async move {
                    let content = read_file_content(&file_info.path)?;
                    let result = sdk
                        .create_multisig_capsule(content, threshold, approvers, None)
                        .await?;
                    Ok(format!(
                        "{} -> {}",
                        file_info.path.display(),
                        result.capsule_id
                    ))
                }
            },
            Some(progress_bar),
        )
        .await;

        Ok(BatchOperationResult::from_batch_result(batch_result))
    }

    async fn execute_create_payment_batch(
        &self,
        files: Vec<FileInfo>,
        price: u64,
        progress_bar: &ProgressBar,
    ) -> Result<BatchOperationResult> {
        let sdk = self.sdk.clone();

        let batch_result = BatchProcessor::process_files(
            files,
            move |file_info| {
                let sdk = sdk.clone();
                async move {
                    let content = read_file_content(&file_info.path)?;
                    let result = sdk.create_payment_capsule(content, price, None).await?;
                    Ok(format!(
                        "{} -> {}",
                        file_info.path.display(),
                        result.capsule_id
                    ))
                }
            },
            Some(progress_bar),
        )
        .await;

        Ok(BatchOperationResult::from_batch_result(batch_result))
    }

    async fn execute_unlock_batch(
        &self,
        files: Vec<FileInfo>,
        encryption_keys: Vec<String>,
        progress_bar: &ProgressBar,
    ) -> Result<BatchOperationResult> {
        if files.len() != encryption_keys.len() {
            anyhow::bail!(
                "Number of files ({}) must match number of encryption keys ({})",
                files.len(),
                encryption_keys.len()
            );
        }

        let mut successful = Vec::new();
        let mut failed = Vec::new();
        let total_size: u64 = files.iter().map(|f| f.size).sum();

        // Process files sequentially for unlock operations
        for (file_info, encryption_key) in files.into_iter().zip(encryption_keys.into_iter()) {
            progress_bar.set_message(format!(
                "Unlocking: {}",
                file_info
                    .path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
            ));

            match self.unlock_single_file(&file_info, &encryption_key).await {
                Ok(result) => {
                    successful.push(result);
                    info!("Successfully unlocked: {}", file_info.path.display());
                }
                Err(e) => {
                    let error_msg = e.to_string();
                    failed.push((file_info.path.display().to_string(), error_msg.clone()));
                    info!(
                        "Failed to unlock {}: {}",
                        file_info.path.display(),
                        error_msg
                    );
                }
            }

            progress_bar.inc(1);
        }

        progress_bar.finish_with_message(format!(
            "Unlock complete: {} successful, {} failed",
            successful.len(),
            failed.len()
        ));

        let total_processed = successful.len() + failed.len();

        Ok(BatchOperationResult {
            successful,
            failed,
            total_processed,
            total_size,
            operation_type: "unlock".to_string(),
        })
    }

    async fn unlock_single_file(
        &self,
        file_info: &FileInfo,
        encryption_key: &str,
    ) -> Result<String> {
        // For unlock operations, we assume the file contains a capsule ID
        let capsule_id_content = read_file_content(&file_info.path)?;
        let capsule_id = String::from_utf8(capsule_id_content)
            .context("File does not contain valid UTF-8 capsule ID")?
            .trim()
            .to_string();

        let result = self
            .sdk
            .unlock_and_decrypt(&capsule_id, encryption_key, None, None)
            .await?;

        if result.success {
            Ok(format!("{} -> unlocked", file_info.path.display()))
        } else {
            anyhow::bail!(
                "Failed to unlock: {}",
                result.error.unwrap_or_else(|| "Unknown error".to_string())
            )
        }
    }
}

/// Result of a batch operation
#[derive(Debug, Clone, serde::Serialize)]
pub struct BatchOperationResult {
    pub successful: Vec<String>,
    pub failed: Vec<(String, String)>,
    pub total_processed: usize,
    pub total_size: u64,
    pub operation_type: String,
}

impl BatchOperationResult {
    pub fn empty() -> Self {
        Self {
            successful: Vec::new(),
            failed: Vec::new(),
            total_processed: 0,
            total_size: 0,
            operation_type: "unknown".to_string(),
        }
    }

    pub fn from_batch_result(batch_result: crate::file_processor::BatchResult) -> Self {
        Self {
            successful: batch_result.successful,
            failed: batch_result.failed,
            total_processed: batch_result.total_processed,
            total_size: batch_result.total_size,
            operation_type: "batch".to_string(),
        }
    }

    pub fn display_summary(&self) {
        println!("\n{}", style("Batch Operation Summary").bold().cyan());
        println!("{}", "=".repeat(50));

        println!("Operation type: {}", self.operation_type);
        println!("Total processed: {}", self.total_processed);
        println!("Successful: {}", style(self.successful.len()).green());
        println!("Failed: {}", style(self.failed.len()).red());
        println!("Total size: {} bytes", self.total_size);

        if !self.successful.is_empty() {
            println!("\n{} Successful operations:", style("").green());
            for success in &self.successful {
                println!("   {success}");
            }
        }

        if !self.failed.is_empty() {
            println!("\n{} Failed operations:", style("").red());
            for (item, error) in &self.failed {
                println!("   {}: {}", style(item).dim(), style(error).red());
            }
        }
    }
}

/// Batch operation builder for easier configuration
pub struct BatchOperationBuilder {
    operation_type: Option<BatchOperationType>,
    max_concurrent: usize,
    retry_attempts: u32,
    retry_delay_ms: u64,
    continue_on_error: bool,
}

impl Default for BatchOperationBuilder {
    fn default() -> Self {
        Self {
            operation_type: None,
            max_concurrent: 4,
            retry_attempts: 3,
            retry_delay_ms: 1000,
            continue_on_error: true,
        }
    }
}

impl BatchOperationBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn create_time_capsules(mut self, unlock_duration: &str) -> Result<Self> {
        let duration_ms = parse_duration(unlock_duration)?;
        let unlock_time = future_timestamp(duration_ms);
        self.operation_type = Some(BatchOperationType::CreateTime { unlock_time });
        Ok(self)
    }

    pub fn create_multisig_capsules(mut self, threshold: u64, approvers: Vec<String>) -> Self {
        self.operation_type = Some(BatchOperationType::CreateMultisig {
            threshold,
            approvers,
        });
        self
    }

    pub fn create_payment_capsules(mut self, price: u64) -> Self {
        self.operation_type = Some(BatchOperationType::CreatePayment { price });
        self
    }

    pub fn unlock_capsules(mut self, encryption_keys: Vec<String>) -> Self {
        self.operation_type = Some(BatchOperationType::Unlock { encryption_keys });
        self
    }

    pub fn max_concurrent(mut self, max: usize) -> Self {
        self.max_concurrent = max;
        self
    }

    pub fn retry_attempts(mut self, attempts: u32) -> Self {
        self.retry_attempts = attempts;
        self
    }

    pub fn retry_delay(mut self, delay_ms: u64) -> Self {
        self.retry_delay_ms = delay_ms;
        self
    }

    pub fn continue_on_error(mut self, continue_on_error: bool) -> Self {
        self.continue_on_error = continue_on_error;
        self
    }

    pub fn build(self) -> Result<BatchConfig> {
        let operation_type = self
            .operation_type
            .ok_or_else(|| anyhow::anyhow!("Operation type must be specified"))?;

        Ok(BatchConfig {
            operation_type,
            max_concurrent: self.max_concurrent,
            retry_attempts: self.retry_attempts,
            retry_delay_ms: self.retry_delay_ms,
            continue_on_error: self.continue_on_error,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_batch_operation_builder() {
        let config = BatchOperationBuilder::new()
            .create_time_capsules("1h")
            .unwrap()
            .max_concurrent(8)
            .retry_attempts(5)
            .build()
            .unwrap();

        assert_eq!(config.max_concurrent, 8);
        assert_eq!(config.retry_attempts, 5);

        match config.operation_type {
            BatchOperationType::CreateTime { unlock_time } => {
                assert!(unlock_time > 0);
            }
            _ => panic!("Expected CreateTime operation type"),
        }
    }

    #[test]
    fn test_batch_operation_result() {
        let result = BatchOperationResult {
            successful: vec!["file1.txt -> 0x123".to_string()],
            failed: vec![("file2.txt".to_string(), "Permission denied".to_string())],
            total_processed: 2,
            total_size: 1024,
            operation_type: "create_time".to_string(),
        };

        assert_eq!(result.successful.len(), 1);
        assert_eq!(result.failed.len(), 1);
        assert_eq!(result.total_processed, 2);
    }
}
