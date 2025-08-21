const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Deploy Vault
  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.deploy();
  await vault.waitForDeployment();
  console.log("Vault deployed:", await vault.getAddress());

  // Deploy DMT with Vault as owner
  const DMT = await hre.ethers.getContractFactory("DMT");
  const initialSupply = hre.ethers.parseUnits("1000000000", 18); // 1B DMT
  const dmt = await DMT.deploy(initialSupply);
  await dmt.waitForDeployment();
  console.log("DMT deployed:", await dmt.getAddress());

  // Save deployment info
  const out = {
    timestamp: Date.now(),
    deployer: deployer.address,
    vault: await vault.getAddress(),
    dmt: await dmt.getAddress(),
  };
  fs.writeFileSync(`deploy-${Date.now()}.json`, JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
