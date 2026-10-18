import { Router } from "express";
import { MessMenu, DRY_SABZI_POOL, DAL_POOL, SABZI_POOL, SUNDAY_SPECIALS } from "../models/MessMenu.js";
import { requireAdmin } from "../middleware/auth.js";
import { toJSON } from "../db.js";

const router = Router();

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const SLOT_KEYS = [
  "breakfast",
  "lunchDal",
  "lunchDrySabji",
  "lunchSabji",
  "dinnerSabji",
  "dinnerDrySabji"
];

/** Normalise a dish slot coming from the admin form. */
function cleanSlot(v) {
  if (!v) return undefined;
  if (typeof v === "string") {
    const name = v.trim();
    return name ? { name, price: 0, available: true } : undefined;
  }
  const name = String(v.name || "").trim();
  if (!name) return undefined;
  return {
    name,
    price: Number(v.price) || 0,
    available: v.available !== false
  };
}

function pick(doc) {
  if (!doc) return null;
  const out = toJSON(doc);
  delete out.day;
  delete out.date;
  return { ...out, source: doc.type };
}

/* ---------------- public ---------------- */

/** Today's resolved menu: daily override first, weekly template as fallback. */
router.get("/today", async (req, res) => {
  const today = new Date();
  const dateStr = iso(today);
  const dow = today.getDay();

  const daily = await MessMenu.findOne({ type: "daily", date: dateStr }).lean();
  const weekly = await MessMenu.findOne({ type: "weekly", day: dow }).lean();
  const source = daily ? daily : weekly;

  if (!source) {
    return res.json({
      date: dateStr,
      dayName: today.toLocaleDateString("en-IN", { weekday: "long" }),
      menu: null,
      source: "none"
    });
  }

  res.set("Cache-Control", "no-cache");
  res.json({
    date: dateStr,
    dayName: today.toLocaleDateString("en-IN", { weekday: "long" }),
    isOverride: !!daily,
    menu: pick(source),
    source: daily ? "daily" : "weekly"
  });
});

/** The whole week, Monday first. */
router.get("/week", async (req, res) => {
  const week = await MessMenu.find({ type: "weekly" }).sort({ day: 1 }).lean();

  // Monday first: weekday 1..6 then Sunday 0
  const order = [1, 2, 3, 4, 5, 6, 0];
  const byDay = new Map(week.map((w) => [w.day, w]));

  res.json(
    order
      .filter((d) => byDay.has(d))
      .map((d) => ({
        ...pick(byDay.get(d)),
        day: d,
        label: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d]
      }))
  );
});

/** Option lists so the admin pickers and the website share one source. */
router.get("/options", (req, res) => {
  res.json({
    drySabzi: DRY_SABZI_POOL,
    dal: DAL_POOL,
    sabzi: SABZI_POOL,
    sundaySpecials: SUNDAY_SPECIALS
  });
});

/* ---------------- admin ---------------- */

router.get("/admin/week", requireAdmin, async (req, res) => {
  const week = await MessMenu.find({ type: "weekly" }).sort({ day: 1 });
  res.json(week.map(toJSON));
});

/** Replace the whole week in one call. */
router.put("/admin/week", requireAdmin, async (req, res) => {
  const days = Array.isArray(req.body?.days) ? req.body.days : null;
  if (!days) return res.status(400).json({ error: "Send an array called days" });

  const ops = days.map((d) => {
    const set = {
      note: d.note || "",
      closed: !!d.closed,
      rice: d.rice !== false,
      roti: d.roti !== false,
      ghee: d.ghee !== false,
      salad: !!d.salad,
      breakfastClosed: !!d.breakfastClosed,
      dinnerClosed: !!d.dinnerClosed,
      priceBreakfast: Number(d.priceBreakfast) || 0,
      priceLunch: Number(d.priceLunch) || 0,
      priceDinner: Number(d.priceDinner) || 0,
      updatedBy: req.admin.email
    };
    SLOT_KEYS.forEach((k) => {
      if (d[k] !== undefined) set[k] = cleanSlot(d[k]) ?? null;
    });
    return {
      updateOne: {
        filter: { type: "weekly", day: Number(d.day) },
        update: { $set: set },
        upsert: true
      }
    };
  });

  try {
    await MessMenu.bulkWrite(ops, { ordered: false });
    const week = await MessMenu.find({ type: "weekly" }).sort({ day: 1 });
    res.json(week.map(toJSON));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** Today is an override of the weekly template. */
router.put("/admin/today", requireAdmin, async (req, res) => {
  const body = req.body || {};
  const dow = new Date().getDay();
  const dateStr = iso(new Date());

  const template = await MessMenu.findOne({ type: "weekly", day: dow }).lean();
  if (!template) return res.status(404).json({ error: "Weekly template is missing. Run the seed." });

  const set = {
    updatedBy: req.admin.email,
    note: body.note ?? "",
    closed: !!body.closed,
    rice: body.rice !== undefined ? !!body.rice : template.rice,
    roti: body.roti !== undefined ? !!body.roti : template.roti,
    ghee: body.ghee !== undefined ? !!body.ghee : template.ghee,
    salad: !!body.salad,
    breakfastClosed: body.breakfastClosed !== undefined ? !!body.breakfastClosed : !!template.breakfastClosed,
    dinnerClosed: body.dinnerClosed !== undefined ? !!body.dinnerClosed : !!template.dinnerClosed,
    priceBreakfast: Number(body.priceBreakfast ?? template.priceBreakfast) || 0,
    priceLunch: Number(body.priceLunch ?? template.priceLunch) || 0,
    priceDinner: Number(body.priceDinner ?? template.priceDinner) || 0
  };

  SLOT_KEYS.forEach((k) => {
    const incoming = body[k] !== undefined ? body[k] : template[k];
    set[k] = cleanSlot(incoming) ?? null;
  });

  const doc = await MessMenu.findOneAndUpdate(
    { type: "daily", date: dateStr },
    { $set: set },
    { new: true, upsert: true, runValidators: true }
  );

  res.json(pick(doc));
});

/** Drop today's override so the weekly template takes over again. */
router.delete("/admin/today", requireAdmin, async (req, res) => {
  const r = await MessMenu.findOneAndDelete({ type: "daily", date: iso(new Date()) });
  res.json({ ok: true, removed: !!r });
});

export default router;