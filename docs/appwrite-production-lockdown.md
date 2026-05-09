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
- `addon_groups` (optional add-on feature)
- `addon_options` (optional add-on feature)
- `item_addon_map` (optional add-on feature)
- `offers` (optional offers feature)
- `orders`
- `payments`
- `table_sessions`
- `print_jobs` (optional kitchen/KOT feature)
- `reports`
- `settings`
- `notifications`

## 2) Permission model (table-level baseline)

The website uses anonymous sessions, so "browser client" means users with `users` role (or `any` if you intentionally open public access).

Recommended table-level permission intent:

1. `tables` / `categories` / `menu_items` / `addon_groups` / `addon_options` / `item_addon_map` / `offers` / `settings`
   - `read`: allow browser clients (`users` or `any`)
   - `create`, `update`, `delete`: block browser clients
2. `orders`
   - `create`: allow browser clients
   - `read`, `update`, `delete`: block browser clients
3. `payments`
   - `create`: allow browser clients
   - `read`, `update`, `delete`: block browser clients
4. `table_sessions`
   - `create`, `update`: allow browser clients
   - `read`, `delete`: block browser clients
5. `print_jobs`
   - `create`: allow browser clients if KOT printing is enabled
   - `read`, `update`, `delete`: block browser clients
6. `users` / `reports` / `notifications`
   - block browser clients for `read/create/update/delete`

Row security recommendations:

- `tables`, `categories`, `menu_items`, `addon_groups`, `addon_options`, `item_addon_map`, `offers`, `settings`: `rowSecurity=false` (reference data)
- `orders`, `payments`, `table_sessions`, `print_jobs`, `users`, `reports`, `notifications`: `rowSecurity=true`

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
4. Add-ons and offers, if enabled
   - `addon_groups`: optional key `[client_id]` or `[client]`
   - `addon_options`: optional key `[client_id]` or `[client]`
   - `addon_options`: optional key `[addon_group_id]` or `[group_id]`
   - `item_addon_map`: optional key `[client_id]` or `[client]`
   - `item_addon_map`: optional key `[item_id]`, `[menu_item_id]`, or `[product_id]`
   - `offers`: optional key `[client_id]` or `[client]`
5. `orders`
   - key: `[client_id, table_id]`
   - key: `[bill_id, session_id]`
   - optional: unique/key `[client_id, order_number]`
6. `table_sessions`
   - key: `[client_id, table_id, status]`
   - key: `[bill_id, session_id]`
7. `print_jobs`, if KOT printing is enabled
   - optional key: `[client_id, status]`
   - optional key: `[bill_id, session_id]`
8. `settings`
   - key: `[client_id]`
9. `payments`
   - optional key: `[order_id]`
   - optional key: `[client_id, order_id]`

## 4) Run automated audit

Set server-only env vars (never expose API key to browser):

```bash
APPWRITE_ENDPOINT=https://<region>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_appwrite_project_id
APPWRITE_DATABASE_ID=your_appwrite_database_id
APPWRITE_API_KEY=your_server_api_key
WEB_ADMIN_APPROVAL_PIN=your_cashier_pin
```

Run:

```bash
npm run audit:appwrite
```

To auto-create missing indexes where possible:

```bash
npm run audit:appwrite:apply-indexes
```

The audit script also loads `.env.local` automatically for local checks.

## 5) Frontend data exposure control

The app now supports a secure default:

- `NEXT_PUBLIC_ENABLE_BACKEND_ORDER_SYNC=false`

When false, customer client does **not** query backend orders to restore state, reducing accidental order visibility risk.

Set to `true` only if you intentionally allow and audit order read behavior.

The `/api/appwrite/documents` proxy requires `client_id` and `table_id` filters for customer order and table-session reads. Customer order/session updates also send the same scope so the server can verify the current document before patching it.
