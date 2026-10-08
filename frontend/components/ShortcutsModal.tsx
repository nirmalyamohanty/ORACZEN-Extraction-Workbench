"use client";

import { X } from "lucide-react";

// popup cheatsheet modal listing all the reviewer keyboard shortcuts
// triggered either by clicking the 'Shortcuts' button or hitting '?' anywhere on the review page
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-[#eae6de] rounded-lg max-w-md w-full overflow-hidden shadow-2xl">
        {/* modal title bar */}
        <div className="px-4 py-3 border-b border-[#eae6de] flex items-center justify-between bg-[#fbf9f5]">
          <h3 className="text-xs font-semibold text-[#1c1917] tracking-tight">Reviewer Keybindings</h3>
          <button
            onClick={onClose}
            className="p-1 text-[#57534e] hover:text-[#1c1917] rounded-md hover:bg-[#f5f2eb] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* shortcuts list */}
        <div className="p-4 divide-y divide-[#eae6de]">
          {shortcuts.map((sc) => (
            <div
              key={sc.key}
              className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
            >
              <span className="text-[#57534e]">{sc.label}</span>
              <kbd className="px-2 py-0.5 bg-[#f5f2eb] border border-[#d6d0c4] rounded-md font-mono text-xs font-semibold text-[#1c1917] shadow-xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* footer hint */}
        <div className="px-4 py-2.5 border-t border-[#eae6de] bg-[#fbf9f5] flex items-center justify-between text-xs text-[#57534e]">
          <span>Press <kbd className="font-mono text-[#1c1917] bg-[#f5f2eb] px-1 rounded border border-[#d6d0c4]">Esc</kbd> to dismiss</span>
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-md bg-white border border-[#eae6de] text-[#1c1917] hover:bg-[#f5f2eb] text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
