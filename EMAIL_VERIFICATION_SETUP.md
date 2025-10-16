# Email Verification Signup - Setup Guide

## 🎯 What Changed

The signup flow has been completely redesigned to use **email verification** for better security and user validation.

### Old Flow (1 Step)
1. User fills form with name, email, password → Account created

### New Flow (2 Steps)
1. User enters email → Verification email sent
2. User clicks link → Completes registration with name & password → Account created

---

## 📁 Files Modified/Created

### Frontend Pages
- ✅ `app/signup/page.tsx` - Email entry form (MODIFIED)
- ✅ `app/complete-registration/page.tsx` - Complete registration form (NEW)

### API Routes
- ✅ `app/api/auth/register/initiate/route.ts` - Send verification email (NEW)
- ✅ `app/api/auth/register/verify/route.ts` - Verify token (NEW)
- ✅ `app/api/auth/register/complete/route.ts` - Complete registration (NEW)

### Auth Services
- ✅ `lib/auth.ts` - Added new methods (MODIFIED)
- ✅ `lib/auth-context.tsx` - Exported new methods (MODIFIED)

### Documentation
- ✅ `SIGNUP_FLOW.md` - Complete flow documentation (NEW)
- ✅ `ORACLE_ENGINE_ENDPOINTS.md` - Backend API reference (NEW)
- ✅ `EMAIL_VERIFICATION_SETUP.md` - This file (NEW)

---

## 🚀 Quick Start

### 1. Frontend (Already Done ✅)

The frontend is ready to use! No additional setup needed.

### 2. Backend (Oracle Engine) - TODO

The Oracle Engine backend needs to implement 3 new endpoints:

#### Required Endpoints:

1. **POST `/api/auth/register/initiate`**
   - Receives email
   - Generates verification token
   - Sends verification email
   - Returns success message

2. **GET `/api/auth/register/verify?token=xxx`**
   - Verifies token is valid and not expired
   - Returns email address if valid

3. **POST `/api/auth/register/complete`**
   - Receives token + user details
   - Creates user account
   - Marks token as used
   - Returns user ID

**📖 See `ORACLE_ENGINE_ENDPOINTS.md` for detailed implementation guide with code examples.**

### 3. Database Updates

Add verification tokens table to your database:

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

Also ensure users table has these fields:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
```

### 4. Email Service Setup

Configure your email service in Oracle Engine backend:

- SMTP server credentials
- Email templates
- Sender email address
- Rate limiting

### 5. Environment Variables

Update `.env.local`:

```env
# Backend URL (already configured)
PROXY_UPSTREAM_URL=http://localhost:8000

# Optional: Custom endpoint paths
NEXT_PUBLIC_AUTH_INITIATE_REGISTER_PATH=/api/auth/register/initiate
NEXT_PUBLIC_AUTH_VERIFY_REGISTER_PATH=/api/auth/register/verify
NEXT_PUBLIC_AUTH_COMPLETE_REGISTER_PATH=/api/auth/register/complete
```

---

## 🧪 Testing Checklist

### Frontend Testing (Can do now)

- [ ] Visit `/signup`
- [ ] Enter email and submit
- [ ] See success message
- [ ] Check browser console for API calls

### Backend Testing (After implementation)

- [ ] Email is sent with verification link
- [ ] Clicking link opens `/complete-registration?token=xxx`
- [ ] Token is verified successfully
- [ ] Complete registration form shows
- [ ] Submitting form creates user
- [ ] Auto-login works
- [ ] Redirect to dashboard happens

### Edge Cases

- [ ] Expired token shows error
- [ ] Invalid token shows error
- [ ] Already registered email shows error
- [ ] Weak password shows error
- [ ] Passwords don't match shows error

---

## 📧 Email Template

The verification email should include:

- **Subject:** "Verify your email for IFA Labs"
- **Button/Link:** Links to `https://yourdomain.com/complete-registration?token=TOKEN`
- **Expiration:** Mentions 24-hour expiration
- **Branding:** Company logo and colors
- **Footer:** Company info and unsubscribe (if required)

