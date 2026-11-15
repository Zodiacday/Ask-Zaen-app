import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchRemoteMedia,
  RemoteMediaQueryParams,
} from '@/constants/mediaSource';
import { KidsMediaItem } from '@/constants/kidsDb';

type RemoteMediaParams = Omit<RemoteMediaQueryParams, 'cursor' | 'signal'>;

interface RemoteMediaState {
  items: KidsMediaItem[];
  loading: boolean;
  ready: boolean;
  failed: boolean;
  hasMore: boolean;
  nextCursor: string | null;
  total: number | null;
  loadMore: () => Promise<void>;
}

const appendUnique = (current: KidsMediaItem[], incoming: KidsMediaItem[]) => {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !seen.has(item.id))];
};

export function useRemoteMedia(
  params: RemoteMediaParams,
  enabled = true
): RemoteMediaState {
  const [items, setItems] = useState<KidsMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const requestId = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const paramsKey = JSON.stringify(params);
  // paramsKey is the intentional identity for inline query objects.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableParams = useMemo(() => params, [paramsKey]);

  useEffect(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const currentRequest = ++requestId.current;

    if (!enabled) {
      return () => controller.abort();
    }

    const run = async () => {
      setItems([]);
      setLoading(true);
      setReady(false);
      setFailed(false);
      setHasMore(false);
      setNextCursor(null);
      setTotal(null);

      const result = await fetchRemoteMedia({
        ...stableParams,
        cursor: null,
        signal: controller.signal,
      });
      if (controller.signal.aborted || currentRequest !== requestId.current) return;
      if (!result) {
        setFailed(true);
        setLoading(false);
        setReady(true);
        return;
      }
      setItems(result.items);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
      setTotal(typeof result.total === 'number' ? result.total : null);
      setLoading(false);
      setReady(true);
    };
    void run();

    return () => controller.abort();
  }, [enabled, stableParams]);

  const loadMore = useCallback(async () => {
    if (!enabled || loading || failed || !hasMore || !nextCursor) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const currentRequest = ++requestId.current;
    setLoading(true);

    const result = await fetchRemoteMedia({
      ...stableParams,
      cursor: nextCursor,
      signal: controller.signal,
    });

    if (controller.signal.aborted || currentRequest !== requestId.current) return;
    if (!result) {
      setFailed(true);
      setLoading(false);
      return;
    }
    setItems((current) => appendUnique(current, result.items));
    setHasMore(result.hasMore);
    setNextCursor(result.nextCursor);
    setTotal(typeof result.total === 'number' ? result.total : null);
    setLoading(false);
  }, [enabled, failed, hasMore, loading, nextCursor, stableParams]);

  return {
    items: enabled ? items : [],
    loading: enabled && loading,
    ready: enabled && ready,
    failed: enabled ? failed : false,
    hasMore: enabled && hasMore,
    nextCursor: enabled ? nextCursor : null,
    total: enabled ? total : null,
    loadMore,
  };
}
