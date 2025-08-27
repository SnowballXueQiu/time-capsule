# Build WASM module for web usage
Write-Host "Building WASM module..."

# Check if wasm-pack is available
if (!(Get-Command wasm-pack -ErrorAction SilentlyContinue)) {
    Write-Host "Installing wasm-pack..."
    Invoke-WebRequest -Uri "https://github.com/rustwasm/wasm-pack/releases/download/v0.12.1/wasm-pack-v0.12.1-x86_64-pc-windows-msvc.tar.gz" -OutFile "wasm-pack.tar.gz"
    # For Windows, you might need to install manually or use cargo install wasm-pack
    cargo install wasm-pack
}

# Build the WASM package
wasm-pack build --target web --out-dir ../../packages/sdk/src/wasm --scope time-capsule

Write-Host "WASM build complete!"
Write-Host "Generated files in packages/sdk/src/wasm/"