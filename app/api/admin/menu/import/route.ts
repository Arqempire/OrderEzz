import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminSession } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';

interface ExtractedMenuItem {
  category_name: string;
  item_name: string;
  description: string | null;
  price: number;
  confidence_flag: string | null;
}

export async function POST(request: Request) {
  // 1. Server-side auth & role verification
  const auth = await verifyAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status || 401 }
    );
  }
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No menu image or document provided.' }, { status: 400 });
    }

    // Convert file to base64 buffer for vision LLM processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    let extractedItems: ExtractedMenuItem[] = [];

    // Strip quotes and whitespace from environment variable
    const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '')
      .replace(/['"]/g, '')
      .trim();
    const openAiApiKey = (process.env.OPENAI_API_KEY || '').replace(/['"]/g, '').trim();

    if (!geminiApiKey && !openAiApiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add your GEMINI_API_KEY in .env.local file.' },
        { status: 400 }
      );
    }

    if (geminiApiKey) {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiApiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an expert restaurant menu parser. Analyze this menu image/document and extract all menu items. 
Return ONLY a valid JSON array of objects with the exact schema:
[
  {
    "category_name": "Starters / Mains / Drinks",
    "item_name": "Name of Dish",
    "description": "Short description if present, else null",
    "price": 12.50,
    "confidence_flag": "null or short string if price/reading is uncertain e.g. 'price unclear'"
  }
]
No markdown formatting, no code block wrapping, ONLY raw valid JSON array.`,
                  },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        console.error(
          `Gemini Vision API Error (HTTP ${response.status}):`,
          JSON.stringify(responseBody, null, 2)
        );
        const errorMessage =
          responseBody?.error?.message || `Gemini API HTTP Error ${response.status}`;
        return NextResponse.json(
          { error: `Gemini Vision API Error: ${errorMessage}` },
          { status: response.status }
        );
      }

      const textResponse = responseBody?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!textResponse) {
        console.error('Gemini Vision API returned empty text candidate response:', responseBody);
        return NextResponse.json(
          { error: 'Gemini Vision API returned empty response text. Could not parse menu items.' },
          { status: 400 }
        );
      }

      try {
        const cleanedJsonText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        extractedItems = JSON.parse(cleanedJsonText);
      } catch (parseErr: any) {
        console.error('Failed to parse Gemini output as JSON:', textResponse);
        return NextResponse.json(
          { error: `Failed to parse JSON response from Gemini Vision API: ${parseErr.message}` },
          { status: 400 }
        );
      }
    } else if (openAiApiKey) {
      // Call OpenAI GPT-4o Vision API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract all menu items from this image as a JSON array of objects:
[{"category_name": string, "item_name": string, "description": string|null, "price": number, "confidence_flag": string|null}]`,
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${base64Data}` },
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errMsg = data?.error?.message || `OpenAI API Error ${response.status}`;
        console.error(`OpenAI Vision API Error (HTTP ${response.status}):`, data);
        return NextResponse.json({ error: `OpenAI API Error: ${errMsg}` }, { status: response.status });
      }

      const content = data?.choices?.[0]?.message?.content || '';
      try {
        const cleanedJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
        extractedItems = JSON.parse(cleanedJson);
      } catch (parseErr: any) {
        return NextResponse.json(
          { error: `Failed to parse JSON response from OpenAI Vision API: ${parseErr.message}` },
          { status: 400 }
        );
      }
    }

    if (!Array.isArray(extractedItems) || extractedItems.length === 0) {
      return NextResponse.json(
        { error: 'No menu items could be extracted from the uploaded document.' },
        { status: 400 }
      );
    }

    // Initialize Supabase Server Client
    const supabase = createClient();

    // 1. Create menu_import_batches entry
    const { data: batchData, error: batchError } = await supabase
      .from('menu_import_batches')
      .insert([
        {
          source_image_url: file.name,
          status: 'pending_review',
        },
      ])
      .select()
      .single();

    if (batchError || !batchData) {
      console.error('Error creating import batch:', batchError);
      return NextResponse.json({ error: 'Failed to create import batch in database.' }, { status: 500 });
    }

    // 2. Insert extracted items into menu_import_items staging table
    const stagingPayload = extractedItems.map((item) => ({
      batch_id: batchData.id,
      category_name: item.category_name || 'General',
      item_name: item.item_name || 'Unnamed Item',
      description: item.description || null,
      price: typeof item.price === 'number' ? item.price : parseFloat(item.price as any) || 0.0,
      confidence_flag: item.confidence_flag || null,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from('menu_import_items')
      .insert(stagingPayload)
      .select();

    if (itemsError) {
      console.error('Error inserting staging items:', itemsError);
      return NextResponse.json({ error: 'Failed to insert staging items.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      batchId: batchData.id,
      items: insertedItems,
    });
  } catch (error: any) {
    console.error('AI Menu Import API Handler Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
