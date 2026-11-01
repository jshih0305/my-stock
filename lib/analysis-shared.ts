// Types and constants shared by the analyze API and the browser UI.
// Keep this file free of server-only imports.

export const DEFAULT_MODEL = "gpt-5.4-mini";

export type Impact = "利多" | "利空" | "中性";

export type Action = "加碼買進" | "賣出" | "暫時不動";

export type Analysis = {
  verdict: Impact;
  confidence: number; // 0-100
  headline: string;
  plainSummary: string; // beginner-friendly summary
  action: Action;
  actionReason: string;
  watchFor: string[]; // signals to keep an eye on next
  reasons: { category: "技術面" | "籌碼面" | "消息面" | "基本面"; impact: Impact; point: string }[];
  risks: string[];
  glossary: { term: string; meaning: string }[];
};

export type AnalysisResult = {
  code: string;
  name: string;
  model: string;
  generatedAt: string;
  analysis: Analysis;
};
