"use client";

import { X } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#161922] border border-[#262a36] rounded-md max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#262a36] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#f3f4f6]">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="p-1 text-[#94a3b8] hover:text-[#f3f4f6] rounded-md hover:bg-[#1e222f] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 divide-y divide-[#262a36]">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
            >
              <span className="text-[#f3f4f6]">{sc.label}</span>
              <kbd className="px-2 py-0.5 bg-[#0d0f14] border border-[#262a36] rounded-md font-mono font-semibold text-[#f3f4f6]">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#262a36] bg-[#12141c] flex items-center justify-between text-xs text-[#94a3b8]">
          <span>Press <kbd className="font-mono text-[#f3f4f6]">Esc</kbd> to close</span>
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-md bg-[#161922] border border-[#262a36] text-[#f3f4f6] hover:bg-[#1e222f] text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
