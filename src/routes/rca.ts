import { Router } from "express";
import type { ReliabilityClient } from "@xecurecode-sdks/reliability-sdk";

let deployCount = 0;
let failureCount = 0;
let currentRelease = "v1.0.0";
let currentCommit = "abc123";

export function rcaRoutes(client: ReliabilityClient) {
  const router = Router();

  router.post("/deploy", (_req, res) => {
    deployCount++;
    failureCount = 0;
    currentRelease = `v1.0.${deployCount}`;
    currentCommit = `sha-${Date.now().toString(36)}`;
    const version = `1.0.${deployCount}`;

    client.capture(new Error(`Deployment ${version} (${currentRelease}) started — monitoring for regressions`));

    res.json({
      ok: true,
      version,
      release: currentRelease,
      commitHash: currentCommit,
      message: "New deploy — errors will be tagged with this version for RCA correlation",
    });
  });

  router.post("/trigger-failures", (_req, res) => {
    const count = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < count; i++) {
      const errType = i % 3;
      switch (errType) {
        case 0:
          client.capture(new Error(`RCA-test: database query timeout (attempt ${i + 1}) — slow index scan`), _req);
          break;
        case 1:
          client.capture(new Error(`RCA-test: upstream API returned 503 (attempt ${i + 1}) — circuit breaker open`), _req);
          break;
        case 2:
          client.capture(new Error(`RCA-test: memory allocation failed (attempt ${i + 1}) — heap limit reached`), _req);
          break;
      }
    }

    failureCount += count;

    res.json({
      ok: true,
      failuresTriggered: count,
      totalFailures: failureCount,
      release: currentRelease,
      message: `${count} errors sent — check RCA on dashboard`,
    });
  });

  router.get("/failures", (_req, res) => {
    res.json({
      release: currentRelease,
      commitHash: currentCommit,
      totalFailures: failureCount,
      deployCount,
    });
  });

  return router;
}
