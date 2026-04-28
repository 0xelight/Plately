import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db/client'
import { runMigrations } from '@/lib/db/migrate'
import { getSessionUserId } from '@/lib/auth'

export async function POST(req: NextRequest) {
  await runMigrations()

  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { resto_name, resto_type, city, style, vibe } = await req.json()

  const [profile] = await sql`
    INSERT INTO profiles (user_id, resto_name, resto_type, city, style, vibe)
    VALUES (${userId}, ${resto_name}, ${resto_type}, ${city}, ${style}, ${vibe})
    RETURNING *
  `

  return NextResponse.json(profile)
}
