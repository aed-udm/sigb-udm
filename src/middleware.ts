import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Configuration du middleware pour Vercel avec sécurité renforcée
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Headers de sécurité renforcés pour toutes les routes
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  response.headers.set('X-Download-Options', 'noopen')

  // Content Security Policy pour protection XSS
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
  response.headers.set('Content-Security-Policy', csp)

  // HTTPS strict en production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  // Configuration CORS sécurisée pour les APIs
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:3000',
      'https://bibliotheque-udm.vercel.app',
      'https://sigb.udm.edu.cm',
      'http://192.168.100.111:3000'
    ];

    // CORS sécurisé : vérifier l'origine
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      // Requêtes same-origin (sans header Origin)
      response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')

    // Protection contre les attaques par timing
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    }

    // Cache sécurisé pour les APIs de lecture
    if (request.method === 'GET') {
      response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    }
  }

  // Gestion des requêtes OPTIONS pour CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers })
  }

  // Redirection pour les anciennes routes
  if (request.nextUrl.pathname === '/home') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirection des pages d'erreur par défaut vers nos pages personnalisées
  if (request.nextUrl.pathname === '/404' || request.nextUrl.pathname === '/_error') {
    return NextResponse.redirect(new URL('/not-found', request.url))
  }

  if (request.nextUrl.pathname === '/500') {
    return NextResponse.redirect(new URL('/500', request.url))
  }

  // Protection des routes sensibles (optionnel pour plus tard)
  const protectedPaths = ['/dashboard', '/analytics', '/admin']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath) {
    // Pour l'instant, on laisse passer - à implémenter plus tard avec l'auth
    // const token = request.cookies.get('auth-token')
    // if (!token) {
    //   return NextResponse.redirect(new URL('/auth/login', request.url))
    // }
  }

  return response
}

// Configuration des routes où le middleware s'applique
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
