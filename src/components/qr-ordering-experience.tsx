"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  AlertCircle,
  CheckCircle2,
  Flame,
  HandCoins,
  Leaf,
  Loader2,
  Minus,
  Plus,
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
} from "@/lib/appwrite";
import {
  buildFallbackCategories,
  type Category,
  findTableForRoute,
  formatInr,
  formatTableLabel,
  inferRestaurantName,
  matchesCategory,
  parseBrandingSettings,
  parseCategories,
  parseMenuItems,
  parseTables,
  type MenuItem,
  type RestaurantBranding,
  type RestaurantTable,
} from "@/lib/menu";

type PaymentMethod = "UPI" | "COUNTER";
type LoadState = "loading" | "ready" | "invalid-table" | "error";

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
  updatedAt: string;
};

type ActiveTableBillState = {
  version: number;
  client: string;
  table: string;
  activeOrder: ActiveOrderContext | null;
  updatedAt: string;
};

type ActiveTableSessionState = {
  version: number;
  client: string;
  table: string;
  hasCart: boolean;
  activeOrder: ActiveOrderContext | null;
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
const CUSTOMER_PROFILE_VERSION = 1;
const CUSTOMER_ORDER_HISTORY_VERSION = 1;
const MAX_LOCAL_RECENT_ORDERS = 30;
const MAX_LOCAL_FAVORITES = 24;
const MAX_LOCAL_HISTORY_PER_CLIENT = 40;
const ACTIVE_TABLE_STORAGE_VERSION = 1;

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

function toTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function toPaymentMethod(value: unknown): PaymentMethod | undefined {
  const normalized = toSafeString(value).toUpperCase();
  if (normalized === "UPI" || normalized === "COUNTER") {
    return normalized;
  }
  return undefined;
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

  const existing = toSafeString(window.localStorage.getItem(CUSTOMER_BROWSER_ID_KEY));
  if (existing) {
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
  if (!rawValue) {
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
  if (!rawValue) {
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

function parseLegacyPersistedSession(rawValue: string | null) {
  if (!rawValue) {
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
  if (!rawValue) {
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

    return {
      version: ACTIVE_TABLE_STORAGE_VERSION,
      client: toSafeString(parsed.client),
      table: toSafeString(parsed.table),
      cart,
      updatedAt: toSafeString(parsed.updatedAt) || new Date().toISOString(),
    } satisfies ActiveTableCartState;
  } catch {
    return null;
  }
}

function parseActiveBillState(rawValue: string | null) {
  if (!rawValue) {
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

    return {
      version: ACTIVE_TABLE_STORAGE_VERSION,
      client: toSafeString(parsed.client),
      table: toSafeString(parsed.table),
      activeOrder,
      updatedAt: toSafeString(parsed.updatedAt) || activeOrder?.updatedAt || new Date().toISOString(),
    } satisfies ActiveTableBillState;
  } catch {
    return null;
  }
}

function parseActiveSessionState(rawValue: string | null) {
  if (!rawValue) {
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

    return {
      version: ACTIVE_TABLE_STORAGE_VERSION,
      client: toSafeString(parsed.client),
      table: toSafeString(parsed.table),
      hasCart,
      activeOrder,
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

async function fetchLatestOrderContext(clientId: string, tableId: string) {
  try {
    const orderDocs = await fetchAllDocuments(appwriteConfig.collections.orders, {
      pageSize: 25,
      maxDocs: 25,
      queries: [
        Query.equal("client_id", [clientId]),
        Query.equal("table_id", [tableId]),
        Query.orderDesc("$createdAt"),
      ],
    });

    const latestOrder = orderDocs[0];
    if (!latestOrder?.$id) {
      return null;
    }

    return {
      id: latestOrder.$id,
      status: toSafeString(latestOrder.status) || "PLACED",
      paymentStatus: toSafeString(latestOrder.payment_status) || "UNPAID",
      updatedAt:
        toSafeString(latestOrder.$updatedAt) ||
        toSafeString(latestOrder.$createdAt) ||
        new Date().toISOString(),
    } satisfies ActiveOrderContext;
  } catch (error) {
    const message = getErrorMessage(error).toLowerCase();
    const canIgnore =
      message.includes("not authorized") ||
      message.includes("user_unauthorized") ||
      message.includes("index") ||
      message.includes("attribute") ||
      message.includes("query");
    if (!canIgnore) {
      console.error(error);
    }
    return null;
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

async function fetchClientScopedDocuments(collectionId: string, routeClient: string) {
  const candidates = buildClientCandidates(routeClient);
  const clientFields = ["client_id", "client", "clientId", "client_slug", "clientSlug"];

  for (const clientField of clientFields) {
    try {
      const docs = await fetchAllDocuments(collectionId, {
        pageSize: 80,
        maxDocs: 600,
        queries: [Query.equal(clientField, candidates)],
      });

      if (docs.length > 0) {
        return docs;
      }
    } catch (queryError) {
      if (!isRecoverableQueryFailure(queryError)) {
        throw queryError;
      }
    }
  }

  return fetchAllDocuments(collectionId, {
    pageSize: 80,
    maxDocs: 600,
  });
}

function buildTableCandidates(routeTable: string) {
  const cleaned = routeTable.trim();
  const noTablePrefix = cleaned.replace(/^table[-_\s]*/i, "");
  return uniqueNonEmpty([
    cleaned,
    cleaned.toLowerCase(),
    cleaned.toUpperCase(),
    noTablePrefix,
    noTablePrefix.toLowerCase(),
    noTablePrefix.toUpperCase(),
    noTablePrefix.startsWith("T") ? noTablePrefix : `T${noTablePrefix}`,
  ]);
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

async function resolveRouteTable(clientId: string, tableParam: string) {
  const clientCandidates = buildClientCandidates(clientId);
  const tableCandidates = buildTableCandidates(tableParam);
  const tableQueryPairs: Array<["table_code" | "table_no", string[]]> = [
    ["table_code", tableCandidates],
    ["table_no", tableCandidates],
  ];

  for (const [tableField, values] of tableQueryPairs) {
    try {
      const queriedTables = await fetchAllDocuments(appwriteConfig.collections.tables, {
        pageSize: 40,
        maxDocs: 40,
        queries: [Query.equal("client_id", clientCandidates), Query.equal(tableField, values)],
      });

      const parsedTables = parseTables(queriedTables, clientId);
      const matchedTable = findTableForRoute(parsedTables, tableParam);
      if (matchedTable?.id) {
        return matchedTable;
      }
    } catch (queryError) {
      const message = getErrorMessage(queryError).toLowerCase();
      const canFallbackToBroadScan =
        /attribute|query|index|invalid/i.test(message) ||
        /not found/i.test(message);
      if (!canFallbackToBroadScan) {
        throw queryError;
      }
    }
  }

  const allTables = await fetchAllDocuments(appwriteConfig.collections.tables, {
    pageSize: 200,
    maxDocs: 2000,
  });
  const parsedAllTables = parseTables(allTables, clientId);
  return findTableForRoute(parsedAllTables, tableParam);
}

export default function QrOrderingExperience({
  client,
  table,
}: {
  client: string;
  table: string;
}) {
  const routeClient = decodeURIComponent(client).trim();
  const routeTable = decodeURIComponent(table).trim();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadingMessage, setLoadingMessage] = useState("Menu load ho raha hai...");
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");

  const [restaurantName, setRestaurantName] = useState("Cafe");
  const [branding, setBranding] = useState<RestaurantBranding | null>(null);
  const [tableInfo, setTableInfo] = useState<RestaurantTable | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isCartHydrated, setIsCartHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COUNTER");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlacedId, setOrderPlacedId] = useState("");
  const [activeOrderContext, setActiveOrderContext] = useState<ActiveOrderContext | null>(
    null,
  );
  const [customerBrowserId, setCustomerBrowserId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return ensureBrowserCustomerId();
  });
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const browserId = ensureBrowserCustomerId();
    return parseCustomerProfile(window.localStorage.getItem(CUSTOMER_PROFILE_KEY), browserId);
  });
  const [brokenImageMap, setBrokenImageMap] = useState<Record<string, true>>({});
  const placeOrderLockRef = useRef(false);

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

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoadState("loading");
      setIsCartHydrated(false);
      setErrorMessage("");
      setNoticeMessage("");
      setOrderPlacedId("");
      setActiveOrderContext(null);
      setSearchText("");
      setBrokenImageMap({});

      try {
        setLoadingMessage("Table verify ho raha hai...");
        const matchedTable = await resolveRouteTable(routeClient, routeTable);

        if (cancelled) {
          return;
        }

        if (!matchedTable) {
          setTableInfo(null);
          setLoadState("invalid-table");
          setErrorMessage(
            "Yeh table QR valid nahi hai. Staff se naya QR code lein.",
          );
          return;
        }

        setLoadingMessage("Menu and categories load ho rahi hain...");
        const settingsPromise = fetchClientScopedDocuments(
          appwriteConfig.collections.settings,
          routeClient,
        ).catch((error) => {
          if (isUnauthorizedError(error)) {
            return [];
          }
          throw error;
        });
        const [categoryDocs, menuDocs, settingsDocs] = await Promise.all([
          fetchClientScopedDocuments(appwriteConfig.collections.categories, routeClient),
          fetchClientScopedDocuments(appwriteConfig.collections.menuItems, routeClient),
          settingsPromise,
        ]);

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
        const brandingSettings = parseBrandingSettings(settingsDocs, routeClient);

        setTableInfo(matchedTable);
        setBranding(brandingSettings);
        setCategories(ensuredCategories);
        setMenuItems(parsedItems);
        setRestaurantName(
          inferRestaurantName(routeClient, brandingSettings, ensuredCategories, parsedItems),
        );
        setActiveCategory((current) =>
          current !== "all" && ensuredCategories.some((category) => category.id === current)
            ? current
            : "all",
        );
        setCartOpen(false);

        if (typeof window !== "undefined") {
          const activeCartState = parseActiveCartState(
            window.localStorage.getItem(activeCartStorageKey),
          );
          const activeBillState = parseActiveBillState(
            window.localStorage.getItem(activeBillStorageKey),
          );
          const activeSessionState = parseActiveSessionState(
            window.localStorage.getItem(activeSessionStorageKey),
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
                activeOrder: legacyForRoute.activeOrder,
                updatedAt: legacyForRoute.updatedAt || nowIso,
              };
              window.localStorage.setItem(
                activeSessionStorageKey,
                JSON.stringify(migratedSession),
              );
            }

            window.localStorage.removeItem(legacyTableSessionStorageKey);
          }

          let hydratedCart: Record<string, number> = {};
          const validIds = new Set(parsedItems.map((item) => item.id));
          const cartSource = cartForRoute?.cart ?? legacyForRoute?.cart ?? {};

          for (const [itemId, qtyValue] of Object.entries(cartSource)) {
              const qty = toPositiveQuantity(qtyValue);
              if (qty > 0 && validIds.has(itemId)) {
                hydratedCart[itemId] = qty;
              }
          }

          let restoredOrder =
            billForRoute?.activeOrder ??
            sessionForRoute?.activeOrder ??
            legacyForRoute?.activeOrder ??
            null;
          const backendOrder = ENABLE_BACKEND_ORDER_SYNC
            ? await fetchLatestOrderContext(
                matchedTable.clientId || routeClient,
                matchedTable.id,
              )
            : null;
          if (cancelled) {
            return;
          }

          if (backendOrder) {
            const useBackendOrder =
              !restoredOrder ||
              toTimestamp(backendOrder.updatedAt) >= toTimestamp(restoredOrder.updatedAt);
            if (useBackendOrder) {
              restoredOrder = backendOrder;
            }
          }

          if (restoredOrder && isOrderClosed(restoredOrder.status, restoredOrder.paymentStatus)) {
            window.localStorage.removeItem(activeCartStorageKey);
            window.localStorage.removeItem(activeBillStorageKey);
            window.localStorage.removeItem(activeSessionStorageKey);
            window.localStorage.removeItem(legacyTableSessionStorageKey);
            setActiveOrderContext(null);
            setOrderPlacedId("");
            hydratedCart = {};
          } else if (restoredOrder) {
            setActiveOrderContext(restoredOrder);
            setOrderPlacedId(restoredOrder.id);
          } else {
            setActiveOrderContext(null);
          }

          setCart(hydratedCart);
        } else {
          setCart({});
        }

        setLoadState("ready");
        setIsCartHydrated(true);
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error(error);
        setLoadState("error");
        setErrorMessage(
          "Appwrite se data load nahi ho paaya. Internet check karein aur retry karein.",
        );
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
    if (!isCartHydrated || typeof window === "undefined") {
      return;
    }

    const nowIso = new Date().toISOString();
    const hasCart = Object.keys(cart).length > 0;
    const hasOpenOrder =
      !!activeOrderContext &&
      !isOrderClosed(activeOrderContext.status, activeOrderContext.paymentStatus);

    const activeCartState: ActiveTableCartState = {
      version: ACTIVE_TABLE_STORAGE_VERSION,
      client: routeClient,
      table: routeTable,
      cart,
      updatedAt: nowIso,
    };

    const activeBillState: ActiveTableBillState = {
      version: ACTIVE_TABLE_STORAGE_VERSION,
      client: routeClient,
      table: routeTable,
      activeOrder: hasOpenOrder ? activeOrderContext : null,
      updatedAt: activeOrderContext?.updatedAt || nowIso,
    };

    const activeSessionState: ActiveTableSessionState = {
      version: ACTIVE_TABLE_STORAGE_VERSION,
      client: routeClient,
      table: routeTable,
      hasCart,
      activeOrder: hasOpenOrder ? activeOrderContext : null,
      updatedAt: nowIso,
    };

    if (hasCart) {
      window.localStorage.setItem(activeCartStorageKey, JSON.stringify(activeCartState));
    } else {
      window.localStorage.removeItem(activeCartStorageKey);
    }

    if (hasOpenOrder) {
      window.localStorage.setItem(activeBillStorageKey, JSON.stringify(activeBillState));
    } else {
      window.localStorage.removeItem(activeBillStorageKey);
    }

    if (hasCart || hasOpenOrder) {
      window.localStorage.setItem(
        activeSessionStorageKey,
        JSON.stringify(activeSessionState),
      );
    } else {
      window.localStorage.removeItem(activeSessionStorageKey);
    }

    window.localStorage.removeItem(legacyTableSessionStorageKey);
  }, [
    activeOrderContext,
    activeBillStorageKey,
    activeCartStorageKey,
    activeSessionStorageKey,
    cart,
    isCartHydrated,
    legacyTableSessionStorageKey,
    routeClient,
    routeTable,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeCategory]);

  const visibleItems = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
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
  }, [activeCategory, categories, menuItems, searchText]);

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

  const subtotal = useMemo(
    () =>
      cartItems.reduce((total, item) => total + item.item.price * item.quantity, 0),
    [cartItems],
  );

  const total = subtotal;

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
      setErrorMessage("Table mapping missing hai. QR dobara scan karein.");
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
    const compactItems = cartItems.map((cartItem) => ({
      item_id: cartItem.item.id,
      item_name: cartItem.item.name,
      item_name_hi: cartItem.item.nameHi,
      unit_price: cartItem.item.price,
      quantity: cartItem.quantity,
      line_total: cartItem.item.price * cartItem.quantity,
    }));

    const itemsJson = JSON.stringify(compactItems);
    const orderBasePayload = {
      client_id: clientId,
      table_id: tableInfo.id,
      order_number: orderNumber,
      status: "PLACED",
      payment_status: "UNPAID",
      subtotal,
      total_amount: total,
    };

    const orderPayloadTemplates: Record<string, unknown>[] = [
      {
        ...orderBasePayload,
        table_no: tableInfo.tableNo,
        items: compactItems,
        payment_method: paymentMethod,
        created_at_custom: nowIso,
        created_at: nowIso,
      },
      {
        ...orderBasePayload,
        items: compactItems,
        payment_method: paymentMethod,
        created_at_custom: nowIso,
        created_at: nowIso,
      },
      {
        ...orderBasePayload,
        items_json: itemsJson,
        payment_method: paymentMethod,
        created_at_custom: nowIso,
        created_at: nowIso,
      },
      {
        ...orderBasePayload,
        items: itemsJson,
        payment_method: paymentMethod,
        created_at_custom: nowIso,
        created_at: nowIso,
      },
      {
        ...orderBasePayload,
        payment_method: paymentMethod,
        created_at_custom: nowIso,
        created_at: nowIso,
      },
      {
        ...orderBasePayload,
        created_at_custom: nowIso,
        created_at: nowIso,
      },
      {
        ...orderBasePayload,
      },
    ];

    const orderPayloadCandidates = orderPayloadTemplates.flatMap((payload) => {
      if (!browserIdForOrder) {
        return [payload];
      }
      return [{ ...payload, customer_browser_id: browserIdForOrder }, payload];
    });

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
            table_id: tableInfo.id,
            table_no: tableInfo.tableNo,
            amount: total,
            method: "UPI",
            status: "PENDING",
            payment_status: "UNPAID",
            created_at: nowIso,
          },
          {
            clientId,
            orderId: createdOrder.$id,
            tableId: tableInfo.id,
            tableNo: tableInfo.tableNo,
            amount: total,
            method: "UPI",
            status: "PENDING",
            createdAt: nowIso,
          },
          {
            order_id: createdOrder.$id,
            amount: total,
            method: "UPI",
            status: "PENDING",
          },
          {
            order_id: createdOrder.$id,
            table_id: tableInfo.id,
            amount: total,
            method: "UPI",
            status: "PENDING",
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
            "Order place ho gaya, lekin payment record create nahi ho paaya. Staff ko inform karein.",
          );
        }
      }

      setOrderPlacedId(createdOrder.$id);
      setActiveOrderContext({
        id: createdOrder.$id,
        status: "PLACED",
        paymentStatus: "UNPAID",
        updatedAt: nowIso,
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
          totalAmount: total,
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
      setCartOpen(false);
    } catch (orderError) {
      console.error(orderError);
      const rawMessage = getErrorMessage(orderError);
      const message = rawMessage.toLowerCase();
      if (message.includes("network") || message.includes("fetch")) {
        setErrorMessage("Network issue hai. Please connection check karke dobara try karein.");
      } else if (message.includes("missing required attribute")) {
        setErrorMessage(`Order schema mismatch: ${rawMessage}`);
      } else if (message.includes('"table_id"')) {
        setErrorMessage(
          "Table ID resolve nahi ho paaya. QR dobara scan karein aur staff ko inform karein.",
        );
      } else {
        setErrorMessage(
          "Order place nahi ho paaya. Staff ko inform karein ya thodi der baad retry karein.",
        );
      }
    } finally {
      setPlacingOrder(false);
      placeOrderLockRef.current = false;
    }
  }

  const tableLabel = tableInfo ? tableInfo.displayLabel : formatTableLabel(routeTable);

  if (loadState === "loading") {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2937_0%,_#0f172a_42%,_#020617_100%)] text-zinc-100">
        <div className="mx-auto w-full max-w-4xl px-4 pb-20 pt-6 sm:px-6">
          <div className="rounded-2xl border border-zinc-700/70 bg-zinc-950/70 p-4">
            <div className="h-4 w-32 animate-pulse rounded bg-zinc-700/70" />
            <div className="mt-3 h-7 w-56 animate-pulse rounded bg-zinc-800/80" />
            <p className="mt-3 text-sm text-zinc-300">{loadingMessage}</p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60"
              >
                <div className="aspect-[4/3] animate-pulse bg-zinc-800/70" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-700/70" />
                  <div className="h-3 w-full animate-pulse rounded bg-zinc-800/80" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800/80" />
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2937_0%,_#0f172a_42%,_#020617_100%)] px-4 py-8 text-zinc-100">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-red-300/25 bg-zinc-950/80 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-300" />
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2937_0%,_#0f172a_42%,_#020617_100%)] px-4 py-8 text-zinc-100">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-950/80 p-6">
          <WifiOff className="h-9 w-9 text-amber-200" />
          <h1 className="mt-4 text-xl font-semibold">Connection Problem</h1>
          <p className="mt-2 text-sm text-zinc-300">{errorMessage}</p>
          <button
            type="button"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
            onClick={() => {
              setLoadState("loading");
              setLoadingMessage("Retry kar rahe hain...");
              setErrorMessage("");
              setNoticeMessage("");
              setReloadKey((current) => current + 1);
            }}
          >
            Retry | Dobara try karein
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2937_0%,_#0f172a_42%,_#020617_100%)] text-zinc-100">
      {branding?.heroImageUrl ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 h-48 opacity-20"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.2) 0%, rgba(2,6,23,0.95) 95%), url(${branding.heroImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : null}

      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pb-28 pt-5 sm:px-6">
        <header className="sticky top-3 z-20 mb-5 rounded-2xl border border-white/10 bg-zinc-950/85 px-4 py-3 shadow-[0_16px_48px_-24px_rgba(16,185,129,0.45)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[11px] uppercase tracking-[0.18em] text-emerald-300/90">
                Welcome | Swagat Hai
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                {branding?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.logoUrl}
                    alt={restaurantName}
                    className="h-7 w-7 rounded-md border border-zinc-700 object-cover"
                    loading="lazy"
                  />
                ) : null}
                <h1 className="truncate text-lg font-semibold text-zinc-50">{restaurantName}</h1>
              </div>
              {branding?.tagline ? (
                <p className="mt-0.5 truncate text-xs text-zinc-400">{branding.tagline}</p>
              ) : null}
            </div>

            <div className="rounded-xl border border-amber-200/30 bg-amber-300/10 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-[0.16em] text-amber-100/80">Table</p>
              <p className="text-sm font-semibold text-amber-100">{tableLabel}</p>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-300/20 bg-red-500/10 p-4 text-red-100">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Issue</p>
              <p className="mt-1 text-sm text-red-100/85">{errorMessage}</p>
            </div>
          </div>
        ) : null}

        {noticeMessage ? (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300/25 bg-amber-500/10 p-4 text-amber-100">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Note</p>
              <p className="mt-1 text-sm text-amber-100/90">{noticeMessage}</p>
            </div>
          </div>
        ) : null}

        {orderPlacedId ? (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-4 text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Order Confirmed | Order Confirm Ho Gaya</p>
              <p className="mt-1 text-sm text-emerald-100/90">
                Order ID: <span className="font-mono">{orderPlacedId}</span>
              </p>
            </div>
          </div>
        ) : null}

        <section className="mb-4 rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 text-amber-200">
            <Sparkles className="h-4 w-4" />
            <p className="text-sm font-medium">Fresh Picks For Your Table</p>
          </div>
          <p className="mt-1 text-sm text-zinc-300/90">
            Menu browse karein, cart mein add karein, aur direct kitchen ko order bhejein.
          </p>
        </section>

        <section className="mb-4">
          <label
            htmlFor="menu-search"
            className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-400"
          >
            Search Food
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              id="menu-search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search item | Item dhundhein"
              className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
              inputMode="search"
            />
          </div>
        </section>

        <section className="sticky top-[92px] z-10 mb-4 -mx-1 overflow-x-auto px-1">
          <div className="inline-flex min-w-full gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/75 p-1 backdrop-blur">
            <button
              type="button"
              className={clsx(
                "flex-none rounded-xl px-4 py-2 text-sm font-medium transition",
                activeCategory === "all"
                  ? "bg-emerald-400 text-zinc-900"
                  : "bg-zinc-950/60 text-zinc-300 hover:bg-zinc-800",
              )}
              onClick={() => setActiveCategory("all")}
            >
              All | Sab
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={clsx(
                  "flex-none rounded-xl px-4 py-2 text-sm font-medium transition",
                  activeCategory === category.id
                    ? "bg-emerald-400 text-zinc-900"
                    : "bg-zinc-950/60 text-zinc-300 hover:bg-zinc-800",
                )}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </section>

        {visibleItems.length === 0 ? (
          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-5 text-sm text-zinc-300">
            {menuItems.length === 0
              ? "Abhi menu items available nahi hain. Staff se please check karein."
              : "Search ya category ke hisaab se koi item nahi mila. Dusri category try karein."}
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visibleItems.map((item) => {
              const quantity = cart[item.id] ?? 0;
              const hasImage = !!item.image && !brokenImageMap[item.id];

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/65 shadow-[0_18px_40px_-30px_rgba(251,191,36,0.42)]"
                >
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-800 to-zinc-950">
                    {hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={() =>
                          setBrokenImageMap((current) => ({ ...current, [item.id]: true }))
                        }
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-500">
                        <ShoppingBag className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex gap-2">
                      {item.isVeg ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-400/20 px-2 py-1 text-[11px] font-medium text-emerald-100">
                          <Leaf className="h-3 w-3" />
                          Veg
                        </span>
                      ) : null}
                      {item.isSpicy ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-300/30 bg-red-400/20 px-2 py-1 text-[11px] font-medium text-red-100">
                          <Flame className="h-3 w-3" />
                          Spicy
                        </span>
                      ) : null}
                      {item.isBestseller ? (
                        <span className="rounded-full border border-amber-300/35 bg-amber-300/20 px-2 py-1 text-[11px] font-medium text-amber-100">
                          Bestseller
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div>
                      <h3 className="line-clamp-1 text-base font-semibold text-zinc-100">{item.name}</h3>
                      <p className="line-clamp-1 text-sm text-zinc-400">{item.nameHi}</p>
                    </div>

                    {item.description ? (
                      <p className="line-clamp-2 min-h-10 text-sm text-zinc-300/85">{item.description}</p>
                    ) : (
                      <div className="min-h-10" />
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-semibold text-amber-100">{formatInr(item.price)}</p>

                      {quantity === 0 ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 active:scale-[0.98]"
                          onClick={() => {
                            updateItemQuantity(item.id, 1);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </button>
                      ) : (
                        <div className="inline-flex items-center rounded-xl border border-zinc-700 bg-zinc-950/70">
                          <button
                            type="button"
                            className="p-2 text-zinc-200 transition hover:bg-zinc-800"
                            onClick={() => updateItemQuantity(item.id, -1)}
                            aria-label={`Remove one ${item.name}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-zinc-100">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            className="p-2 text-zinc-200 transition hover:bg-zinc-800"
                            onClick={() => updateItemQuantity(item.id, 1)}
                            aria-label={`Add one ${item.name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 sm:px-6">
        <button
          type="button"
          className="mx-auto flex w-full max-w-4xl items-center justify-between rounded-2xl border border-emerald-200/30 bg-emerald-400 px-4 py-3 text-zinc-950 shadow-[0_18px_40px_-20px_rgba(16,185,129,0.8)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => setCartOpen(true)}
          disabled={cartCount === 0}
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <ShoppingBag className="h-5 w-5" />
            Cart {cartCount > 0 ? `(${cartCount})` : ""}
          </span>
          <span className="rounded-lg bg-zinc-900/15 px-2 py-1 text-xs font-semibold">
            {formatInr(total)}
          </span>
        </button>
      </div>

      {cartOpen ? (
        <div className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setCartOpen(false)}
            aria-label="Close cart"
          />

          <aside className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-hidden rounded-t-3xl border border-zinc-700/80 bg-zinc-950 text-zinc-100 md:bottom-4 md:left-auto md:right-4 md:top-4 md:w-[430px] md:max-h-[unset] md:rounded-3xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4">
                <h2 className="text-lg font-semibold">Your Cart | Aapka Cart</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                    onClick={clearCart}
                    disabled={cartCount === 0}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 transition hover:bg-zinc-800"
                    onClick={() => setCartOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {cartItems.length === 0 ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
                    Cart empty hai. Apni favorite dish add karein.
                  </div>
                ) : (
                  cartItems.map(({ item, quantity }) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-100">{item.name}</p>
                          <p className="mt-0.5 text-xs text-zinc-400">{item.nameHi}</p>
                        </div>
                        <p className="text-sm font-semibold text-amber-100">
                          {formatInr(item.price * quantity)}
                        </p>
                      </div>

                      <div className="mt-3 inline-flex items-center rounded-xl border border-zinc-700 bg-zinc-950/70">
                        <button
                          type="button"
                          className="p-2 text-zinc-200 transition hover:bg-zinc-800"
                          onClick={() => updateItemQuantity(item.id, -1)}
                          aria-label={`Remove one ${item.name}`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-zinc-100">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          className="p-2 text-zinc-200 transition hover:bg-zinc-800"
                          onClick={() => updateItemQuantity(item.id, 1)}
                          aria-label={`Add one ${item.name}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-4 border-t border-zinc-800 px-4 py-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-zinc-300">
                    Payment Method | Payment Ka Tareeka
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["COUNTER", "UPI"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        className={clsx(
                          "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                          paymentMethod === method
                            ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
                            : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800",
                        )}
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
                </div>

                <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Subtotal</span>
                    <span className="font-semibold text-zinc-100">{formatInr(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Total</span>
                    <span className="font-semibold text-amber-100">{formatInr(total)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handlePlaceOrder}
                  disabled={cartCount === 0 || placingOrder}
                >
                  {placingOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    "Place Order | Order Bhejein"
                  )}
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
