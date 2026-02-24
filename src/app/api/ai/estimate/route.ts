import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { estimateRequestSchema, validateBody } from '@/lib/validate';
import { DEFAULT_TAX_RATE, AI_ESTIMATE_CONFIDENCE, AI_MARKET_COMPARISON_LOW, AI_MARKET_COMPARISON_HIGH, RATE_LIMITS } from '@/lib/constants';

// AI Estimate Generation Endpoint
// Uses OpenAI to generate intelligent estimates when available
// Falls back to template-based generation otherwise

const ESTIMATE_SYSTEM_PROMPT = `You are an expert construction estimator. Given a project type, square footage, and description, generate accurate line-item estimates.

Rules:
- Return ONLY valid JSON (no markdown, no explanation)
- Each line item must have: name, category (Labor/Materials/Equipment/Subcontractor/General), quantity, unit (SQ/SF/LF/EA/HR/LS/FT/GAL/TON/CY), unitCost (number), unitPrice (number)
- unitCost is your cost, unitPrice is what you charge the customer
- Maintain 25-40% margins on labor, 30-50% on materials
- Use realistic 2024 construction pricing for the US market
- Include all necessary items: demo, materials, labor, disposal, permits where applicable
- Keep line items between 4-10 items
- Use SQ (roofing squares = 100 sqft) for roofing, SF for interior work

Response format:
{"lineItems": [{"name": "...", "category": "...", "quantity": 1, "unit": "SQ", "unitCost": 45, "unitPrice": 72}], "notes": "Brief estimator notes about assumptions"}`;

interface AILineItem {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  unitPrice: number;
}

