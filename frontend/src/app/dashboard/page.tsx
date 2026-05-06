"use client";

import { useState } from "react";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
];

export default function DashboardPage() {
  const [sourceText, setSourceText] = useState("");
  const [fromLang, setFromLang] = useState("en");
  const [toLang, setToLang] = useState("es");
  const [translated, setTranslated] = useState(false);

  function handleTranslate() {
    if (!sourceText.trim()) return;
    setTranslated(true);
  }

  return (
    <div className="min-h-screen p-8">
      <h2 className="text-2xl font-bold mb-6">Translation Workspace</h2>
      <div className="max-w-2xl space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-1">Source text</label>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={4}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
            placeholder="Enter text to translate..."
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">From language</label>
            <select
              value={fromLang}
              onChange={(e) => setFromLang(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">To language</label>
            <select
              value={toLang}
              onChange={(e) => setToLang(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleTranslate}
          className="px-4 py-2 bg-[#0891B2] text-white rounded-md hover:bg-[#0E7490] transition"
        >
          Translate
        </button>
      </div>

      {translated && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">Translated text</p>
            <p className="text-lg font-semibold">[Mock translation of: {sourceText}]</p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">Detected language</p>
            <p className="text-lg font-semibold">
              {LANGUAGES.find((l) => l.code === fromLang)?.label || fromLang}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">Confidence score</p>
            <p className="text-3xl font-bold text-[#0891B2]">0.94</p>
          </div>
        </div>
      )}
    </div>
  );
}
