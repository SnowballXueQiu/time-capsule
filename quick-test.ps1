# 快速功能测试脚本

Write-Host "🚀 开始快速功能测试..." -ForegroundColor Green

# 测试1: 检查开发服务器
Write-Host "`n📡 测试1: 开发服务器状态" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 开发服务器运行正常" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ 开发服务器无法访问: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 测试2: 检查WASM文件
Write-Host "`n🔧 测试2: WASM文件访问" -ForegroundColor Yellow
try {
    $wasmResponse = Invoke-WebRequest -Uri "http://localhost:3000/encryptor_wasi_bg.wasm" -Method Head -TimeoutSec 10
    $contentType = $wasmResponse.Headers["Content-Type"]
    
    if ($wasmResponse.StatusCode -eq 200) {
        Write-Host "✅ WASM文件可访问 (状态码: $($wasmResponse.StatusCode))" -ForegroundColor Green
        
        if ($contentType -eq "application/wasm") {
            Write-Host "✅ MIME类型正确: $contentType" -ForegroundColor Green
        } else {
            Write-Host "⚠️  MIME类型可能不正确: $contentType" -ForegroundColor Yellow
        }
        
        $fileSize = $wasmResponse.Headers["Content-Length"]
        Write-Host "📊 文件大小: $fileSize 字节" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ WASM文件访问失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试3: 检查调试页面
Write-Host "`n🐛 测试3: 调试页面" -ForegroundColor Yellow
$debugPages = @(
    "/debug",
    "/simple-wasm-test", 
    "/test-full-flow",
    "/debug-encryption",
    "/debug-blockchain"
)

foreach ($page in $debugPages) {
    try {
        $pageResponse = Invoke-WebRequest -Uri "http://localhost:3000$page" -UseBasicParsing -TimeoutSec 10
        if ($pageResponse.StatusCode -eq 200) {
            Write-Host "✅ $page - 可访问" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ $page - 访问失败" -ForegroundColor Red
    }
}

# 测试4: 检查关键文件
Write-Host "`n📁 测试4: 关键文件检查" -ForegroundColor Yellow

$keyFiles = @{
    "WASM-File" = "apps/web/public/encryptor_wasi_bg.wasm"
    "Next-Config" = "apps/web/next.config.js"
    "WASM-Loader" = "packages/sdk/src/encryption/wasm-loader.ts"
    "Unlock-Modal" = "apps/web/src/components/UnlockModal.tsx"
}

foreach ($file in $keyFiles.GetEnumerator()) {
    if (Test-Path $file.Value) {
        Write-Host "✅ $($file.Key): $($file.Value)" -ForegroundColor Green
    } else {
        Write-Host "❌ $($file.Key): $($file.Value) - 文件不存在" -ForegroundColor Red
    }
}

# 测试5: 检查环境变量
Write-Host "`n🔐 测试5: 环境变量检查" -ForegroundColor Yellow
$envFile = "apps/web/.env.local"
if (Test-Path $envFile) {
    Write-Host "✅ 环境变量文件存在: $envFile" -ForegroundColor Green
    
    $envContent = Get-Content $envFile
    $requiredVars = @("NEXT_PUBLIC_PINATA_JWT", "NEXT_PUBLIC_PACKAGE_ID")
    
    foreach ($var in $requiredVars) {
        if ($envContent -match "^$var=") {
            Write-Host "✅ $var - 已配置" -ForegroundColor Green
        } else {
            Write-Host "⚠️  $var - 未找到" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ 环境变量文件不存在: $envFile" -ForegroundColor Red
}

Write-Host "`n🎯 测试完成!" -ForegroundColor Green
Write-Host "📋 下一步操作:" -ForegroundColor Cyan
Write-Host "1. 访问 http://localhost:3000/debug 查看调试工具" -ForegroundColor White
Write-Host "2. 运行简单WASM测试验证基础功能" -ForegroundColor White
Write-Host "3. 连接钱包后测试完整流程" -ForegroundColor White