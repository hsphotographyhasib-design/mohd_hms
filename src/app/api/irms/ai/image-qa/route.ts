import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = verifyRouteAuth(req, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const body = await req.json() as { imageDataUrl: string; context?: string };
    const { imageDataUrl, context } = body;

    if (!imageDataUrl) {
      return NextResponse.json({ error: 'imageDataUrl is required' }, { status: 400 });
    }

    const zai = await ZAI.create();

    const result = await zai.chat.completions.createVision({
      model: 'default',
      messages: [
        {
          role: 'system',
          content: `Analyze this inspection photo. Determine if it is blurry, dark, or has any visible issues. Generate a concise professional caption describing what is shown. Respond ONLY in this exact JSON format, no other text:
{"blurry": false, "dark": false, "issue": "", "caption": ""}`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: context || 'Describe this inspection photo.' },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
    });

    const rawText = result.choices?.[0]?.message?.content || '';

    // Parse JSON from response - handle markdown code blocks
    let parsed: { blurry: boolean; dark: boolean; issue: string; caption: string };
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: use the raw text as caption
        parsed = { blurry: false, dark: false, issue: '', caption: rawText };
      }
    } catch {
      parsed = { blurry: false, dark: false, issue: '', caption: rawText };
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Image analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}