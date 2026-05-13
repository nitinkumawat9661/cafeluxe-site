import {
  buildBucketFileViewUrl,
  resolveAssetUrl,
  type AppwriteDocument,
} from "@/lib/appwrite";
import { WEBSITE_COLORS } from "@/lib/design-tokens";

export type RestaurantTable = {
  id: string;
  clientId: string;
  tableNo: string;
  tableCode: string;
  displayLabel: string;
  sortOrder: number;
  isActive: boolean;
  raw: AppwriteDocument;
};

export type RestaurantBranding = {
  restaurantName: string;
  tagline: string;
  logoUrl: string;
  heroImageUrl: string;
  accentColor: string;
  raw: AppwriteDocument | null;
};

export type RestaurantSettings = {
  restaurantName: string;
  currency: string;
  gstEnabled: boolean;
  taxPercentage: number;
  cgstPercentage: number;
  sgstPercentage: number;
  supportPhone: string;
  upiId: string;
  upiName: string;
  themeColor: string;
  logoUrl: string;
  heroImageUrl: string;
  tagline: string;
  rawDocs: AppwriteDocument[];
};

export type Category = {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  image: string;
  slug: string;
  sortOrder: number;
  raw: AppwriteDocument;
};

export type MenuItem = {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  image: string;
  imageFileId?: string;
  price: number;
  categoryRefs: string[];
  isAvailable: boolean;
  isVeg: boolean;
  isSpicy: boolean;
  isBestseller: boolean;
  sortOrder: number;
  raw: AppwriteDocument;
};

export type Offer = {
  id: string;
  name: string;
  bannerText: string;
  offerType: string;
  sortOrder: number;
  startAt: string;
  endAt: string;
  raw: AppwriteDocument;
};

const clientKeys = [
  "client",
  "clientId",
  "client_id",
  "clientSlug",
  "client_slug",
  "tenant",
  "tenantId",
  "restaurantSlug",
  "restaurant_slug",
] as const;

const tableNoKeys = [
  "tableNo",
  "table_no",
  "table",
  "tableNumber",
  "table_number",
  "tableCode",
  "table_code",
  "code",
  "name",
  "label",
] as const;

const tableCodeKeys = [
  "tableCode",
  "table_code",
  "code",
  "slug",
  "tag",
  "label",
] as const;

const categoryRefKeys = [
  "catogries_id",
  "catogry_id",
  "categories_id",
  "categoriesId",
  "category",
  "categoryId",
  "category_id",
  "categorySlug",
  "category_slug",
  "categoryName",
  "category_name",
] as const;

const DEFAULT_MENU_IMAGE_BUCKET_ID = "restaurant-assets";
const DAY_TOKEN_TO_INDEX: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

function toSafeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toSafeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function parseDateToTimestamp(value: string) {
  const parsed = Date.parse(value.trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDayIndices(value: unknown): number[] {
  const tokens: string[] = [];

  const pushToken = (raw: unknown) => {
    if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= 6) {
      tokens.push(String(raw));
      return;
    }

    if (typeof raw === "string") {
      const normalized = raw.trim().toLowerCase();
      if (!normalized) {
        return;
      }
      const split = normalized
        .split(/[,\s|/]+/)
        .map((entry) => entry.trim())
        .filter(Boolean);
      if (split.length > 1) {
        tokens.push(...split);
      } else {
        tokens.push(normalized);
      }
      return;
    }

    if (Array.isArray(raw)) {
      for (const entry of raw) {
        pushToken(entry);
      }
    }
  };

  pushToken(value);

  const result = new Set<number>();
  for (const token of tokens) {
    if (/^[0-6]$/.test(token)) {
      result.add(Number(token));
      continue;
    }
    const mapped = DAY_TOKEN_TO_INDEX[token];
    if (Number.isInteger(mapped)) {
      result.add(mapped);
    }
  }

  return [...result];
}

function parseTimeToMinutes(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return -1;
  }

  const normalized = trimmed.toLowerCase();
  const twelveHourMatch = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (twelveHourMatch) {
    let hours = Number(twelveHourMatch[1]);
    const minutes = Number(twelveHourMatch[2] ?? "0");
    const meridiem = twelveHourMatch[3];
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes > 59) {
      return -1;
    }
    if (hours < 1 || hours > 12) {
      return -1;
    }
    if (meridiem === "am") {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
    return hours * 60 + minutes;
  }

  const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!twentyFourHourMatch) {
    return -1;
  }

  const hours = Number(twentyFourHourMatch[1]);
  const minutes = Number(twentyFourHourMatch[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return -1;
  }
  return hours * 60 + minutes;
}

