const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Deploy Vault
  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.deploy();
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("Vault deployed:", vaultAddress);

  // Deploy DMT
  const DMT = await hre.ethers.getContractFactory("DMT");
  const initialSupply = hre.ethers.parseUnits("1000000000", 18); // 1B DMT
  const dmt = await DMT.deploy(initialSupply);
  await dmt.waitForDeployment();
  const dmtAddress = await dmt.getAddress();
  console.log("DMT deployed:", dmtAddress);

  // Transfer DMT ownership to Vault (requires Ownable in DMT)
  if (typeof dmt.transferOwnership === "function") {
    const tx = await dmt.transferOwnership(vaultAddress);
    await tx.wait();
    console.log(`Transferred DMT ownership to Vault: ${vaultAddress}`);
  } else {
    console.warn("⚠️ DMT contract does not have transferOwnership(). Skipping.");
  }

  // Save deployment info
  const out = {
    timestamp: Date.now(),
    deployer: deployer.address,
    vault: vaultAddress,
    dmt: dmtAddress,
    dmtOwner: vaultAddress,
  };
  fs.writeFileSync(`deploy-${Date.now()}.json`, JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });