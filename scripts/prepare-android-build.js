/**
 * Script to prepare Android build environment
 * Sets up build properties and environment variables
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Make sure environment is clean
console.log('Preparing Android build environment...');

// Read package version
const packageJson = require('../package.json');
const { version } = packageJson;

// Version code for Android is integer - convert semantic version to integer
// Format: MAJOR(2) MINOR(2) PATCH(2) = MMMMPP
// E.g. 1.2.3 = 010203 = 10203
const [major, minor, patch] = version.split('.');
const versionCode = parseInt(`${major.padStart(2, '0')}${minor.padStart(2, '0')}${patch.padStart(2, '0')}`);

console.log(`App version: ${version} (code: ${versionCode})`);

// Create or update version properties file for Android
const androidPropertiesFile = path.resolve(__dirname, '../android/app/version.properties');
const properties = 
`versionName=${version}
versionCode=${versionCode}`;

fs.writeFileSync(androidPropertiesFile, properties);
console.log(`Updated Android version properties: ${androidPropertiesFile}`);

// Update Capacitor config if needed
const capacitorConfigPath = path.resolve(__dirname, '../capacitor.config.ts');
try {
  let config = fs.readFileSync(capacitorConfigPath, 'utf8');
  if (!config.includes('versionName')) {
    console.log('Updating Capacitor config with version information...');
    
    // Simple replacement to add version to config (not a full TS parser)
    const appConfig = config.match(/const config: CapacitorConfig = \{([^}]*)\}/s);
    if (appConfig) {
      const updatedConfig = `const config: CapacitorConfig = {${appConfig[1]}  
  android: {
    ...config.android,
    versionName: "${version}",
    versionCode: ${versionCode}
  }
}`;
      fs.writeFileSync(capacitorConfigPath, config.replace(appConfig[0], updatedConfig));
    }
  }
} catch (err) {
  console.error('Error updating Capacitor config:', err.message);
}

console.log('Android build preparation complete!');
