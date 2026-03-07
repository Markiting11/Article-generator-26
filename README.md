# SEO Article Generator

An AI-powered application that generates unique, SEO-optimized articles based on a given URL and keywords.

## Deployment

This project is optimized for deployment on **Vercel** and **Netlify**.

### Environment Variables

You must set the following environment variable on your deployment platform:

- `VITE_OPENROUTER_API_KEY`: Your OpenRouter API Key.

### Vercel Deployment

1. Connect your repository to Vercel.
2. Vercel will automatically detect the Vite project.
3. Add the `VITE_OPENROUTER_API_KEY` in the project settings under "Environment Variables".
4. Deploy!

### Netlify Deployment

1. Connect your repository to Netlify.
2. Set the build command to `npm run build` and the publish directory to `dist`.
3. Add the `VITE_OPENROUTER_API_KEY` in the site settings under "Environment Variables".
4. Deploy!
