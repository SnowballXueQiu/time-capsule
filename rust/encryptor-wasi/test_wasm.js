// Simple test script to verify WASM module works in Node.js
const fs = require("fs");
const { WASI } = require("wasi");

async function testWasmModule() {
  try {
    // Read the WASM file
    const wasmPath = "../target/wasm32-wasip1/debug/encryptor_wasi.wasm";

    if (!fs.existsSync(wasmPath)) {
      console.log(
        "WASM file not found. Please build with: cargo build --target wasm32-wasip1"
      );
      return;
    }

    const wasmBuffer = fs.readFileSync(wasmPath);

    // Create WASI instance
    const wasi = new WASI({
      version: "preview1",
      args: process.argv,
      env: process.env,
    });

    // Compile and instantiate the WASM module
    const wasmModule = await WebAssembly.compile(wasmBuffer);
    const instance = await WebAssembly.instantiate(wasmModule, {
      wasi_snapshot_preview1: wasi.wasiImport,
    });

    // Initialize WASI (skip if no _start function)
    if (instance.exports._start) {
      wasi.start(instance);
    }

    console.log("✅ WASM module loaded successfully in Node.js!");
    console.log("Available exports:", Object.keys(instance.exports));

    // Test if our WASI functions are available
    const expectedFunctions = [
      "wasi_encrypt",
      "wasi_decrypt",
      "wasi_hash",
      "wasi_generate_key",
      "wasi_generate_nonce",
    ];

    const availableFunctions = expectedFunctions.filter(
      (fn) => typeof instance.exports[fn] === "function"
    );

    console.log("✅ Available WASI functions:", availableFunctions);

    if (availableFunctions.length === expectedFunctions.length) {
      console.log("✅ All expected WASI functions are available!");
    } else {
      console.log("⚠️  Some WASI functions are missing");
    }
  } catch (error) {
    console.error("❌ Error testing WASM module:", error.message);
  }
}

testWasmModule();
