import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { CreatorMakerClient } from './core/CreatorMakerClient';
import type {
  ContentMode,
  CreatorMakerConfig,
  GenerateOptions,
  GenerationJob,
  JobStatus,
  ListJobsParams,
  StylePreset,
  UsageSummary,
} from './types';

// ── Context ──

const CreatorMakerContext = createContext<CreatorMakerClient | null>(null);

export function CreatorMakerProvider({
  config,
  children,
}: {
  config: CreatorMakerConfig;
  children: ReactNode;
}) {
  const [client] = useState(() => new CreatorMakerClient(config));
  return (
    <CreatorMakerContext.Provider value={client}>
      {children}
    </CreatorMakerContext.Provider>
  );
}

export function useCreatorMaker(): CreatorMakerClient {
  const client = useContext(CreatorMakerContext);
  if (!client)
    throw new Error('useCreatorMaker must be used within CreatorMakerProvider');
  return client;
}

// ── useGenerate ──

export function useGenerate() {
  const client = useCreatorMaker();
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (options: GenerateOptions): Promise<GenerationJob | null> => {
      setIsGenerating(true);
      setError(null);
      setJob(null);

      const { data, error: apiError } = await client.generate(options);

      if (apiError) {
        setError(apiError.message);
        setIsGenerating(false);
        return null;
      }

      setJob(data!);

      // Wait for completion via long-poll
      const result = await client.waitForJob(data!.id, {
        onProgress: (updated) => setJob(updated),
      });

      setIsGenerating(false);

      if (result.error) {
        setError(result.error.message);
        return null;
      }

      setJob(result.data!);
      return result.data!;
    },
    [client],
  );

  const cancel = useCallback(async () => {
    if (!job) return;
    await client.cancelJob(job.id);
    setIsGenerating(false);
    setJob((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
  }, [client, job]);

  return { generate, cancel, job, isGenerating, error };
}

// ── usePresets ──

export function usePresets(mode?: ContentMode) {
  const client = useCreatorMaker();
  const [presets, setPresets] = useState<StylePreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      const { data } = await client.listPresets(mode);
      if (!cancelled) {
        setPresets(data ?? []);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, mode]);

  return { presets, isLoading };
}

// ── useJobHistory ──

export function useJobHistory(params?: ListJobsParams) {
  const client = useCreatorMaker();
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data } = await client.listJobs(params);
    setJobs(data ?? []);
    setIsLoading(false);
  }, [client, params]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { jobs, isLoading, refresh };
}

// ── useUsage ──

export function useUsage() {
  const client = useCreatorMaker();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data } = await client.getUsage();
    setUsage(data);
    setIsLoading(false);
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { usage, isLoading, refresh };
}
