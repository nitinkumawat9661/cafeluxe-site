import { NextResponse } from "next/server";

type DemoPayload = {
  name?: string;
  business?: string;
  phone?: string;
  city?: string;
  requirement?: string;
  customRequirement?: string;
  message?: string;
  consent?: boolean;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type DemoRateLimitGlobal = typeof globalThis & {
  __cafeDemoInquiryRateLimit?: Map<string, RateLimitEntry>;
};

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const NAME_CITY_PATTERN = /^[\p{L}\p{M} .'-]{2,40}$/u;
const g = globalThis as DemoRateLimitGlobal;

function clean(value: unknown, maxLength = 800) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function firstHeaderValue(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .find(Boolean) ?? "";
}

function getClientKey(request: Request) {
  const forwardedFor = firstHeaderValue(request.headers.get("x-forwarded-for"));
  const realIp = firstHeaderValue(request.headers.get("x-real-ip"));
  const netlifyIp = firstHeaderValue(request.headers.get("x-nf-client-connection-ip"));
  const ip = forwardedFor || netlifyIp || realIp || "unknown";
  return ip.toLowerCase().slice(0, 120);
}

function checkRateLimit(request: Request) {
  const now = Date.now();
  const store = (g.__cafeDemoInquiryRateLimit ??= new Map<string, RateLimitEntry>());

  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }

  const key = getClientKey(request);
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  store.set(key, current);
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(request);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many demo requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return NextResponse.json({ ok: false, error: "Telegram env missing" }, { status: 500 });
    }

    const body = (await request.json()) as DemoPayload;

    const name = clean(body.name, 40);
    const business = clean(body.business, 80);
    const phone = clean(body.phone, 10);
    const city = clean(body.city, 40);
    const requirement = clean(body.requirement || "QR Ordering + POS Demo", 80);
    const customRequirement = clean(body.customRequirement, 160);
    const message = clean(body.message || "Not provided", 300);

    if (!NAME_CITY_PATTERN.test(name)) {
      return NextResponse.json({ ok: false, error: "Invalid name" }, { status: 400 });
    }

    if (business.length < 2 || business.length > 80) {
      return NextResponse.json({ ok: false, error: "Invalid business name" }, { status: 400 });
    }

    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      return NextResponse.json({ ok: false, error: "Invalid phone number" }, { status: 400 });
    }

    if (!NAME_CITY_PATTERN.test(city)) {
      return NextResponse.json({ ok: false, error: "Invalid city" }, { status: 400 });
    }

    if (requirement === "Custom Requirement" && (customRequirement.length < 5 || customRequirement.length > 160)) {
      return NextResponse.json({ ok: false, error: "Invalid custom requirement" }, { status: 400 });
    }

    if (message.length > 300) {
      return NextResponse.json({ ok: false, error: "Message too long" }, { status: 400 });
    }

    if (!body.consent) {
      return NextResponse.json({ ok: false, error: "Consent required" }, { status: 400 });
    }

    const icons = {
      rocket: "\u{1F680}",
      user: "\u{1F464}",
      shop: "\u{1F3EA}",
      phone: "\u{1F4DE}",
      pin: "\u{1F4CD}",
      note: "\u{1F4CC}",
      message: "\u{1F4DD}",
      check: "\u{2705}",
    };

    const text = `${icons.rocket} New CafeLuxe Demo Inquiry

${icons.user} Name: ${name}
${icons.shop} Business: ${business}
${icons.phone} Phone: ${phone}
${icons.pin} City: ${city}

${icons.note} Requirement:
${requirement}${customRequirement ? ` - ${customRequirement}` : ""}

${icons.message} Message:
${message}

${icons.check} Consent: User agreed to be contacted.`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "Telegram send failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
