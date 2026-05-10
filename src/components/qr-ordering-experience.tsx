"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
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
  X,
} from "lucide-react";

import {
  appwriteConfig,
  createDocumentWithFallback,
  fetchAllDocuments,
  type AppwriteDocument,
  Query,
  updateDocumentWithFallback,
} from "@/lib/appwrite";
import { WEBSITE_COLORS, WEBSITE_STYLE_CLASSES } from "@/lib/design-tokens";
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

type MenuCategorySection = {
  category: Category;
  items: MenuItem[];
};

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

type AddonSelectionMode = "single" | "multi";

type ItemAddonOption = {
  id: string;
  name: string;
  price: number;
  sortOrder: number;
};

type ItemAddonGroup = {
  id: string;
  name: string;
  sortOrder: number;
  selectionMode: AddonSelectionMode;
  required: boolean;
  options: ItemAddonOption[];
};

type SelectedAddon = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
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
  selectedAddons: SelectedAddon[];
};

type TableOrderRecord = {
  orderId: string;
  orderNumber: string;
  sessionId?: string;
  billId?: string;
  orderRound?: number;
  tableNo: string;
  status: string;
  paymentStatus: string;
  paymentMethod: PaymentMethod;
  utrNumber: string;
  subtotal: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  instructions: string;
  items: BillLineItem[];
  source: "local" | "backend";
};

type TableSessionRecord = {
  documentId: string;
  clientId: string;
  tableId: string;
  tableNumber: string;
  sessionId: string;
  billId: string;
  status: string;
  paymentStatus: string;
  lockedBy: string;
  heartbeatAt: string;
  openedAt: string;
  totalAmount: number;
};

type TableSessionLifecycleState =
  | "checking"
  | "ready"
  | "blocked"
  | "needs_recovery"
  | "error";

type OfferEvaluationType = "flat_discount" | "bxgy" | "combo" | "time_based";
type OfferTargetScope = "all" | "category" | "product" | "cart";

type OfferEvaluationLine = {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  categoryRefs: string[];
};

type ApplicableOfferPreview = {
  $id: string;
  offerId: string;
  offerName: string;
  offerType: OfferEvaluationType;
  matchedReason: string;
  estimatedBenefit: number | null;
  discountValue: string;
};

type ItemWiseOfferMatch = {
  itemId: string;
  itemName: string;
  quantity: number;
  offer: ApplicableOfferPreview;
  discountAmount: number;
};

type ItemWiseOfferSummary = {
  offerId: string;
  offerName: string;
  offerType: OfferEvaluationType;
  matchedReason: string;
  matchedItemCount: number;
  matchedItemNames: string[];
  totalDiscountAmount: number;
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
  selectedAddonsByItem: Record<string, SelectedAddon[]>;
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
  ownerBrowserId?: string;
  ownerScopeKey?: string;
  ownedOrderIds?: string[];
  tableSessionDocumentId?: string;
  sessionId?: string;
  billId?: string;
  tableSessionStatus?: string;
  tableSessionPaymentStatus?: string;
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
  ownerBrowserId?: string;
  ownerScopeKey?: string;
  tableSessionDocumentId?: string;
  sessionId?: string;
  billId?: string;
  tableSessionStatus?: string;
  tableSessionPaymentStatus?: string;
  lockedBy?: string;
  orderRound?: number;
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

type CustomerBillScopeState = {
  version: number;
  browserId: string;
  client: string;
  table: string;
  orderIds: string[];
  updatedAt: string;
};

const ENABLE_BACKEND_ORDER_SYNC =
  process.env.NEXT_PUBLIC_ENABLE_BACKEND_ORDER_SYNC === "true";

const CUSTOMER_BROWSER_ID_KEY = "customer_browser_id";
const CUSTOMER_PROFILE_KEY = "customer_profile";
const CUSTOMER_ORDER_HISTORY_PREFIX = "customer_order_history";
const CUSTOMER_BILL_SCOPE_PREFIX = "customer_bill_scope";
const CLIENT_CACHE_RESET_MARKER_KEY = "cafeluxe_cache_reset_20260424";
const CUSTOMER_PROFILE_VERSION = 1;
const CUSTOMER_ORDER_HISTORY_VERSION = 1;
const CUSTOMER_BILL_SCOPE_VERSION = 1;
const MAX_LOCAL_RECENT_ORDERS = 30;
const MAX_LOCAL_FAVORITES = 24;
const MAX_LOCAL_HISTORY_PER_CLIENT = 40;
const MAX_LOCAL_BILL_SCOPE_ORDERS = 120;
const MAX_STORED_STATE_CHARS = 120_000;
const ACTIVE_TABLE_STORAGE_VERSION = 1;
const REQUEST_TIMEOUT_MS = 12000;
const BILL_SYNC_TIMEOUT_MS = 10000;
const ORDER_STATUS_WATCH_INTERVAL_MS = 14000;
const TABLE_SESSION_STATUS_WATCH_INTERVAL_MS = 5000;
const SETTINGS_REFRESH_INTERVAL_MS = 5000;
const MAX_TABLE_ORDER_RECORDS = 60;
const ACTIVE_TABLE_SESSION_STATUSES = ["active", "closing_requested", "payment_pending"];
const CLOSED_TABLE_SESSION_STATUSES = ["closed", "paid"];
const CLOSED_TABLE_SESSION_PAYMENT_STATUSES = ["paid", "settled", "completed"];
const ORDER_LOCKED_TABLE_SESSION_STATUSES = ["closing_requested", "payment_pending"];
const TABLE_SESSION_LOCKED_MESSAGE = "This table is already active on another device.";
const TABLE_SESSION_PAYMENT_PENDING_MESSAGE = "Payment verification is pending at counter.";
const TABLE_SESSION_CLOSED_MESSAGE = "Bill closed. Thank you for visiting Cafe Luxe.";
const SESSION_MONITOR_WARNING_MESSAGE = "Bill status is reconnecting. You can keep using the menu.";
const MAX_ROUTE_CLIENT_LENGTH = 64;
const MAX_ROUTE_TABLE_LENGTH = 32;
const MAX_SEARCH_INPUT_LENGTH = 64;
const MAX_INSTRUCTION_LENGTH = 240;
const DEFAULT_UPI_ID = "7665853321@superyes";
const DEFAULT_UPI_NAME = "Nitin Kumawat";
const DEFAULT_UPI_MERCHANT_CODE = "5812";
const PALETTE_BACKGROUND = WEBSITE_COLORS.background;
const PALETTE_SURFACE = WEBSITE_COLORS.surface;
const PALETTE_ACCENT = WEBSITE_COLORS.accent;
const PALETTE_TEXT = WEBSITE_COLORS.text;
const PALETTE_SECONDARY = WEBSITE_COLORS.secondaryText;
const PALETTE_BASE = PALETTE_SURFACE;
const PALETTE_SUCCESS = PALETTE_SURFACE;
const PALETTE_INFO = PALETTE_BACKGROUND;
const PALETTE_PREMIUM = PALETTE_BACKGROUND;
const ROYAL_NAVY = PALETTE_SECONDARY;
const LUXURY_GOLD = PALETTE_ACCENT;
const DEEP_CHARCOAL = PALETTE_TEXT;
const SOFT_DARK_SURFACE = PALETTE_SURFACE;
const WARM_HIGHLIGHT = PALETTE_ACCENT;

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

type SessionMonitorErrorDetails = {
  message: string;
  code?: string | number;
  type?: string;
  response?: unknown;
  status?: string | number;
  stack?: string;
  raw?: string;
};

function stringifyUnknownError(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (!value) {
    return String(value);
  }
  try {
    const serialized = JSON.stringify(value);
    if (serialized && serialized !== "{}") {
      return serialized;
    }
  } catch {
    // Fall through to String(value).
  }
  return String(value);
}

function extractSessionMonitorError(error: unknown): SessionMonitorErrorDetails {
  const base: SessionMonitorErrorDetails = {
    message: "Unknown session monitor error",
  };

  if (error instanceof Error) {
    const source = error as Error & {
      code?: unknown;
      type?: unknown;
      response?: unknown;
      status?: unknown;
    };
    return {
      message: error.message || error.name || base.message,
      code:
        typeof source.code === "string" || typeof source.code === "number"
          ? source.code
          : undefined,
      type: typeof source.type === "string" ? source.type : undefined,
      response: source.response,
      status:
        typeof source.status === "string" || typeof source.status === "number"
          ? source.status
          : undefined,
      stack: error.stack,
      raw: error.name || undefined,
    };
  }

  if (typeof error === "object" && error) {
    const source = error as Record<string, unknown>;
    const message =
      typeof source.message === "string" && source.message.trim()
        ? source.message
        : typeof source.error === "string" && source.error.trim()
          ? source.error
          : stringifyUnknownError(error);

    return {
      message: message || base.message,
      code:
        typeof source.code === "string" || typeof source.code === "number"
          ? source.code
          : undefined,
      type: typeof source.type === "string" ? source.type : undefined,
      response: source.response,
      status:
        typeof source.status === "string" || typeof source.status === "number"
          ? source.status
          : undefined,
      stack: typeof source.stack === "string" ? source.stack : undefined,
      raw: stringifyUnknownError(error),
    };
  }

  return {
    message: stringifyUnknownError(error) || base.message,
    raw: stringifyUnknownError(error),
  };
}

function getSessionMonitorErrorSignature(details: SessionMonitorErrorDetails) {
  return [
    details.message,
    details.code ?? "",
    details.status ?? "",
    details.type ?? "",
  ].join("|");
}

function logSessionMonitorError(
  error: unknown,
  consecutiveFailureCount: number,
  previousSignature: string,
) {
  const details = extractSessionMonitorError(error);
  const signature = getSessionMonitorErrorSignature(details);
  const shouldLog =
    consecutiveFailureCount === 1 ||
    signature !== previousSignature ||
    consecutiveFailureCount % 5 === 0;

  if (shouldLog) {
    console.warn("SESSION_MONITOR_ERROR", {
      failureCount: consecutiveFailureCount,
      ...details,
    });
  }

  return signature;
}

const IS_DEV_BUILD = process.env.NODE_ENV !== "production";

function devWarn(...args: unknown[]) {
  if (IS_DEV_BUILD) {
    console.warn(...args);
  }
}

function devError(...args: unknown[]) {
  if (IS_DEV_BUILD) {
    console.error(...args);
  }
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
  // Preserve user spaces and most punctuation for free-form kitchen instructions.
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .slice(0, MAX_INSTRUCTION_LENGTH);
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

function resolveClientTaxConfig(settings: RestaurantSettings) {
  const gstIsEnabled = !!settings.gstEnabled;
  return {
    gstEnabled: gstIsEnabled,
    taxPercentage: gstIsEnabled
      ? Math.min(100, Math.max(0, settings.taxPercentage || 0))
      : 0,
    cgstPercentage: gstIsEnabled
      ? Math.min(100, Math.max(0, settings.cgstPercentage || 0))
      : 0,
    sgstPercentage: gstIsEnabled
      ? Math.min(100, Math.max(0, settings.sgstPercentage || 0))
      : 0,
  };
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

function getRecordBoolean(source: Record<string, unknown>, keys: string[], fallback: boolean) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      if (value === 1) {
        return true;
      }
      if (value === 0) {
        return false;
      }
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "y", "required", "active"].includes(normalized)) {
        return true;
      }
      if (["false", "0", "no", "n", "optional", "inactive"].includes(normalized)) {
        return false;
      }
    }
  }
  return fallback;
}

function normalizeAddonSelectionMode(value: unknown, fallback: AddonSelectionMode = "multi") {
  const normalized = toSafeString(value).toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (
    normalized === "single" ||
    normalized === "one" ||
    normalized === "radio" ||
    normalized === "single_select"
  ) {
    return "single";
  }
  if (
    normalized === "multi" ||
    normalized === "multiple" ||
    normalized === "checkbox" ||
    normalized === "multi_select"
  ) {
    return "multi";
  }
  return fallback;
}

function parseSelectedAddon(value: unknown): SelectedAddon | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const source = value as Record<string, unknown>;
  const groupId = toSafeString(source.groupId ?? source.group_id);
  const groupName = sanitizeUserText(
    toSafeString(source.groupName ?? source.group_name) || "Add-on Group",
    80,
  );
  const optionId = toSafeString(source.optionId ?? source.option_id);
  const optionName = sanitizeUserText(
    toSafeString(source.optionName ?? source.option_name ?? source.name ?? source.label),
    80,
  );

  if (!groupId || !optionId || !optionName) {
    return null;
  }

  return {
    groupId,
    groupName,
    optionId,
    optionName,
    price: toAmount(source.price ?? source.amount),
  };
}

