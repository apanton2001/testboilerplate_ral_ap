import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import ErrorBoundary from '../components/ErrorBoundary'; // Import the ErrorBoundary

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  // Optional: Define a simpler fallback UI if needed for the global boundary
  const globalFallback = (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Application Error</h1>
      <p>Sorry, something went wrong. Please refresh the page or contact support.</p>
    </div>
  );

  return (
    <ErrorBoundary fallback={globalFallback}> {/* Wrap the entire app */}
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </ErrorBoundary>
  );
}

export default MyApp;