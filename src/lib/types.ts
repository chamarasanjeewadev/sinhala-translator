export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  credits: number;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: "signup_bonus" | "purchase" | "transcription" | "translation";
  stripe_session_id: string | null;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // in cents
  priceDisplay: string;
  popular?: boolean;
}

export interface DeductCreditResult {
  success: boolean;
  remaining_credits: number;
  error_message: string | null;
}

export interface AddCreditsResult {
  success: boolean;
  new_balance: number;
  error_message: string | null;
}

export interface TranscriptionResponse {
  text: string;
  creditsRemaining: number;
}

export interface AnalyzeResponse {
  durationSeconds: number;
  requiredCredits: number;
  currentCredits: number;
  canProceed: boolean;
}

export interface ChunkTranscribeResponse {
  text: string;
  creditsRemaining: number;
  chunkIndex: number;
}

export interface SaveTranscriptResponse {
  transcriptionId: string;
}

export interface AudioChunk {
  blob: Blob;
  durationSec: number;
  index: number;
}

export interface Transcription {
  id: string;
  user_id: string;
  title: string | null;
  transcription_text: string;
  english_translation: string | null;
  audio_duration_seconds: number | null;
  credits_used: number;
  is_partial: boolean;
  has_timestamps: boolean;
  is_conversation: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface TranslateResponse {
  translation: string;
  creditsUsed: number;
  creditsRemaining: number;
}

export interface SubtitleSegment {
  id: string;
  /** Start time in seconds from the beginning of the video */
  start: number;
  /** End time in seconds from the beginning of the video */
  end: number;
  /** Subtitle text; may contain a single "\n" for a two-line subtitle */
  text: string;
}

export type SubtitleLanguage = "si" | "en" | "auto";

export type SubtitleFontFamily =
  | "noto-sans-sinhala"
  | "gemunu-libre"
  | "abhaya-libre"
  | "yaldevi"
  | "noto-serif-sinhala"
  | "inter";

export interface SubtitleStyle {
  fontFamily: SubtitleFontFamily;
  /** Font size as a percentage of the video height */
  fontSizePct: number;
  color: string;
  backgroundColor: string;
  /** 0–1 */
  backgroundOpacity: number;
  anchor: "bottom" | "middle" | "top";
  /** Distance from the anchor edge as a percentage of the video height */
  verticalOffsetPct: number;
}

export interface SubtitleProject {
  id: string;
  user_id: string;
  title: string | null;
  video_filename: string;
  video_size_bytes: number | null;
  video_duration_seconds: number;
  language: SubtitleLanguage;
  segments: SubtitleSegment[];
  style: SubtitleStyle | null;
  credits_used: number;
  is_partial: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubtitleAnalyzeResponse {
  durationSeconds: number;
  requiredCredits: number;
  currentCredits: number;
  canProceed: boolean;
}

export interface SubtitleChunkResponse {
  /** Segments with absolute (whole-video) times, already offset by the server */
  segments: SubtitleSegment[];
  creditsRemaining: number;
  chunkIndex: number;
}
