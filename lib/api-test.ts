// Utility to test API server connectivity
const API_BASE_URL = typeof window !== 'undefined' ? '/api/proxy' : (process.env.NEXT_PUBLIC_API_URL || 'https://api.ifalabs.com')

export async function testApiConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const candidates = [
      `${API_BASE_URL}/swagger/index.html`,
      `${API_BASE_URL}/swagger`,
      `${API_BASE_URL}/docs`,
      `${API_BASE_URL}/health`,
      `${API_BASE_URL}/api/status`,
      `${API_BASE_URL}/`,
    ]

    let lastStatus = 0
    let lastStatusText = ''
    for (const url of candidates) {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/json',
        },
      })
      if (response.ok) {
        return { success: true, message: `API reachable at ${url}` }
      }
      lastStatus = response.status
      lastStatusText = `${response.statusText} at ${url}`
    }
    return { success: false, message: `API server returned ${lastStatus}: ${lastStatusText}` }
  } catch (error) {
    return { 
      success: false, 
      message: `Cannot connect to API server: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

export async function testAuthEndpoints(): Promise<{ login: boolean; signup: boolean }> {
  const results = { login: false, signup: false }

  try {
    // Test login endpoint
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@example.com', password: 'test' }),
    })
    results.login = loginResponse.status !== 404

    // Test signup endpoint
    const signupResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Test', email: 'test@example.com', password: 'test' }),
    })
    results.signup = signupResponse.status !== 404

  } catch (error) {
    console.error('Error testing auth endpoints:', error)
  }

  return results
}
