# Servizato Technician App

Mobile-first web app for technicians on the Servizato service marketplace: see today's jobs, accept a job, navigate to the customer, start with the customer's OTP, add parts and proof photos, complete the job and track earnings.

> **Prototype:** sample jobs live in `samples.js`. Progress is saved in the browser (localStorage). There is no backend yet.

**Live:** https://utku54321.github.io/servizato-technician/

## Connected demo

This app works with the other two Servizato apps on the same device:

- [Customer app](https://utku54321.github.io/servizato-customer/) → customer books a service
- [Partner (provider) app](https://utku54321.github.io/servizato-provider/) → provider accepts and assigns a technician
- **Technician app** → that technician gets the job under **New requests**, then accepts → navigates → enters the customer's OTP → adds parts and photos → completes

The customer sees each step live, including parts and proof photos on the invoice. If the job was assigned to someone else, a banner offers to switch to that technician (**Account → Signed in as**).

## Try it

1. **Jobs** → open a **New request** → **Accept job**
2. **Start navigation** (opens Google Maps for the address) → **I've arrived · Enter OTP**
3. Enter the customer's OTP (for sample jobs, tap **Show demo OTP**)
4. Add parts, take an **After** photo → **Mark job complete**
5. Collect payment (sample jobs) or wait for the customer to pay in their app
6. **Earnings** shows today and the last 7 days (technician share: 60% of service charges)

## Run it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Every push to `main` builds and publishes to GitHub Pages (`.github/workflows/deploy.yml`). It is installable on phones (manifest and offline service worker in `public/`).

## Project structure

```
App.jsx      navigation, app state, job actions
screens.jsx  Jobs, Job details, Navigate, OTP, Work (parts + photos), Done, Earnings, Account
samples.js   sample jobs, parts list, past earnings
shared.js    link to the customer and provider apps (same file in all three repos)
data.js      services, providers and bill calculation (same as the customer app)
icons.jsx    inline SVG icons
styles.css   design tokens and styles
public/      app icons, manifest.webmanifest, sw.js
```

## Cloud sync across phones (Firebase)

The three apps can sync live across different phones through Firebase Firestore (free Spark plan is enough). Without it they still work, but only on one device.

1. Go to https://console.firebase.google.com → **Add project** (e.g. `servizato`). Google Analytics is optional.
2. **Build → Firestore Database → Create database** → pick a location (e.g. `asia-south1` Mumbai) → start in **production mode**.
3. Firestore → **Rules** tab → paste the contents of `firestore.rules` → **Publish**.
4. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable**.
5. **Project settings (gear) → Your apps → Web (`</>`)** → register an app → copy the `firebaseConfig` values.
6. Paste them into `firebase-config.js` in **all three repos** (customer, provider, technician) and push. GitHub Pages redeploys automatically.

Then open **Account / More** in any app: it should say **Live sync on**. A booking made on one phone appears in the Partner app on another phone, and the technician's progress, parts, photos and the payment flow back live.

How it works: `backend.js` keeps two Firestore collections, `bookings` (written by the customer app) and `jobs` (provider + technician progress). `shared.js` reads and writes through it and falls back to browser storage when no config is set.

> The demo rules let any app user read and write. Before real customers, add phone-OTP login and role-based rules (customers see only their bookings, providers only their jobs).

## Connecting a real backend later

Replace the helpers in `shared.js` (`readJobs`, `patchJob`, `subscribe`) with API calls and push notifications.
