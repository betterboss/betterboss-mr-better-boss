import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { chatRequestSchema, validateBody } from '@/lib/validate';
import { RATE_LIMITS, AI_CHAT_MAX_HISTORY } from '@/lib/constants';

// AI Chat API endpoint
// Uses OpenAI/Anthropic for real LLM responses grounded in JobTread data
// Falls back to keyword-based analysis when no API key is configured

const JOBTREAD_API_URL = process.env.JOBTREAD_API_URL || 'https://api.jobtread.com/graphql';

async function fetchJobTreadData(token: string, query: string) {
  try {
    const res = await fetch(JOBTREAD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data || null;
  } catch {
    return null;
  }
}

interface JobData {
  id: string;
  name: string;
  number?: string;
  status: string;
  budget?: {
    estimatedRevenue?: number;
    estimatedCost?: number;
    invoiced?: number;
    paid?: number;
    outstanding?: number;
  };
  customer?: { firstName: string; lastName: string };
}

interface InvoiceData {
  id: string;
  number?: string;
  status: string;
  total?: number;
  dueDate?: string;
}

interface TaskData {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
}

interface ContactData {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  type?: string;
}

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

function buildDataContext(
  jobs: JobData[],
  invoices: InvoiceData[],
  tasks: TaskData[],
  contacts: ContactData[]
): string {
  const activeJobs = jobs.filter((j) => j.status === 'IN_PROGRESS' || j.status === 'CONTRACT');
  const totalRevenue = jobs.reduce((s, j) => s + (j.budget?.estimatedRevenue || 0), 0);
  const totalCost = jobs.reduce((s, j) => s + (j.budget?.estimatedCost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  const overdueInvoices = invoices.filter((inv) => {
    if (inv.status === 'PAID' || inv.status === 'VOID' || !inv.dueDate) return false;
    return new Date(inv.dueDate) < new Date();
  });
  const overdueTotal = overdueInvoices.reduce((s, inv) => s + (inv.total || 0), 0);
  const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED');
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'COMPLETED' || !t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });

  const statusCounts: Record<string, number> = {};
  jobs.forEach((j) => { statusCounts[j.status] = (statusCounts[j.status] || 0) + 1; });

  let context = `LIVE JOBTREAD DATA (as of ${new Date().toLocaleDateString()}):

JOBS: ${jobs.length} total, ${activeJobs.length} active
Revenue: ${fmtCurrency(totalRevenue)} | Cost: ${fmtCurrency(totalCost)} | Profit: ${fmtCurrency(totalProfit)} | Margin: ${avgMargin}%
Status breakdown: ${Object.entries(statusCounts).map(([s, c]) => `${s.replace(/_/g, ' ')}: ${c}`).join(', ')}`;

  if (activeJobs.length > 0) {
    context += '\n\nACTIVE JOBS:';
    activeJobs.slice(0, 10).forEach((j) => {
      const rev = j.budget?.estimatedRevenue || 0;
      const cost = j.budget?.estimatedCost || 0;
      const margin = rev > 0 ? ((rev - cost) / rev * 100).toFixed(1) : '0';
      const outstanding = j.budget?.outstanding || 0;
      context += `\n- ${j.name}${j.number ? ` (#${j.number})` : ''}: Rev ${fmtCurrency(rev)}, Margin ${margin}%${outstanding > 0 ? `, Outstanding ${fmtCurrency(outstanding)}` : ''}${j.customer ? ` | Customer: ${j.customer.firstName} ${j.customer.lastName}` : ''}`;
    });
  }

  context += `\n\nINVOICES: ${invoices.length} total, ${overdueInvoices.length} overdue (${fmtCurrency(overdueTotal)})`;
  if (overdueInvoices.length > 0) {
    overdueInvoices.slice(0, 5).forEach((inv) => {
      const days = inv.dueDate ? Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      context += `\n- Invoice ${inv.number || inv.id}: ${fmtCurrency(inv.total || 0)} (${days} days overdue)`;
    });
  }

  context += `\n\nTASKS: ${pendingTasks.length} pending, ${overdueTasks.length} overdue`;
  context += `\n\nCONTACTS: ${contacts.length} total`;
  if (contacts.length > 0) {
    context += '\nRecent:';
    contacts.slice(0, 5).forEach((c) => {
      context += `\n- ${c.firstName} ${c.lastName}${c.company ? ` (${c.company})` : ''}${c.email ? ` - ${c.email}` : ''}${c.type ? ` [${c.type}]` : ''}`;
    });
  }

  return context;
}

const SYSTEM_PROMPT = `You are BetterBoss AI, a business intelligence assistant for construction contractors using JobTread.

Your role:
- Analyze the user's live business data from JobTread and provide actionable insights
- Be specific with numbers, job names, and recommendations
- Focus on revenue, margins, cash flow, overdue items, and growth opportunities
- Use contractor/construction industry context (margins should be 20-35%, follow up on overdue invoices, etc.)
- Keep responses concise but thorough, using markdown formatting
- When data is limited, provide what analysis you can and suggest what to look for

Formatting:
- Use **bold** for key metrics and section headers
- Use bullet points for lists
- Include specific numbers and percentages
- End with 1-2 actionable recommendations when appropriate`;

async function callOpenAI(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  dataContext: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `${systemPrompt}\n\n${dataContext}` },
        ...messages.slice(-AI_CHAT_MAX_HISTORY).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('OpenAI API error:', error);
    return null;
  }
}

