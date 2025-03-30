/**
 * GitHub Packages Registry Setup Script
 * 
 * This script helps with setting up authentication and configuration
 * for using GitHub Packages as an npm registry.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Get user home directory for global .npmrc
const homeDir = require('os').homedir();
const globalNpmrcPath = path.join(homeDir, '.npmrc');

console.log('🚀 GitHub Packages Registry Setup');
console.log('================================');
console.log('This script will help you configure npm to use GitHub Packages.');
console.log('You will need a GitHub Personal Access Token with the appropriate scopes.');
console.log('For more info: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry\n');

rl.question('Enter your GitHub username: ', (username) => {
    rl.question('Enter your GitHub Personal Access Token (will not be displayed): ', {
        hideEchoBack: true // This hides the token input
    }, (token) => {
        rl.question('Enter your GitHub organization name (leave blank for personal account): ', (orgName) => {
            const namespace = orgName || username;

            try {
                // Update project .npmrc
                const projectNpmrcPath = path.join(__dirname, '..', '.npmrc');
                const projectNpmrcContent =
                    `@${namespace}:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=\${NPM_TOKEN}`;

                fs.writeFileSync(projectNpmrcPath, projectNpmrcContent);
                console.log('✅ Project .npmrc file created successfully.');

                // Update global .npmrc if user wants
                rl.question('Do you want to update your global ~/.npmrc file? (y/n): ', (answer) => {
                    if (answer.toLowerCase() === 'y') {
                        let globalNpmrcContent = '';

                        // Read existing content if file exists
                        if (fs.existsSync(globalNpmrcPath)) {
                            globalNpmrcContent = fs.readFileSync(globalNpmrcPath, 'utf8');

                            // Check if configuration already exists
                            if (globalNpmrcContent.includes('npm.pkg.github.com')) {
                                console.log('⚠️ GitHub Packages configuration already exists in global .npmrc');
                            } else {
                                // Append to existing file
                                globalNpmrcContent += `\n@${namespace}:registry=https://npm.pkg.github.com\n`;
                                globalNpmrcContent += `//npm.pkg.github.com/:_authToken=${token}\n`;

                                fs.writeFileSync(globalNpmrcPath, globalNpmrcContent);
                                console.log('✅ Global .npmrc updated successfully.');
                            }
                        } else {
                            // Create new file
                            globalNpmrcContent = `@${namespace}:registry=https://npm.pkg.github.com\n`;
                            globalNpmrcContent += `//npm.pkg.github.com/:_authToken=${token}\n`;

                            fs.writeFileSync(globalNpmrcPath, globalNpmrcContent);
                            console.log('✅ Global .npmrc created successfully.');
                        }
                    }

                    // Create .env file with NPM_TOKEN
                    const envPath = path.join(__dirname, '..', '.env');
                    let envContent = '';

                    // Read existing content if file exists
                    if (fs.existsSync(envPath)) {
                        envContent = fs.readFileSync(envPath, 'utf8');

                        // Check if NPM_TOKEN already exists
                        if (envContent.includes('NPM_TOKEN=')) {
                            // Replace existing token
                            envContent = envContent.replace(/NPM_TOKEN=.*(\n|$)/g, `NPM_TOKEN=${token}\n`);
                        } else {
                            // Append token
                            envContent += `\nNPM_TOKEN=${token}\n`;
                        }
                    } else {
                        // Create new file
                        envContent = `NPM_TOKEN=${token}\n`;
                    }

                    fs.writeFileSync(envPath, envContent);
                    console.log('✅ .env file updated with NPM_TOKEN.');

                    // Update package.json if needed
                    const packageJsonPath = path.join(__dirname, '..', 'package.json');
                    const packageJson = require(packageJsonPath);

                    let modified = false;

                    // Set the correct name with namespace
                    if (!packageJson.name.startsWith('@')) {
                        const baseName = packageJson.name;
                        packageJson.name = `@${namespace}/${baseName}`;
                        modified = true;
                        console.log(`✅ Updated package name to ${packageJson.name}`);
                    }

                    // Add publishConfig if missing
                    if (!packageJson.publishConfig) {
                        packageJson.publishConfig = {
                            registry: 'https://npm.pkg.github.com'
                        };
                        modified = true;
                        console.log('✅ Added publishConfig to package.json');
                    }

                    // Add repository field if missing
                    if (!packageJson.repository) {
                        packageJson.repository = {
                            type: 'git',
                            url: `https://github.com/${namespace}/${packageJson.name.split('/')[1]}.git`
                        };
                        modified = true;
                        console.log('✅ Added repository field to package.json');
                    }

                    if (modified) {
                        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
                        console.log('✅ package.json updated successfully.');
                    }

                    console.log('\n🎉 Setup complete! You can now publish packages to GitHub Packages.');
                    console.log('To publish your package, run: npm publish');
                    console.log('For a dry run (no actual publish): npm publish --dry-run');

                    rl.close();
                });
            } catch (error) {
                console.error('❌ Error setting up GitHub Packages:', error.message);
                rl.close();
            }
        });
    });
});
