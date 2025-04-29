import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '../../lib/openai';
import { auth0 } from '../../lib/auth0';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { prompt, model = 'gpt-4.1' } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Generate text using OpenAI
    const result = await generateText(prompt, model);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate text' },
        { status: 500 }
      );
    }

    // Return the generated text
    return NextResponse.json({
      success: true,
      text: result.text,
    });
  } catch (error) {
    console.error('Error in text generation API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}