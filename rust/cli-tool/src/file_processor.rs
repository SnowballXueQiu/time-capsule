use anyhow::{Context, Result};
use console::style;
use indicatif::{MultiProgress, ProgressBar};
use log::{error, info, warn};
use mime_guess::MimeGuess;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// File processing utilities for batch operations
pub struct FileProcessor {
    pub max_file_size: u64,
    pub allowed_extensions: Option<Vec<String>>,
    pub recursive: bool,
}

#[derive(Debug, Clone)]
pub struct FileInfo {
    pub path: PathBuf,
    pub size: u64,
    pub mime_type: String,
    pub is_binary: bool,
}

#[derive(Debug, Clone)]
pub struct BatchResult {
    pub successful: Vec<String>,
    pub failed: Vec<(String, String)>, // (file_path, error_message)
    pub total_processed: usize,
    pub total_size: u64,
}

impl Default for FileProcessor {
    fn default() -> Self {
        Self {
            max_file_size: 100 * 1024 * 1024, // 100MB
            allowed_extensions: None,
            recursive: false,
        }
    }
}

impl FileProcessor {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_max_size(mut self, max_size: u64) -> Self {
        self.max_file_size = max_size;
        self
    }

    pub fn with_extensions(mut self, extensions: Vec<String>) -> Self {
        self.allowed_extensions = Some(extensions);
        self
    }

    pub fn recursive(mut self, recursive: bool) -> Self {
        self.recursive = recursive;
        self
    }

    /// Process a single file or directory
    pub fn process_path(&self, path: &Path) -> Result<Vec<FileInfo>> {
        if path.is_file() {
            let file_info = self.analyze_file(path)?;
            Ok(vec![file_info])
        } else if path.is_dir() {
            self.process_directory(path)
        } else {
            anyhow::bail!(
                "Path does not exist or is not accessible: {}",
                path.display()
            );
        }
    }

    /// Process a directory
    fn process_directory(&self, dir: &Path) -> Result<Vec<FileInfo>> {
        let mut files = Vec::new();

        let walker = if self.recursive {
            WalkDir::new(dir)
        } else {
            WalkDir::new(dir).max_depth(1)
        };

        for entry in walker {
            let entry = entry.context("Failed to read directory entry")?;
            let path = entry.path();

            if path.is_file() {
                match self.analyze_file(path) {
                    Ok(file_info) => files.push(file_info),
                    Err(e) => {
                        warn!("Skipping file {}: {}", path.display(), e);
                    }
                }
            }
        }

        Ok(files)
    }

    /// Analyze a single file
    fn analyze_file(&self, path: &Path) -> Result<FileInfo> {
        let metadata = fs::metadata(path)
            .with_context(|| format!("Failed to read metadata for: {}", path.display()))?;

        let size = metadata.len();

        // Check file size
        if size > self.max_file_size {
            anyhow::bail!(
                "File too large: {} bytes (max: {} bytes)",
                size,
                self.max_file_size
            );
        }

        // Check file extension
        if let Some(ref allowed_exts) = self.allowed_extensions {
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                if !allowed_exts
                    .iter()
                    .any(|allowed| allowed.eq_ignore_ascii_case(ext))
                {
                    anyhow::bail!(
                        "File extension not allowed: {} (allowed: {})",
                        ext,
                        allowed_exts.join(", ")
                    );
                }
            } else {
                anyhow::bail!("File has no extension, but extensions are restricted");
            }
        }

        // Determine MIME type
        let mime_type = MimeGuess::from_path(path)
            .first_or_octet_stream()
            .to_string();

        // Check if binary
        let is_binary = !mime_type.starts_with("text/")
            && !mime_type.contains("json")
            && !mime_type.contains("xml");

        Ok(FileInfo {
            path: path.to_path_buf(),
            size,
            mime_type,
            is_binary,
        })
    }

    /// Validate files before processing
    pub fn validate_files(&self, files: &[FileInfo]) -> Result<()> {
        let total_size: u64 = files.iter().map(|f| f.size).sum();
        let total_count = files.len();

        info!(
            "Validating {total_count} files, total size: {total_size} bytes"
        );

        // Check for empty list
        if files.is_empty() {
            anyhow::bail!("No files to process");
        }

        // Warn about large batches
        if total_count > 100 {
            warn!("Processing large batch of {total_count} files");
        }

        if total_size > 1024 * 1024 * 1024 {
            // 1GB
            warn!("Processing large total size: {total_size} bytes");
        }

        Ok(())
    }

    /// Create a progress bar for batch operations
    pub fn create_batch_progress(&self, total_files: usize) -> (MultiProgress, ProgressBar) {
        let multi_progress = MultiProgress::new();
        let main_pb = multi_progress.add(ProgressBar::new(total_files as u64));

        main_pb.set_style(
            indicatif::ProgressStyle::default_bar()
                .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} files {msg}")
                .unwrap()
                .progress_chars("#>-"),
        );

        (multi_progress, main_pb)
    }
}

