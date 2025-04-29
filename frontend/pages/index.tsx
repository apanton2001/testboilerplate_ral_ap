import type { NextPage } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import Navbar from '../components/Navbar';

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Automated Customs Documentation Platform</title>
        <meta name="description" content="Generate accurate customs documentation" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          Automated Customs Documentation Platform
        </h1>
        
        <div className="bg-white shadow-md rounded-lg p-6 max-w-4xl mx-auto">
          <p className="text-lg text-gray-700 mb-4">
            Welcome to the Automated Customs Documentation Platform. This system helps importers generate
            accurate customs documentation efficiently.
          </p>
          
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-3">Key Features:</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Automated HS code classification</li>
              <li>Invoice data management</li>
              <li>Customs document generation</li>
              <li>Integration with ASYCUDA and other systems</li>
              <li>Secure and compliant data handling</li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-gray-500">
          &copy; {new Date().getFullYear()} Automated Customs Documentation Platform
        </div>
      </footer>
    </div>
  );
};

export default Home;