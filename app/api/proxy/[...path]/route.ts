import { NextRequest, NextResponse } from 'next/server'

const UPSTREAM_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.ifalabs.com'

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
    const upstreamResponse = await fetch(url, init)
    const body = await upstreamResponse.arrayBuffer()
    const responseHeaders = new Headers()
    upstreamResponse.headers.forEach((value, key) => {
      // Strip hop-by-hop headers if any
      if (['transfer-encoding', 'connection'].includes(key.toLowerCase())) return
      responseHeaders.set(key, value)
    })
    return new NextResponse(body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    return NextResponse.json({ message: 'Proxy error', error: (error as Error).message }, { status: 502 })
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as PATCH, handle as OPTIONS, handle as HEAD }