function parseSelectedAddonList(value: unknown): SelectedAddon[] {
  if (!value) {
    return [];
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      return parseSelectedAddonList(JSON.parse(trimmed) as unknown);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed = value
    .map((entry) => parseSelectedAddon(entry))
    .filter((entry): entry is SelectedAddon => !!entry);
  const seen = new Set<string>();
  return parsed.filter((entry) => {
    const token = `${entry.groupId}::${entry.optionId}`;
    if (seen.has(token)) {
      return false;
    }
    seen.add(token);
    return true;
  });
}

function buildItemAddonGroupsByItem(
  routeClient: string,
  menuItems: MenuItem[],
  itemAddonMapDocs: Record<string, unknown>[],
  addonGroupDocs: Record<string, unknown>[],
  addonOptionDocs: Record<string, unknown>[],
) {
  const clientTokens = new Set(buildClientCandidates(routeClient).map((entry) => normalizeRouteToken(entry)));
  const isDocInClientScope = (doc: Record<string, unknown>) => {
    const clientValue = getRecordString(doc, ["client_id", "client"]);
    if (!clientValue) {
      return true;
    }
    return clientTokens.has(normalizeRouteToken(clientValue));
  };

  const menuItemByDirectToken = new Map<string, string>();
  const menuItemByNormalizedToken = new Map<string, string>();
  for (const item of menuItems) {
    menuItemByDirectToken.set(item.id.toLowerCase(), item.id);
    const nameToken = normalizeRouteToken(item.name);
    if (nameToken && !menuItemByNormalizedToken.has(nameToken)) {
      menuItemByNormalizedToken.set(nameToken, item.id);
    }
    const hindiToken = normalizeRouteToken(item.nameHi);
    if (hindiToken && !menuItemByNormalizedToken.has(hindiToken)) {
      menuItemByNormalizedToken.set(hindiToken, item.id);
    }
  }

  const resolveMenuItemId = (rawToken: string) => {
    const cleaned = rawToken.trim();
    if (!cleaned) {
      return "";
    }
    const direct = menuItemByDirectToken.get(cleaned.toLowerCase());
    if (direct) {
      return direct;
    }
    const normalized = normalizeRouteToken(cleaned);
    return menuItemByNormalizedToken.get(normalized) ?? "";
  };

  const addonGroupLookup = new Map<
    string,
    { id: string; name: string; required: boolean; selectionMode: AddonSelectionMode; sortOrder: number }
  >();
  for (const rawDoc of addonGroupDocs) {
    const doc = rawDoc as Record<string, unknown>;
    if (!isDocInClientScope(doc)) {
      continue;
    }
    const id = toSafeString(doc.$id);
    if (!id) {
      continue;
    }
    const isActive = getRecordBoolean(doc, ["active", "is_active", "enabled"], true);
    if (!isActive) {
      continue;
    }
    const name = sanitizeUserText(
      getRecordString(doc, ["name", "title", "label", "group_name"]) || "Add-ons",
      80,
    );
    const isMulti =
      getRecordBoolean(doc, ["is_multi", "allow_multiple", "multiple"], false) ||
      getRecordBoolean(doc, ["multi_select", "is_multi_select"], false);
    const selectionMode = normalizeAddonSelectionMode(
      getRecordString(doc, [
        "selection_mode",
        "selectionMode",
        "selection_type",
        "selectionType",
        "input_type",
        "type",
      ]),
      isMulti ? "multi" : "single",
    );
    const required = getRecordBoolean(doc, ["is_required", "required", "mandatory"], false);
    const sortOrder = Number.isFinite(getRecordNumber(doc, ["sort_order", "display_order", "sortOrder", "position"]))
      ? getRecordNumber(doc, ["sort_order", "display_order", "sortOrder", "position"])
      : Number.MAX_SAFE_INTEGER;

    addonGroupLookup.set(id, {
      id,
      name,
      required,
      selectionMode,
      sortOrder,
    });
  }

  const optionsByGroup = new Map<string, ItemAddonOption[]>();
  for (const rawDoc of addonOptionDocs) {
    const doc = rawDoc as Record<string, unknown>;
    if (!isDocInClientScope(doc)) {
      continue;
    }
    const id = toSafeString(doc.$id);
    if (!id) {
      continue;
    }
    const isActive = getRecordBoolean(doc, ["active", "is_active", "enabled"], true);
    if (!isActive) {
      continue;
    }
    const groupId = getRecordString(doc, ["addon_group_id", "group_id", "addonGroupId", "groupId"]);
    if (!groupId || !addonGroupLookup.has(groupId)) {
      continue;
    }
    const name = sanitizeUserText(
      getRecordString(doc, ["name", "title", "label", "option_name"]) || "Option",
      80,
    );
    const sortOrder = Number.isFinite(getRecordNumber(doc, ["sort_order", "display_order", "sortOrder", "position"]))
      ? getRecordNumber(doc, ["sort_order", "display_order", "sortOrder", "position"])
      : Number.MAX_SAFE_INTEGER;
    const option: ItemAddonOption = {
      id,
      name,
      price: toAmount(doc.price ?? doc.amount ?? doc.extra_price),
      sortOrder,
    };
    const existing = optionsByGroup.get(groupId) ?? [];
    existing.push(option);
    optionsByGroup.set(groupId, existing);
  }

  const mappedGroupsByItem = new Map<string, Array<{ groupId: string; sortOrder: number }>>();
  for (const rawDoc of itemAddonMapDocs) {
    const doc = rawDoc as Record<string, unknown>;
    if (!isDocInClientScope(doc)) {
      continue;
    }
    const isActive = getRecordBoolean(doc, ["active", "is_active", "enabled"], true);
    if (!isActive) {
      continue;
    }
    const groupId = getRecordString(doc, ["addon_group_id", "group_id", "addonGroupId", "groupId"]);
    if (!groupId || !addonGroupLookup.has(groupId)) {
      continue;
    }
    const itemToken = getRecordString(doc, [
      "item_id",
      "menu_item_id",
      "menuItemId",
      "product_id",
      "item",
      "menu_item",
      "item_name",
      "menu_item_name",
    ]);
    const itemId = resolveMenuItemId(itemToken);
    if (!itemId) {
      continue;
    }
    const sortOrder = Number.isFinite(getRecordNumber(doc, ["sort_order", "display_order", "sortOrder", "position"]))
      ? getRecordNumber(doc, ["sort_order", "display_order", "sortOrder", "position"])
      : Number.MAX_SAFE_INTEGER;

    const existing = mappedGroupsByItem.get(itemId) ?? [];
    existing.push({ groupId, sortOrder });
    mappedGroupsByItem.set(itemId, existing);
  }

  const result: Record<string, ItemAddonGroup[]> = {};
  for (const [itemId, mappedGroups] of mappedGroupsByItem) {
    const dedupedGroupMap = new Map<string, number>();
    for (const mappedGroup of mappedGroups) {
      const existingSort = dedupedGroupMap.get(mappedGroup.groupId);
      if (existingSort === undefined || mappedGroup.sortOrder < existingSort) {
        dedupedGroupMap.set(mappedGroup.groupId, mappedGroup.sortOrder);
      }
    }

    const resolvedGroups = [...dedupedGroupMap.entries()]
      .map(([groupId, mappedSortOrder]) => {
        const group = addonGroupLookup.get(groupId);
        if (!group) {
          return null;
        }
        const options = [...(optionsByGroup.get(groupId) ?? [])]
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
        if (options.length === 0) {
          return null;
        }
        return {
          id: group.id,
          name: group.name,
          required: group.required,
          selectionMode: group.selectionMode,
          sortOrder:
            Number.isFinite(mappedSortOrder) && mappedSortOrder !== Number.MAX_SAFE_INTEGER
              ? mappedSortOrder
              : group.sortOrder,
          options,
        } satisfies ItemAddonGroup;
      })
      .filter((entry): entry is ItemAddonGroup => !!entry)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    if (resolvedGroups.length > 0) {
      result[itemId] = resolvedGroups;
    }
  }

  return result;
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

const OFFER_TARGET_ID_KEYS = [
  "target_id",
  "target_ids",
  "targetId",
  "targetIds",
  "targets",
  "target_values",
  "targetValues",
];

const OFFER_SCOPE_KEYS = [
  "target_scope",
  "targetScope",
  "offer_scope",
  "offerScope",
  "target_type",
  "targetType",
  "scope",
  "applies_to",
  "appliesTo",
];

const OFFER_ITEM_KEYS = [
  "item_id",
  "itemId",
  "item_ids",
  "menu_item_id",
  "menuItemId",
  "menu_item_ids",
  "product_id",
  "productId",
  "product_ids",
  "applicable_item_id",
  "applicable_items",
  "applicable_item_ids",
];

const OFFER_CATEGORY_KEYS = [
  "category",
  "categories",
  "category_id",
  "categoryId",
  "catogry_id",
  "category_ids",
  "catogry_ids",
  "applicable_category_id",
  "applicable_categories",
  "applicable_category_ids",
];

function hasCriteriaTokens(criteria: { itemTokens: Set<string>; categoryTokens: Set<string> }) {
  return criteria.itemTokens.size > 0 || criteria.categoryTokens.size > 0;
}

function filterOfferLinesByCriteria(
  lines: OfferEvaluationLine[],
  criteria: { itemTokens: Set<string>; categoryTokens: Set<string> },
) {
  if (!hasCriteriaTokens(criteria)) {
    return [...lines];
  }
  return lines.filter((line) => lineMatchesOfferCriteria(line, criteria));
}

function normalizeOfferScopeToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function resolveOfferTargetScope(source: Record<string, unknown>): OfferTargetScope {
  const raw = getRecordString(source, OFFER_SCOPE_KEYS);
  const normalized = normalizeOfferScopeToken(raw);
  if (!normalized) {
    return "all";
  }
  if (
    normalized === "product" ||
    normalized === "products" ||
    normalized === "item" ||
    normalized === "items" ||
    normalized === "menu_item" ||
    normalized === "menu_items" ||
    normalized === "dish" ||
    normalized === "dishes"
  ) {
    return "product";
  }
  if (normalized === "category" || normalized === "categories") {
    return "category";
  }
  if (
    normalized === "cart" ||
    normalized === "cart_wide" ||
    normalized === "order" ||
    normalized === "order_wide" ||
    normalized === "bill"
  ) {
    return "cart";
  }
  if (
    normalized === "all" ||
    normalized === "global" ||
    normalized === "site_wide" ||
    normalized === "entire_menu"
  ) {
    return "all";
  }
  return "all";
}

function readOfferTargetIdTokens(source: Record<string, unknown>) {
  return new Set(
    getRecordStringList(source, OFFER_TARGET_ID_KEYS)
      .map((entry) => normalizeOfferToken(entry))
      .filter(Boolean),
  );
}

function resolveOfferApplicationLevel(offer: Offer) {
  const source = offer.raw as Record<string, unknown>;
  const offerType = resolveOfferTypeToken(offer);
  const baseCriteria = readOfferCriteria(source, OFFER_ITEM_KEYS, OFFER_CATEGORY_KEYS);
  const scope = resolveOfferTargetScope(source);
  const targetIds = readOfferTargetIdTokens(source);
  const hasScopedItemTargets = hasCriteriaTokens(baseCriteria) || targetIds.size > 0;

  // Swiggy/Zomato-style split:
  // 1. BXGY is always an auto promotion, never a cart coupon.
  // 2. Item/category targeted discounts are promotions.
  // 3. True cart/order/bill-wide discounts stay in the coupon bucket.
  if (offerType === "bxgy") {
    return "promotion" as const;
  }

  if (scope === "product" || scope === "category" || hasScopedItemTargets) {
    return "promotion" as const;
  }

  if (scope === "cart" || scope === "all") {
    return "cart" as const;
  }

  return "cart" as const;
}

function buildScopedOfferCriteria(
  source: Record<string, unknown>,
  baseCriteria: { itemTokens: Set<string>; categoryTokens: Set<string> },
): {
  scope: OfferTargetScope;
  criteria: { itemTokens: Set<string>; categoryTokens: Set<string> };
  isValid: boolean;
  invalidReason: string;
} {
  const scope = resolveOfferTargetScope(source);
  const targetIds = readOfferTargetIdTokens(source);

  if (scope === "product") {
    if (targetIds.size === 0) {
      return {
        scope,
        criteria: { itemTokens: new Set<string>(), categoryTokens: new Set<string>() },
        isValid: false,
        invalidReason: "Product-scoped offer is missing target_ids.",
      };
    }
    return {
      scope,
      criteria: {
        itemTokens: new Set<string>([...baseCriteria.itemTokens, ...targetIds]),
        categoryTokens: new Set<string>(),
      },
      isValid: true,
      invalidReason: "",
    };
  }

  if (scope === "category") {
    if (targetIds.size === 0) {
      return {
        scope,
        criteria: { itemTokens: new Set<string>(), categoryTokens: new Set<string>() },
        isValid: false,
        invalidReason: "Category-scoped offer is missing target_ids.",
      };
    }
    return {
      scope,
      criteria: {
        itemTokens: new Set<string>(),
        categoryTokens: new Set<string>([...baseCriteria.categoryTokens, ...targetIds]),
      },
      isValid: true,
      invalidReason: "",
    };
  }

  if (scope === "cart") {
    return {
      scope,
      criteria: {
        itemTokens: new Set<string>(baseCriteria.itemTokens),
        categoryTokens: new Set<string>(baseCriteria.categoryTokens),
      },
      isValid: true,
      invalidReason: "",
    };
  }

  return {
    scope,
    criteria: {
      itemTokens: new Set<string>(baseCriteria.itemTokens),
      categoryTokens: new Set<string>(baseCriteria.categoryTokens),
    },
    isValid: true,
    invalidReason: "",
  };
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
    "min_cart_amount",
    "minimum_cart_value",
    "minimum_order_amount",
    "minimum_amount",
    "min_cart_value",
    "min_order_amount",
    "min_amount",
    "threshold_amount",
    "minimum_order_value",
  ]);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeOfferDiscountType(source: Record<string, unknown>) {
  const value = getRecordString(source, [
    "discount_type",
    "discountType",
    "discount_kind",
    "discountKind",
  ])
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (
    value === "percent" ||
    value === "percentage" ||
    value === "percent_discount" ||
    value === "percentage_discount"
  ) {
    return "percentage" as const;
  }

  if (
    value === "flat" ||
    value === "fixed" ||
    value === "fixed_amount" ||
    value === "flat_discount" ||
    value === "amount"
  ) {
    return "flat" as const;
  }

  return "" as const;
}

function estimateOfferDiscount(
  source: Record<string, unknown>,
  baseAmount: number,
) {
  const safeBaseAmount = roundCurrency(Math.max(0, Number(baseAmount) || 0));
  if (safeBaseAmount <= 0) {
    return null;
  }

  const normalizedDiscountType = normalizeOfferDiscountType(source);
  const percentage = getRecordNumber(source, [
    "discount_percent",
    "discount_percentage",
    "percentage",
    "percent",
    "off_percent",
  ]);
  const directDiscountValue = getRecordNumber(source, [
    "discountValue",
    "discount_value",
    "discount",
    "discount_amount",
    "flat_discount",
    "flat_discount_amount",
    "off_amount",
    "amount",
    "value",
  ]);
  const maxDiscount = getRecordNumber(source, ["max_discount", "maximum_discount"]);
  if (
    (normalizedDiscountType === "percentage" &&
      Number.isFinite(directDiscountValue) &&
      directDiscountValue > 0) ||
    (Number.isFinite(percentage) && percentage > 0)
  ) {
    const effectivePercentage =
      normalizedDiscountType === "percentage" &&
      Number.isFinite(directDiscountValue) &&
      directDiscountValue > 0
        ? directDiscountValue
        : percentage;
    const computed = (safeBaseAmount * effectivePercentage) / 100;
    const capped =
      Number.isFinite(maxDiscount) && maxDiscount > 0
        ? Math.min(computed, maxDiscount)
        : computed;
    return roundCurrency(Math.max(0, Math.min(safeBaseAmount, capped)));
  }

  if (Number.isFinite(directDiscountValue) && directDiscountValue > 0) {
    return roundCurrency(Math.max(0, Math.min(safeBaseAmount, directDiscountValue)));
  }

  return null;
}

function sumTableOrderPayableAmount(orders: TableOrderRecord[]) {
  return roundCurrency(
    orders.reduce((sum, order) => {
      if (order.totalAmount > 0) {
        return sum + toAmount(order.totalAmount);
      }
      if (order.subtotal > 0) {
        return sum + toAmount(order.subtotal);
      }
      return (
        sum +
        order.items.reduce((itemSum, item) => itemSum + toAmount(item.lineTotal), 0)
      );
    }, 0),
  );
}

function sumTableOrderTaxBreakdown(orders: TableOrderRecord[]) {
  return orders.reduce(
    (sum, order) => {
      sum.taxAmount += toAmount(order.taxAmount);
      sum.cgstAmount += toAmount(order.cgstAmount);
      sum.sgstAmount += toAmount(order.sgstAmount);
      return sum;
    },
    { taxAmount: 0, cgstAmount: 0, sgstAmount: 0 },
  );
}

function pickBestItemWiseOfferForLine(
  line: OfferEvaluationLine,
  offers: Offer[],
  subtotalAmount: number,
) {
  const eligibleOffers: ApplicableOfferPreview[] = [];
  for (const offer of offers) {
    const resolved = evaluateApplicableOffers([offer], [line], subtotalAmount);
    if (resolved.length > 0) {
      eligibleOffers.push(...resolved);
    }
  }
  const bestOffer = pickBestApplicableOffer(eligibleOffers, line.lineTotal);
  if (!bestOffer || bestOffer.discountAmount <= 0) {
    return null;
  }

  return {
    itemId: line.itemId,
    itemName: line.name,
    quantity: line.quantity,
    offer: bestOffer.offer,
    discountAmount: roundCurrency(bestOffer.discountAmount),
  } satisfies ItemWiseOfferMatch;
}

function summarizeItemWiseOfferMatches(matches: ItemWiseOfferMatch[]) {
  const grouped = new Map<string, ItemWiseOfferSummary>();

  for (const match of matches) {
    const existing = grouped.get(match.offer.offerId);
    if (!existing) {
      grouped.set(match.offer.offerId, {
        offerId: match.offer.offerId,
        offerName: match.offer.offerName,
        offerType: match.offer.offerType,
        matchedReason: match.offer.matchedReason,
        matchedItemCount: 1,
        matchedItemNames: [match.itemName],
        totalDiscountAmount: roundCurrency(match.discountAmount),
      });
      continue;
    }

    existing.matchedItemCount += 1;
    if (!existing.matchedItemNames.includes(match.itemName)) {
      existing.matchedItemNames.push(match.itemName);
    }
    existing.totalDiscountAmount = roundCurrency(
      existing.totalDiscountAmount + match.discountAmount,
    );
  }

  return [...grouped.values()].sort(
    (left, right) => right.totalDiscountAmount - left.totalDiscountAmount,
  );
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

  const baseCriteria = readOfferCriteria(raw, OFFER_ITEM_KEYS, OFFER_CATEGORY_KEYS);
  const scopedCriteriaResult = buildScopedOfferCriteria(raw, baseCriteria);
  if (!scopedCriteriaResult.isValid) {
    return null;
  }

  const eligibleLines = filterOfferLinesByCriteria(lines, scopedCriteriaResult.criteria);
  if (hasCriteriaTokens(scopedCriteriaResult.criteria) && eligibleLines.length === 0) {
    return null;
  }

  const eligibleSubtotal = eligibleLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const estimatedBenefit = estimateOfferDiscount(raw, eligibleSubtotal);
  const matchedReason =
    minimumCartValue > 0
      ? `Cart value matched minimum ${minimumCartValue.toFixed(2)} (${scopedCriteriaResult.scope} scope).`
      : `Cart matched flat discount criteria (${scopedCriteriaResult.scope} scope).`;

  return {
    $id: offer.id,
    offerId: offer.id,
    offerName: offer.name,
    offerType: "flat_discount",
    matchedReason,
    estimatedBenefit,
    discountValue: String(estimatedBenefit ?? 0),
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

  const baseScopeCriteria = readOfferCriteria(raw, OFFER_ITEM_KEYS, OFFER_CATEGORY_KEYS);
  const scopedCriteriaResult = buildScopedOfferCriteria(raw, baseScopeCriteria);
  if (!scopedCriteriaResult.isValid) {
    return null;
  }
  const scopeLines = filterOfferLinesByCriteria(lines, scopedCriteriaResult.criteria);
  if (hasCriteriaTokens(scopedCriteriaResult.criteria) && scopeLines.length === 0) {
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

  const effectiveBuyCriteria = hasCriteriaTokens(buyCriteria)
    ? buyCriteria
    : scopedCriteriaResult.criteria;
  if (!hasCriteriaTokens(effectiveBuyCriteria)) {
    return null;
  }

  const buyLines = filterOfferLinesByCriteria(scopeLines, effectiveBuyCriteria);
  const buyQuantity = buyLines.reduce((sum, line) => sum + line.quantity, 0);
  if (buyQuantity < buyQty) {
    return null;
  }

  const effectiveGetCriteria = hasCriteriaTokens(getCriteria) ? getCriteria : effectiveBuyCriteria;
  const getLines = filterOfferLinesByCriteria(scopeLines, effectiveGetCriteria);
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
    $id: offer.id,
    offerId: offer.id,
    offerName: offer.name,
    offerType: "bxgy",
    matchedReason: `Buy ${buyQty}, get ${getQty} criteria matched (${scopedCriteriaResult.scope} scope).`,
    estimatedBenefit,
    discountValue: String(estimatedBenefit ?? 0),
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

  const baseScopeCriteria = readOfferCriteria(raw, OFFER_ITEM_KEYS, OFFER_CATEGORY_KEYS);
  const scopedCriteriaResult = buildScopedOfferCriteria(raw, baseScopeCriteria);
  if (!scopedCriteriaResult.isValid) {
    return null;
  }
  const scopeLines = filterOfferLinesByCriteria(lines, scopedCriteriaResult.criteria);
  if (hasCriteriaTokens(scopedCriteriaResult.criteria) && scopeLines.length === 0) {
    return null;
  }

  const requiredItemTokens = new Set(
    getRecordStringList(raw, [
      "combo_item_ids",
      "combo_items",
      "required_item_ids",
      "required_items",
      "item_ids",
    ])
      .map((entry) => normalizeOfferToken(entry))
      .filter(Boolean),
  );
  const requiredCategoryTokens = new Set(
    getRecordStringList(raw, [
      "combo_categories",
      "combo_category_ids",
      "required_categories",
      "category_ids",
      "catogry_ids",
    ])
      .map((entry) => normalizeOfferToken(entry))
      .filter(Boolean),
  );

  const scopeTargetIds = readOfferTargetIdTokens(raw);
  if (scopedCriteriaResult.scope === "product") {
    for (const token of scopeTargetIds) {
      requiredItemTokens.add(token);
    }
  }
  if (scopedCriteriaResult.scope === "category") {
    for (const token of scopeTargetIds) {
      requiredCategoryTokens.add(token);
    }
  }

  const lineItemTokens = new Set<string>();
  const lineCategoryTokens = new Set<string>();
  for (const line of scopeLines) {
    lineItemTokens.add(normalizeOfferToken(line.itemId));
    lineItemTokens.add(normalizeOfferToken(line.name));
    for (const category of line.categoryRefs) {
      lineCategoryTokens.add(normalizeOfferToken(category));
    }
  }

  const minDistinctItems =
    parseInteger(
      raw.min_distinct_items ?? raw.minimum_items ?? raw.min_items ?? raw.combo_size,
      0,
    );
  const hasRequiredItemTargets = requiredItemTokens.size > 0;
  const hasRequiredCategoryTargets = requiredCategoryTokens.size > 0;

  let matched = false;
  let matchedReason = "Combo criteria matched.";
  if (hasRequiredItemTargets || hasRequiredCategoryTargets) {
    const itemMatch = hasRequiredItemTargets
      ? [...requiredItemTokens].every((token) => lineItemTokens.has(token))
      : true;
    const categoryMatch = hasRequiredCategoryTargets
      ? [...requiredCategoryTokens].every((token) => lineCategoryTokens.has(token))
      : true;
    matched = itemMatch && categoryMatch;
    matchedReason = "Required combo targets are present in cart.";
  } else if (scopedCriteriaResult.scope === "cart" && minDistinctItems > 0) {
    matched = scopeLines.length >= minDistinctItems;
    matchedReason = `Cart has required ${minDistinctItems} combo items.`;
  } else {
    return null;
  }

  if (!matched) {
    return null;
  }

  const estimatedBenefit = estimateOfferDiscount(raw, subtotalAmount);
  return {
    $id: offer.id,
    offerId: offer.id,
    offerName: offer.name,
    offerType: "combo",
    matchedReason: `${matchedReason} (${scopedCriteriaResult.scope} scope).`,
    estimatedBenefit,
    discountValue: String(estimatedBenefit ?? 0),
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

  const baseCriteria = readOfferCriteria(raw, OFFER_ITEM_KEYS, OFFER_CATEGORY_KEYS);
  const scopedCriteriaResult = buildScopedOfferCriteria(raw, baseCriteria);
  if (!scopedCriteriaResult.isValid) {
    return null;
  }
  const eligibleLines = filterOfferLinesByCriteria(lines, scopedCriteriaResult.criteria);
  if (hasCriteriaTokens(scopedCriteriaResult.criteria) && eligibleLines.length === 0) {
    return null;
  }
  if (lines.length === 0) {
    return null;
  }

  const eligibleSubtotal = eligibleLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const estimatedBenefit = estimateOfferDiscount(raw, eligibleSubtotal);

  return {
    $id: offer.id,
    offerId: offer.id,
    offerName: offer.name,
    offerType: "time_based",
    matchedReason: `Live time-window offer matched your current cart (${scopedCriteriaResult.scope} scope).`,
    estimatedBenefit,
    discountValue: String(estimatedBenefit ?? 0),
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
  return [...deduped.values()].sort((left, right) => {
    const leftBenefit = Number.isFinite(left.estimatedBenefit ?? Number.NaN)
      ? left.estimatedBenefit ?? 0
      : 0;
    const rightBenefit = Number.isFinite(right.estimatedBenefit ?? Number.NaN)
      ? right.estimatedBenefit ?? 0
      : 0;
    return rightBenefit - leftBenefit;
  });
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

function getSelectedAddonTotal(addons: SelectedAddon[]) {
  return addons.reduce((sum, addon) => sum + toAmount(addon.price), 0);
}

function toAddonAsModifier(addon: SelectedAddon): SelectedModifier {
  return {
    id: `addon_${normalizeModifierId(`${addon.groupId}_${addon.optionId}`)}`,
    label: `${addon.groupName}: ${addon.optionName}`,
    price: toAmount(addon.price),
  };
}

function mergeCustomizations(
  baseModifiers: SelectedModifier[],
  addons: SelectedAddon[],
) {
  if (addons.length === 0) {
    return baseModifiers;
  }

  const merged: SelectedModifier[] = [];
  const seen = new Set<string>();
  for (const modifier of baseModifiers) {
    const token = normalizeModifierId(modifier.id || modifier.label);
    if (!token || seen.has(token)) {
      continue;
    }
    seen.add(token);
    merged.push(modifier);
  }
  for (const addon of addons) {
    const addonModifier = toAddonAsModifier(addon);
    const token = normalizeModifierId(addonModifier.id || addonModifier.label);
    if (!token || seen.has(token)) {
      continue;
    }
    seen.add(token);
    merged.push(addonModifier);
  }
  return merged;
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
        selectedAddons:
          existing.selectedAddons.length >= lineItem.selectedAddons.length
            ? existing.selectedAddons
            : lineItem.selectedAddons,
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

  const safeName = sanitizeUpiText(upiName, 60)
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const finalName = safeName || DEFAULT_UPI_NAME;
  const finalAmount = Number(amount).toFixed(2);
  return `upi://pay?pa=${normalizedUpiId}&pn=${finalName}&am=${finalAmount}&cu=INR&mc=${DEFAULT_UPI_MERCHANT_CODE}`;
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
  const mc =
    sanitizeUpiText(decodeLooseUriPart(paramMap.get("mc") ?? ""), 8)
      .replace(/[^0-9]/g, "")
      .slice(0, 8) || DEFAULT_UPI_MERCHANT_CODE;

  if (!pa || !pn || !am || cu !== "INR") {
    return "";
  }

  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&mc=${mc}`;
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

function buildSessionToken(prefix: "session" | "bill", clientId: string, tableId: string) {
  const clientToken = normalizeRouteToken(clientId).slice(0, 24) || "client";
  const tableToken = normalizeRouteToken(tableId).slice(0, 24) || "table";
  const randomToken =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(36).slice(2, 14);

  return `${prefix}_${clientToken}_${tableToken}_${Date.now().toString(36)}_${randomToken}`;
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

function buildCustomerBillScopeStorageKey(client: string, table: string, browserId: string) {
  return `${CUSTOMER_BILL_SCOPE_PREFIX}_${normalizeRouteToken(client)}_${normalizeRouteToken(table)}_${browserId}`;
}

function buildCustomerBillOwnerScopeKey(client: string, table: string, browserId: string) {
  return [normalizeRouteToken(client), normalizeRouteToken(table), browserId].join("|");
}

function normalizeOwnedOrderIds(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const orderId = toSafeString(value);
    if (!orderId || seen.has(orderId)) {
      continue;
    }
    seen.add(orderId);
    normalized.push(orderId);
    if (normalized.length >= MAX_LOCAL_BILL_SCOPE_ORDERS) {
      break;
    }
  }
  return normalized;
}

function parseCustomerBillScopeState(
  rawValue: string | null,
  browserId: string,
  client: string,
  table: string,
) {
  if (!rawValue || isStoragePayloadTooLarge(rawValue)) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const storedBrowserId = toSafeString(parsed.browserId);
    const storedClient = toSafeString(parsed.client);
    const storedTable = toSafeString(parsed.table);
    if (!storedBrowserId || !storedClient || !storedTable) {
      return null;
    }
    if (storedBrowserId !== browserId) {
      return null;
    }
    if (normalizeRouteToken(storedClient) !== normalizeRouteToken(client)) {
      return null;
    }
    if (normalizeRouteToken(storedTable) !== normalizeRouteToken(table)) {
      return null;
    }

    return {
      version: CUSTOMER_BILL_SCOPE_VERSION,
      browserId: storedBrowserId,
      client: storedClient,
      table: storedTable,
      orderIds: normalizeOwnedOrderIds(parsed.orderIds),
      updatedAt: toSafeString(parsed.updatedAt) || new Date().toISOString(),
    } satisfies CustomerBillScopeState;
  } catch {
    return null;
  }
}

function collectOwnedOrderIdsFromHistory(
  history: CustomerOrderHistory,
  client: string,
  tableCandidates: string[],
) {
  const clientKey = normalizeClientHistoryKey(client);
  const clientOrders = history.byClient[clientKey] ?? [];
  if (clientOrders.length === 0) {
    return [];
  }

  const normalizedTableCandidates = new Set(
    tableCandidates.map((entry) => normalizeRouteToken(entry)).filter(Boolean),
  );

  const ownedOrderIds: string[] = [];
  const seen = new Set<string>();
  for (const order of clientOrders) {
    const orderId = toSafeString(order.orderId);
    if (!orderId || seen.has(orderId)) {
      continue;
    }
    const normalizedOrderTable = normalizeRouteToken(order.table);
    if (
      normalizedTableCandidates.size > 0 &&
      normalizedOrderTable &&
      !normalizedTableCandidates.has(normalizedOrderTable)
    ) {
      continue;
    }
    seen.add(orderId);
    ownedOrderIds.push(orderId);
    if (ownedOrderIds.length >= MAX_LOCAL_BILL_SCOPE_ORDERS) {
      break;
    }
  }

  return ownedOrderIds;
}

function isResettableClientCacheKey(key: string) {
  return (
    key === CUSTOMER_BROWSER_ID_KEY ||
    key === CUSTOMER_PROFILE_KEY ||
    key.startsWith(`${CUSTOMER_ORDER_HISTORY_PREFIX}_`) ||
    key.startsWith(`${CUSTOMER_BILL_SCOPE_PREFIX}_`) ||
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
  const selectedAddons = parseSelectedAddonList(
    source.selected_addons ??
      source.selectedAddons ??
      source.addon_selections ??
      source.addonSelections,
  );
  const modifiers = mergeCustomizations(
    parseSelectedModifierList(
      source.modifiers ??
        source.customizations ??
        source.addons ??
        source.add_ons,
    ),
    selectedAddons,
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
    selectedAddons,
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

function parseTableOrderRecord(value: unknown): TableOrderRecord | null {
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
    sessionId: toSafeString(source.sessionId) || toSafeString(source.session_id) || undefined,
    billId: toSafeString(source.billId) || toSafeString(source.bill_id) || undefined,
    orderRound:
      toPositiveQuantity(source.orderRound ?? source.order_round) > 0
        ? toPositiveQuantity(source.orderRound ?? source.order_round)
        : undefined,
    tableNo: toSafeString(source.tableNo) || toSafeString(source.table_no),
    status: toSafeString(source.status) || "PLACED",
    paymentStatus: toSafeString(source.paymentStatus ?? source.payment_status) || "UNPAID",
    paymentMethod,
    utrNumber: toSafeString(source.utrNumber ?? source.utr_number),
    subtotal: fallbackSubtotal,
    taxAmount: toAmount(source.taxAmount ?? source.tax_amount),
    cgstAmount: toAmount(source.cgstAmount ?? source.cgst_amount),
    sgstAmount: toAmount(source.sgstAmount ?? source.sgst_amount),
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

    const selectedAddonsByItem: Record<string, SelectedAddon[]> = {};
    const addonSource =
      parsed.selectedAddonsByItem && typeof parsed.selectedAddonsByItem === "object"
        ? (parsed.selectedAddonsByItem as Record<string, unknown>)
        : {};

    for (const [itemId, entry] of Object.entries(addonSource)) {
      if (!itemId || !cart[itemId]) {
        continue;
      }
      const parsedAddons = parseSelectedAddonList(entry);
      if (parsedAddons.length > 0) {
        selectedAddonsByItem[itemId] = parsedAddons;
      }
    }

    return {
      version: ACTIVE_TABLE_STORAGE_VERSION,
      client: toSafeString(parsed.client),
      table: toSafeString(parsed.table),
      cart,
      selectedModifiersByItem,
      selectedAddonsByItem,
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
      ownerBrowserId: toSafeString(parsed.ownerBrowserId) || toSafeString(parsed.owner_browser_id),
      ownerScopeKey: toSafeString(parsed.ownerScopeKey) || toSafeString(parsed.owner_scope_key),
      ownedOrderIds: normalizeOwnedOrderIds(parsed.ownedOrderIds ?? parsed.owned_order_ids),
      tableSessionDocumentId:
        toSafeString(parsed.tableSessionDocumentId) ||
        toSafeString(parsed.table_session_document_id),
      sessionId: toSafeString(parsed.sessionId) || toSafeString(parsed.session_id),
      billId: toSafeString(parsed.billId) || toSafeString(parsed.bill_id),
      tableSessionStatus:
        toSafeString(parsed.tableSessionStatus) || toSafeString(parsed.table_session_status),
      tableSessionPaymentStatus:
        toSafeString(parsed.tableSessionPaymentStatus) ||
        toSafeString(parsed.table_session_payment_status),
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
      ownerBrowserId: toSafeString(parsed.ownerBrowserId) || toSafeString(parsed.owner_browser_id),
      ownerScopeKey: toSafeString(parsed.ownerScopeKey) || toSafeString(parsed.owner_scope_key),
      tableSessionDocumentId:
        toSafeString(parsed.tableSessionDocumentId) ||
        toSafeString(parsed.table_session_document_id),
      sessionId: toSafeString(parsed.sessionId) || toSafeString(parsed.session_id),
      billId: toSafeString(parsed.billId) || toSafeString(parsed.bill_id),
      tableSessionStatus:
        toSafeString(parsed.tableSessionStatus) || toSafeString(parsed.table_session_status),
      tableSessionPaymentStatus:
        toSafeString(parsed.tableSessionPaymentStatus) ||
        toSafeString(parsed.table_session_payment_status),
      lockedBy: toSafeString(parsed.lockedBy) || toSafeString(parsed.locked_by),
      orderRound: toPositiveQuantity(parsed.orderRound ?? parsed.order_round),
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

function isRecordOwnedByCurrentBrowser(
  record: { ownerBrowserId?: string; ownerScopeKey?: string } | null,
  browserId: string,
  ownerScopeKey: string,
) {
  if (!record) {
    return false;
  }

  const storedOwnerScope = toSafeString(record.ownerScopeKey);
  if (storedOwnerScope && ownerScopeKey && storedOwnerScope !== ownerScopeKey) {
    return false;
  }

  const storedBrowserId = toSafeString(record.ownerBrowserId);
  if (storedBrowserId && browserId && storedBrowserId !== browserId) {
    return false;
  }

  return true;
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

function isPaymentConfirmed(status: string) {
  const normalized = status.trim().toUpperCase();
  if (!normalized) {
    return false;
  }
  return ["PAID", "SETTLED", "COMPLETED"].includes(normalized);
}

function applyBillInactivityPolicy(records: TableOrderRecord[], lastActivityAt: string) {
  // Keep history records available for panel rendering; CTA amount is computed
  // from unpaid-only derived state separately.
  void lastActivityAt;
  return records;
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
  if (["PENDING_VERIFICATION"].includes(normalized)) {
    return "Pending Verification";
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
    sessionId: toSafeString(doc.session_id) || undefined,
    billId: toSafeString(doc.bill_id) || undefined,
    orderRound:
      toPositiveQuantity(doc.order_round) > 0
        ? toPositiveQuantity(doc.order_round)
        : undefined,
    tableNo: toSafeString(doc.table_number) || toSafeString(doc.table_no),
    status: toSafeString(doc.status) || "PLACED",
    paymentStatus: toSafeString(doc.payment_status) || "UNPAID",
    paymentMethod,
    utrNumber: toSafeString(doc.utr_number ?? doc.utrNumber),
    subtotal,
    taxAmount: toAmount(doc.tax_amount ?? doc.taxAmount),
    cgstAmount: toAmount(doc.cgst_amount ?? doc.cgstAmount),
    sgstAmount: toAmount(doc.sgst_amount ?? doc.sgstAmount),
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

async function fetchTableOrderRecords(
  clientId: string,
  tableId: string,
  billId?: string,
  sessionId?: string,
) {
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
      .filter((entry): entry is TableOrderRecord => !!entry)
      .filter(
        (entry) =>
          (!billId || entry.billId === billId) &&
          (!sessionId || entry.sessionId === sessionId),
      );
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
      devError(error);
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

function parseTableSessionRecord(doc: Record<string, unknown>): TableSessionRecord | null {
  const documentId = toSafeString(doc.$id) || toSafeString(doc.id);
  const clientId = toSafeString(doc.client_id);
  const tableId = toSafeString(doc.table_id);
  const tableNumber = toSafeString(doc.table_number) || toSafeString(doc.table_no);
  const sessionId = toSafeString(doc.session_id) || documentId;
  const billId = toSafeString(doc.bill_id) || documentId;
  if (!documentId || !clientId || !tableId || !sessionId || !billId) {
    return null;
  }

  return {
    documentId,
    clientId,
    tableId,
    tableNumber,
    sessionId,
    billId,
    status: toSafeString(doc.status) || "active",
    paymentStatus: toSafeString(doc.payment_status) || "unpaid",
    lockedBy: toSafeString(doc.locked_by),
    heartbeatAt: toSafeString(doc.heartbeat_at),
    openedAt: toSafeString(doc.opened_at) || toSafeString(doc.$createdAt),
    totalAmount: toAmount(doc.total_amount),
  } satisfies TableSessionRecord;
}

function isTableSessionPaymentSettled(session: TableSessionRecord | null | undefined) {
  return CLOSED_TABLE_SESSION_PAYMENT_STATUSES.includes(
    session?.paymentStatus.trim().toLowerCase() ?? "",
  );
}

function isTableSessionClosedOrPaid(session: TableSessionRecord | null | undefined) {
  return (
    CLOSED_TABLE_SESSION_STATUSES.includes(session?.status.trim().toLowerCase() ?? "") ||
    isTableSessionPaymentSettled(session)
  );
}

function isTableSessionOrderLocked(session: TableSessionRecord | null | undefined) {
  return ORDER_LOCKED_TABLE_SESSION_STATUSES.includes(
    session?.status.trim().toLowerCase() ?? "",
  );
}

function isOrderForSessionBill(order: TableOrderRecord, billId: string, sessionId: string) {
  return order.billId === billId && order.sessionId === sessionId;
}

async function resolveTableSessionForBrowser(
  clientId: string,
  tableInfo: RestaurantTable,
  browserId: string,
) {
  const tableNumber = tableInfo.tableNo || tableInfo.displayLabel || tableInfo.id;
  const sessionDocs = await fetchAllDocuments(appwriteConfig.collections.tableSessions, {
    pageSize: 20,
    maxDocs: 80,
    queries: [
      Query.equal("client_id", [clientId]),
      Query.equal("table_id", [tableInfo.id]),
      Query.equal("status", ACTIVE_TABLE_SESSION_STATUSES),
      Query.orderDesc("$updatedAt"),
    ],
    timeoutMs: REQUEST_TIMEOUT_MS,
  });

  const activeSessions = sessionDocs
    .map((doc) => parseTableSessionRecord(doc))
    .filter((entry): entry is TableSessionRecord => !!entry)
    .filter(
      (entry) =>
        entry.clientId === clientId &&
        entry.tableId === tableInfo.id &&
        ACTIVE_TABLE_SESSION_STATUSES.includes(entry.status.trim().toLowerCase()) &&
        !isTableSessionPaymentSettled(entry),
    )
    .sort((a, b) => {
      const aStamp = Math.max(toTimestamp(a.heartbeatAt), toTimestamp(a.openedAt));
      const bStamp = Math.max(toTimestamp(b.heartbeatAt), toTimestamp(b.openedAt));
      return bStamp - aStamp;
    });

  const existingSession = activeSessions[0] ?? null;
  const nowIso = new Date().toISOString();
  if (existingSession) {
    if (existingSession.lockedBy && existingSession.lockedBy !== browserId) {
      throw new Error(TABLE_SESSION_LOCKED_MESSAGE);
    }

    try {
      const updated = await updateDocumentWithFallback(
        appwriteConfig.collections.tableSessions,
        existingSession.documentId,
        [
          {
            locked_by: browserId,
            heartbeat_at: nowIso,
          },
        ],
        {
          scope: {
            clientId,
            tableId: tableInfo.id,
            lockedBy: existingSession.lockedBy || browserId,
          },
        },
      );
      return parseTableSessionRecord(updated) ?? {
        ...existingSession,
        lockedBy: browserId,
        heartbeatAt: nowIso,
      };
    } catch (error) {
      devWarn("Table session heartbeat update failed:", error);
      return {
        ...existingSession,
        lockedBy: browserId || existingSession.lockedBy,
        heartbeatAt: nowIso,
      };
    }
  }

  const created = await createDocumentWithFallback(appwriteConfig.collections.tableSessions, [
    {
      client_id: clientId,
      table_id: tableInfo.id,
      table_number: tableNumber,
      session_id: buildSessionToken("session", clientId, tableInfo.id),
      bill_id: buildSessionToken("bill", clientId, tableInfo.id),
      status: "active",
      payment_status: "unpaid",
      locked_by: browserId,
      heartbeat_at: nowIso,
      opened_at: nowIso,
      total_amount: 0,
    },
  ]);

  const createdSession = parseTableSessionRecord(created);
  if (!createdSession) {
    throw new Error("Unable to initialize table session.");
  }
  return createdSession;
}

async function fetchCurrentTableSessionRecord(
  clientId: string,
  tableInfo: RestaurantTable,
  currentSession: TableSessionRecord,
) {
  const sessionDocs = await fetchAllDocuments(appwriteConfig.collections.tableSessions, {
    pageSize: 30,
    maxDocs: 120,
    queries: [
      Query.equal("client_id", [clientId]),
      Query.equal("table_id", [tableInfo.id]),
      Query.orderDesc("$updatedAt"),
    ],
    timeoutMs: REQUEST_TIMEOUT_MS,
  });

  const parsedSessions = sessionDocs
    .map((doc) => parseTableSessionRecord(doc))
    .filter((entry): entry is TableSessionRecord => !!entry)
    .filter((entry) => entry.clientId === clientId && entry.tableId === tableInfo.id);

  return (
    parsedSessions.find((entry) => entry.documentId === currentSession.documentId) ??
    parsedSessions.find(
      (entry) =>
        entry.sessionId === currentSession.sessionId && entry.billId === currentSession.billId,
    ) ??
    null
  );
}

function buildTableOrderRecordFromCart(
  orderId: string,
  orderNumber: string,
  sessionId: string,
  billId: string,
  orderRound: number,
  tableNo: string,
  paymentMethod: PaymentMethod,
  subtotal: number,
  taxAmount: number,
  cgstAmount: number,
  sgstAmount: number,
  totalAmount: number,
  createdAt: string,
  cartItems: CartItem[],
  selectedModifiersByItem: Record<string, SelectedModifier[]>,
  selectedAddonsByItem: Record<string, SelectedAddon[]>,
  kitchenInstructions: string,
) {
  return {
    orderId,
    orderNumber,
    sessionId,
    billId,
    orderRound,
    tableNo,
    status: "PLACED",
    paymentStatus: "UNPAID",
    paymentMethod,
    utrNumber: "",
    subtotal,
    taxAmount,
    cgstAmount,
    sgstAmount,
    totalAmount,
    createdAt,
    updatedAt: createdAt,
    instructions: kitchenInstructions.trim(),
    items: cartItems.map((cartItem) => ({
      ...(() => {
        const selectedModifiers = selectedModifiersByItem[cartItem.item.id] ?? [];
        const selectedAddons = selectedAddonsByItem[cartItem.item.id] ?? [];
        const mergedCustomizations = mergeCustomizations(selectedModifiers, selectedAddons);
        const modifierTotal = getSelectedModifierTotal(mergedCustomizations);
        const unitPrice = cartItem.item.price + modifierTotal;
        return {
          lineKey: getBillLineKey(cartItem.item.id, mergedCustomizations),
          itemId: cartItem.item.id,
          name: cartItem.item.name,
          quantity: cartItem.quantity,
          unitPrice,
          lineTotal: unitPrice * cartItem.quantity,
          modifiers: mergedCustomizations,
          selectedAddons,
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
    gstEnabled: false,
    taxPercentage: 0,
    cgstPercentage: 0,
    sgstPercentage: 0,
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
  const [recentlyAddedItemId, setRecentlyAddedItemId] = useState("");
  const [selectedModifiersByItem, setSelectedModifiersByItem] = useState<
    Record<string, SelectedModifier[]>
  >({});
  const [selectedAddonsByItem, setSelectedAddonsByItem] = useState<Record<string, SelectedAddon[]>>({});
  const [itemAddonGroupsByItem, setItemAddonGroupsByItem] = useState<Record<string, ItemAddonGroup[]>>({});
  const [addonPickerItemId, setAddonPickerItemId] = useState("");
  const [addonPickerDraftByGroup, setAddonPickerDraftByGroup] = useState<Record<string, string[]>>({});
  const [addonPickerError, setAddonPickerError] = useState("");
  const [addonPickerMode, setAddonPickerMode] = useState<"add" | "edit">("add");
  const [isOffersExpanded, setIsOffersExpanded] = useState(false);
  const [kitchenInstructions, setKitchenInstructions] = useState("");
  const [isCartHydrated, setIsCartHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COUNTER");
  const [canLaunchUpiDeepLink, setCanLaunchUpiDeepLink] = useState(false);
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
  const [tableSession, setTableSession] = useState<TableSessionRecord | null>(null);
  const [tableSessionState, setTableSessionState] =
    useState<TableSessionLifecycleState>("checking");
  const [tableOrders, setTableOrders] = useState<TableOrderRecord[]>([]);
  const [billLastActivityAt, setBillLastActivityAt] = useState("");
  const [customerBrowserId, setCustomerBrowserId] = useState("");
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const placeOrderLockRef = useRef(false);
  const tableOrdersRef = useRef<TableOrderRecord[]>([]);
  const activeOrderContextRef = useRef<ActiveOrderContext | null>(null);
  const billLastActivityRef = useRef("");
  const orderSyncSnapshotRef = useRef<Record<string, { status: string; paymentStatus: string }>>({});
  const shownKitchenStatusAlertKeysRef = useRef<Set<string>>(new Set());
  const ownedOrderIdsRef = useRef<Set<string>>(new Set());
  const handledClosedSessionKeysRef = useRef<Set<string>>(new Set());
  const closedSessionResetTimeoutRef = useRef<number | null>(null);
  const sessionMonitorFailureCountRef = useRef(0);
  const sessionMonitorLastErrorSignatureRef = useRef("");
  const sessionMonitorMissingIdentityWarnedRef = useRef(false);
  const clientSettingsRef = useRef<RestaurantSettings>(clientSettings);
  const categoriesRef = useRef<Category[]>([]);
  const menuItemsRef = useRef<MenuItem[]>([]);
  const settingsRefreshInFlightRef = useRef<Promise<RestaurantSettings> | null>(null);
  const persistedCartStateRef = useRef<string | null>(null);
  const persistedBillStateRef = useRef<string | null>(null);
  const persistedSessionStateRef = useRef<string | null>(null);
  const addFeedbackTimeoutRef = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

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
  const customerBillScopeStorageKey = useMemo(() => {
    if (!customerBrowserId) {
      return "";
    }
    return buildCustomerBillScopeStorageKey(routeClient, routeTable, customerBrowserId);
  }, [customerBrowserId, routeClient, routeTable]);
  const customerBillOwnerScopeKey = useMemo(() => {
    if (!customerBrowserId) {
      return "";
    }
    return buildCustomerBillOwnerScopeKey(routeClient, routeTable, customerBrowserId);
  }, [customerBrowserId, routeClient, routeTable]);

  useEffect(() => {
    clientSettingsRef.current = clientSettings;
  }, [clientSettings]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    menuItemsRef.current = menuItems;
  }, [menuItems]);

  const applyClientSettingsDocs = useCallback(
    (settingsDocs: AppwriteDocument[]) => {
      const normalizedSettings = parseClientSettings(settingsDocs, routeClient);
      const brandingSettings =
        settingsDocs.length > 0 ? parseBrandingSettings(settingsDocs, routeClient) : null;

      console.log("GST_SETTINGS_SYNC", {
        gstEnabled: normalizedSettings.gstEnabled,
        rawSettings: settingsDocs,
      });

      clientSettingsRef.current = normalizedSettings;
      setClientSettings(normalizedSettings);
      setBranding(brandingSettings);
      setRestaurantName(
        normalizedSettings.restaurantName ||
          inferRestaurantName(
            routeClient,
            brandingSettings,
            categoriesRef.current,
            menuItemsRef.current,
          ),
      );

      return normalizedSettings;
    },
    [routeClient],
  );

  const refreshClientSettings = useCallback(async () => {
    if (!routeClient) {
      return clientSettingsRef.current;
    }

    if (settingsRefreshInFlightRef.current) {
      return settingsRefreshInFlightRef.current;
    }

    const refreshPromise = (async () => {
      try {
        const settingsDocs = await fetchClientScopedDocuments(
          appwriteConfig.collections.settings,
          routeClient,
          { pageSize: 40, maxDocs: 120 },
        );
        return applyClientSettingsDocs(settingsDocs as AppwriteDocument[]);
      } catch (error) {
        devWarn("Settings refresh failed, keeping current settings:", error);
        return clientSettingsRef.current;
      }
    })();

    settingsRefreshInFlightRef.current = refreshPromise;
    try {
      return await refreshPromise;
    } finally {
      if (settingsRefreshInFlightRef.current === refreshPromise) {
        settingsRefreshInFlightRef.current = null;
      }
    }
  }, [applyClientSettingsDocs, routeClient]);

  const sessionReady = !!tableSession?.sessionId && !!tableSession?.billId;
  const sessionBlocked = tableSessionState === "blocked";
  const sessionInitFailed = tableSessionState === "error" && !sessionReady;
  const sessionOrderLocked = isTableSessionOrderLocked(tableSession);

  const isLightTheme = true;

  useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        closedSessionResetTimeoutRef.current !== null
      ) {
        window.clearTimeout(closedSessionResetTimeoutRef.current);
        closedSessionResetTimeoutRef.current = null;
      }
    };
  }, []);

  function touchBillActivity(activityAt = new Date().toISOString()) {
    setBillLastActivityAt(activityAt);
    billLastActivityRef.current = activityAt;
  }

  function persistOwnedOrderIds(orderIdsInput: Iterable<string>, browserIdInput?: string) {
    if (typeof window === "undefined") {
      return;
    }

    const resolvedBrowserId = browserIdInput || customerBrowserId || ensureBrowserCustomerId();
    if (!resolvedBrowserId) {
      return;
    }

    const uniqueOrderIds = normalizeOwnedOrderIds([...orderIdsInput]);
    ownedOrderIdsRef.current = new Set(uniqueOrderIds);

    const storageKey = buildCustomerBillScopeStorageKey(routeClient, routeTable, resolvedBrowserId);
    const payload: CustomerBillScopeState = {
      version: CUSTOMER_BILL_SCOPE_VERSION,
      browserId: resolvedBrowserId,
      client: routeClient,
      table: routeTable,
      orderIds: uniqueOrderIds,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }

  function trackOwnedOrderId(orderId: string, browserIdInput?: string) {
    const sanitizedOrderId = toSafeString(orderId);
    if (!sanitizedOrderId) {
      return;
    }
    const nextOwnedOrderIds = new Set(ownedOrderIdsRef.current);
    nextOwnedOrderIds.add(sanitizedOrderId);
    persistOwnedOrderIds(nextOwnedOrderIds, browserIdInput);
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
      setTableSession(null);
      setTableSessionState("checking");
      setTableOrders([]);
      setBillLastActivityAt("");
      tableOrdersRef.current = [];
      activeOrderContextRef.current = null;
      orderSyncSnapshotRef.current = {};
      setSearchText("");
      setBillOpen(false);
      setSelectedModifiersByItem({});
      setSelectedAddonsByItem({});
      setItemAddonGroupsByItem({});
      setAddonPickerItemId("");
      setAddonPickerDraftByGroup({});
      setAddonPickerError("");
      setAddonPickerMode("add");
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

        setLoadingMessage("Checking table session...");
        const sessionBrowserId =
          customerBrowserId || (typeof window !== "undefined" ? ensureBrowserCustomerId() : "");
        if (!customerBrowserId && sessionBrowserId) {
          setCustomerBrowserId(sessionBrowserId);
        }
        let resolvedTableSession: TableSessionRecord | null = null;
        try {
          resolvedTableSession = await withTimeout(
            resolveTableSessionForBrowser(
              matchedTable.clientId || routeClient,
              matchedTable,
              sessionBrowserId,
            ),
            REQUEST_TIMEOUT_MS,
            "Table session",
          );
          setTableSessionState("ready");
        } catch (sessionError) {
          const sessionErrorMessage = getErrorMessage(sessionError);
          if (sessionErrorMessage === TABLE_SESSION_LOCKED_MESSAGE) {
            setTableSessionState("blocked");
            setErrorMessage(TABLE_SESSION_LOCKED_MESSAGE);
          } else {
            devError(sessionError);
            setTableSessionState("needs_recovery");
            setErrorMessage(
              "Unable to initialize table session right now. You can browse the menu; ordering will retry before submit.",
            );
          }
        }

        if (cancelled) {
          return;
        }

        setTableSession(resolvedTableSession);
        setLoadingMessage("Loading menu...");
        const settingsPromise = fetchClientScopedDocuments(
          appwriteConfig.collections.settings,
          routeClient,
          { pageSize: 40, maxDocs: 120 },
        ).catch((error) => {
          if (isUnauthorizedError(error) || isRecoverableQueryFailure(error)) {
            return [] as Awaited<ReturnType<typeof fetchClientScopedDocuments>>;
          }
          devWarn("Settings fetch failed, continuing with defaults:", error);
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
          devWarn("Offers fetch failed, continuing without offers:", error);
          return [] as Awaited<ReturnType<typeof fetchClientScopedDocuments>>;
        });
        const addonGroupsPromise = fetchClientScopedDocuments(
          appwriteConfig.collections.addonGroups,
          routeClient,
          { pageSize: 80, maxDocs: 360 },
        ).catch((error) => {
          if (isUnauthorizedError(error) || isRecoverableQueryFailure(error)) {
            return [] as Awaited<ReturnType<typeof fetchClientScopedDocuments>>;
          }
          devWarn("Add-on groups fetch failed, continuing without add-ons:", error);
          return [] as Awaited<ReturnType<typeof fetchClientScopedDocuments>>;
        });
        const addonOptionsPromise = fetchClientScopedDocuments(
          appwriteConfig.collections.addonOptions,
          routeClient,
          { pageSize: 120, maxDocs: 800 },
        ).catch((error) => {
          if (isUnauthorizedError(error) || isRecoverableQueryFailure(error)) {
            return [] as Awaited<ReturnType<typeof fetchClientScopedDocuments>>;
          }
          devWarn("Add-on options fetch failed, continuing without add-ons:", error);
          return [] as Awaited<ReturnType<typeof fetchClientScopedDocuments>>;
        });
        const itemAddonMapPromise = fetchClientScopedDocuments(
          appwriteConfig.collections.itemAddonMap,
          routeClient,
          { pageSize: 120, maxDocs: 800 },
        ).catch((error) => {
          if (isUnauthorizedError(error) || isRecoverableQueryFailure(error)) {
            return [] as Awaited<ReturnType<typeof fetchClientScopedDocuments>>;
          }
          devWarn("Item add-on mapping fetch failed, continuing without add-ons:", error);
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
        const initialSettingsDocs = await settingsPromise;

        if (cancelled) {
          return;
        }

        categoriesRef.current = ensuredCategories;
        menuItemsRef.current = parsedItems;
        applyClientSettingsDocs(initialSettingsDocs as AppwriteDocument[]);
        setTableInfo(matchedTable);
        setCategories(ensuredCategories);
        setMenuItems(parsedItems);
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
          const resolvedBrowserId = sessionBrowserId || customerBrowserId || ensureBrowserCustomerId();
          if (!customerBrowserId && resolvedBrowserId) {
            setCustomerBrowserId(resolvedBrowserId);
          }
          const ownerScopeKey = buildCustomerBillOwnerScopeKey(
            routeClient,
            routeTable,
            resolvedBrowserId,
          );
          const scopeStorageKey = buildCustomerBillScopeStorageKey(
            routeClient,
            routeTable,
            resolvedBrowserId,
          );
          const scopeState = parseCustomerBillScopeState(
            window.localStorage.getItem(scopeStorageKey),
            resolvedBrowserId,
            routeClient,
            routeTable,
          );
          const historyStorageKey = buildCustomerHistoryStorageKey(routeClient, resolvedBrowserId);
          const historyState = parseCustomerOrderHistory(
            window.localStorage.getItem(historyStorageKey),
            resolvedBrowserId,
          );
          const ownedOrderIds = new Set<string>(scopeState?.orderIds ?? []);
          for (const orderId of collectOwnedOrderIdsFromHistory(historyState, routeClient, [
            routeTable,
            matchedTable.tableNo,
            matchedTable.tableCode,
          ])) {
            ownedOrderIds.add(orderId);
          }

          const cartForRoute = isRecordForRoute(activeCartState, routeClient, routeTable)
            ? activeCartState
            : null;
          const billForRouteCandidate = isRecordForRoute(activeBillState, routeClient, routeTable)
            ? activeBillState
            : null;
          const sessionForRouteCandidate = isRecordForRoute(activeSessionState, routeClient, routeTable)
            ? activeSessionState
            : null;
          let billForRoute = isRecordOwnedByCurrentBrowser(
            billForRouteCandidate,
            resolvedBrowserId,
            ownerScopeKey,
          )
            ? billForRouteCandidate
            : null;
          let sessionForRoute = isRecordOwnedByCurrentBrowser(
            sessionForRouteCandidate,
            resolvedBrowserId,
            ownerScopeKey,
          )
            ? sessionForRouteCandidate
            : null;
          const resolvedSessionId = resolvedTableSession?.sessionId ?? "";
          const resolvedBillId = resolvedTableSession?.billId ?? "";
          const hasResolvedSessionIdentity = !!resolvedSessionId && !!resolvedBillId;
          const hasStoredBillMismatch =
            hasResolvedSessionIdentity &&
            ((billForRoute &&
              (billForRoute.billId !== resolvedBillId ||
                billForRoute.sessionId !== resolvedSessionId)) ||
              (sessionForRoute &&
                (sessionForRoute.billId !== resolvedBillId ||
                  sessionForRoute.sessionId !== resolvedSessionId)));
          if (hasStoredBillMismatch) {
            window.localStorage.removeItem(activeBillStorageKey);
            window.localStorage.removeItem(activeSessionStorageKey);
            window.sessionStorage.removeItem(activeBillStorageKey);
            window.sessionStorage.removeItem(activeSessionStorageKey);
            window.localStorage.removeItem(scopeStorageKey);
            persistedBillStateRef.current = null;
            persistedSessionStateRef.current = null;
            billForRoute = null;
            sessionForRoute = null;
            ownedOrderIds.clear();
          }
          if (billForRoute?.ownedOrderIds) {
            for (const orderId of billForRoute.ownedOrderIds) {
              ownedOrderIds.add(orderId);
            }
          }
          if (billForRoute?.orders) {
            for (const record of billForRoute.orders) {
              if (record.orderId) {
                ownedOrderIds.add(record.orderId);
              }
            }
          }
          if (billForRoute?.activeOrder?.id) {
            ownedOrderIds.add(billForRoute.activeOrder.id);
          }
          ownedOrderIdsRef.current = ownedOrderIds;
          persistOwnedOrderIds(ownedOrderIds, resolvedBrowserId);

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
                selectedAddonsByItem: {},
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
                ownerBrowserId: resolvedBrowserId,
                ownerScopeKey: ownerScopeKey,
                ownedOrderIds: legacyForRoute.activeOrder?.id ? [legacyForRoute.activeOrder.id] : [],
                tableSessionDocumentId: resolvedTableSession?.documentId,
                sessionId: resolvedTableSession?.sessionId,
                billId: resolvedTableSession?.billId,
                tableSessionStatus: resolvedTableSession?.status,
                tableSessionPaymentStatus: resolvedTableSession?.paymentStatus,
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
                ownerBrowserId: resolvedBrowserId,
                ownerScopeKey: ownerScopeKey,
                tableSessionDocumentId: resolvedTableSession?.documentId,
                sessionId: resolvedTableSession?.sessionId,
                billId: resolvedTableSession?.billId,
                tableSessionStatus: resolvedTableSession?.status,
                tableSessionPaymentStatus: resolvedTableSession?.paymentStatus,
                lockedBy: resolvedTableSession?.lockedBy,
                orderRound: 0,
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
          const hydratedAddons: Record<string, SelectedAddon[]> = {};
          let restoredInstructions = "";
          const validIds = new Set(parsedItems.map((item) => item.id));
          const cartSource = cartForRoute?.cart ?? legacyForRoute?.cart ?? {};
          const modifierSource = cartForRoute?.selectedModifiersByItem ?? {};
          const addonSource = cartForRoute?.selectedAddonsByItem ?? {};
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

          for (const [itemId, selected] of Object.entries(addonSource)) {
            if (!hydratedCart[itemId]) {
              continue;
            }
            const parsedAddons = parseSelectedAddonList(selected);
            if (parsedAddons.length > 0) {
              hydratedAddons[itemId] = parsedAddons;
            }
          }

          const activeBillId =
            resolvedTableSession?.billId || sessionForRoute?.billId || billForRoute?.billId || "";
          const activeSessionId =
            resolvedTableSession?.sessionId ||
            sessionForRoute?.sessionId ||
            billForRoute?.sessionId ||
            "";
          let restoredOrder = activeBillId
            ? billForRoute?.activeOrder ??
              sessionForRoute?.activeOrder ??
              legacyForRoute?.activeOrder ??
              null
            : null;
          const persistedOrders = activeBillId && activeSessionId
            ? (billForRoute?.orders ?? []).filter((order) =>
                isOrderForSessionBill(order, activeBillId, activeSessionId),
              )
            : [];
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
          ).filter((order) => isOrderForSessionBill(order, activeBillId, activeSessionId));
          const nextBillActivityAt =
            restoredBillActivityAt || (restoredOrders.length > 0 || restoredOrder ? new Date().toISOString() : "");
          setBillLastActivityAt(nextBillActivityAt);
          billLastActivityRef.current = nextBillActivityAt;

          if (restoredOrder && !ownedOrderIdsRef.current.has(restoredOrder.id)) {
            restoredOrder = null;
          }

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
          setSelectedAddonsByItem(hydratedAddons);
          setKitchenInstructions(restoredInstructions);
        } else {
          setCart({});
          setSelectedModifiersByItem({});
          setSelectedAddonsByItem({});
          setKitchenInstructions("");
          setTableOrders([]);
          tableOrdersRef.current = [];
          syncOrderSnapshot([]);
        }

        setLoadState("ready");
        setIsCartHydrated(true);

        void offersPromise.then((offerDocs) => {
          if (cancelled) {
            return;
          }
          setOffersToday(parseActiveOffers(offerDocs, routeClient, new Date()));
        });

        void Promise.all([itemAddonMapPromise, addonGroupsPromise, addonOptionsPromise]).then(
          ([itemAddonMapDocs, addonGroupDocs, addonOptionDocs]) => {
            if (cancelled) {
              return;
            }
            const resolved = buildItemAddonGroupsByItem(
              routeClient,
              parsedItems,
              itemAddonMapDocs as Record<string, unknown>[],
              addonGroupDocs as Record<string, unknown>[],
              addonOptionDocs as Record<string, unknown>[],
            );
            setItemAddonGroupsByItem(resolved);
          },
        );

        const cleanupClientId = matchedTable.clientId || routeClient;

        // Sync backend orders in background so first load does not wait on order-history calls.
        if (ENABLE_BACKEND_ORDER_SYNC && shouldResumeOrderSync) {
          void (async () => {
            try {
              const backendOrders = await withTimeout(
                fetchTableOrderRecords(
                  cleanupClientId,
                  matchedTable.id,
                  resolvedTableSession?.billId,
                  resolvedTableSession?.sessionId,
                ),
                BILL_SYNC_TIMEOUT_MS,
                "Initial bill sync",
              );
              if (cancelled || backendOrders.length === 0) {
                return;
              }

              applyBackendOrders(backendOrders);
            } catch (syncError) {
              if (!cancelled) {
                devWarn("Initial bill sync failed:", syncError);
              }
            }
          })();
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        devError(error);
        setLoadState("error");
        const message = getErrorMessage(error).toLowerCase();
        if (getErrorMessage(error) === TABLE_SESSION_LOCKED_MESSAGE) {
          setErrorMessage(TABLE_SESSION_LOCKED_MESSAGE);
        } else if (message.includes("timed out")) {
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
    applyClientSettingsDocs,
    legacyTableSessionStorageKey,
    reloadKey,
    routeClient,
    routeTable,
  ]);

  useEffect(() => {
    if (loadState !== "ready" || typeof window === "undefined") {
      return;
    }

    const refreshVisibleSettings = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void refreshClientSettings();
    };

    window.addEventListener("focus", refreshVisibleSettings);
    document.addEventListener("visibilitychange", refreshVisibleSettings);

    return () => {
      window.removeEventListener("focus", refreshVisibleSettings);
      document.removeEventListener("visibilitychange", refreshVisibleSettings);
    };
  }, [loadState, refreshClientSettings]);

  useEffect(() => {
    if (loadState !== "ready" || typeof window === "undefined") {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void refreshClientSettings();
    }, SETTINGS_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadState, refreshClientSettings]);

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
            fetchTableOrderRecords(
              tableInfo.clientId || routeClient,
              tableInfo.id,
              tableSession?.billId,
              tableSession?.sessionId,
            ),
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
    tableSession?.billId,
    tableInfo,
    tableOrders.length,
  ]);

  useEffect(() => {
    if (!tableInfo || loadState !== "ready" || !tableSession?.documentId) {
      return;
    }
    if (!tableSession.sessionId || !tableSession.billId) {
      if (!sessionMonitorMissingIdentityWarnedRef.current) {
        console.warn("Session monitor skipped: missing session id");
        sessionMonitorMissingIdentityWarnedRef.current = true;
      }
      return;
    }
    sessionMonitorMissingIdentityWarnedRef.current = false;

    let cancelled = false;
    const sessionBeingWatched = tableSession;

    const resetMonitorFailureState = () => {
      sessionMonitorFailureCountRef.current = 0;
      sessionMonitorLastErrorSignatureRef.current = "";
      setNoticeMessage((current) =>
        current === SESSION_MONITOR_WARNING_MESSAGE ? "" : current,
      );
    };

    const recordMonitorFailure = (error: unknown) => {
      sessionMonitorFailureCountRef.current += 1;
      const previousSignature = sessionMonitorLastErrorSignatureRef.current;
      sessionMonitorLastErrorSignatureRef.current = logSessionMonitorError(
        error,
        sessionMonitorFailureCountRef.current,
        previousSignature,
      );

      if (sessionMonitorFailureCountRef.current >= 5) {
        setNoticeMessage((current) =>
          current && current !== SESSION_MONITOR_WARNING_MESSAGE
            ? current
            : SESSION_MONITOR_WARNING_MESSAGE,
        );
      }
    };

    const pollTableSessionStatus = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      if (typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine) {
        return;
      }

      try {
        const latestSession = await withTimeout(
          fetchCurrentTableSessionRecord(
            tableInfo.clientId || routeClient,
            tableInfo,
            sessionBeingWatched,
          ),
          REQUEST_TIMEOUT_MS,
          "Table session status",
        );
        if (cancelled) {
          return;
        }

        if (!latestSession) {
          recordMonitorFailure(
            new Error("Current table session was not found in the monitor response."),
          );
          return;
        }

        resetMonitorFailureState();

        if (isTableSessionClosedOrPaid(latestSession)) {
          resetCustomerSessionAfterClose(latestSession);
          return;
        }

        if (isTableSessionOrderLocked(latestSession)) {
          setTableSession(latestSession);
          setErrorMessage(TABLE_SESSION_PAYMENT_PENDING_MESSAGE);
          setBillSyncMessage(TABLE_SESSION_PAYMENT_PENDING_MESSAGE);
          return;
        }

        setTableSession((current) =>
          current?.documentId === latestSession.documentId ? latestSession : current,
        );
        setErrorMessage((current) =>
          current === TABLE_SESSION_PAYMENT_PENDING_MESSAGE ? "" : current,
        );
      } catch (error) {
        if (!cancelled) {
          recordMonitorFailure(error);
        }
      }
    };

    void pollTableSessionStatus();
    const intervalId = window.setInterval(
      () => void pollTableSessionStatus(),
      TABLE_SESSION_STATUS_WATCH_INTERVAL_MS,
    );

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    loadState,
    routeClient,
    tableInfo,
    tableSession?.billId,
    tableSession?.documentId,
    tableSession?.sessionId,
  ]);

  useEffect(() => {
    if (!isCartHydrated || typeof window === "undefined") {
      return;
    }

    const nowIso = new Date().toISOString();
    const hasCart = Object.keys(cart).length > 0;
    const hasModifierSelections = Object.keys(selectedModifiersByItem).length > 0;
    const hasAddonSelections = Object.keys(selectedAddonsByItem).length > 0;
    const hasInstructions = kitchenInstructions.trim().length > 0;
    const hasTableSession = !!tableSession;
    const hasOpenOrder =
      !!activeOrderContext &&
      !isOrderClosed(activeOrderContext.status, activeOrderContext.paymentStatus);
    const hasBillOrders = tableOrders.length > 0;
    const effectiveBillLastActivityAt =
      billLastActivityAt ||
      activeOrderContext?.updatedAt ||
      tableOrders[0]?.updatedAt ||
      nowIso;
    const resolvedBrowserId = customerBrowserId || ensureBrowserCustomerId();
    const resolvedOwnerScopeKey = resolvedBrowserId
      ? buildCustomerBillOwnerScopeKey(routeClient, routeTable, resolvedBrowserId)
      : "";
    const mergedOwnedOrderIds = new Set<string>(ownedOrderIdsRef.current);
    for (const order of tableOrders) {
      mergedOwnedOrderIds.add(order.orderId);
    }
    if (activeOrderContext?.id) {
      mergedOwnedOrderIds.add(activeOrderContext.id);
    }
    const normalizedOwnedOrderIds = normalizeOwnedOrderIds([...mergedOwnedOrderIds]);
    ownedOrderIdsRef.current = new Set(normalizedOwnedOrderIds);
    if (resolvedBrowserId) {
      const scopeStorageKey =
        customerBillScopeStorageKey ||
        buildCustomerBillScopeStorageKey(routeClient, routeTable, resolvedBrowserId);
      const scopePayload: CustomerBillScopeState = {
        version: CUSTOMER_BILL_SCOPE_VERSION,
        browserId: resolvedBrowserId,
        client: routeClient,
        table: routeTable,
        orderIds: normalizedOwnedOrderIds,
        updatedAt: nowIso,
      };
      window.localStorage.setItem(scopeStorageKey, JSON.stringify(scopePayload));
    }

    const activeCartState: ActiveTableCartState = {
      version: ACTIVE_TABLE_STORAGE_VERSION,
      client: routeClient,
      table: routeTable,
      cart,
      selectedModifiersByItem,
      selectedAddonsByItem,
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
      ownerBrowserId: resolvedBrowserId || undefined,
      ownerScopeKey: resolvedOwnerScopeKey || undefined,
      ownedOrderIds: normalizedOwnedOrderIds,
      tableSessionDocumentId: tableSession?.documentId,
      sessionId: tableSession?.sessionId,
      billId: tableSession?.billId,
      tableSessionStatus: tableSession?.status,
      tableSessionPaymentStatus: tableSession?.paymentStatus,
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
      ownerBrowserId: resolvedBrowserId || undefined,
      ownerScopeKey: resolvedOwnerScopeKey || undefined,
      tableSessionDocumentId: tableSession?.documentId,
      sessionId: tableSession?.sessionId,
      billId: tableSession?.billId,
      tableSessionStatus: tableSession?.status,
      tableSessionPaymentStatus: tableSession?.paymentStatus,
      lockedBy: tableSession?.lockedBy,
      orderRound: tableSession
        ? tableOrders.filter((order) =>
            isOrderForSessionBill(order, tableSession.billId, tableSession.sessionId),
          ).length
        : 0,
      updatedAt: nowIso,
    };

    const cartStatePayload = JSON.stringify(activeCartState);
    const billStatePayload = JSON.stringify(activeBillState);
    const sessionStatePayload = JSON.stringify(activeSessionState);

    if (hasCart || hasModifierSelections || hasAddonSelections || hasInstructions) {
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

    if (hasTableSession || hasCart || hasOpenOrder || hasBillOrders) {
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
    customerBillScopeStorageKey,
    customerBrowserId,
    kitchenInstructions,
    isCartHydrated,
    legacyTableSessionStorageKey,
    routeClient,
    routeTable,
    selectedAddonsByItem,
    selectedModifiersByItem,
    tableSession,
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
  const menuSections = useMemo<MenuCategorySection[]>(() => {
    const normalizedSearch = deferredSearchText.trim().toLowerCase();
    const matchesSearch = (item: MenuItem) => {
      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${item.name} ${item.nameHi} ${item.description}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    };
    const scopedCategories =
      activeCategory === "all"
        ? categories
        : categories.filter((category) => category.id === activeCategory);
    const sections = scopedCategories
      .map((category) => ({
        category,
        items: menuItems.filter((item) => matchesCategory(item, category) && matchesSearch(item)),
      }))
      .filter((section) => section.items.length > 0);

    if (activeCategory === "all") {
      const uncategorizedItems = menuItems.filter(
        (item) => !categories.some((category) => matchesCategory(item, category)) && matchesSearch(item),
      );

      if (uncategorizedItems.length > 0) {
        sections.push({
          category: {
            id: "uncategorized",
            name: "Chef Specials",
            nameHi: "",
            description: "",
            image: "",
            slug: "chef-specials",
            sortOrder: Number.MAX_SAFE_INTEGER,
            raw: { $id: "uncategorized" },
          },
          items: uncategorizedItems,
        });
      }
    }

    return sections;
  }, [activeCategory, categories, deferredSearchText, menuItems]);

  const visibleItems = useMemo(
    () => menuSections.flatMap((section) => section.items),
    [menuSections],
  );

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

  useEffect(() => {
    setSelectedAddonsByItem((current) => {
      const next: Record<string, SelectedAddon[]> = {};
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

  const resolvedSelectedAddonsByItem = useMemo(() => {
    const resolved: Record<string, SelectedAddon[]> = {};

    for (const { item } of cartItems) {
      const selected = selectedAddonsByItem[item.id] ?? [];
      const addonGroups = itemAddonGroupsByItem[item.id] ?? [];
      if (selected.length === 0 || addonGroups.length === 0) {
        continue;
      }

      const groupLookup = new Map(addonGroups.map((group) => [group.id, group]));
      const sanitized: SelectedAddon[] = [];
      const seen = new Set<string>();

      for (const entry of selected) {
        const group = groupLookup.get(entry.groupId);
        if (!group) {
          continue;
        }
        const option = group.options.find((candidate) => candidate.id === entry.optionId);
        if (!option) {
          continue;
        }
        const dedupeToken = `${group.id}::${option.id}`;
        if (seen.has(dedupeToken)) {
          continue;
        }
        seen.add(dedupeToken);
        sanitized.push({
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          price: option.price,
        });
      }

      if (sanitized.length > 0) {
        resolved[item.id] = sanitized;
      }
    }

    return resolved;
  }, [cartItems, itemAddonGroupsByItem, selectedAddonsByItem]);

  const addonPickerItem = useMemo(
    () => menuItems.find((item) => item.id === addonPickerItemId) ?? null,
    [addonPickerItemId, menuItems],
  );
  const addonPickerGroups = useMemo(
    () => (addonPickerItem ? itemAddonGroupsByItem[addonPickerItem.id] ?? [] : []),
    [addonPickerItem, itemAddonGroupsByItem],
  );
  const addonPickerOpen = !!addonPickerItem && addonPickerGroups.length > 0;

  const pricedCustomizationsByItem = useMemo(() => {
    const merged: Record<string, SelectedModifier[]> = {};
    for (const { item } of cartItems) {
      const baseModifiers = resolvedSelectedModifiersByItem[item.id] ?? [];
      const selectedAddons = resolvedSelectedAddonsByItem[item.id] ?? [];
      const mergedCustomizations = mergeCustomizations(baseModifiers, selectedAddons);
      if (mergedCustomizations.length > 0) {
        merged[item.id] = mergedCustomizations;
      }
    }
    return merged;
  }, [cartItems, resolvedSelectedAddonsByItem, resolvedSelectedModifiersByItem]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((totalAmount, cartItem) => {
      const selected = pricedCustomizationsByItem[cartItem.item.id] ?? [];
      const modifierUnitTotal = getSelectedModifierTotal(selected);
      const unitPrice = cartItem.item.price + modifierUnitTotal;
      return totalAmount + unitPrice * cartItem.quantity;
    }, 0);
  }, [cartItems, pricedCustomizationsByItem]);

  const hasCustomizationsInCart = useMemo(
    () => Object.keys(pricedCustomizationsByItem).length > 0,
    [pricedCustomizationsByItem],
  );

  const normalizedCurrency = useMemo(() => {
    const code = clientSettings.currency.trim().toUpperCase();
    return code || "INR";
  }, [clientSettings.currency]);
  const clientTaxConfig = useMemo(
    () => resolveClientTaxConfig(clientSettings),
    [clientSettings],
  );
  const gstEnabled = clientTaxConfig.gstEnabled;
  const taxPercentage = clientTaxConfig.taxPercentage;
  const cgstPercentage = clientTaxConfig.cgstPercentage;
  const sgstPercentage = clientTaxConfig.sgstPercentage;
  const taxAmount = useMemo(
    () => (gstEnabled ? Number(((subtotal * taxPercentage) / 100).toFixed(2)) : 0),
    [subtotal, taxPercentage, gstEnabled],
  );
  const cgstAmount = useMemo(
    () => (gstEnabled ? Number(((subtotal * cgstPercentage) / 100).toFixed(2)) : 0),
    [subtotal, cgstPercentage, gstEnabled],
  );
  const sgstAmount = useMemo(
    () => (gstEnabled ? Number(((subtotal * sgstPercentage) / 100).toFixed(2)) : 0),
    [subtotal, sgstPercentage, gstEnabled],
  );
  const preDiscountTotal = roundCurrency(subtotal + taxAmount);
  const formatMoney = (value: number) => formatInr(value, normalizedCurrency);
  const cartOfferEvaluationLines = useMemo(() => {
    return cartItems.map((cartItem) => {
      const selected = pricedCustomizationsByItem[cartItem.item.id] ?? [];
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
  }, [cartItems, pricedCustomizationsByItem]);
  const autoPromotions = useMemo(
    () => offersToday.filter((offer) => resolveOfferApplicationLevel(offer) === "promotion"),
    [offersToday],
  );
  const cartLevelOffers = useMemo(
    () => offersToday.filter((offer) => resolveOfferApplicationLevel(offer) === "cart"),
    [offersToday],
  );
  const matchedItemOffers = useMemo(
    () =>
      cartOfferEvaluationLines
        .map((line) => pickBestItemWiseOfferForLine(line, autoPromotions, subtotal))
        .filter((entry): entry is ItemWiseOfferMatch => !!entry),
    [autoPromotions, cartOfferEvaluationLines, subtotal],
  );
  const cartCouponCandidates = useMemo(
    () => evaluateApplicableOffers(cartLevelOffers, cartOfferEvaluationLines, subtotal),
    [cartLevelOffers, cartOfferEvaluationLines, subtotal],
  );
  const [selectedCartCouponId] = useState("");
  const selectedCartCoupon = useMemo(
    () => cartCouponCandidates.find((offer) => offer.offerId === selectedCartCouponId) ?? null,
    [cartCouponCandidates, selectedCartCouponId],
  );
  const bestCartCoupon = useMemo(
    () => pickBestApplicableOffer(cartCouponCandidates, preDiscountTotal),
    [cartCouponCandidates, preDiscountTotal],
  );
  const resolvedCartCoupon = useMemo(() => {
    if (!selectedCartCoupon) {
      return bestCartCoupon;
    }
    return pickBestApplicableOffer([selectedCartCoupon], preDiscountTotal) ?? bestCartCoupon;
  }, [bestCartCoupon, preDiscountTotal, selectedCartCoupon]);
  const applicableCartOffers = useMemo(
    () => summarizeItemWiseOfferMatches(matchedItemOffers),
    [matchedItemOffers],
  );
  const taxes = taxAmount;
  const safeSubtotal = roundCurrency(Math.max(0, Number(subtotal) || 0));
  const safeTaxes = roundCurrency(Math.max(0, Number(taxes) || 0));
  const totalDiscountAmount = useMemo(
    () =>
      roundCurrency(
        Math.min(
          preDiscountTotal,
          matchedItemOffers.reduce((sum, entry) => sum + entry.discountAmount, 0) +
            (resolvedCartCoupon?.discountAmount ?? 0),
        ),
      ),
    [matchedItemOffers, preDiscountTotal, resolvedCartCoupon],
  );
  const finalTotal = roundCurrency(Math.max(0, safeSubtotal + safeTaxes - totalDiscountAmount));

  const mergedBillItems = useMemo(
    () => mergeBillItemsFromOrders(tableOrders, menuItems),
    [menuItems, tableOrders],
  );

  const billSubtotal = useMemo(
    () => mergedBillItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [mergedBillItems],
  );
  const billStoredTaxBreakdown = useMemo(() => sumTableOrderTaxBreakdown(tableOrders), [tableOrders]);
  const billTaxAmount = useMemo(() => {
    if (!gstEnabled) {
      return 0;
    }
    if (billStoredTaxBreakdown.taxAmount > 0) {
      return roundCurrency(billStoredTaxBreakdown.taxAmount);
    }
    if (taxPercentage > 0 && billSubtotal > 0) {
      return Number(((billSubtotal * taxPercentage) / 100).toFixed(2));
    }
    return 0;
  }, [billStoredTaxBreakdown.taxAmount, billSubtotal, gstEnabled, taxPercentage]);
  const billCgstAmount = useMemo(() => {
    if (!gstEnabled) {
      return 0;
    }
    if (billStoredTaxBreakdown.cgstAmount > 0) {
      return roundCurrency(billStoredTaxBreakdown.cgstAmount);
    }
    return Number(((billSubtotal * cgstPercentage) / 100).toFixed(2));
  }, [billStoredTaxBreakdown.cgstAmount, billSubtotal, cgstPercentage, gstEnabled]);
  const billSgstAmount = useMemo(() => {
    if (!gstEnabled) {
      return 0;
    }
    if (billStoredTaxBreakdown.sgstAmount > 0) {
      return roundCurrency(billStoredTaxBreakdown.sgstAmount);
    }
    return Number(((billSubtotal * sgstPercentage) / 100).toFixed(2));
  }, [billStoredTaxBreakdown.sgstAmount, billSubtotal, sgstPercentage, gstEnabled]);
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
  const unpaidStoredTaxBreakdown = useMemo(
    () => sumTableOrderTaxBreakdown(unpaidOrders),
    [unpaidOrders],
  );
  const unpaidTaxAmount = useMemo(() => {
    if (!gstEnabled) {
      return 0;
    }
    if (unpaidStoredTaxBreakdown.taxAmount > 0) {
      return roundCurrency(unpaidStoredTaxBreakdown.taxAmount);
    }
    if (taxPercentage > 0 && unpaidSubtotal > 0) {
      return Number(((unpaidSubtotal * taxPercentage) / 100).toFixed(2));
    }
    return 0;
  }, [gstEnabled, taxPercentage, unpaidStoredTaxBreakdown.taxAmount, unpaidSubtotal]);
  const unpaidCgstAmount = useMemo(() => {
    if (!gstEnabled) {
      return 0;
    }
    if (unpaidStoredTaxBreakdown.cgstAmount > 0) {
      return roundCurrency(unpaidStoredTaxBreakdown.cgstAmount);
    }
    return Number(((unpaidSubtotal * cgstPercentage) / 100).toFixed(2));
  }, [cgstPercentage, gstEnabled, unpaidStoredTaxBreakdown.cgstAmount, unpaidSubtotal]);
  const unpaidSgstAmount = useMemo(() => {
    if (!gstEnabled) {
      return 0;
    }
    if (unpaidStoredTaxBreakdown.sgstAmount > 0) {
      return roundCurrency(unpaidStoredTaxBreakdown.sgstAmount);
    }
    return Number(((unpaidSubtotal * sgstPercentage) / 100).toFixed(2));
  }, [gstEnabled, sgstPercentage, unpaidStoredTaxBreakdown.sgstAmount, unpaidSubtotal]);
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
  const currentBillCgstAmount = hasAggregatedUnpaidBill ? unpaidCgstAmount : billCgstAmount;
  const currentBillSgstAmount = hasAggregatedUnpaidBill ? unpaidSgstAmount : billSgstAmount;
  const currentBillFinalTotal = hasAggregatedUnpaidBill ? unpaidFinalTotal : billFinalTotal;
  const menuItemLookup = useMemo(
    () => new Map(menuItems.map((item) => [item.id, item])),
    [menuItems],
  );
  const unpaidStoredPayableTotal = useMemo(
    () => sumTableOrderPayableAmount(unpaidOrders),
    [unpaidOrders],
  );
  const unpaidOnlyPayableTotal = useMemo(() => {
    if (!hasAggregatedUnpaidBill) {
      return 0;
    }
    return unpaidStoredPayableTotal;
  }, [hasAggregatedUnpaidBill, unpaidStoredPayableTotal]);
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
  const currentBillOrders = hasAggregatedUnpaidBill ? unpaidOrders : tableOrders;
  const billPayableTotal = useMemo(
    () => sumTableOrderPayableAmount(currentBillOrders),
    [currentBillOrders],
  );
  const billOfferDiscountAmount = roundCurrency(
    Math.max(0, currentBillFinalTotal - billPayableTotal),
  );
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
  const unpaidTotal = unpaidOnlyPayableTotal;
  const placeOrderDisabled =
    cartCount === 0 ||
    placingOrder ||
    sessionBlocked ||
    sessionOrderLocked;

  function triggerAddFeedback(itemId: string) {
    if (prefersReducedMotion || typeof window === "undefined") {
      return;
    }

    setRecentlyAddedItemId(itemId);
    if (addFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(addFeedbackTimeoutRef.current);
    }
    addFeedbackTimeoutRef.current = window.setTimeout(() => {
      setRecentlyAddedItemId("");
      addFeedbackTimeoutRef.current = null;
    }, 620);
  }

  async function addToCart(item: MenuItem) {
    const itemId = item.id;
    const itemName = item.name;
    const outOfStock = !item.isAvailable;

    if (!itemId) {
      console.error("ADD BLOCKED: Item ID missing", { item });
      setErrorMessage("Error: Item ID is missing. Please refresh and try again.");
      return;
    }

    console.log("ADD_TO_CART_ENTERED", {
      itemId,
      name: itemName,
      outOfStock,
    });

    if (outOfStock) {
      console.log("ADD BLOCKED: item out of stock", { itemId, name: itemName });
      return;
    }

    console.log("ADD_TO_CART_ALLOWED", { itemId, name: itemName });

    const addonGroups = itemAddonGroupsByItem[item.id] ?? [];
    if (addonGroups.length > 0) {
      await openAddonPickerForItem(item);
      return;
    }

    await updateItemQuantity(itemId, 1);
    triggerAddFeedback(itemId);
  }

  async function updateItemQuantity(itemId: string, delta: number) {
    const menuItem = menuItems.find((item) => item.id === itemId);
    const menuItemName = menuItem?.name ?? itemId;

    if (delta > 0 && menuItem && !menuItem.isAvailable) {
      console.log("ADD BLOCKED: item out of stock", { itemId, name: menuItemName });
      return;
    }

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
    setSelectedAddonsByItem({});
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

  function closeAddonPicker() {
    setAddonPickerItemId("");
    setAddonPickerDraftByGroup({});
    setAddonPickerError("");
    setAddonPickerMode("add");
  }

  async function openAddonPickerForItem(item: MenuItem, mode: "add" | "edit" = "add") {
    if (sessionBlocked) {
      setErrorMessage(TABLE_SESSION_LOCKED_MESSAGE);
      return;
    }

    if (sessionInitFailed) {
      setErrorMessage("Unable to initialize table session. Please refresh the QR and try again.");
      return;
    }

    const addonGroups = itemAddonGroupsByItem[item.id] ?? [];
    if (addonGroups.length === 0) {
      await addToCart(item);
      return;
    }

    const resolvedSession = await ensureTableSessionForOrder();
    if (!resolvedSession) {
      return;
    }

    const existingSelections = resolvedSelectedAddonsByItem[item.id] ?? [];
    const initialDraft: Record<string, string[]> = {};
    for (const group of addonGroups) {
      const selectedOptions = existingSelections
        .filter((entry) => entry.groupId === group.id)
        .map((entry) => entry.optionId);
      if (selectedOptions.length > 0) {
        initialDraft[group.id] =
          group.selectionMode === "single" ? [selectedOptions[0]] : selectedOptions;
      }
    }

    setAddonPickerItemId(item.id);
    setAddonPickerDraftByGroup(initialDraft);
    setAddonPickerError("");
    setAddonPickerMode(mode);
  }

  function toggleAddonDraftOption(group: ItemAddonGroup, optionId: string) {
    setAddonPickerDraftByGroup((current) => {
      const existing = current[group.id] ?? [];
      if (group.selectionMode === "single") {
        return { ...current, [group.id]: [optionId] };
      }

      const isSelected = existing.includes(optionId);
      const nextGroupSelection = isSelected
        ? existing.filter((entry) => entry !== optionId)
        : [...existing, optionId];
      return {
        ...current,
        [group.id]: nextGroupSelection,
      };
    });
    setAddonPickerError("");
  }

  function saveAddonSelectionAndAddItem() {
    if (!addonPickerItem) {
      return;
    }

    const nextSelection: SelectedAddon[] = [];
    for (const group of addonPickerGroups) {
      const selectedOptionIds = addonPickerDraftByGroup[group.id] ?? [];
      if (group.required && selectedOptionIds.length === 0) {
        setAddonPickerError(`Please select at least one option for ${group.name}.`);
        return;
      }

      for (const optionId of selectedOptionIds) {
        const option = group.options.find((entry) => entry.id === optionId);
        if (!option) {
          continue;
        }
        nextSelection.push({
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          price: option.price,
        });
      }
    }

    setSelectedAddonsByItem((current) => {
      const next = { ...current };
      if (nextSelection.length > 0) {
        next[addonPickerItem.id] = nextSelection;
      } else {
        delete next[addonPickerItem.id];
      }
      return next;
    });

    if (addonPickerMode === "add") {
      updateItemQuantity(addonPickerItem.id, 1);
      triggerAddFeedback(addonPickerItem.id);
    }
    closeAddonPicker();
  }

  function showStatusPopup(nextPopup: StatusPopupState) {
    setStatusPopup(nextPopup);
  }

  function resetCustomerSessionAfterClose(
    closedSession: TableSessionRecord | null | undefined = tableSession,
  ) {
    const closedSessionKey = closedSession
      ? `${closedSession.documentId}:${closedSession.sessionId}:${closedSession.billId}`
      : "";
    if (closedSessionKey && handledClosedSessionKeysRef.current.has(closedSessionKey)) {
      return;
    }
    if (closedSessionKey) {
      handledClosedSessionKeysRef.current.add(closedSessionKey);
    }

    setActiveOrderContext(null);
    activeOrderContextRef.current = null;
    setOrderPlacedId("");
    tableOrdersRef.current = [];
    setTableOrders([]);
    syncOrderSnapshot([]);
    clearCart();
    setBillLastActivityAt("");
    billLastActivityRef.current = "";
    ownedOrderIdsRef.current = new Set();
    setTableSession(null);
    setTableSessionState("checking");
    setBillOpen(false);
    setCartOpen(false);
    setUpiQrOpen(false);
    setAddonPickerItemId("");
    setAddonPickerDraftByGroup({});
    setAddonPickerError("");
    setKitchenInstructions("");
    setErrorMessage("");
    setBillSyncMessage(TABLE_SESSION_CLOSED_MESSAGE);
    setNoticeMessage(TABLE_SESSION_CLOSED_MESSAGE);
    showStatusPopup({
      title: "Bill Closed",
      description: "Thank you for visiting Cafe Luxe.",
      tone: "success",
    });

    persistedCartStateRef.current = null;
    persistedBillStateRef.current = null;
    persistedSessionStateRef.current = null;

    if (typeof window === "undefined") {
      setTableSessionState("ready");
      return;
    }

    window.localStorage.removeItem(activeCartStorageKey);
    window.localStorage.removeItem(activeBillStorageKey);
    window.localStorage.removeItem(activeSessionStorageKey);
    window.localStorage.removeItem(legacyTableSessionStorageKey);
    window.sessionStorage.removeItem(activeCartStorageKey);
    window.sessionStorage.removeItem(activeBillStorageKey);
    window.sessionStorage.removeItem(activeSessionStorageKey);
    if (customerBillScopeStorageKey) {
      window.localStorage.removeItem(customerBillScopeStorageKey);
    }
    if (customerBillOwnerScopeKey) {
      window.localStorage.removeItem(customerBillOwnerScopeKey);
    }

    if (closedSessionResetTimeoutRef.current !== null) {
      window.clearTimeout(closedSessionResetTimeoutRef.current);
    }
    closedSessionResetTimeoutRef.current = window.setTimeout(() => {
      setTableSessionState((current) => (current === "checking" ? "ready" : current));
      closedSessionResetTimeoutRef.current = null;
    }, 900);
  }

  function markKitchenStatusAlertSeen(orderId: string, status: string) {
    const key = `${orderId}:${status.trim().toUpperCase()}`;
    shownKitchenStatusAlertKeysRef.current.add(key);
    return key;
  }

  function hasSeenKitchenStatusAlert(orderId: string, status: string) {
    const key = `${orderId}:${status.trim().toUpperCase()}`;
    return shownKitchenStatusAlertKeysRef.current.has(key);
  }

  function buildKitchenStatusPopup(record: TableOrderRecord, normalizedStatus: string) {
    const pendingStatuses = new Set(["PENDING", "NEW", "PLACED", "RECEIVED"]);
    const preparingStatuses = new Set(["PREPARING", "COOKING", "IN_PROGRESS"]);
    const readyStatuses = new Set(["READY"]);
    const servedStatuses = new Set(["SERVED", "DELIVERED", "COMPLETED", "CLOSED", "BILLED"]);
    const confirmedStatuses = new Set(["ACCEPTED", "CONFIRMED"]);

    if (pendingStatuses.has(normalizedStatus)) {
      return {
        title: "Order Pending",
        description: `${record.orderNumber} is pending kitchen confirmation.`,
        tone: "info",
      } satisfies StatusPopupState;
    }

    if (servedStatuses.has(normalizedStatus)) {
      return {
        title: "Order Served",
        description: `${record.orderNumber} has been served.`,
        tone: "success",
      } satisfies StatusPopupState;
    }

    if (readyStatuses.has(normalizedStatus)) {
      return {
        title: "Order Ready",
        description: `${record.orderNumber} is ready to serve.`,
        tone: "success",
      } satisfies StatusPopupState;
    }

    if (preparingStatuses.has(normalizedStatus)) {
      return {
        title: "Order Preparing",
        description: `${record.orderNumber} is now being prepared.`,
        tone: "info",
      } satisfies StatusPopupState;
    }

    if (confirmedStatuses.has(normalizedStatus)) {
      return {
        title: "Order Confirmed",
        description: `${record.orderNumber} is confirmed by kitchen.`,
        tone: "info",
      } satisfies StatusPopupState;
    }

    return null;
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
    const transitionPopups: StatusPopupState[] = [];

    for (const record of records) {
      const currentStatus = record.status.trim().toUpperCase();
      const previous = previousSnapshot[record.orderId];
      if (!previous) {
        const popup = buildKitchenStatusPopup(record, currentStatus);
        const hasExistingPopupKey = hasSeenKitchenStatusAlert(record.orderId, currentStatus);
        const isCurrentJourneyOrder =
          record.orderId === activeOrderContextRef.current?.id ||
          record.orderId === orderPlacedId ||
          !isOrderClosed(record.status, record.paymentStatus);

        // When snapshot is missing (newly observed order), still emit one safe
        // status toast for the active/current-order journey.
        if (popup && !hasExistingPopupKey && isCurrentJourneyOrder) {
          transitionPopups.push(popup);
          markKitchenStatusAlertSeen(record.orderId, currentStatus);
          continue;
        }

        // Seed dedupe keys for non-eligible first-seen rows to avoid replay spam.
        markKitchenStatusAlertSeen(record.orderId, currentStatus);
        continue;
      }

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

      if (previousStatus !== currentStatus) {
        const popup = buildKitchenStatusPopup(record, currentStatus);
        if (popup && !hasSeenKitchenStatusAlert(record.orderId, currentStatus)) {
          transitionPopups.push(popup);
          markKitchenStatusAlertSeen(record.orderId, currentStatus);
        }
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

    if (transitionPopups.length > 0) {
      const servedPopup = transitionPopups.find((entry) => entry.title === "Order Served");
      const readyPopup = transitionPopups.find((entry) => entry.title === "Order Ready");
      const preparingPopup = transitionPopups.find((entry) => entry.title === "Order Preparing");
      const confirmedPopup = transitionPopups.find((entry) => entry.title === "Order Confirmed");
      const pendingPopup = transitionPopups.find((entry) => entry.title === "Order Pending");
      showStatusPopup(
        servedPopup ?? readyPopup ?? preparingPopup ?? confirmedPopup ?? pendingPopup ?? transitionPopups[0],
      );
      return;
    }
  }

  function applyBackendOrders(backendRecords: TableOrderRecord[]) {
    if (backendRecords.length === 0) {
      return "none" as const;
    }

    const activeBillId = tableSession?.billId || "";
    const activeSessionId = tableSession?.sessionId || "";
    const ownedOrderIds = ownedOrderIdsRef.current;
    const scopedBackendRecords = backendRecords.filter((record) => {
      if (activeBillId && activeSessionId) {
        return isOrderForSessionBill(record, activeBillId, activeSessionId);
      }
      return ownedOrderIds.has(record.orderId);
    });

    const mergedRecords = mergeTableOrderRecords(tableOrdersRef.current, scopedBackendRecords);
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
      if (mergedRecords.length > 0) {
        resetCustomerSessionAfterClose();
        return "closed" as const;
      }
      syncOrderSnapshot([]);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(activeBillStorageKey);
        window.localStorage.removeItem(activeSessionStorageKey);
        window.sessionStorage.removeItem(activeBillStorageKey);
        window.sessionStorage.removeItem(activeSessionStorageKey);
      }
      return "applied" as const;
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

    if (!tableInfo) {
      setBillActionOrderId("");
      setBillSyncMessage("Table context is not ready. Please refresh and retry.");
      return false;
    }

    try {
      await updateDocumentWithFallback(
        appwriteConfig.collections.orders,
        order.orderId,
        payloadCandidates,
        {
          scope: {
            clientId: tableInfo.clientId || routeClient,
            tableId: tableInfo.id,
          },
        },
      );

      setTableOrders((current) =>
        current.map((entry) => (entry.orderId === order.orderId ? localUpdater(entry) : entry)),
      );
      setBillSyncMessage(successMessage);
      return true;
    } catch (error) {
      devError(error);
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
        fetchTableOrderRecords(
          tableInfo.clientId || routeClient,
          tableInfo.id,
          tableSession?.billId,
          tableSession?.sessionId,
        ),
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
      devError(error);
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

  async function requestCloseBill() {
    if (!tableSession?.documentId || !tableInfo) {
      setBillSyncMessage("Table session is not ready. Please refresh and retry.");
      return;
    }

    if (unpaidOrders.length === 0) {
      setBillSyncMessage("No unpaid bill is available to close yet.");
      return;
    }

    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm("Request final bill for this table?");
    if (!confirmed) {
      return;
    }

    const nowIso = new Date().toISOString();
    setBillActionOrderId("__close_bill__");
    setBillSyncMessage("");

    try {
      await updateDocumentWithFallback(
        appwriteConfig.collections.tableSessions,
        tableSession.documentId,
        [
          {
            status: "payment_pending",
            close_requested_at: nowIso,
          },
        ],
        {
          scope: {
            clientId: tableInfo.clientId || routeClient,
            tableId: tableInfo.id,
            lockedBy: tableSession.lockedBy || customerBrowserId,
          },
        },
      );
      setTableSession((current) =>
        current
          ? {
              ...current,
              status: "payment_pending",
              heartbeatAt: nowIso,
            }
          : current,
      );
      touchBillActivity(nowIso);
      setBillSyncMessage("Close bill requested. Staff will prepare payment.");
    } catch (error) {
      devError(error);
      setBillSyncMessage("Unable to request close bill right now. Please retry.");
    } finally {
      setBillActionOrderId("");
    }
  }

  async function ensureTableSessionForOrder() {
    if (sessionBlocked) {
      console.log("SESSION BLOCKED: Table locked on another device");
      setErrorMessage(TABLE_SESSION_LOCKED_MESSAGE);
      return null;
    }

    if (tableSession?.sessionId && tableSession.billId) {
      if (isTableSessionOrderLocked(tableSession)) {
        console.log("SESSION BLOCKED: Current session is payment_pending or closing_requested");
        setErrorMessage(TABLE_SESSION_PAYMENT_PENDING_MESSAGE);
        return null;
      }

      if (isTableSessionClosedOrPaid(tableSession)) {
        console.log("SESSION: Closed/paid session detected - will create fresh session");
        // A closed/paid session must not be reused for a new order.
      } else if (tableSession.status.trim().toLowerCase() === "active") {
        console.log("SESSION: Reusing active session");
        return tableSession;
      }
    }

    if (!tableInfo?.id) {
      console.error("SESSION ERROR: Table mapping missing");
      setTableSessionState("error");
      setErrorMessage("Table session could not start because table mapping is missing.");
      return null;
    }

    const resolvedBrowserId =
      customerBrowserId || (typeof window !== "undefined" ? ensureBrowserCustomerId() : "");
    if (!customerBrowserId && resolvedBrowserId) {
      setCustomerBrowserId(resolvedBrowserId);
    }

    setTableSessionState("checking");
    console.log("SESSION: Creating/recovering session for browser...");
    try {
      const recoveredSession = await withTimeout(
        resolveTableSessionForBrowser(
          tableInfo.clientId || routeClient,
          tableInfo,
          resolvedBrowserId,
        ),
        REQUEST_TIMEOUT_MS,
        "Table session recovery",
      );
      setTableSession(recoveredSession);
      setTableSessionState("ready");
      console.log("SESSION RECOVERED", {
        sessionId: recoveredSession.sessionId,
        status: recoveredSession.status,
      });
      if (isTableSessionOrderLocked(recoveredSession)) {
        console.log("SESSION BLOCKED: Recovered session is locked");
        setErrorMessage(TABLE_SESSION_PAYMENT_PENDING_MESSAGE);
        return null;
      }
      if (
        errorMessage ===
        "Unable to initialize table session right now. You can browse the menu; ordering will retry before submit."
      ) {
        setErrorMessage("");
      }
      return recoveredSession;
    } catch (error) {
      const message = getErrorMessage(error);
      if (message === TABLE_SESSION_LOCKED_MESSAGE) {
        console.log("SESSION ERROR: Locked", { message });
        setTableSessionState("blocked");
        setErrorMessage(TABLE_SESSION_LOCKED_MESSAGE);
      } else {
        console.error("SESSION ERROR", { message, error });
        devError(error);
        setTableSessionState("error");
        setErrorMessage("Unable to initialize table session. Please refresh the QR and try again.");
      }
      return null;
    }
  }

  function openBillDrawer() {
    touchBillActivity();
    setCartOpen(false);
    setBillOpen(true);
    setBillSyncMessage("");
  }

  async function openCartPage() {
    touchBillActivity();
    setBillOpen(false);
    await refreshClientSettings();
    if (isStandaloneCartRoute) {
      setCartOpen(true);
      return;
    }
    setCartOpen(true);
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

  function navigateToMenuAfterOrder() {
    if (isStandaloneCartRoute) {
      window.setTimeout(() => {
        router.replace(tableRoutePath);
      }, 650);
      return;
    }

    window.setTimeout(() => {
      setCartOpen(false);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 650);
  }

  async function handlePlaceOrder(options?: { redirectToMenuAfterSuccess?: boolean }) {
    if (sessionBlocked) {
      setErrorMessage(TABLE_SESSION_LOCKED_MESSAGE);
      return;
    }

    if (sessionOrderLocked) {
      setErrorMessage(TABLE_SESSION_PAYMENT_PENDING_MESSAGE);
      return;
    }

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

    const latestSettings = await refreshClientSettings();
    const latestTaxConfig = resolveClientTaxConfig(latestSettings);

    const activeOrderSession = await ensureTableSessionForOrder();
    console.log("PLACE_ORDER_SESSION_CHECK", {
      sessionId: activeOrderSession?.sessionId,
      billId: activeOrderSession?.billId,
      sessionStatus: activeOrderSession?.status,
    });
    if (!activeOrderSession?.sessionId || !activeOrderSession.billId) {
      setPlacingOrder(false);
      placeOrderLockRef.current = false;
      return;
    }

    const nowIso = new Date().toISOString();
    const clientId = tableInfo.clientId || routeClient;
    const orderNumber = generateOrderNumber(clientId, tableInfo.tableNo);
    const currentBillOrders = tableOrdersRef.current.filter((order) =>
      isOrderForSessionBill(order, activeOrderSession.billId, activeOrderSession.sessionId),
    );
    const orderRound = currentBillOrders.length + 1;
    const isAddMore = orderRound > 1;
    const browserIdForOrder =
      customerBrowserId || (typeof window !== "undefined" ? ensureBrowserCustomerId() : "");
    if (!customerBrowserId && browserIdForOrder) {
      setCustomerBrowserId(browserIdForOrder);
    }
    const trimmedInstructions = sanitizeInstructionText(kitchenInstructions);
    const compactItems = cartItems.map((cartItem) => ({
      ...(() => {
        const selectedBaseModifiers =
          resolvedSelectedModifiersByItem[cartItem.item.id] ?? [];
        const selectedAddons = resolvedSelectedAddonsByItem[cartItem.item.id] ?? [];
        const selectedModifiers = mergeCustomizations(
          selectedBaseModifiers,
          selectedAddons,
        );
        const modifierTotalPerUnit = getSelectedModifierTotal(selectedModifiers);
        const addonsTotalPerUnit = getSelectedAddonTotal(selectedAddons);
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
          selected_addons: selectedAddons.map((addon) => ({
            group_id: addon.groupId,
            group_name: sanitizeUserText(addon.groupName, 80),
            option_id: addon.optionId,
            option_name: sanitizeUserText(addon.optionName, 80),
            price: toAmount(addon.price),
          })),
          addons_total_per_unit: addonsTotalPerUnit,
          line_total: unitPrice * cartItem.quantity,
        };
      })(),
    }));
    const orderItemsSnapshot = JSON.stringify(compactItems);
    const computedSubtotal = Math.round(
      compactItems.reduce((sum, entry) => sum + toAmount(entry.line_total), 0) * 100,
    ) / 100;
    const computedTaxAmount = latestTaxConfig.gstEnabled
      ? Math.round((computedSubtotal * latestTaxConfig.taxPercentage) / 100 * 100) / 100
      : 0;
    const computedCgstAmount = latestTaxConfig.gstEnabled
      ? Math.round((computedSubtotal * latestTaxConfig.cgstPercentage) / 100 * 100) / 100
      : 0;
    const computedSgstAmount = latestTaxConfig.gstEnabled
      ? Math.round((computedSubtotal * latestTaxConfig.sgstPercentage) / 100 * 100) / 100
      : 0;
    const computedTotal = roundCurrency(computedSubtotal + computedTaxAmount);
    const computedOfferDiscount = roundCurrency(
      Math.min(computedTotal, Math.max(0, totalDiscountAmount)),
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
      session_id: activeOrderSession.sessionId,
      bill_id: activeOrderSession.billId,
      table_number: tableInfo.tableNo || tableLabel,
      order_round: orderRound,
      is_add_more: isAddMore,
      kot_status: "pending",
      status: "PLACED",
      payment_status: "UNPAID",
      subtotal: computedSubtotal,
      tax_amount: computedTaxAmount,
      cgst_amount: computedCgstAmount,
      sgst_amount: computedSgstAmount,
      total_amount: computedPayableTotal,
    };
    const orderDiscountPayload =
      computedOfferDiscount > 0 ? { discount_amount: computedOfferDiscount } : {};
    const orderPayloadCandidates: Record<string, unknown>[] = [
      {
        ...orderBasePayload,
        ...orderDiscountPayload,
        payment_method: paymentMethod,
        created_at_custom: nowIso,
        items_json: orderItemsSnapshot,
        kitchen_instructions: trimmedInstructions,
      },
      {
        ...orderBasePayload,
        ...orderDiscountPayload,
        payment_method: paymentMethod,
        created_at_custom: nowIso,
        order_items: orderItemsSnapshot,
        kitchen_instructions: trimmedInstructions,
      },
      {
        ...orderBasePayload,
        ...orderDiscountPayload,
        payment_method: paymentMethod,
        created_at_custom: nowIso,
        items_json: orderItemsSnapshot,
        notes: trimmedInstructions,
      },
      {
        ...orderBasePayload,
        ...orderDiscountPayload,
        payment_method: paymentMethod,
        created_at_custom: nowIso,
        order_items: orderItemsSnapshot,
        notes: trimmedInstructions,
      },
      {
        ...orderBasePayload,
        ...orderDiscountPayload,
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
      const tableNumberForPrint = tableInfo.tableNo || tableLabel;
      const kotLabel =
        orderRound > 1 || isAddMore
          ? `RUNNING ORDER TABLE ${tableNumberForPrint}`
          : `NEW ORDER TABLE ${tableNumberForPrint}`;
      const printJobPayload = {
        client_id: clientId,
        table_id: tableInfo.id,
        table_number: tableNumberForPrint,
        session_id: activeOrderSession.sessionId,
        bill_id: activeOrderSession.billId,
        order_id: createdOrder.$id,
        job_type: "KOT",
        label: kotLabel,
        items_json: orderItemsSnapshot,
        total_amount: computedPayableTotal,
        status: "pending",
        printer_type: "KITCHEN",
        created_at_custom: nowIso,
      } satisfies Record<string, unknown>;

      try {
        await createDocumentWithFallback(appwriteConfig.collections.printJobs, [
          printJobPayload,
        ]);
      } catch (printJobError) {
        devWarn("KOT print job could not be created, but order was placed.", printJobError);
        setNoticeMessage("KOT print job could not be created, but order was placed.");
      }

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
          devError(paymentError);
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
      trackOwnedOrderId(createdOrder.$id, browserIdForOrder);
      const placedOrderRecord = buildTableOrderRecordFromCart(
        createdOrder.$id,
        orderNumber,
        activeOrderSession.sessionId,
        activeOrderSession.billId,
        orderRound,
        tableInfo.tableNo,
        paymentMethod,
        computedSubtotal,
        computedTaxAmount,
        computedCgstAmount,
        computedSgstAmount,
        computedPayableTotal,
        nowIso,
        cartItems,
        resolvedSelectedModifiersByItem,
        resolvedSelectedAddonsByItem,
        trimmedInstructions,
      );
      const mergedLocalOrders = mergeTableOrderRecords(currentBillOrders, [placedOrderRecord]);
      const nextSessionTotal = roundCurrency(sumTableOrderPayableAmount(mergedLocalOrders));
      setTableOrders(mergedLocalOrders);
      tableOrdersRef.current = mergedLocalOrders;
      setTableSession((current) =>
        current
          ? {
              ...current,
              heartbeatAt: nowIso,
              totalAmount: nextSessionTotal,
            }
          : current,
      );
      void updateDocumentWithFallback(
        appwriteConfig.collections.tableSessions,
        activeOrderSession.documentId,
        [
          {
            heartbeat_at: nowIso,
            total_amount: nextSessionTotal,
          },
        ],
        {
          scope: {
            clientId,
            tableId: tableInfo.id,
            lockedBy: activeOrderSession.lockedBy || browserIdForOrder,
          },
        },
      ).catch((sessionUpdateError) => {
        devWarn("Table session total update failed:", sessionUpdateError);
      });
      persistOwnedOrderIds(
        mergedLocalOrders.map((record) => record.orderId),
        browserIdForOrder,
      );
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
      setSelectedAddonsByItem({});
      setKitchenInstructions("");
      setCartOpen(false);

      if (options?.redirectToMenuAfterSuccess) {
        setNoticeMessage("Order placed successfully.");
        navigateToMenuAfterOrder();
      }
    } catch (orderError) {
      devError(orderError);
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

    touchBillActivity();
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
  const headerLogoSrc = logoUrl || "/logo/cafe-luxe-logo.png";
  const tagline = clientSettings.tagline || branding?.tagline || "";
  const supportPhone = clientSettings.supportPhone;
  const supportPhoneDialValue = supportPhone.replace(/[^0-9+]/g, "");
  const supportPhoneHref = supportPhoneDialValue ? `tel:${supportPhoneDialValue}` : "";
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
          amount: finalTotal,
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
    ? `linear-gradient(180deg, ${PALETTE_BACKGROUND} 0%, ${PALETTE_BACKGROUND} 56%, ${PALETTE_SURFACE} 100%)`
    : `linear-gradient(180deg, ${PALETTE_TEXT} 0%, ${PALETTE_SECONDARY} 36%, ${PALETTE_TEXT} 100%)`;
  const panelGradient = isLightTheme
    ? `linear-gradient(165deg, rgba(232,217,197,0.98) 0%, ${PALETTE_SURFACE} 64%, rgba(232,217,197,0.18) 100%)`
    : `linear-gradient(165deg, ${PALETTE_SECONDARY} 0%, ${PALETTE_TEXT} 100%)`;
  const sectionGradient = isLightTheme
    ? `linear-gradient(160deg, rgba(232,217,197,0.98) 0%, ${PALETTE_SURFACE} 68%, rgba(232,217,197,0.16) 100%)`
    : `linear-gradient(160deg, ${PALETTE_SECONDARY} 0%, ${PALETTE_TEXT} 100%)`;
  const sheetGradient = isLightTheme
    ? `linear-gradient(176deg, rgba(232,217,197,0.99) 0%, ${PALETTE_SURFACE} 68%, rgba(232,217,197,0.16) 100%)`
    : `linear-gradient(176deg, ${PALETTE_SECONDARY} 0%, ${PALETTE_TEXT} 100%)`;
  const bottomBarGradient = isLightTheme
    ? `linear-gradient(170deg, rgba(232,217,197,0.98) 0%, ${PALETTE_SURFACE} 68%, rgba(232,217,197,0.16) 100%)`
    : `linear-gradient(170deg, ${PALETTE_SECONDARY} 0%, ${PALETTE_TEXT} 100%)`;
  const overlayShade = isLightTheme ? "rgba(122,109,96,0.2)" : "rgba(0, 0, 0, 0.72)";
  const contentTextClass = isLightTheme ? "text-brand-dark" : "text-white";
  const secondaryTextClass = isLightTheme ? "text-brand-accent" : "text-zinc-300";
  const mutedTextClass = isLightTheme ? "text-zinc-500" : "text-zinc-400";
  const themeScopeClass = isLightTheme ? "cafe-theme-light" : "";
  const shouldShowCartPanel = cartOpen || isStandaloneCartRoute;
  const luxurySpring = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 300, damping: 32, mass: 0.82 };
  const gentleSpring = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 240, damping: 30, mass: 0.9 };
  const dockSpring = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 360, damping: 38, mass: 0.72 };
  const softEase = [0.22, 1, 0.36, 1] as const;
  const overlayTransition = prefersReducedMotion ? { duration: 0 } : { duration: 0.22, ease: softEase };
  const motionInitial = prefersReducedMotion ? false : { opacity: 0, y: 14, scale: 0.985 };
  const motionVisible = { opacity: 1, y: 0, scale: 1 };
  const motionTransition = luxurySpring;
  const pressMotion = prefersReducedMotion ? undefined : { scale: 0.985, y: 1 };
  const hoverLiftMotion = prefersReducedMotion ? undefined : { y: -2, scale: 1.01 };
  const addFeedbackPulse =
    recentlyAddedItemId && !prefersReducedMotion
      ? { scale: [1, 1.012, 1], y: [0, -1, 0] }
      : undefined;
  const cartContentVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 1 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.045,
        delayChildren: prefersReducedMotion ? 0 : 0.08,
      },
    },
  };
  const cartContentItemVariants = {
    hidden: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: gentleSpring },
  };

  useEffect(() => {
    if (!shouldShowCartPanel || isStandaloneCartRoute || typeof document === "undefined") {
      return;
    }

    const body = document.body;
    const documentElement = document.documentElement;
    const scrollY = window.scrollY;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyWidth = body.style.width;
    const previousBodyPaddingRight = body.style.paddingRight;
    const previousOverscrollBehavior = documentElement.style.overscrollBehavior;
    const scrollbarCompensation = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    if (scrollbarCompensation > 0) {
      body.style.paddingRight = `${scrollbarCompensation}px`;
    }
    documentElement.style.overscrollBehavior = "contain";

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.width = previousBodyWidth;
      body.style.paddingRight = previousBodyPaddingRight;
      documentElement.style.overscrollBehavior = previousOverscrollBehavior;
      window.scrollTo(0, scrollY);
    };
  }, [isStandaloneCartRoute, shouldShowCartPanel]);

  useEffect(() => {
    if (!cartOpen || isStandaloneCartRoute || typeof window === "undefined") {
      return;
    }

    function handleCartEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || addonPickerOpen || upiQrOpen) {
        return;
      }
      event.preventDefault();
      setCartOpen(false);
    }

    window.addEventListener("keydown", handleCartEscape);
    return () => window.removeEventListener("keydown", handleCartEscape);
  }, [addonPickerOpen, cartOpen, isStandaloneCartRoute, upiQrOpen]);

  useEffect(() => {
    return () => {
      if (addFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(addFeedbackTimeoutRef.current);
      }
    };
  }, []);

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
          <h1 className={clsx("mt-4 text-xl", WEBSITE_STYLE_CLASSES.text.panelHeading)}>Connection Problem</h1>
          <p className="mt-2 text-sm text-zinc-300">{errorMessage}</p>
          <button
            type="button"
            className={clsx(
              "mt-5 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-brand-dark transition",
              WEBSITE_STYLE_CLASSES.text.ctaLabel,
            )}
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
      className={clsx("cafeluxe-page-enter relative min-h-screen overflow-x-hidden", contentTextClass, themeScopeClass)}
      style={{ background: appBackground }}
    >
      {heroImageUrl ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 h-64 opacity-30"
          style={{
            backgroundImage: isLightTheme
              ? `linear-gradient(180deg, rgba(232,217,197,0.62) 0%, rgba(232,217,197,0.97) 92%), url(${heroImageUrl})`
              : `linear-gradient(180deg, rgba(122,109,96,0.2) 0%, rgba(24,22,20,0.94) 92%), url(${heroImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : null}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: isLightTheme
            ? "linear-gradient(140deg, rgba(232,217,197,0.14) 0%, rgba(232,217,197,0) 38%, rgba(122,109,96,0.08) 100%)"
            : "linear-gradient(140deg, rgba(232,217,197,0.08) 0%, rgba(232,217,197,0) 38%, rgba(122,109,96,0.24) 100%)",
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
      <div className="cafeluxe-menu-stage relative mx-auto flex w-full max-w-5xl flex-col px-4 pb-[16rem] pt-5 sm:px-6 sm:pb-[14rem] md:pb-[12.5rem]">
        <motion.header
          initial={motionInitial}
          animate={motionVisible}
          transition={motionTransition}
          className="cafeluxe-hero-enter cafe-luxe-header sticky top-3 z-20 mb-5 rounded-3xl border px-4 py-4 shadow-[0_32px_74px_-42px_rgba(0,0,0,0.98)] backdrop-blur-xl sm:px-5 sm:py-4.5"
          style={{
            background: panelGradient,
            borderColor: withAlpha(WARM_HIGHLIGHT, 0.22),
            boxShadow: `0 32px 74px -42px rgba(0,0,0,0.98), 0 0 0 1px ${accentInset} inset`,
            ...(isLightTheme
              ? {
                  boxShadow: `0 28px 66px -42px rgba(122,109,96,0.28), 0 0 0 1px ${withAlpha(LUXURY_GOLD, 0.2)} inset`,
                }
              : null),
          }}
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className={clsx("truncate text-[10px] font-semibold uppercase tracking-[0.22em] opacity-90", mutedTextClass)}>
                {"Welcome"}
              </p>
              <div className="mt-1.5 flex min-w-0 items-center gap-3.5 sm:gap-4">
                <div
                  className="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-2xl border text-xs font-bold sm:h-14 sm:w-14"
                  style={{
                    borderColor: withAlpha(LUXURY_GOLD, 0.52),
                    background: `linear-gradient(168deg, ${withAlpha(PALETTE_BACKGROUND, 0.96)} 0%, ${withAlpha(LUXURY_GOLD, 0.28)} 100%)`,
                    color: isLightTheme ? PALETTE_TEXT : PALETTE_BACKGROUND,
                    boxShadow: `0 16px 34px -18px ${withAlpha(LUXURY_GOLD, 0.45)}, inset 0 1px 0 ${withAlpha(PALETTE_BACKGROUND, 0.72)}`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={headerLogoSrc}
                    alt={restaurantName}
                    className="h-full w-full rounded-[12px] object-contain p-[4px]"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="min-w-0">
                  <h1
                    className={clsx(
                      WEBSITE_STYLE_CLASSES.text.brandWordmark,
                      "text-[1.95rem] leading-[0.98] tracking-[0.035em] sm:text-[2.02rem]",
                    )}
                    style={{ color: isLightTheme ? PALETTE_TEXT : PALETTE_BACKGROUND }}
                  >
                    Cafe Luxe
                  </h1>
                  <p className={clsx("mt-1.5 text-[10px] font-medium uppercase tracking-[0.24em] sm:text-[10.5px]", mutedTextClass)}>
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

          </div>
          <div
            className={clsx("mt-2.5 border-t pt-2", secondaryTextClass)}
            style={{ borderColor: withAlpha(isLightTheme ? PALETTE_ACCENT : SOFT_DARK_SURFACE, 0.24) }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 text-[13px]">
                {supportPhone ? (
                  <a
                    href={supportPhoneHref}
                    className="cafe-luxe-chip inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition"
                    style={{
                      borderColor: withAlpha(PALETTE_ACCENT, 0.34),
                      backgroundColor: withAlpha(PALETTE_BACKGROUND, 0.9),
                      color: isLightTheme ? PALETTE_TEXT : PALETTE_BACKGROUND,
                    }}
                    aria-label={`Call support ${supportPhone}`}
                  >
                    <span className="uppercase tracking-[0.14em] opacity-80">Call Support</span>
                  </a>
                ) : null}
              </div>
              <div
                className="shrink-0 rounded-2xl border px-3.5 py-2.5 text-right shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                style={{
                  borderColor: accentBorder,
                  background: isLightTheme
                    ? `linear-gradient(170deg, ${withAlpha(PALETTE_BACKGROUND, 0.95)} 0%, ${withAlpha(PALETTE_SURFACE, 0.86)} 100%)`
                    : withAlpha(ROYAL_NAVY, 0.56),
                }}
              >
                <p className={clsx("text-[10px] font-medium uppercase tracking-[0.17em]", mutedTextClass)}>Table</p>
                <p
                  className={clsx(WEBSITE_STYLE_CLASSES.text.sectionTitle, "text-[1.02rem]")}
                  style={{ color: isLightTheme ? PALETTE_TEXT : PALETTE_BACKGROUND }}
                >
                  {tableLabel}
                </p>
              </div>
            </div>
          </div>
        </motion.header>

        {errorMessage ? (
          <div
            className="cafe-luxe-alert mb-4 flex items-start gap-3 rounded-2xl border p-4"
            style={{
              borderColor: withAlpha(WARM_HIGHLIGHT, 0.28),
              backgroundColor: withAlpha(LUXURY_GOLD, isLightTheme ? 0.24 : 0.12),
              color: isLightTheme ? PALETTE_SECONDARY : WARM_HIGHLIGHT,
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
            className="cafe-luxe-alert mb-4 flex items-start gap-3 rounded-2xl border p-4"
            style={{
              borderColor: withAlpha(WARM_HIGHLIGHT, 0.28),
              backgroundColor: withAlpha(LUXURY_GOLD, isLightTheme ? 0.24 : 0.12),
              color: isLightTheme ? PALETTE_SECONDARY : WARM_HIGHLIGHT,
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
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={gentleSpring}
            className="cafe-luxe-alert mb-4 flex items-start gap-3 rounded-2xl border p-4"
            style={{
              borderColor: withAlpha(WARM_HIGHLIGHT, 0.34),
              backgroundColor: withAlpha(LUXURY_GOLD, isLightTheme ? 0.24 : 0.13),
              color: isLightTheme ? PALETTE_SECONDARY : WARM_HIGHLIGHT,
            }}
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className={clsx(WEBSITE_STYLE_CLASSES.text.sectionTitle, isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
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
          </motion.div>
        ) : null}

        {statusPopup ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={gentleSpring}
            className="cafe-luxe-alert mb-4 flex items-start gap-3 rounded-2xl border p-4 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.75)]"
            style={{
              borderColor:
                statusPopup.tone === "success"
                  ? withAlpha(PALETTE_ACCENT, 0.36)
                  : withAlpha(WARM_HIGHLIGHT, 0.34),
              backgroundColor:
                statusPopup.tone === "success"
                  ? withAlpha(PALETTE_ACCENT, isLightTheme ? 0.14 : 0.18)
                  : withAlpha(LUXURY_GOLD, isLightTheme ? 0.16 : 0.14),
              color: statusPopup.tone === "success" ? PALETTE_ACCENT : WARM_HIGHLIGHT,
            }}
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className={clsx(WEBSITE_STYLE_CLASSES.text.sectionTitle, isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
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
                  ? "text-brand-dark hover:bg-[#F8F5F0]/70"
                  : "text-zinc-100 hover:bg-zinc-800",
              )}
              style={{ borderColor: withAlpha(WARM_HIGHLIGHT, 0.3) }}
              onClick={() => setStatusPopup(null)}
            >
              Dismiss
            </button>
          </motion.div>
        ) : null}

        <motion.section
          initial={motionInitial}
          animate={motionVisible}
          transition={{ ...motionTransition, delay: prefersReducedMotion ? 0 : 0.08 }}
          className="cafeluxe-section-reveal cafe-luxe-card mb-4 rounded-2xl border p-4 shadow-[0_24px_64px_-38px_rgba(0,0,0,0.98)]"
          style={{
            borderColor: accentSubtle,
            background: sectionGradient,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className="flex items-center gap-2"
                style={{ color: isLightTheme ? PALETTE_SECONDARY : WARM_HIGHLIGHT }}
              >
                <Sparkles className="h-4 w-4" />
                <p className="cafe-luxe-section-title text-sm font-medium">{"Fresh Picks For Your Table"}</p>
              </div>
              <p className={clsx("mt-1 text-sm", secondaryTextClass)}>
                {"Browse the menu, add to cart, and place your order directly to the kitchen."}
              </p>
            </div>
            <div className="shrink-0 space-y-1 text-right">
              <p
                className={WEBSITE_STYLE_CLASSES.text.microLabel}
                style={{ color: isLightTheme ? PALETTE_SECONDARY : WARM_HIGHLIGHT }}
              >
                {normalizedCurrency}
              </p>
              <p className={clsx("text-xs", isLightTheme ? "text-brand-dark/70" : "text-zinc-300")}>
                GST: {gstEnabled ? `On (${taxPercentage}%)` : "Off"}
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={motionInitial}
          animate={motionVisible}
          transition={{ ...motionTransition, delay: prefersReducedMotion ? 0 : 0.14 }}
          className="cafeluxe-search-section mb-4"
        >
          <label
            htmlFor="menu-search"
            className={clsx("cafeluxe-search-label mb-2 block text-xs uppercase tracking-[0.16em]", mutedTextClass)}
          >
            {"Search Menu"}
          </label>
          <div
            className="cafeluxe-search-shell cafe-luxe-input-wrap flex items-center gap-2 rounded-2xl border px-3 py-2.5 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.92)]"
            style={{
              borderColor: withAlpha(WARM_HIGHLIGHT, 0.32),
              background: sectionGradient,
            }}
          >
            <Search className={clsx("cafeluxe-search-icon h-4 w-4", mutedTextClass)} />
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
        </motion.section>

        <motion.section
          initial={motionInitial}
          animate={motionVisible}
          transition={{ ...motionTransition, delay: prefersReducedMotion ? 0 : 0.18 }}
          className="cafeluxe-category-strip sticky top-[98px] z-10 mb-4 -mx-1 overflow-x-auto px-1"
        >
          <motion.div
            initial={prefersReducedMotion ? false : "hidden"}
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.045, delayChildren: 0.05 },
              },
            }}
            className="cafeluxe-category-rail cafe-luxe-card inline-flex min-w-full gap-2 rounded-2xl border p-1.5 shadow-[0_20px_48px_-34px_rgba(122,109,96,0.28)] backdrop-blur"
            style={{
              borderColor: withAlpha(WARM_HIGHLIGHT, 0.22),
              background: sectionGradient,
            }}
          >
            <motion.button
              type="button"
              layout
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0 },
              }}
              whileHover={hoverLiftMotion}
              whileTap={pressMotion}
              className={clsx(
                "cafeluxe-category-chip cafe-luxe-chip flex-none rounded-xl px-4 py-2 text-sm font-semibold transition active:translate-y-px",
                activeCategory === "all"
                  ? "cafeluxe-category-chip-active text-brand-dark shadow-[0_12px_30px_-18px_rgba(0,0,0,0.5)]"
                  : isLightTheme ? "text-brand-dark/70 hover:text-brand-dark" : "text-white/70 hover:text-white",
              )}
                  style={
                activeCategory === "all"
                  ? isLightTheme
                    ? {
                        background: `linear-gradient(180deg, ${PALETTE_BACKGROUND} 0%, ${PALETTE_SURFACE} 100%)`,
                        boxShadow: `0 10px 24px -16px ${withAlpha(PALETTE_TEXT, 0.3)}`,
                      }
                    : { backgroundColor: LUXURY_GOLD }
                  : {
                      backgroundColor: isLightTheme
                        ? withAlpha(PALETTE_BACKGROUND, 0.94)
                        : withAlpha(PALETTE_SECONDARY, 0.9),
                    }
              }
              onClick={() => setActiveCategory("all")}
            >
              {"All"}
            </motion.button>
            {categories.map((category) => (
              <motion.button
                key={category.id}
                type="button"
                layout
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0 },
                }}
                whileHover={hoverLiftMotion}
                whileTap={pressMotion}
                className={clsx(
                  "cafeluxe-category-chip cafe-luxe-chip flex-none rounded-xl px-4 py-2 text-sm font-semibold transition active:translate-y-px",
                  activeCategory === category.id
                    ? "cafeluxe-category-chip-active text-brand-dark shadow-[0_12px_30px_-18px_rgba(0,0,0,0.5)]"
                    : isLightTheme ? "text-brand-dark/70 hover:text-brand-dark" : "text-white/70 hover:text-white",
                )}
                style={
                  activeCategory === category.id
                    ? isLightTheme
                      ? {
                          background: `linear-gradient(180deg, ${PALETTE_BACKGROUND} 0%, ${PALETTE_SURFACE} 100%)`,
                          boxShadow: `0 10px 24px -16px ${withAlpha(PALETTE_TEXT, 0.3)}`,
                        }
                      : { backgroundColor: LUXURY_GOLD }
                    : {
                        backgroundColor: isLightTheme
                          ? withAlpha(PALETTE_BACKGROUND, 0.94)
                          : withAlpha(PALETTE_SECONDARY, 0.9),
                      }
                }
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </motion.button>
            ))}
          </motion.div>
        </motion.section>

        {offersToday.length > 0 ? (
          <section
            className="cafe-luxe-card mb-5 space-y-3 rounded-2xl border p-3.5 shadow-[0_24px_58px_-42px_rgba(0,0,0,0.34)]"
            style={{
              borderColor: withAlpha(PALETTE_PREMIUM, 0.8),
              background: `linear-gradient(155deg, ${withAlpha(PALETTE_PREMIUM, 0.7)} 0%, ${withAlpha(PALETTE_BASE, 0.9)} 48%, ${withAlpha(PALETTE_SUCCESS, 0.62)} 100%)`,
            }}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-xl border px-2.5 py-2 transition"
              style={{
                borderColor: withAlpha(PALETTE_ACCENT, 0.24),
                backgroundColor: withAlpha(PALETTE_BACKGROUND, 0.62),
              }}
              onClick={() => setIsOffersExpanded((current) => !current)}
              aria-expanded={isOffersExpanded}
              aria-controls="offers-panel"
            >
              <h2 className={clsx("cafe-luxe-section-title text-sm font-semibold uppercase tracking-[0.14em]", contentTextClass)}>
                {"Offers"}
              </h2>
              <div className="flex items-center gap-2">
                <span
                  className={clsx("rounded-full border px-2 py-0.5 text-[11px] font-semibold", mutedTextClass)}
                  style={{
                    borderColor: withAlpha(PALETTE_ACCENT, 0.45),
                    backgroundColor: withAlpha(PALETTE_ACCENT, 0.14),
                  }}
                >
                  {offersToday.length} live
                </span>
                <ChevronDown
                  className={clsx(
                    "h-4 w-4 transition-transform duration-300",
                    isOffersExpanded ? "rotate-180" : "rotate-0",
                    secondaryTextClass,
                  )}
                />
              </div>
            </button>
            <div
              id="offers-panel"
              className={clsx(
                "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out",
                isOffersExpanded ? "mt-3 max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
              )}
            >
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {offersToday.map((offer) => (
                  <article
                    key={offer.id}
                    className="cafe-luxe-card cafe-luxe-offer-card rounded-2xl border px-3.5 py-3.5 shadow-[0_20px_48px_-34px_rgba(122,109,96,0.24)]"
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
            </div>
          </section>
        ) : null}

        {visibleItems.length === 0 ? (
          <section
            className={clsx(
              "rounded-2xl border p-5 text-sm",
              secondaryTextClass,
              isLightTheme ? "border-[#C6A57B] bg-[#E8D9C5]" : "border-zinc-800/30 bg-[#F8F5F0]/10",
            )}
          >
            {menuItems.length === 0
              ? "No menu items are available right now. Please check with staff."
              : "No items match this search/category. Try another filter."}
          </section>
        ) : (
          <div className="cafeluxe-menu-listing space-y-6 sm:space-y-8">
            {menuSections.map((section, sectionIndex) => {
              const categoryTitle = section.category.name || "Menu";

              return (
                <motion.section
                  key={section.category.id}
                  initial={motionInitial}
                  whileInView={motionVisible}
                  viewport={{ once: true, amount: 0.18 }}
                  transition={{
                    ...motionTransition,
                    delay: prefersReducedMotion ? 0 : Math.min(sectionIndex * 0.05, 0.18),
                  }}
                  className="cafeluxe-menu-section-card cafe-luxe-category-coverflow space-y-3 overflow-hidden rounded-[1.75rem] border px-3 py-4 sm:px-4 sm:py-5"
                  style={{
                    borderColor: withAlpha(WARM_HIGHLIGHT, 0.18),
                    background: isLightTheme
                      ? `linear-gradient(135deg, ${withAlpha(PALETTE_SURFACE, 0.34)} 0%, ${withAlpha(PALETTE_BACKGROUND, 0.72)} 100%)`
                      : `linear-gradient(135deg, ${withAlpha(PALETTE_SURFACE, 0.08)} 0%, ${withAlpha(PALETTE_TEXT, 0.42)} 100%)`,
                    boxShadow: `0 26px 58px -46px rgba(0,0,0,0.78), 0 0 0 1px ${withAlpha(WARM_HIGHLIGHT, 0.08)} inset`,
                  }}
                >
                  <div className="flex items-end justify-between gap-3 px-1">
                    <div className="min-w-0">
                      <p className={clsx("text-[11px] font-semibold uppercase tracking-[0.16em]", mutedTextClass)}>
                        Category
                      </p>
                      <h2 className={clsx("truncate text-xl font-semibold sm:text-2xl", contentTextClass)}>
                        {categoryTitle}
                      </h2>
                    </div>
                    <span
                      className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        borderColor: withAlpha(WARM_HIGHLIGHT, 0.28),
                        backgroundColor: withAlpha(WARM_HIGHLIGHT, isLightTheme ? 0.14 : 0.1),
                        color: isLightTheme ? PALETTE_TEXT : PALETTE_SURFACE,
                      }}
                    >
                      {section.items.length} item{section.items.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="cafeluxe-coverflow-shell">
                    <div className="native-menu-coverflow">
                       {section.items.map((item, index) => {
                         const quantity = cart[item.id] ?? 0;
                         const parsedImageSrc = item.image.trim();
                         const hasImage = parsedImageSrc.length > 0;
                         const selectedModifiers = resolvedSelectedModifiersByItem[item.id] ?? [];
                         const selectedAddons = resolvedSelectedAddonsByItem[item.id] ?? [];
                         const modifierTotal = getSelectedModifierTotal(selectedModifiers);
                         const addonTotal = getSelectedAddonTotal(selectedAddons);
                         const displayPrice = item.price + modifierTotal + addonTotal;
                         const itemModifierOptions = modifierOptionsByItem[item.id] ?? [];
                         const itemAddonGroups = itemAddonGroupsByItem[item.id] ?? [];
                         const hasMappedAddons = itemAddonGroups.length > 0;
                         const previewQuantity = Math.max(1, quantity);
                         const previewLineTotal = displayPrice * previewQuantity;
                         const itemOfferPreview = pickBestItemWiseOfferForLine(
                           {
                             itemId: item.id,
                             name: item.name,
                             quantity: previewQuantity,
                             unitPrice: displayPrice,
                             lineTotal: previewLineTotal,
                             categoryRefs: item.categoryRefs,
                           },
                           autoPromotions,
                           Math.max(subtotal, previewLineTotal),
                         );
                         const handleCardAdd = () => {
                           console.log("CARD_CLICK", {
                             categoryName: section.category.name,
                             index,
                             itemId: item.id,
                             itemName: item.name
                           });
                           void addToCart(item);
                         };



                        return (
                <article
                  key={item.id}
                  data-menu-item-id={item.id}
                  role="button"
                  tabIndex={item.isAvailable ? 0 : -1}
                  aria-disabled={!item.isAvailable}
                  aria-label={item.isAvailable ? `Add ${item.name}` : `${item.name} is out of stock`}
                  className={clsx(
                    "cafeluxe-menu-glass-card cafe-luxe-product-card group flex h-full flex-col overflow-hidden rounded-[1.35rem] border shadow-[0_26px_60px_-44px_rgba(0,0,0,0.98)] outline-none transition duration-300 focus-visible:ring-2",
                    item.isAvailable ? "cursor-pointer" : "cursor-not-allowed",
                    !item.isAvailable && quantity === 0 ? "opacity-75" : "",
                  )}
                  style={{
                    borderColor: withAlpha(WARM_HIGHLIGHT, item.isAvailable ? 0.38 : 0.18),
                    background: isLightTheme
                      ? `linear-gradient(158deg, ${withAlpha(PALETTE_SURFACE, 0.52)} 0%, ${withAlpha(PALETTE_BACKGROUND, 0.42)} 58%, ${withAlpha(PALETTE_ACCENT, 0.16)} 100%)`
                      : `linear-gradient(158deg, ${withAlpha(PALETTE_SURFACE, 0.1)} 0%, ${withAlpha(SOFT_DARK_SURFACE, 0.5)} 58%, ${withAlpha(PALETTE_ACCENT, 0.12)} 100%)`,
                    boxShadow: `0 16px 34px -28px rgba(0,0,0,0.68), 0 30px 66px -52px rgba(0,0,0,0.9), 0 0 0 1px ${withAlpha(WARM_HIGHLIGHT, 0.16)} inset, inset 0 1px 0 rgba(255,255,255,0.32), inset 0 -16px 36px -34px ${withAlpha(WARM_HIGHLIGHT, 0.34)}`,
                    backdropFilter: "blur(12px) saturate(1.08)",
                    WebkitBackdropFilter: "blur(12px) saturate(1.08)",
                    ["--tw-ring-color" as string]: withAlpha(WARM_HIGHLIGHT, 0.45),
                  }}
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest("[data-menu-card-control]")) {
                      return;
                    }
                    handleCardAdd();
                  }}
                  onKeyDown={(event) => {
                    if ((event.target as HTMLElement).closest("[data-menu-card-control]")) {
                      return;
                    }
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleCardAdd();
                    }
                  }}
                >
                  <div
                    className="cafeluxe-menu-card-image relative aspect-[4/3] overflow-hidden"
                    style={{
                      background: isLightTheme
                        ? "linear-gradient(135deg, rgba(232,217,197,0.96) 0%, rgba(232,217,197,0.28) 100%)"
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
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]"
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
                          ? "linear-gradient(180deg, rgba(232,217,197,0.02) 0%, rgba(122,109,96,0.1) 100%)"
                          : "linear-gradient(180deg, rgba(122,109,96,0.04) 0%, rgba(17,24,39,0.34) 100%)",
                      }}
                    />
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-20"
                      style={{
                        background: `linear-gradient(180deg, ${withAlpha(WARM_HIGHLIGHT, 0.18)} 0%, rgba(0,0,0,0) 100%)`,
                      }}
                    />
                    <div className="absolute left-2 top-2 flex max-w-[72%] flex-wrap gap-1">
                      <span
                        className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{
                          borderColor: withAlpha(WARM_HIGHLIGHT, 0.4),
                          backgroundColor: withAlpha(isLightTheme ? PALETTE_BACKGROUND : PALETTE_TEXT, 0.72),
                          color: isLightTheme ? PALETTE_TEXT : PALETTE_SURFACE,
                        }}
                      >
                        {categoryTitle}
                      </span>
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
                    {quantity > 0 ? (
                      <motion.span
                        animate={
                          recentlyAddedItemId === item.id && !prefersReducedMotion
                            ? { scale: [1, 1.035, 1], opacity: [1, 0.96, 1] }
                            : undefined
                        }
                        transition={{ duration: prefersReducedMotion ? 0 : 0.42, ease: softEase }}
                        className="absolute right-2 top-2 rounded-full border px-2 py-1 text-[10px] font-semibold"
                        style={{
                          borderColor: withAlpha(WARM_HIGHLIGHT, 0.5),
                          backgroundColor: withAlpha(WARM_HIGHLIGHT, 0.88),
                          color: PALETTE_TEXT,
                        }}
                      >
                        {quantity} in cart
                      </motion.span>
                    ) : null}
                    {itemOfferPreview ? (
                      <span
                        className="absolute bottom-2 left-2 right-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold"
                        style={{
                          borderColor: withAlpha(WARM_HIGHLIGHT, 0.42),
                          backgroundColor: withAlpha(isLightTheme ? PALETTE_BACKGROUND : PALETTE_TEXT, 0.78),
                          color: isLightTheme ? PALETTE_TEXT : PALETTE_SURFACE,
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        <Sparkles className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {itemOfferPreview.offer.offerName || itemOfferPreview.offer.matchedReason || "Offer available"}
                        </span>
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-2.5 p-3">
                    <div>
                      <h3 className={clsx("line-clamp-1 text-sm font-semibold sm:text-base", contentTextClass)}>{item.name}</h3>
                      <p className={clsx("line-clamp-1 text-[11px] sm:text-sm", secondaryTextClass)}>{item.nameHi}</p>
                    </div>

                    {item.description ? (
                      <p className={clsx("line-clamp-2 min-h-8 text-[11px] sm:min-h-9 sm:text-xs", secondaryTextClass)}>{item.description}</p>
                    ) : (
                      <div className="min-h-8 sm:min-h-9" />
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p
                          className={clsx(WEBSITE_STYLE_CLASSES.text.sectionTitle, "sm:text-base")}
                          style={{ color: isLightTheme ? PALETTE_TEXT : PALETTE_SURFACE }}
                        >
                          {formatMoney(displayPrice)}
                        </p>
                        {selectedModifiers.length > 0 || selectedAddons.length > 0 ? (
                          <p className={clsx("text-[11px]", mutedTextClass)}>
                            +{selectedModifiers.length + selectedAddons.length} customization
                            {selectedModifiers.length + selectedAddons.length > 1 ? "s" : ""}
                          </p>
                        ) : null}
                      </div>

                      {!item.isAvailable && quantity === 0 ? (
                        <button
                          type="button"
                          data-menu-card-control
                          className={clsx(
                            "inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold sm:text-sm",
                            isLightTheme
                              ? "border-[#C6A57B] bg-[#C6A57B] text-brand-dark/60"
                              : "border-zinc-700 bg-zinc-900 text-zinc-400",
                          )}
                          disabled
                        >
                          Unavailable
                        </button>
                      ) : quantity === 0 ? (
                        <motion.button
                          type="button"
                          data-menu-card-control
                          whileTap={pressMotion}
                          className="cafe-luxe-cta inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold text-brand-dark shadow-[0_14px_34px_-20px_rgba(0,0,0,0.9)] transition active:translate-y-px sm:px-3.5 sm:py-2 sm:text-sm"
                          style={{
                            backgroundColor: LUXURY_GOLD,
                            borderColor: withAlpha(LUXURY_GOLD, 0.55),
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            void addToCart(item);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </motion.button>
                      ) : (
                        <motion.div
                          data-menu-card-control
                          animate={
                            recentlyAddedItemId === item.id && !prefersReducedMotion
                              ? { scale: [1, 1.025, 1] }
                              : undefined
                          }
                          transition={{ duration: prefersReducedMotion ? 0 : 0.38, ease: softEase }}
                          className={clsx(
                            "cafe-luxe-control inline-flex items-center rounded-xl border",
                            isLightTheme
                              ? "border-[#C6A57B] bg-[#F8F5F0]/85"
                              : "border-zinc-700 bg-zinc-950/20",
                          )}
                        >
                          <button
                            type="button"
                            data-menu-card-control
                            className={clsx(
                              "cafe-luxe-control p-1.5 transition sm:p-2",
                              contentTextClass,
                              isLightTheme ? "hover:bg-[#C6A57B]" : "hover:bg-zinc-800",
                            )}
                            onClick={(event) => {
                              event.stopPropagation();
                              updateItemQuantity(item.id, -1);
                            }}
                            aria-label={`Remove one ${item.name}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className={clsx("w-7 text-center text-xs font-semibold sm:w-8 sm:text-sm", contentTextClass)}>
                            {quantity}
                          </span>
                          <button
                            type="button"
                            data-menu-card-control
                            className={clsx(
                              "cafe-luxe-control p-1.5 transition sm:p-2",
                              contentTextClass,
                              isLightTheme ? "hover:bg-[#C6A57B]" : "hover:bg-zinc-800",
                            )}
                            onClick={(event) => {
                              event.stopPropagation();
                              updateItemQuantity(item.id, 1);
                              triggerAddFeedback(item.id);
                            }}
                            aria-label={`Add one ${item.name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </motion.div>
                      )}
                    </div>

                    {hasMappedAddons ? (
                      <div className="flex items-center justify-between gap-2">
                        <p className={clsx("text-[11px]", secondaryTextClass)}>
                          {selectedAddons.length > 0
                            ? `${selectedAddons.length} add-on selection${selectedAddons.length > 1 ? "s" : ""}`
                            : `${itemAddonGroups.length} add-on group${itemAddonGroups.length > 1 ? "s" : ""} available`}
                        </p>
                        <button
                          type="button"
                          data-menu-card-control
                          className={clsx(
                            "cafe-luxe-chip rounded-full border px-2 py-1 text-[11px] font-medium transition",
                            isLightTheme
                              ? "text-brand-dark/80 hover:bg-[#E8D9C5]"
                              : "text-zinc-200 hover:bg-zinc-800",
                          )}
                          style={{
                            borderColor: withAlpha(WARM_HIGHLIGHT, 0.25),
                            backgroundColor: isLightTheme
                              ? withAlpha(PALETTE_SURFACE, 0.95)
                              : withAlpha(SOFT_DARK_SURFACE, 0.7),
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (sessionBlocked) {
                              setErrorMessage(TABLE_SESSION_LOCKED_MESSAGE);
                              return;
                            }
                            openAddonPickerForItem(item, "edit");
                          }}
                        >
                          {selectedAddons.length > 0 ? "Edit Add-ons" : "Choose Add-ons"}
                        </button>
                      </div>
                    ) : null}

                    {!hasMappedAddons && itemModifierOptions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {itemModifierOptions.slice(0, 3).map((option) => {
                          const selected = selectedModifiers.some((entry) => entry.id === option.id);
                          return (
                            <button
                              key={`${item.id}_${option.id}`}
                              type="button"
                              data-menu-card-control
                      className={clsx(
                        "cafe-luxe-chip rounded-full border px-2 py-1 text-[11px] font-medium transition",
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
                                        ? withAlpha(PALETTE_SURFACE, 0.95)
                                        : withAlpha(SOFT_DARK_SURFACE, 0.7),
                                    }
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                if (sessionBlocked) {
                                  setErrorMessage(TABLE_SESSION_LOCKED_MESSAGE);
                                  return;
                                }
                                if (sessionInitFailed) {
                                  setErrorMessage("Unable to initialize table session. Please refresh the QR and try again.");
                                  return;
                                }
                                if (!item.isAvailable) {
                                  return;
                                }
                                if (quantity === 0) {
                                  updateItemQuantity(item.id, 1);
                                  triggerAddFeedback(item.id);
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
                    </div>
                  </div>
                </motion.section>
              );
            })}
          </div>
        )}
      </div>
      ) : null}

      {!isStandaloneCartRoute ? (
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...dockSpring, delay: prefersReducedMotion ? 0 : 0.24 }}
        className="cafeluxe-bottom-bar fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6"
      >
        <div
          className="cafeluxe-floating-dock cafe-luxe-card-strong mx-auto w-full max-w-4xl rounded-2xl border p-2 shadow-[0_30px_80px_-44px_rgba(0,0,0,0.98)] backdrop-blur-xl"
          style={{
            borderColor: withAlpha(WARM_HIGHLIGHT, 0.3),
            background: bottomBarGradient,
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <motion.button
              type="button"
              whileHover={hoverLiftMotion}
              whileTap={pressMotion}
              className="cafeluxe-dock-action cafeluxe-dock-bill cafe-luxe-cta flex items-center justify-between rounded-xl border px-4 py-3 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] transition active:translate-y-px"
              style={{
                borderColor: withAlpha(ROYAL_NAVY, 0.34),
                background: isLightTheme
                  ? "linear-gradient(180deg, ${PALETTE_BACKGROUND} 0%, ${PALETTE_SURFACE} 100%)"
                  : `linear-gradient(180deg, ${PALETTE_TEXT} 0%, ${PALETTE_SECONDARY} 100%)`,
                color: isLightTheme ? PALETTE_TEXT : undefined,
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
                  isLightTheme ? "bg-[#C6A57B] text-brand-dark" : "bg-black/20",
                )}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={`bill_total_${unpaidTotal.toFixed(2)}`}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
                    transition={gentleSpring}
                    className="block"
                  >
                    {formatMoney(unpaidTotal)}
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={hoverLiftMotion}
              whileTap={pressMotion}
              animate={addFeedbackPulse}
              transition={{ duration: prefersReducedMotion ? 0 : 0.42, ease: softEase }}
              className="cafeluxe-dock-action cafeluxe-dock-cart cafe-luxe-cta flex items-center justify-between rounded-xl border px-4 py-3 text-brand-dark shadow-[0_16px_36px_-24px_rgba(0,0,0,0.95)] transition disabled:cursor-not-allowed disabled:opacity-60 active:translate-y-px"
              style={{
                borderColor: withAlpha(LUXURY_GOLD, 0.42),
                background: `linear-gradient(180deg, ${WARM_HIGHLIGHT} 0%, ${LUXURY_GOLD} 100%)`,
              }}
              onClick={() => void openCartPage()}
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <ShoppingBag className="h-5 w-5" />
                {"Cart"} {cartCount > 0 ? `(${cartCount})` : ""}
              </span>
              <span className="rounded-lg bg-black/10 px-2 py-1 text-xs font-semibold">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={`cart_total_${finalTotal.toFixed(2)}`}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
                    transition={gentleSpring}
                    className="block"
                  >
                    {formatMoney(finalTotal)}
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.button>
          </div>
          <p className={clsx("mt-2 text-center text-[11px] font-medium tracking-[0.08em]", isLightTheme ? "text-brand-dark/72" : "text-zinc-400")}>
            Developed by TrustFirst Solutions
          </p>
        </div>
      </motion.div>
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
              "cafe-luxe-card-strong absolute inset-0 h-[100dvh] overflow-hidden rounded-none border-0 shadow-none md:bottom-4 md:left-auto md:right-4 md:top-4 md:h-auto md:w-[480px] md:max-h-[unset] md:rounded-3xl md:border md:shadow-[0_28px_80px_-38px_rgba(0,0,0,0.98)]",
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
                  isLightTheme ? "border-[#C6A57B]" : "border-zinc-800/90",
                )}
              >
                <h2 className={WEBSITE_STYLE_CLASSES.text.panelHeading}>{"My Bill"}</h2>
                <button
                  type="button"
                  className={clsx(
                    "rounded-lg border px-3 py-1 text-sm transition",
                    isLightTheme
                      ? "text-brand-dark hover:bg-[#F8F5F0]/70"
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
                    className="cafe-luxe-alert rounded-xl border p-3 text-xs"
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
                      "cafe-luxe-card space-y-3 rounded-xl border p-4 text-sm",
                      isLightTheme
                        ? "border-[#C6A57B] bg-[#E8D9C5] text-brand-dark/75"
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
                        "cafe-luxe-card rounded-xl border p-4",
                        isLightTheme ? "bg-[#E8D9C5]" : "bg-zinc-900/70",
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
                          "cafe-luxe-summary mt-4 space-y-3 rounded-xl border p-3.5 text-sm",
                          isLightTheme
                            ? "border-[#C6A57B] bg-[#F8F5F0]/80"
                            : "border-zinc-800 bg-zinc-950/60",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={clsx(isLightTheme ? "text-brand-dark/70" : "text-zinc-300")}>Original Subtotal</span>
                          <span className={clsx("font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
                            {formatMoney(currentBillSubtotal)}
                          </span>
                        </div>
                        {gstEnabled ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className={clsx(isLightTheme ? "text-brand-dark/70" : "text-zinc-300")}>
                                CGST ({cgstPercentage}%)
                              </span>
                              <span className={clsx("font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
                                {formatMoney(currentBillCgstAmount)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={clsx(isLightTheme ? "text-brand-dark/70" : "text-zinc-300")}>
                                SGST ({sgstPercentage}%)
                              </span>
                              <span className={clsx("font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
                                {formatMoney(currentBillSgstAmount)}
                              </span>
                            </div>
                          </>
                        ) : null}
                        {billOfferDiscountAmount > 0 ? (
                          <>
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
                            isLightTheme ? "border-[#C6A57B]" : "border-zinc-800",
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
                              "cafe-luxe-card rounded-lg border px-2 py-2 text-xs",
                              isLightTheme
                                ? "border-[#C6A57B] bg-[#E8D9C5] text-brand-dark/80"
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
                              "cafe-luxe-card rounded-lg border px-2.5 py-2 text-xs",
                              isLightTheme
                                ? "border-[#C6A57B] bg-[#E8D9C5] text-brand-dark/85"
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
                                  className="cafe-luxe-offer-card rounded-md border px-2 py-1.5"
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
                            "cafe-luxe-card mt-3 rounded-xl border p-3 text-sm",
                            isLightTheme
                              ? "border-[#C6A57B] bg-[#E8D9C5]"
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
                            className="cafe-luxe-cta mt-3 inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold text-zinc-950 transition active:translate-y-px"
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
                                ? "border-[#C6A57B] bg-[#F8F5F0] text-brand-dark hover:bg-[#E8D9C5]"
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
                                "cafe-luxe-chip rounded-lg border px-2 py-1 text-[11px] font-medium transition",
                                isLightTheme
                                  ? "border-[#C6A57B] bg-[#F8F5F0]/90 text-brand-dark hover:bg-[#E8D9C5]"
                                  : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                              )}
                              onClick={() => copyTextWithNotice(configuredUpiId, "UPI ID copied.")}
                            >
                              {"Copy UPI ID"}
                            </button>
                            <button
                              type="button"
                              className={clsx(
                                "cafe-luxe-chip rounded-lg border px-2 py-1 text-[11px] font-medium transition",
                                isLightTheme
                                  ? "border-[#C6A57B] bg-[#F8F5F0]/90 text-brand-dark hover:bg-[#E8D9C5]"
                                  : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                              )}
                              onClick={() =>
                                copyTextWithNotice(Number(billPayableTotal).toFixed(2), "Amount copied.")
                              }
                            >
                              {"Copy Amount"}
                            </button>
                          </div>
                          <div
                            className={clsx(
                              "mt-3 rounded-xl border p-3 text-xs",
                              isLightTheme
                                ? "border-[#C6A57B] bg-[#F8F5F0]/92 text-brand-dark/75"
                                : "border-zinc-800 bg-zinc-950/60 text-zinc-300",
                            )}
                          >
                            Complete the payment in your UPI app, then staff will verify it from the order dashboard.
                          </div>
                          {!canLaunchUpiDeepLink ? (
                            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2 text-[11px] text-zinc-400">
                              <p>
                                {"Open this page on your phone to pay with any UPI app."}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="cafe-luxe-chip rounded-lg border border-zinc-700 px-2 py-1 font-medium text-zinc-200 transition hover:bg-zinc-800"
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
                                  className="cafe-luxe-chip rounded-lg border border-zinc-700 px-2 py-1 font-medium text-zinc-200 transition hover:bg-zinc-800"
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
                                  className="cafe-luxe-chip rounded-lg border border-zinc-700 px-2 py-1 font-medium text-zinc-200 transition hover:bg-zinc-800"
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
                        {currentBillItems.map((lineItem) => {
                          const nonAddonModifiers = lineItem.modifiers.filter(
                            (modifier) => !modifier.id.startsWith("addon_"),
                          );
                          return (
                            <div
                              key={lineItem.lineKey}
                              className={clsx(
                                "cafe-luxe-card rounded-xl border p-3",
                                isLightTheme
                                  ? "border-[#C6A57B] bg-[#E8D9C5]"
                                  : "border-zinc-800/30 bg-[#F8F5F0]/10",
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
                                  {nonAddonModifiers.length > 0 ? (
                                    <p className={clsx("mt-1 line-clamp-2 text-[11px]", mutedTextClass)}>
                                      {nonAddonModifiers
                                        .map((modifier) =>
                                          modifier.price > 0
                                            ? `${modifier.label} (+${formatMoney(modifier.price)})`
                                            : modifier.label,
                                        )
                                        .join(", ")}
                                    </p>
                                  ) : null}
                                  {lineItem.selectedAddons.length > 0 ? (
                                    <div className="mt-1.5 space-y-1">
                                      <p className={clsx("text-[10px] uppercase tracking-[0.12em]", mutedTextClass)}>
                                        Saved Add-ons
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {lineItem.selectedAddons.map((addon) => (
                                          <span
                                            key={`${lineItem.lineKey}_addon_${addon.groupId}_${addon.optionId}`}
                                            className="inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium leading-none"
                                            style={{
                                              borderColor: withAlpha(WARM_HIGHLIGHT, 0.28),
                                              backgroundColor: withAlpha(WARM_HIGHLIGHT, isLightTheme ? 0.22 : 0.12),
                                              color: isLightTheme ? PALETTE_TEXT : PALETTE_SURFACE,
                                            }}
                                          >
                                            {addon.groupName}: {addon.optionName}
                                            {addon.price > 0 ? ` (+${formatMoney(addon.price)})` : ""}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                                <p
                                  className={WEBSITE_STYLE_CLASSES.text.sectionTitle}
                                  style={{ color: isLightTheme ? PALETTE_TEXT : PALETTE_SURFACE }}
                                >
                                  {formatMoney(lineItem.lineTotal)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    {unpaidOrders.length > 0 ? (
                      <section className="space-y-2">
                        <p className={clsx("text-xs uppercase tracking-[0.16em]", isLightTheme ? "text-brand-dark/65" : "text-zinc-400")}>
                          Unpaid Bills ({unpaidOrders.length})
                        </p>
                        <div
                          className={clsx(
                            "cafe-luxe-card rounded-xl border p-3",
                            isLightTheme
                              ? "border-[#C6A57B] bg-[#E8D9C5]"
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
                                    "cafe-luxe-chip inline-flex w-full items-center justify-center rounded-lg border px-2 py-2 text-xs font-medium transition disabled:opacity-60",
                                    isLightTheme
                                      ? "text-brand-dark hover:bg-[#F8F5F0]/70"
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
                                    "cafe-luxe-chip inline-flex w-full items-center justify-center rounded-lg border px-2 py-2 text-xs font-medium transition disabled:opacity-60",
                                    isLightTheme
                                      ? "text-brand-dark hover:bg-[#F8F5F0]/70"
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
                                    "cafe-luxe-card rounded-xl border p-3 transition",
                                    isLightTheme
                                      ? "border-[#C6A57B] bg-[#F8F5F0]/85"
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
                              "cafe-luxe-card rounded-xl border p-3",
                              isLightTheme
                                ? "border-[#C6A57B] bg-[#E8D9C5]"
                                : "border-zinc-800/30 bg-[#F8F5F0]/10",
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
                                <p
                                  className={WEBSITE_STYLE_CLASSES.text.sectionTitle}
                                  style={{ color: isLightTheme ? PALETTE_TEXT : PALETTE_SURFACE }}
                                >
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
                  isLightTheme ? "border-[#C6A57B]" : "border-zinc-800",
                )}
              >
                <button
                  type="button"
                  className="cafe-luxe-cta inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-brand-dark transition"
                  style={{
                    borderColor: withAlpha(ROYAL_NAVY, 0.4),
                    background: `linear-gradient(180deg, ${WARM_HIGHLIGHT} 0%, ${LUXURY_GOLD} 100%)`,
                  }}
                  onClick={backToMenuFromBill}
                >
                  <Plus className="h-4 w-4" />
                  {"Add More Items"}
                </button>

                {unpaidOrders.length > 0 ? (
                  <button
                    type="button"
                    className={clsx(
                      "cafe-luxe-chip inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                      isLightTheme
                        ? "border-[#C6A57B] bg-[#F8F5F0] text-brand-dark hover:bg-[#E8D9C5]"
                        : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
                    )}
                    onClick={requestCloseBill}
                    disabled={billActionOrderId.length > 0}
                  >
                    {billActionOrderId === "__close_bill__" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {"Requesting..."}
                      </>
                    ) : (
                      <>
                        <HandCoins className="h-4 w-4" />
                        {"Close Bill"}
                      </>
                    )}
                  </button>
                ) : null}

                <button
                  type="button"
                  className={clsx(
                    "cafe-luxe-chip inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                    isLightTheme
                      ? "border-[#C6A57B] bg-[#F8F5F0] text-brand-dark hover:bg-[#E8D9C5]"
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

      <AnimatePresence>
      {shouldShowCartPanel ? (
        <motion.div
          key="customer-cart-panel"
          initial={isStandaloneCartRoute || prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={overlayTransition}
          className={clsx(
            isStandaloneCartRoute
              ? "relative z-40 mx-auto w-full max-w-3xl px-4 pb-8 pt-4 sm:px-6"
              : "cafeluxe-cart-overlay fixed inset-0 z-40 overflow-hidden backdrop-blur-sm",
          )}
          style={
            isStandaloneCartRoute
              ? undefined
              : {
                  backgroundColor: overlayShade,
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

          <motion.aside
            initial={isStandaloneCartRoute || prefersReducedMotion ? false : { opacity: 0, y: 24, scale: 0.992 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={isStandaloneCartRoute || prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.992 }}
            transition={dockSpring}
            role="dialog"
            aria-modal={isStandaloneCartRoute ? undefined : true}
            aria-labelledby="cart-drawer-title"
            className={clsx(
              isStandaloneCartRoute
                ? "relative w-full min-h-[calc(100dvh-2rem)] overflow-visible rounded-3xl border shadow-[0_28px_80px_-38px_rgba(0,0,0,0.34)] sm:min-h-[calc(100dvh-2.5rem)]"
                : "cafeluxe-cart-drawer absolute inset-x-0 bottom-0 h-[90dvh] max-h-[calc(100dvh-0.75rem)] w-full overflow-hidden rounded-t-[1.75rem] border-x-0 border-b-0 shadow-[0_-22px_70px_-40px_rgba(0,0,0,0.98)] md:inset-y-4 md:left-auto md:right-4 md:h-[calc(100dvh-2rem)] md:w-[520px] md:max-h-[calc(100dvh-2rem)] md:rounded-3xl md:border md:shadow-[0_28px_80px_-38px_rgba(0,0,0,0.98)] lg:w-[540px]",
              isLightTheme ? "text-brand-dark" : "text-zinc-100",
            )}
            style={{
              borderColor: accentBorder,
              background: sheetGradient,
            }}
          >
            <motion.div
              variants={cartContentVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              className={clsx("flex min-h-0 flex-col", isStandaloneCartRoute ? "h-auto" : "h-full")}
            >
              <motion.div
                variants={cartContentItemVariants}
                className={clsx(
                  "cafeluxe-cart-header shrink-0 border-b px-4 pb-4 pt-[calc(env(safe-area-inset-top)+12px)] sm:px-5 md:rounded-t-3xl md:pt-5",
                  isLightTheme ? "border-[#C6A57B]" : "border-zinc-800/90",
                )}
                style={{
                  background: isLightTheme
                    ? "linear-gradient(180deg, rgba(232,217,197,0.97) 0%, rgba(122,109,96,0.9) 100%)"
                    : withAlpha(SOFT_DARK_SURFACE, 0.9),
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={clsx("text-[10px] font-semibold uppercase tracking-[0.16em]", isLightTheme ? "text-brand-dark/62" : "text-zinc-400")}>
                      CafeLuxe Checkout
                    </p>
                    <h2 id="cart-drawer-title" className="mt-1 text-xl font-semibold leading-tight">{"Your Cart"}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={clsx(
                          "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                          isLightTheme ? "border-[#C6A57B] bg-[#F8F5F0]/80 text-brand-dark/82" : "border-zinc-700 bg-zinc-900/55 text-zinc-300",
                        )}
                      >
                        {tableInfo?.tableNo ? `Table ${tableInfo.tableNo}` : tableLabel}
                      </span>
                      <span
                        className={clsx(
                          "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                          isLightTheme ? "border-[#C6A57B] bg-[#F8F5F0]/80 text-brand-dark/82" : "border-zinc-700 bg-zinc-900/55 text-zinc-300",
                        )}
                      >
                        {cartCount} item{cartCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      className={clsx(
                        "inline-flex h-9 items-center gap-1 rounded-xl border px-2.5 text-[11px] font-medium transition disabled:opacity-50",
                        isLightTheme
                          ? "text-brand-dark hover:bg-[#F8F5F0]/70"
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
                        "inline-flex h-9 w-9 items-center justify-center rounded-xl border text-[11px] font-medium transition",
                        isLightTheme
                          ? "text-brand-dark hover:bg-[#F8F5F0]/70"
                          : "text-zinc-300 hover:bg-zinc-800",
                      )}
                      style={{ borderColor: withAlpha(WARM_HIGHLIGHT, 0.25) }}
                      onClick={closeCartView}
                      aria-label={isStandaloneCartRoute ? "Back to menu" : "Close cart"}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={cartContentItemVariants}
                className={clsx(
                  isStandaloneCartRoute
                    ? "cafeluxe-cart-body px-4 py-4 sm:px-5 md:px-5"
                    : "cafeluxe-cart-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 md:px-5",
                )}
              >
                {cartItems.length === 0 ? (
                  <div
                    className={clsx(
                      "cafe-luxe-card space-y-3 rounded-2xl border p-4 text-sm",
                      isLightTheme
                        ? "border-[#C6A57B] bg-[#E8D9C5] text-brand-dark/75"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-300",
                    )}
                  >
                    <p>{"Your cart is empty."}</p>
                    <button
                      type="button"
                      className={clsx(
                        "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition",
                        isLightTheme
                          ? "text-brand-dark hover:bg-[#F8F5F0]/70"
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
                      const matchedCartOffer = matchedItemOffers.find((entry) => entry.itemId === item.id) ?? null;
                      const selected = resolvedSelectedModifiersByItem[item.id] ?? [];
                      const selectedAddons = resolvedSelectedAddonsByItem[item.id] ?? [];
                      const visibleBaseModifiers = selected.filter(
                        (modifier) => !modifier.id.startsWith("addon_"),
                      );
                      const groupedAddons = selectedAddons.reduce(
                        (groups, addon) => {
                          const existing = groups.find((entry) => entry.groupId === addon.groupId);
                          if (existing) {
                            existing.options.push(addon);
                            existing.total += toAmount(addon.price);
                            return groups;
                          }
                          groups.push({
                            groupId: addon.groupId,
                            groupName: addon.groupName,
                            options: [addon],
                            total: toAmount(addon.price),
                          });
                          return groups;
                        },
                        [] as Array<{
                          groupId: string;
                          groupName: string;
                          options: SelectedAddon[];
                          total: number;
                        }>,
                      );
                      const modifierOptions = modifierOptionsByItem[item.id] ?? [];
                      const itemAddonGroups = itemAddonGroupsByItem[item.id] ?? [];
                      const hasMappedAddons = itemAddonGroups.length > 0;
                      const pricedSelections = pricedCustomizationsByItem[item.id] ?? selected;
                      const modifierUnitTotal = getSelectedModifierTotal(pricedSelections);
                      const effectiveUnit = item.price + modifierUnitTotal;
                      const secondaryLine = item.description || item.nameHi;

                      return (
                        <section
                          key={item.id}
                          className={clsx(
                            "cafeluxe-cart-line-item cafe-luxe-card rounded-2xl border p-3.5",
                            isLightTheme
                              ? "border-[#C6A57B] bg-[#E8D9C5]"
                              : "border-zinc-800/30 bg-[#F8F5F0]/10",
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
                              <p
                                className={WEBSITE_STYLE_CLASSES.text.sectionTitle}
                                style={{ color: isLightTheme ? PALETTE_TEXT : PALETTE_SURFACE }}
                              >
                                {formatMoney(effectiveUnit * quantity)}
                              </p>
                              <p className={clsx("mt-0.5 text-[11px]", mutedTextClass)}>
                                {formatMoney(effectiveUnit)} each
                              </p>
                            </div>
                          </div>

                          {visibleBaseModifiers.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {visibleBaseModifiers.map((modifier) => (
                                <span
                                  key={`${item.id}_selected_${modifier.id}`}
                                  className="inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium leading-none"
                                  style={{
                                    borderColor: withAlpha(WARM_HIGHLIGHT, 0.28),
                                    backgroundColor: withAlpha(WARM_HIGHLIGHT, isLightTheme ? 0.22 : 0.12),
                                    color: isLightTheme ? PALETTE_TEXT : PALETTE_SURFACE,
                                  }}
                                >
                                  {modifier.label}
                                  {modifier.price > 0 ? ` +${formatMoney(modifier.price)}` : ""}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {selectedAddons.length > 0 ? (
                            <div
                              className={clsx(
                                "mt-3 rounded-xl border p-2.5",
                                isLightTheme
                                  ? "border-[#C6A57B] bg-[#F8F5F0]/80"
                                  : "border-zinc-800/30 bg-zinc-900/55",
                              )}
                            >
                              <p className={clsx("text-[10px] uppercase tracking-[0.14em]", mutedTextClass)}>
                                Selected Add-ons
                              </p>
                              <div className="mt-2 space-y-2">
                                {groupedAddons.map((groupedAddon) => (
                                  <div
                                    key={`${item.id}_addon_group_${groupedAddon.groupId}`}
                                    className="rounded-lg border px-2.5 py-2"
                                    style={{
                                      borderColor: withAlpha(WARM_HIGHLIGHT, 0.24),
                                      backgroundColor: withAlpha(WARM_HIGHLIGHT, isLightTheme ? 0.12 : 0.08),
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <p className={clsx("text-[11px] font-semibold", contentTextClass)}>
                                        {groupedAddon.groupName}
                                      </p>
                                      {groupedAddon.total > 0 ? (
                                        <span className={clsx("text-[11px] font-semibold", contentTextClass)}>
                                          +{formatMoney(groupedAddon.total)}
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className={clsx("mt-1 text-[11px]", secondaryTextClass)}>
                                      {groupedAddon.options
                                        .map((addon) =>
                                          addon.price > 0
                                            ? `${addon.optionName} (+${formatMoney(addon.price)})`
                                            : addon.optionName,
                                        )
                                        .join(", ")}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {matchedCartOffer ? (
                            <div
                              className={clsx(
                                "mt-3 rounded-xl border px-2.5 py-2",
                                isLightTheme
                                  ? "border-[#C6A57B] bg-[#F8F5F0]/80"
                                  : "border-zinc-800/30 bg-zinc-900/55",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className={clsx("text-[11px] font-semibold", contentTextClass)}>
                                  {matchedCartOffer.offer.offerName}
                                </p>
                                <span className={clsx("text-[11px] font-semibold text-green-700", isLightTheme ? "" : "text-green-300")}>
                                  -{formatMoney(matchedCartOffer.discountAmount)}
                                </span>
                              </div>
                              <p className={clsx("mt-1 text-[11px]", secondaryTextClass)}>
                                Applied to this item automatically.
                              </p>
                            </div>
                          ) : null}

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div
                              className={clsx(
                                "cafeluxe-cart-qty-control inline-flex items-center rounded-xl border",
                                isLightTheme
                                  ? "border-[#C6A57B] bg-[#F8F5F0]/90"
                                  : "border-zinc-800/30 bg-[#F8F5F0]/20",
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
                                onClick={() => {
                                  void addToCart(item);
                                }}
                                aria-label={`Add one ${item.name}`}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <p className={clsx("text-[11px]", mutedTextClass)}>
                              {quantity} item{quantity === 1 ? "" : "s"}
                            </p>
                          </div>

                          {hasMappedAddons ? (
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <p className={clsx("text-[11px]", secondaryTextClass)}>
                                {itemAddonGroups.length} group{itemAddonGroups.length > 1 ? "s" : ""} available
                              </p>
                              <button
                                type="button"
                                className={clsx(
                                  "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition",
                                  isLightTheme
                                    ? "border-[#C6A57B] bg-[#F8F5F0]/90 text-brand-dark hover:bg-[#E8D9C5]"
                                    : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                                )}
                                onClick={() => openAddonPickerForItem(item, "edit")}
                              >
                                {selectedAddons.length > 0 ? "Edit Add-ons" : "Choose Add-ons"}
                              </button>
                            </div>
                          ) : null}

                          {!hasMappedAddons && modifierOptions.length > 0 ? (
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
                                                ? withAlpha(PALETTE_SURFACE, 0.95)
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
                <div className="mt-4">
                <section
                  className={clsx(
                    "cafe-luxe-card space-y-2 rounded-2xl border p-3.5",
                    isLightTheme ? "border-[#C6A57B] bg-[#E8D9C5]" : "border-zinc-800 bg-zinc-900/55",
                  )}
                >
                  <p className={clsx("cafe-luxe-section-title text-sm font-medium", isLightTheme ? "text-brand-dark/80" : "text-zinc-200")}>
                    Kitchen Instructions
                  </p>
                  <p className={clsx("text-[11px]", isLightTheme ? "text-brand-dark/75" : "text-zinc-400")}>
                    Add any special cooking or serving instructions for the kitchen.
                  </p>
                  <textarea
                    aria-label="Kitchen instructions"
                    className={clsx(
                      "mt-2 w-full resize-none rounded-lg border p-2 text-sm",
                      isLightTheme ? "bg-white text-brand-dark" : "bg-zinc-900 text-zinc-200",
                    )}
                    rows={3}
                    maxLength={MAX_INSTRUCTION_LENGTH}
                    value={kitchenInstructions}
                    placeholder="Example: make it spicy, less onion, no mayo"
                    spellCheck={false}
                    autoCorrect="off"
                    onKeyDown={(event) => event.stopPropagation()}
                    onChange={(event) => setKitchenInstructions(sanitizeInstructionText(event.target.value))}
                  />
                </section>
                </div>

                <div className="mt-4 space-y-4">
                {applicableCartOffers.length > 0 || cartCouponCandidates.length > 0 ? (
                  <section
                    className={clsx(
                      "cafe-luxe-card space-y-3 rounded-2xl border p-3.5",
                      isLightTheme
                        ? "border-[#C6A57B] bg-[#E8D9C5]"
                        : "border-zinc-800 bg-zinc-900/55",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={clsx("cafe-luxe-section-title text-sm font-medium", isLightTheme ? "text-brand-dark/80" : "text-zinc-200")}>
                          Applicable Offers
                        </p>
                        <p className={clsx("mt-1 text-[11px]", secondaryTextClass)}>
                          Matching item offers apply per item, and cart-wide coupons apply once on the full cart.
                        </p>
                      </div>
                      <span className={clsx("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]", mutedTextClass)}>
                        {applicableCartOffers.length + (resolvedCartCoupon ? 1 : 0)} matched
                      </span>
                    </div>
                    <div className="space-y-2">
                      {applicableCartOffers.map((offer) => (
                        <div
                          key={`cart_offer_${offer.offerId}`}
                          className={clsx(
                            "cafe-luxe-offer-card rounded-xl border px-3 py-2.5 transition",
                            isLightTheme
                              ? "border-[#C6A57B] bg-[#F8F5F0]"
                              : "border-zinc-800/30 bg-[#F8F5F0]/10",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={clsx("truncate text-sm font-semibold", contentTextClass)}>
                                {offer.offerName}
                              </p>
                              <p className={clsx("mt-1 text-[11px]", secondaryTextClass)}>
                                {offer.matchedReason}
                              </p>
                              <p className={clsx("mt-1 text-[11px] font-medium", isLightTheme ? "text-brand-dark" : "text-zinc-200")}>
                                {`Applied on ${offer.matchedItemCount} item${offer.matchedItemCount === 1 ? "" : "s"}: ${offer.matchedItemNames.join(", ")}`}
                              </p>
                              <p className={clsx("mt-1 text-[11px] font-medium", isLightTheme ? "text-brand-dark" : "text-zinc-200")}>
                                {`Combined saving ${formatMoney(offer.totalDiscountAmount)}`}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <span className={clsx("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]", mutedTextClass)}>
                                {offer.offerType}
                              </span>
                              <span
                                className={clsx(
                                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                                  isLightTheme
                                    ? "border-[#C6A57B] bg-[#C6A57B]/20 text-brand-dark"
                                    : "border-zinc-600 bg-zinc-800 text-zinc-100",
                                )}
                              >
                                Auto Applied
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {resolvedCartCoupon ? (
                        <div
                          key={`cart_coupon_${resolvedCartCoupon.offer.offerId}`}
                          className={clsx(
                            "cafe-luxe-offer-card rounded-xl border px-3 py-2.5 transition",
                            isLightTheme
                              ? "border-[#C6A57B] bg-[#F8F5F0]"
                              : "border-zinc-800/30 bg-[#F8F5F0]/10",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={clsx("truncate text-sm font-semibold", contentTextClass)}>
                                {resolvedCartCoupon.offer.offerName}
                              </p>
                              <p className={clsx("mt-1 text-[11px]", secondaryTextClass)}>
                                {resolvedCartCoupon.offer.matchedReason}
                              </p>
                              <p className={clsx("mt-1 text-[11px] font-medium", isLightTheme ? "text-brand-dark" : "text-zinc-200")}>
                                {`Cart coupon saving ${formatMoney(resolvedCartCoupon.discountAmount)}`}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <span className={clsx("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]", mutedTextClass)}>
                                {resolvedCartCoupon.offer.offerType}
                              </span>
                              <span
                                className={clsx(
                                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                                  isLightTheme
                                    ? "border-[#C6A57B] bg-[#C6A57B]/20 text-brand-dark"
                                    : "border-zinc-600 bg-zinc-800 text-zinc-100",
                                )}
                              >
                                Cart Coupon
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                <section
                  className={clsx(
                    "cafe-luxe-card space-y-3 rounded-2xl border p-3.5",
                    isLightTheme
                      ? "border-[#C6A57B] bg-[#E8D9C5]"
                      : "border-zinc-800 bg-zinc-900/55",
                  )}
                >
                  <p className={clsx("cafe-luxe-section-title mb-2 text-sm font-medium", isLightTheme ? "text-brand-dark/75" : "text-zinc-300")}>
                    {"Payment Method"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["COUNTER", "UPI"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        className={clsx(
                          "cafe-luxe-control inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                          paymentMethod === method
                            ? "text-zinc-950"
                            : isLightTheme
                              ? "border-[#C6A57B] bg-[#F8F5F0]/90 text-brand-dark hover:bg-[#E8D9C5]"
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
                  <motion.section
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={gentleSpring}
                    className={clsx(
                      "cafeluxe-payment-panel cafe-luxe-card rounded-2xl border p-3.5 text-sm",
                      contentTextClass,
                      isLightTheme
                        ? "border-[#C6A57B] bg-[#E8D9C5]"
                        : "border-zinc-800/30 bg-[#F8F5F0]/10",
                    )}
                  >
                    <p className="text-[10px] uppercase tracking-[0.14em] opacity-70">UPI Payment</p>
                    <p className="mt-1 text-sm font-semibold">{configuredUpiName}</p>
                    <p className="mt-0.5 text-xs opacity-70">{configuredUpiId}</p>
                    <div
                      className={clsx(
                        "cafe-luxe-summary mt-3 flex items-center justify-between rounded-xl border px-3 py-2",
                        isLightTheme
                          ? "border-[#C6A57B] bg-[#E8D9C5]"
                          : "border-zinc-800/20 bg-black/10",
                      )}
                    >
                      <span className="text-xs opacity-70">Payable Amount</span>
                      <span className="text-sm font-semibold">{formatMoney(finalTotal)}</span>
                    </div>
                    {cartUpiLink ? (
                      <>
                        <button
                          type="button"
                          className="cafe-luxe-cta mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border px-3 text-sm font-semibold text-zinc-950 transition active:translate-y-px"
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
                              ? "border-[#C6A57B] bg-[#F8F5F0] text-brand-dark hover:bg-[#E8D9C5]"
                              : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
                          )}
                          onClick={() => handleShowUpiQr(cartUpiLink, finalTotal)}
                        >
                          {"Pay By QR (Recommended)"}
                        </button>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={clsx(
                              "cafe-luxe-chip rounded-lg border px-2 py-1 text-[11px] font-medium transition",
                              isLightTheme
                                ? "border-[#C6A57B] bg-[#F8F5F0]/90 text-brand-dark hover:bg-[#E8D9C5]"
                                : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                            )}
                            onClick={() => copyTextWithNotice(configuredUpiId, "UPI ID copied.")}
                          >
                            {"Copy UPI ID"}
                          </button>
                          <button
                            type="button"
                            className={clsx(
                              "cafe-luxe-chip rounded-lg border px-2 py-1 text-[11px] font-medium transition",
                              isLightTheme
                                ? "border-[#C6A57B] bg-[#F8F5F0]/90 text-brand-dark hover:bg-[#E8D9C5]"
                                : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                            )}
                            onClick={() => copyTextWithNotice(Number(finalTotal).toFixed(2), "Amount copied.")}
                          >
                            {"Copy Amount"}
                          </button>
                        </div>
                      </>
                    ) : null}
                    {!canLaunchUpiDeepLink ? (
                      <div
                        className={clsx(
                          "mt-3 rounded-lg border p-2 text-[11px]",
                          isLightTheme
                            ? "border-[#C6A57B] bg-[#E8D9C5] text-brand-dark/75"
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
                              "cafe-luxe-chip rounded-lg border px-2 py-1 font-medium transition",
                              isLightTheme
                                ? "border-[#C6A57B] bg-[#F8F5F0] text-brand-dark hover:bg-[#E8D9C5]"
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
                              "cafe-luxe-chip rounded-lg border px-2 py-1 font-medium transition",
                              isLightTheme
                                ? "border-[#C6A57B] bg-[#F8F5F0] text-brand-dark hover:bg-[#E8D9C5]"
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
                              "cafe-luxe-chip rounded-lg border px-2 py-1 font-medium transition",
                              isLightTheme
                                ? "border-[#C6A57B] bg-[#F8F5F0] text-brand-dark hover:bg-[#E8D9C5]"
                                : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                            )}
                            onClick={() =>
                              copyTextWithNotice(
                                Number(finalTotal).toFixed(2),
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
                  </motion.section>
                ) : null}
                </div>
              </motion.div>

              <motion.div
                variants={cartContentItemVariants}
                className={clsx(
                  "cafeluxe-checkout-panel shrink-0 space-y-3 border-t px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3 sm:px-5 md:px-5 md:pb-5",
                  isLightTheme ? "border-[#C6A57B]" : "border-zinc-800",
                )}
              >
                <section
                  className={clsx(
                    "cafe-luxe-card cafe-luxe-summary space-y-2 rounded-2xl border px-3.5 py-3.5 text-sm",
                    contentTextClass,
                    isLightTheme
                      ? "border-[#C6A57B] bg-[#E8D9C5]"
                      : "border-zinc-800/30 bg-[#F8F5F0]/10",
                  )}
                >
                  <div className="cafeluxe-cart-summary-row flex items-center justify-between gap-4">
                    <span className="opacity-80">Subtotal</span>
                    <span className="font-semibold">{formatMoney(subtotal)}</span>
                  </div>
                  {hasCustomizationsInCart ? (
                    <div className="cafeluxe-cart-summary-row flex items-center justify-between gap-4">
                      <span className="opacity-80">Customizations</span>
                      <span className="font-semibold">
                        Included
                      </span>
                    </div>
                  ) : null}
                  {gstEnabled ? (
                    <>
                      <div className="cafeluxe-cart-summary-row flex items-center justify-between gap-4">
                        <span className="opacity-80">CGST ({cgstPercentage}%)</span>
                        <span className="font-semibold">{formatMoney(cgstAmount)}</span>
                      </div>
                      <div className="cafeluxe-cart-summary-row flex items-center justify-between gap-4">
                        <span className="opacity-80">SGST ({sgstPercentage}%)</span>
                        <span className="font-semibold">{formatMoney(sgstAmount)}</span>
                      </div>
                    </>
                  ) : null}
                  <div className="cafeluxe-cart-summary-row flex w-full items-center justify-between gap-4">
                    <span className="opacity-80">Discount Applied</span>
                    <span className="font-semibold text-green-600">-{formatMoney(totalDiscountAmount)}</span>
                  </div>
                  {applicableCartOffers.length > 0 || resolvedCartCoupon ? (
                    <div className="cafeluxe-cart-summary-row flex items-center justify-between gap-4">
                      <span className="opacity-80">Matched Offers</span>
                      <span className="font-semibold">{applicableCartOffers.length + (resolvedCartCoupon ? 1 : 0)}</span>
                    </div>
                  ) : null}
                  <div className="cafeluxe-cart-summary-total flex w-full items-center justify-between gap-4 border-t pt-2 font-bold text-lg">
                    <span>Final Payable</span>
                    <span>{formatMoney(finalTotal)}</span>
                  </div>
                </section>

                {paymentMethod === "COUNTER" ? (
                  <button
                    type="button"
                    className="cafe-luxe-cta inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-brand-dark transition disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      borderColor: withAlpha(ROYAL_NAVY, 0.4),
                      background: `linear-gradient(180deg, ${WARM_HIGHLIGHT} 0%, ${LUXURY_GOLD} 100%)`,
                    }}
                    onClick={() => void handlePlaceOrder()}
                    disabled={placeOrderDisabled}
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
                ) : null}

                {paymentMethod === "UPI" ? (
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      className="cafe-luxe-cta inline-flex h-12 w-full items-center justify-center rounded-xl border px-4 text-sm font-bold text-zinc-950 transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                      style={{
                        borderColor: withAlpha(ROYAL_NAVY, 0.35),
                        background: `linear-gradient(180deg, ${PALETTE_SURFACE} 0%, ${WARM_HIGHLIGHT} 100%)`,
                      }}
                      onClick={() => void handlePlaceOrder({ redirectToMenuAfterSuccess: true })}
                      disabled={placeOrderDisabled}
                    >
                      {placingOrder ? "Placing Order..." : "Payment Done"}
                    </button>
                    <p className="px-1 text-[11px] opacity-70">
                      After paying in your UPI app, tap Payment Done to place the order and keep it pending for staff verification.
                    </p>
                  </div>
                ) : null}
              </motion.div>
            </motion.div>
          </motion.aside>
        </motion.div>
      ) : null}
      </AnimatePresence>

      {addonPickerOpen && addonPickerItem ? (
        <div
          className="fixed inset-0 z-[68] backdrop-blur-sm"
          style={{ backgroundColor: overlayShade }}
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={closeAddonPicker}
            aria-label="Close add-on selector"
          />
          <aside
            className={clsx(
              "cafe-luxe-card-strong absolute inset-x-0 bottom-0 mx-auto w-full max-w-[520px] rounded-t-3xl border px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.98)] md:inset-y-0 md:my-auto md:h-fit md:rounded-3xl",
              isLightTheme
                ? "border-[#C6A57B] bg-[#E8D9C5] text-brand-dark"
                : "border-zinc-800 bg-zinc-950/95 text-zinc-100",
            )}
            style={{ borderColor: accentSubtle }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={clsx("text-[10px] uppercase tracking-[0.16em]", isLightTheme ? "text-brand-dark/65" : "text-zinc-400")}>
                  Select Add-ons
                </p>
                <h3 className={clsx("mt-1 line-clamp-2 text-sm font-semibold", isLightTheme ? "text-brand-dark" : "text-zinc-100")}>
                  {addonPickerItem.name}
                </h3>
              </div>
              <button
                type="button"
                className={clsx(
                  "rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                  isLightTheme
                    ? "border-[#C6A57B] bg-[#F8F5F0] text-brand-dark hover:bg-[#E8D9C5]"
                    : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                )}
                onClick={closeAddonPicker}
              >
                Close
              </button>
            </div>

            <div className="mt-3 max-h-[54vh] space-y-3 overflow-y-auto pr-1">
              {addonPickerGroups.map((group) => {
                const selectedOptionIds = addonPickerDraftByGroup[group.id] ?? [];
                const selectionHint =
                  group.selectionMode === "single"
                    ? "Choose one option"
                    : "Choose one or more options";
                return (
                  <section
                    key={`addon_group_${group.id}`}
                    className={clsx(
                      "rounded-2xl border p-3.5 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.5)]",
                      isLightTheme
                        ? "border-[#C6A57B] bg-[#F8F5F0]/95"
                        : "border-zinc-800/30 bg-zinc-900/50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={clsx("text-sm font-semibold", contentTextClass)}>{group.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={clsx(
                            "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]",
                            isLightTheme ? "border-[#C6A57B] bg-[#E8D9C5] text-brand-dark/80" : "border-zinc-700 text-zinc-300",
                          )}
                        >
                          {group.selectionMode === "single" ? "Single" : "Multi"}
                        </span>
                        <span
                          className={clsx(
                            "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]",
                            group.required
                              ? isLightTheme
                                ? "border-[#C6A57B] bg-[#C6A57B] text-brand-dark"
                                : "border-amber-400/40 bg-amber-400/20 text-amber-200"
                              : isLightTheme
                                ? "border-[#C6A57B] bg-[#E8D9C5] text-brand-dark/80"
                                : "border-zinc-700 text-zinc-300",
                          )}
                        >
                          {group.required ? "Required" : "Optional"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className={clsx("text-[11px]", secondaryTextClass)}>{selectionHint}</p>
                      {selectedOptionIds.length > 0 ? (
                        <span className={clsx("text-[11px] font-medium", contentTextClass)}>
                          {selectedOptionIds.length} selected
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {group.options.map((option) => {
                        const isSelected = selectedOptionIds.includes(option.id);
                        return (
                          <button
                            key={`addon_option_${group.id}_${option.id}`}
                            type="button"
                            className={clsx(
                              "inline-flex min-h-11 items-start justify-between rounded-xl border px-3 py-2 text-left text-xs font-medium transition",
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
                                      ? withAlpha(PALETTE_SURFACE, 0.95)
                                      : withAlpha(SOFT_DARK_SURFACE, 0.7),
                                  }
                            }
                            onClick={() => toggleAddonDraftOption(group, option.id)}
                          >
                            <span className="flex min-w-0 items-start gap-2 pr-2">
                              <span
                                className={clsx(
                                  "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                  isSelected
                                    ? "border-zinc-950 bg-zinc-950 text-white"
                                    : isLightTheme
                                      ? "border-[#C6A57B] bg-[#F8F5F0]"
                                      : "border-zinc-600 bg-zinc-800",
                                )}
                              >
                                {isSelected ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <span
                                    className={clsx(
                                      "h-1.5 w-1.5 rounded-full",
                                      isLightTheme ? "bg-[#C6A57B]/80" : "bg-zinc-500",
                                    )}
                                  />
                                )}
                              </span>
                              <span className="line-clamp-2">{option.name}</span>
                            </span>
                            <span
                              className={clsx(
                                "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                                isSelected
                                  ? "bg-zinc-950/10"
                                  : isLightTheme
                                    ? "bg-[#E8D9C5]"
                                    : "bg-zinc-800",
                              )}
                            >
                              {option.price > 0 ? `+${formatMoney(option.price)}` : "Free"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            {addonPickerError ? (
              <p className="mt-3 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
                {addonPickerError}
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={clsx(
                  "rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                  isLightTheme
                    ? "border-[#C6A57B] bg-[#F8F5F0] text-brand-dark hover:bg-[#E8D9C5]"
                    : "border-zinc-700 text-zinc-100 hover:bg-zinc-800",
                )}
                onClick={closeAddonPicker}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cafe-luxe-cta rounded-xl border px-3 py-2.5 text-sm font-semibold text-zinc-950 transition active:translate-y-px"
                style={{
                  borderColor: withAlpha(WARM_HIGHLIGHT, 0.45),
                  background: `linear-gradient(180deg, ${WARM_HIGHLIGHT} 0%, ${LUXURY_GOLD} 100%)`,
                }}
                onClick={saveAddonSelectionAndAddItem}
              >
                {addonPickerMode === "add" ? "Add To Cart" : "Save Add-ons"}
              </button>
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
              "cafe-luxe-card-strong absolute inset-x-0 bottom-0 mx-auto w-full max-w-[480px] rounded-t-3xl border px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.98)] md:inset-y-0 md:my-auto md:h-fit md:rounded-3xl",
              isLightTheme
                ? "border-[#C6A57B] bg-[#E8D9C5] text-brand-dark"
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
                    ? "border-[#C6A57B] bg-[#F8F5F0] text-brand-dark hover:bg-[#E8D9C5]"
                    : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                )}
                onClick={closeUpiQrSheet}
              >
                Close
              </button>
            </div>

            <div className="mt-3 rounded-2xl border border-zinc-800 bg-[#F8F5F0] p-3">
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
                  ? "border-[#C6A57B] bg-[#F8F5F0]/90 text-brand-dark/80"
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
                    ? "border-[#C6A57B] bg-[#F8F5F0] text-brand-dark hover:bg-[#E8D9C5]"
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
                    ? "border-[#C6A57B] bg-[#F8F5F0] text-brand-dark hover:bg-[#E8D9C5]"
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
