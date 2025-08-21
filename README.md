🧬 SKALE Gasless Relayer — Omega‑Prime Playbook (DMT/Vault Edition)

Goal: Deploy DreamMemeToken (DMT) + Vault contracts to SKALE from GitHub Actions without storing your private key in GitHub. A small self‑hosted Relayer signs and broadcasts on your behalf.


---

0) Architecture Overview

GitHub Action  ──(HMAC-signed HTTPS)──▶  Relayer (Express.js)
                                               │
                                               ├─ runs Hardhat scripts with PRIVATE_KEY (server-side only)
                                               └─ broadcasts to SKALE RPC

No private key exists in GitHub.

HMAC shared secret authenticates requests to the relayer.

Relayer owns the DEPLOYER_PRIVATE_KEY and publishes transactions.



---

1) Repository Structure

.
├─ contracts/
│  ├─ DMT.sol
│  └─ Vault.sol
├─ scripts/
│  ├─ deploy.js        # Deploys Vault + DMT
│  ├─ showDeployer.js
│  └─ status.js        # Prints last deployed addresses
├─ relayer/
│  ├─ server.js
│  ├─ verify.js
│  ├─ package.json
│  └─ .env            # lives ONLY on the relayer machine
├─ hardhat.config.js
└─ .github/
   └─ workflows/
      └─ deploy.yml


---

2) Hardhat Config (server-side key only)

> hardhat.config.js



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


---

3) Deployment Script (Vault + DMT)

> scripts/deploy.js



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

> scripts/showDeployer.js



const { ethers } = require("hardhat");
(async () => {
  const pk = process.env.DEPLOYER_PRIVATE_KEY; if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY missing");
  console.log("Deployer address:", new ethers.Wallet(pk).address);
})();

> scripts/status.js



const fs = require("fs");

(async () => {
  const files = fs.readdirSync(".").filter(f => f.startsWith("deploy-") && f.endsWith(".json"));
  if (files.length === 0) return console.log("No deployment records found.");
  const latest = files.sort().reverse()[0];
  const data = JSON.parse(fs.readFileSync(latest));
  console.log("Last Deployment:", data);
})();


---

4) Relayer Service (Express.js)

Includes /deploy and new /status endpoint.

> relayer/server.js



import express from "express";
import bodyParser from "body-parser";
import { execa } from "execa";
import dotenv from "dotenv";
import { verifyHMAC } from "./verify.js";
import fs from "fs";

dotenv.config();
const app = express();
app.use(bodyParser.json({ limit: "1mb" }));

const REQUIRED_ENV = ["HARDHAT_PROJECT_PATH", "SKALE_RPC_URL", "SKALE_CHAIN_ID", "DEPLOYER_PRIVATE_KEY", "HMAC_SECRET"];
for (const k of REQUIRED_ENV) if (!process.env[k]) throw new Error(`Missing env ${k}`);

app.get("/health", (_, res) => res.json({ ok: true }));

app.post("/deploy", verifyHMAC(process.env.HMAC_SECRET), async (req, res) => {
  try {
    const { tag = "default" } = req.body || {};
    const cwd = process.env.HARDHAT_PROJECT_PATH;
    const env = { ...process.env };

    const subprocess = execa("npx", ["hardhat", "run", "scripts/deploy.js", "--network", "skale"], { cwd, env });
    let stdout = ""; let stderr = "";
    subprocess.stdout.on("data", (d) => { stdout += d.toString(); });
    subprocess.stderr.on("data", (d) => { stderr += d.toString(); });

    const { exitCode } = await subprocess;
    const success = exitCode === 0;

    return res.json({ success, exitCode, stdout, stderr, tag });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// New: return latest deployment info
app.get("/status", verifyHMAC(process.env.HMAC_SECRET), (req, res) => {
  const files = fs.readdirSync(process.env.HARDHAT_PROJECT_PATH)
    .filter(f => f.startsWith("deploy-") && f.endsWith(".json"));
  if (files.length === 0) return res.json({ ok: false, error: "No deployments yet" });
  const latest = files.sort().reverse()[0];
  const data = JSON.parse(fs.readFileSync(`${process.env.HARDHAT_PROJECT_PATH}/${latest}`));
  res.json({ ok: true, latest: data });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Relayer listening on :${port}`));


---

5) GitHub Actions Workflow (Deploy + Status)

> .github/workflows/deploy.yml



name: Deploy DMT+Vault to SKALE via Relayer

on:
  workflow_dispatch:
    inputs:
      tag:
        description: "Release tag or note"
        required: false
        default: "manual"

jobs:
  relay-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Generate HMAC and trigger relayer
        id: call
        env:
          RELAYER_URL: ${{ secrets.RELAYER_URL }}
          RELAYER_HMAC_SECRET: ${{ secrets.RELAYER_HMAC_SECRET }}
          TAG: ${{ github.event.inputs.tag }}
        run: |
          BODY=$(jq -n --arg tag "$TAG" '{tag: $tag}')
          SIG=$(python3 - <<'PY'
import sys, hmac, hashlib, os
body=os.environ['BODY'].encode()
secret=os.environ['RELAYER_HMAC_SECRET'].encode()
print(hmac.new(secret, body, hashlib.sha256).hexdigest())
PY
)
          curl -sS -X POST "$RELAYER_URL/deploy" \
            -H "Content-Type: application/json" \
            -H "X-Signature: $SIG" \
            -d "$BODY" | tee response.json

      - name: Parse result
        run: |
          cat response.json
          SUCCESS=$(jq -r .success response.json)
          if [ "$SUCCESS" != "true" ]; then
            echo "Deployment failed" >&2
            exit 1
          fi

  relay-status:
    runs-on: ubuntu-latest
    needs: relay-deploy
    steps:
      - name: Check last deployment
        env:
          RELAYER_URL: ${{ secrets.RELAYER_URL }}
          RELAYER_HMAC_SECRET: ${{ secrets.RELAYER_HMAC_SECRET }}
        run: |
          BODY='{}'
          SIG=$(python3 - <<'PY'
import sys, hmac, hashlib, os
body=os.environ['BODY'].encode()
secret=os.environ['RELAYER_HMAC_SECRET'].encode()
print(hmac.new(secret, body, hashlib.sha256).hexdigest())
PY
)
          curl -sS "$RELAYER_URL/status" \
            -H "Content-Type: application/json" \
            -H "X-Signature: $SIG"


---

6) Next Steps

Replace Vault.sol and DMT.sol with your real contract logic.

Adjust deploy.js to wire Vault ownership of DMT if needed.

Run relayer locally, confirm /health and /status.

Configure GitHub Secrets: RELAYER_URL, RELAYER_HMAC_SECRET.



---

You are now running Omega‑Prime Relayer for DMT + Vault.
Deployer key never leaves your server. GitHub just triggers the gene. ♾️

