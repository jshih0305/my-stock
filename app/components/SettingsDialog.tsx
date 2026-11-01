"use client";

import { useState } from "react";
import Modal from "./Modal";
import { maskKey, saveSettings, useSettings } from "./settings";
import { DEFAULT_MODEL } from "@/lib/analysis-shared";

export default function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="設定" eyebrow="SETTINGS">
      {/* Mounted only while open, so the form starts from the saved values each time */}
      {open && <SettingsForm onDone={onClose} />}
    </Modal>
  );
}

function SettingsForm({ onDone }: { onDone: () => void }) {
  const saved = useSettings();
  const [apiKey, setApiKey] = useState(saved.apiKey);
  const [model, setModel] = useState(saved.model);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const key = apiKey.trim();
    if (key && !key.startsWith("sk-")) {
      setError("OpenAI API Key 通常以 sk- 開頭，請再確認一次");
      return;
    }
    try {
      saveSettings({ apiKey: key, model: model.trim() });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function clear() {
    saveSettings({ apiKey: "", model: "" });
    setApiKey("");
    setModel("");
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="openai-key" className="text-sm font-semibold">
          OpenAI API Key
        </label>
        <div className="relative">
          <input
            id="openai-key"
            type={show ? "text" : "password"}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setError(null);
            }}
            placeholder="sk-..."
            autoComplete="off"
            spellCheck={false}
            className="field num w-full pr-16"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="btn-ghost absolute right-1 top-1 h-8 px-2.5 text-xs"
          >
            {show ? "隱藏" : "顯示"}
          </button>
        </div>
        <p className="meta leading-relaxed">
          {saved.apiKey && (
            <>
              目前已儲存：<span className="num">{maskKey(saved.apiKey)}</span>
              <br />
            </>
          )}
          到{" "}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline-offset-2 hover:underline"
          >
            platform.openai.com/api-keys
          </a>{" "}
          建立。分析費用由你的 OpenAI 帳戶支付。
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="openai-model" className="text-sm font-semibold">
          模型
        </label>
        <input
          id="openai-model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={DEFAULT_MODEL}
          autoComplete="off"
          spellCheck={false}
          className="field num w-full"
        />
        <p className="meta">留空則使用預設的 {DEFAULT_MODEL}。</p>
      </div>

      <div className="flex gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-xs leading-relaxed text-[var(--text-secondary)]">
        <svg viewBox="0 0 16 16" className="mt-0.5 size-3.5 shrink-0" aria-hidden>
          <rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <span>
          你的 Key 只存在這台裝置的瀏覽器中。每次分析時才會傳到本站後端、轉送給 OpenAI，伺服器不會儲存或記錄。請勿在公用電腦上儲存。
        </span>
      </div>

      {error && <p className="notice-error">{error}</p>}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={clear}
          disabled={!saved.apiKey && !saved.model}
          className="btn-ghost h-10 px-3 disabled:opacity-40"
        >
          清除設定
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={onDone} className="btn-ghost h-10 px-4">
            取消
          </button>
          <button type="submit" className="btn-primary">
            儲存
          </button>
        </div>
      </div>
    </form>
  );
}
