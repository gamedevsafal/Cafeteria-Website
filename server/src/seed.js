/**
 * Seeds Divya Catering into MongoDB.
 *
 *   npm run seed          fill in anything missing, leave existing data alone
 *   npm run seed:fresh    wipe everything and start clean
 *
 * The weekly mess plan and the festival packages are transcribed from the
 * Divya Catering boards. Thali prices are PLACEHOLDER.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB, disconnectDB } from "./db.js";
import { Setting } from "./models/Setting.js";
import { MenuItem } from "./models/MenuItem.js";
import { Order } from "./models/Order.js";
import { Enquiry } from "./models/Enquiry.js";
import { Subscription } from "./models/Subscription.js";
import { MessMenu } from "./models/MessMenu.js";
import { defaultMonthlyPlans } from "./models/Plans.js";
import { Admin } from "./models/Admin.js";

dotenv.config({ path: process.env.ENV_FILE || ".env" });

const FRESH = process.argv.includes("--drop");

/* ==================================================================
   WEEKLY MESS PLAN  - from the Divya's Kitchen weekly board
   Lunch is always  : one dal + one dry sabji + roti (with ghee) + rice
   Dinner is always : one sabji + one dry sabji + roti (with ghee) + rice
   ================================================================== */
const weeklyPlan = [
  {
    day: 0, label: "Sunday",
    breakfast: "Maggi (Cozy Cravings)",
    lunchSabji: "Sunday Special Feast",
    lunchDrySabji: "Fresh salad",
    // closed for dinner on Sundays
    dinnerClosed: true,
    salad: true,
    note: "Sunday lunch is a special feast, rotating through the five options below."
  },
  {
    day: 1, label: "Monday",
    breakfast: "Poha",
    lunchDal: "Arhar Dal", lunchDrySabji: "Aloo Methi",
    dinnerSabji: "Gatte ki Sabji", dinnerDrySabji: "Mix Veg"
  },
  {
    day: 2, label: "Tuesday",
    breakfast: "Aloo Paratha with Curd/Butter",
    lunchDal: "Chana-Urad Dal", lunchDrySabji: "Bhindi",
    dinnerSabji: "Aloo Gobhi", dinnerDrySabji: "Patta Gobhi"
  },
  {
    day: 3, label: "Wednesday",
    breakfast: "Puri Sabji",
    lunchDal: "Dal Mixture", lunchDrySabji: "Baigan Allu",
    dinnerSabji: "Aloo Soyabadi", dinnerDrySabji: "Mix Veg"
  },
  {
    day: 4, label: "Thursday",
    breakfast: "Sandwich / Bread Butter Jam",
    lunchDal: "Kadhi Pakoda", lunchDrySabji: "Aloo Methi",
    dinnerSabji: "Dum Aloo", dinnerDrySabji: "Bhindi"
  },
  {
    day: 5, label: "Friday",
    breakfast: "Upma",
    lunchDal: "Arhar Dal", lunchDrySabji: "Patta Gobhi",
    dinnerSabji: "Aloo Matar", dinnerDrySabji: "Mix Veg"
  },
  {
    day: 6, label: "Saturday",
    breakfast: "Sada Paratha with Curd/Butter",
    lunchDal: "Masoor Dal", lunchDrySabji: "Baigan Allu",
    dinnerSabji: "Aloo Tamatar", dinnerDrySabji: "Aloo Methi"
  }
];

const sundayRotation = [
  "Paneer ki Sabji - Roti & Sweet",
  "Chole ki Sabji - Puri, Raita & Kheer",
  "Rajma Chawal - Raita & Sweet",
  "Veg Biryani - Raita & Sweet",
  "Soya Chaap - Roti & Rice"
];

/* Thali prices. PLACEHOLDER - change in the admin panel. */
const PRICES = { breakfast: 40, lunch: 70, dinner: 70 };

/* ==================================================================
   FESTIVAL CATERING PACKAGES - from the Divya Catering festival board
   ================================================================== */
