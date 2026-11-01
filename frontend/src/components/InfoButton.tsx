import React from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoButtonProps {
  targetId: string;
  label?: string;
  onOpenGuide?: (id: string) => void;
  className?: string;
}

export const InfoButton: React.FC<InfoButtonProps> = ({
  targetId,
  label = 'Guide',
  onOpenGuide,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpenGuide) {
      onOpenGuide(targetId);
    } else {
      // Fallback: Dispatch custom event or window hash
      window.dispatchEvent(new CustomEvent('open-guide-section', { detail: { targetId } }));
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Open Guide: ${label}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium text-sky-400 hover:text-white bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 transition-colors duration-200 cursor-pointer group shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none select-none ${className}`}
    >
      <HelpCircle className="w-3 h-3 motion-safe:group-hover:scale-110 text-sky-400 group-hover:text-white motion-safe:transition-transform shrink-0" aria-hidden="true" />
      <span className="font-mono text-[10px]">{label}</span>
    </button>
  );
};
