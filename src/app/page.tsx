"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { appwriteConfig, fetchAllDocuments, Query } from "@/lib/appwrite";
import { WEBSITE_COLORS, WEBSITE_STYLE_CLASSES } from "@/lib/design-tokens";
import { parseClientSettings, parseTables, type RestaurantSettings, type RestaurantTable } from "@/lib/menu";

const ROOT_CLIENT_ID = "trustfirst_demo";

type HomeLoadState = "loading" | "ready" | "error";
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

function getRouteTableToken(table: RestaurantTable) {
  return (table.tableCode || table.tableNo || table.id).trim();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }
  return "Unknown error";
}

function toSafeTableLoadReason(error: unknown) {
  const rawMessage = getErrorMessage(error).trim();
  if (!rawMessage) {
    return "Unknown error";
  }

  if (/usage[_\s-]*exceeded|service unavailable/i.test(rawMessage)) {
    return "Service usage limit reached";
  }
  if (/not authorized|unauthorized|missing scope/i.test(rawMessage)) {
    return "Server authorization failed";
  }
  if (/missing .*appwrite|configuration/i.test(rawMessage)) {
    return "Server Appwrite configuration missing";
  }
  if (/timed out/i.test(rawMessage)) {
    return "Request timed out";
  }

  return rawMessage;
}

async function fetchHomepageTables(clientId: string) {
  try {
    return await fetchAllDocuments(appwriteConfig.collections.tables, {
      pageSize: 100,
      maxDocs: 400,
      queries: [Query.equal("client_id", [clientId])],
      timeoutMs: 12000,
    });
  } catch (filteredError) {
    const filteredReason = getErrorMessage(filteredError);
    devWarn("[HomeTables] Client-filtered tables fetch failed, retrying unfiltered fetch.", {
      clientId,
      stage: "tables.filtered",
      reason: filteredReason,
    });

    try {
      return await fetchAllDocuments(appwriteConfig.collections.tables, {
        pageSize: 100,
        maxDocs: 400,
        timeoutMs: 12000,
      });
    } catch (fallbackError) {
      const fallbackReason = getErrorMessage(fallbackError);
      throw new Error(
        `tables.filtered=${filteredReason}; tables.fallback=${fallbackReason}`,
      );
    }
  }
}

