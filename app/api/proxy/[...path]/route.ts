import { NextRequest, NextResponse } from 'next/server'

// Choose upstream base from dedicated env, avoid recursion and invalid relative values
const candidateUpstream =
  process.env.PROXY_UPSTREAM_URL ||
  process.env.NEXT_PUBLIC_UPSTREAM_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_API_URL ||
  ''

const isRelative = candidateUpstream.startsWith('/')
const upstreamSafe = isRelative || !candidateUpstream ? 'https://api.ifalabs.com' : candidateUpstream
const UPSTREAM_BASE = upstreamSafe.replace(/\/$/, '')

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
      try { console.debug('[proxy] →', { url, method: request.method }) } catch {}
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
      try { console.debug('[proxy] ←', { url, status: upstreamResponse.status }) } catch {}
    }
    return proxied
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      try { console.error('[proxy] error', { url, error: (error as Error)?.message }) } catch {}
    }
    return NextResponse.json({ message: 'Proxy error', error: (error as Error).message }, { status: 502 })
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as PATCH, handle as OPTIONS, handle as HEAD }


