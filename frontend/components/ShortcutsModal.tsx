"use client";

import { X, Keyboard } from "lucide-react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "j", label: "Next record in the review queue" },
    { key: "k", label: "Previous record in the review queue" },
    { key: "e", label: "Focus first editable field (Company)" },
    { key: "Tab", label: "Move to next field" },
    { key: "Enter", label: "Save currently edited field" },
    { key: "Esc", label: "Cancel uncommitted edit / unfocus" },
    { key: "?", label: "Toggle this keyboard shortcuts cheatsheet" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400">
            <Keyboard className="w-5 h-5" />
            <h3 className="text-sm font-semibold text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-5 divide-y divide-slate-800/60">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
            >
              <span className="text-slate-300">{sc.label}</span>
              <kbd className="px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono font-semibold text-indigo-300 shadow-inner">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>Press <kbd className="font-mono text-slate-400">Esc</kbd> or click anywhere to close</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
