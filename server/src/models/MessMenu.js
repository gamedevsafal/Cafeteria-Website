import mongoose from "mongoose";

/**
 * The mess does not serve an a-la-carte list. Every day is a thali:
 *
 *   Breakfast  one item
 *   Lunch      one dal + one dry sabzi + roti (with ghee) + rice
 *   Dinner     one sabji + one dry sabzi + roti (with ghee) + rice
 *   Sunday     lunch is a special feast, dinner is light
 *
 * Two kinds of document:
 *   type "weekly" - the repeating 7 day template, keyed by day 0-6
 *   type "daily"  - an override for one specific date (ISO yyyy-mm-dd)
 *
 * The website resolves today as: daily override if one exists, otherwise
 * the weekly template for that weekday.
 */

const DishSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, default: 0 },
    available: { type: Boolean, default: true }
  },
  { _id: false }
);

const MessMenuSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["weekly", "daily"], required: true, index: true },
    day: { type: Number, min: 0, max: 6 },                 // weekly only, 0 = Sunday
    date: { type: String },                                // daily only, "2026-10-17"

    breakfast: { type: DishSchema, default: undefined },
    lunchDal: { type: DishSchema, default: undefined },
    lunchDrySabji: { type: DishSchema, default: undefined },
    lunchSabji: { type: DishSchema, default: undefined },  // Sunday special
    dinnerSabji: { type: DishSchema, default: undefined },
    dinnerDrySabji: { type: DishSchema, default: undefined },

    /* Sundays are closed for dinner; a day can also close breakfast. */
    breakfastClosed: { type: Boolean, default: false },
    dinnerClosed: { type: Boolean, default: false },

    rice: { type: Boolean, default: true },
    roti: { type: Boolean, default: true },
    ghee: { type: Boolean, default: true },
    salad: { type: Boolean, default: false },

    note: { type: String, default: "" },
    closed: { type: Boolean, default: false },

    /* per-meal thali price, in rupees */
    priceBreakfast: { type: Number, default: 0 },
    priceLunch: { type: Number, default: 0 },
    priceDinner: { type: Number, default: 0 },

    updatedBy: { type: String, default: "" }
  },
  { timestamps: true }
);

MessMenuSchema.index({ type: 1, day: 1 });
// Only daily rows carry a date, so only those must be unique.
// A plain unique index would make every weekly row collide on a blank date.
MessMenuSchema.index(
  { type: 1, date: 1 },
  { unique: true, partialFilterExpression: { type: "daily" } }
);

export const MessMenu = mongoose.model("MessMenu", MessMenuSchema);

/** Dry sabzi pool that rotates through the week. */
export const DRY_SABZI_POOL = [
  "Aloo Methi",
  "Bhindi",
  "Baigan Allu",
  "Patta Gobhi",
  "Mix Veg"
];

export const DAL_POOL = [
  "Arhar Dal",
  "Chana-Urad Dal",
  "Dal Mixture",
  "Masoor Dal",
  "Toor Dal",
  "Kadhi"
];

export const SABZI_POOL = [
  "Paneer ki Sabji",
  "Aloo Gobhi",
  "Aloo Soyabadi",
  "Dum Aloo",
  "Aloo Matar",
  "Aloo Tamatar",
  "Gatte ki Sabji",
  "Chole ki Sabji",
  "Kadhi Pakoda",
  "Mix Veg"
];

export const SUNDAY_SPECIALS = [
  { name: "Paneer ki Sabji", desc: "Roti & Sweet" },
  { name: "Chole ki Sabji", desc: "Puri, Raita & Kheer" },
  { name: "Rajma Chawal", desc: "Raita & Sweet" },
  { name: "Veg Biryani", desc: "Raita & Sweet" },
  { name: "Soya Chaap", desc: "Roti & Rice" }
];