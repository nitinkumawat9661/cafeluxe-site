"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Flame,
  HandCoins,
  Leaf,
  Loader2,
  Minus,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  WifiOff,
} from "lucide-react";

import {
  appwriteConfig,
  createDocumentWithFallback,
  fetchAllDocuments,
  Query,
  updateDocumentWithFallback,
} from "@/lib/appwrite";
import {
  buildFallbackCategories,
  type Category,
  findTableForRoute,
  formatInr,
  formatTableLabel,
  inferRestaurantName,
  matchesCategory,
  parseClientSettings,
  parseBrandingSettings,
  parseCategories,
  parseActiveOffers,
  parseMenuItems,
  parseTables,
  type MenuItem,
  type Offer,
  type RestaurantBranding,
  type RestaurantSettings,
  type RestaurantTable,
} from "@/lib/menu";

type PaymentMethod = "UPI" | "COUNTER";
type LoadState = "loading" | "ready" | "invalid-table" | "error";
type ExperienceViewMode = "menu" | "cart";

type ModifierOption = {
  id: string;
  label: string;
  price: number;
  kind: "paid" | "free";
};

type SelectedModifier = {
  id: string;
  label: string;
  price: number;
};

type CartItem = {
  item: MenuItem;
  quantity: number;
};

type ActiveOrderContext = {
  id: string;
  status: string;
  paymentStatus: string;
  updatedAt: string;
};

type BillLineItem = {
  lineKey: string;
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  modifiers: SelectedModifier[];
};

type TableOrderRecord = {
  orderId: string;
  orderNumber: string;
  tableNo: string;
  status: string;
  paymentStatus: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  instructions: string;
  items: BillLineItem[];
  source: "local" | "backend";
};

type OfferEvaluationType = "flat_discount" | "bxgy" | "combo" | "time_based";

type OfferEvaluationLine = {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  categoryRefs: string[];
};

type ApplicableOfferPreview = {
  offerId: string;
  offerName: string;
  offerType: OfferEvaluationType;
  matchedReason: string;
  estimatedBenefit: number | null;
};

type StatusPopupState = {
  title: string;
  description: string;
  tone: "info" | "success";
};

type LegacyPersistedTableSession = {
  version: number;
  client: string;
  table: string;
  cart: Record<string, number>;
  activeOrder: ActiveOrderContext | null;
  updatedAt: string;
};

type ActiveTableCartState = {
  version: number;
  client: string;
  table: string;
  cart: Record<string, number>;
  selectedModifiersByItem: Record<string, SelectedModifier[]>;
  kitchenInstructions: string;
  updatedAt: string;
};

type ActiveTableBillState = {
  version: number;
  client: string;
  table: string;
  activeOrder: ActiveOrderContext | null;
  orders: TableOrderRecord[];
  lastActivityAt: string;
  updatedAt: string;
};

type ActiveTableSessionState = {
  version: number;
  client: string;
  table: string;
  hasCart: boolean;
  hasBillOrders: boolean;
  activeOrder: ActiveOrderContext | null;
  lastActivityAt: string;
  updatedAt: string;
};

type CustomerFavoriteItem = {
  itemId: string;
  name: string;
  count: number;
};

type CustomerRecentOrder = {
  orderId: string;
  client: string;
  table: string;
  totalAmount: number;
  placedAt: string;
};

type CustomerOrderSummary = {
  orderId: string;
  client: string;
  table: string;
  totalAmount: number;
  itemCount: number;
  paymentMethod: PaymentMethod;
  status: string;
  placedAt: string;
  items: Array<{
    id: string;
    qty: number;
  }>;
};

type CustomerProfile = {
  version: number;
  browserId: string;
  favoriteItems: CustomerFavoriteItem[];
  recentOrders: CustomerRecentOrder[];
  preferences: {
    preferredPaymentMethod?: PaymentMethod;
    lastClient?: string;
  };
  updatedAt: string;
};

type CustomerOrderHistory = {
  version: number;
  browserId: string;
  byClient: Record<string, CustomerOrderSummary[]>;
  updatedAt: string;
};

const ENABLE_BACKEND_ORDER_SYNC =
  process.env.NEXT_PUBLIC_ENABLE_BACKEND_ORDER_SYNC === "true";

const CUSTOMER_BROWSER_ID_KEY = "customer_browser_id";
const CUSTOMER_PROFILE_KEY = "customer_profile";
const CUSTOMER_ORDER_HISTORY_PREFIX = "customer_order_history";
const CLIENT_CACHE_RESET_MARKER_KEY = "cafeluxe_cache_reset_20260424";
const CUSTOMER_PROFILE_VERSION = 1;
const CUSTOMER_ORDER_HISTORY_VERSION = 1;
const MAX_LOCAL_RECENT_ORDERS = 30;
const MAX_LOCAL_FAVORITES = 24;
const MAX_LOCAL_HISTORY_PER_CLIENT = 40;
const MAX_STORED_STATE_CHARS = 120_000;
const ACTIVE_TABLE_STORAGE_VERSION = 1;
const REQUEST_TIMEOUT_MS = 12000;
const BILL_SYNC_TIMEOUT_MS = 10000;
const ORDER_STATUS_WATCH_INTERVAL_MS = 14000;
const BILL_INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;
const MAX_TABLE_ORDER_RECORDS = 60;
const MAX_ROUTE_CLIENT_LENGTH = 64;
const MAX_ROUTE_TABLE_LENGTH = 32;
const MAX_SEARCH_INPUT_LENGTH = 64;
const MAX_INSTRUCTION_LENGTH = 240;
const DEFAULT_UPI_ID = "7665853321@superyes";
const DEFAULT_UPI_NAME = "Nitin Kumawat";
const PALETTE_BACKGROUND = "#F8F5F0";
const PALETTE_SURFACE = "#E8D9C5";
const PALETTE_ACCENT = "#C6A57B";
const PALETTE_TEXT = "#2E2A26";
const PALETTE_SECONDARY = "#7A6D60";
const PALETTE_BASE = PALETTE_SURFACE;
const PALETTE_SUCCESS = PALETTE_SURFACE;
const PALETTE_INFO = PALETTE_BACKGROUND;
const PALETTE_PREMIUM = PALETTE_BACKGROUND;
const ROYAL_NAVY = PALETTE_SECONDARY;
const LUXURY_GOLD = PALETTE_ACCENT;
const DEEP_CHARCOAL = PALETTE_TEXT;
const SOFT_DARK_SURFACE = PALETTE_SURFACE;
const WARM_HIGHLIGHT = PALETTE_ACCENT;
const LIGHT_TEXT = PALETTE_TEXT;
const BRAND_BG = PALETTE_BACKGROUND;
const BRAND_SURFACE = PALETTE_SURFACE;

const PIZZA_FALLBACK_MODIFIER_OPTIONS: ModifierOption[] = [
  { id: "extra_cheese", label: "Extra Cheese", price: 40, kind: "paid" },
  { id: "extra_toppings", label: "Extra Toppings", price: 60, kind: "paid" },
  { id: "stuffed_crust", label: "Stuffed Crust", price: 80, kind: "paid" },
  { id: "extra_oregano", label: "Extra Oregano", price: 0, kind: "free" },
];

const BURGER_FALLBACK_MODIFIER_OPTIONS: ModifierOption[] = [
  { id: "extra_cheese", label: "Extra Cheese", price: 30, kind: "paid" },
  { id: "extra_dip", label: "Extra Dip", price: 25, kind: "paid" },
  { id: "add_fries", label: "Add Fries", price: 65, kind: "paid" },
  { id: "no_mayo", label: "No Mayo", price: 0, kind: "free" },
];

const DRINK_FALLBACK_MODIFIER_OPTIONS: ModifierOption[] = [
  { id: "large_size", label: "Large Size", price: 35, kind: "paid" },
  { id: "whipped_cream", label: "Whipped Cream", price: 25, kind: "paid" },
  { id: "less_sugar", label: "Less Sugar", price: 0, kind: "free" },
  { id: "extra_ice", label: "Extra Ice", price: 0, kind: "free" },
];

const DESSERT_FALLBACK_MODIFIER_OPTIONS: ModifierOption[] = [
  { id: "extra_scoop", label: "Extra Scoop", price: 55, kind: "paid" },
  { id: "chocolate_sauce", label: "Chocolate Sauce", price: 30, kind: "paid" },
  { id: "extra_nuts", label: "Extra Nuts", price: 25, kind: "paid" },
];

const PASTA_FALLBACK_MODIFIER_OPTIONS: ModifierOption[] = [
  { id: "extra_cheese", label: "Extra Cheese", price: 35, kind: "paid" },
  { id: "add_garlic_bread", label: "Add Garlic Bread", price: 60, kind: "paid" },
  { id: "less_spicy", label: "Less Spicy", price: 0, kind: "free" },
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }
  return "Unexpected error";
}

function normalizeRouteToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toSafeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeRouteSegment(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    return "";
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function sanitizeUserText(value: string, maxLength: number) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

function sanitizeInstructionText(value: string) {
  return sanitizeUserText(value, MAX_INSTRUCTION_LENGTH);
}

function sanitizeSearchInput(value: string) {
  return sanitizeUserText(value, MAX_SEARCH_INPUT_LENGTH);
}

function isStoragePayloadTooLarge(rawValue: string | null) {
  return typeof rawValue === "string" && rawValue.length > MAX_STORED_STATE_CHARS;
}

function toPositiveQuantity(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }
  return 0;
}

function toAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }
  return 0;
}

function toTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeOfferToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseInteger(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }
  return fallback;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function getRecordString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return "";
}

function getRecordNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return Number.NaN;
}

function parseUnknownStringList(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try {
        return parseUnknownStringList(JSON.parse(trimmed) as unknown);
      } catch {
        // fall through to plain split handling
      }
    }
    return trimmed
      .split(/[|,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => parseUnknownStringList(entry));
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    return [
      ...parseUnknownStringList(source.$id),
      ...parseUnknownStringList(source.id),
      ...parseUnknownStringList(source.name),
      ...parseUnknownStringList(source.value),
      ...parseUnknownStringList(source.slug),
      ...parseUnknownStringList(source.code),
    ];
  }

  return [];
}

function getRecordStringList(source: Record<string, unknown>, keys: string[]) {
  const collected: string[] = [];
  for (const key of keys) {
    const values = parseUnknownStringList(source[key]);
    for (const value of values) {
      if (value) {
        collected.push(value);
      }
    }
  }
  return Array.from(new Set(collected));
}

function resolveOfferTypeToken(offer: Offer): OfferEvaluationType | null {
  const raw = offer.raw as Record<string, unknown>;
  const candidate =
    getRecordString(raw, ["offer_type", "offerType", "type", "discount_type"]) || offer.offerType;
  const normalized = candidate.trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (normalized === "flat_discount" || normalized === "flat" || normalized === "discount") {
    return "flat_discount";
  }
  if (
    normalized === "bxgy" ||
    normalized === "bogo" ||
    normalized === "buy_x_get_y" ||
    (normalized.includes("buy") && normalized.includes("get"))
  ) {
    return "bxgy";
  }
  if (normalized === "combo" || normalized === "bundle" || normalized === "set_menu") {
    return "combo";
  }
  if (normalized === "time_based" || normalized === "timebased" || normalized.includes("time")) {
    return "time_based";
  }

  return null;
}

function readOfferCriteria(
  source: Record<string, unknown>,
  itemKeys: string[],
  categoryKeys: string[],
) {
  const itemTokens = new Set(
    getRecordStringList(source, itemKeys)
      .map((value) => normalizeOfferToken(value))
      .filter(Boolean),
  );
  const categoryTokens = new Set(
    getRecordStringList(source, categoryKeys)
      .map((value) => normalizeOfferToken(value))
      .filter(Boolean),
  );
  return { itemTokens, categoryTokens };
}

function lineMatchesOfferCriteria(
  line: OfferEvaluationLine,
  criteria: { itemTokens: Set<string>; categoryTokens: Set<string> },
) {
  const hasItemCriteria = criteria.itemTokens.size > 0;
  const hasCategoryCriteria = criteria.categoryTokens.size > 0;
  if (!hasItemCriteria && !hasCategoryCriteria) {
    return true;
  }

  const itemIdToken = normalizeOfferToken(line.itemId);
  const itemNameToken = normalizeOfferToken(line.name);
  const lineCategoryTokens = line.categoryRefs
    .map((entry) => normalizeOfferToken(entry))
    .filter(Boolean);

  const itemMatch =
    hasItemCriteria &&
    (criteria.itemTokens.has(itemIdToken) || criteria.itemTokens.has(itemNameToken));
  const categoryMatch =
    hasCategoryCriteria &&
    lineCategoryTokens.some((token) => criteria.categoryTokens.has(token));

  if (hasItemCriteria && hasCategoryCriteria) {
    return itemMatch || categoryMatch;
  }
  if (hasItemCriteria) {
    return itemMatch;
  }
  return categoryMatch;
}

function getOfferMinimumCartValue(source: Record<string, unknown>) {
  const value = getRecordNumber(source, [
    "minimum_cart_value",
    "minimum_order_amount",
    "minimum_amount",
    "min_cart_value",
    "min_order_amount",
    "min_amount",
    "threshold_amount",
  ]);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function estimateOfferDiscount(
  source: Record<string, unknown>,
  baseAmount: number,
) {
  if (baseAmount <= 0) {
    return null;
  }

  const percentage = getRecordNumber(source, [
    "discount_percent",
    "discount_percentage",
    "percentage",
    "percent",
    "off_percent",
  ]);
  const maxDiscount = getRecordNumber(source, ["max_discount", "maximum_discount"]);
  if (Number.isFinite(percentage) && percentage > 0) {
    const computed = (baseAmount * percentage) / 100;
    const capped =
      Number.isFinite(maxDiscount) && maxDiscount > 0
        ? Math.min(computed, maxDiscount)
        : computed;
    return roundCurrency(Math.max(0, Math.min(baseAmount, capped)));
  }

  const flat = getRecordNumber(source, [
    "discount_amount",
    "flat_discount",
    "flat_discount_amount",
    "off_amount",
    "amount",
    "value",
  ]);
  if (Number.isFinite(flat) && flat > 0) {
    return roundCurrency(Math.max(0, Math.min(baseAmount, flat)));
  }

  return null;
}

function evaluateFlatDiscountOffer(
  offer: Offer,
  lines: OfferEvaluationLine[],
  subtotalAmount: number,
): ApplicableOfferPreview | null {
  const raw = offer.raw as Record<string, unknown>;
  const minimumCartValue = getOfferMinimumCartValue(raw);
  if (minimumCartValue > 0 && subtotalAmount < minimumCartValue) {
    return null;
  }

  const criteria = readOfferCriteria(
    raw,
    ["item_id", "item_ids", "menu_item_id", "menu_item_ids", "product_id", "product_ids"],
    ["category", "categories", "category_id", "catogry_id", "category_ids"],
  );
  const eligibleLines = lines.filter((line) => lineMatchesOfferCriteria(line, criteria));
  if ((criteria.itemTokens.size > 0 || criteria.categoryTokens.size > 0) && eligibleLines.length === 0) {
    return null;
  }

  const eligibleSubtotal =
    eligibleLines.length > 0
      ? eligibleLines.reduce((sum, line) => sum + line.lineTotal, 0)
      : subtotalAmount;
  const estimatedBenefit = estimateOfferDiscount(raw, eligibleSubtotal);
  const matchedReason =
    minimumCartValue > 0
      ? `Cart value matched minimum ${minimumCartValue.toFixed(2)}.`
      : "Cart matched flat discount criteria.";

  return {
    offerId: offer.id,
    offerName: offer.name,
    offerType: "flat_discount",
    matchedReason,
    estimatedBenefit,
  };
}

function evaluateBxgyOffer(
  offer: Offer,
  lines: OfferEvaluationLine[],
  subtotalAmount: number,
): ApplicableOfferPreview | null {
  const raw = offer.raw as Record<string, unknown>;
  const minimumCartValue = getOfferMinimumCartValue(raw);
  if (minimumCartValue > 0 && subtotalAmount < minimumCartValue) {
    return null;
  }

  const buyQty = parseInteger(
    raw.buy_qty ?? raw.buy_quantity ?? raw.minimum_buy_qty ?? raw.buy_count,
    1,
  ) || 1;
  const getQty = parseInteger(
    raw.get_qty ?? raw.get_quantity ?? raw.free_qty ?? raw.free_quantity,
    1,
  ) || 1;

  const buyCriteria = readOfferCriteria(
    raw,
    [
      "buy_item_id",
      "buy_item_ids",
      "buy_menu_item_id",
      "buy_menu_item_ids",
      "buy_product_id",
      "buy_product_ids",
      "item_id",
      "item_ids",
    ],
    ["buy_category", "buy_categories", "buy_category_id", "buy_catogry_id"],
  );
  const getCriteria = readOfferCriteria(
    raw,
    [
      "get_item_id",
      "get_item_ids",
      "get_menu_item_id",
      "get_menu_item_ids",
      "get_product_id",
      "get_product_ids",
      "free_item_id",
      "free_item_ids",
    ],
    ["get_category", "get_categories", "get_category_id", "get_catogry_id"],
  );

  const buyLines = lines.filter((line) => lineMatchesOfferCriteria(line, buyCriteria));
  const buyQuantity = buyLines.reduce((sum, line) => sum + line.quantity, 0);
  if (buyQuantity < buyQty) {
    return null;
  }

  const getCriteriaFallback =
    getCriteria.itemTokens.size === 0 && getCriteria.categoryTokens.size === 0
      ? buyCriteria
      : getCriteria;
  const getLines = lines.filter((line) => lineMatchesOfferCriteria(line, getCriteriaFallback));
  const getQuantity = getLines.reduce((sum, line) => sum + line.quantity, 0);
  if (getQuantity <= 0) {
    return null;
  }

  const bundleCount = Math.floor(buyQuantity / buyQty);
  const freeQuantity = Math.min(getQuantity, bundleCount * getQty);
  if (freeQuantity <= 0) {
    return null;
  }

  const cheapestEligibleUnit = getLines.reduce((min, line) => {
    return line.unitPrice > 0 ? Math.min(min, line.unitPrice) : min;
  }, Number.POSITIVE_INFINITY);
  const estimatedBenefit =
    Number.isFinite(cheapestEligibleUnit) && cheapestEligibleUnit > 0
      ? roundCurrency(freeQuantity * cheapestEligibleUnit)
      : null;

  return {
    offerId: offer.id,
    offerName: offer.name,
    offerType: "bxgy",
    matchedReason: `Buy ${buyQty}, get ${getQty} criteria matched.`,
    estimatedBenefit,
  };
}

function evaluateComboOffer(
  offer: Offer,
  lines: OfferEvaluationLine[],
  subtotalAmount: number,
): ApplicableOfferPreview | null {
  const raw = offer.raw as Record<string, unknown>;
  const minimumCartValue = getOfferMinimumCartValue(raw);
  if (minimumCartValue > 0 && subtotalAmount < minimumCartValue) {
    return null;
  }

  const requiredItemTokens = getRecordStringList(raw, [
    "combo_item_ids",
    "combo_items",
    "required_item_ids",
    "required_items",
    "item_ids",
  ])
    .map((entry) => normalizeOfferToken(entry))
    .filter(Boolean);
  const requiredCategoryTokens = getRecordStringList(raw, [
    "combo_categories",
    "combo_category_ids",
    "required_categories",
    "category_ids",
    "catogry_ids",
  ])
    .map((entry) => normalizeOfferToken(entry))
    .filter(Boolean);

  const lineItemTokens = new Set<string>();
  const lineCategoryTokens = new Set<string>();
  for (const line of lines) {
    lineItemTokens.add(normalizeOfferToken(line.itemId));
    lineItemTokens.add(normalizeOfferToken(line.name));
    for (const category of line.categoryRefs) {
      lineCategoryTokens.add(normalizeOfferToken(category));
    }
  }

  let matched = false;
  let matchedReason = "Combo criteria matched.";
  if (requiredItemTokens.length > 0) {
    matched = requiredItemTokens.every((token) => lineItemTokens.has(token));
    matchedReason = "Required combo items are present in cart.";
  } else if (requiredCategoryTokens.length > 0) {
    matched = requiredCategoryTokens.every((token) => lineCategoryTokens.has(token));
    matchedReason = "Required combo categories are present in cart.";
  } else {
    const minDistinctItems =
      parseInteger(
        raw.min_distinct_items ?? raw.minimum_items ?? raw.min_items ?? raw.combo_size,
        0,
      );
    matched = minDistinctItems > 0 ? lines.length >= minDistinctItems : lines.length > 0;
    matchedReason =
      minDistinctItems > 0
        ? `Cart has required ${minDistinctItems} combo items.`
        : "Cart has combo-eligible items.";
  }

  if (!matched) {
    return null;
  }

  const estimatedBenefit = estimateOfferDiscount(raw, subtotalAmount);
  return {
    offerId: offer.id,
    offerName: offer.name,
    offerType: "combo",
    matchedReason,
    estimatedBenefit,
  };
}

function evaluateTimeBasedOffer(
  offer: Offer,
  lines: OfferEvaluationLine[],
  subtotalAmount: number,
): ApplicableOfferPreview | null {
  const raw = offer.raw as Record<string, unknown>;
  const minimumCartValue = getOfferMinimumCartValue(raw);
  if (minimumCartValue > 0 && subtotalAmount < minimumCartValue) {
    return null;
  }

  const criteria = readOfferCriteria(
    raw,
    ["item_id", "item_ids", "menu_item_id", "menu_item_ids", "product_id", "product_ids"],
    ["category", "categories", "category_id", "catogry_id", "category_ids"],
  );
  const eligibleLines = lines.filter((line) => lineMatchesOfferCriteria(line, criteria));
  if ((criteria.itemTokens.size > 0 || criteria.categoryTokens.size > 0) && eligibleLines.length === 0) {
    return null;
  }
  if (lines.length === 0) {
    return null;
  }

  const eligibleSubtotal =
    eligibleLines.length > 0
      ? eligibleLines.reduce((sum, line) => sum + line.lineTotal, 0)
      : subtotalAmount;
  const estimatedBenefit = estimateOfferDiscount(raw, eligibleSubtotal);

  return {
    offerId: offer.id,
    offerName: offer.name,
    offerType: "time_based",
    matchedReason: "Live time-window offer matched your current cart.",
    estimatedBenefit,
  };
}

function evaluateApplicableOffers(
  offers: Offer[],
  lines: OfferEvaluationLine[],
  subtotalAmount: number,
) {
  const normalizedSubtotal = roundCurrency(Math.max(0, subtotalAmount));
  if (offers.length === 0 || lines.length === 0 || normalizedSubtotal <= 0) {
    return [] as ApplicableOfferPreview[];
  }

  const previews: ApplicableOfferPreview[] = [];
  for (const offer of offers) {
    const offerType = resolveOfferTypeToken(offer);
    if (!offerType) {
      continue;
    }

    let preview: ApplicableOfferPreview | null = null;
    switch (offerType) {
      case "flat_discount":
        preview = evaluateFlatDiscountOffer(offer, lines, normalizedSubtotal);
        break;
      case "bxgy":
        preview = evaluateBxgyOffer(offer, lines, normalizedSubtotal);
        break;
      case "combo":
        preview = evaluateComboOffer(offer, lines, normalizedSubtotal);
        break;
      case "time_based":
        preview = evaluateTimeBasedOffer(offer, lines, normalizedSubtotal);
        break;
      default:
        preview = null;
        break;
    }

    if (preview) {
      previews.push(preview);
    }
  }

  const deduped = new Map<string, ApplicableOfferPreview>();
  for (const preview of previews) {
    if (!deduped.has(preview.offerId)) {
      deduped.set(preview.offerId, preview);
    }
  }
  return [...deduped.values()];
}

function pickBestApplicableOffer(
  previews: ApplicableOfferPreview[],
  maxPayableAmount: number,
) {
  const safeMax = roundCurrency(Math.max(0, maxPayableAmount));
  if (previews.length === 0 || safeMax <= 0) {
    return null as { offer: ApplicableOfferPreview; discountAmount: number } | null;
  }

  const ranked = previews
    .map((preview) => {
      const estimate = Number.isFinite(preview.estimatedBenefit ?? Number.NaN)
        ? Math.max(0, preview.estimatedBenefit ?? 0)
        : 0;
      return {
        offer: preview,
        estimatedBenefit: roundCurrency(Math.min(safeMax, estimate)),
      };
    })
    .filter((entry) => entry.estimatedBenefit > 0)
    .sort((a, b) => b.estimatedBenefit - a.estimatedBenefit);

  if (ranked.length === 0) {
    return null;
  }

  return {
    offer: ranked[0].offer,
    discountAmount: ranked[0].estimatedBenefit,
  };
}

function normalizeThemeColor(value: string, fallback = PALETTE_ACCENT) {
  const candidate = value.trim();
  if (!candidate) {
    return fallback;
  }

  const isHex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(candidate);
  const isNamedOrFunc =
    /^(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|var)\(/i.test(candidate) ||
    /^[a-z]+$/i.test(candidate);

  return isHex || isNamedOrFunc ? candidate : fallback;
}

function withAlpha(color: string, alpha: number) {
  const safeAlpha = Math.min(1, Math.max(0, alpha));
  const hex = color.trim().replace("#", "");
  const isHex = /^[0-9a-f]{3,4}$/i.test(hex) || /^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex);

  if (isHex) {
    const normalized =
      hex.length === 3 || hex.length === 4
        ? hex
            .slice(0, 3)
            .split("")
            .map((char) => `${char}${char}`)
            .join("")
        : hex.slice(0, 6);

    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
  }

  return `rgba(52, 211, 153, ${safeAlpha})`;
}

function formatBillDateTime(value: string) {
  const timestamp = toTimestamp(value);
  if (!timestamp) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(timestamp));
}

function toPaymentMethod(value: unknown): PaymentMethod | undefined {
  const normalized = toSafeString(value).toUpperCase();
  if (normalized === "UPI" || normalized === "COUNTER") {
    return normalized;
  }
  return undefined;
}

function normalizeModifierId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function normalizeModifierLabel(value: string) {
  const cleaned = value.trim();
  return cleaned || "Custom";
}

