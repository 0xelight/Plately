import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db/client'
import { runMigrations } from '@/lib/db/migrate'
import { createSession, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth'

export async function POST(req: NextRequest) {
  await runMigrations()
  const { email, password } = await req.json()

  const [user] = await sql`
    SELECT * FROM users WHERE email = ${email.toLowerCase()}
  `
  if (!user) {
    return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
  }

  const token = await createSession(user.id)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS)
  return res
}
