use blake3::Hasher;
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Hash computation errors
#[derive(Debug, Error)]
pub enum HashError {
    #[error("Invalid hash length: expected 32 bytes, got {0}")]
    InvalidHashLength(usize),
    #[error("Hash computation failed: {0}")]
    ComputationFailed(String),
}

/// Hash result containing the computed hash and metadata
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct HashResult {
    pub hash: [u8; 32],
    pub algorithm: String,
    pub input_size: usize,
}

/// Compute BLAKE3 hash of content
pub fn hash_content(content: &[u8]) -> HashResult {
    let mut hasher = Hasher::new();
    hasher.update(content);
    let hash = hasher.finalize().into();

    HashResult {
        hash,
        algorithm: "BLAKE3".to_string(),
        input_size: content.len(),
    }
}

/// Compute BLAKE3 hash and return only the hash bytes
pub fn hash_content_bytes(content: &[u8]) -> [u8; 32] {
    let mut hasher = Hasher::new();
    hasher.update(content);
    hasher.finalize().into()
}

/// Verify that content matches the expected hash
pub fn verify_content_hash(content: &[u8], expected_hash: &[u8; 32]) -> bool {
    let computed_hash = hash_content_bytes(content);
    computed_hash == *expected_hash
}

/// Verify that content matches the expected hash result
pub fn verify_content_hash_result(content: &[u8], expected: &HashResult) -> bool {
    let computed = hash_content(content);
    computed.hash == expected.hash && computed.input_size == content.len()
}

/// Compute hash of multiple content pieces concatenated
pub fn hash_multiple_contents(contents: &[&[u8]]) -> HashResult {
    let mut hasher = Hasher::new();
    let mut total_size = 0;

    for content in contents {
        hasher.update(content);
        total_size += content.len();
    }

    let hash = hasher.finalize().into();

    HashResult {
        hash,
        algorithm: "BLAKE3".to_string(),
        input_size: total_size,
    }
}

/// Create a hash from hex string
pub fn hash_from_hex(hex_str: &str) -> Result<[u8; 32], HashError> {
    if hex_str.len() != 64 {
        return Err(HashError::InvalidHashLength(hex_str.len() / 2));
    }

    let mut hash = [0u8; 32];
    for i in 0..32 {
        let byte_str = &hex_str[i * 2..i * 2 + 2];
        hash[i] = u8::from_str_radix(byte_str, 16)
            .map_err(|e| HashError::ComputationFailed(e.to_string()))?;
    }

    Ok(hash)
}

/// Convert hash to hex string
pub fn hash_to_hex(hash: &[u8; 32]) -> String {
    hex::encode(hash)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_content() {
        let content = b"Hello, World!";
        let result = hash_content(content);

        assert_eq!(result.algorithm, "BLAKE3");
        assert_eq!(result.input_size, content.len());
        assert_eq!(result.hash.len(), 32);

        // Test consistency
        let result2 = hash_content(content);
        assert_eq!(result, result2);
    }

    #[test]
    fn test_hash_content_bytes() {
        let content = b"Test content";
        let hash1 = hash_content_bytes(content);
        let hash2 = hash_content_bytes(content);

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 32);
    }

    #[test]
    fn test_verify_content_hash() {
        let content = b"Verification test";
        let hash = hash_content_bytes(content);

        assert!(verify_content_hash(content, &hash));
        assert!(!verify_content_hash(b"Different content", &hash));
    }

    #[test]
    fn test_verify_content_hash_result() {
        let content = b"Result verification test";
        let result = hash_content(content);

        assert!(verify_content_hash_result(content, &result));
        assert!(!verify_content_hash_result(b"Different", &result));
    }

    #[test]
    fn test_hash_multiple_contents() {
        let content1 = b"First part";
        let content2 = b"Second part";
        let contents = vec![content1.as_slice(), content2.as_slice()];

        let result = hash_multiple_contents(&contents);
        assert_eq!(result.input_size, content1.len() + content2.len());

        // Should be same as hashing concatenated content
        let mut concatenated = Vec::new();
        concatenated.extend_from_slice(content1);
        concatenated.extend_from_slice(content2);
        let single_result = hash_content(&concatenated);
        assert_eq!(result.hash, single_result.hash);
    }

    #[test]
    fn test_hash_hex_conversion() {
        let content = b"Hex conversion test";
        let hash = hash_content_bytes(content);

        let hex_str = hash_to_hex(&hash);
        assert_eq!(hex_str.len(), 64);

        let recovered_hash = hash_from_hex(&hex_str).unwrap();
        assert_eq!(hash, recovered_hash);
    }

    #[test]
    fn test_hash_from_hex_invalid() {
        // Test invalid length
        assert!(hash_from_hex("invalid").is_err());

        // Test invalid hex characters
        assert!(
            hash_from_hex("gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg")
                .is_err()
        );
    }

    #[test]
    fn test_different_content_different_hash() {
        let content1 = b"Content 1";
        let content2 = b"Content 2";

        let hash1 = hash_content_bytes(content1);
        let hash2 = hash_content_bytes(content2);

        assert_ne!(hash1, hash2);
    }
}
