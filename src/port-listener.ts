import express from "express";
import { EnvConfig } from "./env-config";

export function setupPortListener(envConfig: EnvConfig) {
  const app = express();
  app.listen(envConfig.PORT, () => {
    console.log(`\n[INFO] server running on port ${envConfig.PORT}.\n\n`);
  });
}
