import React from "react";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Panel({ className = "", children, ...props }: PanelProps) {
  return (
    <div
      className={`bg-white border border-[#e2e2dd] rounded-md p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
