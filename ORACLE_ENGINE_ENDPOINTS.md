# Oracle Engine Backend - Registration Endpoints

## Quick Reference for Backend Implementation

These are the endpoints that need to be implemented in the Oracle Engine backend to support the new email verification signup flow.

---


## 1. POST /api/auth/register/initiate

**Purpose:** Send verification email to user

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "Verification email sent successfully",
  "email": "user@example.com"
}
```

**Error Response (400):**
```json
{
  "error": "Email already registered" // or other error message
}
```

**Implementation Checklist:**
- [ ] Validate email format
- [ ] Check if email already exists in users table
- [ ] Generate unique verification token (UUID or JWT)
- [ ] Store token in `verification_tokens` table with:
  - Token
  - Email
  - Expiration (24 hours from now)
  - Type: 'email_verification'
- [ ] Send email with verification link
- [ ] Return success response

**Example Verification Link:**
```
https://yourdomain.com/complete-registration?token=abc123xyz789
```

---

## 2. GET /api/auth/register/verify

**Purpose:** Verify email token is valid

**Request:**
```
GET /api/auth/register/verify?token=abc123xyz789
```

**Success Response (200):**
```json
{
  "valid": true,
  "email": "user@example.com"
}
```

**Error Response (400/404):**
```json
{
  "valid": false,
  "error": "Invalid or expired token"
}
```

**Implementation Checklist:**
- [ ] Extract token from query parameter
- [ ] Look up token in `verification_tokens` table
- [ ] Check token exists
- [ ] Check token not expired (`expires_at > NOW()`)
- [ ] Check token not already used (`used = FALSE`)
- [ ] Return email if valid
- [ ] Return error if invalid

---

## 3. POST /api/auth/register/complete

**Purpose:** Complete user registration after email verification

**Request:**
```json
{
  "token": "abc123xyz789",
  "name": "John Doe",
  "first_name": "John",
  "last_name": "Doe",
  "password": "securepass123",
  "description": "Optional bio",
  "website": "https://example.com"
}
```

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "message": "Registration completed successfully"
}
```

**Error Response (400/404/500):**
```json
{
  "error": "Invalid or expired token"
}
```

**Implementation Checklist:**
- [ ] Verify token is valid and not expired
- [ ] Get email from token
- [ ] Hash password (use bcrypt/argon2)
- [ ] Create user in `users` table with:
  - UUID
  - Email
  - Name
  - First name
  - Last name
  - Password hash
  - Description (optional)
  - Website (optional)
  - subscription_plan = 'free'
  - email_verified = TRUE
- [ ] Mark token as used (`used = TRUE`) or delete it
- [ ] Return user ID and email
- [ ] Optional: Send welcome email

---

## Database Schema

### verification_tokens table

```sql
CREATE TABLE verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(500) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'email_verification',
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_token ON verification_tokens(token);
CREATE INDEX idx_verification_email ON verification_tokens(email);
```

### users table (ensure these fields exist)

```sql
-- Add these fields if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
```

---

## Example Implementation (Python/FastAPI)

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import uuid
import bcrypt
from sqlalchemy.orm import Session

router = APIRouter()

class InitiateRequest(BaseModel):
    email: EmailStr

class CompleteRequest(BaseModel):
    token: str
    name: str
    first_name: str
    last_name: str
    password: str
    description: str = ""
    website: str = ""

@router.post("/api/auth/register/initiate")
async def initiate_registration(request: InitiateRequest, db: Session = Depends(get_db)):
    # Check if email exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate token
    token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(hours=24)
    
    # Store token
    verification = VerificationToken(
        token=token,
        email=request.email,
        expires_at=expires_at
    )
    db.add(verification)
    db.commit()
    
    # Send email
    verification_link = f"https://yourdomain.com/complete-registration?token={token}"
    send_verification_email(request.email, verification_link)
    
    return {
        "message": "Verification email sent successfully",
        "email": request.email
    }

@router.get("/api/auth/register/verify")
async def verify_token(token: str, db: Session = Depends(get_db)):
    verification = db.query(VerificationToken).filter(
        VerificationToken.token == token,
        VerificationToken.used == False,
        VerificationToken.expires_at > datetime.utcnow()
    ).first()
    
    if not verification:
        return {
            "valid": False,
            "error": "Invalid or expired token"
        }
    
    return {
        "valid": True,
        "email": verification.email
    }

