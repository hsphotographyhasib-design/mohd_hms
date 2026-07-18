import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
export const dynamic = 'force-dynamic';

const VALID_ACTIONS = ['remarks', 'corrective', 'recommendation', 'summary', 'safety', 'rootcause'] as const;
type Action = typeof VALID_ACTIONS[number];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { action: string; context: string };
    const { action, context } = body;

    if (!VALID_ACTIONS.includes(action as Action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    if (!context) {
      return NextResponse.json({ error: 'context is required' }, { status: 400 });
    }

    const zai = await ZAI.create();

    const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);

    const result = await zai.chat.completions.create({
      model: 'default',
      messages: [
        {
          role: 'system',
          content: `You are a senior building maintenance inspector. Generate professional ${actionLabel} based on the provided context. Be concise, professional, and specific. Use bullet points where appropriate. Keep the response under 200 words.`,
        },
        { role: 'user', content: context },
      ],
    });

    const text = result.choices?.[0]?.message?.content || '';

    return NextResponse.json({ text });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}