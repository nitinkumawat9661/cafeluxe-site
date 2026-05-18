export function normalizeEnvValue(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";

  const quoteWrapped =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  const angleWrapped = trimmed.startsWith("<") && trimmed.endsWith(">");

  return quoteWrapped || angleWrapped ? trimmed.slice(1, -1).trim() : trimmed;
}

export function firstConfiguredEnvValue(...names: string[]) {
  for (const name of names) {
    const value = normalizeEnvValue(process.env[name]);
    if (value) return value;
  }
  return "";
}

export function normalizeCollectionId(value: string, fallback: string) {
  if (!value) return fallback;
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(value) ? value : fallback;
}

export const serverAppwriteConfig = {
  endpoint: normalizeEnvValue(process.env.APPWRITE_ENDPOINT),
  projectId: normalizeEnvValue(process.env.APPWRITE_PROJECT_ID),
  databaseId: normalizeEnvValue(process.env.APPWRITE_DATABASE_ID),
  apiKey: normalizeEnvValue(process.env.APPWRITE_API_KEY),
  bucketId: normalizeEnvValue(process.env.APPWRITE_BUCKET_ID),
  adminPin: normalizeEnvValue(process.env.WEB_ADMIN_APPROVAL_PIN),
};

export const appwriteCollections = {
  users: "users",
  tables: normalizeCollectionId(firstConfiguredEnvValue("APPWRITE_TABLES_COLLECTION_ID", "NEXT_PUBLIC_APPWRITE_TABLES_COLLECTION_ID"), "tables"),
  categories: normalizeCollectionId(firstConfiguredEnvValue("APPWRITE_CATEGORIES_COLLECTION_ID", "NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID"), "categories"),
  menuItems: normalizeCollectionId(firstConfiguredEnvValue("APPWRITE_MENU_COLLECTION_ID", "APPWRITE_MENU_ITEMS_COLLECTION_ID", "NEXT_PUBLIC_APPWRITE_MENU_COLLECTION_ID", "NEXT_PUBLIC_APPWRITE_MENU_ITEMS_COLLECTION_ID"), "menu_items"),
  addonGroups: "addon_groups",
  addonOptions: "addon_options",
  itemAddonMap: "item_addon_map",
  offers: normalizeCollectionId(firstConfiguredEnvValue("APPWRITE_OFFERS_COLLECTION_ID", "NEXT_PUBLIC_APPWRITE_OFFERS_COLLECTION_ID"), "offers"),
  orders: "orders",
  payments: "payments",
  tableSessions: "table_sessions",
  printJobs: "print_jobs",
  settings: normalizeCollectionId(firstConfiguredEnvValue("APPWRITE_SETTINGS_COLLECTION_ID", "NEXT_PUBLIC_APPWRITE_SETTINGS_COLLECTION_ID"), "settings"),
  notifications: "notifications",
};