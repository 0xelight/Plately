import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import OpenAI from 'openai'
import sql from '@/lib/db/client'
import { runMigrations } from '@/lib/db/migrate'
import type { SceneJSON, Profile } from '@/lib/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  await runMigrations()

  const body = await req.json()
  const { photo_paths, profile, format, platform } = body as {
    photo_paths: string[]
    profile: Profile
    format: string
    platform: string
  }

  // Create project in pending state
  const [project] = await sql`
    INSERT INTO projects (profile_id, status, format, platform)
    VALUES (${profile.id}, 'analyzing', ${format}, ${platform})
    RETURNING *
  `

  // Build image content array for GPT-4o vision
  const imageContents = await Promise.all(
    photo_paths.map(async (p) => {
      const buf = await readFile(p)
      const b64 = buf.toString('base64')
      const ext = p.split('.').pop()?.toLowerCase() ?? 'jpg'
      const mime =
        ext === 'png' ? 'image/png' :
        ext === 'webp' ? 'image/webp' :
        ext === 'gif' ? 'image/gif' :
        'image/jpeg'
      return {
        type: 'image_url' as const,
        image_url: { url: `data:${mime};base64,${b64}`, detail: 'high' as const },
      }
    })
  )

  const systemPrompt = `You are an expert social media content director for restaurants.
Analyze the provided food/restaurant photos and the restaurant profile.
Generate a complete SceneJSON for a ${platform} ${format} content piece.

Rules:
- Create 4 slides with narrative arc: hook → story → detail → CTA
- Slide overlay text: French, max 5 words, punchy, no hashtags
- camera_prompt: food photography style, e.g. "slow zoom in, warm bokeh, golden hour light"
- Caption: French, 150 chars max, human tone, no corporate speak
- 8 hashtags: mix broad + local + niche
- music: pick based on vibe (warm-acoustic | upbeat-cafe | chill-ambient | energetic-beat | elegant-piano)
- transition: smooth-dissolve | cut | fade-black
- content_type: plat | ambiance | equipe | boisson | dessert
- overlay size: small | medium | large
- overlay position: bottom-left | bottom-center | bottom-right | center | top-left | top-right
- overlay animation: fade | fade-up | slide-left | none
- Respond with ONLY valid JSON matching SceneJSON. Zero preamble.`

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    ...imageContents,
    {
      type: 'text',
      text: `Restaurant profile:
- Name: ${profile.resto_name}
- Type: ${profile.resto_type}
- City: ${profile.city}
- Style: ${profile.style}
- Vibe: ${profile.vibe}

Generate the SceneJSON now.`,
    },
  ]

  const response = await openai.chat.completions.create({
    model: 'gpt-5.4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_completion_tokens: 4096,
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0].message.content ?? '{}'
  const sceneJson = JSON.parse(raw) as SceneJSON

  await sql`
    UPDATE projects
    SET scene_json = ${JSON.stringify(sceneJson)}::jsonb,
        photo_paths = ${photo_paths},
        status = 'generating'
    WHERE id = ${project.id}
  `

  return NextResponse.json({ project_id: project.id, scene_json: sceneJson })
}
