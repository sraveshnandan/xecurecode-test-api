import { Router } from "express";
import type { ReliabilityClient } from "@xecurecode-sdks/reliability-sdk";

let deployments: Array<{ version: string; healthy: boolean; failures: number; rolledBack?: boolean }> = [];
let currentVersion = 1;
let failRate = 0;
let consecutiveFails = 0;

export function rollbackRoutes(client: ReliabilityClient) {
  const router = Router();

  router.post("/deploy", (_req, res) => {
    currentVersion++;
    failRate = 0.4;
    consecutiveFails = 0;

    const dep = { version: `1.0.${currentVersion}`, healthy: true, failures: 0 };
    deployments.push(dep);

    client.capture(new Error(`New deployment v1.0.${currentVersion} — monitoring`));

    res.json({
      ok: true,
      version: dep.version,
      message: "New deployment simulated — 40% failure rate injected",
    });
  });

  router.get("/simulate", (_req, res) => {
    failRate = Math.random();

    if (Math.random() < failRate) {
      consecutiveFails++;
      client.capture(new Error(`Request failure #${consecutiveFails} — simulating bad deployment`));

      if (consecutiveFails >= 3) {
        const current = deployments[deployments.length - 1];
        if (current) {
          current.healthy = false;
          current.failures = consecutiveFails;
        }
        res.status(500).json({
          ok: false,
          consecutiveFails,
          message: "Auto-rollback triggered — too many failures",
        });
        return;
      }

      res.status(500).json({ ok: false, consecutiveFails, message: "Simulated failure" });
      return;
    }

    consecutiveFails = Math.max(0, consecutiveFails - 1);
    res.json({ ok: true, consecutiveFails, message: "Request succeeded" });
  });

  router.get("/status", (_req, res) => {
    res.json({
      version: `1.0.${currentVersion}`,
      deployments,
      failRate,
      consecutiveFails,
    });
  });

  router.post("/manual", (_req, res) => {
    const current = deployments[deployments.length - 1];
    if (current) {
      current.rolledBack = true;
      current.healthy = false;
    }

    client.capture(new Error(`Manual rollback triggered for v1.0.${currentVersion} — reverting to previous stable`));

    failRate = 0;
    consecutiveFails = 0;

    res.json({
      ok: true,
      version: `1.0.${currentVersion}`,
      rolledBack: true,
      message: "Manual rollback executed — deployment marked as rolled back on dashboard",
    });
  });

  return router;
}
