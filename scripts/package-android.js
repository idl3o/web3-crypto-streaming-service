/**
 * Script to organize Android build artifacts into distributable packages
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create output directory
const DIST_DIR = path.resolve(__dirname, '../dist-packages');
const ANDROID_DIR = path.resolve(__dirname, '../android');
const APK_OUTPUT = path.resolve(ANDROID_DIR, 'app/build/outputs/apk/release');
const BUNDLE_OUTPUT = path.resolve(ANDROID_DIR, 'app/build/outputs/bundle/release');

// Read version
const packageJson = require('../package.json');
const { version } = packageJson;

console.log(`Packaging Android builds (v${version})...`);

// Create dist directory if it doesn't exist
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Create a version-specific directory
const versionDir = path.join(DIST_DIR, `android-${version}`);
if (!fs.existsSync(versionDir)) {
  fs.mkdirSync(versionDir, { recursive: true });
}

// Helper to copy files
function copyBuildArtifact(sourcePath, targetName) {
  if (fs.existsSync(sourcePath)) {
    const targetPath = path.join(versionDir, targetName);
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Copied ${targetName} to ${versionDir}`);
    return true;
  }
  return false;
}

// Copy APK
const apkPath = path.join(APK_OUTPUT, 'app-release.apk');
const apkSuccess = copyBuildArtifact(apkPath, `web3-crypto-streaming-${version}.apk`);

// Copy AAB (Android App Bundle)
const aabPath = path.join(BUNDLE_OUTPUT, 'app-release.aab');
const aabSuccess = copyBuildArtifact(aabPath, `web3-crypto-streaming-${version}.aab`);

// Create a manifest file with build info
const buildInfo = {
  name: packageJson.name,
  version,
  buildDate: new Date().toISOString(),
  artifacts: {
    apk: apkSuccess ? `web3-crypto-streaming-${version}.apk` : null,
    aab: aabSuccess ? `web3-crypto-streaming-${version}.aab` : null
  }
};

const manifestPath = path.join(versionDir, 'build-info.json');
fs.writeFileSync(manifestPath, JSON.stringify(buildInfo, null, 2));

// Generate SHA-256 checksums for artifacts
try {
  console.log('Generating checksums...');
  const checksumFile = path.join(versionDir, 'checksums.txt');
  const checksumStream = fs.createWriteStream(checksumFile);
  
  if (apkSuccess) {
    const apkChecksum = execSync(`sha256sum "${path.join(versionDir, `web3-crypto-streaming-${version}.apk`)}"`)
      .toString().trim();
    checksumStream.write(`${apkChecksum}\n`);
  }
  
  if (aabSuccess) {
    const aabChecksum = execSync(`sha256sum "${path.join(versionDir, `web3-crypto-streaming-${version}.aab`)}"`)
      .toString().trim();
    checksumStream.write(`${aabChecksum}\n`);
  }
  
  checksumStream.end();
  console.log(`Checksums written to ${checksumFile}`);
} catch (err) {
  console.warn('Error generating checksums:', err.message);
}

console.log(`Android packages created in ${versionDir}`);

if (!apkSuccess && !aabSuccess) {
  console.error('No build artifacts were found! Make sure you run the build commands first.');
  process.exit(1);
}