function parseModifierOption(value: unknown, fallbackIndex: number): ModifierOption | null {
  if (typeof value === "string") {
    const label = normalizeModifierLabel(value);
    return {
      id: normalizeModifierId(label) || `option_${fallbackIndex + 1}`,
      label,
      price: 0,
      kind: "free",
    };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;
  const label = normalizeModifierLabel(
    toSafeString(source.label) ||
      toSafeString(source.name) ||
      toSafeString(source.title) ||
      toSafeString(source.value),
  );
  if (!label) {
    return null;
  }

  const parsedPrice = toAmount(source.price ?? source.amount ?? source.extra_price);
  const kind =
    parsedPrice > 0 ||
    toSafeString(source.kind).toLowerCase() === "paid" ||
    toSafeString(source.type).toLowerCase() === "paid"
      ? "paid"
      : "free";

  return {
    id:
      normalizeModifierId(
        toSafeString(source.id) ||
          toSafeString(source.code) ||
          toSafeString(source.key) ||
          label,
      ) || `option_${fallbackIndex + 1}`,
    label,
    price: parsedPrice,
    kind,
  };
}

function parseModifierOptionsFromUnknown(value: unknown): ModifierOption[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      return parseModifierOptionsFromUnknown(parsed);
    } catch {
      return parseModifierOptionsFromUnknown(
        trimmed
          .split("|")
          .map((entry) => entry.trim())
          .filter(Boolean),
      );
    }
  }

  if (Array.isArray(value)) {
    const parsed = value
      .map((entry, index) => parseModifierOption(entry, index))
      .filter((entry): entry is ModifierOption => !!entry);
    return uniqueModifierOptions(parsed);
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    if (Array.isArray(source.options)) {
      return parseModifierOptionsFromUnknown(source.options);
    }
    if (Array.isArray(source.items)) {
      return parseModifierOptionsFromUnknown(source.items);
    }

    const mapped = Object.entries(source).map(([key, val], index) => {
      if (typeof val === "number") {
        return {
          id: normalizeModifierId(key) || `option_${index + 1}`,
          label: normalizeModifierLabel(key),
          price: toAmount(val),
          kind: toAmount(val) > 0 ? "paid" : "free",
        } satisfies ModifierOption;
      }
      if (typeof val === "string") {
        const maybePrice = Number(val);
        if (Number.isFinite(maybePrice)) {
          return {
            id: normalizeModifierId(key) || `option_${index + 1}`,
            label: normalizeModifierLabel(key),
            price: toAmount(maybePrice),
            kind: toAmount(maybePrice) > 0 ? "paid" : "free",
          } satisfies ModifierOption;
        }
      }
      return parseModifierOption({ id: key, label: key, value: val }, index);
    });

    return uniqueModifierOptions(
      mapped.filter((entry): entry is ModifierOption => !!entry),
    );
  }

  return [];
}

function uniqueModifierOptions(options: ModifierOption[]) {
  const seen = new Set<string>();
  const result: ModifierOption[] = [];

  for (const option of options) {
    const id = normalizeModifierId(option.id || option.label);
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push({
      id,
      label: normalizeModifierLabel(option.label),
      price: toAmount(option.price),
      kind: option.price > 0 || option.kind === "paid" ? "paid" : "free",
    });
  }

  return result;
}

function getModifierSearchHaystack(item: MenuItem) {
  const raw = item.raw as Record<string, unknown>;
  const tokens: string[] = [];

  const pushToken = (value: unknown) => {
    if (typeof value === "string") {
      const trimmed = value.trim().toLowerCase();
      if (!trimmed) {
        return;
      }
      tokens.push(trimmed);
      const splitTokens = trimmed
        .split(/[\s|,_/-]+/)
        .map((entry) => entry.trim())
        .filter(Boolean);
      tokens.push(...splitTokens);
      return;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        pushToken(entry);
      }
      return;
    }

    if (value && typeof value === "object") {
      const source = value as Record<string, unknown>;
      pushToken(source.$id);
      pushToken(source.id);
      pushToken(source.name);
      pushToken(source.slug);
      pushToken(source.code);
    }
  };

  pushToken(item.name);
  pushToken(item.description);
  for (const ref of item.categoryRefs) {
    pushToken(ref);
  }
  pushToken(raw.category);
  pushToken(raw.category_name);
  pushToken(raw.category_slug);
  pushToken(raw.categoryId);
  pushToken(raw.category_id);
  pushToken(raw.tags);
  pushToken(raw.tag);

  return Array.from(new Set(tokens)).join(" ");
}

function getCategorySpecificFallbackModifiers(item: MenuItem): ModifierOption[] {
  const haystack = getModifierSearchHaystack(item);
  const hasAny = (keywords: string[]) => keywords.some((keyword) => haystack.includes(keyword));

  const isPizzaLike = hasAny([
    "pizza",
    "margherita",
    "pepperoni",
    "neapolitan",
    "thincrust",
    "stuffedcrust",
  ]);
  if (isPizzaLike) {
    return PIZZA_FALLBACK_MODIFIER_OPTIONS;
  }

  const isBurgerLike = hasAny([
    "burger",
    "sandwich",
    "wrap",
    "sub",
    "roll",
    "slider",
  ]);
  if (isBurgerLike) {
    return BURGER_FALLBACK_MODIFIER_OPTIONS;
  }

  const isDrinkLike = hasAny([
    "coffee",
    "tea",
    "latte",
    "cappuccino",
    "espresso",
    "americano",
    "mocha",
    "frappe",
    "shake",
    "smoothie",
    "juice",
    "mocktail",
    "beverage",
    "drink",
    "soda",
  ]);
  if (isDrinkLike) {
    return DRINK_FALLBACK_MODIFIER_OPTIONS;
  }

  const isDessertLike = hasAny([
    "dessert",
    "icecream",
    "ice-cream",
    "sundae",
    "cake",
    "brownie",
    "pastry",
    "sweet",
    "waffle",
    "mousse",
    "kulfi",
  ]);
  if (isDessertLike) {
    return DESSERT_FALLBACK_MODIFIER_OPTIONS;
  }

  const isPastaLike = hasAny(["pasta", "noodle", "macaroni"]);
  if (isPastaLike) {
    return PASTA_FALLBACK_MODIFIER_OPTIONS;
  }

  return [];
}

function getModifierOptionsForMenuItem(item: MenuItem): ModifierOption[] {
  const raw = item.raw as Record<string, unknown>;
  const parsed = uniqueModifierOptions(
    [
      ...parseModifierOptionsFromUnknown(raw.modifiers),
      ...parseModifierOptionsFromUnknown(raw.addons),
      ...parseModifierOptionsFromUnknown(raw.add_ons),
      ...parseModifierOptionsFromUnknown(raw.customizations),
      ...parseModifierOptionsFromUnknown(raw.customization_options),
      ...parseModifierOptionsFromUnknown(raw.options),
    ].filter(Boolean),
  );

  if (parsed.length > 0) {
    return parsed.slice(0, 12);
  }

  return getCategorySpecificFallbackModifiers(item).slice(0, 12);
}

function parseSelectedModifier(value: unknown): SelectedModifier | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const source = value as Record<string, unknown>;
  const label = normalizeModifierLabel(
    toSafeString(source.label) || toSafeString(source.name) || toSafeString(source.title),
  );
  if (!label) {
    return null;
  }

  return {
    id:
      normalizeModifierId(
        toSafeString(source.id) || toSafeString(source.code) || label,
      ) || label.toLowerCase(),
    label,
    price: toAmount(source.price ?? source.amount ?? source.extra_price),
  };
}

function parseSelectedModifierList(value: unknown): SelectedModifier[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      return parseSelectedModifierList(JSON.parse(trimmed));
    } catch {
      return parseSelectedModifierList(
        trimmed
          .split("|")
          .map((entry) => entry.trim())
          .filter(Boolean)
          .map((entry) => ({ label: entry, price: 0 })),
      );
    }
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const parsed = value
    .map((entry) => parseSelectedModifier(entry))
    .filter((entry): entry is SelectedModifier => !!entry);

  const seen = new Set<string>();
  return parsed.filter((entry) => {
    if (!entry.id || seen.has(entry.id)) {
      return false;
    }
    seen.add(entry.id);
    return true;
  });
}

function getSelectedModifierTotal(modifiers: SelectedModifier[]) {
  return modifiers.reduce((sum, modifier) => sum + toAmount(modifier.price), 0);
}

function getBillLineKey(itemId: string, modifiers: SelectedModifier[]) {
  const token = modifiers
    .map((modifier) => modifier.id)
    .sort()
    .join("__");
  return token ? `${itemId}::${token}` : itemId;
}

function mergeBillItemsFromOrders(orders: TableOrderRecord[], menuItems: MenuItem[]) {
  const menuLookup = new Map(menuItems.map((item) => [item.id, item]));
  const merged = new Map<string, BillLineItem>();

  for (const order of orders) {
    for (const lineItem of order.items) {
      const mergedKey = lineItem.lineKey || getBillLineKey(lineItem.itemId, lineItem.modifiers);
      const existing = merged.get(mergedKey);
      const menuItem = menuLookup.get(lineItem.itemId);
      const resolvedName =
        lineItem.name && lineItem.name !== "Item"
          ? lineItem.name
          : menuItem?.name ?? "Item";

      if (!existing) {
        merged.set(mergedKey, {
          ...lineItem,
          lineKey: mergedKey,
          name: resolvedName,
        });
        continue;
      }

      const mergedQuantity = existing.quantity + lineItem.quantity;
      const mergedLineTotal = existing.lineTotal + lineItem.lineTotal;
      const mergedUnitPrice =
        mergedQuantity > 0 ? mergedLineTotal / mergedQuantity : existing.unitPrice;

      merged.set(mergedKey, {
        lineKey: mergedKey,
        itemId: lineItem.itemId,
        name: existing.name || resolvedName,
        quantity: mergedQuantity,
        unitPrice: mergedUnitPrice,
        lineTotal: mergedLineTotal,
        modifiers:
          existing.modifiers.length >= lineItem.modifiers.length
            ? existing.modifiers
            : lineItem.modifiers,
      });
    }
  }

  return [...merged.values()].sort(
    (a, b) => b.lineTotal - a.lineTotal || a.name.localeCompare(b.name),
  );
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    operation
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function normalizeUpiId(value: string) {
  const normalized = value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return "";
  }
  // VPA format: handle@provider
  if (!/^[a-z0-9._-]{2,64}@[a-z0-9.-]{2,64}$/i.test(normalized)) {
    return "";
  }
  return normalized;
}

function sanitizeUpiText(value: string, maxLength: number) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[<>]/g, "")
    .replace(/[%&?#]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function buildUpiPaymentLink({
  upiId,
  upiName,
  amount,
}: {
  upiId: string;
  upiName: string;
  amount: number;
}) {
  const normalizedUpiId = normalizeUpiId(upiId);
  if (!normalizedUpiId || !Number.isFinite(amount) || amount <= 0) {
    return "";
  }

  const safeName = sanitizeUpiText(upiName, 60).replace(/[^a-zA-Z0-9 .,_-]/g, "");
  const finalName = safeName || DEFAULT_UPI_NAME;
  const finalAmount = Number(amount).toFixed(2);
  return `upi://pay?pa=${normalizedUpiId}&pn=${finalName}&am=${finalAmount}&cu=INR`;
}

function normalizeRawUpiUriForLaunch(rawUri: string) {
  const cleanedInput = rawUri
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\r?\n/g, "")
    .trim();
  if (!cleanedInput.toLowerCase().startsWith("upi://pay?")) {
    return "";
  }

  const decodeLooseUriPart = (value: string) => {
    const plusToSpace = value.replace(/\+/g, " ");
    try {
      return decodeURIComponent(plusToSpace);
    } catch {
      return plusToSpace;
    }
  };

  const queryString = cleanedInput.slice("upi://pay?".length);
  const segments = queryString.split("&").filter(Boolean);
  const paramMap = new Map<string, string>();

  for (const segment of segments) {
    const separatorIndex = segment.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }
    const key = segment.slice(0, separatorIndex).trim().toLowerCase();
    const value = segment.slice(separatorIndex + 1);
    if (!key) {
      continue;
    }
    paramMap.set(key, value);
  }

  const pa = normalizeUpiId(decodeLooseUriPart(paramMap.get("pa") ?? ""));
  const pn =
    sanitizeUpiText(decodeLooseUriPart(paramMap.get("pn") ?? ""), 60)
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/\s+/g, " ")
      .trim() || DEFAULT_UPI_NAME;
  const parsedAmount = Number(decodeLooseUriPart(paramMap.get("am") ?? ""));
  const am = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount.toFixed(2) : "";
  const cu = sanitizeUpiText(decodeLooseUriPart(paramMap.get("cu") ?? ""), 8).toUpperCase();

  if (!pa || !pn || !am || cu !== "INR") {
    return "";
  }

  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR`;
}

function buildUpiQrImageUrl(rawUpiUri: string) {
  const cleaned = rawUpiUri.trim();
  if (!cleaned) {
    return "";
  }

  return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&format=png&margin=0&data=${encodeURIComponent(cleaned)}`;
}

function supportsUpiDeepLinkInBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || "";
  const maxTouchPoints =
    typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0;

  const isAndroid = /android/i.test(userAgent);
  const isIphoneOrIpod = /iphone|ipod/i.test(userAgent);
  const isIpad = /ipad/i.test(userAgent) || (/macintosh/i.test(userAgent) && maxTouchPoints > 1);

  return isAndroid || isIphoneOrIpod || isIpad;
}

function createBrowserCustomerId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const randomToken = Math.random().toString(36).slice(2, 10);
  return `cust_${Date.now().toString(36)}_${randomToken}`;
}

function ensureBrowserCustomerId() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = sanitizeUserText(
    toSafeString(window.localStorage.getItem(CUSTOMER_BROWSER_ID_KEY)),
    128,
  ).replace(/\s+/g, "");
  if (/^[a-zA-Z0-9._:-]{8,128}$/.test(existing)) {
    return existing;
  }

  const generated = createBrowserCustomerId();
  window.localStorage.setItem(CUSTOMER_BROWSER_ID_KEY, generated);
  return generated;
}

function emptyCustomerProfile(browserId: string): CustomerProfile {
  return {
    version: CUSTOMER_PROFILE_VERSION,
    browserId,
    favoriteItems: [],
    recentOrders: [],
    preferences: {},
    updatedAt: new Date().toISOString(),
  };
}

function emptyCustomerOrderHistory(browserId: string): CustomerOrderHistory {
  return {
    version: CUSTOMER_ORDER_HISTORY_VERSION,
    browserId,
    byClient: {},
    updatedAt: new Date().toISOString(),
  };
}

function normalizeClientHistoryKey(client: string) {
  const normalized = normalizeRouteToken(client);
  return normalized || client.trim().toLowerCase();
}

function parseCustomerProfile(rawValue: string | null, browserId: string) {
  if (!rawValue || isStoragePayloadTooLarge(rawValue)) {
    return emptyCustomerProfile(browserId);
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<CustomerProfile>;
    const favoriteItems = Array.isArray(parsed.favoriteItems)
      ? parsed.favoriteItems
          .map((entry) => ({
            itemId: toSafeString(entry.itemId),
            name: toSafeString(entry.name) || "Item",
            count: toPositiveQuantity(entry.count),
          }))
          .filter((entry) => entry.itemId && entry.count > 0)
      : [];

    const recentOrders = Array.isArray(parsed.recentOrders)
      ? parsed.recentOrders
          .map((entry) => ({
            orderId: toSafeString(entry.orderId),
            client: toSafeString(entry.client),
            table: toSafeString(entry.table),
            totalAmount: Number(entry.totalAmount) || 0,
            placedAt: toSafeString(entry.placedAt) || new Date().toISOString(),
          }))
          .filter((entry) => entry.orderId)
      : [];

    const preferredPaymentMethod = toPaymentMethod(parsed.preferences?.preferredPaymentMethod);
    const lastClient = toSafeString(parsed.preferences?.lastClient);

    return {
      version: CUSTOMER_PROFILE_VERSION,
      browserId,
      favoriteItems: favoriteItems
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, MAX_LOCAL_FAVORITES),
      recentOrders: recentOrders
        .sort((a, b) => toTimestamp(b.placedAt) - toTimestamp(a.placedAt))
        .slice(0, MAX_LOCAL_RECENT_ORDERS),
      preferences: {
        ...(preferredPaymentMethod ? { preferredPaymentMethod } : {}),
        ...(lastClient ? { lastClient } : {}),
      },
      updatedAt: toSafeString(parsed.updatedAt) || new Date().toISOString(),
    } satisfies CustomerProfile;
  } catch {
    return emptyCustomerProfile(browserId);
  }
}

function parseCustomerOrderHistory(rawValue: string | null, browserId: string) {
  if (!rawValue || isStoragePayloadTooLarge(rawValue)) {
    return emptyCustomerOrderHistory(browserId);
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<CustomerOrderHistory>;
    const sourceByClient =
      parsed.byClient && typeof parsed.byClient === "object" ? parsed.byClient : {};

    const byClient: Record<string, CustomerOrderSummary[]> = {};
    for (const [clientKey, entries] of Object.entries(sourceByClient)) {
      if (!Array.isArray(entries)) {
        continue;
      }

      const sanitizedEntries = entries
        .map((entry) => {
          const paymentMethod = toPaymentMethod(entry.paymentMethod) ?? "COUNTER";
          const items = Array.isArray(entry.items)
            ? entry.items
                .map((item) => ({
                  id: toSafeString(item.id),
                  qty: toPositiveQuantity(item.qty),
                }))
                .filter((item) => item.id && item.qty > 0)
            : [];

          return {
            orderId: toSafeString(entry.orderId),
            client: toSafeString(entry.client),
            table: toSafeString(entry.table),
            totalAmount: Number(entry.totalAmount) || 0,
            itemCount: toPositiveQuantity(entry.itemCount),
            paymentMethod,
            status: toSafeString(entry.status) || "PLACED",
            placedAt: toSafeString(entry.placedAt) || new Date().toISOString(),
            items,
          } satisfies CustomerOrderSummary;
        })
        .filter((entry) => entry.orderId)
        .sort((a, b) => toTimestamp(b.placedAt) - toTimestamp(a.placedAt))
        .slice(0, MAX_LOCAL_HISTORY_PER_CLIENT);

      if (sanitizedEntries.length > 0) {
        byClient[clientKey] = sanitizedEntries;
      }
    }

    return {
      version: CUSTOMER_ORDER_HISTORY_VERSION,
      browserId,
      byClient,
      updatedAt: toSafeString(parsed.updatedAt) || new Date().toISOString(),
    } satisfies CustomerOrderHistory;
  } catch {
    return emptyCustomerOrderHistory(browserId);
  }
}

function buildNextCustomerProfile(
  currentProfile: CustomerProfile,
  orderSummary: CustomerOrderSummary,
  cartItems: CartItem[],
  browserId: string,
) {
  const favoriteMap = new Map<string, CustomerFavoriteItem>();

  for (const favorite of currentProfile.favoriteItems) {
    favoriteMap.set(favorite.itemId, { ...favorite });
  }

  for (const cartItem of cartItems) {
    const previous = favoriteMap.get(cartItem.item.id);
    favoriteMap.set(cartItem.item.id, {
      itemId: cartItem.item.id,
      name: cartItem.item.name,
      count: (previous?.count ?? 0) + cartItem.quantity,
    });
  }

  const favoriteItems = [...favoriteMap.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, MAX_LOCAL_FAVORITES);

  const recentEntry: CustomerRecentOrder = {
    orderId: orderSummary.orderId,
    client: orderSummary.client,
    table: orderSummary.table,
    totalAmount: orderSummary.totalAmount,
    placedAt: orderSummary.placedAt,
  };

  const recentOrders = [
    recentEntry,
    ...currentProfile.recentOrders.filter((order) => order.orderId !== orderSummary.orderId),
  ].slice(0, MAX_LOCAL_RECENT_ORDERS);

  return {
    version: CUSTOMER_PROFILE_VERSION,
    browserId,
    favoriteItems,
    recentOrders,
    preferences: {
      ...currentProfile.preferences,
      preferredPaymentMethod: orderSummary.paymentMethod,
      lastClient: orderSummary.client,
    },
    updatedAt: orderSummary.placedAt,
  } satisfies CustomerProfile;
}

function buildNextCustomerHistory(
  currentHistory: CustomerOrderHistory,
  orderSummary: CustomerOrderSummary,
  browserId: string,
) {
  const clientKey = normalizeClientHistoryKey(orderSummary.client);
  const existingOrders = currentHistory.byClient[clientKey] ?? [];
  const nextOrders = [
    orderSummary,
    ...existingOrders.filter((entry) => entry.orderId !== orderSummary.orderId),
  ].slice(0, MAX_LOCAL_HISTORY_PER_CLIENT);

  return {
    version: CUSTOMER_ORDER_HISTORY_VERSION,
    browserId,
    byClient: {
      ...currentHistory.byClient,
      [clientKey]: nextOrders,
    },
    updatedAt: orderSummary.placedAt,
  } satisfies CustomerOrderHistory;
}

function buildCustomerHistoryStorageKey(client: string, browserId: string) {
  return `${CUSTOMER_ORDER_HISTORY_PREFIX}_${normalizeRouteToken(client)}_${browserId}`;
}

function isResettableClientCacheKey(key: string) {
  return (
    key === CUSTOMER_BROWSER_ID_KEY ||
    key === CUSTOMER_PROFILE_KEY ||
    key.startsWith(`${CUSTOMER_ORDER_HISTORY_PREFIX}_`) ||
    key.startsWith("active_cart_") ||
    key.startsWith("active_bill_") ||
    key.startsWith("active_session_") ||
    key.startsWith("cart_")
  );
}

function buildActiveCartStorageKey(client: string, table: string) {
  return `active_cart_${normalizeRouteToken(client)}_${normalizeRouteToken(table)}`;
}

function buildActiveBillStorageKey(client: string, table: string) {
  return `active_bill_${normalizeRouteToken(client)}_${normalizeRouteToken(table)}`;
}

function buildActiveSessionStorageKey(client: string, table: string) {
  return `active_session_${normalizeRouteToken(client)}_${normalizeRouteToken(table)}`;
}

function parseActiveOrderContext(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;
  const id = toSafeString(source.id);
  if (!id) {
    return null;
  }

  return {
    id,
    status: toSafeString(source.status) || "PLACED",
    paymentStatus: toSafeString(source.paymentStatus) || "UNPAID",
    updatedAt: toSafeString(source.updatedAt) || new Date().toISOString(),
  } satisfies ActiveOrderContext;
}

function parseBillLineItem(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;
  const itemId =
    toSafeString(source.item_id) ||
    toSafeString(source.itemId) ||
    toSafeString(source.id) ||
    toSafeString(source.menu_item_id) ||
    toSafeString(source.menuItemId);
  const quantity = toPositiveQuantity(source.quantity ?? source.qty ?? source.count);
  const unitPrice = toAmount(source.unit_price ?? source.unitPrice ?? source.price);
  const modifiers = parseSelectedModifierList(
    source.modifiers ?? source.customizations ?? source.addons ?? source.add_ons,
  );
  const modifierTotal = getSelectedModifierTotal(modifiers);
  const effectiveUnitPrice = unitPrice > 0 ? unitPrice : toAmount(source.base_price) + modifierTotal;
  const explicitLineTotal = toAmount(source.line_total ?? source.lineTotal ?? source.total);
  const lineTotal =
    explicitLineTotal > 0 ? explicitLineTotal : (effectiveUnitPrice || unitPrice) * quantity;
  const name =
    toSafeString(source.item_name) ||
    toSafeString(source.itemName) ||
    toSafeString(source.name) ||
    "Item";

  if (!itemId || quantity <= 0) {
    return null;
  }

  return {
    lineKey: getBillLineKey(itemId, modifiers),
    itemId,
    name,
    quantity,
    unitPrice: effectiveUnitPrice || unitPrice,
    lineTotal,
    modifiers,
  } satisfies BillLineItem;
}

function parseBillItems(value: unknown): BillLineItem[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      return parseBillItems(parsed);
    } catch {
      return [];
    }
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => parseBillLineItem(entry))
      .filter((entry): entry is BillLineItem => !!entry);
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    if (Array.isArray(source.items)) {
      return parseBillItems(source.items);
    }
  }

  return [];
}

function parseTableOrderRecord(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;
  const orderId =
    toSafeString(source.orderId) || toSafeString(source.order_id) || toSafeString(source.id);
  if (!orderId) {
    return null;
  }

  const createdAt =
    toSafeString(source.createdAt) ||
    toSafeString(source.created_at) ||
    new Date().toISOString();
  const updatedAt =
    toSafeString(source.updatedAt) ||
    toSafeString(source.updated_at) ||
    createdAt;
  const paymentMethod = toPaymentMethod(source.paymentMethod ?? source.payment_method) ?? "COUNTER";
  const items = parseBillItems(source.items);
  const subtotal = toAmount(source.subtotal);
  const fallbackSubtotal =
    subtotal > 0 ? subtotal : items.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalAmount = toAmount(source.totalAmount ?? source.total_amount);
  const resolvedTotal = totalAmount > 0 ? totalAmount : fallbackSubtotal;
  const sourceType = toSafeString(source.source).toLowerCase() === "backend" ? "backend" : "local";

  return {
    orderId,
    orderNumber:
      toSafeString(source.orderNumber) ||
      toSafeString(source.order_number) ||
      `ORD-${orderId.slice(-6).toUpperCase()}`,
    tableNo: toSafeString(source.tableNo) || toSafeString(source.table_no),
    status: toSafeString(source.status) || "PLACED",
    paymentStatus: toSafeString(source.paymentStatus ?? source.payment_status) || "UNPAID",
    paymentMethod,
    subtotal: fallbackSubtotal,
    totalAmount: resolvedTotal,
    createdAt,
    updatedAt,
    instructions:
      sanitizeInstructionText(
        toSafeString(source.instructions) ||
          toSafeString(source.kitchenInstructions) ||
          toSafeString(source.kitchen_instructions) ||
          toSafeString(source.notes),
      ),
    items,
    source: sourceType,
  } satisfies TableOrderRecord;
}

function parseTableOrderRecords(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => parseTableOrderRecord(entry))
    .filter((entry): entry is TableOrderRecord => !!entry)
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
    .slice(0, MAX_TABLE_ORDER_RECORDS);
}

