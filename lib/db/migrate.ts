import sql from './client'

let migrated = false

export async function runMigrations() {
  if (migrated) return
  migrated = true

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      resto_name TEXT NOT NULL,
      resto_type TEXT NOT NULL,
      city TEXT NOT NULL,
      style TEXT NOT NULL,
      vibe TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID REFERENCES profiles(id),
      status TEXT DEFAULT 'pending',
      format TEXT NOT NULL,
      platform TEXT NOT NULL,
      scene_json JSONB,
      video_url TEXT,
      carousel_urls TEXT[],
      caption TEXT,
      hashtags TEXT[],
      photo_paths TEXT[],
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES projects(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      scene_json_snapshot JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  /* ── Schema evolution for existing databases (idempotent) ── */
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE`
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS photo_paths TEXT[]`
}
