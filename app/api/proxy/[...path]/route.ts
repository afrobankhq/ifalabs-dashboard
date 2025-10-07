import { NextRequest, NextResponse } from 'next/server'

// Choose upstream base from dedicated env, avoid recursion and invalid relative values
// Priority: PROXY_UPSTREAM_URL > NEXT_PUBLIC_API_URL > fallback
const candidateUpstream =
  process.env.PROXY_UPSTREAM_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_UPSTREAM_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_API_URL ||
  ''

const isRelative = candidateUpstream.startsWith('/')
const upstreamSafe = isRelative || !candidateUpstream ? 'http://146.190.186.116:8000' : candidateUpstream
const UPSTREAM_BASE = upstreamSafe.replace(/\/$/, '')

// Log the configuration on startup (only in non-production)
if (process.env.NODE_ENV !== 'production') {
  console.log('[proxy] Configuration:', {
    UPSTREAM_BASE,
    PROXY_UPSTREAM_URL: process.env.PROXY_UPSTREAM_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  })
}

async function handle(request: NextRequest, context: { params: { path: string[] } }) {
  const { params } = await Promise.resolve(context)
  const targetPath = params?.path?.join('/') || ''
  const url = `${UPSTREAM_BASE}/${targetPath}`

  const headers = new Headers()
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'host' || key.toLowerCase() === 'origin') return
    headers.set(key, value)
  })

  const init: RequestInit = {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
    redirect: 'follow',
  }

  try {
    if (process.env.NODE_ENV !== 'production') {
      try { console.debug('[proxy] →', { url, method: request.method, hasBody: !!init.body }) } catch {}
    }
    
    const upstreamResponse = await fetch(url, init)
    const body = await upstreamResponse.arrayBuffer()
    const responseHeaders = new Headers()
    upstreamResponse.headers.forEach((value, key) => {
      // Strip hop-by-hop headers if any
      if (['transfer-encoding', 'connection'].includes(key.toLowerCase())) return
      responseHeaders.set(key, value)
    })
    
    const proxied = new NextResponse(body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    })
    
    if (process.env.NODE_ENV !== 'production') {
      try { 
        console.debug('[proxy] ←', { 
          url, 
          status: upstreamResponse.status,
          contentType: upstreamResponse.headers.get('content-type')
        }) 
      } catch {}
    }
    
    return proxied
  } catch (error) {
    const errorMessage = (error as Error)?.message || 'Unknown error'
    const errorDetails = {
      url,
      method: request.method,
      error: errorMessage,
      upstreamBase: UPSTREAM_BASE,
      targetPath: targetPath,
      timestamp: new Date().toISOString()
    }
    
    console.error('[proxy] error', errorDetails)
    
    // Return detailed error in development, generic in production
    const responseBody = process.env.NODE_ENV !== 'production'
      ? {
          message: 'Proxy request failed',
          error: errorMessage,
          details: errorDetails,
          hint: 'Check that PROXY_UPSTREAM_URL is set correctly and the backend server is running'
        }
      : {
          message: 'Service temporarily unavailable',
          error: 'Unable to connect to backend service'
        }
    
    return NextResponse.json(responseBody, { status: 502 })
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as PATCH, handle as OPTIONS, handle as HEAD }


