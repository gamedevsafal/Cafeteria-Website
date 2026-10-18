import { Router } from "express";
import rateLimit from "express-rate-limit";
import { Order, STATUSES } from "../models/Order.js";
import { MenuItem } from "../models/MenuItem.js";
import { MessMenu } from "../models/MessMenu.js";
import { Setting } from "../models/Setting.js";
import { requireAdmin } from "../middleware/auth.js";
import { toJSON, isValidId } from "../db.js";

const router = Router();

const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many orders from this device. Please call us instead." }
});

const MESS_KEYS = ["divya-kitchen", "digital-bharat"];
const MEALS = ["breakfast", "lunch", "dinner"];
const EVENT_TYPES = ["marriage", "ring ceremony", "birthday", "corporate", "other"];

/* ---------------- helpers ---------------- */

const toMins = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "").trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

/** Recompute totals from the database, never from what the client sent. */
async function priceItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Your tray is empty" };
  }
  if (items.length > 40) {
    return { error: "Too many different items in one order" };
  }

  const ids = [...new Set(items.map((i) => i.menuId).filter(Boolean))];
  const found = await MenuItem.find({ _id: { $in: ids } });
  const byId = new Map(found.map((m) => [String(m._id), m]));

  const priced = [];
  for (const it of items) {
    const menu = byId.get(String(it.menuId));
    if (!menu) return { error: "One of the items is no longer on the menu" };
    if (!menu.available) return { error: `"${menu.name}" just sold out` };

    const qty = Math.floor(Number(it.qty));
    if (!Number.isFinite(qty) || qty < 1) return { error: "Invalid quantity" };

    priced.push({
      menuId: menu._id,
      name: menu.name,
      price: menu.price,
      qty,
      note: String(it.note || "").slice(0, 300)
    });
  }

  const subtotal = priced.reduce((n, l) => n + l.price * l.qty, 0);
  return { priced, subtotal: Math.round(subtotal * 100) / 100 };
}

/* ---------------- customer: place a thali order ----------------
   The mess is not a-la-carte. A customer orders a MEAL for today -
   lunch or dinner - and the kitchen cooks one thali per head. The price
   and the dish list are read from the resolved MessMenu, never from the
   client, so nobody can send a made-up amount.                          */

const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Today's thali, daily override first, weekly template otherwise. */
async function resolveToday() {
  const now = new Date();
  const daily = await MessMenu.findOne({ type: "daily", date: isoDate(now) }).lean();
  if (daily) return daily;
  return MessMenu.findOne({ type: "weekly", day: now.getDay() }).lean();
}

const MEAL_LABEL = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

/** Which meals can still be ordered right now. */
function mealAvailability(settings, now, menu) {
  const mins = now.getHours() * 60 + now.getMinutes();
  const out = {};

  ["breakfast", "lunch", "dinner"].forEach((meal) => {
    const w = (settings.mealWindows || {})[meal] || {};
    const orderOpens = toMins(w.orderOpens);
    const orderCutoff = toMins(w.orderCutoff);
    const servesFrom = toMins(w.servesFrom);
    const servesTill = toMins(w.servesTill);

    // The kitchen may have closed this meal for the day, e.g. Sunday dinner.
    const closedByDay = !!(menu && menu[`${meal}Closed`]);

    const windowOpen =
      orderOpens !== null && orderCutoff !== null && mins >= orderOpens && mins < orderCutoff;

    out[meal] = {
      closedByDay,
      orderWindowOpen: windowOpen,
      orderable: windowOpen && !closedByDay,
      orderOpens: w.orderOpens || "",
      orderCutoff: w.orderCutoff || "",
      servesFrom: w.servesFrom || "",
      servesTill: w.servesTill || ""
    };
  });
  return out;
}

