import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, MessageSquare, X, Send, Bot, User, Trash2,
  ChevronDown, RefreshCw, Copy, Check, Zap, HelpCircle, ExternalLink
} from 'lucide-react';

export interface CompanionContext {
  companyName: string;
  issueSize: number;
  offerPrice: number;
  freshIssue: number;
  ofs: number;
  freshPct: number;
  ofsPct: number;
  expectedGain: number;
  rangeLower: number;
  rangeUpper: number;
  hotProb: number;
  safetyScore: number;
  qib: number;
  total: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
  source?: string;
}

interface AiCompanionWidgetProps {
  context: CompanionContext;
  onNavigateToUpcoming?: () => void;
  onNavigateToDeepDive?: () => void;
  onNavigateToPhase1?: () => void;
}

const INITIAL_PROMPTS = [
  "What is the difference between Fresh Capital and OFS?",
  "How does Phase 1 calculate if an IPO is Hot?",
  "Why is institutional QIB demand so critical?",
  "Is the current company safe to invest in?",
  "How do I predict upcoming IPOs?",
];

export const AiCompanionWidget: React.FC<AiCompanionWidgetProps> = ({
  context,
  onNavigateToUpcoming,
  onNavigateToDeepDive,
  onNavigateToPhase1,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>(() => {
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `👋 **Hello! I am your IPO AI Companion.**\n\nI have complete knowledge of this platform's quantitative models and real-time debut data. I'm currently synced with **${context.companyName}**.\n\nAsk me anything about listing gains, capital flow risks, or how to use the tools!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'system',
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Prepare history
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          context: {
            companyName: context.companyName,
            issueSize: context.issueSize,
            offerPrice: context.offerPrice,
            freshPct: context.freshPct,
            ofsPct: context.ofsPct,
            expectedGain: context.expectedGain,
            rangeLower: context.rangeLower,
            rangeUpper: context.rangeUpper,
            hotProb: context.hotProb,
            safetyScore: context.safetyScore,
            qib: context.qib,
            total: context.total,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply || 'No response generated.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: data.model,
          source: data.source,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error('API request failed');
      }
    } catch (err) {
      const fallbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I encountered an issue connecting to the inference server. You can ask me standard questions about Fresh vs OFS, Phase 1 classifier, or Phase 2 corridors, and I will assist you!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'local_fallback',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Conversation cleared. I am ready for any new questions regarding **${context.companyName}** or the platform!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'system',
      },
    ]);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to format basic markdown-style text safely, including tables and headers
  const renderFormattedContent = (content: string) => {
    const rawLines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    const renderInline = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="text-white font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });
    };

    while (i < rawLines.length) {
      const line = rawLines[i];
      const trimmed = line.trim();

      // 1. Table Detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines: string[] = [];
        while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
          tableLines.push(rawLines[i].trim());
          i++;
        }

        // Filter out separator lines like |---|---|
        const contentRows = tableLines.filter((l) => !/^\|[\s\-:|]+\|$/.test(l));
        if (contentRows.length > 0) {
          const headerCells = contentRows[0]
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
          const bodyRows = contentRows.slice(1).map((row) =>
            row
              .slice(1, -1)
              .split('|')
              .map((c) => c.trim())
          );

          elements.push(
            <div key={`table-${i}`} className="my-2.5 overflow-x-auto rounded-xl border border-[var(--border-card)] bg-[var(--canvas-bg)] p-1 text-[11px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-card)] bg-white/5">
                    {headerCells.map((h, hIdx) => (
                      <th key={hIdx} className="p-2 text-left font-bold text-sky-400 font-mono">
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.map((bRow, rIdx) => (
                    <tr key={rIdx} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      {bRow.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2 text-zinc-300 align-top leading-normal">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        continue;
      }

      // 2. Headings
      if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
        const title = trimmed.replace(/^#+\s*/, '');
        elements.push(
          <h4 key={`head-${i}`} className="text-xs font-bold text-white mt-2.5 mb-1 tracking-tight">
            {renderInline(title)}
          </h4>
        );
        i++;
        continue;
      }

      // 3. Bullets
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const cleanBullet = trimmed.replace(/^[•\-*]\s*/, '');
        elements.push(
          <li key={`bullet-${i}`} className="ml-4 list-disc text-zinc-300 my-0.5 leading-relaxed">
            {renderInline(cleanBullet)}
          </li>
        );
        i++;
        continue;
      }

      // 4. Empty line
      if (!trimmed) {
        elements.push(<div key={`space-${i}`} className="h-1.5" />);
        i++;
        continue;
      }

      // 5. Normal paragraph
      elements.push(
        <p key={`p-${i}`} className="leading-relaxed text-zinc-300 my-0.5">
          {renderInline(trimmed)}
        </p>
      );
      i++;
    }

    return elements;
  };

  return (
    <>
      {/* Floating Launcher Button (Bottom-Right) */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl btn-accent text-white font-bold text-xs motion-safe:hover:scale-105 active:scale-95 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            id="ai-companion-trigger-btn"
            title="Ask AI Companion about this IPO"
          >
            <div className="relative">
              <Bot className="w-4 h-4 text-white" aria-hidden="true" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 border border-black" />
            </div>
            <span>AI Guide</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300 motion-safe:animate-pulse" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Expanded Chat Drawer / Window */}
      {isOpen && (
        <div
          id="ai-companion-drawer"
          className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:right-6 sm:bottom-6 z-50 w-auto sm:w-[430px] h-[540px] max-h-[85vh] bg-[var(--surface-card-subtle)] border border-[var(--border-card)] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white motion-safe:animate-fadeIn"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-[var(--surface-card-subtle)] border-b border-[var(--border-card)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white tracking-tight">
                    IPO AI Companion
                  </h4>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                    Groq 120B
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-mono">
                  Full Terminal Knowledge • NSE / BSE ML Engine
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Minimize window"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Banner */}
          <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate">
                Active: <strong className="text-white">{context.companyName}</strong> (₹{context.offerPrice})
              </span>
            </div>
            <div className="shrink-0 text-zinc-500">
              Safety: <span className="text-sky-300 font-bold">{context.safetyScore}/4</span>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1 text-[10px] text-zinc-500 font-mono px-1">
                  {m.role === 'user' ? (
                    <>
                      <span>You</span>
                      <span>{m.timestamp}</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-sky-400" aria-hidden="true" />
                      <span className="text-sky-400 font-bold">AI Guide</span>
                      <span>{m.timestamp}</span>
                      {m.model && (
                        <span className="text-[9px] text-zinc-500 font-mono truncate max-w-[120px]">
                          ({m.model.replace('openai/', '')})
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div
                  className={`relative group max-w-[92%] rounded-2xl p-3.5 transition-colors duration-200 text-xs ${
                    m.role === 'user'
                      ? 'bg-sky-600 text-white rounded-tr-sm shadow-sm'
                      : 'bg-[var(--surface-card)] border border-[var(--border-card)] text-zinc-200 rounded-tl-sm'
                  }`}
                >
                  <div className="space-y-1">{renderFormattedContent(m.content)}</div>

                  {m.role === 'assistant' && m.id !== 'welcome' && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(m.id, m.content)}
                      className="absolute bottom-2 right-2 p-1 rounded bg-black/40 hover:bg-black/70 text-zinc-400 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
                      title="Copy response"
                    >
                      {copiedId === m.id ? (
                        <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3 h-3" aria-hidden="true" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex flex-col items-start space-y-1">
                <div className="flex items-center gap-1 text-[10px] text-sky-400 font-mono">
                  <Bot className="w-3 h-3" aria-hidden="true" />
                  <span>AI Companion is thinking...</span>
                </div>
                <div className="p-3 rounded-2xl rounded-tl-sm bg-[var(--surface-card)] border border-[var(--border-card)] flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 motion-safe:animate-spin text-sky-400" aria-hidden="true" />
                  <span className="text-xs text-zinc-400 font-mono">Consulting models & market book...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestion Chips */}
          <div className="px-3 pt-2 pb-2.5 border-t border-[var(--border-card)] bg-[var(--surface-card-subtle)] flex items-center gap-1.5 overflow-x-auto visible-scrollbar-x">
            <span className="text-[10px] font-mono text-zinc-500 shrink-0 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" aria-hidden="true" />
              Ask:
            </span>
            {INITIAL_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="shrink-0 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-sky-500/40 text-[10px] text-zinc-300 font-mono whitespace-nowrap transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-[var(--surface-card)] border-t border-[var(--border-card)] flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder={`Ask about ${context.companyName} or platform...`}
              className="flex-1 bg-[var(--canvas-bg)] border border-[var(--border-card)] focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl btn-accent disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center transition-colors duration-200 shadow-md focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
              title="Send message"
            >
              <Send className="w-4 h-4 text-white" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
