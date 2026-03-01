
import React, { useState } from 'react';
import InputForm from './components/InputForm';
import GeneratedContent from './components/GeneratedContent';
import { generateArticleContent, generateImage } from './services/geminiService';
import { ArticleData, InputFormData } from './types';

const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');
    const [generatedContent, setGeneratedContent] = useState<ArticleData | null>(null);
    const [currentImageSrc, setCurrentImageSrc] = useState<string>('');

    const handleGenerate = async (data: InputFormData) => {
        setIsLoading(true);
        setError('');
        setWarning('');
        setGeneratedContent(null);
        setCurrentImageSrc('');

        try {
            if (data.autoGenerateImage) {
                setLoadingMessage('Generating header image...');
                try {
                    const imageUrl = await generateImage(data.keywords);
                    setCurrentImageSrc(imageUrl);
                } catch (imgErr) {
                    console.error("Image generation failed:", imgErr);
                    setWarning('Image generation failed (likely due to API quota). Generating article only...');
                }
            }

            setLoadingMessage('Generating article content...');
            const result = await generateArticleContent(data);
            setGeneratedContent(result);

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            console.error("Error in generation process:", err);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 p-4 sm:p-8 font-sans flex items-start justify-center">
            <main className="max-w-4xl w-full bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-8">
                <header className="text-center">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-800">
                        SEO Article Generator
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                        Turn any URL into a unique, SEO-friendly article with an AI-generated image.
                    </p>
                </header>

                <InputForm 
                    isLoading={isLoading} 
                    loadingMessage={loadingMessage} 
                    onSubmit={handleGenerate} 
                />

                {warning && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 p-4 mt-6 rounded-r-lg" role="alert">
                        <p className="font-bold">Notice</p>
                        <p>{warning}</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mt-6 rounded-r-lg" role="alert">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                    </div>
                )}

                {!isLoading && generatedContent && (
                    <GeneratedContent content={generatedContent} imageSrc={currentImageSrc} />
                )}
            </main>
        </div>
    );
};

export default App;