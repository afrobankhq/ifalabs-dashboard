// Debug script to test API endpoints
// Run this in your browser console to debug API issues

async function debugApiEndpoints() {
  console.log('🔍 Debugging API Configuration...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL || 'NOT SET');
  console.log('NEXT_PUBLIC_PROFILE_KEYS_PATH:', process.env.NEXT_PUBLIC_PROFILE_KEYS_PATH || 'NOT SET');
  console.log('NEXT_PUBLIC_AUTH_LOGIN_PATH:', process.env.NEXT_PUBLIC_AUTH_LOGIN_PATH || 'NOT SET');
  
  // Check auth token
  const token = localStorage.getItem('auth_token');
  console.log('\n🔑 Authentication:');
  console.log('Has token:', !!token);
  console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'None');
  
  // Check user data
  const userData = localStorage.getItem('user_data');
  console.log('\n👤 User Data:');
  if (userData) {
    try {
      const user = JSON.parse(userData);
      console.log('User ID:', user.id);
      console.log('User Name:', user.name);
      console.log('User Email:', user.email);
    } catch (e) {
      console.log('Invalid user data:', userData);
    }
  } else {
    console.log('No user data found');
  }
  
  // Test API base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/proxy';
  console.log('\n🌐 API Base URL:', API_BASE_URL);
  
  // Test a simple endpoint
  console.log('\n🧪 Testing API Connection...');
  try {
    const testUrl = `${API_BASE_URL}/api/status`;
    console.log('Testing URL:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', data);
    } else {
      const text = await response.text();
      console.log('Error response:', text);
    }
  } catch (error) {
    console.error('Connection error:', error);
  }
  
  // Test profile endpoint if user exists
  if (userData) {
    try {
      const user = JSON.parse(userData);
      const profileUrl = `${API_BASE_URL}/api/dashboard/profiles/${user.id}`;
      console.log('\n👤 Testing Profile Endpoint...');
      console.log('Profile URL:', profileUrl);
      
      const response = await fetch(profileUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      console.log('Profile response status:', response.status);
      if (!response.ok) {
        const text = await response.text();
        console.log('Profile error response:', text);
      }
    } catch (error) {
      console.error('Profile test error:', error);
    }
  }
}

// Run the debug function
debugApiEndpoints();
