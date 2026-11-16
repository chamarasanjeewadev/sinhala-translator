// Passes text between tool pages (scan -> TTS / translator) via sessionStorage.
export const HANDOFF_KEY = "helavoice:handoff-text";

export function writeHandoffText(text: string): void {
  try {
    sessionStorage.setItem(HANDOFF_KEY, text);
  } catch {
    // storage blocked or full: the target page just opens empty
  }
}

/** Reads and clears the pending text. */
export function readHandoffText(): string | null {
  try {
    const v = sessionStorage.getItem(HANDOFF_KEY);
    if (v !== null) sessionStorage.removeItem(HANDOFF_KEY);
    return v;
  } catch {
    return null;
  }
}
