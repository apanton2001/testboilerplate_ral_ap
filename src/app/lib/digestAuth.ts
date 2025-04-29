import crypto from 'crypto';

// Interface for digest auth credentials
export interface DigestCredentials {
  username: string;
  realm: string;
  nonce: string;
  uri: string;
  algorithm: string;
  qop: string;
  nc: string;
  cnonce: string;
  response: string;
  opaque?: string;
}

// Parse the Authorization header to extract digest credentials
export function parseDigestAuth(authHeader: string): DigestCredentials | null {
  if (!authHeader || !authHeader.startsWith('Digest ')) {
    return null;
  }

  const authParams = authHeader.substring(7).split(',');
  const credentials: any = {};

  authParams.forEach(param => {
    const [key, value] = param.trim().split('=', 2);
    if (key && value) {
      // Remove quotes if present
      credentials[key] = value.replace(/^"(.*)"$/, '$1');
    }
  });

  return {
    username: credentials.username,
    realm: credentials.realm,
    nonce: credentials.nonce,
    uri: credentials.uri,
    algorithm: credentials.algorithm || 'MD5',
    qop: credentials.qop,
    nc: credentials.nc,
    cnonce: credentials.cnonce,
    response: credentials.response,
    opaque: credentials.opaque
  } as DigestCredentials;
}

// Generate a nonce for the server challenge
export function generateNonce(): string {
  const timestamp = Date.now();
  const privateKey = process.env.DIGEST_AUTH_SECRET || 'default-secret-key';
  return Buffer.from(`${timestamp}:${privateKey}`).toString('base64');
}

// Generate the WWW-Authenticate header for the challenge
export function generateAuthenticateHeader(
  realm: string,
  nonce: string,
  opaque: string = ''
): string {
  let header = `Digest realm="${realm}", nonce="${nonce}", algorithm=MD5, qop="auth"`;
  
  if (opaque) {
    header += `, opaque="${opaque}"`;
  }
  
  return header;
}

// Calculate the expected response digest based on provided credentials
export function calculateDigestResponse(
  method: string,
  credentials: DigestCredentials,
  password: string
): string {
  // Calculate HA1 = MD5(username:realm:password)
  const ha1 = crypto
    .createHash('md5')
    .update(`${credentials.username}:${credentials.realm}:${password}`)
    .digest('hex');

  // Calculate HA2 = MD5(method:digestURI)
  const ha2 = crypto
    .createHash('md5')
    .update(`${method}:${credentials.uri}`)
    .digest('hex');

  // Calculate response based on qop
  let response;
  if (credentials.qop === 'auth') {
    response = crypto
      .createHash('md5')
      .update(
        `${ha1}:${credentials.nonce}:${credentials.nc}:${credentials.cnonce}:${credentials.qop}:${ha2}`
      )
      .digest('hex');
  } else {
    // For compatibility with older clients or when qop is not specified
    response = crypto
      .createHash('md5')
      .update(`${ha1}:${credentials.nonce}:${ha2}`)
      .digest('hex');
  }

  return response;
}

// Verify the auth response against expected values
export function verifyDigestAuth(
  method: string,
  credentials: DigestCredentials,
  password: string
): boolean {
  const expectedResponse = calculateDigestResponse(method, credentials, password);
  return credentials.response === expectedResponse;
}

// Simple user storage (in a real app, you'd use a database)
interface User {
  username: string;
  password: string;
  roles?: string[];
}

const users: User[] = [
  {
    username: 'admin',
    password: 'adminPassword',
    roles: ['admin']
  },
  {
    username: 'user',
    password: 'userPassword',
    roles: ['user']
  }
];

// Helper to find a user by username
export function findUser(username: string): User | undefined {
  return users.find(user => user.username === username);
}