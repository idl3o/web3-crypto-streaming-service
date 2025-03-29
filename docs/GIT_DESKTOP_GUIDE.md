# Git Desktop Guide for Web3 Crypto Streaming Service

## 1. Initial Setup
1. Open GitHub Desktop
2. Click `File -> Clone Repository`
3. Enter URL: `https://github.com/username/web3-crypto-streaming-service.git`
4. Choose local path: `c:\Users\Sam\gh\web3-crypto-streaming-service`

## 2. Daily Development Flow

### Starting Work
1. Open GitHub Desktop
2. Click `Fetch origin` to get latest changes
3. Click `Current Branch` to see your branches
4. Create new branch for features: `Create New Branch`

### Making Changes
1. Make your code changes in VS Code
2. In GitHub Desktop, you'll see changed files in left panel
3. Review changes in the main panel
4. Add commit message in bottom left
5. Click `Commit to [branch-name]`

### Quick Actions (Top Menu)
- ⚡ `Pull`: Get latest changes
- 🔄 `Push`: Send your changes
- 🌿 `Branch`: Switch branches
- 📊 `History`: View changes history

## 3. Common Tasks

### Running the Project
1. Right-click repository
2. Select `Open in Visual Studio Code`
3. In VS Code terminal:
```bash
npm run quick:start
```

### Viewing Changes
- Changed files show in left panel
- Green: Added lines
- Red: Removed lines
- Yellow: Modified lines

### Resolving Conflicts
1. Files with conflicts show ❗
2. Open in editor
3. Choose changes to keep
4. Commit resolved files

## 4. Keyboard Shortcuts
- `Ctrl + Shift + P`: Push changes
- `Ctrl + Shift + U`: Pull changes
- `Ctrl + 1`: Switch to Changes tab
- `Ctrl + 2`: Switch to History tab

## 5. Project-Specific Operations

### Testing Changes
1. Create new branch: `test/my-feature`
2. Make changes
3. Run tests: Select `Repository -> Open in Command Prompt` then:
```bash
npm test
```

### Deploying
1. Switch to `main` branch
2. Pull latest changes
3. Run: `npm run deploy`
