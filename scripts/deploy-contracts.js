// Deploy smart contracts to the blockchain
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Get network details
  const network = await ethers.provider.getNetwork();
  console.log(`Deploying contracts to ${network.name} (${network.chainId})`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  const deployerBalance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(deployerBalance)} ETH`);
  
  // Deploy ProofOfExistence contract
  console.log("\nDeploying ProofOfExistence contract...");
  const ProofOfExistence = await ethers.getContractFactory("ProofOfExistence");
  const poeContract = await ProofOfExistence.deploy();
  await poeContract.deployed();
  
  console.log(`ProofOfExistence deployed to: ${poeContract.address}`);
  
  // Deploy StreamPayment contract
  console.log("\nDeploying StreamPayment contract...");
  const StreamPayment = await ethers.getContractFactory("StreamPayment");
  const paymentContract = await StreamPayment.deploy();
  await paymentContract.deployed();
  
  console.log(`StreamPayment deployed to: ${paymentContract.address}`);
  
  // Save contract addresses to a file
  saveContractAddresses({
    network: network.name,
    chainId: network.chainId,
    poeContract: poeContract.address,
    paymentContract: paymentContract.address,
    deployedAt: new Date().toISOString()
  });
  
  // Export ABIs
  await saveContractABIs();
  
  console.log("\nDeployment completed successfully!");
}

// Save contract addresses to a JSON file
function saveContractAddresses(data) {
  const deploymentsDir = path.join(__dirname, "../deployments");
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const filePath = path.join(deploymentsDir, `${data.network}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  
  console.log(`Contract addresses saved to: ${filePath}`);
}

// Export contract ABIs to the src directory for frontend use
async function saveContractABIs() {
  const abiDir = path.join(__dirname, "../src/contracts/abis");
  
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }
  
  // Get contract artifacts
  const ProofOfExistence = await ethers.getContractFactory("ProofOfExistence");
  const StreamPayment = await ethers.getContractFactory("StreamPayment");
  
  // Write ProofOfExistence ABI
  fs.writeFileSync(
    path.join(abiDir, "ProofOfExistence.json"),
    JSON.stringify(ProofOfExistence.interface.format("json"), null, 2)
  );
  
  // Write StreamPayment ABI
  fs.writeFileSync(
    path.join(abiDir, "StreamPayment.json"),
    JSON.stringify(StreamPayment.interface.format("json"), null, 2)
  );
  
  console.log("Contract ABIs exported successfully");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
