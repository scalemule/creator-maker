// ── Config ──

export interface CreatorMakerConfig {
  apiKey?: string;
  sessionToken?: string;
  getToken?: () => Promise<string | null>;
  apiBaseUrl?: string;
}

// ── API Response Contract ──

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
  error: ApiError | null;
}

// ── Enums ──

export type ContentMode = 'promo' | 'cartoon';
export type OutputType = 'image' | 'clip';
export type ProviderMode = 'auto' | 'fast' | 'balanced' | 'quality';
export type AspectRatio = '9:16' | '16:9' | '1:1';

export type JobStatus =
  | 'pending'
  | 'moderation_check'
  | 'queued'
  | 'processing'
  | 'composing'
  | 'completed'
  | 'failed'
  | 'moderation_rejected'
  | 'cancelled';

// ── Resources ──

export interface GenerationJob {
  id: string;
  project_id: string;
  output_type: string;
  content_mode: string;
  aspect_ratio: string;
  style_preset_slug?: string;
  prompt: string;
  provider_mode: string;
  status: JobStatus;
  moderation_status: string;
  estimated_credits: number;
  actual_credits?: number;
  attempt: number;
  outputs: GenerationOutput[];
  error_code?: string;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface GenerationOutput {
  id: string;
  output_type: string;
  cdn_url?: string;
  width: number;
  height: number;
  duration_sec?: number;
  file_size_bytes?: number;
  mime_type: string;
  seed?: number;
  created_at: string;
}

export interface StylePreset {
  id: string;
  mode: string;
  slug: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  sort_order: number;
  estimated_credits: number;
}

export interface Project {
  id: string;
  title: string;
  content_mode: string;
  created_at: string;
  updated_at: string;
}

export interface UsageSummary {
  balance_credits: number;
  total_generations: number;
  completed_generations: number;
}

// ── Request Types ──

export interface GenerateOptions {
  project_id?: string;
  output_type: OutputType;
  content_mode: ContentMode;
  aspect_ratio: AspectRatio;
  style_preset_slug?: string;
  prompt: string;
  provider_mode?: ProviderMode;
  source_assets?: SourceAssetInput[];
  composition?: CompositionConfig;
}

export interface SourceAssetInput {
  storage_file_id: string;
  role: 'reference' | 'init_image' | 'style_ref';
  weight?: number;
}

export interface CompositionConfig {
  caption?: string;
  caption_position?: 'top' | 'bottom' | 'center';
  logo_file_id?: string;
  logo_position?: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
  watermark?: boolean;
}

export interface CreateProjectOptions {
  title?: string;
  content_mode: ContentMode;
}

export interface ListJobsParams {
  page?: number;
  per_page?: number;
  status?: JobStatus;
  content_mode?: ContentMode;
}

// ── Realtime Events ──

export interface JobUpdateEvent {
  job_id: string;
  status: JobStatus;
  progress?: number;
}
