import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'plately-dev-secret-please-change-in-production'
)

const PROTECTED_PREFIXES = ['/', '/new', '/project', '/projects']
const PUBLIC_PATHS = ['/login']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const token = req.cookies.get('plately_session')?.value
  let userId: string | null = null
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET)
      userId = (payload.sub as string) ?? null
    } catch {
      userId = null
    }
  }

  const isProtected = PROTECTED_PREFIXES.some(
    p => pathname === p || pathname.startsWith(p + '/')
  )
  const isPublic = PUBLIC_PATHS.includes(pathname)

  if (isProtected && !userId) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (isPublic && userId) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|outputs|music|public).*)'],
}
