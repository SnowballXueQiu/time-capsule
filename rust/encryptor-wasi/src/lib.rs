use chacha20poly1305::{
    aead::{rand_core::RngCore, Aead, KeyInit, OsRng},
    XChaCha20Poly1305, XNonce,
};
use hkdf::Hkdf;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
// SHA3 imports removed as they're not currently used
use thiserror::Error;

pub mod hash;
pub mod wasm_bindings;

// Re-export hash functionality
pub use hash::{
    hash_content_bytes, hash_from_hex, hash_multiple_contents, hash_to_hex,
    verify_content_hash_result, HashError, HashResult,
};

/// Encryption result containing ciphertext, nonce, and content hash
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptionResult {
    pub ciphertext: Vec<u8>,
    pub nonce: [u8; 24],
    pub content_hash: [u8; 32],
}

/// Wallet-based encryption result with key derivation salt
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletEncryptionResult {
    pub ciphertext: Vec<u8>,
    pub nonce: [u8; 24],
    pub content_hash: [u8; 32],
    pub key_derivation_salt: [u8; 32],
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
    #[error("Key derivation failed: {0}")]
    KeyDerivationFailed(String),
    #[error("Invalid address format")]
    InvalidAddress,
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

/// Generate a salt for key derivation
pub fn generate_salt() -> Result<[u8; 32], EncryptionError> {
    let mut salt = [0u8; 32];
    OsRng
        .try_fill_bytes(&mut salt)
        .map_err(|_| EncryptionError::RandomGenerationFailed)?;
    Ok(salt)
}

/// Derive encryption key from wallet address and capsule metadata
pub fn derive_key_from_wallet(
    wallet_address: &str,
    capsule_id: &str,
    unlock_time: u64,
    salt: &[u8; 32],
) -> Result<[u8; 32], EncryptionError> {
    // Create key material by combining all inputs
    let mut key_material = Vec::new();

    // Add wallet address (remove 0x prefix if present)
    let addr = if wallet_address.starts_with("0x") {
        &wallet_address[2..]
    } else {
        wallet_address
    };

    // Convert hex address to bytes
    let addr_bytes = hex::decode(addr).map_err(|_| EncryptionError::InvalidAddress)?;
    key_material.extend_from_slice(&addr_bytes);

    // Add capsule ID
    key_material.extend_from_slice(capsule_id.as_bytes());

    // Add unlock time as bytes
    key_material.extend_from_slice(&unlock_time.to_le_bytes());

    // Add salt
    key_material.extend_from_slice(salt);

    // Use HKDF to derive a proper encryption key
    let hk = Hkdf::<Sha256>::new(Some(salt), &key_material);
    let mut key = [0u8; 32];
    hk.expand(b"time-capsule-encryption-key", &mut key)
        .map_err(|e| EncryptionError::KeyDerivationFailed(e.to_string()))?;

    Ok(key)
}

/// Encrypt content using wallet-based key derivation
pub fn encrypt_content_with_wallet(
    content: &[u8],
    wallet_address: &str,
    capsule_id: &str,
    unlock_time: u64,
) -> Result<WalletEncryptionResult, EncryptionError> {
    // Generate salt for key derivation
    let salt = generate_salt()?;

    // Derive key from wallet and capsule metadata
    let key = derive_key_from_wallet(wallet_address, capsule_id, unlock_time, &salt)?;

    // Generate nonce
    let nonce_bytes = generate_nonce()?;
    let nonce = XNonce::from_slice(&nonce_bytes);

    // Create cipher instance
    let cipher = XChaCha20Poly1305::new_from_slice(&key)
        .map_err(|e| EncryptionError::EncryptionFailed(e.to_string()))?;

    // Encrypt content
    let ciphertext = cipher
        .encrypt(nonce, content)
        .map_err(|e| EncryptionError::EncryptionFailed(e.to_string()))?;

    // Compute content hash
    let content_hash = hash_content(content);

    Ok(WalletEncryptionResult {
        ciphertext,
        nonce: nonce_bytes,
        content_hash,
        key_derivation_salt: salt,
    })
}

/// Decrypt content using wallet-based key derivation
pub fn decrypt_content_with_wallet(
    ciphertext: &[u8],
    nonce: &[u8; 24],
    wallet_address: &str,
    capsule_id: &str,
    unlock_time: u64,
    salt: &[u8; 32],
) -> Result<DecryptionResult, EncryptionError> {
    // Derive the same key used for encryption
    let key = derive_key_from_wallet(wallet_address, capsule_id, unlock_time, salt)?;

    // Create cipher instance
    let cipher = XChaCha20Poly1305::new_from_slice(&key)
        .map_err(|e| EncryptionError::DecryptionFailed(e.to_string()))?;

    // Create nonce
    let nonce = XNonce::from_slice(nonce);

    // Decrypt content
    let content = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| EncryptionError::DecryptionFailed(e.to_string()))?;

    Ok(DecryptionResult { content })
}

