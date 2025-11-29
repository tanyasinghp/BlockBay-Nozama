#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Nozama Decentralized E-Commerce Platform...\n');

const services = [
  {
    name: 'Hardhat Blockchain Node',
    command: 'npx',
    args: ['hardhat', 'node'],
    cwd: process.cwd(),
    port: 8545,
    color: '\x1b[36m' // Cyan
  },
  {
    name: 'Order Service',
    command: 'node',
    args: ['services/order-service/index.js'],
    cwd: process.cwd(),
    port: 3003,
    color: '\x1b[32m' // Green
  },
  {
    name: 'Listing Service',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: path.join(process.cwd(), 'services/listing-service'),
    port: 3004,
    color: '\x1b[33m' // Yellow
  },
  {
    name: 'Search & Discovery Service',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: path.join(process.cwd(), 'services/search-discovery'),
    port: 3002,
    color: '\x1b[35m' // Magenta
  },
  {
    name: 'Identity & Reputation Service',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: path.join(process.cwd(), 'services/identity-reputation'),
    port: 3001,
    color: '\x1b[34m' // Blue
  },
  {
    name: 'Payment/Escrow Service',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: path.join(process.cwd(), 'services/payment-service'),
    port: 3005,
    color: '\x1b[31m' // Red
  },
  {
    name: 'Frontend',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: path.join(process.cwd(), 'frontend'),
    port: 5173,
    color: '\x1b[37m' // White
  }
];

const runningProcesses = [];

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}`));
      } else {
        resolve();
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function installDependencies() {
  console.log('📦 Installing dependencies...\n');
  
  // Root dependencies
  console.log('Installing root dependencies...');
  await runCommand('npm', ['install']);
  
  // Frontend dependencies
  const frontendPath = path.join(process.cwd(), 'frontend');
  if (fs.existsSync(frontendPath)) {
    console.log('Installing frontend dependencies...');
    await runCommand('npm', ['install'], { cwd: frontendPath });
  }
  
  // Service dependencies
  for (const service of services.slice(1, -1)) { // Skip hardhat and frontend
    if (fs.existsSync(service.cwd) && fs.existsSync(path.join(service.cwd, 'package.json'))) {
      console.log(`Installing ${service.name} dependencies...`);
      await runCommand('npm', ['install'], { cwd: service.cwd });
    }
  }
  
  console.log('✅ All dependencies installed!\n');
}

async function setupBlockchain() {
  console.log('⛓️  Setting up blockchain...\n');
  
  // Compile contracts
  console.log('Compiling smart contracts...');
  await runCommand('npx', ['hardhat', 'compile']);
  
  console.log('✅ Smart contracts compiled!\n');
}

async function createEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), 'env.example');
  
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log('📄 Creating .env file from env.example...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created!\n');
  }
}

function startService(service, index) {
  return new Promise((resolve) => {
    const proc = spawn(service.command, service.args, {
      cwd: service.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    runningProcesses.push({ process: proc, name: service.name });

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`${service.color}[${service.name}]${'\x1b[0m'} ${output.trim()}`);
    });

    proc.stderr.on('data', (data) => {
      const output = data.toString();
      console.log(`${service.color}[${service.name}]${'\x1b[0m'} ${output.trim()}`);
    });

    proc.on('close', (code) => {
      console.log(`${service.color}[${service.name}]${'\x1b[0m'} Process exited with code ${code}`);
    });

    proc.on('error', (error) => {
      console.error(`${service.color}[${service.name}]${'\x1b[0m'} Error:`, error);
    });

    // Give the service some time to start
    setTimeout(() => {
      resolve();
    }, index === 0 ? 5000 : 2000); // Give blockchain more time to start
  });
}

async function deployContracts() {
  console.log('🚀 Deploying smart contracts...\n');
  
  try {
    await runCommand('npx', ['hardhat', 'run', 'scripts/deploy.js', '--network', 'localhost']);
    console.log('✅ Smart contracts deployed!\n');
    
    // Seed data
    console.log('🌱 Seeding sample data...');
    await runCommand('npx', ['hardhat', 'run', 'scripts/seed-data.js', '--network', 'localhost']);
    console.log('✅ Sample data seeded!\n');
    
  } catch (error) {
    console.log('❌ Contract deployment failed. This is expected if contracts are already deployed.');
    console.log('Continuing with service startup...\n');
  }
}

async function main() {
  try {
    console.log('🔧 Setting up environment...\n');
    
    // Create .env file if it doesn't exist
    await createEnvFile();
    
    // Install dependencies
    await installDependencies();
    
    // Setup blockchain
    await setupBlockchain();
    
    console.log('🎯 Starting services...\n');
    console.log('Services will start in the following order:');
    services.forEach((service, index) => {
      console.log(`  ${index + 1}. ${service.name} (Port: ${service.port})`);
    });
    console.log('');
    
    // Start blockchain first
    console.log('Starting Hardhat blockchain node...');
    await startService(services[0], 0);
    
    // Deploy contracts
    await deployContracts();
    
    // Start other services
    for (let i = 1; i < services.length; i++) {
      const service = services[i];
      if (fs.existsSync(service.cwd)) {
        console.log(`Starting ${service.name}...`);
        await startService(service, i);
      } else {
        console.log(`⚠️  Skipping ${service.name} - directory not found`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 ALL SERVICES STARTED SUCCESSFULLY! 🎉');
    console.log('='.repeat(80));
    console.log('\n📋 Service URLs:');
    console.log('  🌐 Frontend:              http://localhost:5173');
    console.log('  📦 Order Service:         http://localhost:3003');
    console.log('  📋 Listing Service:       http://localhost:3001');
    console.log('  🔍 Search Service:        http://localhost:3002');
    console.log('  🆔 Identity Service:      http://localhost:3001');
    console.log('  💳 Payment Service:       http://localhost:3005');
    console.log('  ⛓️  Blockchain RPC:       http://localhost:8545');
    console.log('\n📚 API Documentation:');
    console.log('  Order API:    npm run api-order');
    console.log('  Identity API: npm run api-did');
    console.log('  Escrow API:   npm run api-escrow');
    console.log('  Listing API:  npm run api-listing');
    console.log('  Search API:   npm run api-search');
    console.log('\n💡 Tips:');
    console.log('  - Use Ctrl+C to stop all services');
    console.log('  - Check logs above for any service-specific errors');
    console.log('  - Make sure you have MongoDB running for database services');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error during startup:', error.message);
    console.log('\nCleaning up...');
    cleanup();
    process.exit(1);
  }
}

function cleanup() {
  console.log('\n🧹 Shutting down services...');
  runningProcesses.forEach(({ process, name }) => {
    try {
      process.kill('SIGTERM');
      console.log(`✅ Stopped ${name}`);
    } catch (error) {
      console.log(`⚠️  Failed to stop ${name}:`, error.message);
    }
  });
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n⚡ Received interrupt signal...');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚡ Received termination signal...');
  cleanup();
  process.exit(0);
});

// Start everything
main();