require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    skale: {
      url: process.env.SKALE_RPC_URL || "",
      chainId: process.env.SKALE_CHAIN_ID ? Number(process.env.SKALE_CHAIN_ID) : undefined,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
};