function mergeTableOrderRecords(primary: TableOrderRecord[], secondary: TableOrderRecord[]) {
  // Billing strategy: keep backend order documents immutable and merge order slices in UI.
  // This avoids fragile schema-dependent order updates while still showing one customer bill.
  const merged = new Map<string, TableOrderRecord>();

  for (const entry of [...primary, ...secondary]) {
    const existing = merged.get(entry.orderId);
    if (!existing) {
      merged.set(entry.orderId, entry);
      continue;
    }

    const shouldReplace =
      toTimestamp(entry.updatedAt) >= toTimestamp(existing.updatedAt) ||
      (entry.items.length > 0 && existing.items.length === 0);
    if (shouldReplace) {
      merged.set(entry.orderId, entry);
    }
  }

  return [...merged.values()]
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
    .slice(0, MAX_TABLE_ORDER_RECORDS);
}

function getLatestOrderContextFromRecords(records: TableOrderRecord[]) {
  if (records.length === 0) {
    return null;
  }

  const sorted = [...records].sort((a, b) => toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt));
  const latestOpen =
    sorted.find((record) => !isOrderClosed(record.status, record.paymentStatus)) ?? sorted[0];

  return {
    id: latestOpen.orderId,
    status: latestOpen.status,
    paymentStatus: latestOpen.paymentStatus,
    updatedAt: latestOpen.updatedAt || latestOpen.createdAt,
  } satisfies ActiveOrderContext;
}

function parseLegacyPersistedSession(rawValue: string | null) {
  if (!rawValue || isStoragePayloadTooLarge(rawValue)) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as LegacyPersistedTableSession;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (!parsed.cart || typeof parsed.cart !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseActiveCartState(rawValue: string | null) {
  if (!rawValue || isStoragePayloadTooLarge(rawValue)) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const cartSource =
      parsed.cart && typeof parsed.cart === "object" ? parsed.cart : parsed;
    const cart: Record<string, number> = {};

    for (const [itemId, quantity] of Object.entries(cartSource)) {
      const qty = toPositiveQuantity(quantity);
      if (!itemId.startsWith("$") && qty > 0) {
        cart[itemId] = qty;
      }
    }

    const selectedModifiersByItem: Record<string, SelectedModifier[]> = {};
    const modifierSource =
      parsed.selectedModifiersByItem && typeof parsed.selectedModifiersByItem === "object"
        ? (parsed.selectedModifiersByItem as Record<string, unknown>)
        : {};

    for (const [itemId, entry] of Object.entries(modifierSource)) {
      if (!itemId || !cart[itemId]) {
        continue;
      }
      const parsedModifiers = parseSelectedModifierList(entry);
      if (parsedModifiers.length > 0) {
        selectedModifiersByItem[itemId] = parsedModifiers;
      }
    }

    return {
      version: ACTIVE_TABLE_STORAGE_VERSION,
      client: toSafeString(parsed.client),
      table: toSafeString(parsed.table),
      cart,
      selectedModifiersByItem,
      kitchenInstructions:
        sanitizeInstructionText(
          toSafeString(parsed.kitchenInstructions) ||
            toSafeString(parsed.kitchen_instructions) ||
            toSafeString(parsed.orderInstructions),
        ) ||
        "",
      updatedAt: toSafeString(parsed.updatedAt) || new Date().toISOString(),
    } satisfies ActiveTableCartState;
  } catch {
    return null;
  }
}

function parseActiveBillState(rawValue: string | null) {
  if (!rawValue || isStoragePayloadTooLarge(rawValue)) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const fromActiveOrder = parseActiveOrderContext(parsed.activeOrder);
    const direct = parseActiveOrderContext(parsed);
    const activeOrder = fromActiveOrder ?? direct;
    const orders = parseTableOrderRecords(parsed.orders);

    return {
      version: ACTIVE_TABLE_STORAGE_VERSION,
      client: toSafeString(parsed.client),
      table: toSafeString(parsed.table),
      activeOrder,
      orders,
      lastActivityAt:
        toSafeString(parsed.lastActivityAt) ||
        toSafeString(parsed.last_activity_at) ||
        toSafeString(parsed.updatedAt) ||
        activeOrder?.updatedAt ||
        "",
      updatedAt: toSafeString(parsed.updatedAt) || activeOrder?.updatedAt || new Date().toISOString(),
    } satisfies ActiveTableBillState;
  } catch {
    return null;
  }
}

function parseActiveSessionState(rawValue: string | null) {
  if (!rawValue || isStoragePayloadTooLarge(rawValue)) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const activeOrder = parseActiveOrderContext(parsed.activeOrder);
    const hasCart =
      typeof parsed.hasCart === "boolean"
        ? parsed.hasCart
        : toPositiveQuantity(parsed.cartCount) > 0;
    const hasBillOrders =
      typeof parsed.hasBillOrders === "boolean"
        ? parsed.hasBillOrders
        : toPositiveQuantity(parsed.billOrderCount) > 0;

    return {
      version: ACTIVE_TABLE_STORAGE_VERSION,
      client: toSafeString(parsed.client),
      table: toSafeString(parsed.table),
      hasCart,
      hasBillOrders,
      activeOrder,
      lastActivityAt:
        toSafeString(parsed.lastActivityAt) ||
        toSafeString(parsed.last_activity_at) ||
        toSafeString(parsed.updatedAt) ||
        "",
      updatedAt: toSafeString(parsed.updatedAt) || new Date().toISOString(),
    } satisfies ActiveTableSessionState;
  } catch {
    return null;
  }
}

function normalizeCategoryKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getCategoryIdentityTokens(category: Category) {
  return uniqueNonEmpty(
    [
      normalizeCategoryKey(category.id),
      normalizeCategoryKey(category.slug),
      normalizeCategoryKey(category.name),
    ].filter(Boolean),
  );
}

