import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db/client'
import { runMigrations } from '@/lib/db/migrate'
import { createSession, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth'

export async function POST(req: NextRequest) {
  await runMigrations()
  const { email, password } = await req.json()

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: 'Email et mot de passe requis (min. 8 caractères)' },
      { status: 400 }
    )
  }

  const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`
  if (existing.length) {
    return NextResponse.json(
      { error: 'Un compte existe déjà avec cet email' },
      { status: 409 }
    )
  }

  const password_hash = await bcrypt.hash(password, 12)
  const [user] = await sql`
    INSERT INTO users (email, password_hash)
    VALUES (${email.toLowerCase()}, ${password_hash})
    RETURNING id
  `

  const token = await createSession(user.id)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS)
  return res
}
