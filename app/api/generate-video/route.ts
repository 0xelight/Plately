import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { fal } from '@fal-ai/client'
import ffmpeg from 'fluent-ffmpeg'
import sql from '@/lib/db/client'
import type { SceneJSON } from '@/lib/types'

fal.config({ credentials: process.env.FAL_KEY })

const POSITION_MAP: Record<string, { x: string; y: string }> = {
  'bottom-left':   { x: '50', y: 'h-th-50' },
  'bottom-center': { x: '(w-tw)/2', y: 'h-th-50' },
  'bottom-right':  { x: 'w-tw-50', y: 'h-th-50' },
  'center':        { x: '(w-tw)/2', y: '(h-th)/2' },
  'top-left':      { x: '50', y: '50' },
  'top-right':     { x: 'w-tw-50', y: '50' },
}

const FONT_SIZE_MAP = { small: 32, medium: 48, large: 64 }

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r}/${g}/${b}`
}

async function runFFmpegConcat(
  clips: string[],
  concatPath: string,
  outputPath: string,
  musicPath: string,
  scene_json: SceneJSON
): Promise<void> {
  return new Promise((resolve, reject) => {
    const totalDuration = scene_json.slides.reduce((acc, s) => acc + s.duration_sec, 0)

    // Build drawtext filter for each slide based on its duration
    let offset = 0
    const drawTextFilters = scene_json.slides.map((slide) => {
      const pos = POSITION_MAP[slide.overlay.position] ?? POSITION_MAP['bottom-center']
      const fontSize = FONT_SIZE_MAP[slide.overlay.size] ?? 48
      const color = slide.overlay.color.startsWith('#')
        ? hexToRgb(slide.overlay.color)
        : '255/255/255'

      const enable = `between(t,${offset},${offset + slide.duration_sec})`
      const alpha =
        slide.overlay.animation === 'fade' || slide.overlay.animation === 'fade-up'
          ? `if(lt(t-${offset},0.5),(t-${offset})/0.5,if(gt(t-${offset},${slide.duration_sec - 0.5}),(${offset + slide.duration_sec}-t)/0.5,1))`
          : '1'

      offset += slide.duration_sec
      return `drawtext=text='${slide.overlay.text.replace(/'/g, "\\'")}':fontsize=${fontSize}:fontcolor=${color}:alpha='${alpha}':x=${pos.x}:y=${pos.y}:enable='${enable}':shadowx=2:shadowy=2:shadowcolor=black@0.6`
    })

    const filterComplex = drawTextFilters.join(',')

    const cmd = ffmpeg()

    // Add input clips
    clips.forEach(c => cmd.input(c))

    // Music input
    cmd.input(musicPath)

    // Build concat filter
    const concatInputs = clips.map((_, i) => `[${i}:v]`).join('')
    const n = clips.length

    cmd
      .complexFilter([
        `${concatInputs}concat=n=${n}:v=1:a=0[concatv]`,
        `[concatv]${filterComplex}[outv]`,
        `[${n}:a]aloop=loop=-1:size=2e+09,atrim=duration=${totalDuration}[outa]`,
      ])
      .outputOptions([
        '-map', '[outv]',
        '-map', '[outa]',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-preset', 'fast',
        '-crf', '23',
        '-movflags', '+faststart',
        '-t', String(totalDuration),
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run()
  })
}

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { project_id, scene_json, photo_paths } = body as {
    project_id: string
    scene_json: SceneJSON
    photo_paths: string[]
  }

  const tmpDir = join('/tmp', 'plately', project_id)
  const outDir = join(process.cwd(), 'public', 'outputs', project_id)
  await mkdir(tmpDir, { recursive: true })
  await mkdir(outDir, { recursive: true })

  const clips: string[] = []

  // Generate video clips for each slide via fal.ai Seedance
  for (const slide of scene_json.slides) {
    const photoPath = photo_paths[slide.photo_index] ?? photo_paths[0]
    const photoBuffer = await readFile(photoPath)
    const photoBase64 = photoBuffer.toString('base64')
    const ext = photoPath.split('.').pop() ?? 'jpeg'
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    const dataUrl = `data:${mime};base64,${photoBase64}`

    const result = await fal.subscribe('fal-ai/seedance-video/v1-lite/image-to-video', {
      input: {
        image_url: dataUrl,
        prompt: slide.camera_prompt,
        duration: slide.duration_sec <= 4 ? 4 : 8,
        aspect_ratio: '9:16',
      },
    }) as { video?: { url?: string }; data?: { video?: { url?: string } } }

    const videoUrl = result?.video?.url ?? (result as { data?: { video?: { url?: string } } })?.data?.video?.url
    if (!videoUrl) throw new Error(`No video URL for slide ${slide.id}`)

    const clipRes = await fetch(videoUrl)
    const clipBuf = await clipRes.arrayBuffer()
    const clipPath = join(tmpDir, `clip_${slide.id}.mp4`)
    await writeFile(clipPath, Buffer.from(clipBuf))
    clips.push(clipPath)
  }

  const musicPath = join(process.cwd(), 'public', 'music', `${scene_json.music}.mp3`)
  const concatPath = join(tmpDir, 'concat.txt')
  const outputPath = join(outDir, 'video.mp4')

  await runFFmpegConcat(clips, concatPath, outputPath, musicPath, scene_json)

  const videoUrl = `/outputs/${project_id}/video.mp4`

  await sql`
    UPDATE projects
    SET video_url = ${videoUrl},
        caption = ${scene_json.caption},
        hashtags = ${scene_json.hashtags},
        status = CASE
          WHEN format = 'video' THEN 'done'
          WHEN format = 'both' AND carousel_urls IS NOT NULL THEN 'done'
          ELSE status
        END
    WHERE id = ${project_id}
  `

  return NextResponse.json({ video_url: videoUrl })
}
