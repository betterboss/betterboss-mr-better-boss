import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import type { TakeoffLineItem, BlueprintMeasurement } from '@/types/jobtread';

// =============================================================================
// Blueprint Takeoff API — analyzes uploaded blueprint images and produces a
// full material takeoff with line items formatted for JobTread budgets.
//
// POST body: { imageData: string (base64), projectType?: string, defaultMarkup?: number, notes?: string }
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { imageData, projectType, defaultMarkup, notes } = body;

    if (!imageData || typeof imageData !== 'string') {
      return NextResponse.json({ error: 'Image is required. Please upload a blueprint.' }, { status: 400 });
    }

    // Validate base64 image size (max 10MB encoded ≈ 13.3MB base64)
    const MAX_BASE64_LENGTH = 14_000_000;
    if (imageData.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Image too large. Maximum size is 10MB.' }, { status: 400 });
    }

    // Validate MIME type from base64 prefix
    const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const mimeMatch = imageData.match(/^data:(image\/[a-z]+);base64,/);
    if (mimeMatch && !ALLOWED_MIMES.includes(mimeMatch[1])) {
      return NextResponse.json({ error: 'Unsupported image format. Use JPEG, PNG, or WebP.' }, { status: 400 });
    }

    // Validate projectType if provided
    const VALID_PROJECT_TYPES = ['residential', 'commercial', 'industrial', 'roofing', 'remodel', 'addition', 'custom'];
    if (projectType && typeof projectType === 'string' && !VALID_PROJECT_TYPES.includes(projectType)) {
      return NextResponse.json({ error: `Invalid project type. Must be one of: ${VALID_PROJECT_TYPES.join(', ')}` }, { status: 400 });
    }

    // Validate defaultMarkup if provided
    if (defaultMarkup !== undefined && (typeof defaultMarkup !== 'number' || defaultMarkup < 0 || defaultMarkup > 500 || !isFinite(defaultMarkup))) {
      return NextResponse.json({ error: 'Markup must be a number between 0 and 500.' }, { status: 400 });
    }

    // Attempt AI vision analysis first — falls back to heuristic engine if no API key
    const aiResult = await analyzeWithAI(imageData, projectType, notes);

    if (aiResult) {
      // Apply user's default markup if provided
      const markup = defaultMarkup ?? 45;
      const result = applyMarkup(aiResult, markup);
      return NextResponse.json(result);
    }

    // Fallback: heuristic takeoff engine based on project type
    const markup = defaultMarkup ?? 45;
    const result = generateHeuristicTakeoff(projectType || 'residential', markup);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Blueprint takeoff error:', error);
    return NextResponse.json({ error: 'Blueprint analysis failed' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// AI Vision Analysis — uses OpenAI GPT-4 Vision or Anthropic Claude Vision
// ---------------------------------------------------------------------------

async function analyzeWithAI(
  imageData: string,
  projectType?: string,
  notes?: string
) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const systemPrompt = `You are a construction estimating expert performing a blueprint takeoff. Analyze the uploaded blueprint/plan image and extract:

1. PROJECT SUMMARY: project type, total square footage, number of rooms, number of stories, brief description
2. MEASUREMENTS: all dimensions you can read — wall lengths, room sizes, openings, ceiling heights
3. MATERIAL TAKEOFF LINE ITEMS: generate a complete list of construction line items with:
   - name, description, category (CSI division), quantity, unit (SF, LF, EA, SQ, CY, etc.), unitCost (your best estimate)
   - tradeGroup: which trade handles this (Framing, Concrete, Electrical, Plumbing, HVAC, Roofing, Drywall, Paint, Flooring, Insulation, etc.)

Group items by trade. Be thorough — include foundation, framing, roofing, insulation, drywall, paint, flooring, doors, windows, electrical, plumbing, HVAC, exterior finish, and general conditions.

${projectType ? `Project type hint: ${projectType}` : ''}
${notes ? `Additional notes: ${notes}` : ''}

Respond ONLY with valid JSON in this exact format:
{
  "projectSummary": { "projectType": "", "totalArea": 0, "unit": "SF", "roomCount": 0, "stories": 1, "description": "" },
  "measurements": [{ "label": "", "value": 0, "unit": "", "area": "" }],
  "lineItems": [{ "name": "", "description": "", "category": "", "quantity": 0, "unit": "", "unitCost": 0, "tradeGroup": "" }],
  "confidence": 0.0,
  "warnings": []
}`;

  try {
    if (openaiKey) {
      return await callOpenAIVision(openaiKey, systemPrompt, imageData);
    }
    if (anthropicKey) {
      return await callAnthropicVision(anthropicKey, systemPrompt, imageData);
    }
  } catch (err) {
    console.error('AI vision analysis failed, falling back to heuristic:', err);
  }

  return null;
}

async function callOpenAIVision(apiKey: string, systemPrompt: string, imageData: string) {
  const mimeType = inferMimeType(imageData);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this blueprint and generate a complete material takeoff.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageData}` } },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.2,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI API: ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  return parseAIResponse(content);
}

async function callAnthropicVision(apiKey: string, systemPrompt: string, imageData: string) {
  const mimeType = inferMimeType(imageData) as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageData } },
            { type: 'text', text: 'Analyze this blueprint and generate a complete material takeoff.' },
          ],
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic API: ${response.status}`);
  const data = await response.json();
  const content = data.content?.[0]?.text || '';
  return parseAIResponse(content);
}

