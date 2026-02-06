import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

// AI Chat API endpoint
// Fetches real JobTread data and builds contextual responses

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

function buildResponse(
  message: string,
  jobs: JobData[],
  invoices: InvoiceData[],
  tasks: TaskData[],
  contacts: ContactData[]
): string {
  const lowerMsg = message.toLowerCase();

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

  // Business health check
  if (lowerMsg.includes('health') || lowerMsg.includes('overview') || lowerMsg.includes('how is') || lowerMsg.includes('summary')) {
    const topJobs = [...activeJobs]
      .sort((a, b) => (b.budget?.estimatedRevenue || 0) - (a.budget?.estimatedRevenue || 0))
      .slice(0, 3);

    let r = `**Business Health Check**

**Key Metrics:**
- Total Jobs: ${jobs.length} (${activeJobs.length} active)
- Total Revenue: ${fmtCurrency(totalRevenue)}
- Total Profit: ${fmtCurrency(totalProfit)}
- Average Margin: ${avgMargin}%
- Total Contacts: ${contacts.length}

**Invoices:**
- ${invoices.length} total invoices
- ${overdueInvoices.length} overdue (${fmtCurrency(overdueTotal)})

**Tasks:**
- ${pendingTasks.length} pending tasks
- ${overdueTasks.length} overdue tasks`;

    if (topJobs.length > 0) {
      r += `\n\n**Top Active Jobs:**`;
      topJobs.forEach((j) => {
        const rev = j.budget?.estimatedRevenue || 0;
        const cost = j.budget?.estimatedCost || 0;
        const margin = rev > 0 ? ((rev - cost) / rev * 100).toFixed(1) : '0';
        r += `\n- ${j.name}: ${fmtCurrency(rev)} revenue, ${margin}% margin`;
      });
    }

    if (overdueInvoices.length > 0 || overdueTasks.length > 0) {
      r += `\n\n**Action Required:**`;
      if (overdueInvoices.length > 0) r += `\n- Follow up on ${overdueInvoices.length} overdue invoice(s) totaling ${fmtCurrency(overdueTotal)}`;
      if (overdueTasks.length > 0) r += `\n- Address ${overdueTasks.length} overdue task(s)`;
    }
    return r;
  }

  // Cash flow
  if (lowerMsg.includes('cash') || lowerMsg.includes('forecast') || lowerMsg.includes('financial') || lowerMsg.includes('invoice')) {
    const totalOutstanding = jobs.reduce((s, j) => s + (j.budget?.outstanding || 0), 0);
    const totalInvoiced = jobs.reduce((s, j) => s + (j.budget?.invoiced || 0), 0);
    const totalPaid = jobs.reduce((s, j) => s + (j.budget?.paid || 0), 0);

    let r = `**Cash Flow Analysis**

**Current Position:**
- Total Invoiced: ${fmtCurrency(totalInvoiced)}
- Total Collected: ${fmtCurrency(totalPaid)}
- Outstanding: ${fmtCurrency(totalOutstanding)}
- Overdue: ${fmtCurrency(overdueTotal)} (${overdueInvoices.length} invoices)

**Revenue Pipeline:**
- Active Job Revenue: ${fmtCurrency(activeJobs.reduce((s, j) => s + (j.budget?.estimatedRevenue || 0), 0))}
- Profit Margin: ${avgMargin}%`;

    if (overdueInvoices.length > 0) {
      r += `\n\n**Overdue Invoices:**`;
      overdueInvoices.forEach((inv) => {
        const days = Math.floor((Date.now() - new Date(inv.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
        r += `\n- Invoice ${inv.number || inv.id}: ${fmtCurrency(inv.total || 0)} (${days} days overdue)`;
      });
      r += `\n\n**Recommendation:** Prioritize collecting overdue invoices to improve cash position.`;
    }
    return r;
  }

  // Leads / contacts
  if (lowerMsg.includes('lead') || lowerMsg.includes('contact') || lowerMsg.includes('follow up') || lowerMsg.includes('prospect')) {
    const recent = [...contacts].slice(0, 5);
    let r = `**Contact & Lead Summary**

**Overview:**
- Total Contacts: ${contacts.length}

**Recent Contacts:**`;
    recent.forEach((c) => {
      r += `\n- ${c.firstName} ${c.lastName}`;
      if (c.company) r += ` (${c.company})`;
      if (c.email) r += ` - ${c.email}`;
    });
    r += `\n\n**Recommendation:** Review contacts and reach out to recent additions first.`;
    return r;
  }

  // Jobs
  if (lowerMsg.includes('job') || lowerMsg.includes('project') || lowerMsg.includes('status report')) {
    const statusCounts: Record<string, number> = {};
    jobs.forEach((j) => { statusCounts[j.status] = (statusCounts[j.status] || 0) + 1; });

    let r = `**Job Status Report**

**Summary:**
- Total Jobs: ${jobs.length}
- Active: ${activeJobs.length}
- Total Pipeline: ${fmtCurrency(totalRevenue)}

**By Status:**`;
    Object.entries(statusCounts).forEach(([status, count]) => {
      r += `\n- ${status.replace(/_/g, ' ')}: ${count}`;
    });

    if (activeJobs.length > 0) {
      r += `\n\n**Active Jobs:**`;
      activeJobs.slice(0, 5).forEach((j) => {
        const rev = j.budget?.estimatedRevenue || 0;
        const outstanding = j.budget?.outstanding || 0;
        r += `\n- ${j.name}: ${fmtCurrency(rev)} revenue`;
        if (outstanding > 0) r += ` (${fmtCurrency(outstanding)} outstanding)`;
      });
    }
    return r;
  }

  // Estimates
  if (lowerMsg.includes('estimate') || lowerMsg.includes('pricing') || lowerMsg.includes('quote')) {
    return `**Estimate Insights**

Based on your active jobs:
- Average Job Revenue: ${fmtCurrency(totalRevenue / Math.max(jobs.length, 1))}
- Average Margin: ${avgMargin}%
- Active Projects: ${activeJobs.length}

**Pricing Guidance:**
- Your current margins average ${avgMargin}%. Industry standard for contractors is 20-35%.
${Number(avgMargin) < 20 ? '- Warning: Your margins are below industry average. Consider reviewing your pricing.' : ''}
${Number(avgMargin) > 30 ? '- Your margins are strong. Maintain quality to justify premium pricing.' : ''}

Use the Smart Estimator tab to generate AI-powered estimates.`;
  }

  // Default response
  return `Based on your JobTread data:

- **${activeJobs.length} active jobs** with ${fmtCurrency(totalRevenue)} total revenue
- **${avgMargin}% average margin** across all jobs
- **${overdueInvoices.length} overdue invoices** totaling ${fmtCurrency(overdueTotal)}
- **${pendingTasks.length} pending tasks** (${overdueTasks.length} overdue)
- **${contacts.length} contacts** in your CRM

I can help you dig deeper into any area. Try asking about:
- "Business health check" for a full overview
- "Cash flow forecast" for financial analysis
- "Job status report" for project updates
- "Lead priority list" for follow-up recommendations
- "Estimate review" for pricing insights`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Fetch real data from JobTread in parallel
    const [jobsData, invoicesData, tasksData, contactsData] = await Promise.all([
      fetchJobTreadData(session.accessToken, `query { jobs(first: 100) { data { id name number status budget { estimatedRevenue estimatedCost invoiced paid outstanding } customer { firstName lastName } } } }`),
      fetchJobTreadData(session.accessToken, `query { invoices { data { id number status total dueDate } } }`),
      fetchJobTreadData(session.accessToken, `query { tasks { data { id title status dueDate } } }`),
      fetchJobTreadData(session.accessToken, `query { contacts(first: 100) { data { id firstName lastName email phone company type } } }`),
    ]);

    const jobs: JobData[] = jobsData?.jobs?.data || [];
    const invoices: InvoiceData[] = invoicesData?.invoices?.data || [];
    const tasks: TaskData[] = tasksData?.tasks?.data || [];
    const contacts: ContactData[] = contactsData?.contacts?.data || [];

    const content = buildResponse(message, jobs, invoices, tasks, contacts);

    return NextResponse.json({
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process your request. Please try again.' },
      { status: 500 }
    );
  }
}
