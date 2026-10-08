import React from "react";

// small status pill used for category labels, counts, and alert tones
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "amber" | "red" | "green";
}

export function Badge({ tone = "neutral", className = "", children, ...props }: BadgeProps) {
  let toneStyles = "bg-[#f5f2eb] text-[#57534e] border-[#eae6de]";
  if (tone === "amber") {
    toneStyles = "bg-[#fef3c7] text-[#92400e] border-[#fde68a]";
  } else if (tone === "red") {
    toneStyles = "bg-[#fee2e2] text-[#991b1b] border-[#fecaca]";
  } else if (tone === "green") {
    toneStyles = "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]";
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[11px] font-semibold rounded-md border ${toneStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
