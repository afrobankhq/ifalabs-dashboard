#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Check if .env.local exists
const envLocalPath = path.join(__dirname, '.env.local');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envLocalPath)) {
  if (fs.existsSync(envExamplePath)) {
    // Copy env.example to .env.local
    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    fs.writeFileSync(envLocalPath, envContent);
    console.log('✅ Created .env.local from env.example');
  } else {
    // Create a basic .env.local
    const basicEnv = `# Oracle Engine API Configuration
NEXT_PUBLIC_API_URL=https://api.ifalabs.com

# Oracle Engine Authentication Paths
NEXT_PUBLIC_AUTH_LOGIN_PATH=/api/dashboard/login
NEXT_PUBLIC_AUTH_REGISTER_PATH=/api/dashboard/signup
NEXT_PUBLIC_AUTH_LOGOUT_PATH=/api/dashboard/logout
NEXT_PUBLIC_AUTH_VERIFY_PATH=/api/dashboard/{id}/profile

# Oracle Engine Dashboard Paths
NEXT_PUBLIC_COMPANY_PROFILE_PATH=/api/dashboard/{id}/profile
NEXT_PUBLIC_PROFILE_KEYS_PATH=/api/dashboard/{id}/api-keys
NEXT_PUBLIC_PROFILE_KEYS_CREATE_PATH=/api/dashboard/{id}/api-keys
NEXT_PUBLIC_PROFILE_USAGE_PATH=/api/dashboard/{id}/usage

# Oracle Engine API Endpoints
NEXT_PUBLIC_PRICES_LAST_PATH=/api/prices/last
NEXT_PUBLIC_PRICES_STREAM_PATH=/api/prices/stream
NEXT_PUBLIC_ASSETS_PATH=/api/assets
NEXT_PUBLIC_SUBSCRIPTION_PLANS_PATH=/api/subscription/plans

# Proxy Configuration (for development)
PROXY_UPSTREAM_URL=https://api.ifalabs.com
`;
    fs.writeFileSync(envLocalPath, basicEnv);
    console.log('✅ Created basic .env.local file');
  }
} else {
  console.log('ℹ️  .env.local already exists');
}

console.log('\n📋 Next steps:');
console.log('1. Make sure you have a valid user account in the Oracle Engine');
console.log('2. Login to get a JWT token');
console.log('3. Create API keys through the dashboard');
console.log('4. Use the API keys for Oracle Engine price endpoints');
console.log('\n🔗 Oracle Engine API Documentation: https://api.ifalabs.com/swagger/');
