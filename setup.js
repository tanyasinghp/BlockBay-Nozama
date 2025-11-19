#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Nozama Blockchain E-commerce Platform Setup\n');

const steps = [
  {
    name: 'Install root dependencies',
    command: 'npm install',
    description: 'Installing root package dependencies...'
  },
  {
    name: 'Setup contracts environment',
    command: 'cd contracts && npm install',
    description: 'Installing blockchain dependencies...'
  },
  {
    name: 'Setup scripts environment', 
    command: 'cd scripts && npm install',
    description: 'Installing database utilities...'
  },
  {
    name: 'Compile smart contracts',
    command: 'cd contracts && npx hardhat compile',
    description: 'Compiling Solidity smart contracts...'
  }
];

async function runSetup() {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`📋 Step ${i + 1}/${steps.length}: ${step.description}`);
    
    try {
      execSync(step.command, { stdio: 'inherit' });
      console.log(`✅ ${step.name} completed\n`);
    } catch (error) {
      console.error(`❌ ${step.name} failed:`, error.message);
      process.exit(1);
    }
  }

  console.log('🎉 Setup completed successfully!\n');
  console.log('📋 Next steps:');
  console.log('   1. Copy scripts/.env.example to scripts/.env');
  console.log('   2. Add your MongoDB Atlas connection string');
  console.log('   3. Start local blockchain: cd contracts && npx hardhat node');
  console.log('   4. Deploy contracts: cd contracts && npm run deploy:localhost');
  console.log('   5. Populate blockchain: cd contracts && npm run populate');
  console.log('   6. Populate MongoDB: cd scripts && npm run populate:mongodb\n');
  console.log('🔗 For detailed instructions, see README.md');
}

runSetup().catch(console.error);