/** Turn one meal of today's plan into a readable line. */
function mealLine(menu, meal) {
  const parts = [];
  if (meal === "breakfast") {
    if (menu.breakfast?.name) parts.push(menu.breakfast.name);
  } else {
    if (menu.lunchSabji?.name && meal === "lunch") parts.push(menu.lunchSabji.name);
    if (meal === "lunch" && menu.lunchDal?.name) parts.push(menu.lunchDal.name);
    if (meal === "lunch" && menu.lunchDrySabji?.name) parts.push(menu.lunchDrySabji.name);
    if (meal === "dinner" && menu.dinnerSabji?.name) parts.push(menu.dinnerSabji.name);
    if (meal === "dinner" && menu.dinnerDrySabji?.name) parts.push(menu.dinnerDrySabji.name);
    if (menu.roti !== false) parts.push(menu.ghee !== false ? "Roti with ghee" : "Roti");
    if (menu.rice !== false) parts.push("Rice");
  }
  return parts.join(", ");
}

router.get("/meals", async (req, res) => {
  const settings = await Setting.findOne({ key: "site" });
  const menu = await resolveToday();
  const now = new Date();
  const availability = mealAvailability(settings, now, menu);

  res.set("Cache-Control", "no-cache");
  res.json({
    date: isoDate(now),
    dayName: now.toLocaleDateString("en-IN", { weekday: "long" }),
    closed: !menu || !!menu.closed,
    meals: ["breakfast", "lunch", "dinner"].map((meal) => {
      const a = availability[meal];
      return {
        meal,
        label: MEAL_LABEL[meal],
        price: menu ? (meal === "breakfast" ? menu.priceBreakfast : meal === "lunch" ? menu.priceLunch : menu.priceDinner) : 0,
        dishes: a.closedByDay ? "" : menu ? mealLine(menu, meal) : "",
        note: meal === "lunch" && menu?.note ? menu.note : "",
        ...a,
        closedReason: a.closedByDay
          ? `${MEAL_LABEL[meal]} is not served on ${now.toLocaleDateString("en-IN", { weekday: "long" })}s`
          : a.orderable
            ? ""
            : `Ordering is open ${a.orderOpens} to ${a.orderCutoff}`
      };
    })
  });
});

