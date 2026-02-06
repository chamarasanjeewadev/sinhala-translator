export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  credits: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: "signup_bonus" | "purchase" | "transcription";
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
  audio_duration_seconds: number | null;
  credits_used: number;
  is_partial: boolean;
  created_at: string;
}
