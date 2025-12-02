# BirchVault Desktop Changelog

> **Private**: This file is for internal development tracking only.

---

## [0.2.0] - 2024-12-01

### Added
- Auto-updater functionality - app checks for updates on launch and every 30 minutes while running
- Update dialog UI with download progress indicator
- GitHub Actions workflow for automated releases

### Fixed
- **Critical**: Added sync after login - vault items, folders, and subscription now load correctly on fresh installs
- Missing `@tauri-apps/plugin-updater` npm package dependency

### Changed
- Updated CSP to allow connections to GitHub for update downloads
- Added updater permissions to capabilities

---

## [0.1.0] - Initial Release

### Added
- Core vault functionality (create, edit, delete items)
- Login and unlock pages with master password authentication
- Offline-first architecture with local SQLite database
- Sync with Supabase backend
- Theme system (Birch, Forest, Ocean, Midnight) with light/dark modes
- Folder organisation for vault items
- Trash functionality with 30-day auto-delete
- Auto-lock on idle and system sleep
- Clipboard management with auto-clear
- Subscription/plan display with override support

### Item Types Supported
- Logins (username/password)
- Credit Cards
- Secure Notes
- Identities
- API Keys
- WiFi Networks
- Documents

---

## Changelog Format

When editing desktop code, update this changelog with:

```markdown
## [VERSION] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing features

### Fixed
- Bug fixes

### Removed
- Removed features

### Security
- Security-related changes
```

