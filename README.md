# Online Street Wear

React storefront with Paystack checkout, saved customer orders, requested product colours, and PAXI collection at PEP. Customer and owner emails cover payment confirmation, dispatch, arrival at the selected PAXI point, and collection. Staff update fulfilment in `/manage-orders`; customers follow progress at `/track-order`. Local development uses Vite and a Node API; production uses Cloudflare Workers and D1.

## Run locally

Use **Node.js 22.18.0 or newer**. From the project folder containing this README:

```powershell
npm install
npm run dev
```

After cloning the repository, open its folder in your terminal before running these commands.

Open **http://localhost:5173**. The command starts both the storefront and the payment API at **http://localhost:8789**, with `/api` requests proxied by Vite. Keep the terminal open; Ctrl+C stops both processes. If either port is occupied, stop the previous server before restarting. Separate terminals remain available through `npm run dev:api` and `npm run dev:frontend`.

Create or update the inner `.dev.vars` using [.dev.vars.example](.dev.vars.example) as a template. Configure Paystack before attempting checkout. Set `RESEND_API_KEY`, a verified `ORDER_FROM_EMAIL`, and the store owner's `ORDER_OWNER_EMAIL` for notifications. Restart the server after changing these settings. See [order setup and operation](docs/orders.md) for all settings, owner access, backups, and production deployment.

**Test-mode orders are not real payments. Real confirmation email delivery has not been tested for this implementation; automated tests mock the payment and email providers.**

## Firebase setup (Firestore)

1. Copy `.env.example` to `.env.local` if you do not already have a local frontend configuration.
2. In Firebase Console, open your project `online-street-wear`.
3. Go to Project Settings → General → Your apps (Web app), then copy the Web SDK configuration into `.env.local`.
4. Run `npm install` and `npm run dev` in the inner project folder.

The frontend reads the `products` Firestore collection and falls back to the local catalog. Product images resolve from the Firebase Storage path `products/<filename>` by default. If you use another Firebase project, set the same project ID in frontend `VITE_FIREBASE_PROJECT_ID` and server `FIREBASE_PROJECT_ID`, so checkout can confirm product prices.

Keep Firebase Admin service accounts and payment/email secrets out of the React app. Backend secrets belong in `.dev.vars` locally and Worker secrets in production.

## Shopping and support

Customers can save product picks using the heart on each card or product details dialog, then revisit `/saved`. Saved picks stay in the current browser and do not sync to an account. If browser storage is unavailable, picks last for the current visit.

The cart estimates PAXI delivery by province from the same shared fee table used by checkout. Free delivery applies strictly above R2,000. `/help` explains the fees and collection process. Staff-recorded arrival updates appear on `/track-order`, with copy buttons for the order and parcel numbers and access to the latest checkout saved in that browser.

Newsletter sign-up saves opt-ins in `newsletter_subscriptions` on the local API and deployed Worker. It does not send marketing campaigns. Existing email addresses receive the same success response as new subscriptions; there is no public subscriber-list endpoint.

## Checks

Run these in the inner project folder:

```powershell
npm test
npm run build
```

`npm run check` also bundles a Worker deployment dry run. It does not publish the site. Worker-specific local development is available with `npm run dev:worker`; follow the D1 setup in [docs/orders.md](docs/orders.md) first.
