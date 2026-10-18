import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import { connectDB } from "./db.js";
import authRoutes from "./routes/auth.js";
import menuRoutes from "./routes/menu.js";
import orderRoutes from "./routes/orders.js";
import enquiryRoutes from "./routes/enquiry.js";
import settingsRoutes from "./routes/settings.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import messMenuRoutes from "./routes/messmenu.js";

dotenv.config({ path: process.env.ENV_FILE || ".env" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const WEB_DIST = path.join(ROOT, "web", "dist");
const ADMIN_DIST = path.join(ROOT, "admin", "dist");

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

/* ---------------- API ---------------- */

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "divya-catering", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/mess-menu", messMenuRoutes);

app.use("/api", (req, res) => res.status(404).json({ error: "No such endpoint" }));

/* ---------------- admin panel (built React app) ---------------- */

if (fs.existsSync(ADMIN_DIST)) {
  app.use("/admin", express.static(ADMIN_DIST));
  app.get("/admin/*", (req, res) => res.sendFile(path.join(ADMIN_DIST, "index.html")));
} else {
  app.get("/admin", (req, res) =>
    res
      .status(200)
      .type("html")
      .send(
        `<!doctype html><meta charset="utf-8"><title>Admin not built</title>
         <body style="font:16px system-ui;padding:3rem;max-width:40rem;margin:auto;line-height:1.6">
         <h1>Admin panel not built yet</h1>
         <p>The API is running. To build the admin panel:</p>
         <pre style="background:#f4f1ec;padding:1rem;border-radius:8px">cd admin
npm install
npm run build</pre>
         <p>Or use <code>npm run dev</code> in that folder for hot reload on port 5173.</p>
         <p>The public website is unaffected and still works at <a href="/">/</a>.</p>
         </body>`
      )
  );
}

/* ---------------- public website (React build) ---------------- */

function missingBuild(app, dir, label, cmd) {
  app.get("/", (req, res) =>
    res
      .status(200)
      .type("html")
      .send(
        `<!doctype html><meta charset="utf-8"><title>${label} not built</title>
         <body style="font:16px system-ui;padding:3rem;max-width:40rem;margin:auto;line-height:1.6">
         <h1>${label} is not built yet</h1>
         <p>The API is running. Build the front end to see the site:</p>
         <pre style="background:#f4f1ec;padding:1rem;border-radius:8px">cd ${label === "Admin panel" ? "admin" : "web"}
npm install
npm run build</pre>
         <p>For hot reload in development use <code>npm run dev</code> instead and it runs on
         ${label === "Admin panel" ? "5173" : "5174"}.</p>
         <p>API health check: <a href="/api/health">/api/health</a></p>
         </body>`
      )
  );
}

if (fs.existsSync(WEB_DIST)) {
  app.use(
    express.static(WEB_DIST, {
      index: false,
      setHeaders(res, filePath) {
        // Hashed assets can be cached hard; index.html must not be.
        if (/\.[0-9a-f]{8,}\./.test(path.basename(filePath))) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader("Cache-Control", "no-cache");
        }
      }
    })
  );
  // SPA fallback: every other GET renders the React router
  app.get(/^\/(?!api|admin).*/, (req, res) => res.sendFile(path.join(WEB_DIST, "index.html")));
} else {
  missingBuild(app, WEB_DIST, "Website");
}

app.use((req, res) => {
  if (req.method !== "GET") return res.status(404).json({ error: "Not found" });
  if (fs.existsSync(WEB_DIST)) return res.sendFile(path.join(WEB_DIST, "index.html"));
  res.status(404).send("Not found");
});

/* ---------------- errors ---------------- */

app.use((err, req, res, next) => {
  console.error("unhandled:", err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Something went wrong on our side" });
});

/* ---------------- boot ---------------- */

async function start() {
  console.log("\n  Divya Catering");
  try {
    await connectDB();
  } catch (err) {
    console.error("\n  Could not connect to MongoDB:", err.message);
    console.error("  Check MONGO_URI in server/.env. Is mongod running?\n");
    process.exit(1);
  }

  const hasSettings = await import("./models/Setting.js").then((m) =>
    m.Setting.exists({ key: "site" })
  );
  if (!hasSettings) {
    console.log("  seed      no data found - run `npm run seed`\n");
  }

  app.listen(PORT, () => {
    console.log(`  api       http://localhost:${PORT}/api`);
    console.log(`  website   http://localhost:${PORT}/`);
    console.log(`  admin     http://localhost:${PORT}/admin  (or :5173 in dev)\n`);
  });
}

start();

export default app;