function isWithinDailyWindow(currentMinutes: number, startMinutes: number, endMinutes: number) {
  if (startMinutes < 0 && endMinutes < 0) {
    return true;
  }
  if (startMinutes >= 0 && endMinutes >= 0) {
    if (startMinutes === endMinutes) {
      return true;
    }
    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
  if (startMinutes >= 0) {
    return currentMinutes >= startMinutes;
  }
  return currentMinutes <= endMinutes;
}

function normalizeStorageId(value: string) {
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{5,127}$/.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function extractAssetFileId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const queryMatch = trimmed.match(/[?&]fileId=([^&#]+)/i);
  if (queryMatch) {
    return decodeURIComponent(queryMatch[1]).trim();
  }

  const pathMatch = trimmed.match(/\/files\/([^/?#]+)/i);
  if (pathMatch) {
    return decodeURIComponent(pathMatch[1]).trim();
  }

  return "";
}

function extractFileIdFromUnknown(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const direct = normalizeStorageId(value);
    if (direct) {
      return direct;
    }
    return normalizeStorageId(extractAssetFileId(value));
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const candidates: unknown[] = [
      source.fileId,
      source.file_id,
      source.image_file_id,
      source.imageFileId,
      source.$id,
      source.id,
      source.image_url,
      source.imageUrl,
      source.url,
    ];
    for (const candidate of candidates) {
      const found = extractFileIdFromUnknown(candidate);
      if (found) {
        return found;
      }
    }
  }

  return "";
}

function resolveMenuItemImageFileId(doc: AppwriteDocument) {
  const directFieldFileId = getFieldString(doc, [
    "image_file_id",
    "imageFileId",
    "file_id",
    "fileId",
    "asset_file_id",
    "assetFileId",
    "image_id",
    "imageId",
    "asset_id",
    "assetId",
  ]);
  const directNormalized = normalizeStorageId(directFieldFileId);
  if (directNormalized) {
    return directNormalized;
  }

  const fallbackCandidates: unknown[] = [
    doc.image_url,
    doc.imageUrl,
    doc.image,
    doc.photo,
    doc.thumbnail,
    doc.imageId,
    doc.image_id,
    doc.assetId,
    doc.asset_id,
  ];

  for (const candidate of fallbackCandidates) {
    const fileId = extractFileIdFromUnknown(candidate);
    if (fileId) {
      return fileId;
    }
  }

  return "";
}

function resolveMenuItemImageBucketId(doc: AppwriteDocument) {
  const explicitBucketId = getFieldString(doc, [
    "image_bucket_id",
    "imageBucketId",
    "bucket_id",
    "bucketId",
    "asset_bucket_id",
    "assetBucketId",
  ]);

  return normalizeStorageId(explicitBucketId) || DEFAULT_MENU_IMAGE_BUCKET_ID;
}

function toTitleCase(value: string) {
  return value
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getFieldString(doc: AppwriteDocument, keys: readonly string[]) {
  for (const key of keys) {
    const value = doc[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return "";
}

function getFieldNumber(doc: AppwriteDocument, keys: readonly string[]) {
  for (const key of keys) {
    const value = doc[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
}

function getFieldBoolean(doc: AppwriteDocument, keys: readonly string[], fallback = false) {
  for (const key of keys) {
    const value = doc[key];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "y", "active", "available"].includes(normalized)) {
        return true;
      }
      if (["false", "0", "no", "n", "inactive", "unavailable"].includes(normalized)) {
        return false;
      }
    }
  }
  return fallback;
}

function getFieldStringList(doc: AppwriteDocument, keys: readonly string[]) {
  const result: string[] = [];

  const pushToken = (rawValue: unknown) => {
    const value = toSafeString(rawValue);
    if (!value) {
      return;
    }

    const splitValues = value
      .split(/[|,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (splitValues.length > 1) {
      result.push(...splitValues);
      return;
    }

    result.push(value);
  };

  const pushObjectTokens = (value: Record<string, unknown>) => {
    pushToken(value.$id);
    pushToken(value.id);
    pushToken(value.name);
    pushToken(value.slug);
    pushToken(value.code);
    pushToken(value.value);
  };

  for (const key of keys) {
    const value = doc[key];
    if (typeof value === "string") {
      pushToken(value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === "string") {
          pushToken(entry);
          continue;
        }
        if (typeof entry === "object" && entry) {
          pushObjectTokens(entry as Record<string, unknown>);
        }
      }
      continue;
    }

    if (typeof value === "object" && value) {
      pushObjectTokens(value as Record<string, unknown>);
    }
  }

  return Array.from(new Set(result));
}

function isActive(doc: AppwriteDocument) {
  const active = getFieldBoolean(doc, ["active", "isActive", "enabled"], true);
  const status = getFieldString(doc, ["status", "state", "availability"]).toLowerCase();
  if (!status) {
    return active;
  }
  return active && !["inactive", "disabled", "archived", "blocked"].includes(status);
}

function isClientMatch(doc: AppwriteDocument, client: string) {
  const expected = normalizeToken(client);
  const values = clientKeys
    .map((key) => getFieldString(doc, [key]))
    .filter(Boolean)
    .map(normalizeToken);

  if (values.length === 0) {
    return true;
  }

  return values.some((value) => value === expected);
}

function sortByNameAndOrder<T extends { sortOrder: number; name: string }>(items: T[]) {
  return [...items].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

export function parseTables(docs: AppwriteDocument[], client: string) {
  const parsed = docs
    .filter((doc) => isClientMatch(doc, client))
    .map((doc) => {
      const tableNo =
        getFieldString(doc, tableNoKeys) || getFieldString(doc, ["$id"]) || doc.$id;
      const tableCode = getFieldString(doc, tableCodeKeys) || tableNo;
      const tableLabel = tableNo.toLowerCase().startsWith("table")
        ? tableNo
        : `Table ${tableNo}`;

      return {
        id: doc.$id,
        clientId:
          getFieldString(doc, clientKeys) || client,
        tableNo,
        tableCode,
        displayLabel: tableLabel,
        sortOrder: getFieldNumber(doc, ["sortOrder", "sort", "position", "rank"]),
        isActive: isActive(doc),
        raw: doc,
      } satisfies RestaurantTable;
    })
    .filter((table) => table.isActive)
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.tableNo.localeCompare(b.tableNo, undefined, { numeric: true }),
    );

  return parsed;
}

export function findTableForRoute(tables: RestaurantTable[], tableParam: string) {
  const normalizedRoute = normalizeToken(tableParam.replace(/^table/i, ""));

  for (const table of tables) {
    const candidates = [
      table.id,
      table.tableNo,
      table.tableCode,
      table.displayLabel,
      table.raw.slug,
      table.raw.code,
    ]
      .map((value) => toSafeString(value))
      .filter(Boolean)
      .map((value) => normalizeToken(value.replace(/^table/i, "")));

    if (candidates.some((candidate) => candidate === normalizedRoute)) {
      return table;
    }
  }

  return null;
}

export function parseBrandingSettings(docs: AppwriteDocument[], client: string) {
  const normalizedSettings = parseClientSettings(docs, client);
  if (!normalizedSettings.restaurantName && !normalizedSettings.logoUrl) {
    return null;
  }

  const preferredRawDoc = normalizedSettings.rawDocs[0] ?? null;

  return {
    restaurantName: normalizedSettings.restaurantName,
    tagline: normalizedSettings.tagline,
    logoUrl: normalizedSettings.logoUrl,
    heroImageUrl: normalizedSettings.heroImageUrl,
    accentColor: normalizedSettings.themeColor,
    raw: preferredRawDoc,
  } satisfies RestaurantBranding;
}

function normalizeSettingKey(value: string) {
  return normalizeToken(value);
}

function getDocSettingKey(doc: AppwriteDocument) {
  return getFieldString(doc, [
    "key",
    "settingKey",
    "setting_key",
    "name",
    "code",
    "slug",
  ]);
}

function getDocSettingValue(doc: AppwriteDocument) {
  const candidates: unknown[] = [
    doc.value,
    doc.settingValue,
    doc.setting_value,
    doc.content,
    doc.data,
    doc.text,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
      continue;
    }
    if (typeof candidate === "number" || typeof candidate === "boolean") {
      return String(candidate);
    }
  }

  return "";
}

type SettingValueEntry = {
  key: string;
  value: string;
  updatedAt: number;
};

type SettingValueMap = Map<string, SettingValueEntry>;

function getSettingUpdatedAt(doc: AppwriteDocument) {
  return (
    parseDateToTimestamp(toSafeString(doc.$updatedAt)) ||
    parseDateToTimestamp(toSafeString(doc.$createdAt)) ||
    0
  );
}

function getLatestSettingEntry(settings: SettingValueMap, keys: readonly string[]) {
  let selected: { entry: SettingValueEntry; priority: number } | null = null;

  for (let priority = 0; priority < keys.length; priority += 1) {
    const key = keys[priority];
    const entry = settings.get(normalizeSettingKey(key));
    if (!entry) {
      continue;
    }

    if (
      !selected ||
      entry.updatedAt > selected.entry.updatedAt ||
      (entry.updatedAt === selected.entry.updatedAt && priority < selected.priority)
    ) {
      selected = { entry, priority };
    }
  }

  return selected?.entry ?? null;
}

function getLatestSettingValue(settings: SettingValueMap, keys: readonly string[]) {
  return getLatestSettingEntry(settings, keys)?.value ?? "";
}

function clampTaxPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

function parseBooleanLike(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "active", "enabled", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "inactive", "disabled", "off"].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function resolveTaxSettings(source: {
  gstEnabled?: unknown;
  taxEnabled?: unknown;
  enableGst?: unknown;
  taxPercentage?: unknown;
  cgstPercentage?: unknown;
  sgstPercentage?: unknown;
}) {
  const explicitGstEnabled =
    parseBooleanLike(source.taxEnabled) ??
    parseBooleanLike(source.gstEnabled) ??
    parseBooleanLike(source.enableGst);

  const directTaxPercentage = clampTaxPercent(toSafeNumber(source.taxPercentage, 0));
  const cgstPercentage = clampTaxPercent(toSafeNumber(source.cgstPercentage, 0));
  const sgstPercentage = clampTaxPercent(toSafeNumber(source.sgstPercentage, 0));
  const combinedSplitPercentage = clampTaxPercent(cgstPercentage + sgstPercentage);
  const resolvedTaxPercentage =
    directTaxPercentage > 0 ? directTaxPercentage : combinedSplitPercentage;
  const gstEnabled =
    explicitGstEnabled !== null ? explicitGstEnabled : resolvedTaxPercentage > 0;
  const effectiveTaxPercentage = gstEnabled ? resolvedTaxPercentage : 0;
  const effectiveCgstPercentage = gstEnabled
    ? (cgstPercentage > 0 ? cgstPercentage : effectiveTaxPercentage / 2)
    : 0;
  const effectiveSgstPercentage = gstEnabled
    ? (sgstPercentage > 0 ? sgstPercentage : effectiveTaxPercentage / 2)
    : 0;

  return {
    gstEnabled,
    taxPercentage: effectiveTaxPercentage,
    cgstPercentage: roundToTwoDecimals(effectiveCgstPercentage),
    sgstPercentage: roundToTwoDecimals(effectiveSgstPercentage),
  };
}

function roundToTwoDecimals(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function parseClientSettings(docs: AppwriteDocument[], client: string): RestaurantSettings {
  const clientDocs = docs
    .filter((doc) => isClientMatch(doc, client))
    .filter((doc) => isActive(doc));

  const fallbackName = toTitleCase(client);
  const defaults: RestaurantSettings = {
    restaurantName: fallbackName,
    currency: "INR",
    gstEnabled: false,
    taxPercentage: 0,
    cgstPercentage: 0,
    sgstPercentage: 0,
    supportPhone: "",
    upiId: "",
    upiName: "",
    themeColor: WEBSITE_COLORS.accent,
    logoUrl: "",
    heroImageUrl: "",
    tagline: "",
    rawDocs: clientDocs,
  };

  if (clientDocs.length === 0) {
    return defaults;
  }

  const keyValueMap: SettingValueMap = new Map();
  for (const doc of clientDocs) {
    const key = normalizeSettingKey(getDocSettingKey(doc));
    if (!key) {
      continue;
    }
    const value = getDocSettingValue(doc);
    if (!value) {
      continue;
    }
    const nextEntry = {
      key,
      value,
      updatedAt: getSettingUpdatedAt(doc),
    };
    const currentEntry = keyValueMap.get(key);
    if (!currentEntry || nextEntry.updatedAt >= currentEntry.updatedAt) {
      keyValueMap.set(key, nextEntry);
    }
  }

  if (keyValueMap.size > 0) {
    const restaurantName =
      getLatestSettingValue(keyValueMap, ["restaurant_name", "restaurantName"]) ||
      getLatestSettingValue(keyValueMap, ["name"]) ||
      fallbackName;
    const currency = (getLatestSettingValue(keyValueMap, ["currency"]) || "INR").toUpperCase();
    const gstEnabledSetting = getLatestSettingValue(keyValueMap, [
      "tax_enabled",
      "taxEnabled",
      "gst_enabled",
      "gstEnabled",
      "enable_gst",
      "enableGst",
      "tax_status",
      "gst_status",
    ]);
    const taxSettings = resolveTaxSettings({
      taxEnabled: gstEnabledSetting,
      taxPercentage:
        getLatestSettingValue(keyValueMap, [
          "tax_percentage",
          "taxPercentage",
          "tax_percent",
          "taxPercent",
          "gst_percentage",
          "gstPercentage",
        ]) || undefined,
      cgstPercentage:
        getLatestSettingValue(keyValueMap, [
          "cgst_percentage",
          "cgstPercentage",
          "cgst",
        ]) || undefined,
      sgstPercentage:
        getLatestSettingValue(keyValueMap, [
          "sgst_percentage",
          "sgstPercentage",
          "sgst",
        ]) || undefined,
    });
    const supportPhone = getLatestSettingValue(keyValueMap, ["support_phone", "supportPhone"]) || "";
    const upiId = getLatestSettingValue(keyValueMap, ["upi_id", "upiId"]) || "";
    const upiName = getLatestSettingValue(keyValueMap, ["upi_name", "upiName"]) || "";
    const themeColor =
      getLatestSettingValue(keyValueMap, ["theme_color", "themeColor"]) ||
      getLatestSettingValue(keyValueMap, ["accent_color", "accentColor"]) ||
      defaults.themeColor;
    const logoUrl = resolveAssetUrl(
      getLatestSettingValue(keyValueMap, ["logo_url", "logoUrl", "logo"]) || "",
    );
    const heroImageUrl = resolveAssetUrl(
      getLatestSettingValue(keyValueMap, [
        "hero_image_url",
        "heroImageUrl",
        "hero_image",
        "heroImage",
      ]) || "",
    );
    const tagline = getLatestSettingValue(keyValueMap, ["tagline", "subtitle"]) || "";

    return {
      restaurantName,
      currency: currency || "INR",
      gstEnabled: taxSettings.gstEnabled,
      taxPercentage: taxSettings.taxPercentage,
      cgstPercentage: taxSettings.cgstPercentage,
      sgstPercentage: taxSettings.sgstPercentage,
      supportPhone,
      upiId,
      upiName,
      themeColor,
      logoUrl,
      heroImageUrl,
      tagline,
      rawDocs: clientDocs,
    } satisfies RestaurantSettings;
  }

  const preferredDoc =
    clientDocs.find((doc) =>
      ["branding", "restaurant_branding", "restaurant", "general"].includes(
        getFieldString(doc, ["type", "settingType", "key"]).toLowerCase(),
      ),
    ) ?? clientDocs[0];

  const taxSettings = resolveTaxSettings({
    gstEnabled:
      preferredDoc.gst_enabled ??
      preferredDoc.gstEnabled,
    taxEnabled:
      preferredDoc.tax_enabled ??
      preferredDoc.taxEnabled,
    enableGst:
      preferredDoc.enable_gst ??
      preferredDoc.enableGst,
    taxPercentage:
      preferredDoc.tax_percentage ??
      preferredDoc.taxPercentage ??
      preferredDoc.gst_percentage ??
      preferredDoc.gstPercentage,
    cgstPercentage: preferredDoc.cgst_percentage ?? preferredDoc.cgstPercentage ?? preferredDoc.cgst,
    sgstPercentage: preferredDoc.sgst_percentage ?? preferredDoc.sgstPercentage ?? preferredDoc.sgst,
  });

  return {
    restaurantName:
      getFieldString(preferredDoc, [
        "restaurantName",
        "brandName",
        "name",
        "title",
        "outletName",
      ]) || fallbackName,
    currency:
      getFieldString(preferredDoc, ["currency", "currencyCode", "currency_code"]).toUpperCase() ||
      "INR",
    gstEnabled: taxSettings.gstEnabled,
    taxPercentage: taxSettings.taxPercentage,
    cgstPercentage: taxSettings.cgstPercentage,
    sgstPercentage: taxSettings.sgstPercentage,
    supportPhone: getFieldString(preferredDoc, ["support_phone", "supportPhone", "phone"]),
    upiId: getFieldString(preferredDoc, ["upi_id", "upiId", "upi"]),
    upiName: getFieldString(preferredDoc, ["upi_name", "upiName", "merchantName"]),
    themeColor:
      getFieldString(preferredDoc, ["theme_color", "themeColor", "accentColor", "color"]) ||
      defaults.themeColor,
    logoUrl: resolveAssetUrl(
      preferredDoc.logo ??
        preferredDoc.logoUrl ??
        preferredDoc.brandLogo ??
        preferredDoc.brand_logo,
    ),
    heroImageUrl: resolveAssetUrl(
      preferredDoc.heroImage ??
        preferredDoc.hero_image ??
        preferredDoc.coverImage ??
        preferredDoc.cover_image,
    ),
    tagline: getFieldString(preferredDoc, ["tagline", "subtitle", "description"]),
    rawDocs: clientDocs,
  } satisfies RestaurantSettings;
}

export function parseCategories(docs: AppwriteDocument[], client: string) {
  const categories = docs
    .filter((doc) => isClientMatch(doc, client))
    .filter((doc) => isActive(doc))
    .map((doc) => {
      const name = getFieldString(doc, ["name", "title", "categoryName"]) || "Specials";
      const slug = getFieldString(doc, ["slug", "categorySlug"]) || slugify(name);
      return {
        id: doc.$id,
        name,
        nameHi: getFieldString(doc, ["name_hi", "nameHindi", "title_hi"]) || name,
        description: getFieldString(doc, ["description", "desc", "subtitle"]),
        image: resolveAssetUrl(
          doc.image ??
            doc.imageUrl ??
            doc.image_url ??
            doc.photo ??
            doc.thumbnail ??
            doc.imageId,
        ),
        slug,
        sortOrder: getFieldNumber(doc, [
          "display_order",
          "displayOrder",
          "sortOrder",
          "sort",
          "position",
          "rank",
        ]),
        raw: doc,
      } satisfies Category;
    });

  return sortByNameAndOrder(categories);
}

export function parseMenuItems(docs: AppwriteDocument[], client: string) {
  const items = docs
    .filter((doc) => {
      const hasExplicitClientScope = clientKeys.some(
        (key) => getFieldString(doc, [key]).length > 0,
      );
      if (!hasExplicitClientScope) {
        return false;
      }
      return isClientMatch(doc, client);
    })
    .map((doc) => {
      const name = getFieldString(doc, ["name", "title", "itemName"]) || "Menu Item";
      const categoryRefs = getFieldStringList(doc, categoryRefKeys);
      const imageFileId = resolveMenuItemImageFileId(doc);
      const imageBucketId = resolveMenuItemImageBucketId(doc);
      const directImageSrc = resolveAssetUrl(
        doc.image ??
          doc.imageUrl ??
          doc.image_url ??
          doc.photo ??
          doc.thumbnail ??
          doc.imageId ??
          doc.image_id ??
          "",
      );
      const finalImageSrc = imageFileId
        ? buildBucketFileViewUrl(imageFileId, imageBucketId)
        : directImageSrc;
      return {
        id: doc.$id,
        name,
        nameHi: getFieldString(doc, ["name_hi", "nameHindi", "title_hi"]) || name,
        description: getFieldString(doc, ["description", "desc", "subtitle"]),
        image: finalImageSrc,
        imageFileId,
        price: getFieldNumber(doc, ["price", "amount", "rate", "mrp", "salePrice"]),
        categoryRefs,
        isAvailable:
          isActive(doc) &&
          getFieldBoolean(doc, ["in_stock", "inStock", "stock"], true) &&
          !getFieldBoolean(doc, ["outOfStock", "isSoldOut", "soldOut"], false),
        isVeg: getFieldBoolean(doc, ["isVeg", "is_veg", "veg", "vegetarian"], false),
        isSpicy: getFieldBoolean(doc, ["isSpicy", "spicy"], false),
        isBestseller: getFieldBoolean(doc, ["isBestseller", "bestseller", "popular"], false),
        sortOrder: getFieldNumber(doc, [
          "display_order",
          "displayOrder",
          "sortOrder",
          "sort",
          "position",
          "rank",
        ]),
        raw: doc,
      } satisfies MenuItem;
    });

  return [...items].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      a.name.localeCompare(b.name) ||
      a.price - b.price,
  );
}

export function parseActiveOffers(
  docs: AppwriteDocument[],
  client: string,
  now = new Date(),
) {
  const nowTimestamp = now.getTime();
  const nowDayIndex = now.getDay();
  const nowMinuteOfDay = now.getHours() * 60 + now.getMinutes();

  const offers = docs
    .filter((doc) => isClientMatch(doc, client))
    .filter((doc) => getFieldBoolean(doc, ["is_active", "isActive", "active"], true))
    .map((doc) => {
      const name = getFieldString(doc, ["name", "offer_name", "offerName", "title"]) || "Offer";
      const offerType =
        getFieldString(doc, ["offer_type", "offerType", "type"]).toLowerCase() || "general";
      const startAt = getFieldString(doc, ["start_at", "startAt", "starts_at", "startsAt"]);
      const endAt = getFieldString(doc, ["end_at", "endAt", "expires_at", "expiresAt"]);
      const bannerText = getFieldString(doc, [
        "banner_text",
        "bannerText",
        "subtitle",
        "description",
      ]);

      const dayIndices = parseDayIndices(
        doc.active_days ??
          doc.days_of_week ??
          doc.days ??
          doc.weekdays ??
          doc.valid_days,
      );
      const startMinutes = parseTimeToMinutes(
        getFieldString(doc, [
          "start_time",
          "startTime",
          "time_start",
          "from_time",
          "valid_from_time",
        ]),
      );
      const endMinutes = parseTimeToMinutes(
        getFieldString(doc, [
          "end_time",
          "endTime",
          "time_end",
          "to_time",
          "valid_to_time",
        ]),
      );

      const startAtTimestamp = startAt ? parseDateToTimestamp(startAt) : 0;
      if (startAtTimestamp && nowTimestamp < startAtTimestamp) {
        return null;
      }

      const endAtTimestamp = endAt ? parseDateToTimestamp(endAt) : 0;
      if (endAtTimestamp && nowTimestamp > endAtTimestamp) {
        return null;
      }

      const hasTimeWindow = dayIndices.length > 0 || startMinutes >= 0 || endMinutes >= 0;
      const isTimeBasedType =
        offerType === "time_based" || offerType === "timebased" || offerType.includes("time");
      if (hasTimeWindow || isTimeBasedType) {
        if (dayIndices.length > 0 && !dayIndices.includes(nowDayIndex)) {
          return null;
        }
        if (!isWithinDailyWindow(nowMinuteOfDay, startMinutes, endMinutes)) {
          return null;
        }
      }

      return {
        id: doc.$id,
        name,
        bannerText,
        offerType: offerType.toUpperCase().replace(/[_-]+/g, " "),
        sortOrder: getFieldNumber(doc, [
          "display_order",
          "displayOrder",
          "sort_order",
          "sortOrder",
          "priority",
          "rank",
        ]),
        startAt,
        endAt,
        raw: doc,
      } satisfies Offer;
    })
    .filter((entry): entry is Offer => !!entry);

  return [...offers].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

export function buildFallbackCategories(menuItems: MenuItem[]) {
  const map = new Map<string, Category>();

  for (const item of menuItems) {
    const ref = item.categoryRefs[0] ?? "chef-special";
    if (map.has(ref)) {
      continue;
    }

    const name = toTitleCase(ref);
    map.set(ref, {
      id: ref,
      name,
      nameHi: name,
      description: "",
      image: "",
      slug: slugify(ref),
      sortOrder: map.size + 1,
      raw: { $id: ref },
    });
  }

  return [...map.values()];
}

export function inferRestaurantName(
  client: string,
  branding: RestaurantBranding | null,
  categories: Category[],
  menuItems: MenuItem[],
) {
  if (branding?.restaurantName) {
    return branding.restaurantName;
  }

  const sourceDocs = [...categories.map((item) => item.raw), ...menuItems.map((item) => item.raw)];
  for (const doc of sourceDocs) {
    const candidate = getFieldString(doc, [
      "restaurantName",
      "restaurant",
      "brandName",
      "brand",
      "outletName",
      "outlet",
    ]);
    if (candidate) {
      return candidate;
    }
  }

  return toTitleCase(client);
}

export function matchesCategory(item: MenuItem, category: Category) {
  if (item.categoryRefs.length === 0) {
    return false;
  }

  const normalizedCategoryValues = [
    normalizeToken(category.id),
    normalizeToken(category.name),
    normalizeToken(category.slug),
    normalizeToken(toSafeString(category.raw.category_id)),
    normalizeToken(toSafeString(category.raw.categoryId)),
    normalizeToken(toSafeString(category.raw.code)),
  ];

  const normalizedRefs = item.categoryRefs.map((ref) => normalizeToken(ref));

  return normalizedRefs.some((ref) => {
    if (!ref) {
      return false;
    }
    return normalizedCategoryValues.includes(ref);
  });
}

export function formatInr(value: number, currencyCode = "INR") {
  const normalizedCurrency = currencyCode.trim().toUpperCase() || "INR";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  }
}

export function formatTableLabel(table: string) {
  const decoded = table.replace(/[-_]/g, " ").trim();
  const maybeNumber = decoded.replace(/^table\s*/i, "").trim();
  if (/^\d+$/.test(maybeNumber)) {
    return `Table ${maybeNumber}`;
  }
  return decoded.toLowerCase().startsWith("table")
    ? decoded.replace(/\b\w/g, (char) => char.toUpperCase())
    : `Table ${decoded.toUpperCase()}`;
}