@router.post("/api/auth/register/complete")
async def complete_registration(request: CompleteRequest, db: Session = Depends(get_db)):
    # Verify token
    verification = db.query(VerificationToken).filter(
        VerificationToken.token == request.token,
        VerificationToken.used == False,
        VerificationToken.expires_at > datetime.utcnow()
    ).first()
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    # Check email not already registered
    existing_user = db.query(User).filter(User.email == verification.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    password_hash = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode()
    
    # Create user
    user = User(
        id=str(uuid.uuid4()),
        email=verification.email,
        name=request.name,
        first_name=request.first_name,
        last_name=request.last_name,
        password=password_hash,
        description=request.description,
        website=request.website if request.website else None,
        subscription_plan='free',
        email_verified=True
    )
    db.add(user)
    
    # Mark token as used
    verification.used = True
    
    db.commit()
    
    # Optional: Send welcome email
    send_welcome_email(user.email, user.name)
    
    return {
        "id": user.id,
        "email": user.email,
        "message": "Registration completed successfully"
    }
```

---

## Example Implementation (Node.js/Express)

```javascript
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const router = express.Router();

// POST /api/auth/register/initiate
router.post('/api/auth/register/initiate', async (req, res) => {
  const { email } = req.body;
  
  // Check if email exists
  const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  
  // Generate token
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  // Store token
  await db.query(
    'INSERT INTO verification_tokens (token, email, expires_at) VALUES ($1, $2, $3)',
    [token, email, expiresAt]
  );
  
  // Send email
  const verificationLink = `https://yourdomain.com/complete-registration?token=${token}`;
  await sendVerificationEmail(email, verificationLink);
  
  res.json({
    message: 'Verification email sent successfully',
    email: email
  });
});

// GET /api/auth/register/verify
router.get('/api/auth/register/verify', async (req, res) => {
  const { token } = req.query;
  
  const result = await db.query(
    `SELECT * FROM verification_tokens 
     WHERE token = $1 AND used = false AND expires_at > NOW()`,
    [token]
  );
  
  if (result.rows.length === 0) {
    return res.status(400).json({
      valid: false,
      error: 'Invalid or expired token'
    });
  }
  
  res.json({
    valid: true,
    email: result.rows[0].email
  });
});

// POST /api/auth/register/complete
router.post('/api/auth/register/complete', async (req, res) => {
  const { token, name, first_name, last_name, password, description, website } = req.body;
  
  // Verify token
  const verification = await db.query(
    `SELECT * FROM verification_tokens 
     WHERE token = $1 AND used = false AND expires_at > NOW()`,
    [token]
  );
  
  if (verification.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
  
  const email = verification.rows[0].email;
  
  // Check email not already registered
  const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  
  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Create user
  const userId = uuidv4();
  await db.query(
    `INSERT INTO users (id, email, name, first_name, last_name, password, description, website, subscription_plan, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [userId, email, name, first_name, last_name, passwordHash, description, website || null, 'free', true]
  );
  
  // Mark token as used
  await db.query('UPDATE verification_tokens SET used = true WHERE token = $1', [token]);
  
  // Optional: Send welcome email
  await sendWelcomeEmail(email, name);
  
  res.json({
    id: userId,
    email: email,
    message: 'Registration completed successfully'
  });
});

module.exports = router;
```

---

## Testing with cURL

```bash
# 1. Initiate registration
curl -X POST http://localhost:8000/api/auth/register/initiate \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Expected: {"message": "Verification email sent successfully", "email": "test@example.com"}

# 2. Verify token (use token from email or database)
curl -X GET "http://localhost:8000/api/auth/register/verify?token=YOUR_TOKEN_HERE"

# Expected: {"valid": true, "email": "test@example.com"}

# 3. Complete registration
curl -X POST http://localhost:8000/api/auth/register/complete \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN_HERE",
    "name": "Test User",
    "first_name": "Test",
    "last_name": "User",
    "password": "password123",
    "description": "Test description",
    "website": "https://test.com"
  }'

# Expected: {"id": "uuid-here", "email": "test@example.com", "message": "Registration completed successfully"}
```

---

## Email Template Variables

When implementing the email sending, use these variables:

- `{{VERIFICATION_LINK}}` - The complete verification URL
- `{{EMAIL}}` - User's email address
- `{{EXPIRY_TIME}}` - When the token expires (e.g., "24 hours")

---

## Security Notes

1. **Rate Limiting:** Implement rate limiting (e.g., max 3 emails per hour per IP)
2. **Token Security:** Use UUID v4 or cryptographically secure random strings
3. **Password Hashing:** Always use bcrypt with salt rounds >= 10 or argon2
4. **Token Cleanup:** Periodically delete expired tokens from database
5. **Email Validation:** Validate email format on backend, not just frontend
6. **CORS:** Ensure CORS is configured to allow requests from your frontend domain

---

## Cleanup Task (Optional)

Add a scheduled job to clean up expired tokens:

```sql
-- Run daily
DELETE FROM verification_tokens 
WHERE expires_at < NOW() - INTERVAL '7 days';
```

Or in your application:

```python
# Run this daily via cron or scheduler
async def cleanup_expired_tokens():
    cutoff = datetime.utcnow() - timedelta(days=7)
    db.query(VerificationToken).filter(
        VerificationToken.expires_at < cutoff
    ).delete()
    db.commit()
```

