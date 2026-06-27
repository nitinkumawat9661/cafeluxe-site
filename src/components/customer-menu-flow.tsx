"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { AlertCircle, CheckCircle2, Loader2, Minus, Plus, Search, ShoppingBag, ShieldCheck, Trash2 } from "lucide-react";
import { appwriteConfig, createDocumentWithFallback, fetchAllDocuments, Query } from "@/lib/appwrite";
import { buildFallbackCategories, findTableForRoute, formatInr, formatTableLabel, inferRestaurantName, matchesCategory, parseCategories, parseClientSettings, parseMenuItems, parseTables, type Category, type MenuItem, type RestaurantSettings, type RestaurantTable } from "@/lib/menu";

type ViewMode = "menu" | "cart";
type LoadState = "loading" | "ready" | "invalid" | "error";

const TIMEOUT_MS = 12000;
const MAX_QTY = 25;
const MAX_NOTE = 240;

function token(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function safeRoute(value: string, max: number) {
  const cleaned = value.trim();
  return cleaned && cleaned.length <= max && /^[a-zA-Z0-9_-]+$/.test(cleaned) ? cleaned : "";
}

function cleanText(value: string, max: number) {
  return value.replace(/[\u0000-\u001F\u007F<>]/g, "").trim().slice(0, max);
}

function cleanNote(value: string) {
  return value.replace(/[\u0000-\u001F\u007F<>]/g, "").slice(0, MAX_NOTE);
}

function variants(client: string) {
  const clean = client.trim();
  return Array.from(new Set([clean, clean.toLowerCase(), clean.toUpperCase(), clean.replace(/-/g, "_"), clean.replace(/_/g, "-")].filter(Boolean)));
}

function withTimeout<T>(promise: Promise<T>, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), TIMEOUT_MS);
    promise.then((value) => { window.clearTimeout(timer); resolve(value); }).catch((error) => { window.clearTimeout(timer); reject(error); });
  });
}

function recoverable(error: unknown) {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return /attribute|query|index|invalid|not found/.test(msg);
}

function niceError(error: unknown) {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (msg.includes("timed out")) return "Loading took too long. Please check internet and retry.";
  if (msg.includes("not authorized") || msg.includes("unauthorized")) return "This QR is not readable right now. Please ask staff.";
  return "Unable to load menu right now. Please retry or ask staff.";
}

function cartKey(client: string, table: string) {
  return `cafeluxe_customer_cart_${token(client)}_${token(table)}`;
}

function parseCart(raw: string | null) {
  if (!raw || raw.length > 50000) return {} as Record<string, number>;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: Record<string, number> = {};
    for (const [id, qty] of Object.entries(parsed)) {
      const amount = Math.min(MAX_QTY, Math.max(0, Math.floor(Number(qty) || 0)));
      if (id && !id.startsWith("$") && amount > 0) next[id] = amount;
    }
    return next;
  } catch {
    return {} as Record<string, number>;
  }
}

function makeOrderNumber(client: string, table: string) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
  return `ORD-${token(client).toUpperCase().slice(0, 6) || "CLIENT"}-${token(table).toUpperCase().slice(0, 8) || "TABLE"}-${stamp}`;
}

async function scopedDocs(collectionId: string, client: string, pageSize = 120, maxDocs = 800) {
  for (const field of ["client_id", "client"]) {
    try {
      return await fetchAllDocuments(collectionId, { pageSize, maxDocs, timeoutMs: TIMEOUT_MS, queries: [Query.equal(field, variants(client))] });
    } catch (error) {
      if (!recoverable(error)) throw error;
    }
  }
  return fetchAllDocuments(collectionId, { pageSize, maxDocs, timeoutMs: TIMEOUT_MS });
}