async function callAnthropic(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  dataContext: string
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    // Use fetch directly to avoid requiring @anthropic-ai/sdk
    const trimmed = messages.slice(-AI_CHAT_MAX_HISTORY).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
        max_tokens: 1500,
        system: `${systemPrompt}\n\n${dataContext}`,
        messages: trimmed,
      }),
    });

    if (!res.ok) {
      console.error('Anthropic API error:', res.status, await res.text().catch(() => ''));
      return null;
    }

    const data = await res.json();
    const textBlock = data?.content?.find((b: { type: string }) => b.type === 'text');
    return textBlock?.text || null;
  } catch (error) {
    console.error('Anthropic API error:', error);
    return null;
  }
}

/** Try OpenAI first, then Anthropic, return null if neither is configured */
async function callLLM(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  dataContext: string
): Promise<{ content: string; provider: string } | null> {
  // Try OpenAI first
  const openAIResult = await callOpenAI(messages, systemPrompt, dataContext);
  if (openAIResult) return { content: openAIResult, provider: 'openai' };

  // Try Anthropic as fallback
  const anthropicResult = await callAnthropic(messages, systemPrompt, dataContext);
  if (anthropicResult) return { content: anthropicResult, provider: 'anthropic' };

  return null;
}

// Fallback keyword-based response when no LLM available
function buildFallbackResponse(
  message: string,
  jobs: JobData[],
  invoices: InvoiceData[],
  tasks: TaskData[],
  contacts: ContactData[],
  history: { role: string; content: string }[] = []
): string {
  const recentContext = history.slice(-4).map((m) => m.content).join(' ');
  const lowerMsg = (message + ' ' + recentContext).toLowerCase();

  const activeJobs = jobs.filter((j) => j.status === 'IN_PROGRESS' || j.status === 'CONTRACT');
  const totalRevenue = jobs.reduce((s, j) => s + (j.budget?.estimatedRevenue || 0), 0);
  const totalCost = jobs.reduce((s, j) => s + (j.budget?.estimatedCost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  const overdueInvoices = invoices.filter((inv) => {
    if (inv.status === 'PAID' || inv.status === 'VOID' || !inv.dueDate) return false;
    return new Date(inv.dueDate) < new Date();
  });
  const overdueTotal = overdueInvoices.reduce((s, inv) => s + (inv.total || 0), 0);
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'COMPLETED' || !t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });
  const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED');

  if (lowerMsg.includes('health') || lowerMsg.includes('overview') || lowerMsg.includes('how is') || lowerMsg.includes('summary')) {
    const topJobs = [...activeJobs]
      .sort((a, b) => (b.budget?.estimatedRevenue || 0) - (a.budget?.estimatedRevenue || 0))
      .slice(0, 3);
    let r = `**Business Health Check**\n\n**Key Metrics:**\n- Total Jobs: ${jobs.length} (${activeJobs.length} active)\n- Total Revenue: ${fmtCurrency(totalRevenue)}\n- Total Profit: ${fmtCurrency(totalProfit)}\n- Average Margin: ${avgMargin}%\n- Total Contacts: ${contacts.length}\n\n**Invoices:**\n- ${invoices.length} total invoices\n- ${overdueInvoices.length} overdue (${fmtCurrency(overdueTotal)})\n\n**Tasks:**\n- ${pendingTasks.length} pending tasks\n- ${overdueTasks.length} overdue tasks`;
    if (topJobs.length > 0) {
      r += `\n\n**Top Active Jobs:**`;
      topJobs.forEach((j) => {
        const rev = j.budget?.estimatedRevenue || 0;
        const cost = j.budget?.estimatedCost || 0;
        const margin = rev > 0 ? ((rev - cost) / rev * 100).toFixed(1) : '0';
        r += `\n- ${j.name}: ${fmtCurrency(rev)} revenue, ${margin}% margin`;
      });
    }
    return r;
  }

  if (lowerMsg.includes('cash') || lowerMsg.includes('forecast') || lowerMsg.includes('financial') || lowerMsg.includes('invoice')) {
    const totalOutstanding = jobs.reduce((s, j) => s + (j.budget?.outstanding || 0), 0);
    const totalInvoiced = jobs.reduce((s, j) => s + (j.budget?.invoiced || 0), 0);
    const totalPaid = jobs.reduce((s, j) => s + (j.budget?.paid || 0), 0);
    return `**Cash Flow Analysis**\n\n**Current Position:**\n- Total Invoiced: ${fmtCurrency(totalInvoiced)}\n- Total Collected: ${fmtCurrency(totalPaid)}\n- Outstanding: ${fmtCurrency(totalOutstanding)}\n- Overdue: ${fmtCurrency(overdueTotal)} (${overdueInvoices.length} invoices)\n\n**Revenue Pipeline:**\n- Active Job Revenue: ${fmtCurrency(activeJobs.reduce((s, j) => s + (j.budget?.estimatedRevenue || 0), 0))}\n- Profit Margin: ${avgMargin}%`;
  }

  if (lowerMsg.includes('lead') || lowerMsg.includes('contact') || lowerMsg.includes('follow up') || lowerMsg.includes('prospect')) {
    const recent = [...contacts].slice(0, 5);
    let r = `**Contact & Lead Summary**\n\n**Overview:**\n- Total Contacts: ${contacts.length}\n\n**Recent Contacts:**`;
    recent.forEach((c) => {
      r += `\n- ${c.firstName} ${c.lastName}`;
      if (c.company) r += ` (${c.company})`;
      if (c.email) r += ` - ${c.email}`;
    });
    return r;
  }

  if (lowerMsg.includes('job') || lowerMsg.includes('project') || lowerMsg.includes('status report')) {
    const statusCounts: Record<string, number> = {};
    jobs.forEach((j) => { statusCounts[j.status] = (statusCounts[j.status] || 0) + 1; });
    let r = `**Job Status Report**\n\n**Summary:**\n- Total Jobs: ${jobs.length}\n- Active: ${activeJobs.length}\n- Total Pipeline: ${fmtCurrency(totalRevenue)}\n\n**By Status:**`;
    Object.entries(statusCounts).forEach(([status, count]) => {
      r += `\n- ${status.replace(/_/g, ' ')}: ${count}`;
    });
    return r;
  }

  return `Based on your JobTread data:\n\n- **${activeJobs.length} active jobs** with ${fmtCurrency(totalRevenue)} total revenue\n- **${avgMargin}% average margin** across all jobs\n- **${overdueInvoices.length} overdue invoices** totaling ${fmtCurrency(overdueTotal)}\n- **${pendingTasks.length} pending tasks** (${overdueTasks.length} overdue)\n- **${contacts.length} contacts** in your CRM\n\nTry asking about: "Business health check", "Cash flow forecast", "Job status report", or "Lead priority list"`;
}

