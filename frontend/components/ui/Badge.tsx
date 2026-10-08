import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "amber" | "red" | "green";
}

export function Badge({ tone = "neutral", className = "", children, ...props }: BadgeProps) {
  let toneStyles = "bg-[#f3f4f6] text-[#4b5563] border-[#e5e7eb]";
  if (tone === "amber") {
    toneStyles = "bg-[#fef3c7] text-[#b45309] border-[#fde68a]";
  } else if (tone === "red") {
    toneStyles = "bg-[#fee2e2] text-[#b91c1c] border-[#fecaca]";
  } else if (tone === "green") {
    toneStyles = "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]";
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