const festivalPackages = [
  {
    name: "Festival Tea Party", price: 3999, serves: "25 log", unit: "event",
    desc: "2 flavours of samosa, chandan, chai, napkin and disposables included.",
    note: "Rs 3,999 - 5,499", featured: true, order: 10
  },
  {
    name: "Pooja & Bhog Package", price: 5999, serves: "30 log", unit: "event",
    desc: "Poori, wheat ka sakhi, suji ka halwa, peda and dhila. Ghar ki puja, katha aur bhog ke liye.",
    note: "Rs 5,999 - 7,499", featured: true, order: 20
  },
  {
    name: "Family Celebration Lunch", price: 9999, serves: "50 log", unit: "event",
    desc: "1 paneer dish, 1 meethi sabzi, dal, roti, chawal aur salad. Ghar prabhar, janmadin, bhai dooj aur family celebrations.",
    note: "Rs 9,999 - 12,999", order: 30
  },
  {
    name: "Festival Special Feast", price: 17999, serves: "100 log", unit: "event",
    desc: "2 sabziyan, dal, puri ya roti, pulao, raita aur meethai. Samajik diwali milan aur bade family programmes ke liye.",
    note: "Rs 17,999 - 24,999", featured: true, order: 40
  },
  {
    name: "Festival Snack Boxes", price: 199, serves: "per box, minimum 25", unit: "box",
    desc: "Mati aur namkeen, shakarsha ya anya sukha maala, tyahi ke anusar packing.",
    note: "Rs 199 - 299 per box", order: 50
  }
];

const drySabziPool = ["Aloo Methi", "Bhindi", "Baigan Allu", "Patta Gobhi", "Mix Veg"];