function mergeCategorySets(primary: Category[], secondary: Category[]) {
  const merged = [...primary];
  const seenTokens = new Set<string>();

  for (const category of primary) {
    for (const token of getCategoryIdentityTokens(category)) {
      seenTokens.add(token);
    }
  }

  for (const category of secondary) {
    const tokens = getCategoryIdentityTokens(category);
    if (tokens.length === 0) {
      continue;
    }

    const alreadyExists = tokens.some((token) => seenTokens.has(token));
    if (alreadyExists) {
      continue;
    }

    merged.push(category);
    for (const token of tokens) {
      seenTokens.add(token);
    }
  }

  return merged.sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

function getRouteSessionKey(client: string, table: string) {
  return [normalizeRouteToken(client), normalizeRouteToken(table)].join("|");
}

function isRecordForRoute(
  session: { client?: string; table?: string } | null,
  routeClient: string,
  routeTable: string,
) {
  if (!session) {
    return false;
  }

  if (!session.client || !session.table) {
    return true;
  }

  return (
    getRouteSessionKey(session.client, session.table) ===
    getRouteSessionKey(routeClient, routeTable)
  );
}

function isOrderClosed(status: string, paymentStatus: string) {
  const closedOrderStatuses = new Set([
    "CLOSED",
    "COMPLETED",
    "CANCELLED",
    "VOID",
    "BILLED",
    "SETTLED",
  ]);
  const settledPaymentStatuses = new Set(["PAID", "SETTLED", "COMPLETED"]);

  return (
    closedOrderStatuses.has(status.toUpperCase()) ||
    settledPaymentStatuses.has(paymentStatus.toUpperCase())
  );
}

function isOrderAccepted(status: string) {
  const normalized = status.trim().toUpperCase();
  if (!normalized) {
    return false;
  }
  return [
    "ACCEPTED",
    "CONFIRMED",
    "PREPARING",
    "IN_PROGRESS",
    "COOKING",
    "READY",
    "SERVED",
    "DELIVERED",
    "BILLED",
    "COMPLETED",
    "CLOSED",
    "SETTLED",
  ].includes(normalized);
}

function isPaymentConfirmed(status: string) {
  const normalized = status.trim().toUpperCase();
  if (!normalized) {
    return false;
  }
  return ["PAID", "SETTLED", "COMPLETED"].includes(normalized);
}

function shouldDropClosedOrdersForInactivity(lastActivityAt: string) {
  const activityTimestamp = toTimestamp(lastActivityAt);
  if (!activityTimestamp) {
    return false;
  }
  return Date.now() - activityTimestamp >= BILL_INACTIVITY_TIMEOUT_MS;
}

function applyBillInactivityPolicy(records: TableOrderRecord[], lastActivityAt: string) {
  if (records.length === 0) {
    return records;
  }
  if (!shouldDropClosedOrdersForInactivity(lastActivityAt)) {
    return records;
  }
  return records.filter((record) => !isOrderClosed(record.status, record.paymentStatus));
}

function getOrderStatusLabel(status: string) {
  const normalized = status.trim().toUpperCase();
  if (!normalized) {
    return "Unknown";
  }
  if (["PLACED", "PENDING", "NEW", "RECEIVED"].includes(normalized)) {
    return "Pending";
  }
  if (["PREPARING", "IN_PROGRESS", "COOKING"].includes(normalized)) {
    return "Preparing";
  }
  if (["READY"].includes(normalized)) {
    return "Ready";
  }
  if (["SERVED", "DELIVERED", "COMPLETED", "CLOSED", "BILLED"].includes(normalized)) {
    return "Served";
  }
  return "Unknown";
}

function getPaymentStatusLabel(status: string) {
  const normalized = status.trim().toUpperCase();
  if (!normalized) {
    return "Unknown";
  }
  if (["PAID", "SETTLED", "COMPLETED"].includes(normalized)) {
    return "Paid";
  }
  if (["UNPAID", "PENDING", "DUE"].includes(normalized)) {
    return "Unpaid";
  }
  return "Unknown";
}

function getPreferredBillOrder(records: TableOrderRecord[]) {
  if (records.length === 0) {
    return null;
  }
  return (
    [...records].find((record) => !isOrderClosed(record.status, record.paymentStatus)) ??
    records[0]
  );
}

function parseOrderRecordFromDocument(doc: Record<string, unknown>): TableOrderRecord | null {
  const orderId = toSafeString(doc.$id);
  if (!orderId) {
    return null;
  }

  const items = parseBillItems(
    doc.items ?? doc.items_json ?? doc.order_items ?? doc.orderItems ?? doc.cart_items,
  );
  const subtotalFromDoc = toAmount(doc.subtotal ?? doc.sub_total);
  const subtotal =
    subtotalFromDoc > 0 ? subtotalFromDoc : items.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalFromDoc = toAmount(doc.total_amount ?? doc.total ?? doc.grand_total);
  const totalAmount = totalFromDoc > 0 ? totalFromDoc : subtotal;
  const createdAt =
    toSafeString(doc.created_at_custom) ||
    toSafeString(doc.created_at) ||
    toSafeString(doc.$createdAt) ||
    new Date().toISOString();
  const updatedAt =
    toSafeString(doc.$updatedAt) ||
    toSafeString(doc.updated_at) ||
    createdAt;
  const paymentMethod = toPaymentMethod(doc.payment_method ?? doc.paymentMethod) ?? "COUNTER";

  return {
    orderId,
    orderNumber: toSafeString(doc.order_number) || `ORD-${orderId.slice(-6).toUpperCase()}`,
    tableNo: toSafeString(doc.table_no),
    status: toSafeString(doc.status) || "PLACED",
    paymentStatus: toSafeString(doc.payment_status) || "UNPAID",
    paymentMethod,
    subtotal,
    totalAmount,
    createdAt,
    updatedAt,
    instructions:
      sanitizeInstructionText(
        toSafeString(doc.kitchen_instructions) ||
          toSafeString(doc.instructions) ||
          toSafeString(doc.notes),
      ),
    items,
    source: "backend",
  } satisfies TableOrderRecord;
}

async function fetchTableOrderRecords(clientId: string, tableId: string) {
  try {
    const orderDocs = await fetchAllDocuments(appwriteConfig.collections.orders, {
      pageSize: 50,
      maxDocs: 200,
      queries: [
        Query.equal("client_id", [clientId]),
        Query.equal("table_id", [tableId]),
        Query.orderDesc("$createdAt"),
      ],
      timeoutMs: BILL_SYNC_TIMEOUT_MS,
    });

    return orderDocs
      .map((doc) => parseOrderRecordFromDocument(doc))
      .filter((entry): entry is TableOrderRecord => !!entry);
  } catch (error) {
    const message = getErrorMessage(error).toLowerCase();
    const canIgnore =
      message.includes("not authorized") ||
      message.includes("user_unauthorized") ||
      message.includes("index") ||
      message.includes("attribute") ||
      message.includes("query") ||
      message.includes("filtered query failed");
    if (!canIgnore) {
      console.error(error);
    }
    return [];
  }
}

function uniqueNonEmpty(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function buildClientCandidates(routeClient: string) {
  const cleaned = routeClient.trim();
  return uniqueNonEmpty([
    cleaned,
    cleaned.toLowerCase(),
    cleaned.toUpperCase(),
    cleaned.replace(/-/g, "_"),
    cleaned.replace(/_/g, "-"),
  ]);
}

function isRecoverableQueryFailure(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return /attribute|query|index|invalid|not found/.test(message);
}

function isUnauthorizedError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("user_unauthorized") || message.includes("not authorized");
}

type ClientScopedFetchOptions = {
  pageSize?: number;
  maxDocs?: number;
};

async function fetchClientScopedDocuments(
  collectionId: string,
  routeClient: string,
  options?: ClientScopedFetchOptions,
) {
  const candidates = buildClientCandidates(routeClient);
  const clientFields = ["client_id", "client"];
  const pageSize = options?.pageSize ?? 120;
  const maxDocs = options?.maxDocs ?? 800;

  for (const clientField of clientFields) {
    try {
      const docs = await fetchAllDocuments(collectionId, {
        pageSize,
        maxDocs,
        queries: [Query.equal(clientField, candidates)],
        timeoutMs: REQUEST_TIMEOUT_MS,
      });

      if (docs.length > 0 || clientField === clientFields.at(-1)) {
        return docs;
      }
    } catch (queryError) {
      if (!isRecoverableQueryFailure(queryError)) {
        throw queryError;
      }
    }
  }

  return fetchAllDocuments(collectionId, {
    pageSize,
    maxDocs,
    timeoutMs: REQUEST_TIMEOUT_MS,
  });
}

function generateOrderNumber(clientId: string, tableNo: string) {
  const stamp = new Date();
  const yyyy = stamp.getFullYear();
  const mm = String(stamp.getMonth() + 1).padStart(2, "0");
  const dd = String(stamp.getDate()).padStart(2, "0");
  const hh = String(stamp.getHours()).padStart(2, "0");
  const min = String(stamp.getMinutes()).padStart(2, "0");
  const sec = String(stamp.getSeconds()).padStart(2, "0");
  const clientToken = normalizeRouteToken(clientId).toUpperCase().slice(0, 6) || "CLIENT";
  const tableToken = normalizeRouteToken(tableNo).toUpperCase().slice(0, 8) || "TABLE";
  return `ORD-${clientToken}-${tableToken}-${yyyy}${mm}${dd}${hh}${min}${sec}`;
}

function buildTableOrderRecordFromCart(
  orderId: string,
  orderNumber: string,
  tableNo: string,
  paymentMethod: PaymentMethod,
  subtotal: number,
  totalAmount: number,
  createdAt: string,
  cartItems: CartItem[],
  selectedModifiersByItem: Record<string, SelectedModifier[]>,
  kitchenInstructions: string,
) {
  return {
    orderId,
    orderNumber,
    tableNo,
    status: "PLACED",
    paymentStatus: "UNPAID",
    paymentMethod,
    subtotal,
    totalAmount,
    createdAt,
    updatedAt: createdAt,
    instructions: kitchenInstructions.trim(),
    items: cartItems.map((cartItem) => ({
      ...(() => {
        const selectedModifiers = selectedModifiersByItem[cartItem.item.id] ?? [];
        const modifierTotal = getSelectedModifierTotal(selectedModifiers);
        const unitPrice = cartItem.item.price + modifierTotal;
        return {
          lineKey: getBillLineKey(cartItem.item.id, selectedModifiers),
          itemId: cartItem.item.id,
          name: cartItem.item.name,
          quantity: cartItem.quantity,
          unitPrice,
          lineTotal: unitPrice * cartItem.quantity,
          modifiers: selectedModifiers,
        };
      })(),
    })),
    source: "local",
  } satisfies TableOrderRecord;
}

async function resolveRouteTable(clientId: string, tableParam: string) {
  const clientCandidates = buildClientCandidates(clientId);
  try {
    const clientTables = await fetchAllDocuments(appwriteConfig.collections.tables, {
      pageSize: 120,
      maxDocs: 500,
      queries: [Query.equal("client_id", clientCandidates)],
      timeoutMs: REQUEST_TIMEOUT_MS,
    });
    const parsedClientTables = parseTables(clientTables, clientId);
    const matchedTable = findTableForRoute(parsedClientTables, tableParam);
    if (matchedTable?.id) {
      return matchedTable;
    }
  } catch (queryError) {
    if (!isRecoverableQueryFailure(queryError)) {
      throw queryError;
    }
  }

  // Broad scan fallback when table indexes are missing or schema differs.
  const allTables = await fetchAllDocuments(appwriteConfig.collections.tables, {
    pageSize: 120,
    maxDocs: 1000,
    timeoutMs: REQUEST_TIMEOUT_MS,
  });
  const parsedAllTables = parseTables(allTables, clientId);
  return findTableForRoute(parsedAllTables, tableParam);
}

export default function QrOrderingExperience({
  client,
  table,
  initialView = "menu",
}: {
  client: string;
  table: string;
  initialView?: ExperienceViewMode;
}) {
  const router = useRouter();
  const routeClient = sanitizeRouteSegment(client, MAX_ROUTE_CLIENT_LENGTH);
  const routeTable = sanitizeRouteSegment(table, MAX_ROUTE_TABLE_LENGTH);
  const routeClientForPath = routeClient || client.trim();
  const routeTableForPath = routeTable || table.trim();
  const tableRoutePath = `/c/${encodeURIComponent(routeClientForPath)}/t/${encodeURIComponent(routeTableForPath)}`;
  const cartRoutePath = `${tableRoutePath}/cart`;
  const isStandaloneCartRoute = initialView === "cart";

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadingMessage, setLoadingMessage] = useState("Loading menu...");
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");

  const [restaurantName, setRestaurantName] = useState("Cafe");
  const [branding, setBranding] = useState<RestaurantBranding | null>(null);
  const [clientSettings, setClientSettings] = useState<RestaurantSettings>({
    restaurantName: "Cafe",
    currency: "INR",
    taxPercentage: 0,
    supportPhone: "",
    upiId: "",
    upiName: "",
    themeColor: PALETTE_ACCENT,
    logoUrl: "",
    heroImageUrl: "",
    tagline: "",
    rawDocs: [],
  });
  const [tableInfo, setTableInfo] = useState<RestaurantTable | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [offersToday, setOffersToday] = useState<Offer[]>([]);

  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedModifiersByItem, setSelectedModifiersByItem] = useState<
    Record<string, SelectedModifier[]>
  >({});
  const [kitchenInstructions, setKitchenInstructions] = useState("");
  const [isCartHydrated, setIsCartHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COUNTER");
  const [canLaunchUpiDeepLink, setCanLaunchUpiDeepLink] = useState(false);
  const [lastUpiLaunchUri, setLastUpiLaunchUri] = useState("");
  const [upiQrUri, setUpiQrUri] = useState("");
  const [upiQrAmount, setUpiQrAmount] = useState("");
  const [upiQrOpen, setUpiQrOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [billSyncing, setBillSyncing] = useState(false);
  const [billSyncMessage, setBillSyncMessage] = useState("");
  const [statusPopup, setStatusPopup] = useState<StatusPopupState | null>(null);
  const [orderPlacedId, setOrderPlacedId] = useState("");
  const [billActionOrderId, setBillActionOrderId] = useState("");
  const [activeOrderContext, setActiveOrderContext] = useState<ActiveOrderContext | null>(
    null,
  );
  const [tableOrders, setTableOrders] = useState<TableOrderRecord[]>([]);
  const [billLastActivityAt, setBillLastActivityAt] = useState("");
  const [customerBrowserId, setCustomerBrowserId] = useState("");
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const placeOrderLockRef = useRef(false);
  const tableOrdersRef = useRef<TableOrderRecord[]>([]);
  const activeOrderContextRef = useRef<ActiveOrderContext | null>(null);
  const billLastActivityRef = useRef("");
  const orderSyncSnapshotRef = useRef<Record<string, { status: string; paymentStatus: string }>>({});
  const persistedCartStateRef = useRef<string | null>(null);
  const persistedBillStateRef = useRef<string | null>(null);
  const persistedSessionStateRef = useRef<string | null>(null);

  const activeCartStorageKey = useMemo(
    () => buildActiveCartStorageKey(routeClient, routeTable),
    [routeClient, routeTable],
  );
  const activeBillStorageKey = useMemo(
    () => buildActiveBillStorageKey(routeClient, routeTable),
    [routeClient, routeTable],
  );
  const activeSessionStorageKey = useMemo(
    () => buildActiveSessionStorageKey(routeClient, routeTable),
    [routeClient, routeTable],
  );
  const legacyTableSessionStorageKey = useMemo(
    () => `cart_${normalizeRouteToken(routeClient)}_${normalizeRouteToken(routeTable)}`,
    [routeClient, routeTable],
  );
  const customerHistoryStorageKey = useMemo(() => {
    if (!customerBrowserId) {
      return "";
    }
    return buildCustomerHistoryStorageKey(routeClient, customerBrowserId);
  }, [customerBrowserId, routeClient]);

  const isLightTheme = true;

  function touchBillActivity(activityAt = new Date().toISOString()) {
    setBillLastActivityAt(activityAt);
    billLastActivityRef.current = activityAt;
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.localStorage.getItem(CLIENT_CACHE_RESET_MARKER_KEY) === "done") {
      return;
    }

    const localKeysToRemove: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && isResettableClientCacheKey(key)) {
        localKeysToRemove.push(key);
      }
    }

    for (const key of localKeysToRemove) {
      window.localStorage.removeItem(key);
    }

    const sessionKeysToRemove: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key && isResettableClientCacheKey(key)) {
        sessionKeysToRemove.push(key);
      }
    }
    for (const key of sessionKeysToRemove) {
      window.sessionStorage.removeItem(key);
    }

    window.localStorage.setItem(CLIENT_CACHE_RESET_MARKER_KEY, "done");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    persistedCartStateRef.current = window.localStorage.getItem(activeCartStorageKey);
    persistedBillStateRef.current = window.localStorage.getItem(activeBillStorageKey);
    persistedSessionStateRef.current = window.localStorage.getItem(activeSessionStorageKey);
  }, [activeBillStorageKey, activeCartStorageKey, activeSessionStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const browserId = ensureBrowserCustomerId();
    setCustomerBrowserId(browserId);
    setCustomerProfile(
      parseCustomerProfile(window.localStorage.getItem(CUSTOMER_PROFILE_KEY), browserId),
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setCanLaunchUpiDeepLink(supportsUpiDeepLinkInBrowser());
  }, []);

  useEffect(() => {
    const preferred = customerProfile?.preferences?.preferredPaymentMethod;
    if (preferred) {
      setPaymentMethod(preferred);
    }
  }, [customerProfile?.preferences?.preferredPaymentMethod]);

  useEffect(() => {
    tableOrdersRef.current = tableOrders;
  }, [tableOrders]);

  useEffect(() => {
    activeOrderContextRef.current = activeOrderContext;
  }, [activeOrderContext]);

  useEffect(() => {
    billLastActivityRef.current = billLastActivityAt;
  }, [billLastActivityAt]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoadState("loading");
      setIsCartHydrated(false);
      setErrorMessage("");
      setNoticeMessage("");
      setBillSyncMessage("");
      setStatusPopup(null);
      setOrderPlacedId("");
      setActiveOrderContext(null);
      setTableOrders([]);
      setBillLastActivityAt("");
      tableOrdersRef.current = [];
      activeOrderContextRef.current = null;
      orderSyncSnapshotRef.current = {};
      setSearchText("");
      setBillOpen(false);
      setSelectedModifiersByItem({});
      setKitchenInstructions("");
      setOffersToday([]);

      try {
        if (!routeClient || !routeTable) {
          setTableInfo(null);
          setLoadState("invalid-table");
          setErrorMessage("This table QR format is invalid. Please use a valid QR.");
          return;
        }

        setLoadingMessage("Verifying table QR...");
        const matchedTable = await withTimeout(
          resolveRouteTable(routeClient, routeTable),
          REQUEST_TIMEOUT_MS,
          "Table verification",
        );

        if (cancelled) {
          return;
        }

        if (!matchedTable) {
          setTableInfo(null);
          setLoadState("invalid-table");
          setErrorMessage("This table QR is invalid. Please ask staff for the correct QR.");
          return;
        }

        setLoadingMessage("Loading menu...");
        const settingsPromise = fetchClientScopedDocuments(
          appwriteConfig.collections.settings,
          routeClient,
          { pageSize: 40, maxDocs: 120 },
        ).catch((error) => {
          if (isUnauthorizedError(error) || isRecoverableQueryFailure(error)) {
            return [] as Awaited<ReturnType<typeof fetchClientScopedDocuments>>;
          }
          console.warn("Settings fetch failed, continuing with defaults:", error);
          return [] as Awaited<ReturnType<typeof fetchClientScopedDocuments>>;
        });
        const offersPromise = fetchClientScopedDocuments(
          appwriteConfig.collections.offers,
          routeClient,
          { pageSize: 80, maxDocs: 240 },
        ).catch((error) => {
          if (isUnauthorizedError(error) || isRecoverableQueryFailure(error)) {
            return [] as Awaited<ReturnType<typeof fetchClientScopedDocuments>>;
          }
          console.warn("Offers fetch failed, continuing without offers:", error);
          return [] as Awaited<ReturnType<typeof fetchClientScopedDocuments>>;
        });
        const [categoryDocs, menuDocs] = await withTimeout(
          Promise.all([
            fetchClientScopedDocuments(appwriteConfig.collections.categories, routeClient, {
              pageSize: 80,
              maxDocs: 300,
            }),
            fetchClientScopedDocuments(appwriteConfig.collections.menuItems, routeClient, {
              pageSize: 120,
              maxDocs: 800,
            }),
          ]),
          REQUEST_TIMEOUT_MS,
          "Menu load",
        );

        if (cancelled) {
          return;
        }

        const parsedCategories = parseCategories(categoryDocs, routeClient);
        const parsedItems = parseMenuItems(menuDocs, routeClient);
        const fallbackCategories = buildFallbackCategories(parsedItems);
        const ensuredCategories =
          parsedCategories.length > 0
            ? mergeCategorySets(parsedCategories, fallbackCategories)
            : fallbackCategories;
        const fallbackSettings = parseClientSettings([], routeClient);
        setTableInfo(matchedTable);
        setClientSettings(fallbackSettings);
        setBranding(null);
        setCategories(ensuredCategories);
        setMenuItems(parsedItems);
        setRestaurantName(
          inferRestaurantName(routeClient, null, ensuredCategories, parsedItems),
        );
        setActiveCategory((current) =>
          current !== "all" && ensuredCategories.some((category) => category.id === current)
            ? current
            : "all",
        );
        setCartOpen(false);
        setBillOpen(false);

        let shouldResumeOrderSync = false;
        if (typeof window !== "undefined") {
          const activeCartState = parseActiveCartState(
            window.localStorage.getItem(activeCartStorageKey),
          );
          const localBillRaw = window.localStorage.getItem(activeBillStorageKey);
          const localSessionRaw = window.localStorage.getItem(activeSessionStorageKey);
          const legacySessionBillRaw = window.sessionStorage.getItem(activeBillStorageKey);
          const legacySessionStateRaw = window.sessionStorage.getItem(activeSessionStorageKey);
          if (!localBillRaw && legacySessionBillRaw) {
            window.localStorage.setItem(activeBillStorageKey, legacySessionBillRaw);
          }
          if (!localSessionRaw && legacySessionStateRaw) {
            window.localStorage.setItem(activeSessionStorageKey, legacySessionStateRaw);
          }
          if (legacySessionBillRaw) {
            window.sessionStorage.removeItem(activeBillStorageKey);
          }
          if (legacySessionStateRaw) {
            window.sessionStorage.removeItem(activeSessionStorageKey);
          }

          const activeBillState = parseActiveBillState(localBillRaw ?? legacySessionBillRaw);
          const activeSessionState = parseActiveSessionState(
            localSessionRaw ?? legacySessionStateRaw,
          );
          const legacySession = parseLegacyPersistedSession(
            window.localStorage.getItem(legacyTableSessionStorageKey),
          );

          const cartForRoute = isRecordForRoute(activeCartState, routeClient, routeTable)
            ? activeCartState
            : null;
          const billForRoute = isRecordForRoute(activeBillState, routeClient, routeTable)
            ? activeBillState
            : null;
          const sessionForRoute = isRecordForRoute(activeSessionState, routeClient, routeTable)
            ? activeSessionState
            : null;
          const legacyForRoute = isRecordForRoute(legacySession, routeClient, routeTable)
            ? legacySession
            : null;

          if (legacyForRoute) {
            const nowIso = new Date().toISOString();
            if (!cartForRoute && Object.keys(legacyForRoute.cart).length > 0) {
              const migratedCart: ActiveTableCartState = {
                version: ACTIVE_TABLE_STORAGE_VERSION,
                client: routeClient,
                table: routeTable,
                cart: legacyForRoute.cart,
                selectedModifiersByItem: {},
                kitchenInstructions: "",
                updatedAt: legacyForRoute.updatedAt || nowIso,
              };
              window.localStorage.setItem(activeCartStorageKey, JSON.stringify(migratedCart));
            }

            if (
              !billForRoute &&
              legacyForRoute.activeOrder &&
              !isOrderClosed(
                legacyForRoute.activeOrder.status,
                legacyForRoute.activeOrder.paymentStatus,
              )
            ) {
              const migratedBill: ActiveTableBillState = {
                version: ACTIVE_TABLE_STORAGE_VERSION,
                client: routeClient,
                table: routeTable,
                activeOrder: legacyForRoute.activeOrder,
                orders: [],
                lastActivityAt:
                  legacyForRoute.activeOrder?.updatedAt || legacyForRoute.updatedAt || nowIso,
                updatedAt: legacyForRoute.activeOrder.updatedAt || legacyForRoute.updatedAt || nowIso,
              };
              window.localStorage.setItem(activeBillStorageKey, JSON.stringify(migratedBill));
            }

            if (!sessionForRoute) {
              const migratedSession: ActiveTableSessionState = {
                version: ACTIVE_TABLE_STORAGE_VERSION,
                client: routeClient,
                table: routeTable,
                hasCart: Object.keys(legacyForRoute.cart).length > 0,
                hasBillOrders: false,
                activeOrder: legacyForRoute.activeOrder,
                lastActivityAt: legacyForRoute.updatedAt || nowIso,
                updatedAt: legacyForRoute.updatedAt || nowIso,
              };
              window.localStorage.setItem(
                activeSessionStorageKey,
                JSON.stringify(migratedSession),
              );
            }

            window.localStorage.removeItem(legacyTableSessionStorageKey);
          }

          const hydratedCart: Record<string, number> = {};
          const hydratedModifiers: Record<string, SelectedModifier[]> = {};
          let restoredInstructions = "";
          const validIds = new Set(parsedItems.map((item) => item.id));
          const cartSource = cartForRoute?.cart ?? legacyForRoute?.cart ?? {};
          const modifierSource = cartForRoute?.selectedModifiersByItem ?? {};
          restoredInstructions = sanitizeInstructionText(cartForRoute?.kitchenInstructions ?? "");

          for (const [itemId, qtyValue] of Object.entries(cartSource)) {
              const qty = toPositiveQuantity(qtyValue);
              if (qty > 0 && validIds.has(itemId)) {
                hydratedCart[itemId] = qty;
              }
          }

          for (const [itemId, selected] of Object.entries(modifierSource)) {
            if (!hydratedCart[itemId]) {
              continue;
            }
            const parsedModifiers = parseSelectedModifierList(selected);
            if (parsedModifiers.length > 0) {
              hydratedModifiers[itemId] = parsedModifiers;
            }
          }

          let restoredOrder =
            billForRoute?.activeOrder ??
            sessionForRoute?.activeOrder ??
            legacyForRoute?.activeOrder ??
            null;
          const persistedOrders = billForRoute?.orders ?? [];
          const restoredBillActivityAt =
            billForRoute?.lastActivityAt ||
            sessionForRoute?.lastActivityAt ||
            billForRoute?.updatedAt ||
            sessionForRoute?.updatedAt ||
            legacyForRoute?.updatedAt ||
            "";
          const restoredOrders = applyBillInactivityPolicy(
            persistedOrders,
            restoredBillActivityAt,
          );
          const nextBillActivityAt =
            restoredBillActivityAt || (restoredOrders.length > 0 || restoredOrder ? new Date().toISOString() : "");
          setBillLastActivityAt(nextBillActivityAt);
          billLastActivityRef.current = nextBillActivityAt;

          if (!restoredOrder && restoredOrders.length > 0) {
            restoredOrder = getLatestOrderContextFromRecords(restoredOrders);
          }
          if (restoredOrder && !restoredOrders.some((order) => order.orderId === restoredOrder?.id)) {
            restoredOrder = getLatestOrderContextFromRecords(restoredOrders);
          }

          shouldResumeOrderSync =
            !!billForRoute ||
            !!sessionForRoute ||
            !!legacyForRoute ||
            Object.keys(cartSource).length > 0 ||
            restoredOrders.length > 0 ||
            !!restoredOrder;

          if (restoredOrder) {
            setActiveOrderContext(restoredOrder);
            activeOrderContextRef.current = restoredOrder;
            setOrderPlacedId(restoredOrder.id);
            setTableOrders(restoredOrders);
            tableOrdersRef.current = restoredOrders;
            syncOrderSnapshot(restoredOrders);
          } else {
            setActiveOrderContext(null);
            activeOrderContextRef.current = null;
            setTableOrders(restoredOrders);
            tableOrdersRef.current = restoredOrders;
            syncOrderSnapshot(restoredOrders);
          }

          setCart(hydratedCart);
          setSelectedModifiersByItem(hydratedModifiers);
          setKitchenInstructions(restoredInstructions);
        } else {
          setCart({});
          setSelectedModifiersByItem({});
          setKitchenInstructions("");
          setTableOrders([]);
          tableOrdersRef.current = [];
          syncOrderSnapshot([]);
        }

        setLoadState("ready");
        setIsCartHydrated(true);

        // Settings are non-critical for first paint; apply them after menu is ready.
        void settingsPromise.then((settingsDocs) => {
          if (cancelled || settingsDocs.length === 0) {
            return;
          }

          const normalizedSettings = parseClientSettings(settingsDocs, routeClient);
          const brandingSettings = parseBrandingSettings(settingsDocs, routeClient);

          setClientSettings(normalizedSettings);
          setBranding(brandingSettings);
          setRestaurantName(
            normalizedSettings.restaurantName ||
              inferRestaurantName(routeClient, brandingSettings, ensuredCategories, parsedItems),
          );
        });

        void offersPromise.then((offerDocs) => {
          if (cancelled) {
            return;
          }
          setOffersToday(parseActiveOffers(offerDocs, routeClient, new Date()));
        });

        // Sync backend orders in background so first load does not wait on order-history calls.
        if (ENABLE_BACKEND_ORDER_SYNC && shouldResumeOrderSync) {
          void (async () => {
            try {
              const backendOrders = await withTimeout(
                fetchTableOrderRecords(matchedTable.clientId || routeClient, matchedTable.id),
                BILL_SYNC_TIMEOUT_MS,
                "Initial bill sync",
              );
              if (cancelled || backendOrders.length === 0) {
                return;
              }

              applyBackendOrders(backendOrders);
            } catch (syncError) {
              if (!cancelled) {
                console.warn("Initial bill sync failed:", syncError);
              }
            }
          })();
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error(error);
        setLoadState("error");
        const message = getErrorMessage(error).toLowerCase();
        if (message.includes("timed out")) {
          setErrorMessage("Loading is taking longer than expected. Please check internet and retry.");
        } else if (message.includes("project") || message.includes("database")) {
          setErrorMessage("Appwrite configuration issue detected. Please verify project and database settings.");
        } else if (message.includes("network") || message.includes("fetch")) {
          setErrorMessage("Network issue detected. Please check internet and try again.");
        } else {
          setErrorMessage("Unable to load data from Appwrite right now. Please retry.");
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [
    activeBillStorageKey,
    activeCartStorageKey,
    activeSessionStorageKey,
    legacyTableSessionStorageKey,
    reloadKey,
    routeClient,
    routeTable,
  ]);

  useEffect(() => {
    if (!tableInfo || loadState !== "ready") {
      return;
    }

    const hasTrackableOrder =
      tableOrders.length > 0 || !!activeOrderContext?.id || !!orderPlacedId;
    if (!hasTrackableOrder) {
      return;
    }

    let cancelled = false;

    const intervalId = setInterval(() => {
      void (async () => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
          return;
        }
        if (typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine) {
          return;
        }
        try {
          const backendRecords = await withTimeout(
            fetchTableOrderRecords(tableInfo.clientId || routeClient, tableInfo.id),
            BILL_SYNC_TIMEOUT_MS,
            "Status watch sync",
          );
          if (cancelled || backendRecords.length === 0) {
            return;
          }

          const applyResult = applyBackendOrders(backendRecords);
          if (applyResult === "closed") {
            setBillSyncMessage("Bill is already settled. You can start a fresh order now.");
          }
        } catch {
          // Keep status watcher silent in background to avoid noisy UI.
        }
      })();
    }, ORDER_STATUS_WATCH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [
    activeOrderContext?.id,
    loadState,
    orderPlacedId,
    routeClient,
    tableInfo,
    tableOrders.length,
  ]);

  useEffect(() => {
    if (!isCartHydrated || typeof window === "undefined") {
      return;
    }

    const nowIso = new Date().toISOString();
    const hasCart = Object.keys(cart).length > 0;
    const hasModifierSelections = Object.keys(selectedModifiersByItem).length > 0;
    const hasInstructions = kitchenInstructions.trim().length > 0;
    const hasOpenOrder =
      !!activeOrderContext &&
      !isOrderClosed(activeOrderContext.status, activeOrderContext.paymentStatus);
    const hasBillOrders = tableOrders.length > 0;
    const effectiveBillLastActivityAt =
      billLastActivityAt ||
      activeOrderContext?.updatedAt ||
      tableOrders[0]?.updatedAt ||
      nowIso;

    const activeCartState: ActiveTableCartState = {
      version: ACTIVE_TABLE_STORAGE_VERSION,
      client: routeClient,
      table: routeTable,
      cart,
      selectedModifiersByItem,
      kitchenInstructions: kitchenInstructions.trim(),
      updatedAt: nowIso,
    };

    const activeBillState: ActiveTableBillState = {
      version: ACTIVE_TABLE_STORAGE_VERSION,
      client: routeClient,
      table: routeTable,
      activeOrder: hasOpenOrder ? activeOrderContext : null,
      orders: tableOrders,
      lastActivityAt: effectiveBillLastActivityAt,
      updatedAt: activeOrderContext?.updatedAt || nowIso,
    };

    const activeSessionState: ActiveTableSessionState = {
      version: ACTIVE_TABLE_STORAGE_VERSION,
      client: routeClient,
      table: routeTable,
      hasCart,
      hasBillOrders,
      activeOrder: hasOpenOrder ? activeOrderContext : null,
      lastActivityAt: effectiveBillLastActivityAt,
      updatedAt: nowIso,
    };

    const cartStatePayload = JSON.stringify(activeCartState);
    const billStatePayload = JSON.stringify(activeBillState);
    const sessionStatePayload = JSON.stringify(activeSessionState);

    if (hasCart || hasModifierSelections || hasInstructions) {
      if (persistedCartStateRef.current !== cartStatePayload) {
        window.localStorage.setItem(activeCartStorageKey, cartStatePayload);
        persistedCartStateRef.current = cartStatePayload;
      }
    } else {
      if (persistedCartStateRef.current !== null) {
        window.localStorage.removeItem(activeCartStorageKey);
        persistedCartStateRef.current = null;
      }
    }

    if (hasOpenOrder || hasBillOrders) {
      if (persistedBillStateRef.current !== billStatePayload) {
        window.localStorage.setItem(activeBillStorageKey, billStatePayload);
        persistedBillStateRef.current = billStatePayload;
      }
      window.sessionStorage.removeItem(activeBillStorageKey);
    } else {
      if (persistedBillStateRef.current !== null) {
        window.localStorage.removeItem(activeBillStorageKey);
        persistedBillStateRef.current = null;
      }
      window.sessionStorage.removeItem(activeBillStorageKey);
    }

    if (hasCart || hasOpenOrder || hasBillOrders) {
      if (persistedSessionStateRef.current !== sessionStatePayload) {
        window.localStorage.setItem(activeSessionStorageKey, sessionStatePayload);
        persistedSessionStateRef.current = sessionStatePayload;
      }
      window.sessionStorage.removeItem(activeSessionStorageKey);
    } else {
      if (persistedSessionStateRef.current !== null) {
        window.localStorage.removeItem(activeSessionStorageKey);
        persistedSessionStateRef.current = null;
      }
      window.sessionStorage.removeItem(activeSessionStorageKey);
    }

    window.localStorage.removeItem(legacyTableSessionStorageKey);
  }, [
    activeOrderContext,
    activeBillStorageKey,
    activeCartStorageKey,
    activeSessionStorageKey,
    cart,
    kitchenInstructions,
    isCartHydrated,
    legacyTableSessionStorageKey,
    routeClient,
    routeTable,
    selectedModifiersByItem,
    tableOrders,
    billLastActivityAt,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeCategory]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // No service worker/PWA cache exists in this repo now, but users can still have
    // stale old registrations from earlier deployments that may serve wrong cached
    // responses for `/api/appwrite/assets` on mobile.
    const cleanupStaleServiceWorkerCache = async () => {
      const cleanupFlagKey = "cafeluxe_mobile_cache_cleanup_done";
      const cleanupAlreadyDone =
        typeof window.sessionStorage !== "undefined" &&
        window.sessionStorage.getItem(cleanupFlagKey) === "1";
      if (cleanupAlreadyDone) {
        return;
      }

      let didMutateRuntimeCache = false;

      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map(async (registration) => {
              try {
                const unregistered = await registration.unregister();
                if (unregistered) {
                  didMutateRuntimeCache = true;
                }
              } catch {
                // Ignore unregister failures.
              }
            }),
          );
        }
      } catch {
        // Ignore service worker registry read failures.
      }

      try {
        const hasCacheStorage = typeof window.caches !== "undefined";
        if (!hasCacheStorage) {
          if (typeof window.sessionStorage !== "undefined") {
            window.sessionStorage.setItem(cleanupFlagKey, "1");
          }
          return;
        }
        const cacheNames = await window.caches.keys();
        await Promise.all(
          cacheNames.map(async (cacheName) => {
            try {
              const deleted = await window.caches.delete(cacheName);
              if (deleted) {
                didMutateRuntimeCache = true;
              }
            } catch {
              // Ignore delete failures.
            }
          }),
        );
      } catch {
        // Ignore Cache Storage cleanup failures.
      }

      if (typeof window.sessionStorage !== "undefined") {
        window.sessionStorage.setItem(cleanupFlagKey, "1");
      }

      if (didMutateRuntimeCache && typeof window.location !== "undefined") {
        window.location.reload();
      }
    };

    let cancelled = false;
    const runCleanup = () => {
      if (cancelled) {
        return;
      }
      void cleanupStaleServiceWorkerCache();
    };

    if ("requestIdleCallback" in window && typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(() => {
        runCleanup();
      }, { timeout: 2000 });

      return () => {
        cancelled = true;
        if ("cancelIdleCallback" in window && typeof window.cancelIdleCallback === "function") {
          window.cancelIdleCallback(idleId);
        }
      };
    }

    const timerId = window.setTimeout(() => {
      runCleanup();
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, []);

  const deferredSearchText = useDeferredValue(searchText);
  const visibleItems = useMemo(() => {
    const normalizedSearch = deferredSearchText.trim().toLowerCase();
    const selectedCategory =
      activeCategory === "all"
        ? null
        : categories.find((category) => category.id === activeCategory) ?? null;

    return menuItems.filter((item) => {
      const inCategory = !selectedCategory || matchesCategory(item, selectedCategory);

      if (!inCategory) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${item.name} ${item.nameHi} ${item.description}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [activeCategory, categories, deferredSearchText, menuItems]);

  const cartItems = useMemo(() => {
    const items: CartItem[] = [];
    for (const menuItem of menuItems) {
      const quantity = cart[menuItem.id] ?? 0;
      if (quantity > 0) {
        items.push({ item: menuItem, quantity });
      }
    }
    return items;
  }, [cart, menuItems]);

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems],
  );

  useEffect(() => {
    setSelectedModifiersByItem((current) => {
      const next: Record<string, SelectedModifier[]> = {};
      let changed = false;

      for (const [itemId, selections] of Object.entries(current)) {
        if ((cart[itemId] ?? 0) > 0 && selections.length > 0) {
          next[itemId] = selections;
          continue;
        }
        changed = true;
      }

      if (!changed && Object.keys(next).length === Object.keys(current).length) {
        return current;
      }
      return next;
    });
  }, [cart]);

  const modifierOptionsByItem = useMemo(() => {
    const mapping: Record<string, ModifierOption[]> = {};
    for (const item of menuItems) {
      mapping[item.id] = getModifierOptionsForMenuItem(item);
    }
    return mapping;
  }, [menuItems]);

  const resolvedSelectedModifiersByItem = useMemo(() => {
    const resolved: Record<string, SelectedModifier[]> = {};

    for (const { item } of cartItems) {
      const selected = selectedModifiersByItem[item.id] ?? [];
      if (selected.length === 0) {
        continue;
      }
      const options = modifierOptionsByItem[item.id] ?? [];
      const optionLookup = new Map(options.map((option) => [option.id, option]));

      const seen = new Set<string>();
      const sanitized = selected
        .map((entry) => {
          const matched = optionLookup.get(entry.id);
          if (!matched || seen.has(matched.id)) {
            return null;
          }
          seen.add(matched.id);
          return {
            id: matched.id,
            label: matched.label,
            price: matched.price,
          } satisfies SelectedModifier;
        })
        .filter((entry): entry is SelectedModifier => !!entry)
        .slice(0, 12);

      if (sanitized.length > 0) {
        resolved[item.id] = sanitized;
      }
    }

    return resolved;
  }, [cartItems, modifierOptionsByItem, selectedModifiersByItem]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((totalAmount, cartItem) => {
      const selected = resolvedSelectedModifiersByItem[cartItem.item.id] ?? [];
      const modifierUnitTotal = getSelectedModifierTotal(selected);
      const unitPrice = cartItem.item.price + modifierUnitTotal;
      return totalAmount + unitPrice * cartItem.quantity;
    }, 0);
  }, [cartItems, resolvedSelectedModifiersByItem]);

  const hasCustomizationsInCart = useMemo(
    () => Object.keys(resolvedSelectedModifiersByItem).length > 0,
    [resolvedSelectedModifiersByItem],
  );

  const normalizedCurrency = useMemo(() => {
    const code = clientSettings.currency.trim().toUpperCase();
    return code || "INR";
  }, [clientSettings.currency]);
  const taxPercentage = useMemo(
    () => Math.min(100, Math.max(0, clientSettings.taxPercentage || 0)),
    [clientSettings.taxPercentage],
  );
  const taxAmount = useMemo(
    () => Number(((subtotal * taxPercentage) / 100).toFixed(2)),
    [subtotal, taxPercentage],
  );
  const total = subtotal + taxAmount;
  const formatMoney = (value: number) => formatInr(value, normalizedCurrency);
  const cartOfferEvaluationLines = useMemo(() => {
    return cartItems.map((cartItem) => {
      const selected = resolvedSelectedModifiersByItem[cartItem.item.id] ?? [];
      const modifierUnitTotal = getSelectedModifierTotal(selected);
      const unitPrice = cartItem.item.price + modifierUnitTotal;
      return {
        itemId: cartItem.item.id,
        name: cartItem.item.name,
        quantity: cartItem.quantity,
        unitPrice,
        lineTotal: roundCurrency(unitPrice * cartItem.quantity),
        categoryRefs: cartItem.item.categoryRefs,
      } satisfies OfferEvaluationLine;
    });
  }, [cartItems, resolvedSelectedModifiersByItem]);
  const applicableCartOffers = useMemo(
    () => evaluateApplicableOffers(offersToday, cartOfferEvaluationLines, subtotal),
    [cartOfferEvaluationLines, offersToday, subtotal],
  );
  const bestCartOffer = useMemo(
    () => pickBestApplicableOffer(applicableCartOffers, total),
    [applicableCartOffers, total],
  );
  const cartOfferDiscountAmount = bestCartOffer?.discountAmount ?? 0;
  const cartPayableTotal = roundCurrency(Math.max(0, total - cartOfferDiscountAmount));

  const mergedBillItems = useMemo(
    () => mergeBillItemsFromOrders(tableOrders, menuItems),
    [menuItems, tableOrders],
  );

  const billSubtotal = useMemo(
    () => mergedBillItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [mergedBillItems],
  );
  const billGrandTotal = useMemo(() => {
    return tableOrders.reduce((sum, order) => {
      if (order.totalAmount > 0) {
        return sum + order.totalAmount;
      }
      if (order.subtotal > 0) {
        return sum + order.subtotal;
      }
      return sum + order.items.reduce((innerSum, item) => innerSum + item.lineTotal, 0);
    }, 0);
  }, [tableOrders]);
  const billTaxAmount = useMemo(() => {
    if (billGrandTotal > billSubtotal) {
      return billGrandTotal - billSubtotal;
    }
    if (taxPercentage > 0 && billSubtotal > 0) {
      return Number(((billSubtotal * taxPercentage) / 100).toFixed(2));
    }
    return 0;
  }, [billGrandTotal, billSubtotal, taxPercentage]);
  const billFinalTotal = billSubtotal + billTaxAmount;
  const latestBillOrder = getPreferredBillOrder(tableOrders);
  const latestBillPaymentMethod = latestBillOrder?.paymentMethod ?? paymentMethod;
  const latestBillStatus = activeOrderContext?.status ?? latestBillOrder?.status ?? "PENDING";
  const latestBillPaymentStatus =
    activeOrderContext?.paymentStatus ?? latestBillOrder?.paymentStatus ?? "UNPAID";
  const latestBillUpdatedAt =
    activeOrderContext?.updatedAt ??
    latestBillOrder?.updatedAt ??
    latestBillOrder?.createdAt ??
    "";
  const topCardOrderStatusRaw =
    toSafeString(activeOrderContext?.status) || toSafeString(latestBillOrder?.status);
  const topCardPaymentStatusRaw =
    toSafeString(activeOrderContext?.paymentStatus) ||
    toSafeString(latestBillOrder?.paymentStatus);
  const showTopCardStatus = !!topCardOrderStatusRaw;

  const unpaidOrders = useMemo(
    () =>
      tableOrders.filter((order) => !isOrderClosed(order.status, order.paymentStatus)),
    [tableOrders],
  );
  const unpaidMergedItems = useMemo(
    () => mergeBillItemsFromOrders(unpaidOrders, menuItems),
    [menuItems, unpaidOrders],
  );
  const unpaidSubtotal = useMemo(
    () => unpaidMergedItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [unpaidMergedItems],
  );
  const unpaidGrandTotal = useMemo(() => {
    return unpaidOrders.reduce((sum, order) => {
      if (order.totalAmount > 0) {
        return sum + order.totalAmount;
      }
      if (order.subtotal > 0) {
        return sum + order.subtotal;
      }
      return sum + order.items.reduce((innerSum, item) => innerSum + item.lineTotal, 0);
    }, 0);
  }, [unpaidOrders]);
  const unpaidTaxAmount = useMemo(() => {
    if (unpaidGrandTotal > unpaidSubtotal) {
      return unpaidGrandTotal - unpaidSubtotal;
    }
    if (taxPercentage > 0 && unpaidSubtotal > 0) {
      return Number(((unpaidSubtotal * taxPercentage) / 100).toFixed(2));
    }
    return 0;
  }, [taxPercentage, unpaidGrandTotal, unpaidSubtotal]);
  const unpaidFinalTotal = unpaidSubtotal + unpaidTaxAmount;
  const hasAggregatedUnpaidBill = unpaidOrders.length > 0;
  const aggregatedUnpaidOrder = useMemo(
    () => getPreferredBillOrder(unpaidOrders),
    [unpaidOrders],
  );
  const currentBillOrderNumber = hasAggregatedUnpaidBill
    ? unpaidOrders.length === 1
      ? (aggregatedUnpaidOrder?.orderNumber ?? "Unpaid Bill")
      : `${unpaidOrders.length} Unpaid Orders`
    : (latestBillOrder?.orderNumber ?? "Order");
  const currentBillPaymentMethod: PaymentMethod = hasAggregatedUnpaidBill
    ? unpaidOrders.some((order) => order.paymentMethod === "UPI")
      ? "UPI"
      : "COUNTER"
    : latestBillPaymentMethod;
  const currentBillStatus = hasAggregatedUnpaidBill
    ? (aggregatedUnpaidOrder?.status ?? "PENDING")
    : latestBillStatus;
  const currentBillPaymentStatus = hasAggregatedUnpaidBill
    ? (aggregatedUnpaidOrder?.paymentStatus ?? "UNPAID")
    : latestBillPaymentStatus;
  const currentBillUpdatedAt = hasAggregatedUnpaidBill
    ? (aggregatedUnpaidOrder?.updatedAt ??
      aggregatedUnpaidOrder?.createdAt ??
      latestBillUpdatedAt)
    : latestBillUpdatedAt;
  const currentBillItems = hasAggregatedUnpaidBill
    ? unpaidMergedItems
    : mergedBillItems;
  const currentBillSubtotal = hasAggregatedUnpaidBill ? unpaidSubtotal : billSubtotal;
  const currentBillTaxAmount = hasAggregatedUnpaidBill ? unpaidTaxAmount : billTaxAmount;
  const currentBillFinalTotal = hasAggregatedUnpaidBill ? unpaidFinalTotal : billFinalTotal;
  const menuItemLookup = useMemo(
    () => new Map(menuItems.map((item) => [item.id, item])),
    [menuItems],
  );
  const billOfferEvaluationLines = useMemo(() => {
    return currentBillItems.map((lineItem) => {
      const menuItem = menuItemLookup.get(lineItem.itemId);
      return {
        itemId: lineItem.itemId,
        name: lineItem.name,
        quantity: lineItem.quantity,
        unitPrice: lineItem.unitPrice,
        lineTotal: lineItem.lineTotal,
        categoryRefs: menuItem?.categoryRefs ?? [],
      } satisfies OfferEvaluationLine;
    });
  }, [currentBillItems, menuItemLookup]);
  const applicableBillOffers = useMemo(
    () => evaluateApplicableOffers(offersToday, billOfferEvaluationLines, currentBillSubtotal),
    [billOfferEvaluationLines, currentBillSubtotal, offersToday],
  );
  const bestBillOffer = useMemo(
    () => pickBestApplicableOffer(applicableBillOffers, currentBillFinalTotal),
    [applicableBillOffers, currentBillFinalTotal],
  );
  const billOfferDiscountAmount = bestBillOffer?.discountAmount ?? 0;
  const billPayableTotal = roundCurrency(Math.max(0, currentBillFinalTotal - billOfferDiscountAmount));
  const currentBillInstructions = useMemo(() => {
    if (!hasAggregatedUnpaidBill) {
      return latestBillOrder?.instructions?.trim() ?? "";
    }
    const uniqueInstructions = new Set<string>();
    for (const order of unpaidOrders) {
      const instruction = order.instructions.trim();
      if (instruction) {
        uniqueInstructions.add(instruction);
      }
    }
    return [...uniqueInstructions].join(" | ");
  }, [hasAggregatedUnpaidBill, latestBillOrder, unpaidOrders]);
  const counterUnpaidOrders = useMemo(
    () => unpaidOrders.filter((order) => order.paymentMethod === "COUNTER"),
    [unpaidOrders],
  );
  const upiUnpaidOrders = useMemo(
    () => unpaidOrders.filter((order) => order.paymentMethod === "UPI"),
    [unpaidOrders],
  );
  const unpaidTotal = billPayableTotal;

  function updateItemQuantity(itemId: string, delta: number) {
    setCart((current) => {
      const oldQty = current[itemId] ?? 0;
      const nextQty = Math.max(0, oldQty + delta);
      if (nextQty === 0) {
        const cloned = { ...current };
        delete cloned[itemId];
        return cloned;
      }
      return { ...current, [itemId]: nextQty };
    });
  }

  function clearCart() {
    setCart({});
    setSelectedModifiersByItem({});
    setKitchenInstructions("");
  }

  function toggleModifierSelection(itemId: string, option: ModifierOption) {
    setSelectedModifiersByItem((current) => {
      const existing = current[itemId] ?? [];
      const isSelected = existing.some((entry) => entry.id === option.id);

      let nextSelection: SelectedModifier[];
      if (isSelected) {
        nextSelection = existing.filter((entry) => entry.id !== option.id);
      } else {
        nextSelection = [
          ...existing,
          {
            id: option.id,
            label: option.label,
            price: option.price,
          },
        ];
      }

      const next = { ...current };
      if (nextSelection.length > 0) {
        next[itemId] = nextSelection;
      } else {
        delete next[itemId];
      }
      return next;
    });
  }

  function showStatusPopup(nextPopup: StatusPopupState) {
    setStatusPopup(nextPopup);
  }

  function syncOrderSnapshot(records: TableOrderRecord[]) {
    orderSyncSnapshotRef.current = records.reduce(
      (accumulator, record) => {
        accumulator[record.orderId] = {
          status: record.status.trim().toUpperCase(),
          paymentStatus: record.paymentStatus.trim().toUpperCase(),
        };
        return accumulator;
      },
      {} as Record<string, { status: string; paymentStatus: string }>,
    );
  }

  function checkBackendTransitions(records: TableOrderRecord[]) {
    const previousSnapshot = orderSyncSnapshotRef.current;
    let paymentConfirmedRecord: TableOrderRecord | null = null;
    let orderReadyRecord: TableOrderRecord | null = null;
    let orderAcceptedRecord: TableOrderRecord | null = null;

    for (const record of records) {
      const previous = previousSnapshot[record.orderId];
      if (!previous) {
        continue;
      }

      const currentStatus = record.status.trim().toUpperCase();
      const currentPaymentStatus = record.paymentStatus.trim().toUpperCase();
      const previousStatus = previous.status;
      const previousPaymentStatus = previous.paymentStatus;

      if (
        !isPaymentConfirmed(previousPaymentStatus) &&
        isPaymentConfirmed(currentPaymentStatus)
      ) {
        paymentConfirmedRecord = record;
        continue;
      }

      if (previousStatus !== "READY" && currentStatus === "READY") {
        orderReadyRecord = record;
        continue;
      }

      if (!isOrderAccepted(previousStatus) && isOrderAccepted(currentStatus)) {
        orderAcceptedRecord = record;
      }
    }

    syncOrderSnapshot(records);

    if (paymentConfirmedRecord) {
      showStatusPopup({
        title: "Payment Confirmed",
        description: `${paymentConfirmedRecord.orderNumber} is confirmed by cashier.`,
        tone: "success",
      });
      return;
    }

    if (orderReadyRecord) {
      showStatusPopup({
        title: "Order Ready",
        description: `${orderReadyRecord.orderNumber} is ready to serve.`,
        tone: "success",
      });
      return;
    }

    if (orderAcceptedRecord) {
      const statusLabel = getOrderStatusLabel(orderAcceptedRecord.status);
      showStatusPopup({
        title: "Order Accepted",
        description: `${orderAcceptedRecord.orderNumber} is now ${statusLabel.toLowerCase()}.`,
        tone: "info",
      });
    }
  }

  function applyBackendOrders(backendRecords: TableOrderRecord[]) {
    if (backendRecords.length === 0) {
      return "none" as const;
    }

    const mergedRecords = mergeTableOrderRecords(tableOrdersRef.current, backendRecords);
    checkBackendTransitions(mergedRecords);
    const activityMarker = billLastActivityRef.current;
    const previousVisibleRecords = applyBillInactivityPolicy(
      tableOrdersRef.current,
      activityMarker,
    );
    const visibleRecords = applyBillInactivityPolicy(mergedRecords, activityMarker);
    const previousSignature = previousVisibleRecords
      .map(
        (record) =>
          `${record.orderId}:${record.status}:${record.paymentStatus}:${record.totalAmount}:${record.updatedAt}`,
      )
      .join("|");
    const nextSignature = visibleRecords
      .map(
        (record) =>
          `${record.orderId}:${record.status}:${record.paymentStatus}:${record.totalAmount}:${record.updatedAt}`,
      )
      .join("|");
    if (previousSignature !== nextSignature) {
      touchBillActivity();
    }

    tableOrdersRef.current = visibleRecords;
    setTableOrders(visibleRecords);

    const openRecords = visibleRecords.filter(
      (record) => !isOrderClosed(record.status, record.paymentStatus),
    );
    const latestContext = getLatestOrderContextFromRecords(openRecords);
    if (!latestContext) {
      setActiveOrderContext(null);
      activeOrderContextRef.current = null;
      setOrderPlacedId("");
      syncOrderSnapshot(visibleRecords);
      if (typeof window !== "undefined") {
        if (visibleRecords.length === 0) {
          window.localStorage.removeItem(activeBillStorageKey);
          window.localStorage.removeItem(activeSessionStorageKey);
          window.sessionStorage.removeItem(activeBillStorageKey);
          window.sessionStorage.removeItem(activeSessionStorageKey);
        }
      }
      return mergedRecords.length > 0 ? ("closed" as const) : ("applied" as const);
    }

    setActiveOrderContext(latestContext);
    activeOrderContextRef.current = latestContext;
    setOrderPlacedId(latestContext.id);
    return "applied" as const;
  }

  async function updateUnpaidOrder(
    order: TableOrderRecord,
    payloadCandidates: Record<string, unknown>[],
    localUpdater: (current: TableOrderRecord) => TableOrderRecord,
    successMessage: string,
  ) {
    setBillActionOrderId(order.orderId);
    setBillSyncMessage("");

    try {
      await updateDocumentWithFallback(
        appwriteConfig.collections.orders,
        order.orderId,
        payloadCandidates,
      );

      setTableOrders((current) =>
        current.map((entry) => (entry.orderId === order.orderId ? localUpdater(entry) : entry)),
      );
      setBillSyncMessage(successMessage);
      return true;
    } catch (error) {
      console.error(error);
      const message = getErrorMessage(error).toLowerCase();
      const permissionIssue =
        message.includes("not authorized") ||
        message.includes("user_unauthorized") ||
        message.includes("missing scope") ||
        message.includes("401");
      const missingOrderIssue =
        message.includes("not found") ||
        message.includes("document with the requested id") ||
        message.includes("document not found") ||
        message.includes("404");
      if (missingOrderIssue) {
        setBillSyncMessage("This bill is not available for switching anymore. Please refresh.");
      } else if (permissionIssue) {
        setBillSyncMessage("This bill cannot be switched from the current session. Please ask staff.");
      } else {
        setBillSyncMessage("Unable to update bill right now. Please retry.");
      }
      return false;
    } finally {
      setBillActionOrderId("");
    }
  }

  async function switchUnpaidBillToUpi(order: TableOrderRecord) {
    if (order.paymentMethod === "UPI") {
      return true;
    }

    const nowIso = new Date().toISOString();
    touchBillActivity(nowIso);
    const payloadCandidates: Record<string, unknown>[] = [
      {
        payment_method: "UPI",
        payment_status: "PENDING",
      },
    ];

    const updated = await updateUnpaidOrder(
      order,
      payloadCandidates,
      (current) => ({
        ...current,
        paymentMethod: "UPI",
        paymentStatus: "PENDING",
        updatedAt: nowIso,
      }),
      "Payment method switched to UPI.",
    );

    if (!updated || !tableInfo) {
      return false;
    }
    touchBillActivity(nowIso);

    const amount = toAmount(order.totalAmount > 0 ? order.totalAmount : order.subtotal);
    if (amount <= 0) {
      setBillSyncMessage("This bill amount is invalid. Please refresh bill details.");
      return false;
    }
    const paymentPayloadCandidates: Record<string, unknown>[] = [
      {
        client_id: tableInfo.clientId || routeClient,
        order_id: order.orderId,
        amount,
        payment_method: "UPI",
        payment_status: "PENDING",
        customer_marked_paid: false,
        verified_by: "PENDING_CASHIER_CONFIRMATION",
      },
    ];

    try {
      await createDocumentWithFallback(appwriteConfig.collections.payments, paymentPayloadCandidates);
    } catch {
      // Payment rows may be schema-restricted in some tenants; order method update is still valid.
    }
    return true;
  }

  async function switchAllUnpaidBillsToUpi() {
    if (counterUnpaidOrders.length === 0) {
      setBillSyncMessage("All unpaid bills are already set to UPI.");
      return;
    }

    let successCount = 0;
    for (const order of counterUnpaidOrders) {
      const switched = await switchUnpaidBillToUpi(order);
      if (switched) {
        successCount += 1;
      }
    }

    if (successCount === counterUnpaidOrders.length) {
      setBillSyncMessage("All unpaid bills switched to UPI.");
      return;
    }

    if (successCount > 0) {
      setBillSyncMessage(
        `${successCount} of ${counterUnpaidOrders.length} unpaid bills switched to UPI.`,
      );
      return;
    }

    setBillSyncMessage("Unable to switch unpaid bills right now. Please retry.");
  }

  async function switchUnpaidBillToManual(order: TableOrderRecord) {
    if (order.paymentMethod === "COUNTER") {
      return true;
    }

    const nowIso = new Date().toISOString();
    touchBillActivity(nowIso);
    const payloadCandidates: Record<string, unknown>[] = [
      {
        payment_method: "COUNTER",
        payment_status: "UNPAID",
      },
    ];

    const updated = await updateUnpaidOrder(
      order,
      payloadCandidates,
      (current) => ({
        ...current,
        paymentMethod: "COUNTER",
        paymentStatus: "UNPAID",
        updatedAt: nowIso,
      }),
      "Payment method switched to Manual.",
    );

    if (!updated) {
      return false;
    }

    touchBillActivity(nowIso);
    return true;
  }

  async function switchAllUnpaidBillsToManual() {
    if (upiUnpaidOrders.length === 0) {
      setBillSyncMessage("All unpaid bills are already set to Manual.");
      return;
    }

    let successCount = 0;
    for (const order of upiUnpaidOrders) {
      const switched = await switchUnpaidBillToManual(order);
      if (switched) {
        successCount += 1;
      }
    }

    if (successCount === upiUnpaidOrders.length) {
      setBillSyncMessage("All unpaid bills switched to Manual.");
      return;
    }

    if (successCount > 0) {
      setBillSyncMessage(
        `${successCount} of ${upiUnpaidOrders.length} unpaid bills switched to Manual.`,
      );
      return;
    }

    setBillSyncMessage("Unable to switch unpaid bills right now. Please retry.");
  }

  async function refreshBillFromBackend() {
    if (!tableInfo || billSyncing) {
      return;
    }

    setBillSyncing(true);
    setBillSyncMessage("");

    try {
      const backendRecords = await withTimeout(
        fetchTableOrderRecords(tableInfo.clientId || routeClient, tableInfo.id),
        BILL_SYNC_TIMEOUT_MS,
        "Bill refresh",
      );

      if (backendRecords.length === 0) {
        setBillSyncMessage(
          "No readable live bill found right now. Showing your local bill snapshot.",
        );
        return;
      }

      const applyResult = applyBackendOrders(backendRecords);
      if (applyResult === "closed") {
        setBillSyncMessage("Bill is already settled. You can start a fresh order now.");
        return;
      }

      setBillSyncMessage("Bill refreshed successfully.");
    } catch (error) {
      console.error(error);
      const message = getErrorMessage(error).toLowerCase();
      if (message.includes("not authorized") || message.includes("user_unauthorized")) {
        setBillSyncMessage(
          "Unable to load bill. Please retry.",
        );
      } else if (message.includes("timed out")) {
        setBillSyncMessage("Unable to load bill. Please retry.");
      } else {
        setBillSyncMessage("Unable to load bill. Please retry.");
      }
    } finally {
      setBillSyncing(false);
    }
  }

  function openBillDrawer() {
    touchBillActivity();
    setCartOpen(false);
    setBillOpen(true);
    setBillSyncMessage("");
  }

  function openCartPage() {
    touchBillActivity();
    setBillOpen(false);
    if (isStandaloneCartRoute) {
      setCartOpen(true);
      return;
    }
    router.push(cartRoutePath);
  }

  function closeCartView() {
    if (isStandaloneCartRoute) {
      router.replace(tableRoutePath);
      return;
    }
    setCartOpen(false);
  }

  function backToMenuFromBill() {
    setBillOpen(false);
    setCartOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function browseMenuFromCart() {
    if (isStandaloneCartRoute) {
      router.replace(tableRoutePath);
      return;
    }
    closeCartView();
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handlePlaceOrder() {
    if (placeOrderLockRef.current || placingOrder || cartCount === 0 || !tableInfo) {
      return;
    }

    placeOrderLockRef.current = true;
    setPlacingOrder(true);
    setErrorMessage("");
    setNoticeMessage("");
    setOrderPlacedId("");

    if (!tableInfo.id) {
      setErrorMessage("Table mapping is missing. Please rescan the QR.");
      setPlacingOrder(false);
      placeOrderLockRef.current = false;
      return;
    }

    const nowIso = new Date().toISOString();
    const clientId = tableInfo.clientId || routeClient;
    const orderNumber = generateOrderNumber(clientId, tableInfo.tableNo);
    const browserIdForOrder =
      customerBrowserId || (typeof window !== "undefined" ? ensureBrowserCustomerId() : "");
    if (!customerBrowserId && browserIdForOrder) {
      setCustomerBrowserId(browserIdForOrder);
    }
    const trimmedInstructions = sanitizeInstructionText(kitchenInstructions);
    const compactItems = cartItems.map((cartItem) => ({
      ...(() => {
        const selectedModifiers = resolvedSelectedModifiersByItem[cartItem.item.id] ?? [];
        const modifierTotalPerUnit = getSelectedModifierTotal(selectedModifiers);
        const unitPrice = cartItem.item.price + modifierTotalPerUnit;
        return {
          item_id: cartItem.item.id,
          item_name: sanitizeUserText(cartItem.item.name, 120),
          item_name_hi: sanitizeUserText(cartItem.item.nameHi, 120),
          base_unit_price: cartItem.item.price,
          unit_price: unitPrice,
          quantity: cartItem.quantity,
          modifiers_total_per_unit: modifierTotalPerUnit,
          modifiers: selectedModifiers,
          line_total: unitPrice * cartItem.quantity,
        };
      })(),
    }));
    const orderItemsSnapshot = JSON.stringify(compactItems);
    const computedSubtotal = Math.round(
      compactItems.reduce((sum, entry) => sum + toAmount(entry.line_total), 0) * 100,
    ) / 100;
    const computedTaxAmount = Math.round((computedSubtotal * taxPercentage) / 100 * 100) / 100;
    const computedTotal = Math.round((computedSubtotal + computedTaxAmount) * 100) / 100;
    const computedOfferDiscount = roundCurrency(
      Math.min(
        computedTotal,
        Math.max(0, Number.isFinite(bestCartOffer?.discountAmount ?? Number.NaN) ? (bestCartOffer?.discountAmount ?? 0) : 0),
      ),
    );
    const computedPayableTotal = roundCurrency(
      Math.max(0, computedTotal - computedOfferDiscount),
    );

    if (computedSubtotal <= 0 || computedPayableTotal <= 0) {
      setErrorMessage("Cart total is invalid. Please refresh menu and try again.");
      setPlacingOrder(false);
      placeOrderLockRef.current = false;
      return;
    }

    const orderBasePayload = {
      client_id: clientId,
      table_id: tableInfo.id,
      order_number: orderNumber,
      status: "PLACED",
      payment_status: "UNPAID",
      subtotal: computedSubtotal,
      total_amount: computedPayableTotal,
    };
    const orderPayloadCandidates: Record<string, unknown>[] = [
      {
        ...orderBasePayload,
        payment_method: paymentMethod,
        created_at_custom: nowIso,
        items_json: orderItemsSnapshot,
        kitchen_instructions: trimmedInstructions,
      },
      {
        ...orderBasePayload,
        payment_method: paymentMethod,
        created_at_custom: nowIso,
        order_items: orderItemsSnapshot,
        kitchen_instructions: trimmedInstructions,
      },
      {
        ...orderBasePayload,
        payment_method: paymentMethod,
        created_at_custom: nowIso,
        items_json: orderItemsSnapshot,
        notes: trimmedInstructions,
      },
      {
        ...orderBasePayload,
        payment_method: paymentMethod,
        created_at_custom: nowIso,
        order_items: orderItemsSnapshot,
        notes: trimmedInstructions,
      },
      {
        ...orderBasePayload,
        payment_method: paymentMethod,
        created_at_custom: nowIso,
        items: compactItems,
        instructions: trimmedInstructions,
      },
      {
        ...orderBasePayload,
        payment_method: paymentMethod,
        created_at_custom: nowIso,
      },
    ];

    try {
      const createdOrder = await createDocumentWithFallback(
        appwriteConfig.collections.orders,
        orderPayloadCandidates,
      );

      if (paymentMethod === "UPI") {
        const paymentPayloadCandidates: Record<string, unknown>[] = [
          {
            client_id: clientId,
            order_id: createdOrder.$id,
            amount: computedPayableTotal,
            payment_method: "UPI",
            payment_status: "PENDING",
            customer_marked_paid: false,
            verified_by: "PENDING_CASHIER_CONFIRMATION",
          },
        ];

        try {
          await createDocumentWithFallback(
            appwriteConfig.collections.payments,
            paymentPayloadCandidates,
          );
        } catch (paymentError) {
          console.error(paymentError);
          setNoticeMessage(
            "Order placed. UPI confirmation is pending and will be verified by cashier.",
          );
        }
      }

      setOrderPlacedId(createdOrder.$id);
      const nextActiveOrderContext: ActiveOrderContext = {
        id: createdOrder.$id,
        status: "PLACED",
        paymentStatus: "UNPAID",
        updatedAt: nowIso,
      };
      setActiveOrderContext(nextActiveOrderContext);
      activeOrderContextRef.current = nextActiveOrderContext;
      const placedOrderRecord = buildTableOrderRecordFromCart(
        createdOrder.$id,
        orderNumber,
        tableInfo.tableNo,
        paymentMethod,
        computedSubtotal,
        computedPayableTotal,
        nowIso,
        cartItems,
        resolvedSelectedModifiersByItem,
        trimmedInstructions,
      );
      const mergedLocalOrders = mergeTableOrderRecords(tableOrdersRef.current, [placedOrderRecord]);
      setTableOrders(mergedLocalOrders);
      tableOrdersRef.current = mergedLocalOrders;
      syncOrderSnapshot(mergedLocalOrders);
      setBillSyncMessage("Order added to your bill.");
      touchBillActivity(nowIso);
      showStatusPopup({
        title: "Order Placed",
        description: `${orderNumber} has been sent to the kitchen.`,
        tone: "success",
      });

      if (typeof window !== "undefined") {
        const resolvedBrowserId = browserIdForOrder || ensureBrowserCustomerId();
        const resolvedHistoryStorageKey =
          customerHistoryStorageKey ||
          buildCustomerHistoryStorageKey(routeClient, resolvedBrowserId);
        const orderSummary: CustomerOrderSummary = {
          orderId: createdOrder.$id,
          client: clientId,
          table: tableInfo.tableNo,
          totalAmount: computedPayableTotal,
          itemCount: cartCount,
          paymentMethod,
          status: "PLACED",
          placedAt: nowIso,
          items: cartItems.map((cartItem) => ({
            id: cartItem.item.id,
            qty: cartItem.quantity,
          })),
        };

        const currentProfile =
          customerProfile ??
          parseCustomerProfile(
            window.localStorage.getItem(CUSTOMER_PROFILE_KEY),
            resolvedBrowserId,
          );
        const nextProfile = buildNextCustomerProfile(
          currentProfile,
          orderSummary,
          cartItems,
          resolvedBrowserId,
        );
        setCustomerProfile(nextProfile);
        window.localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(nextProfile));

        const currentHistory =
          parseCustomerOrderHistory(
            window.localStorage.getItem(resolvedHistoryStorageKey),
            resolvedBrowserId,
          );
        const nextHistory = buildNextCustomerHistory(
          currentHistory,
          orderSummary,
          resolvedBrowserId,
        );
        window.localStorage.setItem(
          resolvedHistoryStorageKey,
          JSON.stringify(nextHistory),
        );
      }

      setCart({});
      setSelectedModifiersByItem({});
      setKitchenInstructions("");
      setCartOpen(false);
    } catch (orderError) {
      console.error(orderError);
      const rawMessage = getErrorMessage(orderError);
      const message = rawMessage.toLowerCase();
      if (message.includes("network") || message.includes("fetch")) {
        setErrorMessage("Network issue detected. Please check your connection and retry.");
      } else if (
        message.includes("not authorized") ||
        message.includes("user_unauthorized") ||
        message.includes("permission") ||
        message.includes("missing scope") ||
        message.includes("401")
      ) {
        setErrorMessage("Unable to submit order from this device due to access settings. Please call staff.");
      } else if (message.includes("missing required attribute")) {
        setErrorMessage("Order request is missing required billing fields. Please ask staff to sync settings.");
      } else if (message.includes('"table_id"')) {
        setErrorMessage(
          "Table ID could not be resolved. Please rescan the QR and inform staff.",
        );
      } else {
        setErrorMessage(
          "Unable to place order right now. Please retry in a moment or inform staff.",
        );
      }
    } finally {
      setPlacingOrder(false);
      placeOrderLockRef.current = false;
    }
  }

  async function copyTextWithNotice(value: string, successMessage: string) {
    const text = value.trim();
    if (!text || typeof navigator === "undefined") {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(text);
      setNoticeMessage(successMessage);
    } catch {
      setNoticeMessage(
        "Unable to copy automatically. Please copy manually from the details shown.",
      );
    }
  }

  function handleUpiPayClick(link: string) {
    if (!link) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (!canLaunchUpiDeepLink) {
      setNoticeMessage(
        "UPI app launch is not supported in this browser. Open this page on your phone or use the copy options below.",
      );
      return;
    }

    const finalLaunchUri = normalizeRawUpiUriForLaunch(link);
    if (!finalLaunchUri) {
      setNoticeMessage(
        "Unable to prepare a valid UPI payment link. Please retry or ask staff for help.",
      );
      return;
    }

    setLastUpiLaunchUri(finalLaunchUri);
    touchBillActivity();
    console.log(`[UPI_RAW_URI] ${finalLaunchUri}`);
    window.location.href = finalLaunchUri;
  }

  function handleShowUpiQr(link: string, amount: number) {
    const finalLaunchUri = normalizeRawUpiUriForLaunch(link);
    if (!finalLaunchUri) {
      setNoticeMessage(
        "Unable to prepare UPI QR right now. Please retry or ask staff for help.",
      );
      return;
    }

    const sanitizedAmount =
      Number.isFinite(amount) && amount > 0 ? Number(amount).toFixed(2) : "";
    if (!sanitizedAmount) {
      setNoticeMessage("Unable to prepare UPI amount right now. Please retry.");
      return;
    }

    setLastUpiLaunchUri(finalLaunchUri);
    setUpiQrUri(finalLaunchUri);
    setUpiQrAmount(sanitizedAmount);
    setUpiQrOpen(true);
    touchBillActivity();
  }

  function closeUpiQrSheet() {
    setUpiQrOpen(false);
  }

  const tableLabel = tableInfo ? tableInfo.displayLabel : formatTableLabel(routeTable);
  const accentColor = normalizeThemeColor(LUXURY_GOLD, LUXURY_GOLD);
  const accentBorder = withAlpha(accentColor, 0.33);
  const accentInset = withAlpha(accentColor, 0.2);
  const accentSubtle = withAlpha(accentColor, 0.27);
  const navyGlow = withAlpha(isLightTheme ? PALETTE_INFO : ROYAL_NAVY, isLightTheme ? 0.26 : 0.38);
  const goldGlow = withAlpha(LUXURY_GOLD, isLightTheme ? 0.22 : 0.34);
  const heroImageUrl = clientSettings.heroImageUrl || branding?.heroImageUrl || "";
  const logoUrl = clientSettings.logoUrl || branding?.logoUrl || "";
  const tagline = clientSettings.tagline || branding?.tagline || "";
  const supportPhone = clientSettings.supportPhone;
  const configuredUpiId = normalizeUpiId(clientSettings.upiId) || DEFAULT_UPI_ID;
  const configuredUpiName = sanitizeUpiText(
    clientSettings.upiName.trim() || DEFAULT_UPI_NAME,
    60,
  );
  const cartUpiLink =
    paymentMethod === "UPI"
      ? buildUpiPaymentLink({
          upiId: configuredUpiId,
          upiName: configuredUpiName,
          amount: cartPayableTotal,
        })
      : "";
  const currentBillUpiLink =
    currentBillPaymentMethod === "UPI" && !isOrderClosed(currentBillStatus, currentBillPaymentStatus)
      ? buildUpiPaymentLink({
          upiId: configuredUpiId,
          upiName: configuredUpiName,
          amount: billPayableTotal,
        })
      : "";
  const upiQrImageSrc = useMemo(() => buildUpiQrImageUrl(upiQrUri), [upiQrUri]);
  const upiQrAmountNumber = useMemo(() => {
    const parsed = Number(upiQrAmount);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [upiQrAmount]);
  const appBackground = isLightTheme
    ? `linear-gradient(180deg, ${PALETTE_BACKGROUND} 0%, #F8F5F0 56%, #E8D9C5 100%)`
    : `linear-gradient(180deg, #2E2A26 0%, #7A6D60 36%, #2E2A26 100%)`;
  const panelGradient = isLightTheme
    ? `linear-gradient(165deg, rgba(248,245,240,0.98) 0%, ${PALETTE_SURFACE} 64%, rgba(198,165,123,0.18) 100%)`
    : `linear-gradient(165deg, #7A6D60 0%, #2E2A26 100%)`;
  const sectionGradient = isLightTheme
    ? `linear-gradient(160deg, rgba(248,245,240,0.98) 0%, ${PALETTE_SURFACE} 68%, rgba(198,165,123,0.16) 100%)`
    : `linear-gradient(160deg, #7A6D60 0%, #2E2A26 100%)`;
  const cardGradient = isLightTheme
    ? `linear-gradient(168deg, rgba(248,245,240,0.98) 0%, ${PALETTE_SURFACE} 72%, rgba(198,165,123,0.16) 100%)`
    : `linear-gradient(168deg, #7A6D60 0%, #2E2A26 100%)`;
  const sheetGradient = isLightTheme
    ? `linear-gradient(176deg, rgba(248,245,240,0.99) 0%, ${PALETTE_SURFACE} 68%, rgba(198,165,123,0.16) 100%)`
    : `linear-gradient(176deg, #7A6D60 0%, #2E2A26 100%)`;
  const bottomBarGradient = isLightTheme
    ? `linear-gradient(170deg, rgba(248,245,240,0.98) 0%, ${PALETTE_SURFACE} 68%, rgba(198,165,123,0.16) 100%)`
    : `linear-gradient(170deg, #7A6D60 0%, #2E2A26 100%)`;
  const overlayShade = isLightTheme ? "rgba(46,42,38,0.2)" : "rgba(0, 0, 0, 0.72)";
  const contentTextClass = isLightTheme ? "text-brand-dark" : "text-white";
  const secondaryTextClass = isLightTheme ? "text-brand-accent" : "text-zinc-300";
  const mutedTextClass = isLightTheme ? "text-zinc-500" : "text-zinc-400";
  const themeScopeClass = isLightTheme ? "cafe-theme-light" : "";
  const shouldShowCartPanel = cartOpen || isStandaloneCartRoute;

  if (loadState === "loading") {
    return (
      <div className={clsx("min-h-screen", contentTextClass, themeScopeClass)} style={{ background: appBackground }}>
        <div className="mx-auto w-full max-w-4xl px-4 pb-20 pt-6 sm:px-6">
          <div
            className="rounded-2xl border p-4"
            style={{
              borderColor: withAlpha(PALETTE_ACCENT, 0.3),
              background: sectionGradient,
            }}
          >
            <div className="h-4 w-32 animate-pulse rounded" style={{ backgroundColor: withAlpha(PALETTE_INFO, 0.5) }} />
            <div className="mt-3 h-7 w-56 animate-pulse rounded" style={{ backgroundColor: withAlpha(PALETTE_PREMIUM, 0.7) }} />
            <p className="mt-3 text-sm" style={{ color: withAlpha(DEEP_CHARCOAL, 0.8) }}>{loadingMessage}</p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border"
                style={{
                  borderColor: withAlpha(PALETTE_PREMIUM, 0.65),
                  backgroundColor: withAlpha(PALETTE_BASE, 0.8),
                }}
              >
                <div className="aspect-[4/3] animate-pulse" style={{ backgroundColor: withAlpha(PALETTE_INFO, 0.4) }} />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded" style={{ backgroundColor: withAlpha(PALETTE_PREMIUM, 0.75) }} />
                  <div className="h-3 w-full animate-pulse rounded" style={{ backgroundColor: withAlpha(PALETTE_BASE, 0.92) }} />
                  <div className="h-3 w-1/2 animate-pulse rounded" style={{ backgroundColor: withAlpha(PALETTE_BASE, 0.92) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadState === "invalid-table") {
    return (
      <div
        className={clsx("min-h-screen px-4 py-8", contentTextClass, themeScopeClass)}
        style={{ background: appBackground }}
      >
        <div
          className="mx-auto w-full max-w-md rounded-2xl border p-6 text-center"
          style={{
            borderColor: withAlpha(WARM_HIGHLIGHT, 0.34),
            background: sectionGradient,
          }}
        >
          <AlertCircle className="mx-auto h-10 w-10" style={{ color: WARM_HIGHLIGHT }} />
          <h1 className="mt-4 text-xl font-semibold">Invalid Table QR</h1>
          <p className="mt-2 text-sm text-zinc-300">{errorMessage}</p>
          <p className="mt-4 text-xs text-zinc-400">
            Client: <span className="font-mono">{routeClient}</span> | Table:{" "}
            <span className="font-mono">{routeTable}</span>
          </p>
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div
        className={clsx("min-h-screen px-4 py-8", contentTextClass, themeScopeClass)}
        style={{ background: appBackground }}
      >
        <div
          className="mx-auto w-full max-w-md rounded-2xl border p-6"
          style={{
            borderColor: withAlpha(WARM_HIGHLIGHT, 0.34),
            background: sectionGradient,
          }}
        >
          <WifiOff className="h-9 w-9" style={{ color: WARM_HIGHLIGHT }} />
          <h1 className="mt-4 text-xl font-semibold">Connection Problem</h1>
          <p className="mt-2 text-sm text-zinc-300">{errorMessage}</p>
          <button
            type="button"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-brand-dark transition"
            style={{ backgroundColor: LUXURY_GOLD }}
            onClick={() => {
              setLoadState("loading");
              setLoadingMessage("Retrying...");
              setErrorMessage("");
              setNoticeMessage("");
              setReloadKey((current) => current + 1);
            }}
          >
            {"Retry"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx("relative min-h-screen overflow-x-hidden", contentTextClass, themeScopeClass)}
      style={{ background: appBackground }}
    >
      {heroImageUrl ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 h-64 opacity-30"
          style={{
            backgroundImage: isLightTheme
              ? `linear-gradient(180deg, rgba(248,245,240,0.62) 0%, rgba(248,245,240,0.97) 92%), url(${heroImageUrl})`
              : `linear-gradient(180deg, rgba(46,42,38,0.2) 0%, rgba(24,22,20,0.94) 92%), url(${heroImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : null}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: isLightTheme
            ? "linear-gradient(140deg, rgba(198,165,123,0.14) 0%, rgba(248,245,240,0) 38%, rgba(46,42,38,0.08) 100%)"
            : "linear-gradient(140deg, rgba(198,165,123,0.08) 0%, rgba(248,245,240,0) 38%, rgba(46,42,38,0.24) 100%)",
        }}
      />
      <div
        className="pointer-events-none fixed -top-20 left-1/2 h-52 w-[120vw] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${goldGlow} 0%, rgba(0,0,0,0) 72%)` }}
      />
      <div
        className="pointer-events-none fixed bottom-[-110px] left-[-40px] h-64 w-64 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${navyGlow} 0%, rgba(0,0,0,0) 74%)` }}
      />

      {!isStandaloneCartRoute ? (
      <div className="relative mx-auto flex w-full max-w-5xl flex-col px-4 pb-44 pt-5 sm:px-6 sm:pb-36">
        <header
          className="sticky top-3 z-20 mb-5 rounded-3xl border px-4 py-4 shadow-[0_32px_74px_-42px_rgba(0,0,0,0.98)] backdrop-blur-xl"
          style={{
            background: panelGradient,
            borderColor: withAlpha(WARM_HIGHLIGHT, 0.22),
            boxShadow: `0 32px 74px -42px rgba(0,0,0,0.98), 0 0 0 1px ${accentInset} inset`,
            ...(isLightTheme
              ? {
                  boxShadow: `0 28px 66px -42px rgba(46,42,38,0.28), 0 0 0 1px ${withAlpha(LUXURY_GOLD, 0.2)} inset`,
                }
              : null),
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={clsx("truncate text-[10px] uppercase tracking-[0.26em]", mutedTextClass)}>
                {"Welcome"}
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl border text-xs font-bold"
                  style={{
                    borderColor: withAlpha(LUXURY_GOLD, 0.45),
                    background: `linear-gradient(160deg, ${withAlpha(LUXURY_GOLD, 0.34)} 0%, ${withAlpha(LUXURY_GOLD, 0.18)} 100%)`,
                    color: isLightTheme ? "#2E2A26" : "#F8F5F0",
                    boxShadow: `0 14px 30px -18px ${withAlpha(LUXURY_GOLD, 0.55)}`,
                  }}
                >
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={restaurantName}
                      className="h-full w-full rounded-[10px] object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="tracking-[0.15em]">CL</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h1
                    className="truncate text-[1.78rem] font-bold leading-none tracking-[0.04em]"
                    style={{ color: isLightTheme ? "#2E2A26" : "#F8F5F0" }}
                  >
                    Cafe Luxe
                  </h1>
                  <p className={clsx("mt-1 truncate text-[11px] uppercase tracking-[0.19em]", mutedTextClass)}>
                    Premium Table Ordering
                  </p>
                  {restaurantName && restaurantName.toLowerCase() !== "cafe luxe" ? (
                    <p className={clsx("mt-1 truncate text-xs", mutedTextClass)}>{restaurantName}</p>
                  ) : null}
                </div>
              </div>
              {tagline ? (
                <p className={clsx("mt-2 truncate text-xs", secondaryTextClass)}>{tagline}</p>
              ) : null}
            </div>

            <div className="shrink-0 space-y-2 text-right">
              <div
                className="rounded-2xl border px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                style={{
                  borderColor: accentBorder,
                  backgroundColor: isLightTheme
                    ? withAlpha("#F8F5F0", 0.88)
                    : withAlpha(ROYAL_NAVY, 0.56),
                }}
              >
                <p className={clsx("text-[10px] uppercase tracking-[0.16em]", mutedTextClass)}>Table</p>
                <p
                  className="text-sm font-semibold"
                  style={{ color: isLightTheme ? "#2E2A26" : "#F8F5F0" }}
                >
                  {tableLabel}
                </p>
              </div>
            </div>
          </div>
          {supportPhone ? (
            <div
              className={clsx("mt-3 border-t pt-2 text-xs", secondaryTextClass)}
              style={{ borderColor: withAlpha(isLightTheme ? "#C6A57B" : SOFT_DARK_SURFACE, 0.24) }}
            >
              {"Support"}:{" "}
              <span
                className="font-medium"
                style={{ color: isLightTheme ? "#2E2A26" : "#F8F5F0" }}
              >
                {supportPhone}
              </span>
            </div>
          ) : null}
        </header>

        {errorMessage ? (
          <div
            className="mb-4 flex items-start gap-3 rounded-2xl border p-4"
            style={{
              borderColor: withAlpha(WARM_HIGHLIGHT, 0.28),
              backgroundColor: withAlpha(LUXURY_GOLD, isLightTheme ? 0.24 : 0.12),
              color: isLightTheme ? "#7A6D60" : WARM_HIGHLIGHT,
            }}
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Issue</p>
              <p className={clsx("mt-1 text-sm", isLightTheme ? "text-brand-dark/90" : "text-zinc-200/90")}>
                {errorMessage}
              </p>
            </div>
          </div>
        ) : null}

        {noticeMessage ? (
          <div
            className="mb-4 flex items-start gap-3 rounded-2xl border p-4"
            style={{
              borderColor: withAlpha(WARM_HIGHLIGHT, 0.28),
              backgroundColor: withAlpha(LUXURY_GOLD, isLightTheme ? 0.24 : 0.12),
              color: isLightTheme ? "#7A6D60" : WARM_HIGHLIGHT,
            }}
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Note</p>
              <p className={clsx("mt-1 text-sm", isLightTheme ? "text-brand-dark/90" : "text-zinc-200/90")}>
                {noticeMessage}
              </p>
            </div>
          </div>
        ) : null}

        {orderPlacedId ? (
          <div
            className="mb-4 flex items-start gap-3 rounded-2xl border p-4"
            style={{
              borderColor: withAlpha(WARM_HIGHLIGHT, 0.34),
              backgroundColor: withAlpha(LUXURY_GOLD, isLightTheme ? 0.24 : 0.13),
              color: isLightTheme ? "#7A6D60" : WARM_HIGHLIGHT,
            }}
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className={clsx("text-sm font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
                {"Order Confirmed"}
              </p>
              <p className={clsx("mt-1 text-sm", isLightTheme ? "text-brand-dark/90" : "text-zinc-200/95")}>
                Order ID: <span className="font-mono">{orderPlacedId}</span>
              </p>
              {showTopCardStatus ? (
                <div className={clsx("mt-2 grid gap-1 text-xs", isLightTheme ? "text-brand-dark/90" : "text-zinc-100/95")}>
                  <p>
                    <span className={clsx(isLightTheme ? "text-brand-dark/70" : "text-zinc-200/85")}>Order Status:</span>{" "}
                    <span className="font-semibold">
                      {getOrderStatusLabel(topCardOrderStatusRaw)}
                    </span>
                  </p>
                  {topCardPaymentStatusRaw ? (
                    <p>
                      <span className={clsx(isLightTheme ? "text-brand-dark/70" : "text-zinc-200/85")}>Payment Status:</span>{" "}
                      <span className="font-semibold">
                        {getPaymentStatusLabel(topCardPaymentStatusRaw)}
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {statusPopup ? (
          <div
            className="mb-4 flex items-start gap-3 rounded-2xl border p-4 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.75)]"
            style={{
              borderColor:
                statusPopup.tone === "success"
                  ? withAlpha("#C6A57B", 0.36)
                  : withAlpha(WARM_HIGHLIGHT, 0.34),
              backgroundColor:
                statusPopup.tone === "success"
                  ? withAlpha("#C6A57B", isLightTheme ? 0.14 : 0.18)
                  : withAlpha(LUXURY_GOLD, isLightTheme ? 0.16 : 0.14),
              color: statusPopup.tone === "success" ? "#C6A57B" : WARM_HIGHLIGHT,
            }}
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className={clsx("text-sm font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
                {statusPopup.title}
              </p>
              <p className={clsx("mt-1 text-sm", isLightTheme ? "text-brand-dark/90" : "text-zinc-200/95")}>
                {statusPopup.description}
              </p>
            </div>
            <button
              type="button"
              className={clsx(
                "rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                isLightTheme
                  ? "text-brand-dark hover:bg-white/70"
                  : "text-zinc-100 hover:bg-zinc-800",
              )}
              style={{ borderColor: withAlpha(WARM_HIGHLIGHT, 0.3) }}
              onClick={() => setStatusPopup(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <section
          className="mb-4 rounded-2xl border p-4 shadow-[0_24px_64px_-38px_rgba(0,0,0,0.98)]"
          style={{
            borderColor: accentSubtle,
            background: sectionGradient,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className="flex items-center gap-2"
                style={{ color: isLightTheme ? "#7A6D60" : WARM_HIGHLIGHT }}
              >
                <Sparkles className="h-4 w-4" />
                <p className="text-sm font-medium">{"Fresh Picks For Your Table"}</p>
              </div>
              <p className={clsx("mt-1 text-sm", secondaryTextClass)}>
                {"Browse the menu, add to cart, and place your order directly to the kitchen."}
              </p>
            </div>
            <div className="shrink-0 space-y-1 text-right">
              <p
                className="text-[11px] uppercase tracking-[0.16em]"
                style={{ color: isLightTheme ? "#7A6D60" : WARM_HIGHLIGHT }}
              >
                {normalizedCurrency}
              </p>
              <p className={clsx("text-xs", isLightTheme ? "text-brand-dark/70" : "text-zinc-300")}>
                Tax: {taxPercentage > 0 ? `${taxPercentage}%` : "Included"}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-4">
          <label
            htmlFor="menu-search"
            className={clsx("mb-2 block text-xs uppercase tracking-[0.16em]", mutedTextClass)}
          >
            {"Search Menu"}
          </label>
          <div
            className="flex items-center gap-2 rounded-2xl border px-3 py-2.5 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.92)]"
            style={{
              borderColor: withAlpha(WARM_HIGHLIGHT, 0.32),
              background: sectionGradient,
            }}
          >
            <Search className={clsx("h-4 w-4", mutedTextClass)} />
            <input
              id="menu-search"
              value={searchText}
              onChange={(event) => setSearchText(sanitizeSearchInput(event.target.value))}
              placeholder={"Search dishes"}
              className={clsx(
                "w-full bg-transparent text-sm outline-none placeholder:text-brand-dark/50",
                contentTextClass,
              )}
              inputMode="search"
            />
          </div>
        </section>

        <section className="sticky top-[98px] z-10 mb-4 -mx-1 overflow-x-auto px-1">
          <div
            className="inline-flex min-w-full gap-2 rounded-2xl border p-1.5 shadow-[0_20px_48px_-34px_rgba(46,42,38,0.28)] backdrop-blur"
            style={{
              borderColor: withAlpha(WARM_HIGHLIGHT, 0.22),
              background: sectionGradient,
            }}
          >
            <button
              type="button"
              className={clsx(
                "flex-none rounded-xl px-4 py-2 text-sm font-semibold transition active:translate-y-px",
                activeCategory === "all"
                  ? "text-brand-dark shadow-[0_12px_30px_-18px_rgba(0,0,0,0.5)]"
                  : isLightTheme ? "text-brand-dark/70 hover:text-brand-dark" : "text-white/70 hover:text-white",
              )}
                  style={
                activeCategory === "all"
                  ? isLightTheme
                    ? {
                        background: `linear-gradient(180deg, #F8F5F0 0%, #E8D9C5 100%)`,
                        boxShadow: `0 10px 24px -16px ${withAlpha("#2E2A26", 0.3)}`,
                      }
                    : { backgroundColor: LUXURY_GOLD }
                  : {
                      backgroundColor: isLightTheme
                        ? withAlpha("#F8F5F0", 0.94)
                        : withAlpha("#7A6D60", 0.9),
                    }
              }
              onClick={() => setActiveCategory("all")}
            >
              {"All"}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={clsx(
                  "flex-none rounded-xl px-4 py-2 text-sm font-semibold transition active:translate-y-px",
                  activeCategory === category.id
                    ? "text-brand-dark shadow-[0_12px_30px_-18px_rgba(0,0,0,0.5)]"
                    : isLightTheme ? "text-brand-dark/70 hover:text-brand-dark" : "text-white/70 hover:text-white",
                )}
                style={
                  activeCategory === category.id
                    ? isLightTheme
                      ? {
                          background: `linear-gradient(180deg, #F8F5F0 0%, #E8D9C5 100%)`,
                          boxShadow: `0 10px 24px -16px ${withAlpha("#2E2A26", 0.3)}`,
                        }
                      : { backgroundColor: LUXURY_GOLD }
                    : {
                        backgroundColor: isLightTheme
                          ? withAlpha("#F8F5F0", 0.94)
                          : withAlpha("#7A6D60", 0.9),
                      }
                }
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </section>

        {offersToday.length > 0 ? (
          <section
            className="mb-5 space-y-3 rounded-2xl border p-3.5 shadow-[0_24px_58px_-42px_rgba(0,0,0,0.34)]"
            style={{
              borderColor: withAlpha(PALETTE_PREMIUM, 0.8),
              background: `linear-gradient(155deg, ${withAlpha(PALETTE_PREMIUM, 0.7)} 0%, ${withAlpha(PALETTE_BASE, 0.9)} 48%, ${withAlpha(PALETTE_SUCCESS, 0.62)} 100%)`,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className={clsx("text-sm font-semibold uppercase tracking-[0.14em]", contentTextClass)}>
                {"Offers Today"}
              </h2>
              <span
                className={clsx("rounded-full border px-2 py-0.5 text-[11px] font-semibold", mutedTextClass)}
                style={{
                  borderColor: withAlpha(PALETTE_ACCENT, 0.45),
                  backgroundColor: withAlpha(PALETTE_ACCENT, 0.14),
                }}
              >
                {offersToday.length} live
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {offersToday.map((offer) => (
                <article
                  key={offer.id}
                  className="rounded-2xl border px-3.5 py-3.5 shadow-[0_20px_48px_-34px_rgba(46,42,38,0.24)]"
                  style={{
                    borderColor: withAlpha(PALETTE_ACCENT, 0.26),
                    background: `linear-gradient(160deg, ${withAlpha(PALETTE_BASE, 0.96)} 0%, ${withAlpha(PALETTE_PREMIUM, 0.44)} 100%)`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={clsx("text-sm font-semibold leading-5", contentTextClass)}>{offer.name}</p>
                      <p className={clsx("mt-1 text-xs leading-5", secondaryTextClass)}>
                        {offer.bannerText || "Live offer available for this table."}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
                      style={{
                        borderColor: withAlpha(PALETTE_INFO, 0.6),
                        backgroundColor: withAlpha(PALETTE_INFO, 0.25),
                        color: isLightTheme ? DEEP_CHARCOAL : WARM_HIGHLIGHT,
                      }}
                    >
                      {offer.offerType}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {visibleItems.length === 0 ? (
          <section
            className={clsx(
              "rounded-2xl border p-5 text-sm",
              secondaryTextClass,
              isLightTheme ? "border-[#E8D9C5] bg-[#F8F5F0]" : "border-zinc-800/30 bg-white/10",
            )}
          >
            {menuItems.length === 0
              ? "No menu items are available right now. Please check with staff."
              : "No items match this search/category. Try another filter."}
          </section>
        ) : (
          <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
            {visibleItems.map((item) => {
              const quantity = cart[item.id] ?? 0;
              const parsedImageSrc = item.image.trim();
              const hasImage = parsedImageSrc.length > 0;
              const selectedModifiers = resolvedSelectedModifiersByItem[item.id] ?? [];
              const modifierTotal = getSelectedModifierTotal(selectedModifiers);
              const displayPrice = item.price + modifierTotal;
              const itemModifierOptions = modifierOptionsByItem[item.id] ?? [];

              return (
                <article
                  key={item.id}
                  data-menu-item-id={item.id}
                  className="group overflow-hidden rounded-xl border shadow-[0_26px_60px_-44px_rgba(0,0,0,0.98)] transition duration-300 hover:-translate-y-0.5 active:translate-y-[1px]"
                  style={{
                    borderColor: withAlpha(WARM_HIGHLIGHT, 0.23),
                    background: cardGradient,
                    boxShadow: `0 24px 58px -44px rgba(0,0,0,0.98), 0 0 0 1px ${withAlpha(WARM_HIGHLIGHT, 0.12)} inset`,
                    contentVisibility: "auto",
                    containIntrinsicSize: "300px",
                  }}
                >
                  <div
                    className="relative aspect-square sm:aspect-[4/3]"
                    style={{
                      background: isLightTheme
                        ? "linear-gradient(135deg, rgba(248,245,240,0.96) 0%, rgba(198,165,123,0.28) 100%)"
                        : "linear-gradient(135deg, rgb(39 39 42) 0%, rgb(9 9 11) 100%)",
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
                      <ShoppingBag className="h-10 w-10" />
                    </div>
                    {hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={parsedImageSrc}
                        alt={item.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: isLightTheme
                          ? "linear-gradient(180deg, rgba(248,245,240,0.04) 0%, rgba(46,42,38,0.22) 100%)"
                          : "linear-gradient(180deg, rgba(46,42,38,0.08) 0%, rgba(17,24,39,0.86) 100%)",
                      }}
                    />
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-20"
                      style={{
                        background: `linear-gradient(180deg, ${withAlpha(WARM_HIGHLIGHT, 0.18)} 0%, rgba(0,0,0,0) 100%)`,
                      }}
                    />
                    <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                      {item.isVeg ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                          style={{
                            borderColor: withAlpha(WARM_HIGHLIGHT, 0.42),
                            backgroundColor: withAlpha(WARM_HIGHLIGHT, 0.12),
                            color: WARM_HIGHLIGHT,
                          }}
                        >
                          <Leaf className="h-3 w-3" />
                          Veg
                        </span>
                      ) : null}
                      {item.isSpicy ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                          style={{
                            borderColor: withAlpha(LUXURY_GOLD, 0.36),
                            backgroundColor: withAlpha(LUXURY_GOLD, 0.13),
                            color: WARM_HIGHLIGHT,
                          }}
                        >
                          <Flame className="h-3 w-3" />
                          Spicy
                        </span>
                      ) : null}
                      {item.isBestseller ? (
                        <span
                          className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                          style={{
                            borderColor: withAlpha(LUXURY_GOLD, 0.42),
                            backgroundColor: withAlpha(LUXURY_GOLD, 0.18),
                            color: WARM_HIGHLIGHT,
                          }}
                        >
                          Bestseller
                        </span>
                      ) : null}
                      {!item.isAvailable ? (
                        <span className="rounded-full border border-zinc-300/30 bg-zinc-900/75 px-1.5 py-0.5 text-[10px] font-medium text-zinc-200">
                          Out Of Stock
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2.5 p-3">
                    <div>
                      <h3 className={clsx("line-clamp-1 text-sm font-semibold sm:text-base", contentTextClass)}>{item.name}</h3>
                      <p className={clsx("line-clamp-1 text-[11px] sm:text-sm", secondaryTextClass)}>{item.nameHi}</p>
                    </div>

                    {item.description ? (
                      <p className={clsx("line-clamp-2 min-h-8 text-[11px] opacity-85 sm:min-h-10 sm:text-sm", secondaryTextClass)}>{item.description}</p>
                    ) : (
                      <div className="min-h-8 sm:min-h-10" />
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold sm:text-base" style={{ color: isLightTheme ? "#2E2A26" : "#E8D9C5" }}>
                          {formatMoney(displayPrice)}
                        </p>
                        {selectedModifiers.length > 0 ? (
                          <p className={clsx("text-[11px]", mutedTextClass)}>
                            +{selectedModifiers.length} customization
                            {selectedModifiers.length > 1 ? "s" : ""}
                          </p>
                        ) : null}
                      </div>

                      {!item.isAvailable && quantity === 0 ? (
                        <button
                          type="button"
                          className={clsx(
                            "inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold sm:text-sm",
                            isLightTheme
                              ? "border-[#E8D9C5] bg-[#E8D9C5] text-brand-dark/60"
                              : "border-zinc-700 bg-zinc-900 text-zinc-400",
                          )}
                          disabled
                        >
                          Unavailable
                        </button>
                      ) : quantity === 0 ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold text-brand-dark shadow-[0_14px_34px_-20px_rgba(0,0,0,0.9)] transition active:translate-y-px sm:px-3.5 sm:py-2 sm:text-sm"
                          style={{
                            backgroundColor: LUXURY_GOLD,
                            borderColor: withAlpha(LUXURY_GOLD, 0.55),
                          }}
                          onClick={() => {
                            updateItemQuantity(item.id, 1);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </button>
                      ) : (
                        <div
                          className={clsx(
                            "inline-flex items-center rounded-xl border",
                            isLightTheme
                              ? "border-[#E8D9C5] bg-white/85"
                              : "border-zinc-700 bg-zinc-950/20",
                          )}
                        >
                          <button
                            type="button"
                            className={clsx(
                              "p-1.5 transition sm:p-2",
                              contentTextClass,
                              isLightTheme ? "hover:bg-[#E8D9C5]" : "hover:bg-zinc-800",
                            )}
                            onClick={() => updateItemQuantity(item.id, -1)}
                            aria-label={`Remove one ${item.name}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className={clsx("w-7 text-center text-xs font-semibold sm:w-8 sm:text-sm", contentTextClass)}>
                            {quantity}
                          </span>
                          <button
                            type="button"
                            className={clsx(
                              "p-1.5 transition sm:p-2",
                              contentTextClass,
                              isLightTheme ? "hover:bg-[#E8D9C5]" : "hover:bg-zinc-800",
                            )}
                            onClick={() => updateItemQuantity(item.id, 1)}
                            aria-label={`Add one ${item.name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {itemModifierOptions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {itemModifierOptions.slice(0, 3).map((option) => {
                          const selected = selectedModifiers.some((entry) => entry.id === option.id);
                          return (
                            <button
                              key={`${item.id}_${option.id}`}
                              type="button"
                              className={clsx(
                                "rounded-full border px-2 py-1 text-[11px] font-medium transition",
                                selected
                                  ? "text-zinc-950"
                                  : isLightTheme
                                    ? "text-brand-dark/80"
                                    : "text-zinc-200",
                              )}
                              style={
                                selected
                                  ? {
                                      borderColor: withAlpha(WARM_HIGHLIGHT, 0.5),
                                      background: `linear-gradient(180deg, ${WARM_HIGHLIGHT} 0%, ${LUXURY_GOLD} 100%)`,
                                    }
                                  : {
                                      borderColor: withAlpha(WARM_HIGHLIGHT, 0.25),
                                      backgroundColor: isLightTheme
                                        ? withAlpha("#E8D9C5", 0.95)
                                        : withAlpha(SOFT_DARK_SURFACE, 0.7),
                                    }
                              }
                              onClick={() => {
                                if (!item.isAvailable) {
                                  return;
                                }
                                if (quantity === 0) {
                                  updateItemQuantity(item.id, 1);
                                }
                                toggleModifierSelection(item.id, option);
                              }}
                            >
                              {option.label}
                              {option.price > 0 ? ` +${formatMoney(option.price)}` : ""}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
      ) : null}

      {!isStandaloneCartRoute ? (
      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 sm:px-6">
        <div
          className="mx-auto w-full max-w-4xl rounded-2xl border p-2 shadow-[0_30px_80px_-44px_rgba(0,0,0,0.98)] backdrop-blur-xl"
          style={{
            borderColor: withAlpha(WARM_HIGHLIGHT, 0.3),
            background: bottomBarGradient,
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="flex items-center justify-between rounded-xl border px-4 py-3 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] transition active:translate-y-px"
              style={{
                borderColor: withAlpha(ROYAL_NAVY, 0.34),
                background: isLightTheme
                  ? "linear-gradient(180deg, #F8F5F0 0%, #E8D9C5 100%)"
                  : `linear-gradient(180deg, #2E2A26 0%, #7A6D60 100%)`,
                color: isLightTheme ? "#2E2A26" : undefined,
              }}
              onClick={openBillDrawer}
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <ReceiptText className="h-5 w-5" />
                {"My Bill"}
              </span>
              <span
                className={clsx(
                  "rounded-lg px-2 py-1 text-xs font-semibold",
                  isLightTheme ? "bg-[#E8D9C5] text-brand-dark" : "bg-black/20",
                )}
              >
                {formatMoney(unpaidTotal)}
              </span>
            </button>

            <button
              type="button"
              className="flex items-center justify-between rounded-xl border px-4 py-3 text-brand-dark shadow-[0_16px_36px_-24px_rgba(0,0,0,0.95)] transition disabled:cursor-not-allowed disabled:opacity-60 active:translate-y-px"
              style={{
                borderColor: withAlpha(LUXURY_GOLD, 0.42),
                background: `linear-gradient(180deg, ${WARM_HIGHLIGHT} 0%, ${LUXURY_GOLD} 100%)`,
              }}
              onClick={openCartPage}
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <ShoppingBag className="h-5 w-5" />
                {"Cart"} {cartCount > 0 ? `(${cartCount})` : ""}
              </span>
              <span className="rounded-lg bg-black/10 px-2 py-1 text-xs font-semibold">
                {formatMoney(cartPayableTotal)}
              </span>
            </button>
          </div>
        </div>
      </div>
      ) : null}

      {billOpen ? (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm"
          style={{
            backgroundColor: overlayShade,
            animation: "luxe-fade-in 0.22s ease-out",
          }}
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setBillOpen(false)}
            aria-label="Close bill"
          />

          <aside
            className={clsx(
              "absolute inset-0 h-[100dvh] overflow-hidden rounded-none border-0 shadow-none md:bottom-4 md:left-auto md:right-4 md:top-4 md:h-auto md:w-[480px] md:max-h-[unset] md:rounded-3xl md:border md:shadow-[0_28px_80px_-38px_rgba(0,0,0,0.98)]",
              isLightTheme ? "text-brand-dark" : "text-zinc-100",
            )}
            style={{
              borderColor: accentBorder,
              animation: "luxe-sheet-up 0.25s ease-out",
              background: sheetGradient,
            }}
          >
            <div className="flex h-full flex-col">
              <div
                className={clsx(
                  "flex items-center justify-between border-b px-5 py-4",
                  isLightTheme ? "border-[#E8D9C5]" : "border-zinc-800/90",
                )}
              >
                <h2 className="text-lg font-semibold">{"My Bill"}</h2>
                <button
                  type="button"
                  className={clsx(
                    "rounded-lg border px-3 py-1 text-sm transition",
                    isLightTheme
                      ? "text-brand-dark hover:bg-white/70"
                      : "text-zinc-300 hover:bg-zinc-800",
                  )}
                  style={{ borderColor: withAlpha(WARM_HIGHLIGHT, 0.25) }}
                  onClick={() => setBillOpen(false)}
                >
                  Close
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                {billSyncMessage ? (
                  <div
                    className="rounded-xl border p-3 text-xs"
                    style={{
                      borderColor: withAlpha(WARM_HIGHLIGHT, 0.35),
                      backgroundColor: withAlpha(LUXURY_GOLD, 0.14),
                      color: WARM_HIGHLIGHT,
                    }}
                  >
                    {billSyncMessage}
                  </div>
                ) : null}

                {tableOrders.length === 0 ? (
                  <div
                    className={clsx(
                      "space-y-3 rounded-xl border p-4 text-sm",
                      isLightTheme
                        ? "border-[#E8D9C5] bg-[#F8F5F0] text-brand-dark/75"
                        : "border-zinc-800 bg-zinc-900/70 text-zinc-300",
                    )}
                  >
                    <p className={clsx("font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
                      No active order yet.
                    </p>
                    <p>{"Tap Add More Items to start your order."}</p>
                  </div>
                ) : (
                  <>
                    <div
                      className={clsx(
                        "rounded-xl border p-4",
                        isLightTheme ? "bg-[#F8F5F0]" : "bg-zinc-900/70",
                      )}
                      style={{ borderColor: accentSubtle }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                            Current Bill
                          </p>
                          <p className={clsx("mt-1 text-sm font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
                            {currentBillOrderNumber}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            Table: {tableInfo?.tableNo || tableLabel}
                          </p>
                        </div>
                        <div className="space-y-1 text-right">
                          <span
                            className={clsx(
                              "inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold",
                              isOrderClosed(currentBillStatus, currentBillPaymentStatus)
                                ? "text-zinc-950"
                                : "text-zinc-900",
                            )}
                            style={
                              isOrderClosed(currentBillStatus, currentBillPaymentStatus)
                                ? { borderColor: withAlpha(WARM_HIGHLIGHT, 0.42), backgroundColor: WARM_HIGHLIGHT }
                                : { borderColor: accentBorder, backgroundColor: accentColor }
                            }
                          >
                            {getOrderStatusLabel(currentBillStatus)}
                          </span>
                          <p className="text-[11px] text-zinc-400">
                            {getPaymentStatusLabel(currentBillPaymentStatus)}
                          </p>
                        </div>
                      </div>

                      <div
                        className={clsx(
                          "mt-4 space-y-3 rounded-xl border p-3.5 text-sm",
                          isLightTheme
                            ? "border-[#E8D9C5] bg-white/80"
                            : "border-zinc-800 bg-zinc-950/60",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={clsx(isLightTheme ? "text-brand-dark/70" : "text-zinc-300")}>Original Subtotal</span>
                          <span className={clsx("font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
                            {formatMoney(currentBillSubtotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={clsx(isLightTheme ? "text-brand-dark/70" : "text-zinc-300")}>
                            Tax / Charges {taxPercentage > 0 ? `(${taxPercentage}%)` : ""}
                          </span>
                          <span className={clsx("font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
                            {formatMoney(currentBillTaxAmount)}
                          </span>
                        </div>
                        {bestBillOffer ? (
                          <>
                            <div className="flex items-center justify-between text-xs">
                              <span className={clsx(isLightTheme ? "text-brand-dark/70" : "text-zinc-300")}>Applied Offer</span>
                              <span className={clsx("font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
                                {bestBillOffer.offer.offerName}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className={clsx(isLightTheme ? "text-brand-dark/70" : "text-zinc-300")}>Offer Discount</span>
                              <span className={clsx("font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
                                -{formatMoney(billOfferDiscountAmount)}
                              </span>
                            </div>
                          </>
                        ) : null}
                        <div
                          className={clsx(
                            "flex items-center justify-between border-t pt-2",
                            isLightTheme ? "border-[#E8D9C5]" : "border-zinc-800",
                          )}
                        >
                          <span className={clsx(isLightTheme ? "text-brand-dark/85" : "text-zinc-200")}>Final Payable</span>
                          <span className="text-base font-bold" style={{ color: WARM_HIGHLIGHT }}>
                            {formatMoney(billPayableTotal)}
                          </span>
                        </div>
                        <div className={clsx("flex items-center justify-between text-xs", isLightTheme ? "text-brand-dark/65" : "text-zinc-400")}>
                          <span>Payment Method</span>
                          <span>{currentBillPaymentMethod === "UPI" ? "UPI" : "Pay At Counter"}</span>
                        </div>
                        <div className={clsx("flex items-center justify-between text-xs", isLightTheme ? "text-brand-dark/65" : "text-zinc-400")}>
                          <span>Currency</span>
                          <span>{normalizedCurrency}</span>
                        </div>
                        <div className={clsx("flex items-center justify-between text-xs", isLightTheme ? "text-brand-dark/65" : "text-zinc-400")}>
                          <span>Last Updated</span>
                          <span>
                            {formatBillDateTime(currentBillUpdatedAt)}
                          </span>
                        </div>
                        {currentBillInstructions ? (
                          <div
                            className={clsx(
                              "rounded-lg border px-2 py-2 text-xs",
                              isLightTheme
                                ? "border-[#E8D9C5] bg-[#F8F5F0] text-brand-dark/80"
                                : "border-zinc-800 bg-zinc-900/70 text-zinc-300",
                            )}
                          >
                            <span className={clsx("font-medium", isLightTheme ? "text-brand-dark" : "text-zinc-200")}>
                              Kitchen instructions:{" "}
                            </span>
                            {currentBillInstructions}
                          </div>
                        ) : null}

                        {applicableBillOffers.length > 0 ? (
                          <div
                            className={clsx(
                              "rounded-lg border px-2.5 py-2 text-xs",
                              isLightTheme
                                ? "border-[#E8D9C5] bg-[#F8F5F0] text-brand-dark/85"
                                : "border-zinc-800 bg-zinc-900/70 text-zinc-300",
                            )}
                          >
                            <p className={clsx("mb-1 font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
                              Applicable Offers
                            </p>
                            <div className="space-y-1.5">
                              {applicableBillOffers.map((offerPreview) => (
                                <div
                                  key={`bill_offer_${offerPreview.offerId}`}
                                  className="rounded-md border px-2 py-1.5"
                                  style={{
                                    borderColor: withAlpha(WARM_HIGHLIGHT, 0.26),
                                    backgroundColor: withAlpha(WARM_HIGHLIGHT, isLightTheme ? 0.1 : 0.05),
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate font-medium">{offerPreview.offerName}</p>
                                    <span className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em]">
                                      {offerPreview.offerType}
                                    </span>
                                  </div>
                                  <p className={clsx("mt-0.5 text-[11px]", isLightTheme ? "text-brand-dark/70" : "text-zinc-400")}>
                                    {offerPreview.matchedReason}
                                  </p>
                                  <p className={clsx("mt-0.5 text-[11px] font-medium", isLightTheme ? "text-brand-dark" : "text-zinc-200")}>
                                    {offerPreview.estimatedBenefit !== null
                                      ? `Estimated benefit: ${formatMoney(offerPreview.estimatedBenefit)}`
                                      : "Estimated benefit: based on offer terms"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {currentBillUpiLink ? (
                        <div
                          className={clsx(
                            "mt-3 rounded-xl border p-3 text-sm",
                            isLightTheme
                              ? "border-[#E8D9C5] bg-[#F8F5F0]"
                              : "border-zinc-800 bg-zinc-900/60",
                          )}
                        >
                          <p className={clsx("text-xs uppercase tracking-[0.14em]", isLightTheme ? "text-brand-dark/65" : "text-zinc-400")}>
                            UPI Payment
                          </p>
                          <p className={clsx("mt-1 font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
                            {configuredUpiName} ({configuredUpiId})
                          </p>
                          <p className={clsx("mt-1 text-xs", isLightTheme ? "text-brand-dark/70" : "text-zinc-400")}>
                            Amount:{" "}
                            <span className={clsx("font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-200")}>
                              {formatMoney(billPayableTotal)}
                            </span>
                          </p>
                          <button
                            type="button"
                            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold text-zinc-950 transition active:translate-y-px"
                            style={{
                              borderColor: withAlpha(WARM_HIGHLIGHT, 0.45),
                              background: `linear-gradient(180deg, ${WARM_HIGHLIGHT} 0%, ${LUXURY_GOLD} 100%)`,
                            }}
                            onClick={() => handleUpiPayClick(currentBillUpiLink)}
                          >
                            {"Pay With Any UPI App"}
                          </button>
                          <button
                            type="button"
                            className={clsx(
                              "mt-2 inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition",
                              isLightTheme
                                ? "border-[#E8D9C5] bg-white text-brand-dark hover:bg-[#F8F5F0]"
                                : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
                            )}
                            onClick={() => handleShowUpiQr(currentBillUpiLink, billPayableTotal)}
                          >
                            {"Pay By QR (Recommended)"}
                          </button>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className={clsx(
                                "rounded-lg border px-2 py-1 text-[11px] font-medium transition",
                                isLightTheme
                                  ? "border-[#E8D9C5] bg-white/90 text-brand-dark hover:bg-[#F8F5F0]"
                                  : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                              )}
                              onClick={() => copyTextWithNotice(configuredUpiId, "UPI ID copied.")}
                            >
                              {"Copy UPI ID"}
                            </button>
                            <button
                              type="button"
                              className={clsx(
                                "rounded-lg border px-2 py-1 text-[11px] font-medium transition",
                                isLightTheme
                                  ? "border-[#E8D9C5] bg-white/90 text-brand-dark hover:bg-[#F8F5F0]"
                                  : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                              )}
                              onClick={() =>
                                copyTextWithNotice(Number(billPayableTotal).toFixed(2), "Amount copied.")
                              }
                            >
                              {"Copy Amount"}
                            </button>
                          </div>
                          {canLaunchUpiDeepLink && lastUpiLaunchUri ? (
                            <p className="mt-2 break-all rounded-lg border border-zinc-700/60 bg-zinc-950/75 px-2 py-1.5 text-[10px] text-zinc-300 md:hidden">
                              URI Debug: {lastUpiLaunchUri}
                            </p>
                          ) : null}
                          {!canLaunchUpiDeepLink ? (
                            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2 text-[11px] text-zinc-400">
                              <p>
                                {"Open this page on your phone to pay with any UPI app."}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="rounded-lg border border-zinc-700 px-2 py-1 font-medium text-zinc-200 transition hover:bg-zinc-800"
                                  onClick={() =>
                                    copyTextWithNotice(
                                      configuredUpiId,
                                      "UPI ID copied.",
                                    )
                                  }
                                >
                                  {"Copy UPI ID"}
                                </button>
                                <button
                                  type="button"
                                  className="rounded-lg border border-zinc-700 px-2 py-1 font-medium text-zinc-200 transition hover:bg-zinc-800"
                                  onClick={() =>
                                    copyTextWithNotice(
                                      currentBillUpiLink,
                                      "Payment link copied.",
                                    )
                                  }
                                >
                                  {"Copy Payment Link"}
                                </button>
                                <button
                                  type="button"
                                  className="rounded-lg border border-zinc-700 px-2 py-1 font-medium text-zinc-200 transition hover:bg-zinc-800"
                                  onClick={() =>
                                    copyTextWithNotice(
                                      Number(billPayableTotal).toFixed(2),
                                      "Amount copied.",
                                    )
                                  }
                                >
                                  {"Copy Amount"}
                                </button>
                              </div>
                            </div>
                          ) : null}
                          <p className={clsx("mt-2 text-[11px]", isLightTheme ? "text-brand-dark/70" : "text-zinc-400")}>
                            {"Payment stays pending until cashier confirms your bill."}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <section className="space-y-2">
                      <p className={clsx("text-xs uppercase tracking-[0.16em]", mutedTextClass)}>
                        Itemized Charges
                      </p>
                      <div className="space-y-2">
                        {currentBillItems.map((lineItem) => (
                          <div
                            key={lineItem.lineKey}
                            className={clsx(
                              "rounded-xl border p-3",
                              isLightTheme
                                ? "border-[#E8D9C5] bg-[#F8F5F0]"
                                : "border-zinc-800/30 bg-white/10",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={clsx("truncate text-sm font-semibold", contentTextClass)}>
                                  {lineItem.name}
                                </p>
                                <p className={clsx("text-xs", mutedTextClass)}>
                                  {lineItem.quantity} x {formatMoney(lineItem.unitPrice)}
                                </p>
                                {lineItem.modifiers.length > 0 ? (
                                  <p className={clsx("mt-1 line-clamp-2 text-[11px]", mutedTextClass)}>
                                    {lineItem.modifiers
                                      .map((modifier) =>
                                        modifier.price > 0
                                          ? `${modifier.label} (+${formatMoney(modifier.price)})`
                                          : modifier.label,
                                      )
                                      .join(", ")}
                                  </p>
                                ) : null}
                              </div>
                              <p className="text-sm font-semibold" style={{ color: isLightTheme ? "#2E2A26" : "#E8D9C5" }}>
                                {formatMoney(lineItem.lineTotal)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {unpaidOrders.length > 0 ? (
                      <section className="space-y-2">
                        <p className={clsx("text-xs uppercase tracking-[0.16em]", isLightTheme ? "text-brand-dark/65" : "text-zinc-400")}>
                          Unpaid Bills ({unpaidOrders.length})
                        </p>
                        <div
                          className={clsx(
                            "rounded-xl border p-3",
                            isLightTheme
                              ? "border-[#E8D9C5] bg-[#F8F5F0]"
                              : "border-zinc-800 bg-zinc-900/60",
                          )}
                        >
                          <div className={clsx("mb-3 flex items-center justify-between text-xs", isLightTheme ? "text-brand-dark/65" : "text-zinc-400")}>
                            <span>Total due</span>
                            <span className="font-semibold" style={{ color: WARM_HIGHLIGHT }}>
                              {formatMoney(unpaidTotal)}
                            </span>
                          </div>
                          {counterUnpaidOrders.length > 0 || upiUnpaidOrders.length > 0 ? (
                            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {counterUnpaidOrders.length > 0 ? (
                                <button
                                  type="button"
                                  className={clsx(
                                    "inline-flex w-full items-center justify-center rounded-lg border px-2 py-2 text-xs font-medium transition disabled:opacity-60",
                                    isLightTheme
                                      ? "text-brand-dark hover:bg-white/70"
                                      : "text-zinc-100 hover:bg-zinc-800",
                                  )}
                                  style={{ borderColor: withAlpha(WARM_HIGHLIGHT, 0.3) }}
                                  onClick={switchAllUnpaidBillsToUpi}
                                  disabled={billActionOrderId.length > 0}
                                >
                                  {billActionOrderId.length > 0
                                    ? "Updating..."
                                    : `Switch ${counterUnpaidOrders.length} To UPI`}
                                </button>
                              ) : null}
                              {upiUnpaidOrders.length > 0 ? (
                                <button
                                  type="button"
                                  className={clsx(
                                    "inline-flex w-full items-center justify-center rounded-lg border px-2 py-2 text-xs font-medium transition disabled:opacity-60",
                                    isLightTheme
                                      ? "text-brand-dark hover:bg-white/70"
                                      : "text-zinc-100 hover:bg-zinc-800",
                                  )}
                                  style={{ borderColor: withAlpha(WARM_HIGHLIGHT, 0.3) }}
                                  onClick={switchAllUnpaidBillsToManual}
                                  disabled={billActionOrderId.length > 0}
                                >
                                  {billActionOrderId.length > 0
                                    ? "Updating..."
                                    : `Switch ${upiUnpaidOrders.length} To Manual`}
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                          <div className="space-y-2">
                            {unpaidOrders.map((order) => {
                              return (
                                <div
                                  key={`unpaid_${order.orderId}`}
                                  className={clsx(
                                    "rounded-xl border p-3 transition",
                                    isLightTheme
                                      ? "border-[#E8D9C5] bg-white/85"
                                      : "bg-zinc-900/55",
                                  )}
                                  style={{
                                    borderColor: withAlpha(WARM_HIGHLIGHT, 0.2),
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className={clsx("truncate text-sm font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
                                        {order.orderNumber}
                                      </p>
                                      <p className={clsx("text-[11px]", isLightTheme ? "text-brand-dark/65" : "text-zinc-400")}>
                                        {formatBillDateTime(order.createdAt)}
                                      </p>
                                    </div>
                                    <p className="text-sm font-semibold" style={{ color: WARM_HIGHLIGHT }}>
                                      {formatMoney(order.totalAmount > 0 ? order.totalAmount : order.subtotal)}
                                    </p>
                                  </div>
                                  <p className={clsx("mt-2 text-[11px]", isLightTheme ? "text-brand-dark/65" : "text-zinc-400")}>
                                    {order.paymentMethod === "UPI" ? "UPI" : "Pay At Counter"} /{" "}
                                    {getPaymentStatusLabel(order.paymentStatus)}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </section>
                    ) : null}

                    <section className="space-y-2">
                      <p className={clsx("text-xs uppercase tracking-[0.16em]", mutedTextClass)}>
                        Order History
                      </p>
                      <div className="space-y-2">
                        {tableOrders.map((order) => (
                          <div
                            key={order.orderId}
                            className={clsx(
                              "rounded-xl border p-3",
                              isLightTheme
                                ? "border-[#E8D9C5] bg-[#F8F5F0]"
                                : "border-zinc-800/30 bg-white/10",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={clsx("truncate text-sm font-semibold", contentTextClass)}>
                                  {order.orderNumber}
                                </p>
                                <p className={clsx("mt-0.5 text-xs", mutedTextClass)}>
                                  {formatBillDateTime(order.createdAt)}
                                </p>
                                {order.instructions ? (
                                  <p className={clsx("mt-1 line-clamp-2 text-[11px]", mutedTextClass)}>
                                    {order.instructions}
                                  </p>
                                ) : null}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold" style={{ color: isLightTheme ? "#2E2A26" : "#E8D9C5" }}>
                                  {formatMoney(order.totalAmount)}
                                </p>
                                <p className={clsx("text-[11px]", mutedTextClass)}>
                                  {getOrderStatusLabel(order.status)} / {getPaymentStatusLabel(order.paymentStatus)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </div>

              <div
                className={clsx(
                  "space-y-2 border-t px-4 py-4",
                  isLightTheme ? "border-[#E8D9C5]" : "border-zinc-800",
                )}
              >
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-brand-dark transition"
                  style={{
                    borderColor: withAlpha(ROYAL_NAVY, 0.4),
                    background: `linear-gradient(180deg, ${WARM_HIGHLIGHT} 0%, ${LUXURY_GOLD} 100%)`,
                  }}
                  onClick={backToMenuFromBill}
                >
                  <Plus className="h-4 w-4" />
                  {"Add More Items"}
                </button>

                <button
                  type="button"
                  className={clsx(
                    "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                    isLightTheme
                      ? "border-[#E8D9C5] bg-white text-brand-dark hover:bg-[#F8F5F0]"
                      : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
                  )}
                  onClick={refreshBillFromBackend}
                  disabled={billSyncing}
                >
                  {billSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {"Refreshing..."}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      {"Refresh Bill"}
                    </>
                  )}
                </button>

              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {shouldShowCartPanel ? (
        <div
          className={clsx(
            isStandaloneCartRoute
              ? "relative z-40 mx-auto w-full max-w-3xl px-4 pb-8 pt-4 sm:px-6"
              : "fixed inset-0 z-40 backdrop-blur-sm",
          )}
          style={
            isStandaloneCartRoute
              ? undefined
              : {
                  backgroundColor: overlayShade,
                  animation: "luxe-fade-in 0.22s ease-out",
                }
          }
        >
          {!isStandaloneCartRoute ? (
            <button
              type="button"
              className="absolute inset-0 h-full w-full cursor-default"
              onClick={closeCartView}
              aria-label="Close cart"
            />
          ) : null}

          <aside
            className={clsx(
              isStandaloneCartRoute
                ? "relative w-full min-h-[calc(100dvh-2rem)] overflow-visible rounded-3xl border shadow-[0_28px_80px_-38px_rgba(0,0,0,0.34)] sm:min-h-[calc(100dvh-2.5rem)]"
                : "absolute inset-0 w-full h-[100dvh] overflow-hidden rounded-none border-0 shadow-none md:bottom-4 md:left-auto md:right-4 md:top-4 md:h-auto md:w-[480px] md:max-h-[unset] md:rounded-3xl md:border md:shadow-[0_28px_80px_-38px_rgba(0,0,0,0.98)]",
              isLightTheme ? "text-brand-dark" : "text-zinc-100",
            )}
            style={{
              borderColor: accentBorder,
              animation: isStandaloneCartRoute ? undefined : "luxe-sheet-up 0.25s ease-out",
              background: sheetGradient,
            }}
          >
            <div className={clsx("flex flex-col", isStandaloneCartRoute ? "h-auto" : "h-full")}>
              <div
                className={clsx(
                  "border-b px-5 pb-4 pt-[calc(env(safe-area-inset-top)+12px)] md:rounded-t-3xl md:px-5 md:pt-5",
                  isLightTheme ? "border-[#E8D9C5]" : "border-zinc-800/90",
                )}
                style={{
                  background: isLightTheme
                    ? "linear-gradient(180deg, rgba(248,245,240,0.97) 0%, rgba(232,217,197,0.9) 100%)"
                    : withAlpha(SOFT_DARK_SURFACE, 0.9),
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[1.1rem] font-semibold leading-tight">{"Your Cart"}</h2>
                    <p className={clsx("mt-1 text-[11px]", isLightTheme ? "text-brand-dark/70" : "text-zinc-400")}>
                      {cartCount} item{cartCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className={clsx(
                        "inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-medium transition disabled:opacity-50",
                        isLightTheme
                          ? "text-brand-dark hover:bg-white/70"
                          : "text-zinc-300 hover:bg-zinc-800",
                      )}
                      style={{ borderColor: withAlpha(WARM_HIGHLIGHT, 0.25) }}
                      onClick={clearCart}
                      disabled={cartCount === 0}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear
                    </button>
                    <button
                      type="button"
                      className={clsx(
                        "inline-flex h-8 items-center rounded-lg border px-2.5 text-[11px] font-medium transition",
                        isLightTheme
                          ? "text-brand-dark hover:bg-white/70"
                          : "text-zinc-300 hover:bg-zinc-800",
                      )}
                      style={{ borderColor: withAlpha(WARM_HIGHLIGHT, 0.25) }}
                      onClick={closeCartView}
                    >
                      {isStandaloneCartRoute ? "Back To Menu" : "Close"}
                    </button>
                  </div>
                </div>
              </div>

              <div
                className={clsx(
                  isStandaloneCartRoute ? "px-5 py-5 md:px-5" : "flex-1 overflow-y-auto px-5 py-5 md:px-5",
                )}
              >
                {cartItems.length === 0 ? (
                  <div
                    className={clsx(
                      "space-y-3 rounded-2xl border p-4 text-sm",
                      isLightTheme
                        ? "border-[#E8D9C5] bg-[#F8F5F0] text-brand-dark/75"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-300",
                    )}
                  >
                    <p>{"Your cart is empty."}</p>
                    <button
                      type="button"
                      className={clsx(
                        "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition",
                        isLightTheme
                          ? "text-brand-dark hover:bg-white/70"
                          : "text-zinc-100 hover:bg-zinc-800",
                      )}
                      style={{ borderColor: withAlpha(WARM_HIGHLIGHT, 0.28) }}
                      onClick={browseMenuFromCart}
                    >
                      {"Browse Menu"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cartItems.map(({ item, quantity }) => {
                      const selected = resolvedSelectedModifiersByItem[item.id] ?? [];
                      const modifierOptions = modifierOptionsByItem[item.id] ?? [];
                      const modifierUnitTotal = getSelectedModifierTotal(selected);
                      const effectiveUnit = item.price + modifierUnitTotal;
                      const secondaryLine = item.description || item.nameHi;

                      return (
                        <section
                          key={item.id}
                          className={clsx(
                            "rounded-2xl border p-3.5",
                            isLightTheme
                              ? "border-[#E8D9C5] bg-[#F8F5F0]"
                              : "border-zinc-800/30 bg-white/10",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className={clsx("truncate text-sm font-semibold", contentTextClass)}>{item.name}</p>
                              {secondaryLine ? (
                                <p className={clsx("line-clamp-2 text-xs leading-relaxed", secondaryTextClass)}>
                                  {secondaryLine}
                                </p>
                              ) : null}
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold" style={{ color: isLightTheme ? "#2E2A26" : "#E8D9C5" }}>
                                {formatMoney(effectiveUnit * quantity)}
                              </p>
                              <p className={clsx("mt-0.5 text-[11px]", mutedTextClass)}>
                                {formatMoney(effectiveUnit)} each
                              </p>
                            </div>
                          </div>

                          {selected.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {selected.map((modifier) => (
                                <span
                                  key={`${item.id}_selected_${modifier.id}`}
                                  className="inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium leading-none"
                                  style={{
                                    borderColor: withAlpha(WARM_HIGHLIGHT, 0.28),
                                    backgroundColor: withAlpha(WARM_HIGHLIGHT, isLightTheme ? 0.22 : 0.12),
                                    color: isLightTheme ? "#2E2A26" : "#E8D9C5",
                                  }}
                                >
                                  {modifier.label}
                                  {modifier.price > 0 ? ` +${formatMoney(modifier.price)}` : ""}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div
                              className={clsx(
                                "inline-flex items-center rounded-xl border",
                                isLightTheme
                                  ? "border-[#E8D9C5] bg-white/90"
                                  : "border-zinc-800/30 bg-white/20",
                              )}
                            >
                              <button
                                type="button"
                                className={clsx("p-2 transition hover:bg-black/10", contentTextClass)}
                                onClick={() => updateItemQuantity(item.id, -1)}
                                aria-label={`Remove one ${item.name}`}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className={clsx("w-8 text-center text-sm font-semibold", contentTextClass)}>
                                {quantity}
                              </span>
                              <button
                                type="button"
                                className={clsx("p-2 transition hover:bg-black/10", contentTextClass)}
                                onClick={() => updateItemQuantity(item.id, 1)}
                                aria-label={`Add one ${item.name}`}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <p className={clsx("text-[11px]", mutedTextClass)}>
                              {quantity} item{quantity === 1 ? "" : "s"}
                            </p>
                          </div>

                          {modifierOptions.length > 0 ? (
                            <div className="mt-3">
                              <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                                Add-ons
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {modifierOptions.map((option) => {
                                  const isSelected = selected.some((entry) => entry.id === option.id);
                                  return (
                                    <button
                                      key={`${item.id}_cart_option_${option.id}`}
                                      type="button"
                                      className={clsx(
                                        "inline-flex min-h-9 items-center justify-start rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-medium leading-4 transition",
                                        isSelected
                                          ? "text-zinc-950"
                                          : isLightTheme
                                            ? "text-brand-dark/80"
                                            : "text-zinc-200",
                                      )}
                                      style={
                                        isSelected
                                          ? {
                                              borderColor: withAlpha(WARM_HIGHLIGHT, 0.5),
                                              background: `linear-gradient(180deg, ${WARM_HIGHLIGHT} 0%, ${LUXURY_GOLD} 100%)`,
                                            }
                                          : {
                                              borderColor: withAlpha(WARM_HIGHLIGHT, 0.25),
                                              backgroundColor: isLightTheme
                                                ? withAlpha("#E8D9C5", 0.95)
                                                : withAlpha(SOFT_DARK_SURFACE, 0.7),
                                            }
                                      }
                                      onClick={() => toggleModifierSelection(item.id, option)}
                                    >
                                      <span className="line-clamp-2">
                                        {option.label}
                                        {option.price > 0 ? ` +${formatMoney(option.price)}` : ""}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>

              <div
                className={clsx(
                  "space-y-4 border-t px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 md:px-5",
                  isLightTheme ? "border-[#E8D9C5]" : "border-zinc-800",
                )}
              >
                {applicableCartOffers.length > 0 ? (
                  <section
                    className={clsx(
                      "space-y-2 rounded-2xl border p-3.5",
                      isLightTheme
                        ? "border-[#E8D9C5] bg-[#F8F5F0]"
                        : "border-zinc-800 bg-zinc-900/55",
                    )}
                  >
                    <p className={clsx("text-sm font-medium", isLightTheme ? "text-brand-dark/80" : "text-zinc-200")}>
                      Applicable Offers
                    </p>
                    <div className="space-y-2">
                      {applicableCartOffers.map((offerPreview) => (
                        <div
                          key={`cart_offer_${offerPreview.offerId}`}
                          className={clsx(
                            "rounded-xl border px-3 py-2",
                            isLightTheme
                              ? "border-[#E8D9C5] bg-[#F8F5F0]"
                              : "border-zinc-800/30 bg-white/10",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className={clsx("truncate text-sm font-semibold", contentTextClass)}>
                              {offerPreview.offerName}
                            </p>
                            <span className={clsx("shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]", mutedTextClass)}>
                              {offerPreview.offerType}
                            </span>
                          </div>
                          <p className={clsx("mt-1 text-[11px]", secondaryTextClass)}>{offerPreview.matchedReason}</p>
                          <p className={clsx("mt-1 text-[11px] font-medium", isLightTheme ? "text-brand-dark" : "text-zinc-200")}>
                            {offerPreview.estimatedBenefit !== null
                              ? `Estimated benefit: ${formatMoney(offerPreview.estimatedBenefit)}`
                              : "Estimated benefit: based on offer terms"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section
                  className={clsx(
                    "space-y-3 rounded-2xl border p-3.5",
                    isLightTheme
                      ? "border-[#E8D9C5] bg-[#F8F5F0]"
                      : "border-zinc-800 bg-zinc-900/55",
                  )}
                >
                  <p className={clsx("mb-2 text-sm font-medium", isLightTheme ? "text-brand-dark/75" : "text-zinc-300")}>
                    {"Payment Method"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["COUNTER", "UPI"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        className={clsx(
                          "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                          paymentMethod === method
                            ? "text-zinc-950"
                            : isLightTheme
                              ? "border-[#E8D9C5] bg-white/90 text-brand-dark hover:bg-[#F8F5F0]"
                              : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800",
                        )}
                        style={
                          paymentMethod === method
                            ? { borderColor: accentBorder, backgroundColor: accentColor }
                            : undefined
                        }
                        onClick={() => setPaymentMethod(method)}
                      >
                        {method === "UPI" ? (
                          <Sparkles className="h-4 w-4" />
                        ) : (
                          <HandCoins className="h-4 w-4" />
                        )}
                        {method === "UPI" ? "UPI" : "Pay At Counter"}
                      </button>
                    ))}
                  </div>
                </section>

                {paymentMethod === "UPI" ? (
                  <section
                    className={clsx(
                      "rounded-2xl border p-3.5 text-sm",
                      contentTextClass,
                      isLightTheme
                        ? "border-[#E8D9C5] bg-[#F8F5F0]"
                        : "border-zinc-800/30 bg-white/10",
                    )}
                  >
                    <p className="text-[10px] uppercase tracking-[0.14em] opacity-70">UPI Payment</p>
                    <p className="mt-1 text-sm font-semibold">{configuredUpiName}</p>
                    <p className="mt-0.5 text-xs opacity-70">{configuredUpiId}</p>
                    <div
                      className={clsx(
                        "mt-3 flex items-center justify-between rounded-xl border px-3 py-2",
                        isLightTheme
                          ? "border-[#E8D9C5] bg-[#F8F5F0]"
                          : "border-zinc-800/20 bg-black/10",
                      )}
                    >
                      <span className="text-xs opacity-70">Payable Amount</span>
                      <span className="text-sm font-semibold">{formatMoney(cartPayableTotal)}</span>
                    </div>
                    {cartUpiLink ? (
                      <>
                        <button
                          type="button"
                          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border px-3 text-sm font-semibold text-zinc-950 transition active:translate-y-px"
                          style={{
                            borderColor: withAlpha(WARM_HIGHLIGHT, 0.45),
                            background: `linear-gradient(180deg, ${WARM_HIGHLIGHT} 0%, ${LUXURY_GOLD} 100%)`,
                          }}
                          onClick={() => handleUpiPayClick(cartUpiLink)}
                        >
                          {"Pay With Any UPI App"}
                        </button>
                        <button
                          type="button"
                          className={clsx(
                            "mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl border px-3 text-sm font-semibold transition",
                            isLightTheme
                              ? "border-[#E8D9C5] bg-white text-brand-dark hover:bg-[#F8F5F0]"
                              : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
                          )}
                          onClick={() => handleShowUpiQr(cartUpiLink, cartPayableTotal)}
                        >
                          {"Pay By QR (Recommended)"}
                        </button>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={clsx(
                              "rounded-lg border px-2 py-1 text-[11px] font-medium transition",
                              isLightTheme
                                ? "border-[#E8D9C5] bg-white/90 text-brand-dark hover:bg-[#F8F5F0]"
                                : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                            )}
                            onClick={() => copyTextWithNotice(configuredUpiId, "UPI ID copied.")}
                          >
                            {"Copy UPI ID"}
                          </button>
                          <button
                            type="button"
                            className={clsx(
                              "rounded-lg border px-2 py-1 text-[11px] font-medium transition",
                              isLightTheme
                                ? "border-[#E8D9C5] bg-white/90 text-brand-dark hover:bg-[#F8F5F0]"
                                : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                            )}
                            onClick={() => copyTextWithNotice(Number(cartPayableTotal).toFixed(2), "Amount copied.")}
                          >
                            {"Copy Amount"}
                          </button>
                        </div>
                      </>
                    ) : null}
                    {canLaunchUpiDeepLink && lastUpiLaunchUri ? (
                      <p className="mt-2 break-all rounded-lg border border-zinc-700/60 bg-zinc-950/75 px-2 py-1.5 text-[10px] text-zinc-300 md:hidden">
                        URI Debug: {lastUpiLaunchUri}
                      </p>
                    ) : null}
                    {!canLaunchUpiDeepLink ? (
                      <div
                        className={clsx(
                          "mt-3 rounded-lg border p-2 text-[11px]",
                          isLightTheme
                            ? "border-[#E8D9C5] bg-[#F8F5F0] text-brand-dark/75"
                            : "border-zinc-800 bg-zinc-950/70 text-zinc-400",
                        )}
                      >
                        <p>
                          {"Open this page on your phone to pay with any UPI app."}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={clsx(
                              "rounded-lg border px-2 py-1 font-medium transition",
                              isLightTheme
                                ? "border-[#E8D9C5] bg-white text-brand-dark hover:bg-[#F8F5F0]"
                                : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                            )}
                            onClick={() =>
                              copyTextWithNotice(
                                configuredUpiId,
                                "UPI ID copied.",
                              )
                            }
                          >
                            {"Copy UPI ID"}
                          </button>
                          <button
                            type="button"
                            className={clsx(
                              "rounded-lg border px-2 py-1 font-medium transition",
                              isLightTheme
                                ? "border-[#E8D9C5] bg-white text-brand-dark hover:bg-[#F8F5F0]"
                                : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                            )}
                            onClick={() =>
                              copyTextWithNotice(
                                cartUpiLink,
                                "Payment link copied.",
                              )
                            }
                          >
                            {"Copy Payment Link"}
                          </button>
                          <button
                            type="button"
                            className={clsx(
                              "rounded-lg border px-2 py-1 font-medium transition",
                              isLightTheme
                                ? "border-[#E8D9C5] bg-white text-brand-dark hover:bg-[#F8F5F0]"
                                : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                            )}
                            onClick={() =>
                              copyTextWithNotice(
                                Number(cartPayableTotal).toFixed(2),
                                "Amount copied.",
                              )
                            }
                          >
                            {"Copy Amount"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <p className={clsx("mt-2 text-[11px] leading-relaxed", isLightTheme ? "text-brand-dark/70" : "text-zinc-500")}>
                      {"After payment, your status stays pending until cashier confirms."}
                    </p>
                  </section>
                ) : null}

                <section
                  className={clsx(
                    "rounded-2xl border p-3.5",
                    isLightTheme
                      ? "border-[#E8D9C5] bg-[#F8F5F0]"
                      : "border-zinc-800 bg-zinc-900/55",
                  )}
                >
                  <label
                    htmlFor="kitchen-instructions"
                    className={clsx("mb-2 block text-sm font-medium", isLightTheme ? "text-brand-dark/80" : "text-zinc-300")}
                  >
                    {"Kitchen Instructions"}
                  </label>
                  <textarea
                    id="kitchen-instructions"
                    value={kitchenInstructions}
                    onChange={(event) =>
                      setKitchenInstructions(sanitizeInstructionText(event.target.value))
                    }
                    placeholder={"Example: make it spicy, less onion, no mayo"}
                    className={clsx(
                      "min-h-[88px] w-full resize-none rounded-xl border px-3 py-2.5 text-sm leading-5 outline-none",
                      isLightTheme
                        ? "border-[#E8D9C5] bg-white text-brand-dark placeholder:text-brand-dark/45 focus:border-[#C6A57B]"
                        : "border-zinc-700 bg-zinc-950/70 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500",
                    )}
                  />
                </section>

                <section
                  className={clsx(
                    "space-y-2 rounded-2xl border px-3.5 py-3.5 text-sm",
                    contentTextClass,
                    isLightTheme
                      ? "border-[#E8D9C5] bg-[#F8F5F0]"
                      : "border-zinc-800/30 bg-white/10",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="opacity-80">Original Subtotal</span>
                    <span className="font-semibold">{formatMoney(subtotal)}</span>
                  </div>
                  {hasCustomizationsInCart ? (
                    <div className="flex items-center justify-between">
                      <span className="opacity-80">Customizations</span>
                      <span className="font-semibold">
                        Included
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="opacity-80">Tax</span>
                    <span className="font-semibold">{formatMoney(taxAmount)}</span>
                  </div>
                  {bestCartOffer ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="opacity-80">Applied Offer</span>
                        <span className="font-semibold">{bestCartOffer.offer.offerName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="opacity-80">Offer Discount</span>
                        <span className="font-semibold">-{formatMoney(cartOfferDiscountAmount)}</span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="opacity-80">Final Payable</span>
                    <span className="font-semibold" style={{ color: isLightTheme ? "#2E2A26" : "#E8D9C5" }}>
                      {formatMoney(cartPayableTotal)}
                    </span>
                  </div>
                </section>

                <button
                  type="button"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-brand-dark transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: withAlpha(ROYAL_NAVY, 0.4),
                    background: `linear-gradient(180deg, ${WARM_HIGHLIGHT} 0%, ${LUXURY_GOLD} 100%)`,
                  }}
                  onClick={handlePlaceOrder}
                  disabled={cartCount === 0 || placingOrder}
                >
                  {placingOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    "Place Order"
                  )}
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {upiQrOpen && upiQrUri ? (
        <div
          className="fixed inset-0 z-[70] backdrop-blur-sm"
          style={{ backgroundColor: overlayShade }}
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={closeUpiQrSheet}
            aria-label="Close UPI QR sheet"
          />
          <aside
            className={clsx(
              "absolute inset-x-0 bottom-0 mx-auto w-full max-w-[480px] rounded-t-3xl border px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.98)] md:inset-y-0 md:my-auto md:h-fit md:rounded-3xl",
              isLightTheme
                ? "border-[#E8D9C5] bg-[#F8F5F0] text-brand-dark"
                : "border-zinc-800 bg-zinc-950/95 text-zinc-100",
            )}
            style={{ borderColor: accentSubtle }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={clsx("text-[10px] uppercase tracking-[0.16em]", isLightTheme ? "text-brand-dark/65" : "text-zinc-400")}>
                  UPI Payment QR
                </p>
                <h3 className={clsx("mt-1 text-sm font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>Scan And Pay</h3>
              </div>
              <button
                type="button"
                className={clsx(
                  "rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                  isLightTheme
                    ? "border-[#E8D9C5] bg-white text-brand-dark hover:bg-[#F8F5F0]"
                    : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                )}
                onClick={closeUpiQrSheet}
              >
                Close
              </button>
            </div>

            <div className="mt-3 rounded-2xl border border-zinc-800 bg-white p-3">
              {upiQrImageSrc ? (
                <img
                  src={upiQrImageSrc}
                  alt="UPI payment QR"
                  className="mx-auto aspect-square w-full max-w-[320px] rounded-xl object-contain"
                  loading="eager"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-zinc-100 text-xs text-zinc-500">
                  Unable to load QR
                </div>
              )}
            </div>

            <div
              className={clsx(
                "mt-3 space-y-1 rounded-xl border px-3 py-2 text-xs",
                isLightTheme
                  ? "border-[#E8D9C5] bg-white/90 text-brand-dark/80"
                  : "border-zinc-800 bg-zinc-900/70",
              )}
            >
              <p className={clsx("font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>{configuredUpiName}</p>
              <p className={clsx(isLightTheme ? "text-brand-dark/70" : "text-zinc-300")}>{configuredUpiId}</p>
              <p className={clsx(isLightTheme ? "text-brand-dark/70" : "text-zinc-300")}>
                Amount: <span className={clsx("font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>{formatMoney(upiQrAmountNumber)}</span>
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={clsx(
                  "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                  isLightTheme
                    ? "border-[#E8D9C5] bg-white text-brand-dark hover:bg-[#F8F5F0]"
                    : "border-zinc-700 text-zinc-100 hover:bg-zinc-800",
                )}
                onClick={() => copyTextWithNotice(configuredUpiId, "UPI ID copied.")}
              >
                Copy UPI ID
              </button>
              <button
                type="button"
                className={clsx(
                  "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                  isLightTheme
                    ? "border-[#E8D9C5] bg-white text-brand-dark hover:bg-[#F8F5F0]"
                    : "border-zinc-700 text-zinc-100 hover:bg-zinc-800",
                )}
                onClick={() => copyTextWithNotice(upiQrAmount, "Amount copied.")}
              >
                Copy Amount
              </button>
            </div>

            <p className={clsx("mt-3 text-[11px]", isLightTheme ? "text-brand-dark/70" : "text-zinc-400")}>
              Payment status stays pending until cashier/admin confirms.
            </p>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