function inferMimeType(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('R0lGO')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
}

interface AIRawResponse {
  projectSummary?: {
    projectType?: string;
    totalArea?: number;
    unit?: string;
    roomCount?: number;
    stories?: number;
    description?: string;
  };
  measurements?: { label?: string; value?: number; unit?: string; area?: string }[];
  lineItems?: {
    name?: string;
    description?: string;
    category?: string;
    quantity?: number;
    unit?: string;
    unitCost?: number;
    tradeGroup?: string;
  }[];
  confidence?: number;
  warnings?: string[];
}

function parseAIResponse(content: string) {
  // Extract JSON from potential markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  const jsonStr = (jsonMatch[1] || content).trim();

  let parsed: AIRawResponse;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('AI returned invalid JSON. Please try analyzing the blueprint again.');
  }

  const measurements: BlueprintMeasurement[] = (parsed.measurements || []).map((m) => ({
    label: m.label || '',
    value: m.value || 0,
    unit: m.unit || 'LF',
    area: m.area,
  }));

  const lineItems: TakeoffLineItem[] = (parsed.lineItems || []).map((item) => {
    const unitCost = item.unitCost || 0;
    const qty = item.quantity || 0;
    return {
      name: item.name || '',
      description: item.description || '',
      category: (item.category || 'General Conditions') as TakeoffLineItem['category'],
      quantity: qty,
      unit: item.unit || 'EA',
      unitCost,
      unitPrice: 0, // will be calculated with markup
      totalCost: Math.round(qty * unitCost * 100) / 100,
      totalPrice: 0,
      markup: 0,
      tradeGroup: item.tradeGroup || 'General',
    };
  });

  return {
    projectSummary: {
      projectType: parsed.projectSummary?.projectType || 'residential',
      totalArea: parsed.projectSummary?.totalArea || 0,
      unit: parsed.projectSummary?.unit || 'SF',
      roomCount: parsed.projectSummary?.roomCount || 0,
      stories: parsed.projectSummary?.stories || 1,
      description: parsed.projectSummary?.description || '',
    },
    measurements,
    lineItems,
    confidence: parsed.confidence || 0.75,
    warnings: parsed.warnings || [],
  };
}

// ---------------------------------------------------------------------------
// Apply markup to AI-generated line items
// ---------------------------------------------------------------------------

