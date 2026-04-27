import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db/client'
import { runMigrations } from '@/lib/db/migrate'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await runMigrations()
  const { id } = await params

  const [project] = await sql`
    SELECT id, status, format, platform, scene_json, video_url, carousel_urls, caption, hashtags
    FROM projects
    WHERE id = ${id}
  `

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}
