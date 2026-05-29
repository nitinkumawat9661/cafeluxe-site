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

function clean(value: unknown) {
  return String(value ?? "").trim().slice(0, 800);
}

export async function POST(request: Request) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return NextResponse.json({ ok: false, error: "Telegram env missing" }, { status: 500 });
    }

    const body = (await request.json()) as DemoPayload;

    const name = clean(body.name);
    const business = clean(body.business);
    const phone = clean(body.phone);
    const city = clean(body.city);
    const requirement = clean(body.requirement || "QR Ordering + POS Demo");
    const customRequirement = clean(body.customRequirement);
    const message = clean(body.message || "Not provided");

    if (!/^[A-Za-z ]{2,40}$/.test(name)) {
      return NextResponse.json({ ok: false, error: "Invalid name" }, { status: 400 });
    }

    if (business.length < 2 || business.length > 80) {
      return NextResponse.json({ ok: false, error: "Invalid business name" }, { status: 400 });
    }

    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      return NextResponse.json({ ok: false, error: "Invalid phone number" }, { status: 400 });
    }

    if (!/^[A-Za-z ]{2,40}$/.test(city)) {
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