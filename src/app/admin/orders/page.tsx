"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultClientId } from "@/lib/tenant";
import clsx from "clsx";

import {
  appwriteConfig,
  fetchAllDocuments,
  Query,
  subscribeToCollectionDocuments,
} from "@/lib/appwrite";
import { WEBSITE_COLORS } from "@/lib/design-tokens";
import { formatInr, parseTables } from "@/lib/menu";

type AdminBillItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type AdminOrderRecord = {
  id: string;
  clientId: string;
  tableId: string;
  tableNo: string;
  orderNumber: string;
  sessionId: string;
  billId: string;
  orderRound: number;
  isAddMore: boolean;
  kotStatus: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  utrNumber: string;
  items: AdminBillItem[];
  createdAt: string;
  updatedAt: string;
};

type AdminBillRecord = {
  key: string;
  clientId: string;
  tableId: string;
  tableNo: string;
  billId: string;
  sessionId: string;
  orderNumbers: string[];
  orders: AdminOrderRecord[];
  items: AdminBillItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  utrNumber: string;
  createdAt: string;
  updatedAt: string;
  needsApproval: boolean;
  isPaid: boolean;
};

const ADMIN_CLIENT_ID = defaultClientId;
const PAID_PAYMENT_STATUSES = new Set(["PAID", "SETTLED", "COMPLETED"]);

function toSafeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }
  return false;
}

function toTimestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundAmount(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizePaymentStatus(status: string) {
  return status.trim().toUpperCase();
}

function isPaidPaymentStatus(status: string) {
  return PAID_PAYMENT_STATUSES.has(normalizePaymentStatus(status));
}

function isPendingVerification(status: string) {
  return normalizePaymentStatus(status) === "PENDING_VERIFICATION";
}

function parseItemArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as Record<string, unknown>).items)
    ) {
      return (parsed as Record<string, unknown>).items as unknown[];
    }
  } catch {
    return [];
  }

  return [];
}

function parseBillItems(value: unknown): AdminBillItem[] {
  return parseItemArray(value)
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const source = entry as Record<string, unknown>;
      const id =
        toSafeString(source.item_id) ||
        toSafeString(source.itemId) ||
        toSafeString(source.id) ||
        toSafeString(source.$id);
      const name =
        toSafeString(source.item_name) ||
        toSafeString(source.itemName) ||
        toSafeString(source.name) ||
        id ||
        "Item";
      const rawQuantity = toAmount(source.quantity ?? source.qty ?? source.count);
      const quantity = rawQuantity > 0 ? rawQuantity : 1;
      const unitPrice = toAmount(
        source.unit_price ??
          source.unitPrice ??
          source.price ??
          source.base_unit_price ??
          source.baseUnitPrice,
      );
      const storedLineTotal = toAmount(
        source.line_total ?? source.lineTotal ?? source.total ?? source.amount,
      );
      const lineTotal = storedLineTotal > 0 ? storedLineTotal : unitPrice * quantity;

      return {
        id: id || name,
        name,
        quantity,
        unitPrice,
        lineTotal: roundAmount(lineTotal),
      } satisfies AdminBillItem;
    })
    .filter((item): item is AdminBillItem => !!item);
}

