import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import sql from '@/lib/db/client'
import { mergeSceneJSONPatch, needsVisualRerender } from '@/lib/utils'
import type { SceneJSON, Message } from '@/lib/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { project_id, message, scene_json, history } = body as {
    project_id: string
    message: string
    scene_json: SceneJSON
    history: Message[]
  }

  // Save user message
  await sql`
    INSERT INTO messages (project_id, role, content, scene_json_snapshot)
    VALUES (${project_id}, 'user', ${message}, ${JSON.stringify(scene_json)}::jsonb)
  `

  const systemPrompt = `You are a content editor for restaurant social media. The user wants to modify their content.
Interpret the request and return ONLY a JSON patch with fields to update in SceneJSON.

Examples:
- "caption plus courte" → { "caption": "..." }
- "texte en blanc slide 1" → { "slides": [{ "id": 1, "overlay": { "color": "#FFFFFF" } }] }
- "musique énergique" → { "music": "energetic-beat" }
- "plus de dynamisme" → patch several slides with faster animations

Valid music values: warm-acoustic | upbeat-cafe | chill-ambient | energetic-beat | elegant-piano
Valid transition values: smooth-dissolve | cut | fade-black
Valid animation values: fade | fade-up | slide-left | none
Valid position values: bottom-left | bottom-center | bottom-right | center | top-left | top-right
Valid size values: small | medium | large

Current SceneJSON:
${JSON.stringify(scene_json, null, 2)}

Return ONLY valid JSON patch. Zero preamble. Zero explanation.`

  const chatHistory = history.slice(-6).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: message },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1000,
  })

  const patchRaw = response.choices[0].message.content ?? '{}'
  const patch = JSON.parse(patchRaw) as Partial<SceneJSON>

  const updatedSceneJson = mergeSceneJSONPatch(scene_json, patch)
  const rerenderType = needsVisualRerender(patch)
  const needsRerender = rerenderType !== 'none'

  // Build human-readable assistant message
  const summaryRes = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: 'Tu es un assistant éditeur de contenu. Résume en une phrase courte et naturelle en français ce que tu viens de modifier, sans JSON.',
      },
      { role: 'user', content: `J'ai demandé: "${message}". Tu as appliqué ce patch: ${patchRaw}` },
    ],
    max_tokens: 100,
  })
  const assistantMessage = summaryRes.choices[0].message.content ?? 'Modifications appliquées.'

  // Save assistant message
  await sql`
    INSERT INTO messages (project_id, role, content, scene_json_snapshot)
    VALUES (${project_id}, 'assistant', ${assistantMessage}, ${JSON.stringify(updatedSceneJson)}::jsonb)
  `

  // Update project scene_json
  await sql`
    UPDATE projects
    SET scene_json = ${JSON.stringify(updatedSceneJson)}::jsonb,
        caption = ${updatedSceneJson.caption},
        hashtags = ${updatedSceneJson.hashtags}
    WHERE id = ${project_id}
  `

  return NextResponse.json({
    updated_scene_json: updatedSceneJson,
    needs_rerender: needsRerender,
    rerender_type: rerenderType,
    assistant_message: assistantMessage,
  })
}
