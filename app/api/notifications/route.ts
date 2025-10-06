import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter(EMAIL_CONFIG)
}

// Validate email configuration
const validateEmailConfig = () => {
  const required = ['SMTP_USER', 'SMTP_PASS']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Send email notification
const sendEmailNotification = async (data: any) => {
  try {
    validateEmailConfig()
    
    const transporter = createTransporter()
    
    // Extract email details from request data
    const {
      to = process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER,
      subject = 'Webhook Notification',
      message = 'A webhook notification was received',
      from = process.env.SMTP_USER,
      ...additionalData
    } = data

    // Create email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          Webhook Notification
        </h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Notification Details</h3>
          <p style="margin: 10px 0;"><strong>Message:</strong> ${message}</p>
          <p style="margin: 10px 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p style="margin: 10px 0;"><strong>Source:</strong> Webhook API</p>
        </div>

        ${Object.keys(additionalData).length > 0 ? `
          <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #495057; margin-top: 0;">Additional Data</h4>
            <pre style="background-color: #fff; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 12px;">${JSON.stringify(additionalData, null, 2)}</pre>
          </div>
        ` : ''}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px;">
          <p>This notification was sent from your webhook endpoint.</p>
          <p>Endpoint: ${process.env.NEXT_PUBLIC_APP_URL || 'https://site-domain-name'}/api/notifications</p>
        </div>
      </div>
    `

    const textContent = `
Webhook Notification

Message: ${message}
Timestamp: ${new Date().toISOString()}
Source: Webhook API

${Object.keys(additionalData).length > 0 ? `
Additional Data:
${JSON.stringify(additionalData, null, 2)}
` : ''}

This notification was sent from your webhook endpoint.
Endpoint: ${process.env.NEXT_PUBLIC_APP_URL || 'https://site-domain-name'}/api/notifications
    `

    // Send email
    const info = await transporter.sendMail({
      from: `"Webhook Notifications" <${from}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: textContent,
      html: htmlContent,
    })

    console.log('Email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
    
  } catch (error) {
    console.error('Failed to send email notification:', error)
    throw error
  }
}

// Handle POST requests
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}))
    
    // Get additional data from query parameters
    const url = new URL(request.url)
    const queryData = Object.fromEntries(url.searchParams.entries())
    
    // Merge body and query data
    const notificationData = { ...body, ...queryData }
    
    console.log('Webhook notification received:', notificationData)
    
    // Send email notification
    const result = await sendEmailNotification(notificationData)
    
    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      messageId: result.messageId,
      timestamp: new Date().toISOString(),
      data: notificationData
    }, { status: 200 })
    
  } catch (error) {
    console.error('Webhook notification error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Handle GET requests (for testing)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const testMode = url.searchParams.get('test') === 'true'
    
    if (testMode) {
      // Send test notification
      const result = await sendEmailNotification({
        to: process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER,
        subject: 'Test Webhook Notification',
        message: 'This is a test notification from your webhook endpoint.',
        testData: {
          timestamp: new Date().toISOString(),
          endpoint: '/api/notifications',
          method: 'GET'
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully',
        messageId: result.messageId,
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Webhook endpoint is active',
      endpoint: '/api/notifications',
      methods: ['GET', 'POST'],
      timestamp: new Date().toISOString(),
      usage: {
        post: 'Send POST request with notification data',
        get: 'Send GET request with ?test=true to send test notification'
      }
    })
    
  } catch (error) {
    console.error('Webhook GET error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Handle other methods
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
