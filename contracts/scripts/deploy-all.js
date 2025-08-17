const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  const supply = hre.ethers.utils.parseUnits("5000000000", 18); // 5 Billion fixed
  const Token = await hre.ethers.getContractFactory("DreamMemeToken");
  const token = await Token.deploy(supply);

  await token.deployed();
  console.log("Dream Meme Token deployed at:", token.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
