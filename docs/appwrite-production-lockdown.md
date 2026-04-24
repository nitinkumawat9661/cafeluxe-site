# Appwrite Production Lockdown

This document defines the production security and indexing baseline for CafeLuxe QR ordering.

## 1) Required Appwrite identifiers

- Endpoint: `APPWRITE_ENDPOINT` (from environment)
- Project ID: `APPWRITE_PROJECT_ID` (from environment)
- Database ID: `APPWRITE_DATABASE_ID` (from environment)
- Bucket ID: `NEXT_PUBLIC_APPWRITE_BUCKET_ID` (from environment)

Tables:

- `users`
- `tables`
- `categories`
- `menu_items`
- `orders`
- `payments`
- `reports`
- `settings`
- `notifications`

## 2) Permission model (table-level baseline)

The website uses anonymous sessions, so "browser client" means users with `users` role (or `any` if you intentionally open public access).

Recommended table-level permission intent:

1. `tables` / `categories` / `menu_items` / `settings`
   - `read`: allow browser clients (`users` or `any`)
   - `create`, `update`, `delete`: block browser clients
2. `orders`
   - `create`: allow browser clients
   - `read`, `update`, `delete`: block browser clients
3. `payments`
   - `create`: allow browser clients
   - `read`, `update`, `delete`: block browser clients
4. `users` / `reports` / `notifications`
   - block browser clients for `read/create/update/delete`

Row security recommendations:

- `tables`, `categories`, `menu_items`, `settings`: `rowSecurity=false` (reference data)
- `orders`, `payments`, `users`, `reports`, `notifications`: `rowSecurity=true`

## 3) Minimum index baseline

Create (or verify) at least these indexes:

1. `tables`
   - key: `[client_id, table_no]`
   - key: `[client_id, table_code]`
2. `categories`
   - key: `[client_id]`
3. `menu_items`
   - key: `[client_id]`
   - optional key for category filtering, one of:
     - `[client_id, catogry_id]`
4. `orders`
   - key: `[client_id, table_id]`
   - optional: unique/key `[client_id, order_number]`
5. `settings`
   - key: `[client_id]`
6. `payments`
   - optional key: `[order_id]`
   - optional key: `[client_id, order_id]`

## 4) Run automated audit

Set server-only env vars (never expose API key to browser):

```bash
APPWRITE_ENDPOINT=https://<region>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_appwrite_project_id
APPWRITE_DATABASE_ID=your_appwrite_database_id
APPWRITE_API_KEY=your_server_api_key
```

Run:

```bash
npm run audit:appwrite
```

To auto-create missing indexes where possible:

```bash
npm run audit:appwrite:apply-indexes
```

## 5) Frontend data exposure control

The app now supports a secure default:

- `NEXT_PUBLIC_ENABLE_BACKEND_ORDER_SYNC=false`

When false, customer client does **not** query backend orders to restore state, reducing accidental order visibility risk.

Set to `true` only if you intentionally allow and audit order read behavior.
