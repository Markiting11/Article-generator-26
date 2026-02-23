
import React, { useState } from 'react';
import { ArticleData } from '../types';
import { DownloadIcon, TextIcon, CopyIcon } from './icons';

interface GeneratedContentProps {
  content: ArticleData;
  imageSrc?: string;
}

const ActionButton: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    className: string;
}> = ({ onClick, children, className }) => (
    <button
        onClick={onClick}
        className={`font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-105 shadow-md flex items-center justify-center ${className}`}
    >
        {children}
    </button>
);


const GeneratedContent: React.FC<GeneratedContentProps> = ({ content, imageSrc }) => {
    const [copySuccess, setCopySuccess] = useState('');

    const convertHtmlToPlainText = (html: string): string => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    };

    const downloadFile = (content: string, filename: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadHtml = () => {
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${content.title}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"; line-height: 1.6; color: #333; max-width: 800px; margin: 2rem auto; padding: 2rem; background: #f9fafb; }
                    h1, h2, h3 { color: #111827; } h2 { border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
                    a { color: #3b82f6; } img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0; }
                </style>
            </head>
            <body>
                <h1>${content.title}</h1>
                ${imageSrc ? `<img src="${imageSrc}" alt="${content.title}">` : ''}
                ${content.article}
            </body>
            </html>
        `;
        const filename = `${content.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
        downloadFile(fullHtml, filename, 'text/html');
    };

    const handleDownloadText = () => {
        const plainText = convertHtmlToPlainText(content.article);
        const fullText = `${content.title}\n\n${plainText}`;
        const filename = `${content.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
        downloadFile(fullText, filename, 'text/plain');
    };

    const handleCopyToClipboard = async () => {
        const plainText = convertHtmlToPlainText(content.article);
        if (!navigator.clipboard) {
            setCopySuccess('Clipboard API not available.');
            return;
        }
        try {
            await navigator.clipboard.writeText(plainText);
            setCopySuccess('Article content copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            setCopySuccess('Failed to copy article content.');
        } finally {
            setTimeout(() => setCopySuccess(''), 3000);
        }
    };
    
    return (
        <div className="mt-8 p-6 sm:p-8 bg-gray-50 rounded-xl shadow-inner border border-gray-200">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
                {content.title}
            </h2>
            {imageSrc && (
                <div className="my-6 flex justify-center">
                    <img
                        src={imageSrc}
                        alt="Article hero image"
                        className="rounded-lg shadow-md max-w-full h-auto max-h-96 object-cover"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = `https://picsum.photos/600/400?grayscale`;
                            target.alt = "Placeholder image";
                        }}
                    />
                </div>
            )}

            <div
                className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: content.article }}
            ></div>

            <div className="mt-8 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <ActionButton onClick={handleDownloadHtml} className="bg-green-500 text-white hover:bg-green-600">
                    <DownloadIcon className="w-5 h-5 mr-2" /> Download HTML
                </ActionButton>
                <ActionButton onClick={handleDownloadText} className="bg-blue-500 text-white hover:bg-blue-600">
                    <TextIcon className="w-5 h-5 mr-2" /> Download Text
                </ActionButton>
                <ActionButton onClick={handleCopyToClipboard} className="bg-indigo-500 text-white hover:bg-indigo-600">
                    <CopyIcon className="w-5 h-5 mr-2" /> Copy Text
                </ActionButton>
            </div>
            {copySuccess && (
                <p className="text-center text-sm text-green-600 mt-4 animate-pulse">{copySuccess}</p>
            )}
        </div>
    );
};

export default GeneratedContent;

