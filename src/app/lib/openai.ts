import OpenAI from 'openai';

// Initialize the OpenAI client with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to generate text using OpenAI API
export async function generateText(prompt: string, model: string = 'gpt-4.1') {
  try {
    const response = await openai.responses.create({
      model,
      input: prompt,
    });
    
    return {
      text: response.output_text,
      success: true,
    };
  } catch (error) {
    console.error('Error generating text with OpenAI:', error);
    return {
      text: '',
      success: false,
      error,
    };
  }
}

// Function to generate an embedding for text
export async function generateEmbedding(text: string) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    
    return {
      embedding: response.data[0].embedding,
      success: true,
    };
  } catch (error) {
    console.error('Error generating embedding with OpenAI:', error);
    return {
      embedding: [],
      success: false,
      error,
    };
  }
}

export default openai;