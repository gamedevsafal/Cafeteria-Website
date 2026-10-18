# Divya Catering

Catering website, admin panel and API.

**Ghar jaise shudh khane ki guarantee** — pure vegetarian catering for 100 to 2000
guests, plus two daily messes in Gwalior.

---

## What is in here

```
divya-catering/
  dev.js              run everything in development
  package.json        setup / seed / build shortcuts

  server/             Express API + serves the two built front ends
    src/models/       MenuItem, Order, Enquiry, Setting, Admin
    src/routes/       auth, menu, orders, enquiry, settings
    src/seed.js       loads the two messes and the four catering packages
    .env.example      copy to .env and fill in

  web/                public website   React + Vite  -> localhost:5174
  admin/              admin panel      React + Vite  -> localhost:5173
```

Two messes, each with its own daily board:

| Mess | Address |
| --- | --- |
| Divya's Kitchen / Mess | 19 Madhuban Colony, Thatipur, Gwalior |
| Digital Bharat Mess | New Bank Colony, Gwalior |

---

## Setup

**1. Install everything**

```bash
npm run setup
```

**2. Configure the server**

```bash
cp server/.env.example server/.env      # Windows: copy server\.env.example server\.env
```

Fill in at least these three:

```ini
MONGO_URI=mongodb://127.0.0.1:27017/divya_catering
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=a-password-nobody-will-guess
JWT_SECRET=<96 random characters>
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

You need a MongoDB running locally, or a free MongoDB Atlas cluster. Put the Atlas
connection string in `MONGO_URI` if you do not have one locally.

**3. Load the data**

```bash
npm run seed
```

This creates the two messes, 40 sample dishes and the four catering packages, and makes
the admin account. Run `npm run seed:fresh` to wipe and start over.

**4. Start it**

```bash
npm run dev
```

| | |
| --- | --- |
| Website | http://localhost:5174 |
| Admin | http://localhost:5173/admin |
| API | http://localhost:4000/api |

---

## Using the admin panel

Sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`.

**Mess menu** is the page you will use most. Pick a mess, and everything you do there is
live on the public website immediately:

- The **Live switch** on each row hides a dish without deleting it — that is how you
  record "sold out"
- **Mark all available** / **Close the board** for the whole mess at once
- **Quick add** adds a dish in two fields when you are serving a rush
- **Add dish** opens the full editor for price, category, tags and notes

The two messes are independent. Divya's Kitchen can be serving kadi while Digital Bharat
is on dinner.

**Orders** shows everything from the website and the contact form. The button on the right
walks an order through the kitchen:

```
pending → confirmed → preparing → ready → completed
```

Use **Export CSV** for the kitchen printer. Filter by status or date first.

**Catering packages** edits the four packs on the catering page, including price and how
many people each covers.

**Enquiries** catches everything from the contact and catering quote forms.

**Settings** changes the business name, tagline, both mess addresses, opening hours and
the ordering rules. All of it is read by the website on every page load.

---

## Ordering rules you can set

In **Settings**:

| Setting | Effect |
| --- | --- |
| Mess ordering hours | Outside these, the site tells customers to call |
| Notice needed | How far ahead a pickup slot must be |
| Max meals per order | Caps online mess orders |
| Mess service charge | Flat fee added to every mess order |
| Catering from / to | Guest range the catering form accepts |
| Catering notice | Minimum days before an event date |
| Catering service charge | Percentage added to catering |

The server enforces all of these. A customer who breaks a rule gets told why instead of
quietly failing.

---

## Payments

Not switched on. Orders are **pay at the counter**, which is what the website promises.

When you are ready for Stripe:

1. Put `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `server/.env`
2. Create a PaymentIntent on the order in `POST /api/orders`
3. In the Stripe webhook, call `POST /api/orders/admin/:id/paid`
4. Turn on **Card payments** in Settings

The `payment` block on every order (`unpaid`, `pending`, `paid`, `refunded`) is already
there and the admin panel already shows it. Nothing else needs restructuring.

---

## Going live

```bash
npm run build     # builds both front ends
npm start         # one process serves API, website and admin
```

Then point a domain at it and put a reverse proxy in front for HTTPS.

`web/dist` and `admin/dist` are what gets served. If either is missing the server prints
instructions on that route instead of failing.

---

## Before you take real orders

Two things:

**The sample menu is invented.** The package prices came from your client. The 40
individual dishes and their prices are placeholders — replace them in the admin panel
under **Mess menu**. Check every price against your real board.

**The privacy page is a placeholder.** Write a real one at `web/src/pages/Privacy.jsx`.

---

## API

Public, no auth needed:

```
GET  /api/settings                    business details, both messes, ordering rules
GET  /api/menu?mess=&scope=&cat=      today's board
GET  /api/menu/packages               catering packages
GET  /api/orders/track/:ref           order status by reference
POST /api/orders                      place a mess order
POST /api/enquiry                     contact or catering quote
```

Admin, needs the token from `POST /api/auth/login`:

```
POST   /api/auth/login | logout
GET    /api/menu/admin/all
POST   /api/menu/admin                create or update
PATCH  /api/menu/admin/:id/available  sold-out toggle
POST   /api/menu/admin/mess/:mess/toggle
GET    /api/orders/admin?status=&type=&mess=&search=
PATCH  /api/orders/admin/:id/status
GET    /api/orders/admin/export.csv
```

---

## Stack

Express 4 · Mongoose 8 · React 18 · Vite 5 · React Router 6 · JWT · bcrypt.
No UI framework, no CSS framework — the stylesheet is hand written.

Node 18 or newer. Tested on Windows with Node 22.