# BirchVault

A secure, open-source password manager with end-to-end encryption. Available on web, desktop, mobile, and browser extensions.

## Features

- **Zero-Knowledge Encryption**: Your data is encrypted on your device before it leaves. We never see your passwords.
- **Cross-Platform**: Access your vault from any device with native apps
- **Self-Hosting**: Run your own instance for complete control
- **Open Source**: Fully auditable code

## Tech Stack

| Component | Technology |
|-----------|------------|
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + custom master password |
| Web App | Next.js 14 |
| Desktop | Tauri 2.0 |
| Mobile | React Native + Expo |
| Extension | Plasmo |
| Encryption | Web Crypto API (AES-256-GCM, PBKDF2) |
| Monorepo | pnpm workspaces + Turborepo |

## Project Structure

```
birchvault/
├── apps/
│   ├── web/              # Next.js web application
│   ├── desktop/          # Tauri desktop app
│   ├── mobile/           # Expo React Native app
│   └── extension/        # Plasmo browser extension
├── packages/
│   ├── core/             # Encryption, vault logic, types
│   ├── ui/               # Shared React components
│   ├── supabase-client/  # Supabase client wrapper
│   └── config/           # Shared ESLint, TypeScript configs
├── supabase/
│   ├── migrations/       # Database schema
│   └── functions/        # Edge functions
└── docker/               # Self-hosting setup
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- A Supabase project (or Docker for self-hosting)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/birchvault.git
cd birchvault
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp apps/web/.env.example apps/web/.env.local
```

4. Configure your Supabase credentials in `.env.local`

5. Run the development server:
```bash
pnpm dev
```

### Running Specific Apps

```bash
# Web app
pnpm dev --filter=@birchvault/web

# Mobile app
pnpm dev --filter=@birchvault/mobile

# Desktop app
pnpm dev --filter=@birchvault/desktop

# Browser extension
pnpm dev --filter=@birchvault/extension
```

## Self-Hosting

BirchVault can be self-hosted using Docker:

```bash
cd docker
cp env.example .env
# Edit .env with your configuration
docker-compose up -d
```

See [docker/README.md](docker/README.md) for detailed self-hosting instructions.

## Security

### Encryption Flow

1. Your master password + email are used to derive keys via PBKDF2 (100,000 iterations)
2. A symmetric key is generated for vault encryption
3. Vault items are encrypted with AES-256-GCM before being sent to the server
4. The server only stores encrypted blobs - it cannot decrypt your data

### What we store

- Encrypted vault data
- Email (for login)
- Auth hash (derived from master password, not the password itself)

### What we never see

- Your master password
- Your decrypted vault data

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see [LICENSE](LICENSE) for details







