import React, { useState } from 'react';
import { Mail, Copy, Check, ArrowLeft, Send } from 'lucide-react';
import { AppTheme } from './Header';

interface ContactFeedbackTabProps {
  onBackToPredictor?: () => void;
  theme?: AppTheme;
}

export const ContactFeedbackTab: React.FC<ContactFeedbackTabProps> = ({
  onBackToPredictor,
}) => {
  const [copied, setCopied] = useState(false);

  const PROJECT_EMAIL = 'ipo.intelligence.app@gmail.com';

  const handleCopy = () => {
    navigator.clipboard.writeText(PROJECT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mailtoUrl = `mailto:${PROJECT_EMAIL}?subject=${encodeURIComponent(
    'IPO Intelligence – User Feedback & Query'
  )}&body=${encodeURIComponent(
    'Hi IPO Intelligence Team,\n\nI would like to share the following query / feedback:\n\n'
  )}`;

  return (
    <div className="max-w-2xl mx-auto pt-6 pb-16 space-y-6 motion-safe:animate-fadeIn">
      {/* Main Single Card */}
      <div className="terminal-card p-6 sm:p-10 border border-[var(--border-card)] space-y-8">
        {/* Header & Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-card)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-sky-400" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Contact & Feedback
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Have a question, feedback, or suggestion? Reach us directly via email.
              </p>
            </div>
          </div>

          {onBackToPredictor && (
            <button
              type="button"
              onClick={onBackToPredictor}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors duration-200 flex items-center gap-2 cursor-pointer self-start sm:self-center focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back to Predictor</span>
            </button>
          )}
        </div>

        {/* Email Address Highlight Box */}
        <div className="p-5 rounded-2xl bg-[var(--surface-card-subtle)] border border-[var(--border-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono text-zinc-400 block mb-0.5">
              Official Project Email
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-white select-all">
              {PROJECT_EMAIL}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-xl text-xs font-mono font-semibold bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-colors duration-200 flex items-center gap-2 justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-400">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-zinc-300" aria-hidden="true" />
                <span>Copy Email</span>
              </>
            )}
          </button>
        </div>

        {/* Primary Action Button: Open Email App */}
        <div className="pt-2">
          <a
            href={mailtoUrl}
            className="w-full px-5 py-3.5 rounded-xl font-bold font-mono text-xs btn-accent text-white flex items-center justify-center gap-2.5 cursor-pointer shadow-lg transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none text-center"
          >
            <Send className="w-4 h-4 text-white" aria-hidden="true" />
            <span>Send Message via Email App</span>
          </a>
        </div>

        {/* Informational Footer Note */}
        <p className="text-[11px] text-zinc-400 text-center font-mono leading-relaxed pt-2">
          Tapping the button opens your default email client with recipient <strong className="text-zinc-200">{PROJECT_EMAIL}</strong> pre-filled. We review inquiries daily and typically reply within 24 to 48 business hours.
        </p>
      </div>
    </div>
  );
};
