import { useState, useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "parrotng-bookmarks";

let listeners: Array<() => void> = [];

function getSnapshot(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persist(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

let cached: Set<string> | null = null;
function getSnapshotCached() {
  const next = getSnapshot();
  if (cached && next.size === cached.size && [...next].every((id) => cached!.has(id))) {
    return cached;
  }
  cached = next;
  return cached;
}

export function useBookmarks() {
  const bookmarks = useSyncExternalStore(subscribe, getSnapshotCached);

  const toggle = useCallback((id: string) => {
    const current = getSnapshot();
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    persist(current);
  }, []);

  const isBookmarked = useCallback((id: string) => bookmarks.has(id), [bookmarks]);

  return { bookmarks, toggle, isBookmarked };
}
