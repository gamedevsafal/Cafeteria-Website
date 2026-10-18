import { Router } from "express";
import rateLimit from "express-rate-limit";
import { Subscription } from "../models/Subscription.js";
import { Setting } from "../models/Setting.js";
import { requireAdmin } from "../middleware/auth.js";
import { toJSON, isValidId } from "../db.js";
import { MEAL_COMBOS, MEAL_IDS, comboKey, isValidCombo, comboLabel } from "../models/Plans.js";

const router = Router();

const MESSES = ["divya-kitchen", "digital-bharat"];
const MEALS = ["breakfast", "lunch", "dinner"];
const STATUSES = ["pending", "active", "paused", "cancelled", "expired"];

const subLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please call us and we will sort it out." }
});

const messName = (key) =>
  ({ "divya-kitchen": "Divya's Kitchen", "digital-bharat": "Digital Bharat" })[key] || key;

/* ---------------- customer: book a monthly slot ---------------- */

router.post("/", subLimiter, async (req, res) => {
  try {
    const b = req.body || {};
    const settings = await Setting.findOne({ key: "site" });

    if (!settings) return res.status(503).json({ error: "Site is not configured yet" });
    if (!settings.membershipsEnabled) {
      return res.status(400).json({ error: "Mess memberships are not open online. Please call us." });
    }

    const name = String(b.name || "").trim();
    const phone = String(b.phone || "").trim();

    if (name.length < 2) return res.status(400).json({ error: "Please give a name" });
    if (phone.replace(/\D/g, "").length < 10) {
      return res.status(400).json({ error: "Please give a 10 digit mobile number" });
    }
    if (!MESSES.includes(b.mess)) return res.status(400).json({ error: "Choose which mess you will visit" });

    const meals = MEALS.filter((m) => Array.isArray(b.meals) && b.meals.includes(m));
    if (!meals.length) {
      return res.status(400).json({ error: "Choose at least one meal for the monthly slot" });
    }
    if (!isValidCombo(meals)) {
      return res.status(400).json({ error: "That combination of meals is not available" });
    }

    /* one open subscription per phone number per mess */
    const existing = await Subscription.findOne({ phone, mess: b.mess, status: { $in: ["pending", "active"] } });
    if (existing) {
      return res.status(409).json({
        error: `There is already a ${existing.status} membership on this number for ${messName(existing.mess)}. Call us to change it.`,
        ref: existing.ref
      });
    }

    const startDate = b.startDate ? new Date(b.startDate) : null;
    if (startDate && Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ error: "That start date is not valid" });
    }

    const mess = (settings.messes || []).find((m) => m.key === b.mess);
    const key = comboKey(meals);
    const monthlyAmount = Number(b.monthlyAmount) || Number(mess?.monthlyPlans?.[key]) || 0;

    if (!monthlyAmount) {
      return res.status(400).json({
        error: `The ${comboLabel(meals).toLowerCase()} plan is not priced yet. Please call us.`
      });
    }

    const sub = await Subscription.create({
      name,
      phone,
      email: String(b.email || "").trim(),
      mess: b.mess,
      meals,
      combo: key,
      startDate: startDate || undefined,
      mealsPerWeek: Math.min(Math.max(parseInt(b.mealsPerWeek, 10) || 7, 1), 7),
      monthlyAmount,
      notes: String(b.notes || "").slice(0, 1000)
    });

    res.status(201).json({
      subscription: toJSON(sub),
      message:
        `Thanks ${name.split(" ")[0]}. Reference ${sub.ref}. ` +
        `We will confirm your ${comboLabel(meals).toLowerCase()} slot at ${messName(sub.mess)} ` +
        `and share the payment details. Monthly amount Rs ${monthlyAmount}.`
    });
  } catch (err) {
    console.error("subscription failed:", err.message);
    res.status(500).json({ error: "Could not save your request. Please try again or call us." });
  }
});

/** The combinations a member can take, with their price for a given mess. */
router.get("/combos", async (req, res) => {
  const settings = await Setting.findOne({ key: "site" });
  const messes = settings?.messes || [];
  res.json({
    meals: MEAL_IDS,
    combos: MEAL_COMBOS.map((c) => ({
      ...c,
      prices: Object.fromEntries(messes.map((m) => [m.key, Number(m.monthlyPlans?.[c.key]) || 0]))
    }))
  });
});

/* ---------------- admin ---------------- */

