'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { SessionStatus } from '@/lib/types';

interface SourceInfo {
  id: string;
  name: string;
  nameAr: string;
  baseUrl: string;
  enabled: boolean;
  pollIntervalSeconds: number;
  lastFetchedAt: string | null;
  sessionStatus: SessionStatus;
}

interface AppContextValue {
  sources: SourceInfo[];
  loadingSources: boolean;
  refreshSources: () => Promise<void>;
  triggerWorker: () => Promise<void>;
}

const AppContext = createContext<AppContextValue>({
  sources: [],
  loadingSources: true,
  refreshSources: async () => {},
  triggerWorker: async () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);

  const refreshSources = async () => {
    const { data: srcData } = await supabase.from('sources').select('*');
    const { data: sessData } = await supabase.from('sessions').select('*');

    const sessionMap = new Map<string, string>();
    for (const s of sessData ?? []) {
      sessionMap.set(s.source_id, s.status);
    }

    const combined: SourceInfo[] = (srcData ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      nameAr: s.name_ar,
      baseUrl: s.base_url,
      enabled: s.enabled,
      pollIntervalSeconds: s.poll_interval_seconds,
      lastFetchedAt: s.last_fetched_at,
      sessionStatus: (sessionMap.get(s.id) as SessionStatus) ?? 'missing',
    }));

    setSources(combined);
    setLoadingSources(false);
  };

  const triggerWorker = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    try {
      await fetch(`${supabaseUrl}/functions/v1/scout-worker`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${anonKey}` },
      });
      await refreshSources();
    } catch {
      // silently fail — UI shows stale data
    }
  };

  useEffect(() => {
    refreshSources();
  }, []);

  return <AppContext.Provider value={{ sources, loadingSources, refreshSources, triggerWorker }}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
