import { NextRequest, NextResponse } from 'next/server';

// Mock user profiles storage (in a real app, this would be a database)
const userProfiles = new Map<string, any>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Check if profile exists
    const profile = userProfiles.get(userId);
    if (!profile) {
      // Return a default profile for new users
      const defaultProfile = {
        id: userId,
        name: 'User',
        first_name: '',
        last_name: '',
        email: '',
        description: '',
        website: '',
        logo_url: '',
        subscription_plan: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Store the default profile
      userProfiles.set(userId, defaultProfile);
      
      return NextResponse.json({
        data: defaultProfile,
        message: 'Profile created with default values'
      });
    }

    return NextResponse.json({
      data: profile,
      message: 'Profile retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const updateData = await request.json();
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Get existing profile or create new one
    const existingProfile = userProfiles.get(userId) || {
      id: userId,
      name: 'User',
      first_name: '',
      last_name: '',
      email: '',
      description: '',
      website: '',
      logo_url: '',
      subscription_plan: 'free',
      created_at: new Date().toISOString(),
    };

    // Update profile with new data
    const updatedProfile = {
      ...existingProfile,
      ...updateData,
      id: userId, // Ensure ID doesn't change
      updated_at: new Date().toISOString(),
    };

    // Store updated profile
    userProfiles.set(userId, updatedProfile);

    console.log('Profile updated successfully:', {
      userId,
      subscription_plan: updatedProfile.subscription_plan,
      name: updatedProfile.name
    });

    return NextResponse.json({
      data: updatedProfile,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const updateData = await request.json();
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Get existing profile or create new one
    const existingProfile = userProfiles.get(userId) || {
      id: userId,
      name: 'User',
      first_name: '',
      last_name: '',
      email: '',
      description: '',
      website: '',
      logo_url: '',
      subscription_plan: 'free',
      created_at: new Date().toISOString(),
    };

    // Update only the provided fields
    const updatedProfile = {
      ...existingProfile,
      ...updateData,
      id: userId, // Ensure ID doesn't change
      updated_at: new Date().toISOString(),
    };

    // Store updated profile
    userProfiles.set(userId, updatedProfile);

    console.log('Profile patched successfully:', {
      userId,
      subscription_plan: updatedProfile.subscription_plan,
      updatedFields: Object.keys(updateData)
    });

    return NextResponse.json({
      data: updatedProfile,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error patching profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Check if profile exists
    const profile = userProfiles.get(userId);
    
    // Delete the profile (even if it doesn't exist, we return success)
    userProfiles.delete(userId);

    console.log('Profile deleted successfully:', {
      userId,
      existed: !!profile
    });

    return NextResponse.json({
      data: { id: userId },
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500 }
    );
  }
}