function mergeBillItems(items: AdminBillItem[]) {
  const merged = new Map<string, AdminBillItem>();

  for (const item of items) {
    const key = `${item.id || item.name}:${item.name}:${item.unitPrice.toFixed(2)}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity = roundAmount(existing.quantity + item.quantity);
      existing.lineTotal = roundAmount(existing.lineTotal + item.lineTotal);
    } else {
      merged.set(key, { ...item });
    }
  }

  return [...merged.values()];
}

function readOrderRecord(doc: Record<string, unknown>): AdminOrderRecord | null {
  const id = toSafeString(doc.$id);
  if (!id) {
    return null;
  }

  const cgstAmount = toAmount(doc.cgst_amount);
  const sgstAmount = toAmount(doc.sgst_amount);
  const storedTaxAmount = toAmount(doc.tax_amount);
  const taxAmount = storedTaxAmount > 0 ? storedTaxAmount : cgstAmount + sgstAmount;
  const discountAmount = toAmount(doc.discount_amount);
  const totalAmount = toAmount(doc.total_amount ?? doc.payable_amount ?? doc.subtotal);
  const subtotal =
    toAmount(doc.subtotal) || Math.max(0, totalAmount + discountAmount - taxAmount);

  return {
    id,
    clientId: toSafeString(doc.client_id),
    tableId: toSafeString(doc.table_id),
    tableNo: toSafeString(doc.table_number) || toSafeString(doc.table_no),
    orderNumber: toSafeString(doc.order_number) || `ORD-${id.slice(-6).toUpperCase()}`,
    sessionId: toSafeString(doc.session_id),
    billId: toSafeString(doc.bill_id),
    orderRound: Math.max(0, Math.trunc(toAmount(doc.order_round))),
    isAddMore: toBoolean(doc.is_add_more),
    kotStatus: toSafeString(doc.kot_status),
    status: toSafeString(doc.status) || "PLACED",
    paymentStatus: toSafeString(doc.payment_status) || "UNPAID",
    paymentMethod: toSafeString(doc.payment_method) || "COUNTER",
    subtotal: roundAmount(subtotal),
    discountAmount: roundAmount(discountAmount),
    taxAmount: roundAmount(taxAmount),
    cgstAmount: roundAmount(cgstAmount),
    sgstAmount: roundAmount(sgstAmount),
    totalAmount: roundAmount(totalAmount),
    utrNumber: toSafeString(doc.utr_number ?? doc.utrNumber),
    items: parseBillItems(doc.items ?? doc.items_json ?? doc.order_items),
    createdAt: toSafeString(doc.created_at_custom ?? doc.$createdAt) || new Date().toISOString(),
    updatedAt: toSafeString(doc.$updatedAt ?? doc.updated_at) || new Date().toISOString(),
  };
}

function buildBillRecords(orders: AdminOrderRecord[]) {
  const bills = new Map<string, AdminBillRecord>();
  const ordered = [...orders].sort(
    (left, right) => toTimestamp(left.createdAt) - toTimestamp(right.createdAt),
  );

  for (const order of ordered) {
    const key =
      order.billId && order.sessionId
        ? `${order.billId}::${order.sessionId}`
        : `order::${order.id}`;
    const existing =
      bills.get(key) ??
      ({
        key,
        clientId: order.clientId,
        tableId: order.tableId,
        tableNo: order.tableNo || order.tableId || "Unknown Table",
        billId: order.billId,
        sessionId: order.sessionId,
        orderNumbers: [],
        orders: [],
        items: [],
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        totalAmount: 0,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        utrNumber: "",
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        needsApproval: false,
        isPaid: false,
      } satisfies AdminBillRecord);

    existing.orders.push(order);
    existing.orderNumbers.push(order.orderNumber);
    existing.items.push(...order.items);
    existing.subtotal = roundAmount(existing.subtotal + order.subtotal);
    existing.discountAmount = roundAmount(existing.discountAmount + order.discountAmount);
    existing.taxAmount = roundAmount(existing.taxAmount + order.taxAmount);
    existing.cgstAmount = roundAmount(existing.cgstAmount + order.cgstAmount);
    existing.sgstAmount = roundAmount(existing.sgstAmount + order.sgstAmount);
    existing.totalAmount = roundAmount(existing.totalAmount + order.totalAmount);
    existing.createdAt =
      toTimestamp(order.createdAt) < toTimestamp(existing.createdAt)
        ? order.createdAt
        : existing.createdAt;
    existing.updatedAt =
      toTimestamp(order.updatedAt) > toTimestamp(existing.updatedAt)
        ? order.updatedAt
        : existing.updatedAt;

    bills.set(key, existing);
  }

  return [...bills.values()]
    .map((bill) => {
      const paymentMethods = [
        ...new Set(bill.orders.map((order) => order.paymentMethod).filter(Boolean)),
      ];
      const utrNumbers = [
        ...new Set(bill.orders.map((order) => order.utrNumber).filter(Boolean)),
      ];
      const hasPendingVerification = bill.orders.some(
        (order) => isPendingVerification(order.paymentStatus) && !!order.utrNumber,
      );
      const allPaid = bill.orders.length > 0 && bill.orders.every((order) =>
        isPaidPaymentStatus(order.paymentStatus),
      );

      return {
        ...bill,
        items: mergeBillItems(bill.items),
        paymentMethod: paymentMethods.length > 1 ? "MIXED" : paymentMethods[0] || "COUNTER",
        paymentStatus: allPaid
          ? "COMPLETED"
          : hasPendingVerification
            ? "PENDING_VERIFICATION"
            : bill.orders[0]?.paymentStatus || "UNPAID",
        utrNumber: utrNumbers.join(", "),
        needsApproval: hasPendingVerification,
        isPaid: allPaid,
      } satisfies AdminBillRecord;
    })
    .sort((left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt));
}

async function readRouteError(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string; error?: string };
    return payload.message || payload.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export default function AdminOrdersPage() {
  const [approvalPin, setApprovalPin] = useState("");
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingOrderId, setApprovingOrderId] = useState("");
  const [disablingTables, setDisablingTables] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPendingVerificationOrders() {
    setLoading(true);
    setMessage("");

    try {
      const tableDocs = await fetchAllDocuments(appwriteConfig.collections.tables, {
        pageSize: 50,
        maxDocs: 100,
        queries: [
          Query.equal("client_id", [ADMIN_CLIENT_ID]),
          Query.equal("is_active", [true]),
          Query.orderDesc("$createdAt"),
        ],
      });
      const tables = parseTables(tableDocs, ADMIN_CLIENT_ID);

      const orderDocsByTable = await Promise.all(
        tables.map((table) =>
          fetchAllDocuments(appwriteConfig.collections.orders, {
            pageSize: 100,
            maxDocs: 250,
            queries: [
              Query.equal("client_id", [ADMIN_CLIENT_ID]),
              Query.equal("table_id", [table.id]),
              Query.orderDesc("$createdAt"),
            ],
          }).catch(() => []),
        ),
      );

      const nextOrders = orderDocsByTable
        .flat()
        .map((doc) => readOrderRecord(doc))
        .filter((entry): entry is AdminOrderRecord => !!entry)
        .sort((left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt));

      setOrders(nextOrders);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load verification orders.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadPendingVerificationOrders();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToCollectionDocuments(
      appwriteConfig.collections.orders,
      (message) => {
        const payload = message.payload;
        if (!payload) return;

        const order = readOrderRecord(payload);
        if (!order || order.clientId !== ADMIN_CLIENT_ID) return;

        const isDeleteEvent = message.events?.some((event) => event.includes(".delete"));

        setOrders((current) => {
          if (isDeleteEvent) {
            return current.filter((entry) => entry.id !== order.id);
          }

          const next = current.filter((entry) => entry.id !== order.id);
          return [order, ...next].sort(
            (left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt),
          );
        });
      },
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const billRecords = useMemo(() => buildBillRecords(orders), [orders]);
  const pendingBills = useMemo(
    () => billRecords.filter((bill) => bill.needsApproval),
    [billRecords],
  );
  const completedBills = useMemo(
    () => billRecords.filter((bill) => bill.isPaid).slice(0, 30),
    [billRecords],
  );
  const pendingCount = pendingBills.length;
  const palette = WEBSITE_COLORS;

  const groupedPendingBills = useMemo(() => {
    return pendingBills.reduce(
      (accumulator, bill) => {
        const key = bill.tableNo || bill.tableId || "Unknown Table";
        if (!accumulator[key]) {
          accumulator[key] = [];
        }
        accumulator[key].push(bill);
        return accumulator;
      },
      {} as Record<string, AdminBillRecord[]>,
    );
  }, [pendingBills]);

  async function handleApprove(bill: AdminBillRecord) {
    if (!approvalPin.trim()) {
      setMessage("Enter the admin approval PIN to verify UTR payments.");
      return;
    }

    const approvalOrder =
      bill.orders.find(
        (order) => isPendingVerification(order.paymentStatus) && !!order.utrNumber,
      ) ?? bill.orders[0];
    if (!approvalOrder) {
      setMessage("No order is available for this bill.");
      return;
    }

    setApprovingOrderId(bill.key);
    setMessage("");

    try {
      const response = await fetch("/api/appwrite/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          collectionId: appwriteConfig.collections.orders,
          documentId: approvalOrder.id,
          adminPin: approvalPin.trim(),
          documentData: {
            payment_status: "COMPLETED",
          },
        }),
      });

      if (!response.ok) {
        throw new Error(await readRouteError(response));
      }

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const updatedOrderIds = Array.isArray(payload.updated_order_ids)
        ? payload.updated_order_ids.filter((value): value is string => typeof value === "string")
        : bill.orders.map((order) => order.id);
      const updatedIdSet = new Set(updatedOrderIds);
      const nowIso = new Date().toISOString();

      setOrders((current) =>
        current.map((entry) =>
          updatedIdSet.has(entry.id)
            ? {
                ...entry,
                paymentStatus: "COMPLETED",
                updatedAt: nowIso,
              }
            : entry,
        ),
      );
      setMessage(
        `${bill.billId || approvalOrder.orderNumber} approved. ${updatedIdSet.size} order(s) marked paid and table session closed.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to approve payment.");
    } finally {
      setApprovingOrderId("");
    }
  }

  async function handleDisableAllTables() {
    setMessage("");
    const confirmed = window.confirm("Are you sure you want to disable all tables?");
    if (!confirmed) {
      return;
    }

    setDisablingTables(true);

    try {
      const response = await fetch("/api/admin/disable-all-tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await readRouteError(response));
      }

      await response.json().catch(() => ({}));
      setMessage("All tables were disabled successfully. No active tables should appear on the website.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to disable all tables.");
    } finally {
      setDisablingTables(false);
    }
  }

  function renderBillItems(bill: AdminBillRecord) {
    const visibleItems = bill.items.slice(0, 5);

    if (visibleItems.length === 0) {
      return (
        <p className="text-sm" style={{ color: palette.secondaryText }}>
          Item details are not available on this order snapshot.
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {visibleItems.map((item) => (
          <div key={`${bill.key}_${item.id}_${item.name}`} className="flex items-start justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs" style={{ color: palette.secondaryText }}>
                Qty {item.quantity} x {formatInr(item.unitPrice || 0)}
              </p>
            </div>
            <p className="font-semibold">{formatInr(item.lineTotal || 0)}</p>
          </div>
        ))}
        {bill.items.length > visibleItems.length ? (
          <p className="text-xs" style={{ color: palette.secondaryText }}>
            +{bill.items.length - visibleItems.length} more item(s)
          </p>
        ) : null}
      </div>
    );
  }

  function renderBillTotals(bill: AdminBillRecord) {
    return (
      <div className="space-y-2 rounded-2xl border p-3 text-sm" style={{ borderColor: `${palette.accent}35`, backgroundColor: "#fffaf5" }}>
        <div className="flex items-center justify-between gap-3">
          <span style={{ color: palette.secondaryText }}>Item Total</span>
          <span>{formatInr(bill.subtotal || 0)}</span>
        </div>
        {bill.discountAmount > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <span style={{ color: palette.secondaryText }}>Discount</span>
            <span>-{formatInr(bill.discountAmount)}</span>
          </div>
        ) : null}
        {bill.cgstAmount > 0 || bill.sgstAmount > 0 ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <span style={{ color: palette.secondaryText }}>CGST</span>
              <span>{formatInr(bill.cgstAmount || 0)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span style={{ color: palette.secondaryText }}>SGST</span>
              <span>{formatInr(bill.sgstAmount || 0)}</span>
            </div>
          </>
        ) : bill.taxAmount > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <span style={{ color: palette.secondaryText }}>Tax</span>
            <span>{formatInr(bill.taxAmount)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-t pt-2 font-semibold" style={{ borderColor: `${palette.accent}35` }}>
          <span>To Pay</span>
          <span>{formatInr(bill.totalAmount || 0)}</span>
        </div>
      </div>
    );
  }

  function renderBillCard(bill: AdminBillRecord, mode: "pending" | "record") {
    const isApproving = approvingOrderId === bill.key;

    return (
      <article
        key={bill.key}
        className="rounded-2xl border p-4"
        style={{ borderColor: `${palette.accent}40`, backgroundColor: palette.background }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold">
                {bill.billId || bill.orderNumbers[0] || "Bill"}
              </span>
              <span
                className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                style={{
                  borderColor: `${palette.accent}55`,
                  backgroundColor: `${palette.accent}18`,
                  color: palette.text,
                }}
              >
                {bill.paymentStatus.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-sm" style={{ color: palette.secondaryText }}>
              {bill.orders.length} order(s) - {bill.paymentMethod} - {formatInr(bill.totalAmount || 0)}
            </p>
            <p className="text-xs" style={{ color: palette.secondaryText }}>
              Orders: {bill.orderNumbers.join(", ")}
            </p>
            {bill.utrNumber ? (
              <p className="text-sm">
                <span style={{ color: palette.secondaryText }}>UTR:</span>{" "}
                <span className="font-semibold">{bill.utrNumber}</span>
              </p>
            ) : null}
            <p className="text-xs" style={{ color: palette.secondaryText }}>
              Updated {new Date(bill.updatedAt || bill.createdAt).toLocaleString("en-IN")}
            </p>
            {renderBillItems(bill)}
          </div>

          <div className="w-full space-y-3 lg:w-72">
            {renderBillTotals(bill)}
            {mode === "pending" ? (
              <button
                type="button"
                disabled={isApproving}
                className={clsx(
                  "h-11 w-full rounded-2xl border px-4 text-sm font-semibold transition",
                  isApproving ? "cursor-not-allowed opacity-70" : "",
                )}
                style={{
                  borderColor: `${palette.accent}70`,
                  backgroundColor: palette.accent,
                  color: palette.text,
                }}
                onClick={() => void handleApprove(bill)}
              >
                {isApproving ? "Approving..." : "Approve Bill"}
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <main
      className="min-h-screen px-4 py-6 sm:px-6"
      style={{ backgroundColor: palette.background, color: palette.text }}
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <header
          className="rounded-3xl border p-5 shadow-[0_18px_45px_rgba(46,42,38,0.08)]"
          style={{
            borderColor: `${palette.accent}55`,
            background: `linear-gradient(180deg, ${palette.surface} 0%, ${palette.background} 100%)`,
          }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: palette.secondaryText }}
              >
                Website Admin
              </p>
              <h1 className="mt-2 text-3xl font-semibold">UTR Verification Queue</h1>
              <p className="mt-2 text-sm" style={{ color: palette.secondaryText }}>
                Verify submitted UTR numbers by bill, not by separate order rounds.
              </p>
            </div>
            <div className="rounded-2xl border px-4 py-3 text-right" style={{ borderColor: `${palette.accent}55`, backgroundColor: "#fffaf5" }}>
              <p className="text-xs uppercase tracking-[0.14em]" style={{ color: palette.secondaryText }}>
                Pending Bills
              </p>
              <p className="mt-1 text-2xl font-semibold">{pendingCount}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="password"
              value={approvalPin}
              onChange={(event) => setApprovalPin(event.target.value)}
              placeholder="Enter admin approval PIN"
              className="h-11 flex-1 rounded-2xl border px-4 text-sm outline-none"
              style={{
                borderColor: `${palette.accent}55`,
                backgroundColor: "#fffdf9",
              }}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className="h-11 rounded-2xl border px-4 text-sm font-semibold transition"
                style={{
                  borderColor: `${palette.accent}70`,
                  backgroundColor: palette.accent,
                  color: palette.text,
                }}
                onClick={() => {
                  setRefreshing(true);
                  void loadPendingVerificationOrders();
                }}
              >
                {refreshing ? "Refreshing..." : "Refresh Queue"}
              </button>
              <button
                type="button"
                className="h-11 rounded-2xl border px-4 text-sm font-semibold transition"
                style={{
                  borderColor: `${palette.accent}70`,
                  backgroundColor: "#ffe8e0",
                  color: "#892b1a",
                }}
                onClick={() => void handleDisableAllTables()}
                disabled={disablingTables}
              >
                {disablingTables ? "Disabling..." : "Disable All Tables"}
              </button>
            </div>
          </div>
          {message ? (
            <p className="mt-3 text-sm" style={{ color: palette.secondaryText }}>
              {message}
            </p>
          ) : null}
        </header>

        {loading ? (
          <section
            className="rounded-3xl border p-6 text-sm"
            style={{ borderColor: `${palette.accent}45`, backgroundColor: "#fffdf9" }}
          >
            Loading verification orders...
          </section>
        ) : (
          <>
            {pendingCount === 0 ? (
              <section
                className="rounded-3xl border p-6 text-sm"
                style={{ borderColor: `${palette.accent}45`, backgroundColor: "#fffdf9" }}
              >
                No UTR submissions are waiting for approval right now.
              </section>
            ) : (
              <section className="space-y-4">
                {Object.entries(groupedPendingBills).map(([tableKey, tableBills]) => (
                  <div
                    key={tableKey}
                    className="rounded-3xl border p-4 shadow-[0_18px_40px_rgba(46,42,38,0.06)]"
                    style={{ borderColor: `${palette.accent}45`, backgroundColor: "#fffdf9" }}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em]" style={{ color: palette.secondaryText }}>
                          Table
                        </p>
                        <h2 className="text-xl font-semibold">{tableKey}</h2>
                      </div>
                      <span
                        className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]"
                        style={{ borderColor: `${palette.accent}55`, backgroundColor: `${palette.accent}22`, color: palette.text }}
                      >
                        {tableBills.length} pending
                      </span>
                    </div>

                    <div className="space-y-3">
                      {tableBills.map((bill) => renderBillCard(bill, "pending"))}
                    </div>
                  </div>
                ))}
              </section>
            )}

            <section
              className="rounded-3xl border p-4 shadow-[0_18px_40px_rgba(46,42,38,0.06)]"
              style={{ borderColor: `${palette.accent}45`, backgroundColor: "#fffdf9" }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em]" style={{ color: palette.secondaryText }}>
                    Business Records
                  </p>
                  <h2 className="text-xl font-semibold">Completed Bills</h2>
                </div>
                <span
                  className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]"
                  style={{ borderColor: `${palette.accent}55`, backgroundColor: `${palette.accent}22`, color: palette.text }}
                >
                  {completedBills.length} shown
                </span>
              </div>

              {completedBills.length === 0 ? (
                <p className="rounded-2xl border p-4 text-sm" style={{ borderColor: `${palette.accent}35`, backgroundColor: palette.background, color: palette.secondaryText }}>
                  No completed bill records are available yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {completedBills.map((bill) => renderBillCard(bill, "record"))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
