const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting Blockchain E-Commerce Order Service...\n');
console.log('This will:');
console.log('1. Install dependencies');
console.log('2. Compile smart contracts');
console.log('3. Deploy to local Hardhat network');
console.log('4. Seed sample data');
console.log('5. Start backend API');
console.log('6. Start frontend dev server\n');
console.log('Please wait...\n');

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

async function checkDeployment() {
  const deploymentPath = path.join(__dirname, '..', 'deployment.json');
  return fs.existsSync(deploymentPath);
}

async function main() {
  try {
    // Step 1: Install backend dependencies
    console.log('[Step 1/7] Installing backend dependencies...');
    await runCommand('npm', ['install']);
    
    // Step 2: Install frontend dependencies
    console.log('\n[Step 2/7] Installing frontend dependencies...');
    const frontendPath = path.join(__dirname, '..', 'frontend');
    if (fs.existsSync(frontendPath)) {
      await runCommand('npm', ['install'], { cwd: frontendPath });
    } else {
      console.log('Frontend not found, skipping...');
    }
    
    // Step 3: Compile contracts
    console.log('\n[Step 3/7] Compiling smart contracts...');
    await runCommand('npx', ['hardhat', 'compile']);
    
    // Step 4: Check if deployment exists, if not deploy
    const isDeployed = await checkDeployment();
    if (!isDeployed) {
      console.log('\n[Step 4/7] Deploying contracts to local network...');
      console.log('Note: Make sure Hardhat node is running in another terminal!');
      console.log('Run: npm run hardhat:node\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      try {
        await runCommand('npx', ['hardhat', 'run', 'scripts/deploy.js', '--network', 'localhost']);
      } catch (error) {
        console.log('\n[ERROR] Deployment failed. Make sure Hardhat node is running:');
        console.log('   npm run hardhat:node\n');
        process.exit(1);
      }
      
      // Step 5: Seed data
      console.log('\n[Step 5/7] Seeding sample data...');
      await runCommand('npx', ['hardhat', 'run', 'scripts/seed-data.js', '--network', 'localhost']);
    } else {
      console.log('\n[Step 4/7] Contracts already deployed (deployment.json found)');
      console.log('[Step 5/7] Skipping seeding (already done)');
    }
    
    // Step 6: Start backend service
    console.log('\n[Step 6/7] Starting backend service...');
    console.log('Backend will run on http://localhost:3003\n');
    
    const backend = spawn('node', ['services/order-service/index.js'], {
      stdio: 'inherit',
      shell: true
    });
    
    // Wait a bit for backend to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 7: Start frontend
    if (fs.existsSync(frontendPath)) {
      console.log('\n[Step 7/7] Starting frontend dev server...');
      console.log('Frontend will run on http://localhost:5173\n');
      
      const frontend = spawn('npm', ['run', 'dev'], {
        cwd: frontendPath,
        stdio: 'inherit',
        shell: true
      });
      
      console.log('\n' + '='.repeat(60));
      console.log('All services started successfully!');
      console.log('='.repeat(60));
      console.log('\nOpen your browser:');
      console.log('  Frontend: http://localhost:5173');
      console.log('  Backend:  http://localhost:3003\n');
      
      // Handle cleanup
      process.on('SIGINT', () => {
        console.log('\nShutting down services...');
        backend.kill();
        frontend.kill();
        process.exit(0);
      });
      
      // Keep the script running
      await new Promise(() => {});
    } else {
      console.log('\n[Step 7/7] Frontend not found, skipping...');
      console.log('\nBackend service is running on http://localhost:3003');
      console.log('Press Ctrl+C to stop\n');
      
      process.on('SIGINT', () => {
        console.log('\nShutting down service...');
        backend.kill();
        process.exit(0);
      });
    }
    
  } catch (error) {
    console.error('\n[ERROR]', error.message);
    process.exit(1);
  }
}

main();
