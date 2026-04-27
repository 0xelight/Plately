import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export const config = {
  api: { bodyParser: false },
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const files = formData.getAll('photos') as File[]

  if (!files.length) {
    return NextResponse.json({ error: 'No files' }, { status: 400 })
  }

  const uploadId = uuidv4()
  const dir = join('/tmp', 'plately', uploadId)
  await mkdir(dir, { recursive: true })

  const paths: string[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop() ?? 'jpg'
    const filePath = join(dir, `photo_${i}.${ext}`)
    await writeFile(filePath, buffer)
    paths.push(filePath)
  }

  return NextResponse.json({ upload_id: uploadId, paths })
}