/// Compute BLAKE3 hash of content (legacy function, use hash::hash_content_bytes instead)
pub fn hash_content(content: &[u8]) -> [u8; 32] {
    hash::hash_content_bytes(content)
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

/// Verify content hash matches the original (legacy function, use hash::verify_content_hash instead)
pub fn verify_content_hash(content: &[u8], expected_hash: &[u8; 32]) -> bool {
    hash::verify_content_hash(content, expected_hash)
}

// WASI Interface Functions
// These functions provide a C-compatible interface for WASM/WASI usage

use std::ptr;

/// WASI-compatible encryption function
/// Returns 0 on success, non-zero on error
#[no_mangle]
pub extern "C" fn wasi_encrypt(
    content_ptr: *const u8,
    content_len: usize,
    key_ptr: *const u8,
    result_ptr: *mut u8,
    result_len_ptr: *mut usize,
) -> i32 {
    if content_ptr.is_null()
        || key_ptr.is_null()
        || result_ptr.is_null()
        || result_len_ptr.is_null()
    {
        return -1; // Invalid parameters
    }

    unsafe {
        let content = std::slice::from_raw_parts(content_ptr, content_len);
        let key_slice = std::slice::from_raw_parts(key_ptr, 32);

        let mut key = [0u8; 32];
        key.copy_from_slice(key_slice);

        match encrypt_content(content, &key) {
            Ok(encrypted) => {
                let serialized = match serde_json::to_vec(&encrypted) {
                    Ok(data) => data,
                    Err(_) => return -2, // Serialization error
                };

                if serialized.len() > *result_len_ptr {
                    *result_len_ptr = serialized.len();
                    return -3; // Buffer too small
                }

                ptr::copy_nonoverlapping(serialized.as_ptr(), result_ptr, serialized.len());
                *result_len_ptr = serialized.len();
                0 // Success
            }
            Err(_) => -4, // Encryption error
        }
    }
}

/// WASI-compatible decryption function
/// Returns 0 on success, non-zero on error
#[no_mangle]
pub extern "C" fn wasi_decrypt(
    ciphertext_ptr: *const u8,
    ciphertext_len: usize,
    nonce_ptr: *const u8,
    key_ptr: *const u8,
    result_ptr: *mut u8,
    result_len_ptr: *mut usize,
) -> i32 {
    if ciphertext_ptr.is_null()
        || nonce_ptr.is_null()
        || key_ptr.is_null()
        || result_ptr.is_null()
        || result_len_ptr.is_null()
    {
        return -1; // Invalid parameters
    }

    unsafe {
        let ciphertext = std::slice::from_raw_parts(ciphertext_ptr, ciphertext_len);
        let nonce_slice = std::slice::from_raw_parts(nonce_ptr, 24);
        let key_slice = std::slice::from_raw_parts(key_ptr, 32);

        let mut nonce = [0u8; 24];
        let mut key = [0u8; 32];
        nonce.copy_from_slice(nonce_slice);
        key.copy_from_slice(key_slice);

        match decrypt_content(ciphertext, &nonce, &key) {
            Ok(decrypted) => {
                if decrypted.content.len() > *result_len_ptr {
                    *result_len_ptr = decrypted.content.len();
                    return -3; // Buffer too small
                }

                ptr::copy_nonoverlapping(
                    decrypted.content.as_ptr(),
                    result_ptr,
                    decrypted.content.len(),
                );
                *result_len_ptr = decrypted.content.len();
                0 // Success
            }
            Err(_) => -4, // Decryption error
        }
    }
}

/// WASI-compatible hash function
/// Returns 0 on success, non-zero on error
#[no_mangle]
pub extern "C" fn wasi_hash(content_ptr: *const u8, content_len: usize, hash_ptr: *mut u8) -> i32 {
    if content_ptr.is_null() || hash_ptr.is_null() {
        return -1; // Invalid parameters
    }

    unsafe {
        let content = std::slice::from_raw_parts(content_ptr, content_len);
        let hash = hash_content(content);
        ptr::copy_nonoverlapping(hash.as_ptr(), hash_ptr, 32);
        0 // Success
    }
}

/// WASI-compatible key generation function
/// Returns 0 on success, non-zero on error
#[no_mangle]
pub extern "C" fn wasi_generate_key(key_ptr: *mut u8) -> i32 {
    if key_ptr.is_null() {
        return -1; // Invalid parameters
    }

    match generate_key() {
        Ok(key) => {
            unsafe {
                ptr::copy_nonoverlapping(key.as_ptr(), key_ptr, 32);
            }
            0 // Success
        }
        Err(_) => -2, // Key generation error
    }
}

/// WASI-compatible nonce generation function
/// Returns 0 on success, non-zero on error
#[no_mangle]
pub extern "C" fn wasi_generate_nonce(nonce_ptr: *mut u8) -> i32 {
    if nonce_ptr.is_null() {
        return -1; // Invalid parameters
    }

    match generate_nonce() {
        Ok(nonce) => {
            unsafe {
                ptr::copy_nonoverlapping(nonce.as_ptr(), nonce_ptr, 24);
            }
            0 // Success
        }
        Err(_) => -2, // Nonce generation error
    }
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
