import { useCallback, useSyncExternalStore } from "react";

const HISTORY_KEY = "parrotng-reading-history";

interface ReadEntry {
  articleId: string;
  timestamp: number;
  category: string;
  headline: string;
}

let listeners: Array<() => void> = [];

function getSnapshot(): ReadEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(entries: ReadEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

let cached: ReadEntry[] | null = null;
function getSnapshotCached(): ReadEntry[] {
  const next = getSnapshot();
  if (cached && JSON.stringify(cached) === JSON.stringify(next)) return cached;
  cached = next;
  return cached;
}

export function useReadingHistory() {
  const history = useSyncExternalStore(subscribe, getSnapshotCached);

  const markRead = useCallback((articleId: string, category: string, headline: string) => {
    const entries = getSnapshot();
    if (entries.some((e) => e.articleId === articleId)) return;
    const updated = [{ articleId, timestamp: Date.now(), category, headline }, ...entries].slice(0, 100);
    persist(updated);
  }, []);

  const isRead = useCallback(
    (articleId: string) => history.some((e) => e.articleId === articleId),
    [history]
  );

  const topCategories = (() => {
    const counts: Record<string, number> = {};
    history.forEach((e) => {
      counts[e.category] = (counts[e.category] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([cat]) => cat);
  })();

  const recentHistory = history.slice(0, 20);

  return { history: recentHistory, markRead, isRead, topCategories, totalRead: history.length };
}
