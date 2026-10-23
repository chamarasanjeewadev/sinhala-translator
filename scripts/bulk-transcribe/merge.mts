// Merges transcripts of the same audio made with different chunk boundaries.
// Each Gemini pass occasionally drops a short phrase, and occasionally invents
// one. Where the two disagree by MIN_RUN+ words: B's extra words go in only if
// `accept` agrees (in run.mts: a third pass heard them too), else they are
// returned as `rejected`. A's extra words always stay — dropping them threw
// away real speech when the other passes failed on that chunk — but if
// `confirmA` disagrees they are returned as `unconfirmed`, for a human check.

export interface Run {
  /** Word index in the merged transcript where the run belongs. */
  at: number;
  text: string;
}

const MIN_RUN = 3;

// Compare words without punctuation so "කියනවා." matches "කියනවා".
export function key(word: string): string {
  return word.replace(/[^\p{L}\p{M}\p{N}]/gu, "");
}

/** Space-joined comparison keys, for "does this text contain that run". */
export function keyText(text: string): string {
  return ` ${text.split(/\s+/).map(key).filter(Boolean).join(" ")} `;
}

/** Longest-common-subsequence alignment → list of [aIndex|-1, bIndex|-1]. */
function align(a: string[], b: string[]): [number, number][] {
  const n = a.length, m = b.length;
  const w = m + 1;
  const dp = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] = a[i] === b[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }
  const out: [number, number][] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) out.push([i++, j++]);
    else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) out.push([i++, -1]);
    else out.push([-1, j++]);
  }
  while (i < n) out.push([i++, -1]);
  while (j < m) out.push([-1, j++]);
  return out;
}

export function mergeTranscripts(
  textA: string,
  textB: string,
  accept: (run: string) => boolean = () => true,
  confirmA: (run: string) => boolean = () => true
): { text: string; inserted: Run[]; rejected: Run[]; unconfirmed: Run[] } {
  const A = textA.split(/\s+/).filter(Boolean);
  const B = textB.split(/\s+/).filter(Boolean);
  const pairs = align(A.map(key), B.map(key));

  const merged: string[] = [];
  const inserted: Run[] = [];
  const rejected: Run[] = [];
  const unconfirmed: Run[] = [];
  let aGap: string[] = [];
  let bGap: string[] = [];
  // Between two aligned words, if B heard MIN_RUN+ more words than A, A may
  // have dropped speech there. Otherwise keep A's words (a wording
  // difference, or speech only A heard).
  const resolveGap = () => {
    if (aGap.length - bGap.length >= MIN_RUN && !confirmA(aGap.join(" "))) {
      unconfirmed.push({ at: merged.length, text: aGap.join(" ") });
      merged.push(...aGap);
    } else if (bGap.length - aGap.length >= MIN_RUN) {
      const run = { at: merged.length, text: bGap.join(" ") };
      if (accept(run.text)) {
        inserted.push(run);
        merged.push(...bGap);
      } else {
        rejected.push(run);
        merged.push(...aGap);
      }
    } else {
      merged.push(...aGap);
    }
    aGap = [];
    bGap = [];
  };
  for (const [i, j] of pairs) {
    if (i >= 0 && j >= 0) {
      resolveGap();
      merged.push(A[i]);
    } else if (i >= 0) {
      aGap.push(A[i]);
    } else {
      bGap.push(B[j]);
    }
  }
  resolveGap();

  return { text: merged.join(" "), inserted, rejected, unconfirmed };
}

/** Phrases of 2+ words repeated back to back ("X Y X Y"), a sign of skipped words. */
export function stutters(text: string): { at: number; text: string }[] {
  const w = text.split(/\s+/).filter(Boolean);
  const k = w.map(key);
  const out: { at: number; text: string }[] = [];
  for (let i = 0; i < k.length; i++) {
    for (const n of [4, 3, 2]) {
      if (i + 2 * n > k.length) continue;
      let same = true;
      for (let x = 0; x < n && same; x++) same = k[i + x] === k[i + n + x] && k[i + x] !== "";
      if (same) { out.push({ at: i, text: w.slice(i, i + 2 * n).join(" ") }); i += 2 * n - 1; break; }
    }
  }
  return out;
}
