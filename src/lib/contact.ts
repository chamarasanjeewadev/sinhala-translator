// Customer support contact details. WhatsApp is chat-only (no voice calls).
export const SUPPORT_EMAIL = "hi@helavoice.lk";

export const WHATSAPP_NUMBER_DISPLAY = "+94 76 452 9963";
const WHATSAPP_NUMBER_E164 = "94764529963";

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER_E164}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
