import { auth0 } from '../../../lib/auth0';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';
  const screenHint = request.nextUrl.searchParams.get('screen_hint');
  
  return auth0.login({
    returnTo,
    authorizationParams: {
      screen_hint: screenHint || undefined
    }
  });
}