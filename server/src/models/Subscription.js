import mongoose from "mongoose";

/**
 * A monthly mess membership.
 *
 * The customer books a slot at one of the messes, pays a monthly amount, and can
 * then come in daily for that meal. Lunch, dinner, or both.
 */
const SubscriptionSchema = new mongoose.Schema(
  {
    ref: { type: String, unique: true, index: true },

    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },

    mess: { type: String, enum: ["divya-kitchen", "digital-bharat"], required: true },
    /* which meals the membership covers, e.g. ["breakfast","lunch"] */
    meals: { type: [String], default: ["lunch"] },

    startDate: { type: Date },
    mealsPerWeek: { type: Number, default: 7 },        // 7 = everyday
    monthlyAmount: { type: Number, default: 0 },       // price agreed with the customer

    status: {
      type: String,
      enum: ["pending", "active", "paused", "cancelled", "expired"],
      default: "pending",
      index: true
    },
    paidThisMonth: { type: Boolean, default: false },
    paidMonths: { type: Number, default: 0 },
    lastPaidAt: { type: Date },

    notes: { type: String, default: "" },
    internalNote: { type: String, default: "" },

    source: { type: String, default: "web" },
    history: [
      { at: { type: Date, default: Date.now }, status: String, by: String }
    ]
  },
  { timestamps: true }
);

SubscriptionSchema.index({ createdAt: -1, status: 1 });
SubscriptionSchema.index({ phone: 1 });

SubscriptionSchema.pre("save", function (next) {
  if (this.isNew) {
    const d = new Date();
    const stamp =
      String(d.getFullYear()).slice(2) +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
    this.ref = `MS-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    this.history.push({ status: "pending", by: "customer" });
  }
  next();
});

SubscriptionSchema.virtual("planLabel").get(function () {
  const order = ["breakfast", "lunch", "dinner"];
  const labels = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
  return (this.meals || [])
    .slice()
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((m) => labels[m] || m)
    .join(" + ") || "No meals";
});

SubscriptionSchema.set("toJSON", { virtuals: true });

export const Subscription = mongoose.model("Subscription", SubscriptionSchema);