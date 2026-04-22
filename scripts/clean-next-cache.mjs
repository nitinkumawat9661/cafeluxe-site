import fs from "node:fs";
import path from "node:path";

const nextCacheDir = path.join(process.cwd(), ".next");

try {
  fs.rmSync(nextCacheDir, { recursive: true, force: true });
} catch (error) {
  console.warn("Unable to clear .next cache before dev startup:", error);
}
