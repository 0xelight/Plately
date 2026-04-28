import { NextResponse } from 'next/server'
import sql from '@/lib/db/client'
import { getSessionUserId } from '@/lib/auth'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ user: null, profile: null })

  const [user] = await sql`SELECT id, email, created_at FROM users WHERE id = ${userId}`
  if (!user) return NextResponse.json({ user: null, profile: null })

  const [profile] = await sql`
    SELECT * FROM profiles WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1
  `

  return NextResponse.json({ user, profile: profile ?? null })
}
