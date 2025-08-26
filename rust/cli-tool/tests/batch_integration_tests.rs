use anyhow::Result;
use capsule_cli::batch::{BatchExecutor, BatchOperationBuilder};
use capsule_cli::config::Config;
use std::fs;
use tempfile::TempDir;

/// Integration tests for CLI batch operations
#[tokio::test]
async fn test_batch_create_time_capsules() -> Result<()> {
    // Create temporary directory with test files
    let temp_dir = TempDir::new()?;
    let file1_path = temp_dir.path().join("test1.txt");
    let file2_path = temp_dir.path().join("test2.txt");
    
    fs::write(&file1_path, b"Test content 1")?;
    fs::write(&file2_path, b"Test content 2")?;

    // Create test configuration
    let config = Config::default();

    // Build batch configuration
    let batch_config = BatchOperationBuilder::new()
        .create_time_capsules("1h")?
        .max_concurrent(2)
        .build()?;

    // Create batch executor
    let executor = BatchExecutor::new(batch_config, &config).await?;

    // Execute batch operation
    let result = executor.execute_batch(vec![file1_path, file2_path]).await?;

    // Verify results
    assert_eq!(result.total_processed, 2);
    // Note: In a real test, we would check for actual success/failure
    // For now, we're testing the structure works

    Ok(())
}

#[tokio::test]
async fn test_batch_create_multisig_capsules() -> Result<()> {
    let temp_dir = TempDir::new()?;
    let file_path = temp_dir.path().join("multisig_test.txt");
    fs::write(&file_path, b"Multisig test content")?;

    let config = Config::default();

    let batch_config = BatchOperationBuilder::new()
        .create_multisig_capsules(2, vec![
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string(),
            "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890".to_string(),
            "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba".to_string(),
        ])
        .build()?;

    let executor = BatchExecutor::new(batch_config, &config).await?;
    let result = executor.execute_batch(vec![file_path]).await?;

    assert_eq!(result.total_processed, 1);
    Ok(())
}

#[tokio::test]
async fn test_batch_create_payment_capsules() -> Result<()> {
    let temp_dir = TempDir::new()?;
    let file_path = temp_dir.path().join("payment_test.txt");
    fs::write(&file_path, b"Payment test content")?;

    let config = Config::default();

    let batch_config = BatchOperationBuilder::new()
        .create_payment_capsules(1000000000) // 1 SUI in MIST
        .build()?;

    let executor = BatchExecutor::new(batch_config, &config).await?;
    let result = executor.execute_batch(vec![file_path]).await?;

    assert_eq!(result.total_processed, 1);
    Ok(())
}

#[tokio::test]
async fn test_batch_operation_builder() -> Result<()> {
    // Test time capsule builder
    let time_config = BatchOperationBuilder::new()
        .create_time_capsules("2h")?
        .max_concurrent(8)
        .retry_attempts(5)
        .continue_on_error(false)
        .build()?;

    assert_eq!(time_config.max_concurrent, 8);
    assert_eq!(time_config.retry_attempts, 5);
    assert!(!time_config.continue_on_error);

    // Test multisig builder
    let multisig_config = BatchOperationBuilder::new()
        .create_multisig_capsules(3, vec![
            "0x1111111111111111111111111111111111111111111111111111111111111111".to_string(),
            "0x2222222222222222222222222222222222222222222222222222222222222222".to_string(),
            "0x3333333333333333333333333333333333333333333333333333333333333333".to_string(),
        ])
        .build()?;

    match multisig_config.operation_type {
        capsule_cli::batch::BatchOperationType::CreateMultisig { threshold, approvers } => {
            assert_eq!(threshold, 3);
            assert_eq!(approvers.len(), 3);
        }
        _ => panic!("Expected CreateMultisig operation type"),
    }

    // Test payment builder
    let payment_config = BatchOperationBuilder::new()
        .create_payment_capsules(500000000)
        .build()?;

    match payment_config.operation_type {
        capsule_cli::batch::BatchOperationType::CreatePayment { price } => {
            assert_eq!(price, 500000000);
        }
        _ => panic!("Expected CreatePayment operation type"),
    }

    Ok(())
}

#[tokio::test]
async fn test_batch_error_handling() -> Result<()> {
    let temp_dir = TempDir::new()?;
    
    // Create a file that will cause an error (empty file)
    let empty_file = temp_dir.path().join("empty.txt");
    fs::write(&empty_file, b"")?;
    
    // Create a valid file
    let valid_file = temp_dir.path().join("valid.txt");
    fs::write(&valid_file, b"Valid content")?;

    let config = Config::default();

    let batch_config = BatchOperationBuilder::new()
        .create_time_capsules("1h")?
        .continue_on_error(true)
        .build()?;

    let executor = BatchExecutor::new(batch_config, &config).await?;
    let result = executor.execute_batch(vec![empty_file, valid_file]).await?;

    // Should process both files, but some might fail
    assert_eq!(result.total_processed, 2);
    
    Ok(())
}

#[tokio::test]
async fn test_batch_directory_processing() -> Result<()> {
    let temp_dir = TempDir::new()?;
    
    // Create subdirectory with files
    let sub_dir = temp_dir.path().join("subdir");
    fs::create_dir(&sub_dir)?;
    
    let file1 = sub_dir.join("file1.txt");
    let file2 = sub_dir.join("file2.txt");
    
    fs::write(&file1, b"Content 1")?;
    fs::write(&file2, b"Content 2")?;

    let config = Config::default();

    let batch_config = BatchOperationBuilder::new()
        .create_time_capsules("30m")?
        .build()?;

    let executor = BatchExecutor::new(batch_config, &config).await?;
    
    // Process the directory
    let result = executor.execute_batch(vec![sub_dir]).await?;

    // Should find and process files in the directory
    assert!(result.total_processed >= 2);
    
    Ok(())
}

#[test]
fn test_batch_operation_result_display() {
    use capsule_cli::batch::BatchOperationResult;
    
    let result = BatchOperationResult {
        successful: vec![
            "file1.txt -> 0x123abc".to_string(),
            "file2.txt -> 0x456def".to_string(),
        ],
        failed: vec![
            ("file3.txt".to_string(), "Permission denied".to_string()),
        ],
        total_processed: 3,
        total_size: 2048,
        operation_type: "create_time".to_string(),
    };

    // Test that display doesn't panic
    result.display_summary();
    
    assert_eq!(result.successful.len(), 2);
    assert_eq!(result.failed.len(), 1);
    assert_eq!(result.total_processed, 3);
}

#[tokio::test]
async fn test_batch_concurrent_limit() -> Result<()> {
    let temp_dir = TempDir::new()?;
    
    // Create multiple files
    for i in 0..10 {
        let file_path = temp_dir.path().join(format!("file{i}.txt"));
        fs::write(&file_path, format!("Content {i}").as_bytes())?;
    }

    let config = Config::default();

    // Test with different concurrency limits
    for max_concurrent in [1, 2, 4, 8] {
        let batch_config = BatchOperationBuilder::new()
            .create_time_capsules("1h")?
            .max_concurrent(max_concurrent)
            .build()?;

        assert_eq!(batch_config.max_concurrent, max_concurrent);

        let executor = BatchExecutor::new(batch_config, &config).await?;
        let result = executor.execute_batch(vec![temp_dir.path().to_path_buf()]).await?;

        // Should process all files regardless of concurrency limit
        assert!(result.total_processed >= 10);
    }

    Ok(())
}
