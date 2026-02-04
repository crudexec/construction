import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public paths that don't require any authentication
const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/vendor/login', '/client']
// Paths for authenticated users to be redirected away from
const authPaths = ['/login', '/register']
// Vendor portal paths (require vendor auth token)
const vendorPaths = ['/vendor']

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(`${path}/`))
  const isAuthPath = authPaths.some(path => pathname === path)
  const isVendorPath = vendorPaths.some(path => pathname.startsWith(path)) && !pathname.startsWith('/vendor/login')
  const isVendorLoginPath = pathname === '/vendor/login'

  // Get tokens
  const userToken = request.cookies.get('auth-token')?.value ||
                    request.headers.get('authorization')?.replace('Bearer ', '')
  const vendorToken = request.cookies.get('vendor-auth-token')?.value

  // Handle vendor portal routes
  if (isVendorPath) {
    if (!vendorToken) {
      const redirectUrl = new URL('/vendor/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname + search)
      return NextResponse.redirect(redirectUrl)
    }
    return NextResponse.next()
  }

  // Handle vendor login page
  if (isVendorLoginPath) {
    if (vendorToken) {
      const redirectPath = request.nextUrl.searchParams.get('redirect')
      if (redirectPath && redirectPath.startsWith('/vendor')) {
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }
      return NextResponse.redirect(new URL('/vendor/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Handle regular app routes
  if (!isPublicPath && !userToken) {
    // Preserve the original URL including query params for redirect after login
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname + search)
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthPath && userToken) {
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