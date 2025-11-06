import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password']
const authPaths = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(`${path}/`))
  const isAuthPath = authPaths.some(path => pathname === path)
  
  const token = request.cookies.get('auth-token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!isPublicPath && !token) {
    // Preserve the original URL including query params for redirect after login
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname + search)
    return NextResponse.redirect(redirectUrl)
  }
  
  if (isAuthPath && token) {
    // Check if there's a redirect parameter
    const redirectPath = request.nextUrl.searchParams.get('redirect')
    if (redirectPath) {
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}