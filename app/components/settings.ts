"use client";

import { useSyncExternalStore } from "react";

// BYOK settings live only in this browser's localStorage. The key is sent to
// our own /api/analyze with each request and never stored on the server.
export type Settings = { apiKey: string; model: string };

const STORAGE_KEY = "my-stock:openai";
const EVENT = "my-stock:settings";
const EMPTY: Settings = { apiKey: "", model: "" };

let cachedRaw: string | null | undefined;
let cached: Settings = EMPTY;

function read(): Settings {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // storage blocked: behave as if nothing is saved
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
    } catch {
      cached = EMPTY;
    }
  }
  return cached; // same object while unchanged, as useSyncExternalStore requires
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange); // other tabs
  window.addEventListener(EVENT, onChange); // this tab
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function saveSettings(s: Settings) {
  try {
    if (s.apiKey || s.model) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    throw new Error("瀏覽器封鎖了本機儲存，無法保存設定");
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useSettings() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function maskKey(key: string) {
  return key.length > 12 ? `${key.slice(0, 7)}…${key.slice(-4)}` : "••••";
}
