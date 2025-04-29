import { auth0 } from '../../../lib/auth0';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    return await auth0.callback({
      redirectUri: `${new URL(request.url).origin}/auth/callback`
    });
  } catch (error) {
    console.error('Auth0 callback error:', error);
    return Response.redirect(
      `${new URL(request.url).origin}?error=authentication_error`
    );
  }
}