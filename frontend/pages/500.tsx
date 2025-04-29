import Link from 'next/link';
import React from 'react';

// Basic styling - consider using Tailwind or a UI library consistent with the project
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
    textAlign: 'center',
    padding: '20px',
    fontFamily: 'sans-serif',
  },
  title: {
    fontSize: '3rem',
    fontWeight: 'bold',
    color: '#DC2626', // Red color for error
    marginBottom: '1rem',
  },
  message: {
    fontSize: '1.2rem',
    color: '#4B5563', // Gray color
    marginBottom: '2rem',
  },
  link: {
    color: '#3B82F6', // Blue color for link
    textDecoration: 'underline',
    cursor: 'pointer',
  },
};

export default function Custom500() {
  // Note: The ErrorBoundary in _app.tsx will catch most client-side errors.
  // This page handles errors that occur during server-side rendering (SSR) or
  // static generation (SSG) before the client-side app hydrates.
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>500 - Server Error</h1>
      <p style={styles.message}>
        We encountered an internal server error. Please try again later or contact support if the problem persists.
      </p>
      <Link href="/" style={styles.link}>
        Go back to the Dashboard
      </Link>
    </div>
  );
}