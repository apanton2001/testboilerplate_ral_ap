# Auth Integration Demo

This project demonstrates the integration of different authentication methods in a Next.js application.

## Authentication Methods Implemented

1. **Auth0 Authentication** - Modern OAuth 2.0 based authentication
2. **HTTP Digest Authentication** - As specified in RFC 2617

## Live Demo

Visit the live demo at [https://testboilerplate-ral-ap.vercel.app/auth-demo](https://testboilerplate-ral-ap.vercel.app/auth-demo)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/apanton2001/testboilerplate_ral_ap.git
   cd testboilerplate_ral_ap
   ```

2. Install dependencies
   ```
   npm install
   # or
   yarn
   ```

3. Create a `.env.local` file in the root directory with your Auth0 credentials:
   ```
   AUTH0_SECRET='use [openssl rand -hex 32] to generate a 32 bytes value'
   APP_BASE_URL='http://localhost:3000'
   AUTH0_DOMAIN='dev-1rjlhi708y5n67vx.us.auth0.com'
   AUTH0_CLIENT_ID='your-auth0-client-id'
   AUTH0_CLIENT_SECRET='your-auth0-client-secret'
   ```

4. Run the development server
   ```
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000/auth-demo](http://localhost:3000/auth-demo) in your browser

## Auth0 Setup

1. Create an Auth0 account at [auth0.com](https://auth0.com)
2. Set up a new application (Regular Web Application)
3. Configure the following URLs in your Auth0 application settings:
   - Allowed Callback URLs: `http://localhost:3000/api/auth/callback, https://your-deployment-url.vercel.app/api/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000, https://your-deployment-url.vercel.app`

## HTTP Digest Authentication

The implementation follows RFC 2617 and provides a challenge-response mechanism that avoids sending passwords in cleartext.

### Test Users

- Username: `admin` / Password: `adminPassword` (admin role)
- Username: `user` / Password: `userPassword` (user role)

## Deployment

This application is ready to deploy on Vercel:

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and create a new project
3. Import your GitHub repository
4. Add environment variables in the Vercel dashboard
5. Deploy

## Key Files

- `src/app/lib/digestAuth.ts` - Digest Authentication implementation
- `src/app/api/digest-auth/route.ts` - API route for Digest Auth
- `src/app/lib/auth0.ts` - Auth0 configuration
- `app/auth-demo/page.tsx` - Demo page comparing both auth methods
