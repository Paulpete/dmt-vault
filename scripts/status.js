const fs = require("fs");

(async () => {
  const files = fs.readdirSync(".").filter(f => f.startsWith("deploy-") && f.endsWith(".json"));
  if (files.length === 0) return console.log("No deployment records found.");
  const latest = files.sort().reverse()[0];
  const data = JSON.parse(fs.readFileSync(latest));
  console.log("Last Deployment:", data);
})();
