import { useCallback, useEffect, useRef, useState } from "react";
import { fetchChargingUsers, type ChargingUserListItem } from "@/services/api";

const SEARCH_DEBOUNCE_MS = 400;
const SEARCH_MIN_CHARS = 2;
const SEARCH_RESULT_LIMIT = 50;

export function useChargingUsers() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [rows, setRows] = useState<ChargingUserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search]);

  const runSearch = useCallback(async (term: string) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setRows([]);

    try {
      const list = await fetchChargingUsers({ q: term, limit: SEARCH_RESULT_LIMIT });
      if (requestId !== requestIdRef.current) return;
      setRows(list);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to load charging users");
      setRows([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const term = debouncedSearch.trim();
    if (term.length < SEARCH_MIN_CHARS) {
      requestIdRef.current += 1;
      setActiveQuery(null);
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }

    setActiveQuery(term);
    void runSearch(term);
  }, [debouncedSearch, runSearch]);

  const submitSearch = useCallback(() => {
    setDebouncedSearch(search.trim());
  }, [search]);

  const reload = useCallback(() => {
    const term = activeQuery?.trim();
    if (!term || term.length < SEARCH_MIN_CHARS) return;
    void runSearch(term);
  }, [activeQuery, runSearch]);

  return {
    rows,
    loading,
    error,
    search,
    setSearch,
    submitSearch,
    reload,
    activeQuery,
    isIdle: activeQuery === null,
  };
};