/// Batch operation utilities
pub struct BatchProcessor;

impl BatchProcessor {
    /// Process multiple files with progress reporting and parallel execution
    pub async fn process_files<F, Fut, T>(
        files: Vec<FileInfo>,
        processor: F,
        progress_bar: Option<&ProgressBar>,
    ) -> BatchResult
    where
        F: Fn(FileInfo) -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = Result<T>> + Send + 'static,
        T: std::fmt::Display + Send + 'static,
    {
        let mut successful = Vec::new();
        let mut failed = Vec::new();
        let total_size: u64 = files.iter().map(|f| f.size).sum();

        // Process files with controlled concurrency
        let semaphore = std::sync::Arc::new(tokio::sync::Semaphore::new(4)); // Max 4 concurrent operations
        let processor = std::sync::Arc::new(processor);
        let mut tasks = Vec::new();

        for file_info in files.into_iter() {
            let file_path = file_info.path.display().to_string();
            let permit = semaphore.clone().acquire_owned().await.unwrap();
            let processor_clone = processor.clone();

            if let Some(pb) = progress_bar {
                pb.set_message(format!(
                    "Processing: {}",
                    file_info
                        .path
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                ));
            }

            let task = tokio::spawn(async move {
                let _permit = permit; // Keep permit alive
                let result = processor_clone(file_info).await;
                (file_path, result)
            });

            tasks.push(task);
        }

        // Collect results
        for task in tasks {
            match task.await {
                Ok((file_path, Ok(result))) => {
                    successful.push(result.to_string());
                    info!("Successfully processed: {file_path}");
                }
                Ok((file_path, Err(e))) => {
                    let error_msg = e.to_string();
                    failed.push((file_path.clone(), error_msg.clone()));
                    error!("Failed to process {file_path}: {error_msg}");
                }
                Err(e) => {
                    let error_msg = format!("Task failed: {e}");
                    failed.push(("unknown".to_string(), error_msg));
                    error!("Task execution failed: {e}");
                }
            }

            if let Some(pb) = progress_bar {
                pb.inc(1);
            }
        }

        if let Some(pb) = progress_bar {
            pb.finish_with_message(format!(
                "Completed: {} successful, {} failed",
                successful.len(),
                failed.len()
            ));
        }

        BatchResult {
            total_processed: successful.len() + failed.len(),
            successful,
            failed,
            total_size,
        }
    }

    /// Process files sequentially (for operations that require ordering)
    pub async fn process_files_sequential<F, Fut, T>(
        files: Vec<FileInfo>,
        processor: F,
        progress_bar: Option<&ProgressBar>,
    ) -> BatchResult
    where
        F: Fn(FileInfo) -> Fut,
        Fut: std::future::Future<Output = Result<T>>,
        T: std::fmt::Display,
    {
        let mut successful = Vec::new();
        let mut failed = Vec::new();
        let total_size: u64 = files.iter().map(|f| f.size).sum();

        for file_info in files.into_iter() {
            let file_path = file_info.path.display().to_string();

            if let Some(pb) = progress_bar {
                pb.set_message(format!(
                    "Processing: {}",
                    file_info
                        .path
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                ));
            }

            match processor(file_info).await {
                Ok(result) => {
                    successful.push(result.to_string());
                    info!("Successfully processed: {file_path}");
                }
                Err(e) => {
                    let error_msg = e.to_string();
                    failed.push((file_path.clone(), error_msg.clone()));
                    error!("Failed to process {file_path}: {error_msg}");
                }
            }

            if let Some(pb) = progress_bar {
                pb.inc(1);
            }
        }

        if let Some(pb) = progress_bar {
            pb.finish_with_message(format!(
                "Completed: {} successful, {} failed",
                successful.len(),
                failed.len()
            ));
        }

        BatchResult {
            total_processed: successful.len() + failed.len(),
            successful,
            failed,
            total_size,
        }
    }

