# Web3 Crypto Streaming Service Development Setup

This document provides instructions for setting up the development environment for the Web3 Crypto Streaming Service project, with a focus on the HTML live reload functionality.

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server with live reload:
   ```bash
   npm run dev:live
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

The page should load and will automatically refresh whenever you make changes to HTML, CSS, or JavaScript files in the `src` directory.

## Development Server Features

### Live Reload

The development server includes a WebSocket-based live reload system that monitors file changes and automatically refreshes the browser. This improves development speed by eliminating the need to manually refresh the browser after making changes.

Key features:
- Monitors HTML, CSS, JavaScript, TypeScript, and Vue files
- Debounces reload events to avoid multiple rapid reloads
- Automatically reconnects if the server restarts

### File Watching Configuration

By default, the live reload system watches the following directories:
- `src/views` - HTML files
- `src/components` - UI components
- `src/public` - Static assets

You can modify the watched paths in `src/dev/server.js`.

### Available npm Scripts

- `npm run dev:serve` - Start the development server with live reload
- `npm run dev:live` - Alias for dev:serve
- `npm run dev:html` - Alias for dev:live
- `npm run start:dev` - Alias for dev:live

## HTML Development Workflow

1. Start the development server with `npm run dev:live`
2. Edit files in the `src/views` directory
3. Save your changes, and the browser will automatically refresh
4. View the updated content in your browser

## Testing Components

The development server provides a component showcase page at:
```
http://localhost:3000/components.html
```

This page demonstrates various UI components used in the application and is also connected to the live reload system.

## Troubleshooting

### Live Reload Not Working

If the live reload system is not working:

1. Check the browser console for any WebSocket connection errors
2. Ensure the WebSocket port (default: 35729) is not blocked by a firewall
3. Verify that the file you're editing is in a watched directory
4. Check that the file has one of the monitored extensions (`.html`, `.css`, `.js`, `.vue`, `.ts`)

### Server Won't Start

If the development server won't start:

1. Ensure port 3000 is not already in use by another application
2. Check that all dependencies are correctly installed with `npm install`
3. Verify that Node.js is properly installed and in your PATH

## Advanced Configuration

### Customizing Live Reload

The live reload service can be customized by modifying `src/dev/live-reload.js`. Available options include:

- `port` - WebSocket port (default: 35729)
- `watchPaths` - Array of paths to watch for changes
- `watchExtensions` - File extensions to monitor
- `excludePaths` - Paths to exclude from watching
- `quiet` - Suppress console output

### Integration with Other Development Tools

The live reload system is designed to work alongside other development tools. It can be integrated with:

- Vue.js development server
- TypeScript compilation
- CSS preprocessing
- API mock servers

See the main documentation for more information on integrating with these tools.
