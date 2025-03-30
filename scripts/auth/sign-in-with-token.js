#!/usr/bin/env node

/**
 * Sign in to Sona Streaming Service with authentication token
 * 
 * Usage:
 *   node scripts/auth/sign-in-with-token.js [token]
 *   
 * If token is not provided as argument, the script will look for
 * SONA_AUTH_TOKEN environment variable
 */

// Import the SonaAuthenticationService
const { SonaAuthenticationService } = require('../../dist/services/SonaAuthenticationService');

// Create auth service instance
const authService = SonaAuthenticationService.getInstance();

async function signInWithToken(token) {
  console.log('Authenticating with token...');
  
  try {
    // Attempt to sign in with the provided token
    const authResult = await authService.signInWithToken(token);
    
    console.log('✅ Authentication successful!');
    console.log(`User ID: ${authResult.userId}`);
    console.log(`Token expires at: ${new Date(authResult.expiresAt).toLocaleString()}`);
    
    // Return the auth result
    return authResult;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    process.exit(1);
  }
}

// Main function
async function main() {
  // Get token from command line args or environment variable
  const token = process.argv[2] || process.env.SONA_AUTH_TOKEN;
  
  if (!token) {
    console.error('Error: No authentication token provided');
    console.error('Please provide a token as command line argument or set SONA_AUTH_TOKEN environment variable');
    process.exit(1);
  }

  // Sign in with the token
  const authResult = await signInWithToken(token);
  
  // You could store token in a file or pass to other services here
  console.log('\nAuthentication token can now be used for streaming services.');
}

// Run the main function
if (require.main === module) {
  main().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
}

module.exports = { signInWithToken };
