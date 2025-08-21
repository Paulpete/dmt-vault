const { ethers } = require("hardhat");
(async () => {
  const pk = process.env.DEPLOYER_PRIVATE_KEY; if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY missing");
  console.log("Deployer address:", new ethers.Wallet(pk).address);
})();
