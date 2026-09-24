#!/usr/bin/env node
import { run } from "../src/app.js";

run().catch((err) => {
  console.error("ChatDiWa crashed:", err);
  process.exit(1);
});
