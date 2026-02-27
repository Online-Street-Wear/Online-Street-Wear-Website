## Online Street Wear

Online Street Wear storefront built with React, Vite, and Cloudflare Workers.

To run the devserver:
```
npm install
npm run dev
```

## Firebase setup (Firestore)

1. Copy `.env.example` to `.env.local`.
2. In Firebase Console, open your project `online-street-wear`.
3. Go to Project Settings -> General -> Your apps (Web app) and copy the Web SDK config values into `.env.local`.
4. Install dependencies and run the app.

```
npm install
npm run dev
```

Notes:
- Do not put Firebase Admin SDK service account JSON in the React app.
- This frontend now reads products from Firestore collection `products`, with local products as fallback.
- Product images are resolved from Firebase Storage bucket path `products/<filename>` by default.
