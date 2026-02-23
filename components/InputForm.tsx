
import React, { useState } from 'react';
import { InputFormData } from '../types';
import Spinner from './Spinner';

interface InputFormProps {
  isLoading: boolean;
  loadingMessage: string;
  onSubmit: (data: InputFormData) => void;
}

const InputForm: React.FC<InputFormProps> = ({ isLoading, loadingMessage, onSubmit }) => {
  const [formData, setFormData] = useState<InputFormData>({
    url: '',
    keywords: '',
    wordLimit: 500,
    autoGenerateImage: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : (type === 'number' || type === 'range' ? parseInt(value) || 0 : value),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="url" className="block text-gray-700 text-lg font-semibold mb-2">
          URL (Content to read):
        </label>
        <input
          type="url"
          id="url"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out text-gray-800"
          placeholder="https://example.com/your-article"
          value={formData.url}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="keywords" className="block text-gray-700 text-lg font-semibold mb-2">
          Keywords (Comma-separated):
        </label>
        <input
          type="text"
          id="keywords"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ease-in-out text-gray-800"
          placeholder="SEO, Digital Marketing, Content Strategy"
          value={formData.keywords}
          onChange={handleChange}
          required
        />
      </div>

      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="autoGenerateImage"
          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          checked={formData.autoGenerateImage}
          onChange={handleChange}
        />
        <label htmlFor="autoGenerateImage" className="text-gray-700 text-lg font-semibold cursor-pointer select-none">
          Automatically generate hero image
        </label>
      </div>

      <div>
        <label htmlFor="wordLimit" className="block text-gray-700 text-lg font-semibold mb-2">
          Word Limit (approx.): {formData.wordLimit}
        </label>
        <input
          type="range"
          id="wordLimit"
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          value={formData.wordLimit}
          onChange={handleChange}
          min="100"
          max="2000"
          step="50"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-6 rounded-lg text-xl hover:from-blue-700 hover:to-purple-700 transition duration-300 ease-in-out transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        disabled={isLoading || !formData.url || !formData.keywords}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <Spinner />
            {loadingMessage || 'Generating...'}
          </div>
        ) : (
          'Generate Article'
        )}
      </button>
    </form>
  );
};

export default InputForm;