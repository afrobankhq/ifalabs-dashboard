# Email Verification Signup Flow

## Overview

The application now uses a two-step email verification signup flow for better security and email validation.

## User Flow

1. **Step 1: Email Entry**
   - User visits `/signup`
   - User enters their email address
   - System sends a verification email to the provided address
   - User sees a confirmation screen


2. **Step 2: Email Verification & Complete Registration**
   - User clicks the verification link in their email
   - User is redirected to `/complete-registration?token=xxx`
   - System verifies the token
   - User enters their details:
     - First Name (required)
     - Last Name (required)
     - Password (required, min 6 characters)
     - Confirm Password (required)
     - Bio/Description (optional)
     - Website (optional)
   - Upon submission, account is created
   - User is automatically logged in and redirected to dashboard

## Frontend Implementation

### Pages

1. **`/signup`** - Email entry page
   - Only shows email input field
   - Sends verification email via `/api/auth/register/initiate`
   - Shows success confirmation when email is sent

2. **`/complete-registration?token=xxx`** - Complete registration page
   - Verifies token via `/api/auth/register/verify`
   - Shows registration form if token is valid
   - Completes registration via `/api/auth/register/complete`
   - Auto-logs in user after successful registration

### API Routes

All routes are in `ifalabs-dashboard/app/api/auth/register/`:

1. **POST `/api/auth/register/initiate`**
   - Receives: `{ email: string }`
   - Proxies to Oracle Engine backend
   - Returns: `{ message: string, email: string }`

2. **GET `/api/auth/register/verify?token=xxx`**
   - Receives: token as query parameter
   - Proxies to Oracle Engine backend
   - Returns: `{ valid: boolean, email: string, token: string }`

3. **POST `/api/auth/register/complete`**
   - Receives:
     ```json
     {
       "token": "verification_token",
       "name": "Full Name",
       "first_name": "First",
       "last_name": "Last",
       "password": "password123",
       "description": "Optional bio",
       "website": "https://example.com"
     }
     ```
   - Proxies to Oracle Engine backend
   - Returns: `{ id: string, email: string, message: string }`

## Oracle Engine Backend Requirements

The Oracle Engine backend must implement the following endpoints:

### 1. Initiate Registration (Send Verification Email)

**Endpoint:** `POST /api/auth/register/initiate`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success - 200):**
```json
{
  "message": "Verification email sent successfully",
  "email": "user@example.com"
}
```

**Response (Error - 400/500):**
```json
{
  "error": "Error message here"
}
```

**Behavior:**
- Validate email format
- Check if email already exists in database
- Generate a unique verification token (JWT or random string)
- Store token in database with:
  - Associated email
  - Expiration time (recommended: 24 hours)
  - Creation timestamp
- Send email to user with verification link: `https://yourdomain.com/complete-registration?token=TOKEN`
- Email should be properly formatted with:
  - Clear call-to-action button
  - Token expiration notice
  - Company branding

### 2. Verify Token

**Endpoint:** `GET /api/auth/register/verify?token=xxx`

**Query Parameters:**
- `token`: The verification token from email link

**Response (Success - 200):**
```json
{
  "valid": true,
  "email": "user@example.com"
}
```

**Response (Error - 400/404):**
```json
{
  "valid": false,
  "error": "Invalid or expired token"
}
```

**Behavior:**
- Look up token in database
- Check if token exists and hasn't expired
- Return associated email address if valid
- Return error if token is invalid, expired, or already used

### 3. Complete Registration

**Endpoint:** `POST /api/auth/register/complete`

**Request Body:**
```json
{
  "token": "verification_token_here",
  "name": "John Doe",
  "first_name": "John",
  "last_name": "Doe",
  "password": "securepassword123",
  "description": "Software developer",
  "website": "https://johndoe.com"
}
```

**Response (Success - 200):**
```json
{
  "id": "user-uuid-here",
  "email": "user@example.com",
  "message": "Registration completed successfully"
}
```

**Response (Error - 400/404/500):**
```json
{
  "error": "Error message here"
}
```

**Behavior:**
- Verify token is valid and not expired
- Verify token hasn't been used already
- Hash the password securely (bcrypt, argon2, etc.)
- Create user in database with:
  - ID (UUID)
  - Email (from token)
  - Name
  - First name
  - Last name
  - Hashed password
  - Description (optional)
  - Website (optional)
  - Created timestamp
  - Default subscription plan (e.g., 'free')
- Mark token as used or delete it
- Return user ID and email
- Send welcome email (optional)

