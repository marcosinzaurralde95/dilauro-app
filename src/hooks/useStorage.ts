// ─────────────────────────────────────────────────────────────
// AION — Persistent Storage Hook (Supabase-backed)
// ─────────────────────────────────────────────────────────────
// Persistencia REAL entre sesiones y dispositivos:
//   • Fuente de verdad  → tabla `user_data` en Supabase (por usuario, RLS).
//   • Caché local       → localStorage (restauración instantánea + modo offline).
//   • Migración         → datos previos en localStorage se suben a Supabase
//                         la primera vez que el usuario inicia sesión.
//
// La API pública (`usePersistedState`, `storage`) se mantiene idéntica para
// no alterar el resto del app: solo cambia DÓNDE se guardan los datos.
// ─────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";

const PREFIX = "aion_";

// Clave de caché local namespaced por usuario, para que cuentas distintas
// que comparten el mismo navegador nunca se mezclen.
function cacheKey(userId: string | null, key: string): string {
  return PREFIX + (userId ? `${userId}_` : "") + key;
}

// Clave legacy (versión anterior, sin namespace) — usada solo para migrar.
function legacyKey(key: string): string {
  return PREFIX + key;
}

function readCache<T>(storageKey: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeCache<T>(storageKey: string, value: T): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (e) {
    console.warn("AION cache write failed:", e);
  }
}

// ── Acceso remoto (Supabase) ──────────────────────────────────
async function remoteGet<T>(userId: string, key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("user_data")
    .select("value")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.warn("AION remote read failed:", error.message);
    return null;
  }
  return data ? (data.value as T) : null;
}

async function remoteSet<T>(userId: string, key: string, value: T): Promise<void> {
  const { error } = await supabase.from("user_data").upsert(
    {
      user_id: userId,
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,key" }
  );
  if (error) console.warn("AION remote write failed:", error.message);
}

/**
 * Estado persistido por usuario.
 * - Restaura al instante desde la caché local (si existe).
 * - Hidrata desde Supabase cuando el usuario está disponible (multi-dispositivo).
 * - Guarda cada cambio en Supabase (con debounce) y en la caché local.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (val: T | ((prev: T) => T)) => void] {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [state, setStateRaw] = useState<T>(defaultValue);

  // hydrated evita que escribamos el `defaultValue` en remoto antes de
  // haber cargado los datos reales del usuario.
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hidratación: corre cuando cambia el usuario (login / cambio de cuenta)
  useEffect(() => {
    hydrated.current = false;

    // Sin usuario: restaura desde caché legacy (sesión anónima / sin Supabase).
    if (!userId || !isSupabaseConfigured) {
      const local = readCache<T>(legacyKey(key));
      setStateRaw(local !== null ? local : defaultValue);
      hydrated.current = true;
      return;
    }

    let cancelled = false;

    // 1) Restauración instantánea desde la caché de ESTE usuario (si existe).
    const cached = readCache<T>(cacheKey(userId, key));
    if (cached !== null) setStateRaw(cached);

    // 2) Carga autoritativa desde Supabase (cross-device).
    (async () => {
      const remote = await remoteGet<T>(userId, key);
      if (cancelled) return;

      if (remote !== null) {
        setStateRaw(remote);
        writeCache(cacheKey(userId, key), remote);
      } else {
        // Sin dato remoto → migrar desde caché (de este usuario o legacy).
        const fallback =
          readCache<T>(cacheKey(userId, key)) ?? readCache<T>(legacyKey(key));
        if (fallback !== null) {
          setStateRaw(fallback);
          writeCache(cacheKey(userId, key), fallback);
          await remoteSet(userId, key, fallback);
        } else {
          setStateRaw(defaultValue);
        }
      }
      hydrated.current = true;
    })();

    return () => {
      cancelled = true;
    };
    // defaultValue se omite a propósito: solo re-hidratamos por usuario/clave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, key]);

  // ── Persistencia: cada cambio va a la caché local y (con debounce) a Supabase.
  useEffect(() => {
    if (!hydrated.current) return;

    writeCache(cacheKey(userId, key), state);

    if (!userId || !isSupabaseConfigured) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      remoteSet(userId, key, state);
    }, 400);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [key, state, userId]);

  const setState = useCallback((val: T | ((prev: T) => T)) => {
    setStateRaw(val);
  }, []);

  return [state, setState];
}

// ─────────────────────────────────────────────────────────────
// Acceso de bajo nivel (guardados puntuales, ej. resultados de Strategy Room).
// Persisten en Supabase cuando hay sesión, con caché local de respaldo.
// ─────────────────────────────────────────────────────────────

/** Guarda un valor puntual para el usuario actual (remoto + caché local). */
export async function saveUserData<T>(key: string, value: T): Promise<void> {
  if (!isSupabaseConfigured) {
    writeCache(legacyKey(key), value);
    return;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    writeCache(legacyKey(key), value);
    return;
  }
  writeCache(cacheKey(user.id, key), value);
  await remoteSet(user.id, key, value);
}

/** Lee un valor puntual del usuario actual (remoto, con fallback a caché). */
export async function loadUserData<T>(key: string): Promise<T | null> {
  if (isSupabaseConfigured) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const remote = await remoteGet<T>(user.id, key);
      if (remote !== null) return remote;
      return readCache<T>(cacheKey(user.id, key));
    }
  }
  return readCache<T>(legacyKey(key));
}

/**
 * Acceso síncrono legacy (solo caché local). Se mantiene por compatibilidad.
 * Para persistencia real entre dispositivos usar `saveUserData` / `loadUserData`.
 */
export const storage = {
  get: <T>(key: string): T | null => readCache<T>(legacyKey(key)),
  set: <T>(key: string, value: T): void => writeCache(legacyKey(key), value),
};
