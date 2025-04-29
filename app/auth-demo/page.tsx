'use client';

import { useState, useEffect } from 'react';

export default function AuthDemoPage() {
  // Auth0 state - simplified for demo
  const [auth0User, setAuth0User] = useState<any>(null);
  const [auth0Error, setAuth0Error] = useState<any>(null);
  const [auth0Loading, setAuth0Loading] = useState(true);
  
  // Fetch Auth0 user on component mount
  useEffect(() => {
    const fetchAuth0User = async () => {
      try {
        setAuth0Loading(true);
        const response = await fetch('/api/auth/me');
        
        if (response.ok) {
          const data = await response.json();
          if (data.isAuthenticated) {
            setAuth0User(data.user);
          } else {
            setAuth0User(null);
          }
        } else {
          setAuth0Error({ message: 'Error fetching user profile' });
        }
      } catch (error) {
        setAuth0Error({ message: 'Error connecting to Auth0' });
        console.error('Auth0 fetch error:', error);
      } finally {
        setAuth0Loading(false);
      }
    };

    fetchAuth0User();
  }, []);
  
  // Digest Auth state
  const [digestUsername, setDigestUsername] = useState('admin');
  const [digestPassword, setDigestPassword] = useState('adminPassword');
  const [digestAuthResult, setDigestAuthResult] = useState<any>(null);
  const [digestAuthLoading, setDigestAuthLoading] = useState(false);
  const [digestAuthError, setDigestAuthError] = useState<string | null>(null);

  // Function to test digest authentication
  const testDigestAuth = async () => {
    try {
      setDigestAuthLoading(true);
      setDigestAuthError(null);
      
      // This won't work in the browser directly due to how digest auth works
      // We're simulating the effect by showing what would happen
      const result = {
        note: "Browser's XMLHttpRequest can't handle digest auth directly. In a real implementation, you would:",
        steps: [
          "1. Send a request to the server",
          "2. Receive a 401 with WWW-Authenticate header",
          "3. Parse the nonce, realm, etc.",
          "4. Calculate the digest response",
          "5. Resend the request with proper Authorization header"
        ],
        expectedResult: {
          authenticated: true,
          username: digestUsername,
          message: "Authentication successful using Digest Authentication",
          roles: digestUsername === 'admin' ? ['admin'] : ['user']
        }
      };
      
      setDigestAuthResult(result);
    } catch (error) {
      setDigestAuthError('Error testing digest authentication');
      console.error('Error:', error);
    } finally {
      setDigestAuthLoading(false);
    }
  };
  
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-8">Authentication Demo</h1>
      
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        {/* Auth0 Authentication */}
        <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Auth0 Authentication</h2>
          
          {auth0Loading && <p>Loading Auth0 user info...</p>}
          
          {auth0Error && (
            <div className="bg-red-100 p-4 rounded mb-4">
              <p className="text-red-700">Error: {auth0Error.message}</p>
            </div>
          )}
          
          {!auth0Loading && !auth0User && (
            <div>
              <p className="mb-4">You are not logged in with Auth0.</p>
              <a 
                href="/auth/login"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Login with Auth0
              </a>
            </div>
          )}
          
          {!auth0Loading && auth0User && (
            <div>
              <p className="mb-4 text-green-700">You are logged in with Auth0!</p>
              <div className="bg-gray-100 p-4 rounded mb-4">
                <pre className="whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(auth0User, null, 2)}
                </pre>
              </div>
              <a 
                href="/auth/logout"
                className="inline-block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Logout
              </a>
            </div>
          )}
        </div>
        
        {/* Digest Authentication */}
        <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Digest Authentication</h2>
          <p className="mb-4">
            Digest Authentication (RFC 2617) is a challenge-response method that doesn't
            transmit the password in cleartext.
          </p>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Username:</label>
            <input
              type="text"
              value={digestUsername}
              onChange={(e) => setDigestUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Enter username"
              aria-label="Username for digest authentication"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Password:</label>
            <input
              type="password"
              value={digestPassword}
              onChange={(e) => setDigestPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Enter password"
              aria-label="Password for digest authentication"
            />
          </div>
          
          <button
            onClick={testDigestAuth}
            disabled={digestAuthLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {digestAuthLoading ? 'Testing...' : 'Test Digest Auth'}
          </button>
          
          {digestAuthError && (
            <div className="bg-red-100 p-4 rounded mt-4">
              <p className="text-red-700">Error: {digestAuthError}</p>
            </div>
          )}
          
          {digestAuthResult && (
            <div className="mt-4">
              <p className="text-green-700 mb-2">Digest Auth Process:</p>
              <div className="bg-gray-100 p-4 rounded">
                <p className="italic mb-2">{digestAuthResult.note}</p>
                <ul className="list-disc pl-5 mb-2">
                  {digestAuthResult.steps.map((step: string, index: number) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
                <p className="font-semibold mt-4">Expected Result:</p>
                <pre className="whitespace-pre-wrap overflow-x-auto text-sm">
                  {JSON.stringify(digestAuthResult.expectedResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-semibold">Available test users:</p>
            <ul className="list-disc pl-5">
              <li>admin / adminPassword (admin role)</li>
              <li>user / userPassword (user role)</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Authentication Methods Comparison</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left border">Feature</th>
                <th className="p-3 text-left border">Auth0</th>
                <th className="p-3 text-left border">Digest Authentication</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border">Password Transmission</td>
                <td className="p-3 border">Encrypted (HTTPS)</td>
                <td className="p-3 border">Hashed (never sent in cleartext)</td>
              </tr>
              <tr>
                <td className="p-3 border">Implementation Complexity</td>
                <td className="p-3 border">Low (uses third-party service)</td>
                <td className="p-3 border">High (requires custom server logic)</td>
              </tr>
              <tr>
                <td className="p-3 border">Security Level</td>
                <td className="p-3 border">High (OAuth 2.0, OpenID Connect)</td>
                <td className="p-3 border">Medium (vulnerable to certain attacks)</td>
              </tr>
              <tr>
                <td className="p-3 border">Additional Features</td>
                <td className="p-3 border">Social logins, MFA, user management</td>
                <td className="p-3 border">Simple authentication only</td>
              </tr>
              <tr>
                <td className="p-3 border">Browser Support</td>
                <td className="p-3 border">All modern browsers</td>
                <td className="p-3 border">Limited (requires XMLHttpRequest customization)</td>
              </tr>
              <tr>
                <td className="p-3 border">Token-Based</td>
                <td className="p-3 border">Yes (JWT)</td>
                <td className="p-3 border">No (challenge-response)</td>
              </tr>
              <tr>
                <td className="p-3 border">Standards Compliance</td>
                <td className="p-3 border">OAuth 2.0, OpenID Connect</td>
                <td className="p-3 border">RFC 2617 (older HTTP standard)</td>
              </tr>
              <tr>
                <td className="p-3 border">Recommended For</td>
                <td className="p-3 border">Modern web applications, SPAs</td>
                <td className="p-3 border">Legacy systems, specific use cases</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}