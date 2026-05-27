export type PhonePeEnvironment = "sandbox" | "production";

function readEnv(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

export const phonePeConfig = {
  enabled: readEnv("PHONEPE_ENABLE_REAL", "false") === "true",
  environment: readEnv("PHONEPE_ENV", "sandbox") as PhonePeEnvironment,

  clientId: readEnv("PHONEPE_CLIENT_ID"),
  clientSecret: readEnv("PHONEPE_CLIENT_SECRET"),
  clientVersion: readEnv("PHONEPE_CLIENT_VERSION", "1"),
  merchantId: readEnv("PHONEPE_MERCHANT_ID"),

  webhookUsername: readEnv("PHONEPE_WEBHOOK_USERNAME"),
  webhookPassword: readEnv("PHONEPE_WEBHOOK_PASSWORD"),

  redirectBaseUrl: readEnv("PHONEPE_REDIRECT_BASE_URL", "https://cafeluxesite.in"),
  webhookUrl: readEnv(
    "PHONEPE_WEBHOOK_URL",
    "https://cafeluxesite.in/api/payments/phonepe/webhook"
  ),
};

export function assertPhonePeConfigured() {
  if (!phonePeConfig.enabled) {
    throw new Error("PhonePe real mode disabled. MOCK mode is active.");
  }

  const missing = Object.entries({
    PHONEPE_CLIENT_ID: phonePeConfig.clientId,
    PHONEPE_CLIENT_SECRET: phonePeConfig.clientSecret,
    PHONEPE_MERCHANT_ID: phonePeConfig.merchantId,
    PHONEPE_WEBHOOK_USERNAME: phonePeConfig.webhookUsername,
    PHONEPE_WEBHOOK_PASSWORD: phonePeConfig.webhookPassword,
  }).filter(([, value]) => !value);

  if (missing.length) {
    throw new Error(`Missing PhonePe env: ${missing.map(([k]) => k).join(", ")}`);
  }
}