export async function POST(request: NextRequest) {
  try {
    const { session, error: guardError } = await apiGuard(request, { rateLimit: RATE_LIMITS.ai });
    if (guardError) return guardError;

    const body = await request.json();
    const { data: input, error: validationError } = validateBody(chatRequestSchema, body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { message, history } = input!;
    const conversationHistory: { role: string; content: string }[] = history;

    // Fetch real data from JobTread in parallel
    const [jobsData, invoicesData, tasksData, contactsData] = await Promise.all([
      fetchJobTreadData(session!.accessToken, `query { jobs(first: 100) { data { id name number status budget { estimatedRevenue estimatedCost invoiced paid outstanding } customer { firstName lastName } } } }`),
      fetchJobTreadData(session!.accessToken, `query { invoices { data { id number status total dueDate } } }`),
      fetchJobTreadData(session!.accessToken, `query { tasks { data { id title status dueDate } } }`),
      fetchJobTreadData(session!.accessToken, `query { contacts(first: 100) { data { id firstName lastName email phone company type } } }`),
    ]);

    const jobs: JobData[] = jobsData?.jobs?.data || [];
    const invoices: InvoiceData[] = invoicesData?.invoices?.data || [];
    const tasks: TaskData[] = tasksData?.tasks?.data || [];
    const contacts: ContactData[] = contactsData?.contacts?.data || [];

    // Try real LLM first (OpenAI → Anthropic → keyword fallback)
    let content: string;
    let aiPowered = false;
    let provider = 'fallback';

    const dataContext = buildDataContext(jobs, invoices, tasks, contacts);
    const allMessages = [
      ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const llmResult = await callLLM(allMessages, SYSTEM_PROMPT, dataContext);
    if (llmResult) {
      content = llmResult.content;
      aiPowered = true;
      provider = llmResult.provider;
    } else {
      // Fallback to keyword-based response
      content = buildFallbackResponse(message, jobs, invoices, tasks, contacts, conversationHistory);
    }

    return NextResponse.json({
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      aiPowered,
      provider,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process your request. Please try again.' },
      { status: 500 }
    );
  }
}
