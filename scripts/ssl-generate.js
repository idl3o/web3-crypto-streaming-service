const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
    // Create SSL directory
    const sslDir = path.join(__dirname, '..', 'ssl', 'certs');
    if (!fs.existsSync(sslDir)) {
        fs.mkdirSync(sslDir, { recursive: true });
    }

    // Generate certificates using OpenSSL
    const command = process.platform === 'win32'
        ? 'openssl req -x509 -newkey rsa:4096 -keyout ssl/certs/key.pem -out ssl/certs/cert.pem -days 365 -nodes -subj "/CN=localhost"'
        : 'openssl req -x509 -newkey rsa:4096 -keyout ssl/certs/key.pem -out ssl/certs/cert.pem -days 365 -nodes -subj \'/CN=localhost\'';

    execSync(command, { stdio: 'inherit' });
    console.log('SSL certificates generated successfully');
} catch (error) {
    console.error('Error generating SSL certificates:', error);
    process.exit(1);
}