## Database Schema Requirements

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  description TEXT,
  website VARCHAR(500),
  logo_url VARCHAR(500),
  subscription_plan VARCHAR(50) DEFAULT 'free',
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Verification Tokens Table
```sql
CREATE TABLE verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(500) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'email_verification',
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_email (email)
);
```

## Environment Variables

Add these to your `.env.local` file:

```env
# Oracle Engine Backend URL
PROXY_UPSTREAM_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
ORACLE_ENGINE_URL=http://localhost:8000

# Auth Endpoints (Optional - defaults shown)
NEXT_PUBLIC_AUTH_INITIATE_REGISTER_PATH=/api/auth/register/initiate
NEXT_PUBLIC_AUTH_VERIFY_REGISTER_PATH=/api/auth/register/verify
NEXT_PUBLIC_AUTH_COMPLETE_REGISTER_PATH=/api/auth/register/complete

# Existing auth paths
NEXT_PUBLIC_AUTH_LOGIN_PATH=/api/auth/login
NEXT_PUBLIC_AUTH_REGISTER_PATH=/api/auth/register
NEXT_PUBLIC_AUTH_LOGOUT_PATH=/api/auth/logout
```

## Email Template Example

Here's a suggested email template for the verification email:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your Email - IFA Labs</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #4F46E5;">IFA Labs</h1>
    </div>
    
    <h2>Verify Your Email Address</h2>
    
    <p>Thank you for signing up for IFA Labs! Please verify your email address to complete your registration.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{VERIFICATION_LINK}}" 
         style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Verify Email Address
      </a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="background-color: #f5f5f5; padding: 10px; word-break: break-all;">
      {{VERIFICATION_LINK}}
    </p>
    
    <p style="color: #666; font-size: 14px;">
      This link will expire in 24 hours. If you didn't request this email, you can safely ignore it.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center;">
      © 2024 IFA Labs. All rights reserved.
    </p>
  </div>
</body>
</html>
```

## Security Considerations

1. **Token Security**
   - Use cryptographically secure random tokens or signed JWTs
   - Tokens should be single-use only
   - Implement short expiration times (24 hours recommended)
   - Store token hashes in database, not plain tokens (if using random strings)

2. **Password Security**
   - Enforce minimum password length (6+ characters)
   - Use bcrypt or argon2 for password hashing
   - Consider adding password strength requirements

3. **Email Security**
   - Validate email format on both frontend and backend
   - Check for disposable email domains (optional)
   - Implement rate limiting on email sending
   - Add CAPTCHA if needed to prevent abuse

4. **Rate Limiting**
   - Limit verification email requests per IP/email
   - Limit registration attempts per IP
   - Implement exponential backoff for failed attempts

## Testing

### Manual Testing Flow

1. **Test Email Verification:**
   ```bash
   # Start development server
   npm run dev
   
   # Navigate to http://localhost:3000/signup
   # Enter email and submit
   # Check backend logs for verification token
   # Copy token and navigate to:
   # http://localhost:3000/complete-registration?token=YOUR_TOKEN
   ```

2. **Test Token Expiration:**
   - Set short expiration (5 minutes)
   - Wait for expiration
   - Try to use token - should show error

3. **Test Invalid Token:**
   - Navigate to `/complete-registration?token=invalid`
   - Should show verification failed message

4. **Test Complete Registration:**
   - Use valid token
   - Fill in all required fields
   - Submit form
   - Should auto-login and redirect to dashboard

### Backend API Testing

Use these curl commands to test your Oracle Engine endpoints:

```bash
# Test initiate registration
curl -X POST http://localhost:8000/api/auth/register/initiate \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Test verify token
curl -X GET "http://localhost:8000/api/auth/register/verify?token=YOUR_TOKEN"

# Test complete registration
curl -X POST http://localhost:8000/api/auth/register/complete \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN",
    "name": "Test User",
    "first_name": "Test",
    "last_name": "User",
    "password": "password123",
    "description": "Test description",
    "website": "https://example.com"
  }'
```

## Migration from Old Flow

The old direct signup flow is still available in the codebase but not used by the UI. To switch back:

1. Revert `/signup` page to use the old form (backup available in git history)
2. Remove new API routes if not needed
3. Update auth context to use old `signup()` method

## Troubleshooting

### Email not sending
- Check backend logs for email service errors
- Verify SMTP configuration in Oracle Engine
- Check email service rate limits

### Token verification fails
- Check token hasn't expired
- Verify token exists in database
- Check for token encoding issues in URL

### Auto-login fails after registration
- Verify login credentials are correct
- Check if user was actually created in database
- Verify JWT token generation works

### Complete registration page shows error
- Check browser console for errors
- Verify token parameter in URL
- Check backend API response format matches expected structure

