/**
 * One command to run the whole project in development.
 *
 *   node dev.js
 *
 * Starts:
 *   :4000  Express API + built front ends (if you already built them)
 *   :5174  public website, hot reload        (npm run dev --prefix web)
 *   :5173  admin panel, hot reload           (npm run dev --prefix admin)
 *
 * Pass --api-only to just run the API on :4000.
 * Pass --no-vite to skip the two dev servers and serve the built bundles.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const apiOnly = args.includes("--api-only");
const noVite = args.includes("--no-vite") || apiOnly;

const COLORS = { api: "\x1b[33m", web: "\x1b[36m", admin: "\x1b[35m", dim: "\x1b[90m", reset: "\x1b[0m" };

const children = [];
let shuttingDown = false;

function prefix(color, name, chunk) {
  const lines = chunk.toString().trimEnd().split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    console.log(`${COLORS[color]}${name.padEnd(6)}${COLORS.reset} ${COLORS.dim}|${COLORS.reset} ${line}`);
  }
}

function run(name, color, cmd, commandArgs, cwd) {
  const child = spawn(cmd, commandArgs, {
    cwd,
    shell: process.platform === "win32",
    env: process.env
  });
  child.stdout.on("data", (d) => prefix(color, name, d));
  child.stderr.on("data", (d) => prefix(color, name, d));
  child.on("exit", (code) => {
    if (!shuttingDown) {
      console.log(`${COLORS[color]}${name}${COLORS.reset} exited with code ${code}`);
      shutdown(code ?? 0);
    }
  });
  children.push(child);
  return child;
}

function portOpen(port) {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host: "127.0.0.1" });
    sock.setTimeout(600);
    sock.on("connect", () => (sock.destroy(), resolve(true)));
    sock.on("error", () => resolve(false));
    sock.on("timeout", () => (sock.destroy(), resolve(false)));
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${COLORS.dim}shutting down...${COLORS.reset}`);
  children.forEach((c) => {
    if (!c.killed) {
      try {
        if (process.platform === "win32") spawn("taskkill", ["/pid", String(c.pid), "/T", "/F"]);
        else c.kill("SIGTERM");
      } catch {}
    }
  });
  setTimeout(() => process.exit(code), 700);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
  console.log(`
  Divya Catering - development

  ${COLORS.dim}Starting the API and any installed front ends.${COLORS.reset}
`);

  /* ---- preflight ---- */
  if (!fs.existsSync(path.join(ROOT, "server", ".env"))) {
    console.log(`${COLORS.api}warn   ${COLORS.reset}server/.env is missing.`);
    console.log(`${COLORS.api}warn   ${COLORS.reset}copy server/.env.example to server/.env and fill it in.\n`);
  }

  for (const folder of ["server", "web", "admin"]) {
    if (fs.existsSync(path.join(ROOT, folder, "node_modules"))) continue;
    console.log(`${COLORS.dim}skip   ${folder} is not installed (no node_modules). Run: npm install --prefix ${folder}${COLORS.reset}`);
  }

  if (await portOpen(4000)) {
    console.log(`\n${COLORS.api}port 4000 is already in use. Stop the other process first.${COLORS.reset}\n`);
    process.exit(1);
  }

  /* ---- API ---- */
  run("api", "api", "node", ["src/index.js"], path.join(ROOT, "server"));

  if (noVite) {
    const webBuilt = fs.existsSync(path.join(ROOT, "web", "dist"));
    const adminBuilt = fs.existsSync(path.join(ROOT, "admin", "dist"));
    console.log(`
  ${COLORS.dim}Open${COLORS.reset}  http://localhost:4000${webBuilt ? "" : "   (website not built: npm run build --prefix web)"}`);
    if (adminBuilt) console.log(`  ${COLORS.dim}     ${COLORS.reset}http://localhost:4000/admin`);
    else console.log(`  ${COLORS.dim}     ${COLORS.reset}http://localhost:4000/admin   (not built: npm run build --prefix admin)`);
    console.log(`
  ${COLORS.dim}Use the dev servers for hot reload: node dev.js${COLORS.reset}\n`);
    return;
  }

  /* ---- dev servers ---- */
  if (fs.existsSync(path.join(ROOT, "web", "node_modules"))) {
    run("web", "web", "npm", ["run", "dev"], path.join(ROOT, "web"));
  }
  if (fs.existsSync(path.join(ROOT, "admin", "node_modules"))) {
    run("admin", "admin", "npm", ["run", "dev"], path.join(ROOT, "admin"));
  }

  console.log(`
  ${COLORS.web}website${COLORS.reset}  http://localhost:5174      ${COLORS.dim}hot reload${COLORS.reset}
  ${COLORS.admin}admin${COLORS.reset}    http://localhost:5173/admin  ${COLORS.dim}hot reload${COLORS.reset}
  ${COLORS.api}api${COLORS.reset}      http://localhost:4000/api

  ${COLORS.dim}Admin sign-in comes from ADMIN_EMAIL and ADMIN_PASSWORD in server/.env.${COLORS.reset}
  ${COLORS.dim}Ctrl+C stops everything.${COLORS.reset}
`);
}

main();