import { Router } from "express";
import type { ReliabilityClient } from "@xecurecode-sdks/reliability-sdk";

export function errorRoutes(client: ReliabilityClient) {
  const router = Router();

  router.get("/runtime", (_req, _res) => {
    const val = (globalThis as any).undefinedVar.nested;
    _res.json({ ok: true, val });
  });

  router.get("/type-error", () => {
    const num: any = 42;
    num.toUpperCase();
  });

  router.get("/reference-error", () => {
    (globalThis as any).nonExistentFunction();
  });

  router.get("/database", () => {
    throw new Error("Database connection timeout after 30s — pool exhausted");
  });

  router.get("/network", () => {
    const err: any = new Error("Upstream service returned 502 Bad Gateway");
    err.code = "ECONNREFUSED";
    throw err;
  });

  router.get("/validation", (_req, res) => {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: [
        { field: "email", message: "Invalid email format" },
        { field: "age", message: "Must be a positive integer" },
      ],
    });
    client.capture(new Error("Validation failed — invalid email, age out of range"), _req);
  });

  router.get("/auth", (_req, res) => {
    res.status(401).json({ success: false, message: "Invalid or expired API key" });
    client.capture(new Error("Authentication failed — invalid API key"), _req);
  });

  router.get("/forbidden", (_req, res) => {
    res.status(403).json({ success: false, message: "Insufficient permissions" });
    client.capture(new Error("Authorization denied — missing role: admin"), _req);
  });

  router.get("/crash", (_req, res) => {
    res.json({ ok: true, message: "Crash scheduled" });
    process.nextTick(() => {
      throw new Error("Uncaught exception from async context");
    });
  });

  router.get("/rejection", (_req, res) => {
    res.json({ ok: true, message: "Rejection scheduled" });
    Promise.reject(new Error("Unhandled promise rejection — database query failed"));
  });

  router.get("/memory", (_req, res) => {
    const leak: any[] = [];
    for (let i = 0; i < 1_000_000; i++) {
      leak.push(new Array(100).fill("leak"));
    }
    client.capture(new Error("High memory pressure detected — heap usage > 90%"));
    res.json({ ok: true, message: "Memory pressure simulated", allocated: leak.length });
  });

  router.get("/slow", async (_req, res) => {
    await new Promise((resolve) => setTimeout(resolve, 25_000));
    res.json({ ok: true, message: "Slow request completed" });
  });

  router.get("/timeout", () => {
    throw new Error("Request timed out after 30s — upstream unresponsive");
  });

  router.get("/panic", (_req, res) => {
    res.json({ ok: true, message: "Panic triggered" });
    client.capture(new Error("panic: runtime error: invalid memory address or nil pointer dereference"));
    process.exit(1);
  });

  return router;
}
