import { Router } from "express";
import { Setting } from "../models/Setting.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

const ALLOWED_KEYS = [
  "businessName", "tagline", "about", "phone", "phone2", "festivalNote", "whatsapp", "email", "logo",
  "minCateringGuests", "maxCateringGuests", "serviceFeePercent", "messServiceFee",
  "messOrderOpens", "messOrderCloses", "messOrderLeadMinutes", "maxMealQtyPerOrder",
  "deliveryEnabled", "deliveryFee", "freeDeliveryOver", "deliveryMinOrder",
  "deliveryOpens", "deliveryCloses", "deliveryAreas", "membershipsEnabled",
  "cateringLeadDays", "social", "paymentLive", "messes", "mealWindows"
];

/** Public: everything the website needs to render itself. Cached briefly. */
router.get("/", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const s = await Setting.findOne({ key: "site" }).lean();
  if (!s) return res.status(503).json({ error: "Site is not configured yet" });
  const { _id, __v, key, createdAt, updatedAt, ...rest } = s;
  res.json(rest);
});

/** Admin: full document including the id it needs for saving. */
router.get("/admin", requireAdmin, async (req, res) => {
  const s = await Setting.findOne({ key: "site" });
  if (!s) return res.status(404).json({ error: "Not configured yet, run npm run seed" });
  res.json(s);
});

router.put("/admin", requireAdmin, async (req, res) => {
  const update = {};
  ALLOWED_KEYS.forEach((k) => {
    if (req.body?.[k] !== undefined) update[k] = req.body[k];
  });
  if (!Object.keys(update).length) return res.status(400).json({ error: "Nothing to update" });

  // Numbers must stay numbers even if the form sent strings.
  [
    "minCateringGuests", "maxCateringGuests", "serviceFeePercent",
    "messServiceFee", "messOrderLeadMinutes", "maxMealQtyPerOrder", "cateringLeadDays",
    "deliveryFee", "freeDeliveryOver", "deliveryMinOrder"
  ].forEach((k) => {
    if (update[k] !== undefined) update[k] = Number(update[k]);
  });

  if (update.minCateringGuests !== undefined && update.maxCateringGuests !== undefined) {
    if (update.minCateringGuests > update.maxCateringGuests) {
      return res.status(400).json({ error: "Minimum guests cannot be more than maximum" });
    }
  }

  try {
    const s = await Setting.findOneAndUpdate(
      { key: "site" },
      { $set: update },
      { new: true, runValidators: true }
    );
    res.json(s);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
