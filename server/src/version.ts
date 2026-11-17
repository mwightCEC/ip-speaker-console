import { readFileSync } from "node:fs";

// package.json sits one level above both src/ (development) and dist/ (production).
const packageJsonUrl = new URL("../package.json", import.meta.url);
const packageJson = JSON.parse(readFileSync(packageJsonUrl, "utf8")) as { version: string };

/** The console's software version, as declared in server/package.json. */
export const APP_VERSION = packageJson.version;
