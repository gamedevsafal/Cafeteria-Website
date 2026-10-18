import { Router } from "express";
import { MenuItem } from "../models/MenuItem.js";
import { Setting } from "../models/Setting.js";
import { requireAdmin } from "../middleware/auth.js";
import { toJSON } from "../db.js";

const router = Router();

/* ---------------- public ---------------- */

/** Today's menu. ?mess=divya-kitchen  ?scope=mess  ?available=true */
router.get("/", async (req, res) => {
  const q = { available: true };

  if (req.query.scope) q.scope = String(req.query.scope);
  if (req.query.mess) q.mess = { $in: [String(req.query.mess), "all"] };
  if (req.query.cat && req.query.cat !== "all") q.cat = String(req.query.cat).toLowerCase();

  const items = await MenuItem.find(q).sort({ order: 1, name: 1 }).lean();
  res.json(items.map((i) => ({ ...i, id: String(i._id), _id: undefined })));
});

/** Distinct categories present in the menu, for building filter chips. */
router.get("/categories", async (req, res) => {
  const cats = await MenuItem.distinct("cat", { available: true });
  res.json(cats.sort());
});

/** Catering packages only - used on the catering section. */
router.get("/packages", async (req, res) => {
  const items = await MenuItem.find({ scope: "catering", available: true })
    .sort({ price: 1 })
    .lean();
  res.json(items.map((i) => ({ ...i, id: String(i._id), _id: undefined })));
});

/* ---------------- admin ---------------- */

router.get("/admin/all", requireAdmin, async (req, res) => {
  const q = {};
  if (req.query.mess) q.mess = String(req.query.mess);
  if (req.query.scope) q.scope = String(req.query.scope);

  const items = await MenuItem.find(q).sort({ mess: 1, order: 1, name: 1 });
  res.json(items.map(toJSON));
});

router.post("/admin", requireAdmin, async (req, res) => {
  const body = { ...req.body };

  if (body._id) {
    const updated = await MenuItem.findByIdAndUpdate(body._id, body, {
      new: true,
      runValidators: true
    });
    if (!updated) return res.status(404).json({ error: "Item not found" });
    return res.json(toJSON(updated));
  }

  try {
    const created = await MenuItem.create(body);
    res.status(201).json(toJSON(created));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** Bulk replace the entire menu for one mess. Powers "update today's menu". */
router.put("/admin/mess/:mess", requireAdmin, async (req, res) => {
  const mess = String(req.params.mess);
  if (!["divya-kitchen", "digital-bharat"].includes(mess)) {
    return res.status(400).json({ error: "Unknown mess" });
  }

  const items = Array.isArray(req.body?.items) ? req.body.items : null;
  if (!items) return res.status(400).json({ error: "Send an array called items" });

  const ops = items.map((it, i) => ({
    updateOne: {
      filter: it._id ? { _id: it._id } : { key: it.key || `${mess}-${i}`, mess },
      update: {
        $set: {
          name: it.name,
          price: Number(it.price),
          desc: it.desc || "",
          cat: it.cat || "mains",
          scope: it.scope || "mess",
          mess,
          tags: Array.isArray(it.tags) ? it.tags : [],
          note: it.note || "",
          serves: it.serves || "",
          unit: it.unit || "plate",
          available: it.available !== false,
          featured: !!it.featured,
          order: Number(it.order ?? i * 10)
        }
      },
      upsert: !it._id
    }
  }));

  try {
    const result = await MenuItem.bulkWrite(ops, { ordered: false });
    const items2 = await MenuItem.find({ mess }).sort({ order: 1, name: 1 });
    res.json({
      upserted: result.upsertedCount || 0,
      updated: result.modifiedCount || 0,
      items: items2.map(toJSON)
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/admin/:id/available", requireAdmin, async (req, res) => {
  const updated = await MenuItem.findByIdAndUpdate(
    req.params.id,
    { available: !!req.body?.available },
    { new: true }
  );
  if (!updated) return res.status(404).json({ error: "Item not found" });
  res.json(toJSON(updated));
});

router.delete("/admin/:id", requireAdmin, async (req, res) => {
  const deleted = await MenuItem.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Item not found" });
  res.json({ ok: true, id: req.params.id });
});

/** Toggle today's availability for every item of one mess in one call. */
router.post("/admin/mess/:mess/toggle", requireAdmin, async (req, res) => {
  const mess = String(req.params.mess);
  const available = !!req.body?.available;
  const result = await MenuItem.updateMany({ mess, scope: "mess" }, { available });
  res.json({ mess, available, changed: result.modifiedCount });
});

export default router;
