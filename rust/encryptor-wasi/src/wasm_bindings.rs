use crate::{
    decrypt_content, decrypt_content_with_wallet, encrypt_content, encrypt_content_with_wallet,
    generate_key, generate_nonce, generate_salt, hash_content,
};
use wasm_bindgen::prelude::*;

// JavaScript 接口
#[wasm_bindgen]
pub struct WasmEncryptionResult {
    ciphertext: Vec<u8>,
    nonce: Vec<u8>,
    content_hash: Vec<u8>,
}

#[wasm_bindgen]
impl WasmEncryptionResult {
    #[wasm_bindgen(getter)]
    pub fn ciphertext(&self) -> Vec<u8> {
        self.ciphertext.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn nonce(&self) -> Vec<u8> {
        self.nonce.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn content_hash(&self) -> Vec<u8> {
        self.content_hash.clone()
    }
}

#[wasm_bindgen]
pub struct WasmWalletEncryptionResult {
    ciphertext: Vec<u8>,
    nonce: Vec<u8>,
    content_hash: Vec<u8>,
    key_derivation_salt: Vec<u8>,
}

#[wasm_bindgen]
impl WasmWalletEncryptionResult {
    #[wasm_bindgen(getter)]
    pub fn ciphertext(&self) -> Vec<u8> {
        self.ciphertext.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn nonce(&self) -> Vec<u8> {
        self.nonce.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn content_hash(&self) -> Vec<u8> {
        self.content_hash.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn key_derivation_salt(&self) -> Vec<u8> {
        self.key_derivation_salt.clone()
    }
}

#[wasm_bindgen]
pub fn wasm_generate_key() -> Result<Vec<u8>, JsValue> {
    generate_key()
        .map(|key| key.to_vec())
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_generate_nonce() -> Result<Vec<u8>, JsValue> {
    generate_nonce()
        .map(|nonce| nonce.to_vec())
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_generate_salt() -> Result<Vec<u8>, JsValue> {
    generate_salt()
        .map(|salt| salt.to_vec())
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_encrypt_content(content: &[u8], key: &[u8]) -> Result<WasmEncryptionResult, JsValue> {
    if key.len() != 32 {
        return Err(JsValue::from_str("Key must be 32 bytes"));
    }

    let mut key_array = [0u8; 32];
    key_array.copy_from_slice(key);

    encrypt_content(content, &key_array)
        .map(|result| WasmEncryptionResult {
            ciphertext: result.ciphertext,
            nonce: result.nonce.to_vec(),
            content_hash: result.content_hash.to_vec(),
        })
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_decrypt_content(
    ciphertext: &[u8],
    nonce: &[u8],
    key: &[u8],
) -> Result<Vec<u8>, JsValue> {
    if key.len() != 32 {
        return Err(JsValue::from_str("Key must be 32 bytes"));
    }
    if nonce.len() != 24 {
        return Err(JsValue::from_str("Nonce must be 24 bytes"));
    }

    let mut key_array = [0u8; 32];
    let mut nonce_array = [0u8; 24];
    key_array.copy_from_slice(key);
    nonce_array.copy_from_slice(nonce);

    decrypt_content(ciphertext, &nonce_array, &key_array)
        .map(|result| result.content)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_encrypt_content_with_wallet(
    content: &[u8],
    wallet_address: &str,
    capsule_id: &str,
    unlock_time: f64,
) -> Result<WasmWalletEncryptionResult, JsValue> {
    let unlock_time_u64 = unlock_time as u64;

    encrypt_content_with_wallet(content, wallet_address, capsule_id, unlock_time_u64)
        .map(|result| WasmWalletEncryptionResult {
            ciphertext: result.ciphertext,
            nonce: result.nonce.to_vec(),
            content_hash: result.content_hash.to_vec(),
            key_derivation_salt: result.key_derivation_salt.to_vec(),
        })
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_decrypt_content_with_wallet(
    ciphertext: &[u8],
    nonce: &[u8],
    wallet_address: &str,
    capsule_id: &str,
    unlock_time: f64,
    salt: &[u8],
) -> Result<Vec<u8>, JsValue> {
    if nonce.len() != 24 {
        return Err(JsValue::from_str("Nonce must be 24 bytes"));
    }
    if salt.len() != 32 {
        return Err(JsValue::from_str("Salt must be 32 bytes"));
    }

    let mut nonce_array = [0u8; 24];
    let mut salt_array = [0u8; 32];
    nonce_array.copy_from_slice(nonce);
    salt_array.copy_from_slice(salt);

    let unlock_time_u64 = unlock_time as u64;

    decrypt_content_with_wallet(
        ciphertext,
        &nonce_array,
        wallet_address,
        capsule_id,
        unlock_time_u64,
        &salt_array,
    )
    .map(|result| result.content)
    .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_hash_content(content: &[u8]) -> Vec<u8> {
    hash_content(content).to_vec()
}

#[wasm_bindgen]
pub fn wasm_verify_content_hash(content: &[u8], expected_hash: &[u8]) -> bool {
    if expected_hash.len() != 32 {
        return false;
    }

    let mut hash_array = [0u8; 32];
    hash_array.copy_from_slice(expected_hash);

    crate::verify_content_hash(content, &hash_array)
}
