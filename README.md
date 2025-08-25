# Decentralized Time Capsule

A decentralized time capsule system built on Sui blockchain that allows users to encrypt and store content with various unlock conditions.

## Features

- **Time-based Capsules**: Lock content until a specific date and time
- **Multisig Capsules**: Require multiple signatures to unlock content
- **Paid Capsules**: Unlock content by paying the specified amount
- **Strong Encryption**: Uses XChaCha20-Poly1305 for content encryption
- **Decentralized Storage**: Content stored on IPFS
- **Cross-platform**: Web app, CLI tool, and TypeScript SDK

## Project Structure

```
├── contracts/          # Sui Move smart contracts
│   └── time_capsule/   # Main capsule contract
├── rust/               # Rust workspace
│   ├── encryptor-wasi/ # WASM encryption module
│   └── cli-tool/       # CLI application
├── packages/           # TypeScript packages
│   ├── sdk/           # TypeScript SDK
│   └── types/         # Shared type definitions
└── apps/              # Applications
    └── web/           # Next.js web application
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+ (required - npm/yarn/bun not supported)
- Rust 1.70+ (for building Sui CLI)
- Git (for submodules)

### Installation

1. Clone the repository with submodules:

```bash
git clone --recursive <repository-url>
cd decentralized-time-capsule
```

2. Install dependencies (this will also build Sui CLI):

```bash
pnpm install
```

**Note**: This project requires pnpm. The installation will fail if you try to use npm, yarn, or bun.

3. Build Rust components:

```bash
cd rust
cargo build
```

4. Build TypeScript packages:

```bash
pnpm build
```

### Development

Start the development server:

```bash
pnpm dev
```

This will start the Next.js web application in development mode.

### Testing

Run tests across all packages:

```bash
pnpm test
```

## Usage

### CLI Tool

Create a time-based capsule:

```bash
cargo run --bin capsule create --file ./secret.txt --unlock-time 1735689600000
```

List your capsules:

```bash
cargo run --bin capsule list
```

Unlock a capsule:

```bash
cargo run --bin capsule unlock <capsule-id>
```

### Web Application

1. Connect your Sui wallet
2. Upload content and set unlock conditions
3. Pay transaction fees to create the capsule
4. Share the capsule ID with intended recipients
5. Unlock when conditions are met

### TypeScript SDK

```typescript
import { CapsuleSDK } from "@time-capsule/sdk";

const sdk = new CapsuleSDK({ network: "devnet" });

// Create a time capsule
const result = await sdk.createTimeCapsule(content, unlockTime, keypair);

// Unlock a capsule
const unlocked = await sdk.unlockCapsule(capsuleId, keypair);
```

## Architecture

The system consists of several layers:

1. **Smart Contracts**: Sui Move contracts manage capsule metadata and unlock conditions
2. **Encryption Layer**: Rust WASM modules handle content encryption/decryption
3. **Storage Layer**: IPFS stores encrypted content
4. **SDK Layer**: TypeScript SDK provides easy integration
5. **Application Layer**: Web app and CLI for user interaction

## Security

- Content is encrypted using XChaCha20-Poly1305 before storage
- Encryption keys are generated using cryptographically secure random number generators
- Content integrity is verified using BLAKE3 hashes
- Smart contracts enforce unlock conditions on-chain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