    /// Display batch results
    pub fn display_results(result: &BatchResult) {
        println!();
        println!("{}", style("Batch Processing Results").bold().cyan());
        println!("{}", "=".repeat(50));

        println!("Total files processed: {}", result.total_processed);
        println!(
            "Total size processed: {} bytes ({:.2} MB)",
            result.total_size,
            result.total_size as f64 / (1024.0 * 1024.0)
        );

        if !result.successful.is_empty() {
            println!();
            println!(
                "{} {} successful:",
                style("✅").green(),
                style(result.successful.len()).bold().green()
            );
            for success in &result.successful {
                println!("  • {success}");
            }
        }

        if !result.failed.is_empty() {
            println!();
            println!(
                "{} {} failed:",
                style("❌").red(),
                style(result.failed.len()).bold().red()
            );
            for (file, error) in &result.failed {
                println!("  • {}: {}", style(file).dim(), style(error).red());
            }
        }

        println!();
    }
}

/// Error reporting utilities
pub struct ErrorReporter;

impl ErrorReporter {
    /// Report a detailed error with context
    pub fn report_error(error: &anyhow::Error, context: &str) {
        eprintln!("{} {}", style("Error:").bold().red(), context);

        let mut current = error.source();
        let mut level = 0;

        eprintln!("  {error}");

        while let Some(err) = current {
            level += 1;
            eprintln!("  {}↳ {}", "  ".repeat(level), err);
            current = err.source();
        }

        eprintln!();
    }

    /// Report multiple errors in a batch
    pub fn report_batch_errors(errors: &[(String, String)]) {
        if errors.is_empty() {
            return;
        }

        eprintln!(
            "{} {} errors occurred:",
            style("⚠️").yellow(),
            style(errors.len()).bold().yellow()
        );

        for (context, error) in errors {
            eprintln!("  {} {}: {}", style("•").red(), style(context).dim(), error);
        }

        eprintln!();
    }

    /// Generate error summary with suggestions
    pub fn generate_error_summary(batch_result: &BatchResult) -> String {
        if batch_result.failed.is_empty() {
            return format!(
                "✅ All {} operations completed successfully",
                batch_result.successful.len()
            );
        }

        let mut summary = format!(
            "⚠️  {} of {} operations failed\n",
            batch_result.failed.len(),
            batch_result.total_processed
        );

        // Categorize errors
        let mut error_categories = std::collections::HashMap::new();
        for (_, error) in &batch_result.failed {
            let category = Self::categorize_error(error);
            *error_categories.entry(category).or_insert(0) += 1;
        }

        summary.push_str("\nError categories:\n");
        for (category, count) in error_categories {
            summary.push_str(&format!("  • {category}: {count} occurrences\n"));
        }

        summary.push_str("\nSuggestions:\n");
        summary.push_str("  • Check file permissions and accessibility\n");
        summary.push_str("  • Verify network connectivity for IPFS operations\n");
        summary.push_str("  • Ensure sufficient disk space and memory\n");
        summary.push_str("  • Review file size limits and format restrictions\n");

        summary
    }

    /// Categorize error types for better reporting
    fn categorize_error(error: &str) -> &'static str {
        if error.contains("permission") || error.contains("access") {
            "Permission/Access"
        } else if error.contains("network") || error.contains("connection") {
            "Network/Connectivity"
        } else if error.contains("size") || error.contains("large") {
            "File Size"
        } else if error.contains("format") || error.contains("invalid") {
            "Format/Validation"
        } else if error.contains("encrypt") || error.contains("decrypt") {
            "Encryption/Decryption"
        } else if error.contains("ipfs") {
            "IPFS Storage"
        } else if error.contains("blockchain") || error.contains("transaction") {
            "Blockchain/Transaction"
        } else {
            "Other"
        }
    }

    /// Suggest recovery actions based on error type
    pub fn suggest_recovery_actions(errors: &[(String, String)]) -> Vec<String> {
        let mut suggestions = Vec::new();
        let mut has_permission_errors = false;
        let mut has_network_errors = false;
        let mut has_size_errors = false;

        for (_, error) in errors {
            if error.contains("permission") || error.contains("access") {
                has_permission_errors = true;
            }
            if error.contains("network") || error.contains("connection") {
                has_network_errors = true;
            }
            if error.contains("size") || error.contains("large") {
                has_size_errors = true;
            }
        }

        if has_permission_errors {
            suggestions
                .push("Run with appropriate permissions or check file ownership".to_string());
        }
        if has_network_errors {
            suggestions.push("Check network connectivity and IPFS node availability".to_string());
        }
        if has_size_errors {
            suggestions.push("Use --max-size flag to increase file size limits".to_string());
        }

        if suggestions.is_empty() {
            suggestions.push("Review error details and try again".to_string());
        }

        suggestions
    }
}
