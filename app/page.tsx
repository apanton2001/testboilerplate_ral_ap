"use client";

import { useUser } from "@auth0/nextjs-auth0";
import { useState } from "react";

export default function HomePage() {
  // Extract the user object and loading state from Auth0
  const { user, isLoading } = useUser();
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Function to handle OpenAI text generation
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const result = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await result.json();
      if (data.success) {
        setResponse(data.text);
      } else {
        setResponse("Error generating response. Please try again.");
      }
    } catch (error) {
      console.error('Error calling API:', error);
      setResponse("An error occurred while generating the response.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-xl">Loading...</div>
    </div>
  );

  // If no user, show sign-up and login buttons
  if (!user) {
    return (
      <main className="flex flex-col items-center justify-center h-screen p-10">
        <h1 className="text-3xl font-bold mb-8">Welcome to Our Application</h1>
        <div className="space-y-4">
          <div>
            <a 
              href="/auth/login?screen_hint=signup"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-4"
            >
              Sign up
            </a>
            <a 
              href="/auth/login"
              className="inline-block px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Log in
            </a>
          </div>
        </div>
      </main>
    );
  }

  // If user exists, show the application with OpenAI integration
  return (
    <main className="flex flex-col items-center p-10 min-h-screen">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Welcome, {user.name}!</h1>
          <a 
            href="/auth/logout"
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Log out
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">OpenAI Text Generation</h2>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Enter your prompt:</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt for OpenAI to generate text..."
            />
          </div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate Response"}
          </button>
        </div>

        {response && (
          <div className="bg-gray-100 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Generated Response:</h2>
            <div className="bg-white p-4 rounded border border-gray-300 whitespace-pre-wrap">
              {response}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}