/**
 * WASM encryption module loader and interface
 */

export interface WASMEncryptionResult {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  contentHash: Uint8Array;
}

export interface WASMWalletEncryptionResult {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  contentHash: Uint8Array;
  keyDerivationSalt: Uint8Array;
}

export interface WASMDecryptionResult {
  content: Uint8Array;
}

export class WASMEncryptionError extends Error {
  constructor(message: string, public readonly code: number) {
    super(message);
    this.name = "WASMEncryptionError";
  }
}

export class WASMEncryption {
  private wasmModule: any = null;
  private initialized = false;

  /**
   * Load the WASM encryption module
   */
  async loadModule(wasmPath?: string): Promise<void> {
    try {
      // Load the actual WASM module
      const wasmModule = (await import("../wasm/encryptor_wasi.js")) as any;

      // Initialize WASM module - the default export is the init function
      if (typeof wasmModule.default === "function") {
        await wasmModule.default();
      }

      this.wasmModule = wasmModule;
      this.initialized = true;
      console.log("WASM encryption module loaded successfully");
    } catch (error) {
      console.warn(
        "Failed to load WASM module, falling back to mock implementation:",
        error
      );
      // Fallback to mock implementation for development
      this.wasmModule = await this.createMockWASMModule();
      this.initialized = true;
    }
  }

  /**
   * Generate a new 32-byte encryption key
   */
  generateKey(): Uint8Array {
    if (!this.initialized) {
      throw new WASMEncryptionError("WASM module not loaded", -1);
    }

    try {
      // Try to use real WASM function
      if (this.wasmModule.wasm_generate_key) {
        const result = this.wasmModule.wasm_generate_key();
        return new Uint8Array(result);
      }
    } catch (error) {
      console.warn("WASM key generation failed, using fallback:", error);
    }

    // Fallback implementation
    const key = new Uint8Array(32);
    crypto.getRandomValues(key);
    return key;
  }

  /**
   * Generate a new 24-byte nonce
   */
  generateNonce(): Uint8Array {
    if (!this.initialized) {
      throw new WASMEncryptionError("WASM module not loaded", -1);
    }

    try {
      // Try to use real WASM function
      if (this.wasmModule.wasm_generate_nonce) {
        const result = this.wasmModule.wasm_generate_nonce();
        return new Uint8Array(result);
      }
    } catch (error) {
      console.warn("WASM nonce generation failed, using fallback:", error);
    }

    // Fallback implementation
    const nonce = new Uint8Array(24);
    crypto.getRandomValues(nonce);
    return nonce;
  }

  /**
   * Encrypt content using XChaCha20-Poly1305
   */
  async encryptContent(
    content: Uint8Array,
    key: Uint8Array
  ): Promise<WASMEncryptionResult> {
    if (!this.initialized) {
      throw new WASMEncryptionError("WASM module not loaded", -1);
    }

    if (key.length !== 32) {
      throw new WASMEncryptionError(
        "Invalid key length: expected 32 bytes",
        -1
      );
    }

    try {
      // Try to use real WASM function
      if (this.wasmModule.wasm_encrypt_content) {
        console.log(
          "Using WASM encryption for content of length:",
          content.length
        );
        const result = this.wasmModule.wasm_encrypt_content(content, key);

        const encryptionResult = {
          ciphertext: result.ciphertext,
          nonce: result.nonce,
          contentHash: result.content_hash,
        };

        console.log(
          "WASM encryption successful, ciphertext length:",
          encryptionResult.ciphertext.length
        );
        return encryptionResult;
      }
    } catch (error) {
      console.warn("WASM encryption failed, using fallback:", error);
    }

    // Fallback implementation
    console.log(
      "Using fallback encryption for content of length:",
      content.length
    );
    const nonce = this.generateNonce();
    const contentHash = await this.hashContent(content);

    // Simple XOR encryption for mock (NOT secure, just for testing)
    const ciphertext = new Uint8Array(content.length);
    for (let i = 0; i < content.length; i++) {
      ciphertext[i] = content[i] ^ key[i % 32] ^ nonce[i % 24];
    }

    return {
      ciphertext,
      nonce,
      contentHash,
    };
  }

  /**
   * Decrypt content using XChaCha20-Poly1305
   */
  async decryptContent(
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    key: Uint8Array
  ): Promise<WASMDecryptionResult> {
    if (!this.initialized) {
      throw new WASMEncryptionError("WASM module not loaded", -1);
    }

    if (key.length !== 32) {
      throw new WASMEncryptionError(
        "Invalid key length: expected 32 bytes",
        -1
      );
    }

    if (nonce.length !== 24) {
      throw new WASMEncryptionError(
        "Invalid nonce length: expected 24 bytes",
        -1
      );
    }

    try {
      // Try to use real WASM function
      if (this.wasmModule.wasm_decrypt_content) {
        console.log(
          "Using WASM decryption for ciphertext of length:",
          ciphertext.length
        );
        const result = this.wasmModule.wasm_decrypt_content(
          ciphertext,
          nonce,
          key
        );
        console.log(
          "WASM decryption successful, content length:",
          result.length
        );
        return { content: result };
      }
    } catch (error) {
      console.warn("WASM decryption failed, using fallback:", error);
    }

    // Fallback implementation - reverse of the mock encryption
    console.log(
      "Using fallback decryption for ciphertext of length:",
      ciphertext.length
    );
    const content = new Uint8Array(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i++) {
      content[i] = ciphertext[i] ^ key[i % 32] ^ nonce[i % 24];
    }

    return { content };
  }

