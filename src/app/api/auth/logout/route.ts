import { auth0 } from '../../../lib/auth0';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return auth0.logout({
    returnTo: new URL(request.url).origin
  });
}