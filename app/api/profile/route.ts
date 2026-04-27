import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db/client'
import { runMigrations } from '@/lib/db/migrate'

export async function POST(req: NextRequest) {
  await runMigrations()
  const body = await req.json()
  const { resto_name, resto_type, city, style, vibe } = body

  const [profile] = await sql`
    INSERT INTO profiles (resto_name, resto_type, city, style, vibe)
    VALUES (${resto_name}, ${resto_type}, ${city}, ${style}, ${vibe})
    RETURNING *
  `

  return NextResponse.json(profile)
}
