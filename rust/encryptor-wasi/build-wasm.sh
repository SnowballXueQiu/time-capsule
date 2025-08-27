#!/bin/bash

# Build WASM module for web usage
echo "Building WASM module..."

# Install wasm-pack if not available
if ! command -v wasm-pack &> /dev/null; then
    echo "Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Build the WASM package
wasm-pack build --target web --out-dir ../../packages/sdk/src/wasm --scope time-capsule

echo "WASM build complete!"
echo "Generated files in packages/sdk/src/wasm/"