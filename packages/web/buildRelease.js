#!/usr/bin/env node
/**
 * Build the web app and upload `dist/` to a server via scp + sshpass.
 *
 * Required env:
 *   DEPLOY_HOST   e.g. 192.168.1.19
 *   DEPLOY_USER   e.g. root
 *   DEPLOY_PATH   e.g. /root/wwww/html
 *   DEPLOY_PASSWORD  SSH password (do not commit; pass in shell only)
 *
 * Optional:
 *   SSHPASS  if set, sshpass uses it (same as DEPLOY_PASSWORD)
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const distDir = path.join(__dirname, "dist");

const host = '192.168.1.19';
const user = "root";
const remotePath = '/root/wwww/html';
const password = process.env.UBUNTU_PASSWORD;

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!host || !remotePath) {
  fail(
    "Missing DEPLOY_HOST or DEPLOY_PATH. Example:\n" +
      "  DEPLOY_HOST=192.168.1.19 DEPLOY_USER=root DEPLOY_PATH=/root/wwww/html DEPLOY_PASSWORD='***' node buildRelease.js"
  );
}
if (!password) {
  fail(
    "Missing DEPLOY_PASSWORD (or SSHPASS). Do not put secrets in this file; export in your shell only."
  );
}

try {
  execSync("which sshpass", { stdio: "pipe" });
} catch {
  fail(
    "sshpass is required for password-based scp. Install: brew install sshpass"
  );
}

const sshBase = [
  "sshpass",
  "-e",
  "ssh",
  "-o",
  "StrictHostKeyChecking=no",
  "-o",
  "PreferredAuthentications=password",
  "-o",
  "PubkeyAuthentication=no",
  `${user}@${host}`,
].join(" ");

const scpBase = [
  "sshpass",
  "-e",
  "scp",
  "-o",
  "StrictHostKeyChecking=no",
  "-o",
  "PreferredAuthentications=password",
  "-o",
  "PubkeyAuthentication=no",
  "-r",
  `${distDir}/.`,
  `${user}@${host}:${remotePath}/`,
].join(" ");

console.log("Building @video-manager/web...");
execSync("npm run build:web", { cwd: repoRoot, stdio: "inherit" });

console.log(`Ensuring remote directory: ${remotePath}`);
execSync(`${sshBase} 'mkdir -p "${remotePath}"'`, {
  stdio: "inherit",
  env: { ...process.env, SSHPASS: password },
});

console.log(`Uploading dist/ -> ${user}@${host}:${remotePath}/`);
execSync(scpBase, {
  stdio: "inherit",
  env: { ...process.env, SSHPASS: password },
});

console.log("Done.");
