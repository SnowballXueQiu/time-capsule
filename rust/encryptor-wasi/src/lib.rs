use blake3::Hasher;
use chacha20poly1305::{
    aead::{Aead, KeyInit, OsRng},
    XChaCha20Poly1305, XNonce,
};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Encryption result containing ciphertext, nonce, and content hash
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptionResult {
    pub ciphertext: Vec<u8>,
    pub nonce: [u8; 24],
    pub content_hash: [u8; 32],
}

/// Decryption result containing the original content
#[derive(Debug, Clone)]
pub struct DecryptionResult {
    pub content: Vec<u8>,
}

/// Encryption errors
#[derive(Debug, Error)]
pub enum EncryptionError {
    #[error("Invalid key length: expected 32 bytes, got {0}")]
    InvalidKeyLength(usize),
    #[error("Encryption failed: {0}")]
    EncryptionFailed(String),
    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),
    #[error("Random number generation failed")]
    RandomGenerationFailed,
}

/// Generate a new 32-byte encryption key
pub fn generate_key() -> Result<[u8; 32], EncryptionError> {
    let mut key = [0u8; 32];
    OsRng
        .try_fill_bytes(&mut key)
        .map_err(|_| EncryptionError::RandomGenerationFailed)?;
    Ok(key)
}

/// Generate a new 24-byte nonce for XChaCha20
pub fn generate_nonce() -> Result<[u8; 24], EncryptionError> {
    let mut nonce = [0u8; 24];
    OsRng
        .try_fill_bytes(&mut nonce)
        .map_err(|_| EncryptionError::RandomGenerationFailed)?;
    Ok(nonce)
}

/// Compute BLAKE3 hash of content
pub fn hash_content(content: &[u8]) -> [u8; 32] {
    let mut hasher = Hasher::new();
    hasher.update(content);
    hasher.finalize().into()
}

/// Encrypt content using XChaCha20-Poly1305
pub fn encrypt_content(
    content: &[u8],
    key: &[u8; 32],
) -> Result<EncryptionResult, EncryptionError> {
    // Create cipher instance
    let cipher = XChaCha20Poly1305::new_from_slice(key)
        .map_err(|e| EncryptionError::EncryptionFailed(e.to_string()))?;

    // Generate nonce
    let nonce_bytes = generate_nonce()?;
    let nonce = XNonce::from_slice(&nonce_bytes);

    // Encrypt content
    let ciphertext = cipher
        .encrypt(nonce, content)
        .map_err(|e| EncryptionError::EncryptionFailed(e.to_string()))?;

    // Compute content hash
    let content_hash = hash_content(content);

    Ok(EncryptionResult {
        ciphertext,
        nonce: nonce_bytes,
        content_hash,
    })
}

/// Decrypt content using XChaCha20-Poly1305
pub fn decrypt_content(
    ciphertext: &[u8],
    nonce: &[u8; 24],
    key: &[u8; 32],
) -> Result<DecryptionResult, EncryptionError> {
    // Create cipher instance
    let cipher = XChaCha20Poly1305::new_from_slice(key)
        .map_err(|e| EncryptionError::DecryptionFailed(e.to_string()))?;

    // Create nonce
    let nonce = XNonce::from_slice(nonce);

    // Decrypt content
    let content = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| EncryptionError::DecryptionFailed(e.to_string()))?;

    Ok(DecryptionResult { content })
}

/// Verify content hash matches the original
pub fn verify_content_hash(content: &[u8], expected_hash: &[u8; 32]) -> bool {
    let computed_hash = hash_content(content);
    computed_hash == *expected_hash
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_key_generation() {
        let key1 = generate_key().unwrap();
        let key2 = generate_key().unwrap();

        assert_eq!(key1.len(), 32);
        assert_eq!(key2.len(), 32);
        assert_ne!(key1, key2); // Keys should be different
    }

    #[test]
    fn test_nonce_generation() {
        let nonce1 = generate_nonce().unwrap();
        let nonce2 = generate_nonce().unwrap();

        assert_eq!(nonce1.len(), 24);
        assert_eq!(nonce2.len(), 24);
        assert_ne!(nonce1, nonce2); // Nonces should be different
    }

    #[test]
    fn test_content_hashing() {
        let content = b"Hello, World!";
        let hash1 = hash_content(content);
        let hash2 = hash_content(content);

        assert_eq!(hash1, hash2); // Same content should produce same hash
        assert_eq!(hash1.len(), 32);
    }

    #[test]
    fn test_encryption_decryption() {
        let content = b"This is a secret message!";
        let key = generate_key().unwrap();

        // Encrypt
        let encrypted = encrypt_content(content, &key).unwrap();
        assert_ne!(encrypted.ciphertext, content.to_vec());
        assert_eq!(encrypted.nonce.len(), 24);
        assert_eq!(encrypted.content_hash.len(), 32);

        // Decrypt
        let decrypted = decrypt_content(&encrypted.ciphertext, &encrypted.nonce, &key).unwrap();

        assert_eq!(decrypted.content, content.to_vec());

        // Verify hash
        assert!(verify_content_hash(
            &decrypted.content,
            &encrypted.content_hash
        ));
    }

    #[test]
    fn test_hash_verification() {
        let content = b"Test content";
        let hash = hash_content(content);

        assert!(verify_content_hash(content, &hash));
        assert!(!verify_content_hash(b"Different content", &hash));
    }
}