async function resolveTable(client: string, table: string) {
  try {
    const docs = await fetchAllDocuments(appwriteConfig.collections.tables, { pageSize: 120, maxDocs: 500, timeoutMs: TIMEOUT_MS, queries: [Query.equal("client_id", variants(client))] });
    const matched = findTableForRoute(parseTables(docs, client), table);
    if (matched) return matched;
  } catch (error) {
    if (!recoverable(error)) throw error;
  }
  const docs = await fetchAllDocuments(appwriteConfig.collections.tables, { pageSize: 120, maxDocs: 1000, timeoutMs: TIMEOUT_MS });
  return findTableForRoute(parseTables(docs, client), table);
}

export default function CustomerMenuFlow({ client, table, initialView = "menu" }: { client: string; table: string; initialView?: ViewMode }) {
  const routeClient = safeRoute(client, 64);
  const routeTable = safeRoute(table, 32);
  const storageKey = useMemo(() => cartKey(routeClient, routeTable), [routeClient, routeTable]);
  const lockRef = useRef(false);

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("Verifying table QR...");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [restaurantName, setRestaurantName] = useState("Cafe");
  const [settings, setSettings] = useState<RestaurantSettings>(() => parseClientSettings([], client));
  const [tableInfo, setTableInfo] = useState<RestaurantTable | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(initialView === "cart");
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<{ id: string; number: string; amount: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!routeClient || !routeTable) {
        setLoadState("invalid");
        setError("Invalid QR format. Please ask staff for the correct QR.");
        return;
      }
      try {
        setLoadState("loading");
        setMessage("Verifying table QR...");
        const tableRecord = token(routeTable) === "takeaway"
          ? ({ id: "takeaway", clientId: routeClient, tableNo: "TAKEAWAY", tableCode: "takeaway", displayLabel: "TAKEAWAY", sortOrder: 9999, isActive: true, raw: { $id: "takeaway" } } satisfies RestaurantTable)
          : await withTimeout(resolveTable(routeClient, routeTable), "Table verification");
        if (cancelled) return;
        if (!tableRecord) {
          setLoadState("invalid");
          setError("This table QR is invalid. Please ask staff for the correct QR.");
          return;
        }

        setTableInfo(tableRecord);
        setMessage("Loading menu...");
        const [catDocs, menuDocs] = await withTimeout(Promise.all([
          scopedDocs(appwriteConfig.collections.categories, routeClient, 80, 300),
          scopedDocs(appwriteConfig.collections.menuItems, routeClient, 120, 800),
        ]), "Menu load");
        if (cancelled) return;

        const parsedItems = parseMenuItems(menuDocs, routeClient).filter((item) => item.price >= 0);
        const parsedCategories = parseCategories(catDocs, routeClient);
        const finalCategories = parsedCategories.length ? parsedCategories : buildFallbackCategories(parsedItems);
        const fallbackSettings = parseClientSettings([], routeClient);
        setItems(parsedItems);
        setCategories(finalCategories);
        setSettings(fallbackSettings);
        setRestaurantName(inferRestaurantName(routeClient, null, finalCategories, parsedItems));
        setCart(parseCart(window.localStorage.getItem(storageKey)));
        setLoadState("ready");

        void scopedDocs(appwriteConfig.collections.settings, routeClient, 40, 120).then((docs) => {
          if (cancelled) return;
          const parsed = parseClientSettings(docs, routeClient);
          setSettings(parsed);
          setRestaurantName(parsed.restaurantName || inferRestaurantName(routeClient, null, finalCategories, parsedItems));
        }).catch(() => undefined);
      } catch (err) {
        if (cancelled) return;
        setLoadState("error");
        setError(niceError(err));
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [routeClient, routeTable, storageKey]);

  useEffect(() => {
    if (loadState !== "ready") return;
    if (Object.keys(cart).length) window.localStorage.setItem(storageKey, JSON.stringify(cart));
    else window.localStorage.removeItem(storageKey);
  }, [cart, loadState, storageKey]);

  const filteredItems = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const category = activeCategory === "all" ? null : categories.find((entry) => entry.id === activeCategory) ?? null;
    return items.filter((item) => {
      if (category && !matchesCategory(item, category)) return false;
      if (!searchTerm) return true;
      return `${item.name} ${item.nameHi} ${item.description}`.toLowerCase().includes(searchTerm);
    });
  }, [activeCategory, categories, items, search]);

  const cartLines = useMemo(() => items.map((item) => ({ item, quantity: cart[item.id] ?? 0 })).filter((line) => line.quantity > 0), [cart, items]);
  const cartCount = useMemo(() => cartLines.reduce((sum, line) => sum + line.quantity, 0), [cartLines]);
  const subtotal = useMemo(() => cartLines.reduce((sum, line) => sum + line.item.price * line.quantity, 0), [cartLines]);
  const tax = settings.gstEnabled ? Math.round((subtotal * settings.taxPercentage) / 100 * 100) / 100 : 0;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const tableLabel = tableInfo ? tableInfo.displayLabel : formatTableLabel(routeTable);

  function setQty(itemId: string, delta: number) {
    setCart((current) => {
      const nextQty = Math.min(MAX_QTY, Math.max(0, (current[itemId] ?? 0) + delta));
      const next = { ...current };
      if (nextQty) next[itemId] = nextQty;
      else delete next[itemId];
      return next;
    });
  }

  function clearCart() {
    setCart({});
    setNote("");
  }

  async function placeOrder() {
    if (lockRef.current || placing || !tableInfo || cartCount <= 0 || total <= 0) return;
    lockRef.current = true;
    setPlacing(true);
    setError("");
    setNotice("");
    try {
      const now = new Date().toISOString();
      const clientId = tableInfo.clientId || routeClient;
      const number = makeOrderNumber(clientId, tableInfo.tableNo || routeTable);
      const sessionId = `session_${token(clientId)}_${token(tableInfo.tableNo || routeTable)}_${Date.now().toString(36)}`;
      const billId = `bill_${token(clientId)}_${token(tableInfo.tableNo || routeTable)}_${Date.now().toString(36)}`;
      const snapshot = JSON.stringify(cartLines.map((line) => ({ item_id: line.item.id, item_name: cleanText(line.item.name, 120), item_name_hi: cleanText(line.item.nameHi || line.item.name, 120), quantity: line.quantity, unit_price: line.item.price, line_total: line.item.price * line.quantity })));
      const base = { client_id: clientId, table_id: tableInfo.id, table_number: tableInfo.tableNo || tableLabel, order_number: number, session_id: sessionId, bill_id: billId, status: "PLACED", kot_status: "pending", payment_status: "UNPAID", payment_method: "COUNTER", subtotal: Math.round(subtotal * 100) / 100, tax_amount: tax, total_amount: total, created_at_custom: now };
      const order = await createDocumentWithFallback(appwriteConfig.collections.orders, [{ ...base, items_json: snapshot, kitchen_instructions: cleanNote(note) }, { ...base, order_items: snapshot, notes: cleanNote(note) }, base]);
      void createDocumentWithFallback(appwriteConfig.collections.printJobs, [{ client_id: clientId, table_id: tableInfo.id, table_number: tableInfo.tableNo || tableLabel, session_id: sessionId, bill_id: billId, order_id: order.$id, order_number: number, type: "KOT", label: `TABLE ${tableInfo.tableNo || tableLabel}`, items_json: snapshot, total_amount: total, status: "pending", printer_type: "KITCHEN", created_at_custom: now }]).catch(() => undefined);
      void createDocumentWithFallback(appwriteConfig.collections.tableSessions, [{ client_id: clientId, table_id: tableInfo.id, table_number: tableInfo.tableNo || tableLabel, session_id: sessionId, bill_id: billId, status: "active", payment_status: "unpaid", opened_at: now, heartbeat_at: now, total_amount: total }]).catch(() => undefined);
      setPlaced({ id: order.$id, number, amount: total });
      setNotice("Order sent to kitchen. Please pay at the counter after your meal.");
      clearCart();
      setCartOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(niceError(err));
    } finally {
      setPlacing(false);
      lockRef.current = false;
    }
  }

  if (loadState === "loading") return <main className="flex min-h-screen items-center justify-center bg-[#050403] px-5 text-center text-white"><div><Loader2 className="mx-auto h-9 w-9 animate-spin text-amber-300" /><h1 className="mt-5 text-2xl font-black">CafeLuxe</h1><p className="mt-2 text-sm text-white/65">{message}</p></div></main>;
  if (loadState !== "ready") return <main className="flex min-h-screen items-center justify-center bg-[#050403] px-5 text-center text-white"><div><AlertCircle className="mx-auto h-10 w-10 text-amber-300" /><h1 className="mt-5 text-2xl font-black">Unable to open menu</h1><p className="mt-2 text-sm text-white/65">{error}</p><button onClick={() => window.location.reload()} className="mt-5 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-black">Retry</button></div></main>;

  return (
    <main className="min-h-screen bg-[#050403] pb-28 text-white">
      <section className="mx-auto max-w-xl px-4 py-4">
        <header className="sticky top-0 z-30 -mx-4 border-b border-amber-200/10 bg-[#050403]/95 px-4 py-4 backdrop-blur-xl">
          <div className="flex justify-between gap-3">
            <div><p className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[.16em] text-amber-200"><ShieldCheck className="h-3.5 w-3.5" /> Secure QR Menu</p><h1 className="mt-3 text-2xl font-black">{restaurantName}</h1><p className="mt-1 text-sm text-white/60">{tableLabel}</p></div>
            <button type="button" onClick={() => setCartOpen(true)} className="relative h-12 rounded-2xl bg-amber-300 p-3 text-black"><ShoppingBag className="h-5 w-5" />{cartCount ? <span className="absolute -right-2 -top-2 rounded-full bg-white px-2 py-0.5 text-xs font-black">{cartCount}</span> : null}</button>
          </div>
          <label className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-3 py-2"><Search className="h-4 w-4 text-white/45" /><input value={search} onChange={(event) => setSearch(cleanText(event.target.value, 64))} placeholder="Search menu" className="w-full bg-transparent text-sm outline-none placeholder:text-white/35" /></label>
        </header>
        {notice ? <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">{notice}</div> : null}
        {error ? <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div> : null}
        {placed ? <section className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-5"><div className="flex gap-3"><CheckCircle2 className="h-6 w-6 text-emerald-200" /><div><h2 className="font-black text-emerald-100">Order Confirmed</h2><p className="mt-1 text-sm text-white/70">{placed.number}</p><p className="mt-1 text-sm text-white/70">Total: <b>{formatInr(placed.amount, settings.currency)}</b></p></div></div></section> : null}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2"><button onClick={() => setActiveCategory("all")} className={clsx("shrink-0 rounded-full border px-4 py-2 text-sm font-bold", activeCategory === "all" ? "border-amber-300 bg-amber-300 text-black" : "border-white/10 bg-white/[.04] text-white/70")}>All</button>{categories.map((category) => <button key={category.id} onClick={() => setActiveCategory(category.id)} className={clsx("shrink-0 rounded-full border px-4 py-2 text-sm font-bold", activeCategory === category.id ? "border-amber-300 bg-amber-300 text-black" : "border-white/10 bg-white/[.04] text-white/70")}>{category.name}</button>)}</div>
        <div className="mt-4 grid gap-4">{filteredItems.map((item) => { const qty = cart[item.id] ?? 0; return <article key={item.id} className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><div className="flex gap-4"><div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white/8">{item.image ? <img src={item.image} alt={item.name} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-white/35">No image</div>}</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><h2 className="font-black leading-tight">{item.name}</h2><p className="shrink-0 font-black text-amber-200">{formatInr(item.price, settings.currency)}</p></div>{item.description ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/55">{item.description}</p> : null}<div className="mt-3 flex items-center justify-end">{item.isAvailable ? qty ? <div className="inline-flex items-center rounded-xl border border-white/10 bg-black/25"><button className="p-2" onClick={() => setQty(item.id, -1)}><Minus className="h-4 w-4" /></button><span className="min-w-8 text-center text-sm font-black">{qty}</span><button className="p-2" onClick={() => setQty(item.id, 1)}><Plus className="h-4 w-4" /></button></div> : <button onClick={() => setQty(item.id, 1)} className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-black">Add</button> : <span className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/45">Sold out</span>}</div></div></div></article>; })}</div>
      </section>
      {cartCount ? <div className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-300/20 bg-[#0b0805]/95 p-3 backdrop-blur-xl"><button onClick={() => setCartOpen(true)} className="mx-auto flex w-full max-w-xl justify-between rounded-2xl bg-amber-300 px-5 py-4 text-sm font-black text-black"><span>{cartCount} item{cartCount === 1 ? "" : "s"}</span><span>View Cart · {formatInr(total, settings.currency)}</span></button></div> : null}
      {cartOpen ? <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm"><div className="absolute inset-x-0 bottom-0 mx-auto max-h-[92vh] max-w-xl overflow-y-auto rounded-t-[2rem] border border-amber-300/20 bg-[#0b0805] p-5"><div className="flex justify-between"><h2 className="text-2xl font-black">Your Cart</h2><button onClick={() => setCartOpen(false)} className="rounded-xl border border-white/10 px-3 py-2 text-sm">Close</button></div>{cartLines.length ? <div className="mt-4 space-y-3">{cartLines.map(({ item, quantity }) => <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><div className="flex justify-between"><div><h3 className="font-bold">{item.name}</h3><p className="mt-1 text-xs text-white/55">{formatInr(item.price, settings.currency)} each</p></div><p className="font-black text-amber-200">{formatInr(item.price * quantity, settings.currency)}</p></div><div className="mt-3 inline-flex items-center rounded-xl border border-white/10 bg-black/25"><button className="p-2" onClick={() => setQty(item.id, -1)}><Minus className="h-4 w-4" /></button><span className="min-w-8 text-center text-sm font-black">{quantity}</span><button className="p-2" onClick={() => setQty(item.id, 1)}><Plus className="h-4 w-4" /></button></div></article>)}</div> : <p className="mt-4 rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm text-white/60">Cart is empty.</p>}<textarea value={note} onChange={(event) => setNote(cleanNote(event.target.value))} placeholder="Kitchen instructions, optional" rows={3} className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none placeholder:text-white/35" /><div className="mt-4 rounded-2xl border border-amber-300/18 bg-amber-300/8 p-4"><div className="flex justify-between text-sm text-white/70"><span>Subtotal</span><span>{formatInr(subtotal, settings.currency)}</span></div>{settings.gstEnabled ? <div className="mt-2 flex justify-between text-sm text-white/70"><span>Tax</span><span>{formatInr(tax, settings.currency)}</span></div> : null}<div className="mt-3 flex justify-between text-lg font-black"><span>Total</span><span>{formatInr(total, settings.currency)}</span></div></div><div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><button disabled={placing || cartCount === 0} onClick={() => void placeOrder()} className="rounded-2xl bg-amber-300 px-5 py-4 text-sm font-black text-black disabled:opacity-50">{placing ? "Sending..." : "Place Order"}</button><button onClick={clearCart} disabled={!cartCount} className="rounded-2xl border border-red-300/20 px-4 text-red-200 disabled:opacity-40"><Trash2 className="h-5 w-5" /></button></div></div></div> : null}
    </main>
  );
}
