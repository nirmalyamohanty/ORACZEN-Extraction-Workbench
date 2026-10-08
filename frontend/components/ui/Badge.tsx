import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "amber" | "red" | "green";
}

export function Badge({ tone = "neutral", className = "", children, ...props }: BadgeProps) {
  let toneStyles = "bg-[#1e222f] text-[#94a3b8] border-[#2e3344]";
  if (tone === "amber") {
    toneStyles = "bg-[#78350f]/30 text-[#fbbf24] border-[#92400e]/50";
  } else if (tone === "red") {
    toneStyles = "bg-[#7f1d1d]/30 text-[#f87171] border-[#b91c1c]/50";
  } else if (tone === "green") {
    toneStyles = "bg-[#064e3b]/30 text-[#34d399] border-[#059669]/50";
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-xs font-semibold rounded-md border ${toneStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
