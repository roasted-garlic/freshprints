/**
 * Cloudflare Worker for coming-soon + Brevo notify API.
 * Secrets: BREVO_API_KEY
 * Vars: BREVO_LIST_ID (optional, default 2)
 *
 * Responses:
 *   { ok: true, already: false } — newly added / ensured on list
 *   { ok: true, already: true }  — already on the launch list
 *   { ok: true, ..., phoneIgnored: true } — email saved; phone could not be stored
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// NANP: +1 NXX NXX XXXX where N=2-9
const NANP_RE = /^\+1[2-9]\d{2}[2-9]\d{6}$/;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/**
 * Normalize common US phone inputs to Brevo-valid E.164 (+1XXXXXXXXXX).
 * Returns null when the value cannot be trusted as a US mobile/SMS number.
 */
function normalizePhone(raw) {
  if (raw == null) return null;
  let trimmed = String(raw).trim();
  if (!trimmed) return null;

  // Drop extensions: "8502015513 x99", "ext. 12", "#123"
  trimmed = trimmed.replace(/(?:ext\.?|extension|x|#)\s*[\d]+$/i, "").trim();

  // Keep digits and leading +; collapse other junk.
  let digits = trimmed.replace(/[^\d+]/g, "");
  // "+1(850)..." → already fine; "00 1 850..." → treat 00 as international +
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;

  // Collapse accidental multiple leading pluses.
  digits = digits.replace(/^\++/, "+");

  let only = digits.startsWith("+") ? digits.slice(1).replace(/\D/g, "") : digits.replace(/\D/g, "");

  // US: 10-digit local, or 11-digit with leading country 1
  if (only.length === 10) only = `1${only}`;
  if (only.length === 11 && only.startsWith("1")) {
    const e164 = `+${only}`;
    return NANP_RE.test(e164) ? e164 : null;
  }

  return null;
}

function isPhoneAttributeError(detail) {
  return /phone|sms|mobile|invalid.*number|number.*invalid/i.test(String(detail || ""));
}

function honeypotValue(payload) {
  // Current trap + short-lived aliases from prior deploys / cached pages.
  for (const key of ["website_url_hp", "_gotcha", "company"]) {
    const value = payload?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function brevoHeaders(apiKey) {
  return {
    accept: "application/json",
    "content-type": "application/json",
    "api-key": apiKey,
  };
}

async function getContact(apiKey, email) {
  const res = await fetch(
    `https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`,
    { method: "GET", headers: brevoHeaders(apiKey) }
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    let detail = `status ${res.status}`;
    try {
      const err = await res.json();
      if (err?.message) detail = err.message;
    } catch {
      // ignore
    }
    throw new Error(`Brevo get contact failed: ${detail}`);
  }

  return res.json();
}

async function upsertContact(apiKey, { email, phone, listId }) {
  const attributes = {};
  if (phone) attributes.SMS = phone;

  const body = {
    email,
    listIds: [listId],
    updateEnabled: true,
  };
  if (Object.keys(attributes).length > 0) {
    body.attributes = attributes;
  }

  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: brevoHeaders(apiKey),
    body: JSON.stringify(body),
  });

  if (res.status === 201 || res.status === 204) {
    return { ok: true, phoneSaved: Boolean(phone) };
  }

  let detail = "Could not save your subscription.";
  try {
    const err = await res.json();
    if (err?.message) detail = err.message;
  } catch {
    // ignore
  }

  if (res.status === 400 && /already|duplicate|exist/i.test(detail)) {
    return { ok: true, phoneSaved: Boolean(phone) };
  }

  // Brevo rejects the whole create/update when SMS is invalid or already used.
  // Fall back to email-only so launch notify still works.
  if (phone && isPhoneAttributeError(detail)) {
    console.warn("Brevo rejected SMS; retrying email-only", detail);
    const retry = await upsertContact(apiKey, { email, phone: null, listId });
    return { ok: retry.ok, phoneSaved: false, phoneIgnored: true, detail };
  }

  throw new Error(detail);
}

async function handleNotify(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400",
      },
    });
  }

  if (request.method !== "POST") {
    return json(405, { ok: false, error: "Method not allowed." });
  }

  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) {
    return json(500, { ok: false, error: "Server is missing BREVO_API_KEY." });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { ok: false, error: "Invalid request body." });
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const trap = honeypotValue(payload);

  // Silent-ok only for empty-email bot posts. Password managers often autofill
  // honeypot fields; those humans always have an email and must reach Brevo.
  if (trap && !email) {
    console.warn("notify honeypot tripped (no email); skipping Brevo");
    return json(200, { ok: true, already: false });
  }
  if (trap && email) {
    console.warn("notify honeypot filled but email present; continuing Brevo");
  }

  if (!email || email.length > 200 || !EMAIL_RE.test(email)) {
    return json(400, { ok: false, error: "Please enter a valid email address." });
  }

  const rawPhone = payload.phone;
  const phone = normalizePhone(rawPhone);
  const phoneProvided = rawPhone != null && String(rawPhone).trim() !== "";
  // Prefer signup success over strict phone: invalid/unnormalizable phone is ignored.
  const phoneIgnoredLocal = phoneProvided && !phone;

  const listId = Number(env.BREVO_LIST_ID || 2);

  try {
    const existing = await getContact(apiKey, email);
    if (existing && Array.isArray(existing.listIds) && existing.listIds.includes(listId)) {
      // Refresh phone if provided; stay marked as already on list
      let phoneIgnored = phoneIgnoredLocal;
      if (phone) {
        const result = await upsertContact(apiKey, { email, phone, listId });
        if (result.phoneIgnored) phoneIgnored = true;
      }
      return json(200, {
        ok: true,
        already: true,
        ...(phoneIgnored ? { phoneIgnored: true } : {}),
      });
    }

    const result = await upsertContact(apiKey, { email, phone, listId });
    const phoneIgnored = phoneIgnoredLocal || Boolean(result.phoneIgnored);
    return json(200, {
      ok: true,
      already: false,
      ...(phoneIgnored ? { phoneIgnored: true } : {}),
    });
  } catch (err) {
    console.error("Brevo notify error", err?.message || err);
    return json(502, { ok: false, error: "Something went wrong. Please try again." });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/notify") {
      return handleNotify(request, env);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    // Short cache for HTML/CSS/JS so ?v= bumps and glow fixes reach phones quickly.
    // (CDN may still cache; query-string bumps remain the primary bust.)
    const path = url.pathname;
    const shortCache =
      path === "/" ||
      path.endsWith(".html") ||
      path.endsWith(".css") ||
      path.endsWith(".js");
    if (!shortCache) return assetResponse;

    const headers = new Headers(assetResponse.headers);
    // Always revalidate HTML/CSS/JS so mobile browsers pick up ?v= bumps quickly.
    // (CF edge was observed serving stale script.js bodies under CF-Cache-Status: HIT.)
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    headers.set("CDN-Cache-Control", "no-cache");
    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  },
};
