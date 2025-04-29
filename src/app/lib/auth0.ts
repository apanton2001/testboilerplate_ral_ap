import { initAuth0 } from '@auth0/nextjs-auth0';

export const auth0 = initAuth0({
  baseURL: process.env.APP_BASE_URL || 'http://localhost:3000',
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  clientID: process.env.AUTH0_CLIENT_ID || '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  secret: process.env.AUTH0_SECRET || '',
  authorizationParams: {
    scope: 'openid profile email',
  },
  routes: {
    callback: '/auth/callback',
    login: '/auth/login',
    logout: '/auth/logout',
  },
});

export default auth0;