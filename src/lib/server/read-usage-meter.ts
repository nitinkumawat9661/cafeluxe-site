import { sendTelegramAlert } from "./telegram";

type ReadState = {
  monthKey: string;
  dayKey: string;
  monthReads: number;
  dayReads: number;
  lastAlertPercent: number;
  byCollection: Record<string, number>;
};

type ReadUsageStore = {
  read(): Promise<ReadState>;
  write(state: ReadState): Promise<void>;
};

type GlobalReadMeter = typeof globalThis & { __cafeReadMeter?: ReadState };
const g = globalThis as GlobalReadMeter;

const STORAGE_MODE = process.env.READ_USAGE_STORAGE || "memory";

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function currentDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function monthlyLimit() {
  const value = Number(process.env.APPWRITE_MONTHLY_READ_LIMIT || "500000");
  return Number.isFinite(value) && value > 0 ? value : 500000;
}

function freshState(): ReadState {
  return {
    monthKey: currentMonthKey(),
    dayKey: currentDayKey(),
    monthReads: 0,
    dayReads: 0,
    lastAlertPercent: 0,
    byCollection: {},
  };
}

function createReadUsageStore(): ReadUsageStore {
  // Vercel: memory mode. VPS future: replace this adapter with file/Redis/DB store.
  return {
    async read() {
      g.__cafeReadMeter ||= freshState();
      return g.__cafeReadMeter;
    },
    async write(state) {
      g.__cafeReadMeter = state;
    },
  };
}

const store = createReadUsageStore();

export async function recordAppwriteRead(collectionId: string, count = 1) {
  const state = await store.read();

  if (state.monthKey !== currentMonthKey()) Object.assign(state, freshState());
  if (state.dayKey !== currentDayKey()) {
    state.dayKey = currentDayKey();
    state.dayReads = 0;
  }

  const safeCount = Math.max(1, Math.floor(count));
  state.monthReads += safeCount;
  state.dayReads += safeCount;
  state.byCollection[collectionId] = (state.byCollection[collectionId] || 0) + safeCount;

  const percent = Math.floor((state.monthReads / monthlyLimit()) * 100);
  const threshold = Math.floor(percent / 10) * 10;

  if (threshold >= 10 && threshold > state.lastAlertPercent) {
    state.lastAlertPercent = threshold;
    const top = Object.entries(state.byCollection).sort((a, b) => b[1] - a[1])[0];

    await sendTelegramAlert([
      "📊 CafeLuxe Appwrite Read Alert",
      `Usage: ${threshold}%`,
      `Estimated reads: ${state.monthReads} / ${monthlyLimit()}`,
      `Today reads: ${state.dayReads}`,
      top ? `Top collection: ${top[0]} (${top[1]})` : "",
      `Storage: ${STORAGE_MODE}`,
    ].filter(Boolean).join("\n")).catch(() => false);
  }

  await store.write(state);
}
