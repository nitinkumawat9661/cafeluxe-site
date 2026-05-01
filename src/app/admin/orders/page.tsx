"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import {
  appwriteConfig,
  fetchAllDocuments,
  Query,
} from "@/lib/appwrite";
import { WEBSITE_COLORS } from "@/lib/design-tokens";
import { formatInr, parseTables } from "@/lib/menu";

type AdminOrderRecord = {
  id: string;
  clientId: string;
  tableId: string;
  tableNo: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  utrNumber: string;
  createdAt: string;
  updatedAt: string;
};

const ADMIN_CLIENT_ID = "trustfirst_demo";

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

function toTimestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readOrderRecord(doc: Record<string, unknown>): AdminOrderRecord | null {
  const id = toSafeString(doc.$id);
  if (!id) {
    return null;
  }

  return {
    id,
    clientId: toSafeString(doc.client_id),
    tableId: toSafeString(doc.table_id),
    tableNo: toSafeString(doc.table_no),
    orderNumber: toSafeString(doc.order_number) || `ORD-${id.slice(-6).toUpperCase()}`,
    status: toSafeString(doc.status) || "PLACED",
    paymentStatus: toSafeString(doc.payment_status) || "UNPAID",
    paymentMethod: toSafeString(doc.payment_method) || "COUNTER",
    totalAmount: toAmount(doc.total_amount ?? doc.subtotal),
    utrNumber: toSafeString(doc.utr_number ?? doc.utrNumber),
    createdAt: toSafeString(doc.created_at_custom ?? doc.$createdAt) || new Date().toISOString(),
    updatedAt: toSafeString(doc.$updatedAt ?? doc.updated_at) || new Date().toISOString(),
  };
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
          Query.equal("active", [true]),
          Query.orderDesc("$createdAt"),
        ],
      });
      const tables = parseTables(tableDocs, ADMIN_CLIENT_ID);

      const orderDocsByTable = await Promise.all(
        tables.map((table) =>
          fetchAllDocuments(appwriteConfig.collections.orders, {
            pageSize: 50,
            maxDocs: 100,
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
        .filter(
          (order) =>
            order.paymentStatus.trim().toUpperCase() === "PENDING_VERIFICATION" &&
            !!order.utrNumber,
        )
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

  const pendingCount = orders.length;
  const palette = WEBSITE_COLORS;

  const groupedOrders = useMemo(() => {
    return orders.reduce(
      (accumulator, order) => {
        const key = order.tableNo || order.tableId || "Unknown Table";
        if (!accumulator[key]) {
          accumulator[key] = [];
        }
        accumulator[key].push(order);
        return accumulator;
      },
      {} as Record<string, AdminOrderRecord[]>,
    );
  }, [orders]);

  async function handleApprove(order: AdminOrderRecord) {
    if (!approvalPin.trim()) {
      setMessage("Enter the admin approval PIN to verify UTR payments.");
      return;
    }

    setApprovingOrderId(order.id);
    setMessage("");

    try {
      const response = await fetch("/api/appwrite/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          collectionId: appwriteConfig.collections.orders,
          documentId: order.id,
          adminPin: approvalPin.trim(),
          documentData: {
            payment_status: "COMPLETED",
          },
        }),
      });

      if (!response.ok) {
        throw new Error(await readRouteError(response));
      }

      setOrders((current) => current.filter((entry) => entry.id !== order.id));
      setMessage(`${order.orderNumber} approved and marked completed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to approve payment.");
    } finally {
      setApprovingOrderId("");
    }
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
                Review submitted UTR numbers and approve completed customer payments.
              </p>
            </div>
            <div className="rounded-2xl border px-4 py-3 text-right" style={{ borderColor: `${palette.accent}55`, backgroundColor: "#fffaf5" }}>
              <p className="text-xs uppercase tracking-[0.14em]" style={{ color: palette.secondaryText }}>
                Pending
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
        ) : pendingCount === 0 ? (
          <section
            className="rounded-3xl border p-6 text-sm"
            style={{ borderColor: `${palette.accent}45`, backgroundColor: "#fffdf9" }}
          >
            No UTR submissions are waiting for approval right now.
          </section>
        ) : (
          <section className="space-y-4">
            {Object.entries(groupedOrders).map(([tableKey, tableOrders]) => (
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
                    {tableOrders.length} pending
                  </span>
                </div>

                <div className="space-y-3">
                  {tableOrders.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-2xl border p-4"
                      style={{ borderColor: `${palette.accent}40`, backgroundColor: palette.background }}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold">{order.orderNumber}</span>
                            <span
                              className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                              style={{
                                borderColor: `${palette.accent}55`,
                                backgroundColor: `${palette.accent}18`,
                                color: palette.text,
                              }}
                            >
                              {order.paymentStatus.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-sm" style={{ color: palette.secondaryText }}>
                            {order.paymentMethod || "UPI"} • {formatInr(order.totalAmount || 0)}
                          </p>
                          <p className="text-sm">
                            <span style={{ color: palette.secondaryText }}>UTR:</span>{" "}
                            <span className="font-semibold">{order.utrNumber}</span>
                          </p>
                          <p className="text-xs" style={{ color: palette.secondaryText }}>
                            Updated {new Date(order.updatedAt || order.createdAt).toLocaleString("en-IN")}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={approvingOrderId === order.id}
                          className={clsx(
                            "h-11 rounded-2xl border px-4 text-sm font-semibold transition",
                            approvingOrderId === order.id ? "cursor-not-allowed opacity-70" : "",
                          )}
                          style={{
                            borderColor: `${palette.accent}70`,
                            backgroundColor: palette.accent,
                            color: palette.text,
                          }}
                          onClick={() => void handleApprove(order)}
                        >
                          {approvingOrderId === order.id ? "Approving..." : "Approve"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
