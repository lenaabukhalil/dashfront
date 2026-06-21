import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "ion-sidebar-collapsed";

const listeners = new Set<() => void>();

let collapsed = false;
let hydrated = false;

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getSnapshot(): boolean {
  if (typeof window !== "undefined" && !hydrated) {
    collapsed = readCollapsed();
    hydrated = true;
  }
  return collapsed;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function persist(next: boolean) {
  collapsed = next;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    /* ignore quota / private mode */
  }
  listeners.forEach((listener) => listener());
}

export function useSidebarState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const toggle = useCallback(() => {
    persist(!getSnapshot());
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    persist(value);
  }, []);

  return { collapsed: state, toggle, setCollapsed };
}
