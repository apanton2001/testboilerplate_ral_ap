import { auth0 } from '../../../lib/auth0';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth0.getSession();
    
    if (!session) {
      return NextResponse.json({ 
        isAuthenticated: false 
      });
    }
    
    return NextResponse.json({ 
      isAuthenticated: true,
      user: session.user 
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve user profile' },
      { status: 500 }
    );
  }
}