import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db/client'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const messages = await sql`
    SELECT * FROM messages
    WHERE project_id = ${id}
    ORDER BY created_at ASC
  `

  return NextResponse.json(messages)
}
