import { NextResponse } from 'next/server'
import sql from '@/lib/db/client'
import { getSessionUserId } from '@/lib/auth'
import { runMigrations } from '@/lib/db/migrate'

export async function GET() {
  await runMigrations()
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await sql`
    SELECT p.id, p.status, p.format, p.platform, p.created_at,
           p.video_url, p.carousel_urls, p.caption
    FROM projects p
    JOIN profiles pr ON p.profile_id = pr.id
    WHERE pr.user_id = ${userId}
    ORDER BY p.created_at DESC
    LIMIT 50
  `

  return NextResponse.json(projects)
}