router.get("/admin", requireAdmin, async (req, res) => {
  const q = {};
  if (req.query.status && req.query.status !== "all") q.status = String(req.query.status);
  if (req.query.mess && req.query.mess !== "all") q.mess = String(req.query.mess);
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    q.$or = [{ ref: rx }, { name: rx }, { phone: rx }];
  }

  const subs = await Subscription.find(q).sort({ createdAt: -1 }).limit(300);
  res.json({ subscriptions: subs.map(toJSON), count: subs.length });
});

router.get("/admin/stats", requireAdmin, async (req, res) => {
  const byStatus = await Subscription.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
  const map = Object.fromEntries(byStatus.map((r) => [r._id, r.n]));

  const monthly = await Subscription.aggregate([
    { $match: { status: "active" } },
    { $group: { _id: null, total: { $sum: "$monthlyAmount" } } }
  ]);

  const byMess = await Subscription.aggregate([
    { $match: { status: { $in: ["active", "pending"] } } },
    { $group: { _id: "$mess", n: { $sum: 1 } } }
  ]);

  res.json({
    byStatus: STATUSES.reduce((a, s) => ({ ...a, [s]: map[s] || 0 }), {}),
    activeCount: map.active || 0,
    monthlyRecurring: monthly[0]?.total || 0,
    unpaidThisMonth: map.active || 0,
    byMess: Object.fromEntries(byMess.map((r) => [r._id, r.n]))
  });
});

router.patch("/admin/:id", requireAdmin, async (req, res) => {



  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad id" });
  const update = {};
  const numeric = ["monthlyAmount", "mealsPerWeek", "paidMonths"];

  ["status", "internalNote", "meals", "combo", "mess", "startDate", "paidThisMonth", "lastPaidAt", ...numeric].forEach((k) => {
    if (req.body?.[k] !== undefined) update[k] = req.body[k];
  });
  numeric.forEach((k) => {
    if (update[k] !== undefined) update[k] = Number(update[k]);
  });
  if (update.status && !STATUSES.includes(update.status)) {
    return res.status(400).json({ error: "Unknown status" });
  }
  if (update.mess && !MESSES.includes(update.mess)) {
    return res.status(400).json({ error: "Unknown mess" });
  }
  if (update.meals) {
    if (!Array.isArray(update.meals)) return res.status(400).json({ error: "Meals must be a list" });
    update.meals = MEALS.filter((m) => update.meals.includes(m));
    if (!update.meals.length) return res.status(400).json({ error: "Pick at least one meal" });
    update.combo = comboKey(update.meals);
  }

  const sub = await Subscription.findById(req.params.id);
  if (!sub) return res.status(404).json({ error: "Membership not found" });

  Object.assign(sub, update);

  /* flipping to active records who did it */
  if (update.status && sub.history[sub.history.length - 1]?.status !== update.status) {
    sub.history.push({ status: update.status, by: req.admin.email });
  }
  /* marking paid bumps the counter */
  if (req.body?.markPaid) {
    sub.paidThisMonth = true;
    sub.lastPaidAt = new Date();
    sub.paidMonths = (sub.paidMonths || 0) + 1;
  }

  await sub.save();
  res.json(toJSON(sub));
});

router.delete("/admin/:id", requireAdmin, async (req, res) => {



  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad id" });
  const sub = await Subscription.findByIdAndDelete(req.params.id);
  if (!sub) return res.status(404).json({ error: "Membership not found" });
  res.json({ ok: true, id: req.params.id });
});

router.get("/admin/export.csv", requireAdmin, async (req, res) => {
  const q = {};
  if (req.query.status && req.query.status !== "all") q.status = String(req.query.status);
  const subs = await Subscription.find(q).sort({ createdAt: -1 }).lean();

  /* A leading = + - @ makes Excel treat the cell as a formula. */
  const csvSafe = (v) => {
    const str = v === null || v === undefined ? "" : String(v);
    return /^[=+\-@\\t\\r]/.test(str) ? "'" + str : str;
  };

  const esc = (v) => {
    const str = csvSafe(v);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const rows = [
    ["Ref", "Name", "Phone", "Mess", "Meals", "Meals/week", "Monthly", "Status", "Paid this month", "Start", "Paid months", "Notes"].join(",")
  ];
  subs.forEach((s) =>
    rows.push(
      [
        s.ref, s.name, s.phone, messName(s.mess), comboLabel(s.meals), s.mealsPerWeek, s.monthlyAmount,
        s.status, s.paidThisMonth ? "yes" : "no",
        s.startDate ? new Date(s.startDate).toISOString().slice(0, 10) : "",
        s.paidMonths || 0, s.notes
      ].map(esc).join(",")
    )
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="divya-memberships-${Date.now()}.csv"`);
  res.send(rows.join("\n"));
});

export default router;