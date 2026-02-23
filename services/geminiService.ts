
// FIX: Import 'GenerateContentResponse' and 'GenerateImagesResponse' to correctly type API responses.
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ArticleData, InputFormData } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * A wrapper function to handle API rate limiting with exponential backoff.
 * @param apiCall The async function to call.
 * @param maxRetries The maximum number of retries.
 * @returns The result of the API call.
 */
const withRetry = async <T>(apiCall: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error as Error;
      // Check if it's a rate limit error (429)
      if (error instanceof Error && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
        if (attempt === maxRetries) {
          // Don't wait on the last attempt, just let it fail
          break;
        }
        // Exponential backoff with jitter to spread out retries
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.warn(`Rate limit hit. Retrying in ${Math.round(delay / 1000)}s... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Not a retryable error, throw immediately
        throw error;
      }
    }
  }
  throw new Error(`API call failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
};


export const generateImage = async (keywords: string): Promise<string> => {
  const prompt = `Create a high-quality, professional, and visually appealing hero image for a blog article, highly relevant to these topics: ${keywords}. The image should be metaphorical or conceptual, avoiding generic stock photos. The aspect ratio must be 16:9. If any text is present in the image, it must be perfectly legible, spelled correctly, and stylistically integrated into the composition. The text should be minimal and impactful, like a title or a key phrase.`;
  try {
    // FIX: Use `gemini-2.5-flash-image` via `generateContent` as per guidelines.
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
        config: {
          imageConfig: {
            aspectRatio: '16:9',
          },
        },
    }));

    let imageUrl = '';
    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64EncodeString = part.inlineData.data;
                imageUrl = `data:${part.inlineData.mimeType};base64,${base64EncodeString}`;
                break;
            }
        }
    }

    if (imageUrl) {
        return imageUrl;
    } else {
        throw new Error("No image was generated.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
    if (error instanceof Error) {
        throw new Error(`An error occurred while generating the image: ${error.message}`);
    }
    throw new Error("An unknown error occurred during image generation.");
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
    1.  Use your search tool to access and thoroughly analyze the content of the provided URL. Your primary goal is to understand its core message, tone, and key arguments. Extract the most important points, data, and concepts from this URL to form the basis of the new article.
    2.  The generated article must be a unique piece of content, but it should be heavily inspired by and reference the key information found at the provided URL.
    3.  Generate a compelling, unique, and SEO-optimized title. Avoid generic titles. Instead, use a creative and engaging structure like a question (e.g., "Is [Topic] the Future?"), a listicle (e.g., "5 Key Takeaways on [Topic]"), a benefit-driven hook (e.g., "Unlock [Benefit] with [Topic]"), or a bold, thought-provoking statement. The title must accurately reflect the article's content and incorporate the main keywords naturally. **Crucially, the title must be plain text only. Do NOT include any HTML tags (like <strong>) or Markdown formatting in the title itself.**
    4.  Write a detailed, well-structured, and engaging article. The article must be highly relevant to the URL's content and naturally integrate the provided keywords.
    5.  **Format the entire article using clean, standard HTML tags for optimal readability, SEO, and a professional "web format" appearance.**
        -   Use <p> for all paragraphs.
        -   Use <h2> for main section headings and <h3> for sub-section headings to create a clear hierarchy.
        -   Use <ul> and <li> for unordered lists and <ol> and <li> for ordered lists.
        -   **Keyword Bolding: You MUST wrap every instance of the provided keywords ('${keywords}') with <strong> tags in the ARTICLE BODY ONLY.** For example, if a keyword is 'Content Strategy', it must appear as <strong>Content Strategy</strong> in the HTML of the article. This rule does not apply to the title.
        -   **Crucially, you MUST embed the provided URL as a clickable HTML anchor tag within the article text, using one of the most relevant keywords as the anchor text.** For example, if a keyword is "digital marketing", the link should look like <a href="${url}" target="_blank" rel="noopener noreferrer">digital marketing</a>. The link must open in a new tab.
        -   Ensure there is a well-defined "Conclusion" section at the end of the article, formatted under an <h2> heading.
    6.  The article content must be approximately ${wordLimit} words.
    7.  Do NOT include any <html>, <head>, <body>, or <style> tags in your response. Only provide the content for the title and article.
    8.  Do NOT include any image tags (<img>) in the generated article HTML.

    Your final output MUST be structured EXACTLY as follows, using the specified separators. Do not add any text or explanations before or after this structure.

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
    // Fallback for malformed responses
    return {
        title: "Generated Content (Parsing Failed)",
        article: `<p>The AI response was not in the expected format. Here is the raw output:</p><pre><code>${responseText}</code></pre>`
    }
  }
};

export const generateArticleContent = async (data: InputFormData): Promise<ArticleData> => {
  const prompt = generatePrompt(data);
  try {
    // FIX: Use `gemini-3-flash-preview` as per guidelines.
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}],
        },
    }));
    
    const responseText = response.text;
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
