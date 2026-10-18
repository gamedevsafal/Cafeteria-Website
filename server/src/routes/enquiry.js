import { Router } from "express";
import rateLimit from "express-rate-limit";
import { Enquiry } from "../models/Enquiry.js";
import { requireAdmin } from "../middleware/auth.js";
import { toJSON, isValidId } from "../db.js";

const router = Router();

const enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages from this device. Please call us instead." }
});

router.post("/", enquiryLimiter, async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim();
  const message = String(b.message || "").trim();

  if (name.length < 2) return res.status(400).json({ error: "Please give your name" });
  if (message.length < 5) return res.status(400).json({ error: "Please write a short message" });

  try {
    const enquiry = await Enquiry.create({
      name,
      phone: String(b.phone || "").trim(),
      email: String(b.email || "").trim(),
      topic: String(b.topic || "General question").slice(0, 80),
      message: message.slice(0, 3000),
      people: b.people ? Math.max(0, Math.floor(Number(b.people)) || null) : null,
      eventDate: b.eventDate || null
    });

    res.status(201).json({
      enquiry: toJSON(enquiry),
      message: `Thanks ${name.split(" ")[0]}, your message is with us. We reply within one working day.`
    });
  } catch (err) {
    console.error("enquiry failed:", err.message);
    res.status(500).json({ error: "Could not save your message. Please try again." });
  }
});

router.get("/admin", requireAdmin, async (req, res) => {
  const q = {};
  if (req.query.handled === "false") q.handled = false;
  if (req.query.handled === "true") q.handled = true;

  const enquiries = await Enquiry.find(q).sort({ createdAt: -1 }).limit(200);
  res.json({ enquiries: enquiries.map(toJSON), count: enquiries.length });
});

router.patch("/admin/:id", requireAdmin, async (req, res) => {



  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad id" });
  const update = {};
  if (req.body?.handled !== undefined) update.handled = !!req.body.handled;
  if (req.body?.note !== undefined) update.note = String(req.body.note).slice(0, 1000);

  const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!enquiry) return res.status(404).json({ error: "Enquiry not found" });
  res.json(toJSON(enquiry));
});

router.delete("/admin/:id", requireAdmin, async (req, res) => {



  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad id" });
  const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
  if (!enquiry) return res.status(404).json({ error: "Enquiry not found" });
  res.json({ ok: true });
});

export default router;