router.post("/", orderLimiter, async (req, res) => {
  try {
    const b = req.body || {};
    const settings = await Setting.findOne({ key: "site" });
    if (!settings) return res.status(503).json({ error: "Site is not configured yet" });

    const name = String(b.name || "").trim();
    const phone = String(b.phone || "").trim();
    const type = b.type === "catering" ? "catering" : "mess";

    if (name.length < 2) return res.status(400).json({ error: "Please give a name for the order" });
    if (phone.replace(/\D/g, "").length < 10) {
      return res.status(400).json({ error: "Please give a 10 digit mobile number" });
    }

    const people = Math.max(1, Math.floor(Number(b.people) || 1));

    /* Pickup or delivery. Declared out here because the save below needs them
       even when the mess-only checks are skipped. */
    let fulfilment = b.fulfilment === "delivery" ? "delivery" : "pickup";
    let deliveryFee = 0;
    let deliveryAddress = "";
    let priced = [];
    let subtotal = 0;

    /* ---- mess order: one meal of today's thali ---- */
    if (type === "mess") {
      const meal = MEALS.includes(b.meal) ? b.meal : null;
      if (!meal) return res.status(400).json({ error: "Choose breakfast, lunch or dinner" });

      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const menuEarly = await resolveToday();
      const avail = mealAvailability(settings, now, menuEarly);

      if (avail[meal].closedByDay) {
        return res.status(400).json({
          error: `${MEAL_LABEL[meal]} is not served on ${now.toLocaleDateString("en-IN", { weekday: "long" })}s. Please call us for the other meal.`
        });
      }
      if (!avail[meal].orderable) {
        return res.status(400).json({
          error: `${MEAL_LABEL[meal]} ordering is open ${avail[meal].orderOpens} to ${avail[meal].orderCutoff}. Please call the mess outside those hours.`
        });
      }

      const menu = await resolveToday();
      if (!menu) return res.status(400).json({ error: "Today's menu has not been published yet. Please call us." });
      if (menu.closed) return res.status(400).json({ error: "We are closed today. Please call us." });
      if (menu[`${meal}Closed`]) {
        return res.status(400).json({
          error: `${MEAL_LABEL[meal]} is not served on ${now.toLocaleDateString("en-IN", { weekday: "long" })}s. Please order the other meal or call us.`
        });
      }

      const unitPrice =
        meal === "breakfast" ? menu.priceBreakfast : meal === "lunch" ? menu.priceLunch : menu.priceDinner;
      if (!(unitPrice > 0)) {
        return res.status(400).json({ error: `The ${MEAL_LABEL[meal].toLowerCase()} price is not set yet. Please call us.` });
      }

      const rawQty = b.qty !== undefined ? b.qty : b.people;
      const qty = Math.floor(Number(rawQty));

      if (!Number.isFinite(qty) || qty < 1) {
        return res.status(400).json({ error: "How many thalis? Enter at least 1." });
      }
      if (qty !== Number(rawQty) && Number.isFinite(Number(rawQty))) {
        return res.status(400).json({ error: "Enter a whole number of thalis." });
      }

      const max = settings.maxMealQtyPerOrder || 20;
      if (qty > max) {
        return res.status(400).json({ error: `Online orders are limited to ${max} thalis. For more, call us.` });
      }

      const dishes = mealLine(menu, meal);
      if (!dishes) {
        return res.status(400).json({ error: `${MEAL_LABEL[meal]} has not been set for today. Please call us.` });
      }

      priced = [{
        menuId: menu._id,
        name: `${MEAL_LABEL[meal]} thali - ${dishes}`,
        price: unitPrice,
        qty
      }];
      subtotal = Math.round(unitPrice * qty * 100) / 100;
      b.meal = meal;
    } else {
      const r = await priceItems(b.items);
      if (r.error) return res.status(400).json({ error: r.error });
      priced = r.priced;
      subtotal = r.subtotal;
    }

    /* Pickup or delivery */
    if (type === "mess") {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();

      if (fulfilment === "delivery") {
        if (!settings.deliveryEnabled) {
          return res.status(400).json({ error: "Online delivery is not available. Please order for pickup or call us." });
        }
        deliveryAddress = String(b.deliveryAddress || "").trim();
        if (deliveryAddress.length < 12) {
          return res.status(400).json({ error: "Please give the full delivery address in Gwalior" });
        }
        if (subtotal < (settings.deliveryMinOrder || 0)) {
          return res.status(400).json({
            error: `Home delivery starts at ${settings.deliveryMinOrder} in order value. Add a thali or order for pickup.`
          });
        }

        const dOpen = toMins(settings.deliveryOpens);
        const dClose = toMins(settings.deliveryCloses);
        if (dOpen !== null && dClose !== null && (mins < dOpen || mins >= dClose)) {
          return res.status(400).json({
            error: `Home delivery runs ${settings.deliveryOpens} to ${settings.deliveryCloses}. Please call us outside those hours.`
          });
        }

        deliveryFee = subtotal >= (settings.freeDeliveryOver || Infinity) ? 0 : settings.deliveryFee || 0;
      }

      const slot = String(b.slot || "").trim();
      const sm = toMins(slot);
      if (sm === null) {
        return res.status(400).json({ error: `Choose a ${fulfilment === "delivery" ? "delivery" : "pickup"} time` });
      }

      const lead = Number(settings.messOrderLeadMinutes) || 0;
      if (sm < mins + lead) {
        return res.status(400).json({ error: `Please allow ${lead} minutes notice. Choose ${fmtSlot(mins + lead)}.` });
      }

      const w = settings.mealWindows?.[b.meal] || {};
      const servesFrom = toMins(w.servesFrom);
      const servesTill = toMins(w.servesTill);
      if (servesFrom !== null && sm < servesFrom) {
        return res.status(400).json({ error: `${MEAL_LABEL[b.meal]} is served from ${w.servesFrom}. Choose a later time or order for delivery.` });
      }
      if (servesTill !== null && sm > servesTill) {
        return res.status(400).json({ error: `${MEAL_LABEL[b.meal]} is served until ${w.servesTill}` });
      }
    }

    /* ---- catering rules ---- */
    if (type === "catering") {
      if (people < settings.minCateringGuests || people > settings.maxCateringGuests) {
        return res.status(400).json({
          error: `We cater for ${settings.minCateringGuests} to ${settings.maxCateringGuests} guests. Call us for smaller groups.`
        });
      }

      const eventType = EVENT_TYPES.includes(b.eventType) ? b.eventType : "other";
      const eventDate = b.eventDate ? new Date(b.eventDate) : null;

      if (eventDate && Number.isNaN(eventDate.getTime())) {
        return res.status(400).json({ error: "That event date is not valid" });
      }
      if (!eventDate) {
        return res.status(400).json({ error: "Choose an event date" });
      }

      const leadMs = (Number(settings.cateringLeadDays) || 3) * 24 * 60 * 60 * 1000;
      if (eventDate.getTime() < Date.now() + leadMs) {
        return res.status(400).json({
          error: `We need at least ${settings.cateringLeadDays} days notice for catering. Please call us for anything sooner.`
        });
      }

      const address = String(b.address || "").trim();
      if (address.length < 10) {
        return res.status(400).json({ error: "We need the delivery or venue address" });
      }

      const serviceFee =
        settings.serviceFeePercent > 0
          ? Math.round(subtotal * (settings.serviceFeePercent / 100) * 100) / 100
          : settings.messServiceFee || 0;

      const order = await Order.create({
        type,
        mess: MESS_KEYS.includes(b.mess) ? b.mess : "divya-kitchen",
        customer: {
          name,
          phone,
          email: String(b.email || "").trim(),
          address
        },
        people,
        eventType,
        eventDate,
        notes: String(b.notes || "").slice(0, 1500),
        items: priced,
        subtotal,
        serviceFee,
        total: Math.round((subtotal + serviceFee) * 100) / 100,
        payment: { method: settings.paymentLive ? "stripe" : "pickup" },
        source: "web"
      });

      // Catering is never auto-confirmed: a human has to check kitchen capacity.
      return res.status(201).json({
        order: toJSON(order),
        message:
          `Request received, ${name.split(" ")[0]}. Reference ${order.ref}. ` +
          `We will call ${phone} within one working day to confirm your date and menu.`
      });
    }

    /* ---- mess order: service fee + save ---- */
    const serviceFee = settings.messServiceFee || 0;
    const order = await Order.create({
      type,
      mess: MESS_KEYS.includes(b.mess) ? b.mess : "divya-kitchen",
      customer: { name, phone, email: String(b.email || "").trim() },
      people,
      fulfilment,
      deliveryAddress,
      deliveryFee,
      slot: b.slot,
      notes: String(b.notes || "").slice(0, 1500),
      items: priced,
      subtotal,
      serviceFee,
      total: Math.round((subtotal + serviceFee + deliveryFee) * 100) / 100,
      payment: { method: "pickup" },
      source: "web"
    });

    res.status(201).json({
      order: toJSON(order),
      message:
        `Order received, ${name.split(" ")[0]}. ${order.ref}. ` +
        (fulfilment === "delivery"
          ? `We will deliver inside Gwalior and confirm by SMS shortly.`
          : `We will confirm by SMS shortly.`)
    });
  } catch (err) {
    console.error("order create failed:", err.message);
    res.status(500).json({ error: "Could not save your order. Please try again or call us." });
  }
});

