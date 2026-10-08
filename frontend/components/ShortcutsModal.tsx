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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white border border-[#e2e2dd] rounded-md max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#e2e2dd] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1c1c1a]">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="p-1 text-[#6b6b66] hover:text-[#1c1c1a] rounded-md hover:bg-[#f7f7f5] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 divide-y divide-[#e2e2dd]">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
            >
              <span className="text-[#1c1c1a]">{sc.label}</span>
              <kbd className="px-2 py-0.5 bg-[#f7f7f5] border border-[#e2e2dd] rounded-md font-mono font-semibold text-[#1c1c1a]">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#e2e2dd] bg-[#f7f7f5] flex items-center justify-between text-xs text-[#6b6b66]">
          <span>Press <kbd className="font-mono text-[#1c1c1a]">Esc</kbd> to close</span>
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-md bg-white border border-[#e2e2dd] text-[#1c1c1a] hover:bg-[#f7f7f5] text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
