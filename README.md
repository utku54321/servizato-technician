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

## Connecting a real backend later

Replace the helpers in `shared.js` (`readJobs`, `patchJob`, `subscribe`) with API calls and push notifications.