function fmtSlot(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** Read-only lookup so a customer can check their order with a phone number. */
router.get("/track/:ref", async (req, res) => {
  const order = await Order.findOne({ ref: String(req.params.ref).toUpperCase() }).lean();
  if (!order) return res.status(404).json({ error: "No order with that reference" });
  res.json({
    ref: order.ref,
    status: order.status,
    slot: order.slot,
    total: order.total,
    type: order.type,
    items: order.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
    createdAt: order.createdAt
  });
});

/* ---------------- admin ---------------- */

router.get("/admin", requireAdmin, async (req, res) => {
  const q = {};
  if (req.query.status && req.query.status !== "all") q.status = String(req.query.status);
  if (req.query.type && req.query.type !== "all") q.type = String(req.query.type);
  if (req.query.mess && req.query.mess !== "all") q.mess = String(req.query.mess);
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    q.$or = [{ ref: rx }, { "customer.name": rx }, { "customer.phone": rx }];
  }

  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const orders = await Order.find(q).sort({ createdAt: -1 }).limit(limit);
  res.json({ orders: orders.map(toJSON), count: orders.length });
});

router.get("/admin/stats", requireAdmin, async (req, res) => {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [byStatus, today, revenueAgg, cateringOpen, cateringBooked] = await Promise.all([
    Order.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    Order.countDocuments({ createdAt: { $gte: dayStart } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: dayStart }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]),
    Order.countDocuments({ type: "catering", status: { $in: ["pending", "confirmed"] } }),
    Order.aggregate([
      { $match: { type: "catering", status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.name", qty: { $sum: "$items.qty" } } },
      { $sort: { qty: -1 } },
      { $limit: 8 }
    ])
  ]);

  const statusMap = Object.fromEntries(byStatus.map((r) => [r._id, r.n]));

  res.json({
    byStatus: STATUSES.reduce((acc, s) => ({ ...acc, [s]: statusMap[s] || 0 }), {}),
    today,
    todayRevenue: revenueAgg[0]?.total || 0,
    cateringOpen,
    topCateringItems: cateringBooked.map((r) => ({ name: r._id, qty: r.qty }))
  });
});

router.get("/admin/export.csv", requireAdmin, async (req, res) => {
  const q = {};
  if (req.query.status && req.query.status !== "all") q.status = String(req.query.status);
  if (req.query.date) {
    const d = new Date(req.query.date);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    q.createdAt = { $gte: d, $lt: end };
  }

  const orders = await Order.find(q).sort({ slot: 1, createdAt: 1 }).lean();

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
    ["Ref", "Type", "Mess", "Status", "Customer", "Phone", "People", "Slot/Date", "Items", "Subtotal", "Fee", "Total", "Payment", "Notes"].join(",")
  ];

  orders.forEach((o) => {
    const items = o.items.map((i) => `${i.qty} x ${i.name}`).join(" | ");
    const when = o.type === "catering" ? new Date(o.eventDate).toISOString().slice(0, 10) : o.slot;
    rows.push(
      [
        o.ref, o.type, o.mess, o.status, o.customer.name, o.customer.phone,
        o.people, when, items, o.subtotal, o.serviceFee, o.total, o.payment.status, o.notes
      ].map(esc).join(",")
    );
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="divya-orders-${Date.now()}.csv"`);
  res.send(rows.join("\n"));
});

export default router;
router.get("/admin/:id", requireAdmin, async (req, res) => {


  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad id" });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(toJSON(order));
});

router.patch("/admin/:id/status", requireAdmin, async (req, res) => {



  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad id" });
  const status = String(req.body?.status || "");
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: "Unknown status" });
  }

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.status = status;
  if (req.body?.statusNote !== undefined) order.statusNote = String(req.body.statusNote).slice(0, 500);
  order.history.push({ status, by: req.admin.email });
  await order.save();

  res.json(toJSON(order));
});

router.patch("/admin/:id", requireAdmin, async (req, res) => {



  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad id" });
  const allowed = ["notes", "statusNote", "slot", "people"];
  const update = {};
  allowed.forEach((k) => {
    if (req.body?.[k] !== undefined) update[k] = req.body[k];
  });
  if (!Object.keys(update).length) return res.status(400).json({ error: "Nothing to update" });

  const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(toJSON(order));
});

/** Stripe hook-in point: mark an order paid from the checkout webhook. */
router.post("/admin/:id/paid", requireAdmin, async (req, res) => {


  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad id" });
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      payment: {
        status: "paid",
        method: req.body?.method || "stripe",
        stripeSessionId: req.body?.sessionId || "",
        paidAt: new Date()
      }
    },
    { new: true }
  );
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(toJSON(order));
});

router.delete("/admin/:id", requireAdmin, async (req, res) => {



  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Bad id" });
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({ ok: true, id: req.params.id });
});

/** CSV of the current order book, for the kitchen printer. */
