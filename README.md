# CafeLuxe QR Ordering

Production-ready mobile-first QR restaurant ordering app built with Next.js + Tailwind + Appwrite.

## Working Route

`/c/[client]/t/[table]`

Examples:

- `/c/trustfirst_demo/t/T01`
- `/c/trustfirst_demo/t/T02`

## Appwrite Config (Default)

- Endpoint: `https://sgp.cloud.appwrite.io/v1`
- Project ID: `trustfirst-core`
- Database ID: `trustfirst-main-db`
- Bucket ID: `restaurant-assets`

Collections:

- `users`
- `tables`
- `categories`
- `menu_items`
- `orders`
- `payments`
- `reports`
- `settings`
- `notifications`

## Environment Variables

Copy `.env.example` to `.env.local` and adjust only if needed.

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=trustfirst-core
NEXT_PUBLIC_APPWRITE_DATABASE_ID=trustfirst-main-db
NEXT_PUBLIC_APPWRITE_BUCKET_ID=restaurant-assets
NEXT_PUBLIC_APPWRITE_COLLECTION_USERS=users
NEXT_PUBLIC_APPWRITE_COLLECTION_TABLES=tables
NEXT_PUBLIC_APPWRITE_COLLECTION_CATEGORIES=categories
NEXT_PUBLIC_APPWRITE_COLLECTION_MENU_ITEMS=menu_items
NEXT_PUBLIC_APPWRITE_COLLECTION_ORDERS=orders
NEXT_PUBLIC_APPWRITE_COLLECTION_PAYMENTS=payments
NEXT_PUBLIC_APPWRITE_COLLECTION_REPORTS=reports
NEXT_PUBLIC_APPWRITE_COLLECTION_SETTINGS=settings
NEXT_PUBLIC_APPWRITE_COLLECTION_NOTIFICATIONS=notifications
NEXT_PUBLIC_ENABLE_BACKEND_ORDER_SYNC=false

# Server-only (used for audit script)
APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=trustfirst-core
APPWRITE_DATABASE_ID=trustfirst-main-db
APPWRITE_API_KEY=your_server_api_key
```

## Features

- Real table validation via `tables`
- Restaurant branding load via `settings`
- Categories + menu load via Appwrite
- Session-persistent cart
- Checkout with payment method
- Order creation in `orders` table
- UPI flow creates row in `payments`
- Dark premium bilingual (Hindi + English) mobile UI
- Invalid QR / no menu / network / order failure handling

## Run Locally

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

## Production Build

```bash
npm run build
npm run start
```

## Deploy on Vercel

1. Push repository to GitHub.
2. Import project in Vercel.
3. Add same env variables from `.env.example` in Vercel Project Settings.
4. Deploy.

## Production Security + Index Audit

Run Appwrite production hardening audit:

```bash
npm run audit:appwrite
```

Auto-create missing indexes (where columns exist):

```bash
npm run audit:appwrite:apply-indexes
```

Detailed checklist: [docs/appwrite-production-lockdown.md](docs/appwrite-production-lockdown.md)

## QR Link Format

Generate QR for each table using deployed domain:

- `https://yourdomain.com/c/trustfirst_demo/t/T01`
- `https://yourdomain.com/c/trustfirst_demo/t/T02`

Print and place each QR on its matching table.
