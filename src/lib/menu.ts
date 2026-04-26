import { resolveAssetUrl, type AppwriteDocument } from "@/lib/appwrite";

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
  taxPercentage: number;
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

function clampTaxPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

export function parseClientSettings(docs: AppwriteDocument[], client: string): RestaurantSettings {
  const clientDocs = docs
    .filter((doc) => isClientMatch(doc, client))
    .filter((doc) => isActive(doc));

  const fallbackName = toTitleCase(client);
  const defaults: RestaurantSettings = {
    restaurantName: fallbackName,
    currency: "INR",
    taxPercentage: 0,
    supportPhone: "",
    upiId: "",
    upiName: "",
    themeColor: "#34d399",
    logoUrl: "",
    heroImageUrl: "",
    tagline: "",
    rawDocs: clientDocs,
  };

  if (clientDocs.length === 0) {
    return defaults;
  }

  const keyValueMap = new Map<string, string>();
  for (const doc of clientDocs) {
    const key = normalizeSettingKey(getDocSettingKey(doc));
    if (!key) {
      continue;
    }
    const value = getDocSettingValue(doc);
    if (!value) {
      continue;
    }
    keyValueMap.set(key, value);
  }

  if (keyValueMap.size > 0) {
    const restaurantName =
      keyValueMap.get("restaurantname") ||
      keyValueMap.get("name") ||
      fallbackName;
    const currency = (keyValueMap.get("currency") || "INR").toUpperCase();
    const taxPercentage = clampTaxPercent(toSafeNumber(keyValueMap.get("taxpercentage"), 0));
    const supportPhone = keyValueMap.get("supportphone") || "";
    const upiId = keyValueMap.get("upiid") || "";
    const upiName = keyValueMap.get("upiname") || "";
    const themeColor =
      keyValueMap.get("themecolor") ||
      keyValueMap.get("accentcolor") ||
      defaults.themeColor;
    const logoUrl = resolveAssetUrl(
      keyValueMap.get("logourl") || keyValueMap.get("logo") || "",
    );
    const heroImageUrl = resolveAssetUrl(
      keyValueMap.get("heroimageurl") || keyValueMap.get("heroimage") || "",
    );
    const tagline = keyValueMap.get("tagline") || keyValueMap.get("subtitle") || "";

    return {
      restaurantName,
      currency: currency || "INR",
      taxPercentage,
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
    taxPercentage: clampTaxPercent(
      toSafeNumber(preferredDoc.tax_percentage ?? preferredDoc.taxPercentage, 0),
    ),
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
      const backendImageUrl = getFieldString(doc, ["image_url", "imageUrl"]);
      const resolvedBackendImage = resolveAssetUrl(backendImageUrl);
      const resolvedLegacyImage = resolveAssetUrl(
        doc.image ??
          doc.photo ??
          doc.thumbnail ??
          doc.imageId ??
          doc.image_id ??
          doc.assetId ??
          doc.asset_id,
      );
      // Single deterministic source per item:
      // 1) backend `image_url` / `imageUrl`
      // 2) legacy media fields only when primary image is absent
      const finalImageSrc = resolvedBackendImage || resolvedLegacyImage;
      const imageFileId = extractAssetFileId(finalImageSrc);
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
