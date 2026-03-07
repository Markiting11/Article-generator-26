
import { ArticleData, InputFormData } from '../types';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
    console.error("CRITICAL ERROR: VITE_OPENROUTER_API_KEY is not defined. Please set it in your environment variables and RE-DEPLOY.");
}

/**
 * A wrapper function to handle API rate limiting with exponential backoff.
 */
const withRetry = async <T>(apiCall: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error as Error;
      const isQuotaError = error instanceof Error && (error.message.includes('429') || error.message.includes('quota'));
      
      if (isQuotaError) {
        if (attempt === maxRetries) break;
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error(`API call failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
};

export const generateImage = async (keywords: string): Promise<string> => {
  const prompt = `Create a high-quality, professional, and visually appealing hero image for a blog article, highly relevant to these topics: ${keywords}. The image should be metaphorical or conceptual, avoiding generic stock photos. The aspect ratio must be 16:9.`;
  
  try {
    const response = await withRetry(async () => {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "SEO Article Generator",
        },
        body: JSON.stringify({
          model: "openai/dall-e-3", // Using DALL-E 3 via OpenRouter for images
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Failed to generate image");
      }

      return await res.json();
    });

    // DALL-E 3 on OpenRouter might return a URL or base64 depending on the provider
    // Usually it's a URL in the content or a specific field
    const content = response.choices?.[0]?.message?.content;
    const imageUrlMatch = content?.match(/https?:\/\/[^\s)]+/);
    
    if (imageUrlMatch) {
      return imageUrlMatch[0];
    }
    
    // Fallback: Check if it returned an image in the response structure (OpenAI style)
    if (response.data?.[0]?.url) {
        return response.data[0].url;
    }

    throw new Error("No image URL found in response.");
  } catch (error) {
    console.error("Error generating image:", error);
    // Return a placeholder if image generation fails to not break the app
    return `https://picsum.photos/seed/${encodeURIComponent(keywords)}/1200/630`;
  }
};

const generatePrompt = (data: InputFormData): string => {
  const { url, keywords, wordLimit } = data;
  return `
    Act as an expert SEO content writer and professional web content formatter. Your task is to generate a unique, SEO-optimized title and a detailed article based on the content of a given URL and specific keywords.

    URL: ${url}
    Keywords: ${keywords}
    Word Limit: Approximately ${wordLimit} words.

    Follow these strict instructions for the output:
    1.  Thoroughly analyze the content of the provided URL. Your primary goal is to understand its core message, tone, and key arguments. Extract the most important points, data, and concepts from this URL to form the basis of the new article.
    2.  The generated article must be a unique piece of content, but it should be heavily inspired by and reference the key information found at the provided URL.
    3.  Generate a compelling, unique, and SEO-optimized title. Avoid generic titles. Use creative structures like questions, listicles, or benefit-driven hooks. The title must be plain text only.
    4.  Write a detailed, well-structured, and engaging article. Naturally integrate the provided keywords.
    5.  Format the entire article using clean, standard HTML tags (<p>, <h2>, <h3>, <ul>, <ol>, <li>).
    6.  Keyword Bolding: Wrap every instance of the provided keywords ('${keywords}') with <strong> tags in the ARTICLE BODY ONLY.
    7.  Embed the provided URL as a clickable HTML anchor tag within the article text, using one of the most relevant keywords as the anchor text.
    8.  Ensure there is a well-defined "Conclusion" section at the end of the article, formatted under an <h2> heading.
    9.  The article content must be approximately ${wordLimit} words.
    10. Do NOT include any <html>, <head>, <body>, or <style> tags. Only provide the content for the title and article.

    Your final output MUST be structured EXACTLY as follows:

    ---TITLE_START---
    [Your Generated Title]
    ---TITLE_END---
    ---ARTICLE_START---
    [Your Generated Article in well-formatted HTML]
    ---ARTICLE_END---
  `;
};

const parseResponse = (responseText: string): ArticleData => {
  try {
    const title = responseText.split('---TITLE_START---')[1].split('---TITLE_END---')[0].trim();
    const article = responseText.split('---ARTICLE_START---')[1].split('---ARTICLE_END---')[0].trim();
    
    if (!title || !article) {
        throw new Error("Could not parse title or article from response.");
    }

    return { title, article };
  } catch (e) {
    console.error("Failed to parse LLM response:", e);
    return {
        title: "Generated Content (Parsing Failed)",
        article: `<p>The AI response was not in the expected format. Here is the raw output:</p><pre><code>${responseText}</code></pre>`
    }
  }
};

export const generateArticleContent = async (data: InputFormData): Promise<ArticleData> => {
  const prompt = generatePrompt(data);
  try {
    const response = await withRetry(async () => {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "SEO Article Generator",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001", // Using Gemini 2.0 Flash via OpenRouter
          messages: [
            {
              role: "system",
              content: "You are an expert SEO content writer. You analyze URLs and create optimized articles."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Failed to generate content");
      }

      return await res.json();
    });
    
    const responseText = response.choices?.[0]?.message?.content;
    if (!responseText) {
      throw new Error("Received an empty response from the API.");
    }
    
    return parseResponse(responseText);
  } catch (error) {
    console.error("Error generating content:", error);
    if (error instanceof Error) {
        throw new Error(`An error occurred while generating content: ${error.message}`);
    }
    throw new Error("An unknown error occurred.");
  }
};
