import { HttpTransport } from '../transport/HttpTransport';
import type {
  ApiResponse,
  ContentMode,
  CreateProjectOptions,
  CreatorMakerConfig,
  GenerateOptions,
  GenerationJob,
  GenerationOutput,
  JobStatus,
  ListJobsParams,
  Project,
  StylePreset,
  UsageSummary,
} from '../types';

const DEFAULT_API_BASE_URL = 'https://api.scalemule.com';
const TERMINAL_STATUSES: JobStatus[] = ['completed', 'failed', 'moderation_rejected', 'cancelled'];

export class CreatorMakerClient {
  private http: HttpTransport;

  constructor(config: CreatorMakerConfig) {
    const baseUrl = config.apiBaseUrl ?? DEFAULT_API_BASE_URL;

    this.http = new HttpTransport({
      baseUrl,
      apiKey: config.apiKey,
      getToken:
        config.getToken ??
        (config.sessionToken
          ? () => Promise.resolve(config.sessionToken!)
          : undefined),
    });
  }

  // ── Generation Jobs ──

  async generate(options: GenerateOptions): Promise<ApiResponse<GenerationJob>> {
    return this.http.post<GenerationJob>('/v1/creator-maker/jobs', {
      ...options,
      provider_mode: options.provider_mode ?? 'auto',
    });
  }

  async getJob(jobId: string): Promise<ApiResponse<GenerationJob>> {
    return this.http.get<GenerationJob>(`/v1/creator-maker/jobs/${jobId}`);
  }

  async listJobs(params?: ListJobsParams): Promise<ApiResponse<GenerationJob[]>> {
    const qs = params ? toQueryString(params) : '';
    return this.http.get<GenerationJob[]>(`/v1/creator-maker/jobs${qs}`);
  }

  async cancelJob(jobId: string): Promise<ApiResponse<{ id: string; status: string }>> {
    return this.http.post(`/v1/creator-maker/jobs/${jobId}/cancel`);
  }

  async retryJob(jobId: string): Promise<ApiResponse<GenerationJob>> {
    return this.http.post<GenerationJob>(`/v1/creator-maker/jobs/${jobId}/retry`);
  }

  async generateVariations(jobId: string): Promise<ApiResponse<GenerationJob[]>> {
    return this.http.post<GenerationJob[]>(`/v1/creator-maker/jobs/${jobId}/variations`);
  }

  /**
   * Wait for a job to reach a terminal state.
   * Uses server-side long-polling (30s timeout per request).
   */
  async waitForJob(
    jobId: string,
    options?: {
      timeout?: number;
      onProgress?: (job: GenerationJob) => void;
    },
  ): Promise<ApiResponse<GenerationJob>> {
    const timeout = options?.timeout ?? 120_000;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const result = await this.http.get<GenerationJob>(
        `/v1/creator-maker/jobs/${jobId}/poll`,
      );

      if (result.error) return result;

      const job = result.data!;
      options?.onProgress?.(job);

      if (TERMINAL_STATUSES.includes(job.status)) {
        return result;
      }
    }

    return {
      data: null,
      error: { code: 'timeout', message: 'Generation timed out', status: 408 },
    };
  }

  // ── Projects ──

  async createProject(options: CreateProjectOptions): Promise<ApiResponse<Project>> {
    return this.http.post<Project>('/v1/creator-maker/projects', options);
  }

  async listProjects(params?: { page?: number; per_page?: number }): Promise<ApiResponse<Project[]>> {
    const qs = params ? toQueryString(params) : '';
    return this.http.get<Project[]>(`/v1/creator-maker/projects${qs}`);
  }

  async getProject(projectId: string): Promise<ApiResponse<Project>> {
    return this.http.get<Project>(`/v1/creator-maker/projects/${projectId}`);
  }

  // ── Presets ──

  async listPresets(mode?: ContentMode): Promise<ApiResponse<StylePreset[]>> {
    const qs = mode ? `?mode=${mode}` : '';
    return this.http.get<StylePreset[]>(`/v1/creator-maker/presets${qs}`);
  }

  async getPreset(slug: string): Promise<ApiResponse<StylePreset>> {
    return this.http.get<StylePreset>(`/v1/creator-maker/presets/${slug}`);
  }

  // ── Outputs ──

  async getOutput(outputId: string): Promise<ApiResponse<GenerationOutput>> {
    return this.http.get<GenerationOutput>(`/v1/creator-maker/outputs/${outputId}`);
  }

  async getDownloadUrl(outputId: string): Promise<ApiResponse<{ cdn_url: string }>> {
    return this.http.get(`/v1/creator-maker/outputs/${outputId}/download`);
  }

  // ── Usage ──

  async getUsage(): Promise<ApiResponse<UsageSummary>> {
    return this.http.get<UsageSummary>('/v1/creator-maker/usage');
  }
}

function toQueryString(params: Record<string, unknown>): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return pairs.length > 0 ? `?${pairs.join('&')}` : '';
}
