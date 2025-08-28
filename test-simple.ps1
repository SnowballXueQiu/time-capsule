# Simple Test Script

Write-Host "Starting quick tests..." -ForegroundColor Green

# Test 1: Dev server
Write-Host "`nTest 1: Dev Server" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Dev server is running" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Dev server not accessible" -ForegroundColor Red
    exit 1
}

# Test 2: WASM file
Write-Host "`nTest 2: WASM File Access" -ForegroundColor Yellow
try {
    $wasmResponse = Invoke-WebRequest -Uri "http://localhost:3000/encryptor_wasi_bg.wasm" -Method Head -TimeoutSec 10
    $contentType = $wasmResponse.Headers["Content-Type"]
    
    if ($wasmResponse.StatusCode -eq 200) {
        Write-Host "✅ WASM file accessible (Status: $($wasmResponse.StatusCode))" -ForegroundColor Green
        
        if ($contentType -eq "application/wasm") {
            Write-Host "✅ Correct MIME type: $contentType" -ForegroundColor Green
        } else {
            Write-Host "⚠️  MIME type: $contentType" -ForegroundColor Yellow
        }
        
        $fileSize = $wasmResponse.Headers["Content-Length"]
        Write-Host "📊 File size: $fileSize bytes" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ WASM file access failed" -ForegroundColor Red
}

# Test 3: Debug pages
Write-Host "`nTest 3: Debug Pages" -ForegroundColor Yellow
$debugPages = @("/debug", "/simple-wasm-test", "/test-full-flow")

foreach ($page in $debugPages) {
    try {
        $pageResponse = Invoke-WebRequest -Uri "http://localhost:3000$page" -UseBasicParsing -TimeoutSec 10
        if ($pageResponse.StatusCode -eq 200) {
            Write-Host "✅ $page - accessible" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ $page - failed" -ForegroundColor Red
    }
}

Write-Host "`nTests completed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Visit http://localhost:3000/debug" -ForegroundColor White
Write-Host "2. Run WASM tests" -ForegroundColor White
Write-Host "3. Test with wallet connection" -ForegroundColor White