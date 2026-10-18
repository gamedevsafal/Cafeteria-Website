import mongoose from "mongoose";

/**
 * A single dish, or a catering package.
 *
 * scope:
 *   "mess"     - a daily menu item served at one of the messes
 *   "catering" - a fixed package (per head or per event)
 *   "drink"    - beverages
 *
 * mess: which kitchen it belongs to. This is the field the admin panel
 * filters on, so each mess can carry its own menu and be edited
 * independently on the same day.
 */
const MenuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    desc: { type: String, default: "", trim: true },
    scope: { type: String, enum: ["mess", "catering", "drink"], default: "mess" },
    mess: {
      type: String,
      enum: ["divya-kitchen", "digital-bharat", "all"],
      default: "divya-kitchen",
      index: true
    },
    cat: { type: String, default: "mains", trim: true, lowercase: true },
    tags: { type: [String], default: [] },          // v, jain-friendly, spicy, egg, etc
    note: { type: String, default: "" },           // "2 plates left", "Lunch only"
    serves: { type: String, default: "" },         // packages: "10-15 people"
    unit: { type: String, default: "plate" },      // plate | head | event
    available: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    order: { type: Number, default: 100 },
    image: { type: String, default: "" }
  },
  { timestamps: true }
);

MenuItemSchema.index({ scope: 1, mess: 1, cat: 1, order: 1 });

export const MenuItem = mongoose.model("MenuItem", MenuItemSchema);