async function seed() {
  console.log("\n  Seeding Divya Catering...\n");
  await connectDB();

  if (FRESH) {
    console.log("  --drop    clearing menu, orders, enquiries, memberships and meal plan");
    await Promise.all([
      MenuItem.deleteMany({}),
      Order.deleteMany({}),
      Enquiry.deleteMany({}),
      Subscription.deleteMany({}),
      MessMenu.deleteMany({})
    ]);
  }

  const phone = process.env.BUSINESS_PHONE || "+917909486563";
  const phone2 = process.env.BUSINESS_PHONE_2 || "+919669989044";

  /* ---------------- settings ---------------- */
  const settings = await Setting.findOneAndUpdate(
    { key: "site" },
    {
      $set: {
        businessName: "Divya Catering",
        tagline: "Ghar jaisa swad, har din nayi variety",
        about:
          "Divya Catering runs two messes in Gwalior. Both kitchens serve the same thali - " +
          "one dal, one sabji, roti with ghee and rice, freshly made every day - so the menu " +
          "you see is the menu you get at either one. We deliver inside Gwalior city, cater " +
          "festivals and family functions from 25 to 2000 guests, and take monthly mess memberships.",

        phone,
        phone2,
        whatsapp: process.env.BUSINESS_WHATSAPP || "7909486563",
        email: process.env.BUSINESS_EMAIL || "hello@divyacatering.in",
        logo: "",
        festivalNote:
          "Dashahara 20 Oct, Kanya Chauth 29 Oct, Diwali 8 Nov, Govardhan Puja, Bhai Dooj",

        mealWindows: {
          breakfast: { orderOpens: "07:00", orderCutoff: "08:00", servesFrom: "08:30", servesTill: "10:30" },
          lunch: { orderOpens: "09:00", orderCutoff: "11:00", servesFrom: "12:00", servesTill: "14:00" },
          dinner: { orderOpens: "16:00", orderCutoff: "18:00", servesFrom: "19:00", servesTill: "21:00" }
        },

        minCateringGuests: 25,
        maxCateringGuests: 2000,
        cateringLeadDays: 3,
        serviceFeePercent: 0,

        messServiceFee: 0,
        messOrderOpens: "07:00",
        messOrderCloses: "22:00",
        messOrderLeadMinutes: 60,
        maxMealQtyPerOrder: 20,

        deliveryEnabled: true,
        deliveryFee: 30,
        freeDeliveryOver: 300,
        deliveryMinOrder: 150,
        deliveryOpens: "11:00",
        deliveryCloses: "21:00",
        deliveryAreas: "Gwalior city",

        membershipsEnabled: true,
        paymentLive: false,
        social: { instagram: "", facebook: "", youtube: "" },

        messes: [
          {
            key: "divya-kitchen", name: "Divya's Kitchen Services",
            address: "19 Madhuban Colony, Thatipur", city: "Gwalior", phone,
            monthlyPlans: defaultMonthlyPlans(),
            opens: "08:30", closes: "10:30", lunchOpens: "12:00", lunchCloses: "14:00", dinnerOpens: "19:00", dinnerCloses: "21:00",
            active: true, order: 1
          },
          {
            key: "digital-bharat", name: "Digital Bharat Mess",
            address: "New Bank Colony", city: "Gwalior", phone,
            monthlyPlans: defaultMonthlyPlans(),
            opens: "08:30", closes: "10:30", lunchOpens: "12:00", lunchCloses: "14:00", dinnerOpens: "19:00", dinnerCloses: "21:00",
            active: true, order: 2
          }
        ]
      }
    },
    { new: true, upsert: true }
  );
  console.log(`  settings  ${settings.businessName} | ${settings.messes.length} messes`);
  console.log(`  contact   ${phone}  ${phone2}  whatsapp ${settings.whatsapp}`);

  /* ---------------- admin ---------------- */
  const email = (process.env.ADMIN_EMAIL || "admin@divyacatering.in").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  if (await Admin.findOne({ email })) {
    console.log(`  admin     ${email} (exists, password unchanged)`);
  } else {
    await Admin.create({
      email, name: "Divya Admin",
      passwordHash: await Admin.hash(password), role: "owner"
    });
    console.log(`  admin     ${email}  password: ${password}`);
    console.log("            ^ change this in your .env before going live");
  }

  /* ---------------- weekly mess plan ---------------- */
  // replaces the old unique index with the partial one
  await MessMenu.syncIndexes();

  await MessMenu.deleteMany({ type: "weekly" });
  await MessMenu.insertMany(
    weeklyPlan.map((d) => ({
      type: "weekly",
      day: d.day,
      breakfast: d.breakfast ? { name: d.breakfast } : null,
      lunchDal: d.lunchDal ? { name: d.lunchDal } : null,
      lunchDrySabji: d.lunchDrySabji ? { name: d.lunchDrySabji } : null,
      lunchSabji: d.lunchSabji ? { name: d.lunchSabji } : null,
      dinnerSabji: d.dinnerSabji ? { name: d.dinnerSabji } : null,
      dinnerDrySabji: d.dinnerDrySabji ? { name: d.dinnerDrySabji } : null,
      rice: d.rice !== false,
      roti: d.roti !== false,
      ghee: d.ghee !== false,
      salad: !!d.salad,
      breakfastClosed: !!d.breakfastClosed,
      dinnerClosed: !!d.dinnerClosed,
      note: d.note || "",
      priceBreakfast: PRICES.breakfast,
      priceLunch: PRICES.lunch,
      priceDinner: PRICES.dinner
    }))
  );
  console.log(`  plan      7 day weekly thali plan seeded`);
  console.log(`  sunday    ${sundayRotation.length} special feast options`);
  console.log(`  dry sabzi ${drySabziPool.length} in rotation: ${drySabziPool.join(", ")}`);

  /* ---------------- add-on dishes + packages ---------------- */
  await MenuItem.deleteMany({ scope: "catering" });
  await MenuItem.insertMany(
    festivalPackages.map((p) => ({ ...p, mess: "all", scope: "catering", cat: "packages", available: true }))
  );
  console.log(`  packages  +${festivalPackages.length} festival packages`);
  console.log(`  prices    PLACEHOLDER - edit in the admin panel\n`);

  await disconnectDB();
}

seed().catch(async (err) => {
  console.error("\n  Seed failed:", err.message, "\n");
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});