const DEFAULT_DEMO_CLIENT_ID = "trustfirst_demo";

function cleanTenantId(value: string | undefined) {
  const cleaned = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return cleaned || DEFAULT_DEMO_CLIENT_ID;
}

export const defaultClientId = cleanTenantId(
  process.env.NEXT_PUBLIC_DEFAULT_CLIENT_ID ||
    process.env.DEFAULT_CLIENT_ID ||
    DEFAULT_DEMO_CLIENT_ID,
);

export const defaultRestaurantId = defaultClientId;

export function normalizeTenantId(value: unknown) {
  return cleanTenantId(String(value ?? ""));
}

export function isSameTenant(left: unknown, right: unknown) {
  return normalizeTenantId(left) === normalizeTenantId(right);
}