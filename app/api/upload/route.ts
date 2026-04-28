import { NextRequest, NextResponse } from 'next/server'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

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
    const filePath = join(dir, `photo_${i}.jpg`)
    // Convert any format (HEIC, TIFF, BMP…) to JPEG for OpenAI compatibility
    await sharp(buffer).jpeg({ quality: 90 }).toFile(filePath)
    paths.push(filePath)
  }

  return NextResponse.json({ upload_id: uploadId, paths })
}
