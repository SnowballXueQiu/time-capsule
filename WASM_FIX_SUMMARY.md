# WASM 加载和解密问题修复总结

## 问题描述

1. **WASM 加载失败** - 服务器没有正确设置`application/wasm` MIME 类型
2. **解密参数获取失败** - 从区块链获取 nonce 和 salt 失败
3. **上传到 IPFS 的内容变成乱码** - 加密后的二进制数据没有正确处理

## 修复内容

### 1. WASM MIME 类型配置

- ✅ 在 `apps/web/next.config.js` 中添加了正确的 WASM MIME 类型头部配置
- ✅ 复制 WASM 文件到 `apps/web/public/` 目录以便直接访问
- ✅ 修改 WASM 加载器支持从 public 目录加载

### 2. WASM 加载器改进

- ✅ 修改 `packages/sdk/src/encryption/wasm-loader.ts`
- ✅ 添加了从 public 目录加载 WASM 的逻辑
- ✅ 改进了错误处理和日志记录
- ✅ 移除了不安全的 fallback 模式

### 3. 解密参数获取修复

- ✅ 修改 `apps/web/src/components/UnlockModal.tsx`
- ✅ 添加了详细的调试信息
- ✅ 改进了从区块链获取加密参数的逻辑
- ✅ 验证智能合约字段名匹配（`nonce` 和 `key_derivation_salt`）

### 4. SDK 解析逻辑验证

- ✅ 确认 `packages/sdk/src/index.ts` 中的 `parseCapsuleObject` 方法正确
- ✅ 字段名与智能合约匹配：`fields.nonce` 和 `fields.key_derivation_salt`

### 5. 智能合约调用验证

- ✅ 确认 `apps/web/src/components/CreateTimeCapsule.tsx` 正确传递加密参数
- ✅ 参数顺序与智能合约 `create_time_capsule` 函数匹配

## 新增调试工具

### 1. 简单 WASM 测试 (`/simple-wasm-test`)

- 测试 WASM 模块的基本加载
- 验证加密/解密功能
- 提供详细的错误信息

### 2. 完整流程测试 (`/test-full-flow`)

- 端到端测试加密/解密流程
- 测试 IPFS 上传/下载
- 验证数据完整性

### 3. 加密调试工具 (`/debug-encryption`)

- 测试不同参数组合
- 验证错误参数处理
- 性能测试

### 4. 区块链数据调试 (`/debug-blockchain`)

- 检查原始区块链数据
- 验证 SDK 解析逻辑
- 列出用户胶囊

### 5. 调试工具集合 (`/debug`)

- 统一的调试入口
- 问题排查指南
- 快速访问所有测试工具

## 使用方法

1. **启动开发服务器**：

   ```bash
   pnpm dev
   ```

2. **访问调试页面**：

   - 主调试页面：http://localhost:3000/debug
   - 简单 WASM 测试：http://localhost:3000/simple-wasm-test
   - 完整流程测试：http://localhost:3000/test-full-flow

3. **测试步骤**：
   1. 首先运行简单 WASM 测试确保 WASM 加载正常
   2. 连接钱包后运行完整流程测试
   3. 创建测试胶囊并验证加密参数存储
   4. 使用区块链调试工具检查数据

## 预期结果

修复后应该能够：

- ✅ 正常加载 WASM 模块（无 MIME 类型错误）
- ✅ 成功加密和解密内容
- ✅ 正确存储和获取加密参数
- ✅ 正常上传和下载 IPFS 内容
- ✅ 完整的胶囊创建和解锁流程

## 故障排除

如果仍然遇到问题：

1. **WASM 加载失败**：

   - 检查浏览器控制台错误
   - 确认 WASM 文件存在于 `apps/web/public/encryptor_wasi_bg.wasm`
   - 重启开发服务器

2. **加密参数缺失**：

   - 使用区块链调试工具检查原始数据
   - 确认智能合约正确部署
   - 验证胶囊创建交易成功

3. **解密失败**：
   - 确保使用相同的钱包地址
   - 验证胶囊 ID 和解锁时间参数
   - 检查加密参数完整性
