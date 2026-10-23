# Bulk transcription (manual / B2B jobs)

Transcribes a public Google Drive folder of Sinhala audio straight through the
Gemini API, with the same prompt and model as helavoice.lk, and produces one
TXT and one DOCX per file, an internal cost sheet and a coverage report. Used
for the PEAK client job (Oct 2026). Nothing goes through the helavoice.lk API,
and no user's credits change.

## Why it's more than a loop over files

A single Gemini pass over 2‑minute chunks occasionally **drops** a short
phrase, typically one of several sentences that open the same way ("I'm here
to … I'm here to …"), and occasionally **invents** a plausible one. Clients
notice the missing lines. So `run.mts`:

1. **Picks channels from the whole file.** A silent channel, two identical
   channels, or different speech on each channel (Sinhala mixed in; English
   left out after a 3‑point language check).
2. **Cuts chunks at pauses** within ±6 s of every 120 s, so no word is split.
3. **Runs three passes** with different boundaries (first cut at ~120, ~60 and
   ~30 s), and merges them word by word (`merge.mts`). A phrase missing from
   pass A is restored only when **both** other passes heard it.
4. **Retries bad chunk output.** Gemini sometimes answers chattily in English
   ("Sure, here's the transcription…"), or with far too little text for the
   speech in the chunk.
5. **Lists what a human should check.** Phrases only one pass heard, and
   phrases said twice in a row, go into `internal/coverage-report.md`, each
   with a 30 s MP3 clip in `review/`. Listen, then edit the TXT and rebuild
   the DOCX if needed.

This makes the transcript much more complete; it can't guarantee 100%. The
review list is how you get the rest of the way.

## Run it

All commands run from `hela-voice-web/`. You need `ffmpeg`, plus
`GOOGLE_CLOUD_API_KEY` in `.env.local`.

1. Make a work folder (outside the repo) with `ids.txt`: one line per file,
   `<drive-file-id> <file name>`, in the order you want. To list a public
   folder's files, open the folder in a browser and run in the console:
   ```js
   [...document.querySelectorAll('[data-id]')].map(e => [e.dataset.id, e.innerText.split('\n')[0]]).filter(([id, n]) => id.length > 20 && /\.(wav|mp3|m4a)$/i.test(n)).map(r => r.join(' ')).join('\n')
   ```
   Optionally add `titles.json` (`{"<file base>": "Document title"}`) for
   DOCX titles; the file base is the name without extension, spaces → `_`.
2. Transcribe (resumable; rerun the same command after any failure):
   ```bash
   set -a; source .env.local; set +a
   WORK=/path/to/work OUT=/path/to/output npx tsx scripts/bulk-transcribe/run.mts
   ```
   For speed, run 2–3 copies with `ONLY=0,1,2,…` (line indexes in `ids.txt`)
   on disjoint files. Gemini times out more with more parallel requests.

   Keep `WORK` somewhere durable, not a temp folder: it caches every chunk
   and each file's audio, so reruns cost nothing and never download again.
   Google Drive blocks a shared file for ~24 h ("Quota exceeded") after a few
   full downloads. If that happens, download the folder in a browser and put
   the files in `$WORK/source/` under their original names; the script uses
   a local copy when one is there.
3. Build outputs:
   ```bash
   WORK=… OUT=… npx tsx scripts/bulk-transcribe/docx.mts    # OUT/docx/*.docx
   WORK=… OUT=… npx tsx scripts/bulk-transcribe/report.mts  # OUT/internal/coverage-report.md
   WORK=… OUT=… npx tsx scripts/bulk-transcribe/cost.mts    # OUT/internal/gemini-cost-sheet.csv
   ```
   `cost.mts` prices tokens with `hela-voice-admin/src/lib/gemini-pricing.ts`
   (sibling checkout). Credits are 1 per started minute of the **decoded**
   audio. Don't trust WAV headers for billing: one PEAK file's header claimed
   20:58 for 14:27 of audio.

`MODEL` / `THINKING` override the Gemini model and thinking level; keep them
matching the admin setting (`app_settings`). Three passes cost about 3× a
single pass: ~US$3 for 7 hours of audio.
