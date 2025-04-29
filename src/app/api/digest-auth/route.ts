import { NextRequest, NextResponse } from 'next/server';
import { 
  parseDigestAuth, 
  generateNonce, 
  generateAuthenticateHeader, 
  verifyDigestAuth,
  findUser
} from '../../lib/digestAuth';

// The realm identifies the protection space
const REALM = 'testrealm@testboilerplate.app';

export async function GET(request: NextRequest) {
  // Extract the Authorization header
  const authHeader = request.headers.get('authorization');
  
  // If no Authorization header is present, send a challenge
  if (!authHeader) {
    const nonce = generateNonce();
    const headers = {
      'WWW-Authenticate': generateAuthenticateHeader(REALM, nonce),
      'Content-Type': 'text/plain'
    };
    
    return new NextResponse('Authentication required', {
      status: 401,
      headers
    });
  }
  
  // Parse the digest authentication credentials
  const credentials = parseDigestAuth(authHeader);
  
  // If credentials couldn't be parsed, send a challenge
  if (!credentials) {
    const nonce = generateNonce();
    const headers = {
      'WWW-Authenticate': generateAuthenticateHeader(REALM, nonce),
      'Content-Type': 'text/plain'
    };
    
    return new NextResponse('Invalid authentication credentials', {
      status: 401,
      headers
    });
  }
  
  // Find the user
  const user = findUser(credentials.username);
  
  // If user doesn't exist, send a challenge
  if (!user) {
    const nonce = generateNonce();
    const headers = {
      'WWW-Authenticate': generateAuthenticateHeader(REALM, nonce),
      'Content-Type': 'text/plain'
    };
    
    return new NextResponse('Invalid username or password', {
      status: 401,
      headers
    });
  }
  
  // Verify the credentials against the password
  const isValid = verifyDigestAuth('GET', credentials, user.password);
  
  // If verification fails, send a challenge
  if (!isValid) {
    const nonce = generateNonce();
    const headers = {
      'WWW-Authenticate': generateAuthenticateHeader(REALM, nonce),
      'Content-Type': 'text/plain'
    };
    
    return new NextResponse('Invalid username or password', {
      status: 401,
      headers
    });
  }
  
  // Authentication successful
  return NextResponse.json({
    authenticated: true,
    username: user.username,
    message: 'Authentication successful using Digest Authentication',
    roles: user.roles
  });
}

export async function POST(request: NextRequest) {
  // Similar to GET but for POST requests
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    const nonce = generateNonce();
    const headers = {
      'WWW-Authenticate': generateAuthenticateHeader(REALM, nonce),
      'Content-Type': 'text/plain'
    };
    
    return new NextResponse('Authentication required', {
      status: 401,
      headers
    });
  }
  
  const credentials = parseDigestAuth(authHeader);
  
  if (!credentials) {
    const nonce = generateNonce();
    const headers = {
      'WWW-Authenticate': generateAuthenticateHeader(REALM, nonce),
      'Content-Type': 'text/plain'
    };
    
    return new NextResponse('Invalid authentication credentials', {
      status: 401,
      headers
    });
  }
  
  const user = findUser(credentials.username);
  
  if (!user) {
    const nonce = generateNonce();
    const headers = {
      'WWW-Authenticate': generateAuthenticateHeader(REALM, nonce),
      'Content-Type': 'text/plain'
    };
    
    return new NextResponse('Invalid username or password', {
      status: 401,
      headers
    });
  }
  
  // For POST requests, use 'POST' as the method in digest verification
  const isValid = verifyDigestAuth('POST', credentials, user.password);
  
  if (!isValid) {
    const nonce = generateNonce();
    const headers = {
      'WWW-Authenticate': generateAuthenticateHeader(REALM, nonce),
      'Content-Type': 'text/plain'
    };
    
    return new NextResponse('Invalid username or password', {
      status: 401,
      headers
    });
  }
  
  try {
    // Parse the request body
    const body = await request.json();
    
    return NextResponse.json({
      authenticated: true,
      username: user.username,
      message: 'Successfully processed authenticated request',
      receivedData: body,
      roles: user.roles
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: true,
      username: user.username,
      message: 'Authentication successful, but error processing request body',
      error: 'Invalid JSON'
    }, { status: 400 });
  }
}