export default function Home() {
  const background = WEBSITE_COLORS.background;
  const surface = WEBSITE_COLORS.surface;
  const accent = WEBSITE_COLORS.accent;
  const text = WEBSITE_COLORS.text;
  const secondary = WEBSITE_COLORS.secondaryText;
  const [loadState, setLoadState] = useState<HomeLoadState>("loading");
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorReason, setErrorReason] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadHomepageData() {
      setLoadState("loading");
      setErrorMessage("");
      setErrorReason("");

      try {
        const [tableDocs, settingsDocs] = await Promise.all([
          fetchHomepageTables(ROOT_CLIENT_ID),
          fetchAllDocuments(appwriteConfig.collections.settings, {
            pageSize: 100,
            maxDocs: 200,
            queries: [Query.equal("client_id", [ROOT_CLIENT_ID])],
            timeoutMs: 12000,
          }).catch((settingsError) => {
            devWarn("[HomeTables] Settings fetch failed, continuing with defaults.", {
              clientId: ROOT_CLIENT_ID,
              stage: "settings.filtered",
              reason: getErrorMessage(settingsError),
            });
            return [];
          }),
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
        const reason = toSafeTableLoadReason(error);
        devError("[HomeTables] Live tables load failed.", {
          clientId: ROOT_CLIENT_ID,
          stage: "home.load",
          reason,
          raw: getErrorMessage(error),
        });
        setLoadState("error");
        setErrorMessage("Unable to load live tables right now. Please retry.");
        setErrorReason(reason);
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
      className="cafe-theme-light relative min-h-screen overflow-hidden px-4 py-8 text-zinc-900"
      style={{
        background: `radial-gradient(1100px 520px at 20% -18%, rgba(232,217,197,0.16) 0%, rgba(232,217,197,0) 56%), linear-gradient(180deg, ${background} 0%, ${background} 100%)`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(122,109,96,0.03)_0%,rgba(232,217,197,0)_42%,rgba(232,217,197,0.12)_100%)]" />

      <main className="relative mx-auto w-full max-w-md">
        <section
          className="mb-5 rounded-3xl border p-6"
          style={{
            borderColor: "rgba(232,217,197,0.32)",
            background: `linear-gradient(165deg, rgba(232,217,197,0.98) 0%, ${surface} 62%, rgba(232,217,197,0.14) 100%)`,
            boxShadow:
              "0 28px 70px -42px rgba(122,109,96,0.42), inset 0 1px 0 rgba(232,217,197,0.84), inset 0 -1px 0 rgba(232,217,197,0.12)",
          }}
        >
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: text }}>
            {restaurantName}
          </p>
          <h1 className={["mt-2 text-2xl tracking-[0.02em]", WEBSITE_STYLE_CLASSES.text.panelHeading].join(" ")} style={{ color: text }}>
            Select Your Table
          </h1>
          <p className="mt-2 text-sm" style={{ color: secondary }}>
            Tap your table to open the live menu and order instantly.
          </p>
          {supportPhone ? (
            <p className="mt-3 text-xs" style={{ color: secondary }}>
              Support: <span className="font-medium" style={{ color: text }}>{supportPhone}</span>
            </p>
          ) : null}
        </section>

        {loadState === "loading" ? (
          <section
            className="flex items-center gap-3 rounded-2xl border p-4 text-sm"
            style={{
              borderColor: "rgba(232,217,197,0.24)",
              background: "rgba(122,109,96,0.56)",
              color: text,
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
              borderColor: "rgba(232,217,197,0.28)",
              background: "rgba(122,109,96,0.56)",
              color: text,
            }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className={WEBSITE_STYLE_CLASSES.text.sectionTitle}>Unable To Load Tables</p>
                <p className="mt-1 text-sm" style={{ color: secondary }}>{errorMessage}</p>
                {errorReason ? (
                  <p className="mt-1 text-xs" style={{ color: secondary }}>Reason: {errorReason}</p>
                ) : null}
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition"
                  style={{
                    borderColor: "rgba(232,217,197,0.32)",
                    color: text,
                    backgroundColor: "rgba(232,217,197,0.9)",
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
              borderColor: "rgba(232,217,197,0.26)",
              background: "rgba(122,109,96,0.48)",
            }}
          >
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4" style={{ color: accent }} />
              <div>
                <p className={WEBSITE_STYLE_CLASSES.text.sectionTitle} style={{ color: text }}>
                  No Active Tables
                </p>
                <p className="mt-1" style={{ color: secondary }}>
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
                  prefetch={false}
                  className="group rounded-2xl border p-4 transition active:translate-y-px"
                  style={{
                    borderColor: "rgba(232,217,197,0.3)",
                    background: `linear-gradient(160deg, rgba(232,217,197,0.98) 0%, ${surface} 70%, rgba(232,217,197,0.14) 100%)`,
                    boxShadow: "0 24px 58px -38px rgba(122,109,96,0.3), inset 0 1px 0 rgba(232,217,197,0.86), inset 0 -1px 0 rgba(232,217,197,0.16)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em]" style={{ color: secondary }}>Table</p>
                      <p className={["mt-1 text-lg", WEBSITE_STYLE_CLASSES.text.panelHeading].join(" ")} style={{ color: text }}>
                        {table.tableNo}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: secondary }}>Code: {table.tableCode}</p>
                    </div>
                    <div
                      className="rounded-xl border px-3 py-1.5 text-xs font-semibold"
                      style={{
                        borderColor: "rgba(232,217,197,0.32)",
                        backgroundColor: "rgba(232,217,197,0.2)",
                        color: text,
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