**📖 See `SIGNUP_FLOW.md` for HTML email template.**

---

## 🔒 Security Features

✅ Email verification prevents fake signups
✅ Tokens expire after 24 hours
✅ Tokens are single-use only
✅ Passwords are hashed before storage
✅ Minimum password length enforced
✅ Rate limiting on email sending (backend)
✅ Email format validation

---

## 🐛 Troubleshooting

### Issue: Email not received
**Solution:** 
- Check backend email service logs
- Verify SMTP credentials
- Check spam folder
- Verify email address is valid

### Issue: Token expired
**Solution:**
- User must request new verification email
- Go back to `/signup` and re-enter email

### Issue: Auto-login fails after registration
**Solution:**
- Check if user was created in database
- Verify login endpoint is working
- Check browser console for errors

### Issue: Complete registration page shows error
**Solution:**
- Verify token parameter is in URL
- Check backend token verification endpoint
- Ensure token exists in database

---

## 📊 Flow Diagram

```
┌─────────────────┐
│   User visits   │
│    /signup      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Enters email   │
│   and submits   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  POST /api/auth/register/   │
│         initiate            │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Backend generates token    │
│  and sends email            │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  User sees success message  │
└─────────────────────────────┘

         [User clicks link in email]

┌─────────────────────────────┐
│  User lands on              │
│  /complete-registration     │
│  ?token=xxx                 │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  GET /api/auth/register/    │
│         verify              │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Token valid?               │
│  ├─ Yes: Show form          │
│  └─ No: Show error          │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  User fills form with:      │
│  - First Name               │
│  - Last Name                │
│  - Password                 │
│  - Bio (optional)           │
│  - Website (optional)       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  POST /api/auth/register/   │
│         complete            │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Backend creates user       │
│  and marks token as used    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Auto-login user            │
│  and redirect to dashboard  │
└─────────────────────────────┘
```

---

## 🎬 Next Steps

1. **For Backend Developers:**
   - Read `ORACLE_ENGINE_ENDPOINTS.md`
   - Implement the 3 required endpoints
   - Set up email service
   - Create database table
   - Test with provided cURL commands

2. **For Frontend Developers:**
   - Review new pages if needed
   - Customize email verification UI
   - Add additional validation if needed
   - Test the complete flow

3. **For DevOps:**
   - Configure email service (SMTP)
   - Set up environment variables
   - Configure rate limiting
   - Set up monitoring for email delivery

---

## 📚 Additional Resources

- `SIGNUP_FLOW.md` - Detailed flow documentation
- `ORACLE_ENGINE_ENDPOINTS.md` - Backend implementation guide
- Frontend code in `app/signup/` and `app/complete-registration/`
- API routes in `app/api/auth/register/`

---

## ✅ Completion Checklist

### Frontend
- [x] Email entry page created
- [x] Complete registration page created
- [x] API route handlers created
- [x] Auth service methods added
- [x] Error handling implemented
- [x] Auto-login after registration

### Backend (Oracle Engine)
- [ ] POST /api/auth/register/initiate endpoint
- [ ] GET /api/auth/register/verify endpoint
- [ ] POST /api/auth/register/complete endpoint
- [ ] Database table created
- [ ] Email service configured
- [ ] Email template created
- [ ] Rate limiting implemented

### Testing
- [ ] Email sending works
- [ ] Token verification works
- [ ] User creation works
- [ ] Auto-login works
- [ ] Error cases handled
- [ ] Edge cases tested

---

## 🤝 Support

If you have questions or encounter issues:

1. Check the troubleshooting section above
2. Review the detailed documentation in `SIGNUP_FLOW.md`
3. Check backend implementation guide in `ORACLE_ENGINE_ENDPOINTS.md`
4. Review the code in the mentioned files
5. Contact the development team

---

**Last Updated:** $(date)
**Status:** ✅ Frontend Complete | ⏳ Backend Pending