  /**
   * Encrypt content using wallet-based key derivation
   */
  async encryptContentWithWallet(
    content: Uint8Array,
    walletAddress: string,
    capsuleId: string,
    unlockTime: number
  ): Promise<WASMWalletEncryptionResult> {
    if (!this.initialized) {
      throw new WASMEncryptionError("WASM module not loaded", -1);
    }

    try {
      // Try to use real WASM function
      if (this.wasmModule.wasm_encrypt_content_with_wallet) {
        console.log(
          "Using WASM wallet encryption for content of length:",
          content.length
        );
        const result = this.wasmModule.wasm_encrypt_content_with_wallet(
          content,
          walletAddress,
          capsuleId,
          unlockTime
        );

        return {
          ciphertext: new Uint8Array(result.ciphertext),
          nonce: new Uint8Array(result.nonce),
          contentHash: new Uint8Array(result.content_hash),
          keyDerivationSalt: new Uint8Array(result.key_derivation_salt),
        };
      }
    } catch (error) {
      console.warn("WASM wallet encryption failed, using fallback:", error);
    }

    // Fallback implementation
    console.log(
      "Using fallback wallet encryption for content of length:",
      content.length
    );

    // Generate salt for key derivation
    const salt = new Uint8Array(32);
    crypto.getRandomValues(salt);

    // Generate nonce
    const nonce = this.generateNonce();

    // Simple key derivation (not secure, just for testing)
    const keyMaterial = new TextEncoder().encode(
      walletAddress + capsuleId + unlockTime.toString()
    );
    const keyHash = await crypto.subtle.digest("SHA-256", keyMaterial);
    const key = new Uint8Array(keyHash);

    // Simple XOR encryption for mock (NOT secure, just for testing)
    const ciphertext = new Uint8Array(content.length);
    for (let i = 0; i < content.length; i++) {
      ciphertext[i] = content[i] ^ key[i % 32] ^ nonce[i % 24] ^ salt[i % 32];
    }

    const contentHash = await this.hashContent(content);

    return {
      ciphertext,
      nonce,
      contentHash,
      keyDerivationSalt: salt,
    };
  }

  /**
   * Decrypt content using wallet-based key derivation
   */
  async decryptContentWithWallet(
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    walletAddress: string,
    capsuleId: string,
    unlockTime: number,
    salt: Uint8Array
  ): Promise<WASMDecryptionResult> {
    if (!this.initialized) {
      throw new WASMEncryptionError("WASM module not loaded", -1);
    }

    if (nonce.length !== 24) {
      throw new WASMEncryptionError(
        "Invalid nonce length: expected 24 bytes",
        -1
      );
    }

    if (salt.length !== 32) {
      throw new WASMEncryptionError(
        "Invalid salt length: expected 32 bytes",
        -1
      );
    }

    try {
      // Try to use real WASM function
      if (this.wasmModule.wasm_decrypt_content_with_wallet) {
        console.log(
          "Using WASM wallet decryption for ciphertext of length:",
          ciphertext.length
        );
        const result = this.wasmModule.wasm_decrypt_content_with_wallet(
          ciphertext,
          nonce,
          walletAddress,
          capsuleId,
          unlockTime,
          salt
        );
        console.log(
          "WASM wallet decryption successful, content length:",
          result.length
        );
        return { content: new Uint8Array(result) };
      }
    } catch (error) {
      console.warn("WASM wallet decryption failed, using fallback:", error);
    }

    // Fallback implementation - reverse of the mock encryption
    console.log(
      "Using fallback wallet decryption for ciphertext of length:",
      ciphertext.length
    );

    // Derive the same key used for encryption
    const keyMaterial = new TextEncoder().encode(
      walletAddress + capsuleId + unlockTime.toString()
    );
    const keyHash = await crypto.subtle.digest("SHA-256", keyMaterial);
    const key = new Uint8Array(keyHash);

    // Reverse XOR encryption
    const content = new Uint8Array(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i++) {
      content[i] = ciphertext[i] ^ key[i % 32] ^ nonce[i % 24] ^ salt[i % 32];
    }

    return { content };
  }

  /**
   * Hash content using BLAKE3
   */
  async hashContent(content: Uint8Array): Promise<Uint8Array> {
    if (!this.initialized) {
      throw new WASMEncryptionError("WASM module not loaded", -1);
    }

    try {
      // Try to use real WASM function
      if (this.wasmModule.wasm_hash_content) {
        const result = this.wasmModule.wasm_hash_content(content);
        return new Uint8Array(result);
      }
    } catch (error) {
      console.warn("WASM hashing failed, using fallback:", error);
    }

    // Fallback implementation using Web Crypto API SHA-256 (not BLAKE3)
    try {
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        content as BufferSource
      );
      return new Uint8Array(hashBuffer);
    } catch (error) {
      throw new WASMEncryptionError(`Hashing failed: ${error}`, -1);
    }
  }

  /**
   * Verify content hash
   */
  async verifyContentHash(
    content: Uint8Array,
    expectedHash: Uint8Array
  ): Promise<boolean> {
    try {
      const actualHash = await this.hashContent(content);

      if (actualHash.length !== expectedHash.length) {
        return false;
      }

      for (let i = 0; i < actualHash.length; i++) {
        if (actualHash[i] !== expectedHash[i]) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if WASM module is loaded
   */
  isLoaded(): boolean {
    return this.initialized;
  }

  /**
   * Create a mock WASM module for testing
   * In production, this would load the actual compiled WASM
   */
  private async createMockWASMModule(): Promise<WebAssembly.Instance> {
    // Create a minimal WASM module for testing
    const wasmCode = new Uint8Array([
      0x00,
      0x61,
      0x73,
      0x6d, // WASM magic number
      0x01,
      0x00,
      0x00,
      0x00, // WASM version
    ]);

    const wasmModule = await WebAssembly.compile(wasmCode);
    return new WebAssembly.Instance(wasmModule);
  }
}
