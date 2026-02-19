import React from 'react';
interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}
export function Card({
  children,
  className = '',
  noPadding = false
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>

      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>);

}