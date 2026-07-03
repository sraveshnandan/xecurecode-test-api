import "dotenv/config";
import express from "express";
import { join } from "node:path";
import { ReliabilityClient } from "@xecurecode-sdks/reliability-sdk";
import { errorRoutes } from "./routes/errors";
import { rollbackRoutes } from "./routes/rollback";
import { rcaRoutes } from "./routes/rca";

const app = express();
const PORT = process.env.PORT || 4001;

const client = new ReliabilityClient({
  apiKey: process.env.XECURECODE_API_KEY!,
  service_id: process.env.XECURECODE_SERVICE_ID!,
  endpoint: process.env.XECURECODE_ENDPOINT || "https://backend.xecurecode.in/api/v1/ingest",
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  version: process.env.VERSION || "1.0.0",
  release: process.env.RELEASE || "v1.0.0",
  commitHash: process.env.COMMIT_SHA || process.env.RENDER_GIT_COMMIT || process.env.RAILWAY_GIT_COMMIT_SHA,
  branch: process.env.BRANCH || process.env.RENDER_GIT_BRANCH || process.env.RAILWAY_GIT_BRANCH || "main",
  buildId: process.env.BUILD_ID || process.env.RENDER_DEPLOYMENT_ID,
  deploymentId: process.env.DEPLOYMENT_ID || process.env.RENDER_SERVICE_ID || process.env.RAILWAY_DEPLOYMENT_ID,
});

app.use(express.json());
app.use(express.static(join(import.meta.dirname, "public")));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

app.use("/errors", errorRoutes(client));
app.use("/rollback", rollbackRoutes(client));
app.use("/rca", rcaRoutes(client));

app.use(client.middleware());

app.listen(PORT, () => {
  console.log(`Test API running on port ${PORT}`);
});
