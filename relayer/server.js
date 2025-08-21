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
