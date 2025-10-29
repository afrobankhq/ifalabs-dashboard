import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP)' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Check if Cloudinary is configured
    if (!cloudinary.config().cloud_name || !cloudinary.config().api_key || !cloudinary.config().api_secret) {
      return NextResponse.json(
        { error: 'Cloudinary not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert buffer to base64 data URI
    const base64String = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64String}`;

    // Generate a unique public_id based on timestamp and original filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const publicId = `company-logos/${timestamp}_${sanitizedName.split('.')[0]}`;

    // Upload to Cloudinary using SDK
    const uploadResult = await cloudinary.uploader.upload(
      dataURI,
      {
        public_id: publicId,
        folder: 'company-logos',
        resource_type: 'image',
        overwrite: false,
        transformation: [
          {
            fetch_format: 'auto',
            quality: 'auto',
          },
        ],
      }
    ).catch((error) => {
      console.error('Cloudinary upload error:', error);
      throw new Error(error.message || 'Failed to upload image to Cloudinary');
    });

    // Return the upload result
    return NextResponse.json({
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    });
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
