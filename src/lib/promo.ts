// Promo-code anti-abuse helpers.
//
// The per-account limit alone doesn't stop one person redeeming a promo across
// many free signups. Normalizing the email collapses the common aliasing tricks
// (Gmail dots and +tags, googlemail.com) to a single identity, and the DB's
// UNIQUE (code, normalized_email) turns that into a hard one-per-person rule.

// Common disposable / throwaway email domains. Not exhaustive — it catches the
// bulk of abuse without a network lookup. Add domains as you spot them.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "sharklasers.com",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "tempmail.dev",
  "yopmail.com",
  "trashmail.com",
  "trashmail.de",
  "getnada.com",
  "nada.email",
  "dispostable.com",
  "maildrop.cc",
  "fakeinbox.com",
  "throwawaymail.com",
  "mohmal.com",
  "emailondeck.com",
  "mintemail.com",
  "moakt.com",
  "tempinbox.com",
  "spamgourmet.com",
  "mailnesia.com",
  "harakirimail.com",
  "discard.email",
  "getairmail.com",
  "inboxkitten.com",
]);

function splitEmail(raw: string): { local: string; domain: string } | null {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return { local: email.slice(0, at), domain: email.slice(at + 1) };
}

/**
 * Reduce an email to a canonical identity so aliases of the same inbox collide.
 * - strips a +tag suffix (widely supported by providers)
 * - for Gmail/Googlemail: removes dots and treats googlemail.com as gmail.com
 * Returns the lowercased, trimmed email unchanged if it can't be parsed.
 */
export function normalizeEmail(raw: string): string {
  const parts = splitEmail(raw);
  if (!parts) return raw.trim().toLowerCase();

  let { local } = parts;
  let { domain } = parts;

  // Drop +tag for every provider (e.g. name+promo@ -> name@).
  const plus = local.indexOf("+");
  if (plus !== -1) local = local.slice(0, plus);

  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");

  return `${local}@${domain}`;
}

/** True if the email's domain is a known disposable/throwaway provider. */
export function isDisposableEmail(raw: string): boolean {
  const parts = splitEmail(raw);
  if (!parts) return false;
  return DISPOSABLE_DOMAINS.has(parts.domain);
}
