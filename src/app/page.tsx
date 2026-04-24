"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { appwriteConfig, fetchAllDocuments, Query } from "@/lib/appwrite";
import { parseClientSettings, parseTables, type RestaurantSettings, type RestaurantTable } from "@/lib/menu";

const ROOT_CLIENT_ID = "trustfirst_demo";

type HomeLoadState = "loading" | "ready" | "error";

function getRouteTableToken(table: RestaurantTable) {
  return (table.tableCode || table.tableNo || table.id).trim();
}

export default function Home() {
  const royalNavy = "#0C1F37";
  const luxuryGold = "#C6A05C";
  const warmHighlight = "#E7C98A";
  const [loadState, setLoadState] = useState<HomeLoadState>("loading");
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadHomepageData() {
      setLoadState("loading");
      setErrorMessage("");

      try {
        const [tableDocs, settingsDocs] = await Promise.all([
          fetchAllDocuments(appwriteConfig.collections.tables, {
            pageSize: 120,
            maxDocs: 400,
            queries: [Query.equal("client_id", [ROOT_CLIENT_ID]), Query.limit(120)],
            timeoutMs: 12000,
          }),
          fetchAllDocuments(appwriteConfig.collections.settings, {
            pageSize: 120,
            maxDocs: 200,
            queries: [Query.equal("client_id", [ROOT_CLIENT_ID]), Query.limit(120)],
            timeoutMs: 12000,
          }).catch(() => []),
        ]);

        if (cancelled) {
          return;
        }

        const liveTables = parseTables(tableDocs, ROOT_CLIENT_ID);
        const liveSettings = parseClientSettings(settingsDocs, ROOT_CLIENT_ID);

        setTables(liveTables);
        setSettings(liveSettings);
        setLoadState("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error(error);
        setLoadState("error");
        setErrorMessage("Unable to load live tables right now. Please retry.");
      }
    }

    void loadHomepageData();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const restaurantName = settings?.restaurantName?.trim() || "Cafe Luxe";
  const supportPhone = settings?.supportPhone?.trim() || "";

  return (
    <div
      className="relative min-h-screen overflow-hidden px-4 py-8 text-zinc-900"
      style={{
        background:
          "radial-gradient(1200px 520px at 20% -20%, rgba(231,201,138,0.45) 0%, rgba(255,255,255,0) 55%), linear-gradient(180deg, #fdf8ef 0%, #f5ead8 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(12,31,55,0.03)_0%,rgba(255,255,255,0)_42%,rgba(198,160,92,0.08)_100%)]" />

      <main className="relative mx-auto w-full max-w-md">
        <section
          className="mb-5 rounded-3xl border p-6 shadow-[0_28px_70px_-42px_rgba(12,31,55,0.45)]"
          style={{
            borderColor: "rgba(198,160,92,0.36)",
            background: "linear-gradient(165deg, rgba(255,251,243,0.94) 0%, rgba(246,234,213,0.95) 100%)",
          }}
        >
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: royalNavy }}>
            {restaurantName}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[0.02em]" style={{ color: royalNavy }}>
            Select Your Table
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Tap your table to open the live menu and order instantly.
          </p>
          {supportPhone ? (
            <p className="mt-3 text-xs text-zinc-500">
              Support: <span className="font-medium text-zinc-700">{supportPhone}</span>
            </p>
          ) : null}
        </section>

        {loadState === "loading" ? (
          <section
            className="flex items-center gap-3 rounded-2xl border p-4 text-sm"
            style={{
              borderColor: "rgba(12,31,55,0.14)",
              background: "rgba(255,252,246,0.9)",
              color: royalNavy,
            }}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading live tables...
          </section>
        ) : null}

        {loadState === "error" ? (
          <section
            className="rounded-2xl border p-4"
            style={{
              borderColor: "rgba(185,28,28,0.25)",
              background: "rgba(255,246,246,0.95)",
              color: "#9f1239",
            }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Unable To Load Tables</p>
                <p className="mt-1 text-sm text-rose-700">{errorMessage}</p>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition"
                  style={{
                    borderColor: "rgba(159,18,57,0.28)",
                    color: "#9f1239",
                    backgroundColor: "rgba(255,255,255,0.8)",
                  }}
                  onClick={() => setReloadKey((current) => current + 1)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {loadState === "ready" && tables.length === 0 ? (
          <section
            className="rounded-2xl border p-5 text-sm"
            style={{
              borderColor: "rgba(12,31,55,0.14)",
              background: "rgba(255,252,246,0.9)",
            }}
          >
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4" style={{ color: luxuryGold }} />
              <div>
                <p className="font-semibold" style={{ color: royalNavy }}>
                  No Active Tables
                </p>
                <p className="mt-1 text-zinc-600">
                  No active table is available right now for this client.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {loadState === "ready" && tables.length > 0 ? (
          <section className="grid grid-cols-1 gap-3">
            {tables.map((table) => {
              const routeToken = getRouteTableToken(table);
              return (
                <Link
                  key={table.id}
                  href={`/c/${ROOT_CLIENT_ID}/t/${encodeURIComponent(routeToken)}`}
                  className="group rounded-2xl border p-4 transition active:translate-y-px"
                  style={{
                    borderColor: "rgba(198,160,92,0.33)",
                    background:
                      "linear-gradient(160deg, rgba(255,252,245,0.96) 0%, rgba(247,237,220,0.95) 100%)",
                    boxShadow:
                      "0 22px 56px -38px rgba(12,31,55,0.35), inset 0 0 0 1px rgba(198,160,92,0.08)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Table</p>
                      <p className="mt-1 text-lg font-semibold" style={{ color: royalNavy }}>
                        {table.tableNo}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">Code: {table.tableCode}</p>
                    </div>
                    <div
                      className="rounded-xl border px-3 py-1.5 text-xs font-semibold"
                      style={{
                        borderColor: "rgba(198,160,92,0.34)",
                        backgroundColor: "rgba(231,201,138,0.2)",
                        color: royalNavy,
                      }}
                    >
                      Open
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        ) : null}
      </main>
    </div>
  );
}
