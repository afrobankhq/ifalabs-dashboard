/*
 Fetch auth-related endpoints from Swagger and write AUTH_ENDPOINTS.md
*/

const fs = require('fs')

const BASES = Array.from(new Set([
  process.env.NEXT_PUBLIC_API_URL,
  'http://localhost:3000/api/proxy',
  'https://api.ifalabs.com',
].filter(Boolean)))

async function fetchText(url, headers = {}) {
  const resp = await fetch(url, { headers })
  const text = await resp.text()
  return { ok: resp.ok, status: resp.status, statusText: resp.statusText, text }
}

async function fetchJson(url, headers = {}) {
  const resp = await fetch(url, { headers })
  const data = await resp.json()
  return { ok: resp.ok, status: resp.status, statusText: resp.statusText, data }
}

function pickAuthPaths(spec) {
  const paths = spec?.paths || {}
  const found = { login: undefined, register: undefined, logout: undefined, refresh: undefined, verify: undefined }
  for (const p in paths) {
    const lowered = p.toLowerCase()
    if (!found.login && (lowered.includes('login') || lowered.includes('signin') || lowered.includes('sign-in'))) found.login = p
    if (!found.register && (lowered.includes('register') || lowered.includes('signup') || lowered.includes('sign-up') || lowered.includes('sign_up'))) found.register = p
    if (!found.logout && lowered.includes('logout')) found.logout = p
    if (!found.refresh && lowered.includes('refresh')) found.refresh = p
    if (!found.verify && (lowered.includes('verify') || lowered.includes('me'))) found.verify = p
  }
  return found
}

async function main() {
  let spec = null
  let sourceBase = null
  for (const BASE of BASES) {
    // Try common JSON spec paths first
    const jsonCandidates = [`${BASE}/swagger/v1/swagger.json`, `${BASE}/swagger.json`, `${BASE}/openapi.json`]
    for (const url of jsonCandidates) {
      try {
        const { ok, data } = await fetchJson(url, { 'Accept': 'application/json' })
        if (ok && data) { spec = data; sourceBase = BASE; break }
      } catch {}
    }
    if (spec) break
    // Fallback: parse Swagger UI HTML to get the spec URL
    try {
      const { ok, text } = await fetchText(`${BASE}/swagger/index.html`, { 'Accept': 'text/html' })
      if (ok) {
        const m = text.match(/url:\s*["']([^"']+)["']/) || text.match(/urls:\s*\[\s*\{[^}]*url:\s*["']([^"']+)["']/)
        if (m && m[1]) {
          const jsonUrl = m[1].startsWith('http') ? m[1] : `${BASE}${m[1]}`
          const r = await fetchJson(jsonUrl, { 'Accept': 'application/json' })
          if (r.ok) { spec = r.data; sourceBase = BASE; break }
        }
      }
    } catch {}
    if (spec) break
  }

  if (!spec) {
    console.error('Could not fetch Swagger spec. Tried bases:', BASES.join(', '))
    process.exit(1)
  }

  const found = pickAuthPaths(spec)

  const lines = []
  lines.push('# IFA Labs Auth Endpoints (from Swagger)')
  lines.push('')
  lines.push(`Source: ${sourceBase}/swagger/index.html`)
  lines.push('')
  lines.push('## Environment Variables')
  lines.push('```')
  lines.push(`NEXT_PUBLIC_AUTH_LOGIN_PATH=${found.login || '/<not-found>'}`)
  lines.push(`NEXT_PUBLIC_AUTH_REGISTER_PATH=${found.register || '/<not-found>'}`)
  lines.push(`NEXT_PUBLIC_AUTH_REFRESH_PATH=${found.refresh || '/<not-found>'}`)
  lines.push(`NEXT_PUBLIC_AUTH_LOGOUT_PATH=${found.logout || '/<not-found>'}`)
  lines.push(`NEXT_PUBLIC_AUTH_VERIFY_PATH=${found.verify || '/<not-found>'}`)
  lines.push('```')
  lines.push('')
  lines.push('## Discovered Paths')
  lines.push('- Login: ' + (found.login || 'not found'))
  lines.push('- Register: ' + (found.register || 'not found'))
  lines.push('- Refresh: ' + (found.refresh || 'not found'))
  lines.push('- Logout: ' + (found.logout || 'not found'))
  lines.push('- Verify: ' + (found.verify || 'not found'))
  lines.push('')

  fs.writeFileSync('AUTH_ENDPOINTS.md', lines.join('\n'), 'utf8')
  console.log('Wrote AUTH_ENDPOINTS.md with discovered endpoints.')
}

if (typeof fetch !== 'function') {
  console.error('Global fetch is not available. Please run on Node 18+ or add a fetch polyfill.')
  process.exit(1)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})


