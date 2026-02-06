export const locales = ["en", "si"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
