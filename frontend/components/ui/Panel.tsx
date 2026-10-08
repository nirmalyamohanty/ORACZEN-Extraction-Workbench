import React from "react";

// standard card container wrapper with warm border and subtle shadow
// keeps container padding and background consistent across all dashboard cards
export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Panel({ className = "", children, ...props }: PanelProps) {
  return (
    <div
      className={`bg-white border border-[#eae6de] rounded-lg p-4 text-[#1c1917] shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
