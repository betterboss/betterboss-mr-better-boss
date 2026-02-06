'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bot, Send, Briefcase, Calculator, DollarSign, Users, FileText, BarChart3, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const quickPrompts = [
  { icon: BarChart3, label: 'Business Health Check', prompt: 'Give me a complete health check of my business - revenue trends, margin analysis, and areas that need attention.' },
  { icon: DollarSign, label: 'Cash Flow Forecast', prompt: 'Analyze my cash flow for the next 30 days and flag any potential issues.' },
  { icon: Users, label: 'Lead Priority List', prompt: 'Which leads should I follow up with today and why? Rank them by potential ROI.' },
  { icon: Briefcase, label: 'Job Status Report', prompt: 'Give me a status report on all active jobs including budget health and timeline risks.' },
  { icon: Calculator, label: 'Estimate Review', prompt: 'Review my recent estimates and suggest pricing optimizations based on market data.' },
  { icon: FileText, label: 'Generate Follow-up Email', prompt: 'Draft a professional follow-up email for my most recent proposal.' },
];

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Welcome to your BetterBoss AI Assistant! I'm connected to your JobTread data.

I can help you with:
- **Business analytics** - Revenue, margins, trends
- **Job management** - Status updates, budget alerts
- **Estimating** - Generate and review estimates
- **Lead intelligence** - Scoring, follow-up recommendations
- **Cash flow** - Forecasting and alerts
- **Document generation** - Emails, proposals, reports

What would you like to know about your business?`,
  timestamp: new Date(),
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendToAI = async (userMessage: string) => {
    setIsTyping(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const data = await res.json();

      const response: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content || 'I wasn\'t able to process that. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, response]);
    } catch (err) {
      const response: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please check your connection and try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, response]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const msg = input;
    setInput('');
    sendToAI(msg);
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    sendToAI(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([welcomeMessage]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-52px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-boss-500 to-accent-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">AI Assistant</h1>
            <div className="flex items-center gap-1">
              <div className="live-indicator" style={{ transform: 'scale(0.6)' }} />
              <span className="text-[10px] text-emerald-400">Connected to JobTread</span>
            </div>
          </div>
        </div>
        <button onClick={handleNewChat} className="btn-ghost text-xs px-2 py-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant')}>
              <div className="text-xs leading-relaxed whitespace-pre-wrap prose prose-invert prose-xs max-w-none">
                {msg.content.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={i} className="font-bold text-white my-1">{line.replace(/\*\*/g, '')}</p>;
                  }
                  if (line.startsWith('- ')) {
                    return <p key={i} className="ml-2 my-0.5">{line}</p>;
                  }
                  if (line.startsWith('|')) {
                    return <p key={i} className="font-mono text-[10px] my-0">{line}</p>;
                  }
                  return <p key={i} className="my-0.5">{line}</p>;
                })}
              </div>
              <p className="text-[9px] text-dark-500 mt-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="chat-bubble-assistant">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-boss-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-boss-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-boss-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-[10px] text-dark-500 mb-2">Quick Actions</p>
          <div className="grid grid-cols-2 gap-1.5">
            {quickPrompts.map((prompt, i) => {
              const Icon = prompt.icon;
              return (
                <button key={i} onClick={() => handleQuickPrompt(prompt.prompt)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-dark-800/60 border border-dark-700/50
                           hover:border-boss-500/30 hover:bg-dark-700/60 transition-all text-left">
                  <Icon className="w-3.5 h-3.5 text-boss-400 flex-shrink-0" />
                  <span className="text-[10px] text-dark-300 truncate">{prompt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t border-dark-700/50 bg-dark-900/40">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="Ask anything about your business..."
              rows={1} className="input-field text-xs py-2 resize-none min-h-[36px] max-h-[120px]"
              style={{ height: 'auto' }} />
          </div>
          <button onClick={handleSend} disabled={!input.trim() || isTyping}
            className={cn(
              'p-2 rounded-lg transition-all',
              input.trim() && !isTyping
                ? 'bg-boss-500 text-white hover:bg-boss-600 shadow-lg shadow-boss-500/20'
                : 'bg-dark-700 text-dark-500'
            )}>
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[9px] text-dark-600 mt-1.5 text-center">
          Powered by BetterBoss AI &middot; Connected to your JobTread data
        </p>
      </div>
    </div>
  );
}
