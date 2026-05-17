// ─────────────────────────────────────────────────────────────
// AION — Persistent Storage Hook
// ─────────────────────────────────────────────────────────────
// Uses localStorage with JSON serialization.
// Drop-in replacement for the old window.storage API.
// ─────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect } from "react";

const PREFIX = "aion_";

function storageGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function storageSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn("AION storage write failed:", e);
  }
}

/**
 * React hook for persisted state.
 * State is saved to localStorage on every change and restored on mount.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setStateRaw] = useState<T>(() => {
    const saved = storageGet<T>(key);
    return saved !== null ? saved : defaultValue;
  });

  // Sync to localStorage on change
  useEffect(() => {
    storageSet(key, state);
  }, [key, state]);

  const setState = useCallback(
    (val: T | ((prev: T) => T)) => {
      setStateRaw(val);
    },
    []
  );

  return [state, setState];
}

/**
 * Low-level storage access (for one-off saves like strategy results).
 */
export const storage = {
  get: storageGet,
  set: storageSet,
};
