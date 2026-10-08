import React from "react";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Panel({ className = "", children, ...props }: PanelProps) {
  return (
    <div
      className={`bg-[#161922] border border-[#262a36] rounded-md p-4 text-[#f3f4f6] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
