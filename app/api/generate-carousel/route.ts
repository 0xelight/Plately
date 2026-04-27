import { NextRequest, NextResponse } from 'next/server'
import { readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import sharp from 'sharp'
import sql from '@/lib/db/client'
import type { SceneJSON, Slide } from '@/lib/types'

const FONT_SIZES = { small: 32, medium: 44, large: 60 }
const CANVAS_W = 1080
const CANVAS_H = 1350

function buildSvgOverlay(slide: Slide, w: number, h: number): string {
  const { text, size, position, color, animation } = slide.overlay
  const fontSize = FONT_SIZES[size]
  const padding = 40

  const positions: Record<string, { x: string; y: string; anchor: string }> = {
    'bottom-left':   { x: `${padding}`, y: `${h - padding - fontSize}`, anchor: 'start' },
    'bottom-center': { x: `${w / 2}`, y: `${h - padding - fontSize}`, anchor: 'middle' },
    'bottom-right':  { x: `${w - padding}`, y: `${h - padding - fontSize}`, anchor: 'end' },
    'center':        { x: `${w / 2}`, y: `${h / 2}`, anchor: 'middle' },
    'top-left':      { x: `${padding}`, y: `${padding + fontSize}`, anchor: 'start' },
    'top-right':     { x: `${w - padding}`, y: `${padding + fontSize}`, anchor: 'end' },
  }

  const pos = positions[position] ?? positions['bottom-center']

  // gradient overlay rect for readability
  const isBottom = position.startsWith('bottom')
  const isTop = position.startsWith('top')
  let gradientDef = ''
  let gradientRect = ''

  if (isBottom) {
    gradientDef = `<defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity="0.7"/></linearGradient></defs>`
    gradientRect = `<rect x="0" y="${h * 0.55}" width="${w}" height="${h * 0.45}" fill="url(#grad)"/>`
  } else if (isTop) {
    gradientDef = `<defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="black" stop-opacity="0.7"/><stop offset="100%" stop-color="black" stop-opacity="0"/></linearGradient></defs>`
    gradientRect = `<rect x="0" y="0" width="${w}" height="${h * 0.35}" fill="url(#grad)"/>`
  }

  const animAttr = animation !== 'none' ? `opacity="0.95"` : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  ${gradientDef}
  ${gradientRect}
  <text
    x="${pos.x}"
    y="${pos.y}"
    text-anchor="${pos.anchor}"
    font-family="'Arial', 'Helvetica', sans-serif"
    font-size="${fontSize}"
    font-weight="700"
    fill="${color}"
    ${animAttr}
    paint-order="stroke"
    stroke="rgba(0,0,0,0.4)"
    stroke-width="3"
    stroke-linejoin="round"
  >${text}</text>
</svg>`
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { project_id, scene_json, photo_paths } = body as {
    project_id: string
    scene_json: SceneJSON
    photo_paths: string[]
  }

  const outDir = join(process.cwd(), 'public', 'outputs', project_id)
  await mkdir(outDir, { recursive: true })

  const carouselUrls: string[] = []

  for (const slide of scene_json.slides) {
    const photoPath = photo_paths[slide.photo_index] ?? photo_paths[0]
    const photoBuffer = await readFile(photoPath)

    const svgBuffer = Buffer.from(buildSvgOverlay(slide, CANVAS_W, CANVAS_H))

    const outPath = join(outDir, `slide_${slide.id}.jpg`)

    await sharp(photoBuffer)
      .resize(CANVAS_W, CANVAS_H, { fit: 'cover', position: 'centre' })
      .composite([{ input: svgBuffer, top: 0, left: 0 }])
      .jpeg({ quality: 90 })
      .toFile(outPath)

    carouselUrls.push(`/outputs/${project_id}/slide_${slide.id}.jpg`)
  }

  await sql`
    UPDATE projects
    SET carousel_urls = ${carouselUrls},
        caption = ${scene_json.caption},
        hashtags = ${scene_json.hashtags},
        status = CASE
          WHEN format = 'carousel' THEN 'done'
          ELSE status
        END
    WHERE id = ${project_id}
  `

  return NextResponse.json({ carousel_urls: carouselUrls })
}