async function generateWithOpenAI(
  projectType: string,
  squareFootage: number,
  description: string
): Promise<{ lineItems: AILineItem[]; notes?: string } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });

    const userPrompt = `Project: ${projectType}
Square Footage: ${squareFootage || 'Not specified'}
Description: ${description || 'Standard ' + projectType + ' project'}

Generate a detailed line-item estimate.`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ESTIMATE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.lineItems) || parsed.lineItems.length === 0) return null;

    // Validate and sanitize each line item
    const validItems: AILineItem[] = parsed.lineItems
      .filter((item: Record<string, unknown>) =>
        item.name && item.category && typeof item.unitCost === 'number' && typeof item.unitPrice === 'number'
      )
      .map((item: Record<string, unknown>) => ({
        name: String(item.name).slice(0, 200),
        category: String(item.category),
        quantity: Math.max(0, Number(item.quantity) || 1),
        unit: String(item.unit || 'EA'),
        unitCost: Math.max(0, Number(item.unitCost)),
        unitPrice: Math.max(0, Number(item.unitPrice)),
      }));

    return validItems.length > 0 ? { lineItems: validItems, notes: parsed.notes } : null;
  } catch (error) {
    console.error('OpenAI estimate error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error: guardError } = await apiGuard(request, { rateLimit: RATE_LIMITS.ai });
    if (guardError) return guardError;

    const body = await request.json();
    const { data: input, error: validationError } = validateBody(estimateRequestSchema, body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { projectType, squareFootage, description } = input!;
    let lineItems: { name: string; category: string; quantity: number; unit: string; unitCost: number; unitPrice: number; totalCost: number; totalPrice: number }[];
    let aiGenerated = false;
    let estimatorNotes: string | undefined;

    // Try AI-powered estimate first
    const aiResult = await generateWithOpenAI(projectType, squareFootage || 0, description);
    if (aiResult) {
      aiGenerated = true;
      estimatorNotes = aiResult.notes;
      lineItems = aiResult.lineItems.map((item) => ({
        ...item,
        totalCost: Math.round(item.quantity * item.unitCost * 100) / 100,
        totalPrice: Math.round(item.quantity * item.unitPrice * 100) / 100,
      }));
    } else {
      // Fallback to template-based generation
      lineItems = generateEstimateLineItems(projectType || 'roofing', squareFootage || 0);
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * (DEFAULT_TAX_RATE / 100);

    return NextResponse.json({
      projectType,
      squareFootage,
      description,
      lineItems,
      subtotal,
      tax,
      total: subtotal + tax,
      confidence: AI_ESTIMATE_CONFIDENCE,
      generatedAt: new Date().toISOString(),
      aiPowered: aiGenerated,
      ...(estimatorNotes ? { notes: estimatorNotes } : {}),
      marketComparison: {
        low: subtotal * AI_MARKET_COMPARISON_LOW,
        average: subtotal,
        high: subtotal * AI_MARKET_COMPARISON_HIGH,
      },
    });
  } catch (error) {
    console.error('AI estimate error:', error);
    return NextResponse.json(
      { error: 'Estimate generation failed' },
      { status: 500 }
    );
  }
}

function generateEstimateLineItems(projectType: string, sqft: number) {
  const sqPerUnit = Math.max(sqft / 100, 1);

  const templates: Record<string, { name: string; category: string; unit: string; unitCost: number; unitPrice: number; perSq?: boolean }[]> = {
    roofing: [
      { name: 'Tear-off & removal', category: 'Labor', unit: 'SQ', unitCost: 45, unitPrice: 72, perSq: true },
      { name: 'Shingles / roofing material', category: 'Materials', unit: 'SQ', unitCost: 95, unitPrice: 145, perSq: true },
      { name: 'Installation labor', category: 'Labor', unit: 'SQ', unitCost: 65, unitPrice: 110, perSq: true },
      { name: 'Underlayment', category: 'Materials', unit: 'SQ', unitCost: 22, unitPrice: 38, perSq: true },
      { name: 'Cleanup & disposal', category: 'Equipment', unit: 'LS', unitCost: 450, unitPrice: 650 },
    ],
    remodel: [
      { name: 'Demolition & prep', category: 'Labor', unit: 'SQ', unitCost: 35, unitPrice: 58, perSq: true },
      { name: 'Framing & structural', category: 'Labor', unit: 'SQ', unitCost: 55, unitPrice: 92, perSq: true },
      { name: 'Finish materials', category: 'Materials', unit: 'SQ', unitCost: 80, unitPrice: 130, perSq: true },
      { name: 'Electrical rough-in', category: 'Subcontractor', unit: 'LS', unitCost: 1800, unitPrice: 2800 },
      { name: 'Plumbing rough-in', category: 'Subcontractor', unit: 'LS', unitCost: 2200, unitPrice: 3400 },
      { name: 'Finish labor', category: 'Labor', unit: 'SQ', unitCost: 45, unitPrice: 75, perSq: true },
      { name: 'Cleanup & disposal', category: 'Equipment', unit: 'LS', unitCost: 600, unitPrice: 850 },
    ],
    addition: [
      { name: 'Foundation & footings', category: 'Subcontractor', unit: 'SQ', unitCost: 50, unitPrice: 82, perSq: true },
      { name: 'Framing package', category: 'Materials', unit: 'SQ', unitCost: 65, unitPrice: 105, perSq: true },
      { name: 'Framing labor', category: 'Labor', unit: 'SQ', unitCost: 55, unitPrice: 90, perSq: true },
      { name: 'Roofing tie-in', category: 'Labor', unit: 'LS', unitCost: 2500, unitPrice: 4000 },
      { name: 'Exterior finish', category: 'Materials', unit: 'SQ', unitCost: 40, unitPrice: 68, perSq: true },
      { name: 'Interior finish', category: 'Materials', unit: 'SQ', unitCost: 55, unitPrice: 90, perSq: true },
      { name: 'MEP (Mechanical/Electrical/Plumbing)', category: 'Subcontractor', unit: 'LS', unitCost: 5500, unitPrice: 8500 },
      { name: 'Permits & inspections', category: 'General', unit: 'LS', unitCost: 1200, unitPrice: 1500 },
    ],
    commercial: [
      { name: 'Site prep & mobilization', category: 'Equipment', unit: 'LS', unitCost: 3500, unitPrice: 5200 },
      { name: 'Structural work', category: 'Labor', unit: 'SQ', unitCost: 75, unitPrice: 120, perSq: true },
      { name: 'Commercial roofing system', category: 'Materials', unit: 'SQ', unitCost: 110, unitPrice: 175, perSq: true },
      { name: 'Installation labor', category: 'Labor', unit: 'SQ', unitCost: 70, unitPrice: 115, perSq: true },
      { name: 'HVAC penetrations', category: 'Subcontractor', unit: 'LS', unitCost: 2800, unitPrice: 4200 },
      { name: 'Safety & compliance', category: 'General', unit: 'LS', unitCost: 1500, unitPrice: 2200 },
      { name: 'Cleanup & disposal', category: 'Equipment', unit: 'LS', unitCost: 900, unitPrice: 1400 },
    ],
    custom: [
      { name: 'General labor', category: 'Labor', unit: 'SQ', unitCost: 50, unitPrice: 85, perSq: true },
      { name: 'Materials', category: 'Materials', unit: 'SQ', unitCost: 70, unitPrice: 115, perSq: true },
      { name: 'Subcontractor allowance', category: 'Subcontractor', unit: 'LS', unitCost: 2000, unitPrice: 3200 },
      { name: 'Equipment & disposal', category: 'Equipment', unit: 'LS', unitCost: 500, unitPrice: 750 },
    ],
  };

  const items = templates[projectType] || templates.custom;

  return items.map((item) => {
    const qty = item.perSq ? sqPerUnit : 1;
    return {
      name: item.name,
      category: item.category,
      quantity: Math.round(qty * 100) / 100,
      unit: item.unit,
      unitCost: item.unitCost,
      unitPrice: item.unitPrice,
      totalCost: Math.round(qty * item.unitCost * 100) / 100,
      totalPrice: Math.round(qty * item.unitPrice * 100) / 100,
    };
  });
}
