/**
 * Pure encoders that turn structured form data into the raw string a QR code
 * should contain. Kept free of any DOM/library dependency so they can be unit
 * tested and reused. See qr-encode.test.ts for the exact expected output.
 */

export type QrContentType =
  | "url"
  | "text"
  | "wifi"
  | "email"
  | "phone"
  | "sms"
  | "vcard";

export type WifiEncryption = "WPA" | "WEP" | "nopass";

export interface WifiFields {
  ssid: string;
  password?: string;
  encryption?: WifiEncryption;
  hidden?: boolean;
}

export interface EmailFields {
  to: string;
  subject?: string;
  body?: string;
}

export interface SmsFields {
  number: string;
  message?: string;
}

export interface VCardFields {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  org?: string;
  title?: string;
  url?: string;
  address?: string;
}

export type QrContent =
  | { type: "url"; url: string }
  | { type: "text"; text: string }
  | ({ type: "wifi" } & WifiFields)
  | ({ type: "email" } & EmailFields)
  | { type: "phone"; phone: string }
  | ({ type: "sms" } & SmsFields)
  | ({ type: "vcard" } & VCardFields);

/** Escape the characters that carry meaning inside a WIFI: payload. */
function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

export function encodeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  // Already has a scheme (http, https, mailto, tel, ...) — leave it alone.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function encodeText(text: string): string {
  return text;
}

export function encodeWifi({
  ssid,
  password = "",
  encryption = "WPA",
  hidden = false,
}: WifiFields): string {
  const parts = [`WIFI:T:${encryption}`, `S:${escapeWifi(ssid)}`];
  if (encryption !== "nopass" && password) {
    parts.push(`P:${escapeWifi(password)}`);
  }
  if (hidden) parts.push("H:true");
  return `${parts.join(";")};;`;
}

export function encodeEmail({ to, subject, body }: EmailFields): string {
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  const query = params.length ? `?${params.join("&")}` : "";
  return `mailto:${to.trim()}${query}`;
}

export function encodePhone(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

export function encodeSms({ number, message }: SmsFields): string {
  const clean = number.replace(/\s+/g, "");
  return message ? `SMSTO:${clean}:${message}` : `SMSTO:${clean}`;
}

export function encodeVCard(fields: VCardFields): string {
  const {
    firstName = "",
    lastName = "",
    phone,
    email,
    org,
    title,
    url,
    address,
  } = fields;
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${lastName};${firstName}`];
  if (fullName) lines.push(`FN:${fullName}`);
  if (org) lines.push(`ORG:${org}`);
  if (title) lines.push(`TITLE:${title}`);
  if (phone) lines.push(`TEL;TYPE=CELL:${phone.replace(/\s+/g, "")}`);
  if (email) lines.push(`EMAIL:${email}`);
  if (url) lines.push(`URL:${url}`);
  if (address) lines.push(`ADR:;;${address};;;;`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

/**
 * Dispatch a content descriptor to the right encoder. Returns "" when the
 * required field for that type is blank, so the caller can suppress the QR.
 */
export function encodeQrContent(content: QrContent): string {
  switch (content.type) {
    case "url":
      return encodeUrl(content.url);
    case "text":
      return encodeText(content.text ?? "");
    case "wifi":
      return content.ssid?.trim() ? encodeWifi(content) : "";
    case "email":
      return content.to?.trim() ? encodeEmail(content) : "";
    case "phone":
      return content.phone?.trim() ? encodePhone(content.phone) : "";
    case "sms":
      return content.number?.trim() ? encodeSms(content) : "";
    case "vcard": {
      const hasAny =
        content.firstName ||
        content.lastName ||
        content.phone ||
        content.email ||
        content.org;
      return hasAny ? encodeVCard(content) : "";
    }
    default:
      return "";
  }
}