function applyMarkup(
  raw: ReturnType<typeof parseAIResponse>,
  markupPct: number
) {
  const multiplier = 1 + markupPct / 100;
  const lineItems: TakeoffLineItem[] = raw.lineItems.map((item) => {
    const unitPrice = Math.round(item.unitCost * multiplier * 100) / 100;
    const totalPrice = Math.round(item.quantity * unitPrice * 100) / 100;
    return { ...item, unitPrice, totalPrice, markup: markupPct };
  });

  const subtotalCost = lineItems.reduce((s, i) => s + i.totalCost, 0);
  const subtotalPrice = lineItems.reduce((s, i) => s + i.totalPrice, 0);
  const taxRate = 0.0825;
  const tax = Math.round(subtotalPrice * taxRate * 100) / 100;

  return {
    ...raw,
    lineItems,
    subtotalCost: Math.round(subtotalCost * 100) / 100,
    subtotalPrice: Math.round(subtotalPrice * 100) / 100,
    tax,
    totalPrice: Math.round((subtotalPrice + tax) * 100) / 100,
    markup: markupPct,
    analyzedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Heuristic Takeoff Engine — used when no AI API key is available
// Generates a comprehensive takeoff based on standard construction templates
// ---------------------------------------------------------------------------

function generateHeuristicTakeoff(projectType: string, markupPct: number) {
  const templates: Record<string, { totalArea: number; rooms: number; stories: number }> = {
    residential: { totalArea: 2400, rooms: 8, stories: 1 },
    commercial: { totalArea: 5000, rooms: 12, stories: 1 },
    remodel: { totalArea: 1200, rooms: 4, stories: 1 },
    addition: { totalArea: 600, rooms: 2, stories: 1 },
    roofing: { totalArea: 2800, rooms: 0, stories: 1 },
    multifamily: { totalArea: 8000, rooms: 24, stories: 2 },
  };

  const spec = templates[projectType] || templates.residential;
  const sf = spec.totalArea;
  const perimLF = Math.round(Math.sqrt(sf) * 4);
  const roofSQ = Math.ceil(sf / 100);

  type RawLineItem = {
    name: string;
    desc: string;
    cat: string;
    qty: number;
    unit: string;
    cost: number;
    trade: string;
  };

  const rawItems: RawLineItem[] = [
    // Sitework & Foundation
    { name: 'Site clearing & grading', desc: 'Clear lot, rough grade, set elevations', cat: 'Sitework', qty: sf, unit: 'SF', cost: 1.25, trade: 'Excavation' },
    { name: 'Excavation & footings', desc: 'Dig footings, form, pour', cat: 'Concrete', qty: perimLF, unit: 'LF', cost: 28, trade: 'Concrete' },
    { name: 'Foundation slab / stem wall', desc: 'Concrete foundation per plan', cat: 'Concrete', qty: sf, unit: 'SF', cost: 6.5, trade: 'Concrete' },
    { name: 'Foundation waterproofing', desc: 'Damp-proof membrane & drainage', cat: 'Thermal & Moisture', qty: perimLF, unit: 'LF', cost: 8.5, trade: 'Waterproofing' },

    // Framing
    { name: 'Floor framing system', desc: 'Joists, subfloor, blocking', cat: 'Wood & Plastics', qty: sf, unit: 'SF', cost: 5.75, trade: 'Framing' },
    { name: 'Wall framing — exterior', desc: '2x6 exterior walls per plan', cat: 'Wood & Plastics', qty: perimLF, unit: 'LF', cost: 18, trade: 'Framing' },
    { name: 'Wall framing — interior', desc: '2x4 interior partitions', cat: 'Wood & Plastics', qty: Math.round(perimLF * 1.8), unit: 'LF', cost: 12, trade: 'Framing' },
    { name: 'Roof framing / trusses', desc: 'Engineered trusses or rafters', cat: 'Wood & Plastics', qty: sf, unit: 'SF', cost: 7.25, trade: 'Framing' },
    { name: 'Sheathing (walls + roof)', desc: 'OSB / plywood sheathing', cat: 'Wood & Plastics', qty: sf + perimLF * 9, unit: 'SF', cost: 1.85, trade: 'Framing' },

    // Roofing
    { name: 'Roofing underlayment', desc: 'Synthetic underlayment', cat: 'Thermal & Moisture', qty: roofSQ, unit: 'SQ', cost: 38, trade: 'Roofing' },
    { name: 'Shingles / roofing material', desc: 'Architectural shingles, installed', cat: 'Thermal & Moisture', qty: roofSQ, unit: 'SQ', cost: 145, trade: 'Roofing' },
    { name: 'Ridge vent & flashing', desc: 'Ridge vent, step flashing, drip edge', cat: 'Thermal & Moisture', qty: 1, unit: 'LS', cost: 1200, trade: 'Roofing' },
    { name: 'Gutters & downspouts', desc: 'Seamless aluminum gutters', cat: 'Thermal & Moisture', qty: perimLF, unit: 'LF', cost: 8, trade: 'Roofing' },

    // Insulation
    { name: 'Wall insulation', desc: 'R-21 batt insulation, exterior walls', cat: 'Thermal & Moisture', qty: perimLF * 9, unit: 'SF', cost: 1.45, trade: 'Insulation' },
    { name: 'Ceiling / attic insulation', desc: 'R-38 blown-in insulation', cat: 'Thermal & Moisture', qty: sf, unit: 'SF', cost: 1.85, trade: 'Insulation' },

    // Exterior
    { name: 'Exterior siding', desc: 'Siding material & installation', cat: 'Finishes', qty: perimLF * 9, unit: 'SF', cost: 6.5, trade: 'Siding' },
    { name: 'Exterior trim & fascia', desc: 'Trim boards, fascia, soffit', cat: 'Finishes', qty: perimLF, unit: 'LF', cost: 12, trade: 'Siding' },
    { name: 'Exterior paint / finish', desc: 'Prime & two coats', cat: 'Finishes', qty: perimLF * 9, unit: 'SF', cost: 2.25, trade: 'Paint' },

    // Windows & Doors
    { name: 'Windows — supply & install', desc: 'Vinyl double-hung per plan', cat: 'Doors & Windows', qty: Math.max(spec.rooms * 2, 8), unit: 'EA', cost: 650, trade: 'Windows' },
    { name: 'Exterior doors', desc: 'Entry + service doors', cat: 'Doors & Windows', qty: Math.max(Math.ceil(spec.rooms / 3), 2), unit: 'EA', cost: 1100, trade: 'Doors' },
    { name: 'Interior doors', desc: 'Pre-hung interior doors', cat: 'Doors & Windows', qty: Math.max(spec.rooms, 4), unit: 'EA', cost: 380, trade: 'Doors' },

    // Drywall & Interior Finish
    { name: 'Drywall — hang, tape, finish', desc: '1/2" drywall, Level 4 finish', cat: 'Finishes', qty: Math.round(sf * 3.5), unit: 'SF', cost: 2.15, trade: 'Drywall' },
    { name: 'Interior paint', desc: 'Prime & two coats, walls + ceilings', cat: 'Finishes', qty: Math.round(sf * 3.5), unit: 'SF', cost: 1.35, trade: 'Paint' },
    { name: 'Interior trim & baseboard', desc: 'Baseboard, casing, crown', cat: 'Finishes', qty: perimLF + Math.round(perimLF * 1.8), unit: 'LF', cost: 6.5, trade: 'Trim Carpentry' },
    { name: 'Cabinets & countertops', desc: 'Kitchen + bath cabinetry', cat: 'Furnishings', qty: 1, unit: 'LS', cost: Math.round(sf * 6.5), trade: 'Cabinets' },
    { name: 'Flooring', desc: 'LVP, tile, carpet per plan', cat: 'Finishes', qty: sf, unit: 'SF', cost: 5.75, trade: 'Flooring' },

    // Electrical
    { name: 'Electrical rough-in', desc: 'Wiring, boxes, panel', cat: 'Electrical', qty: sf, unit: 'SF', cost: 5.5, trade: 'Electrical' },
    { name: 'Electrical finish / fixtures', desc: 'Devices, fixtures, trim-out', cat: 'Electrical', qty: sf, unit: 'SF', cost: 3.25, trade: 'Electrical' },

    // Plumbing
    { name: 'Plumbing rough-in', desc: 'Supply, drain, vent piping', cat: 'Plumbing', qty: sf, unit: 'SF', cost: 5.75, trade: 'Plumbing' },
    { name: 'Plumbing fixtures', desc: 'Sinks, toilets, tub/shower, faucets', cat: 'Plumbing', qty: sf, unit: 'SF', cost: 3.5, trade: 'Plumbing' },
    { name: 'Water heater', desc: '50-gal tank water heater, installed', cat: 'Plumbing', qty: 1, unit: 'EA', cost: 1800, trade: 'Plumbing' },

    // HVAC
    { name: 'HVAC system', desc: 'Furnace, A/C, ductwork, installed', cat: 'Mechanical', qty: sf, unit: 'SF', cost: 7.5, trade: 'HVAC' },

    // General Conditions
    { name: 'Permits & fees', desc: 'Building permit, plan review, impact fees', cat: 'General Conditions', qty: 1, unit: 'LS', cost: Math.round(sf * 2.5), trade: 'General' },
    { name: 'Dumpster & cleanup', desc: 'Construction dumpsters, final clean', cat: 'General Conditions', qty: 1, unit: 'LS', cost: Math.round(sf * 1.25), trade: 'General' },
    { name: 'Project management', desc: 'Supervision & coordination', cat: 'General Conditions', qty: 1, unit: 'LS', cost: Math.round(sf * 3), trade: 'General' },
  ];

  // Filter for project type
  const filteredItems = projectType === 'roofing'
    ? rawItems.filter((i) =>
        ['Roofing', 'General', 'Waterproofing'].includes(i.trade) ||
        i.name.toLowerCase().includes('roof') ||
        i.name.toLowerCase().includes('gutter')
      )
    : rawItems;

  const multiplier = 1 + markupPct / 100;

  const lineItems: TakeoffLineItem[] = filteredItems.map((item) => {
    const unitPrice = Math.round(item.cost * multiplier * 100) / 100;
    const totalCost = Math.round(item.qty * item.cost * 100) / 100;
    const totalPrice = Math.round(item.qty * unitPrice * 100) / 100;
    return {
      name: item.name,
      description: item.desc,
      category: item.cat as TakeoffLineItem['category'],
      quantity: item.qty,
      unit: item.unit,
      unitCost: item.cost,
      unitPrice,
      totalCost,
      totalPrice,
      markup: markupPct,
      tradeGroup: item.trade,
    };
  });

  const subtotalCost = lineItems.reduce((s, i) => s + i.totalCost, 0);
  const subtotalPrice = lineItems.reduce((s, i) => s + i.totalPrice, 0);
  const taxRate = 0.0825;
  const tax = Math.round(subtotalPrice * taxRate * 100) / 100;

  const measurements: BlueprintMeasurement[] = [
    { label: 'Total floor area', value: sf, unit: 'SF' },
    { label: 'Building perimeter', value: perimLF, unit: 'LF' },
    { label: 'Roof area', value: roofSQ * 100, unit: 'SF' },
    { label: 'Wall height (assumed)', value: 9, unit: 'FT' },
    { label: 'Wall surface area', value: perimLF * 9, unit: 'SF' },
  ];

  return {
    projectSummary: {
      projectType,
      totalArea: sf,
      unit: 'SF',
      roomCount: spec.rooms,
      stories: spec.stories,
      description: `${projectType.charAt(0).toUpperCase() + projectType.slice(1)} project — heuristic takeoff based on ${sf.toLocaleString()} SF`,
    },
    measurements,
    lineItems,
    subtotalCost: Math.round(subtotalCost * 100) / 100,
    subtotalPrice: Math.round(subtotalPrice * 100) / 100,
    tax,
    totalPrice: Math.round((subtotalPrice + tax) * 100) / 100,
    markup: markupPct,
    confidence: 0.7,
    warnings: [
      'Takeoff generated from heuristic templates — verify quantities against actual plans.',
      'Unit costs are regional averages and should be adjusted for your market.',
    ],
    analyzedAt: new Date().toISOString(),
  };
}
