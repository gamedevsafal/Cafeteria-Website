import mongoose from "mongoose";

/**
 * Single-row collection holding everything editable that is not a dish:
 * business details, the two mess locations, opening hours, tagline.
 * The public site reads this on every load, so changes in the admin
 * panel appear on the website immediately without a rebuild.
 */
const MessSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },   // divya-kitchen | digital-bharat
    name: { type: String, required: true },
    address: { type: String, default: "" },
    city: { type: String, default: "Gwalior" },
    phone: { type: String, default: "" },
    mapUrl: { type: String, default: "" },
    /* Price of each monthly meal combination, keyed by MEAL_COMBOS in models/Plans.js */
    monthlyPlans: {
      breakfast: { type: Number, default: 0 },
      lunch: { type: Number, default: 0 },
      dinner: { type: Number, default: 0 },
      "breakfast+lunch": { type: Number, default: 0 },
      "breakfast+dinner": { type: Number, default: 0 },
      "lunch+dinner": { type: Number, default: 0 },
      "breakfast+lunch+dinner": { type: Number, default: 0 }
    },
    opens: { type: String, default: "08:30" },
    closes: { type: String, default: "10:30" },
    lunchOpens: { type: String, default: "12:00" },
    lunchCloses: { type: String, default: "14:00" },
    dinnerOpens: { type: String, default: "19:00" },
    dinnerCloses: { type: String, default: "21:00" },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 100 }
  },
  { _id: false }
);

const SettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "site", unique: true },

    businessName: { type: String, default: "Divya Catering" },
    tagline: { type: String, default: "Ghar jaisa swad, har din nayi variety" },
    about: { type: String, default: "" },

    phone: { type: String, default: "" },
    phone2: { type: String, default: "" },
    festivalNote: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    email: { type: String, default: "" },
    logo: { type: String, default: "" },

    /* Ordering a meal happens BEFORE it is served, so the two windows are
       separate: you order lunch between 08:30 and 10:30 for a meal served
       from 11:00. */
mealWindows: {
  breakfast: {
    orderOpens: { type: String, default: "07:00" },
    orderCutoff: { type: String, default: "08:00" },
    servesFrom: { type: String, default: "08:30" },
    servesTill: { type: String, default: "10:30" }
  },
  lunch: {
    orderOpens: { type: String, default: "09:00" },
    orderCutoff: { type: String, default: "11:00" },
    servesFrom: { type: String, default: "12:00" },
    servesTill: { type: String, default: "14:00" }
  },
  dinner: {
    orderOpens: { type: String, default: "16:00" },
    orderCutoff: { type: String, default: "18:00" },
    servesFrom: { type: String, default: "19:00" },
    servesTill: { type: String, default: "21:00" }
  }
},

minCateringGuests: { type: Number, default: 25 },
    maxCateringGuests: { type: Number, default: 2000 },
    serviceFeePercent: { type: Number, default: 0 },
    messServiceFee: { type: Number, default: 0 },

    /* Which hours apply to mess (daily takeaway) orders */
    messOrderOpens: { type: String, default: "07:00" },
    messOrderCloses: { type: String, default: "22:00" },
    messOrderLeadMinutes: { type: Number, default: 60 },
    maxMealQtyPerOrder: { type: Number, default: 20 },

    /* Home delivery inside Gwalior */
    deliveryEnabled: { type: Boolean, default: true },
    deliveryFee: { type: Number, default: 30 },
    freeDeliveryOver: { type: Number, default: 300 },
    deliveryMinOrder: { type: Number, default: 150 },
    deliveryOpens: { type: String, default: "11:00" },
    deliveryCloses: { type: String, default: "21:00" },
    deliveryAreas: { type: String, default: "Gwalior city" },

    /* Mess membership (monthly slot booking) */
    membershipsEnabled: { type: Boolean, default: true },

    /* Lead time for catering bookings, in days */
    cateringLeadDays: { type: Number, default: 3 },

    social: {
      instagram: { type: String, default: "" },
      facebook: { type: String, default: "" },
      youtube: { type: String, default: "" }
    },

    paymentLive: { type: Boolean, default: false },   // flip on when Stripe is wired

    messes: { type: [MessSchema], default: [] }
  },
  { timestamps: true, minimize: false }
);

export const Setting = mongoose.model("Setting", SettingSchema);
