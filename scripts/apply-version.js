/**
 * Script to apply version from package.json to all necessary files
 */
const fs = require('fs');
const path = require('path');

// Read package.json version
const packageJson = require('../package.json');
const { version } = packageJson;

console.log(`Applying version ${version} to project files...`);

// File paths for version updates
const filesToUpdate = [
  {
    path: path.resolve(__dirname, '../capacitor.config.ts'),
    updateFunction: updateCapacitorConfig
  },
  {
    path: path.resolve(__dirname, '../src/config/app-config.js'),
    updateFunction: updateAppConfig
  }
];

// Process each file
filesToUpdate.forEach(file => {
  if (fs.existsSync(file.path)) {
    try {
      file.updateFunction(file.path, version);
      console.log(`✓ Updated ${path.basename(file.path)}`);
    } catch (err) {
      console.error(`✗ Failed to update ${path.basename(file.path)}:`, err.message);
    }
  } else {
    console.warn(`⚠ File not found: ${file.path}`);
  }
});

// Update Capacitor config version
function updateCapacitorConfig(filePath, version) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Extract versionName if it exists
  const versionMatch = content.match(/versionName: ["']([^"']*)["']/);
  
  if (versionMatch) {
    // Replace existing version
    content = content.replace(
      /versionName: ["'][^"']*["']/,
      `versionName: "${version}"`
    );
  } else {
    // Add version if not found
    content = content.replace(
      /(android: {[^}]*)(})/s,
      `$1  versionName: "${version}",\n$2`
    );
  }
  
  fs.writeFileSync(filePath, content);
}

// Update app config version
function updateAppConfig(filePath, version) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if the file contains a version field
  if (content.includes('version:')) {
    // Replace existing version
    content = content.replace(
      /version: ['"][^'"]*['"],/,
      `version: '${version}',`
    );
  } else {
    // Add version at the beginning of the config
    content = content.replace(
      /const config = {/,
      `const config = {\n  version: '${version}',`
    );
  }
  
  fs.writeFileSync(filePath, content);
}

console.log('Version application complete!');
