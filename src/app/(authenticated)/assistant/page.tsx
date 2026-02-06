'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Zap,
  Briefcase,
  Calculator,
  DollarSign,
  Users,
  FileText,
  BarChart3,
  Sparkles,
  Mic,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// Why this feature exists:
// Contractors don't have time to dig through data. They need answers instantly.
// Problem solved: Information buried across JobTread tabs and reports.
// AI Assistant provides instant answers, generates documents, and executes actions
// through natural language - like having a construction-savvy analyst on demand.

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: { label: string; action: string }[];
}

const quickPrompts = [
  { icon: BarChart3, label: 'Business Health Check', prompt: 'Give me a complete health check of my business - revenue trends, margin analysis, and areas that need attention.' },
  { icon: DollarSign, label: 'Cash Flow Forecast', prompt: 'Analyze my cash flow for the next 30 days and flag any potential issues.' },
  { icon: Users, label: 'Lead Priority List', prompt: 'Which leads should I follow up with today and why? Rank them by potential ROI.' },
  { icon: Briefcase, label: 'Job Status Report', prompt: 'Give me a status report on all active jobs including budget health and timeline risks.' },
  { icon: Calculator, label: 'Estimate Review', prompt: 'Review my recent estimates and suggest pricing optimizations based on market data.' },
  { icon: FileText, label: 'Generate Follow-up Email', prompt: 'Draft a professional follow-up email for my proposal to Thompson Corp for the commercial roofing project.' },
];

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content: `Welcome to your BetterBoss AI Assistant! I'm your construction business intelligence companion, powered by your JobTread data.

I can help you with:
- **Business analytics** - Revenue, margins, trends
- **Job management** - Status updates, budget alerts
- **Estimating** - Generate and review estimates
- **Lead intelligence** - Scoring, follow-up recommendations
- **Cash flow** - Forecasting and alert management
- **Document generation** - Emails, proposals, reports

What would you like to know about your business?`,
    timestamp: new Date(),
  },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
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

  const simulateResponse = (userMessage: string) => {
    setIsTyping(true);

    // Simulate AI response based on input
    setTimeout(() => {
      let responseContent = '';
      let actions: { label: string; action: string }[] = [];

      const lowerMsg = userMessage.toLowerCase();

      if (lowerMsg.includes('health') || lowerMsg.includes('overview') || lowerMsg.includes('how is')) {
        responseContent = `Here's your **Business Health Check**:

**Revenue:** $247,500 this month (+14.2% vs last month)
**Profit Margin:** 26.3% (above your 25% target)
**Active Jobs:** 23 across all stages
**Close Rate:** 41.2% (+23% since implementing BetterBossOS)

**Strengths:**
- Revenue trending up consistently for 3 months
- Henderson Reroof at 32.5% margin (your best performer)
- 52 admin days reclaimed annually through automation

**Areas Needing Attention:**
- 2 overdue invoices totaling $18,700 (aging 8-15 days)
- Thompson Commercial margin at 25% (below target)
- Cash flow dip projected next week (-$13,300)
- 3 proposals expiring this week ($94K at risk)

**Recommended Actions:**
1. Send payment reminders on overdue invoices today
2. Review Thompson Commercial cost overruns
3. Follow up on expiring proposals`;
        actions = [
          { label: 'Send Invoice Reminders', action: 'send-reminders' },
          { label: 'View Expiring Proposals', action: 'view-proposals' },
        ];
      } else if (lowerMsg.includes('cash flow') || lowerMsg.includes('forecast')) {
        responseContent = `**30-Day Cash Flow Forecast:**

| Period | Inflow | Outflow | Net |
|--------|--------|---------|-----|
| This Week | $32,500 | $24,800 | +$7,700 |
| Next Week | $18,200 | $31,500 | **-$13,300** |
| Week 3 | $45,000 | $22,100 | +$22,900 |
| Week 4 | $28,600 | $19,400 | +$9,200 |

**Alert:** Next week shows a negative cash flow of -$13,300 due to:
- ABC Supply payment of $18,500 due Feb 12
- Johnson Subs payment of $8,200 due Feb 14
- Lower expected inflows (no major invoices scheduled)

**AI Recommendations:**
1. Accelerate collection on INV-1047 (Anderson Builders, $12,500 - 15 days overdue)
2. Send INV-1052 to Garcia early (Kitchen Remodel progress billing, $14,160)
3. Consider requesting 50% deposit on Wilson Bathroom final phase`;
        actions = [
          { label: 'Send Collection Notices', action: 'collections' },
          { label: 'Generate Progress Invoice', action: 'progress-invoice' },
        ];
      } else if (lowerMsg.includes('lead') || lowerMsg.includes('follow up')) {
        responseContent = `**Today's Lead Priority List:**

1. **Mark Wilson** (Score: 95) - $210K Multi-unit Roofing
   - Proposal viewed 4 times. Call NOW to close.
   - 89% probability. This is your highest-value opportunity.

2. **Lisa Chen** (Score: 87) - $55K Kitchen Remodel
   - New referral lead (1 hour ago). Call within 5 min.
   - Referral leads convert 3x higher. She wants to start in 2 weeks.

3. **Robert Thompson** (Score: 92) - $125K Commercial Roof
   - Schedule on-site estimate today. Decision maker confirmed.
   - Urgent timeline. He's comparing 2 other bids.

4. **David Brown** (Score: 78) - $42K Full Reroof
   - Send detailed proposal. He visited pricing page 3x.
   - Ready to compare quotes. Price-competitive positioning recommended.

**Today's potential:** $432K in pipeline ready for action.`;
        actions = [
          { label: 'Call Mark Wilson', action: 'call-lead' },
          { label: 'Draft Proposal for Thompson', action: 'draft-proposal' },
        ];
      } else if (lowerMsg.includes('email') || lowerMsg.includes('draft') || lowerMsg.includes('follow-up')) {
        responseContent = `Here's a professional follow-up email:

---

**Subject:** Following Up - Commercial Roofing Proposal | [Your Company]

Dear Mr. Thompson,

Thank you for the opportunity to present our proposal for the commercial roofing project at 200 Commerce Blvd. I wanted to follow up and see if you had any questions about the scope of work or our approach.

A few highlights from our proposal:
- **30-year warranty** on all materials and workmanship
- **Minimal business disruption** with phased installation schedule
- **Competitive pricing** at $125,000 with clear cost breakdown

We've completed similar commercial projects in the Houston area, and I'd be happy to arrange a visit to one of our recent installations as a reference.

I have availability this week for a brief call or on-site meeting. What works best for your schedule?

Best regards,
[Your Name]
[Your Company]

---

*Shall I customize this further or send it directly?*`;
        actions = [
          { label: 'Send Email', action: 'send-email' },
          { label: 'Edit & Customize', action: 'edit-email' },
        ];
      } else {
        responseContent = `I can help with that! Based on your JobTread data, let me pull up the relevant information.

To give you the most accurate analysis, could you specify:
- Are you looking at a specific job, lead, or financial metric?
- What time period should I focus on?

In the meantime, here are some things I noticed:
- You have **5 overdue tasks** across active jobs
- **2 estimates** are awaiting client response
- Your **close rate is up 23%** this month

What would you like to dive deeper into?`;
      }

      const response: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        actions,
      };

      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    simulateResponse(input);
  };

  const handleQuickPrompt = (prompt: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    simulateResponse(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
        <button className="btn-ghost text-xs px-2 py-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div className={cn(
              msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'
            )}>
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
              {msg.actions && msg.actions.length > 0 && (
                <div className="flex gap-1.5 mt-2 pt-2 border-t border-dark-600/50">
                  {msg.actions.map((action, i) => (
                    <button key={i} className="btn-primary text-[10px] px-2 py-1">
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
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

      {/* Quick Prompts - show only when few messages */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-[10px] text-dark-500 mb-2">Quick Actions</p>
          <div className="grid grid-cols-2 gap-1.5">
            {quickPrompts.map((prompt, i) => {
              const Icon = prompt.icon;
              return (
                <button
                  key={i}
                  onClick={() => handleQuickPrompt(prompt.prompt)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-dark-800/60 border border-dark-700/50
                           hover:border-boss-500/30 hover:bg-dark-700/60 transition-all text-left"
                >
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
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your business..."
              rows={1}
              className="input-field text-xs py-2 pr-16 resize-none min-h-[36px] max-h-[120px]"
              style={{ height: 'auto' }}
            />
            <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
              <button className="p-1 text-dark-500 hover:text-dark-300 transition-colors">
                <Paperclip className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 text-dark-500 hover:text-dark-300 transition-colors">
                <Mic className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={cn(
              'p-2 rounded-lg transition-all',
              input.trim() && !isTyping
                ? 'bg-boss-500 text-white hover:bg-boss-600 shadow-lg shadow-boss-500/20'
                : 'bg-dark-700 text-dark-500'
            )}
          >
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
