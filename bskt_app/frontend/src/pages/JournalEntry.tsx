import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, ArrowLeft, Save } from 'lucide-react';

const JournalEntry = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const getAuthToken = () => {
    return localStorage.getItem('access_token');
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:8000/journal-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content }),
      });

      if (response.ok) {
        // On successful save, navigate back to the dashboard or a journal list page
        const userId = localStorage.getItem('user_id');
        navigate(`/dashboard/${userId}`);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to save journal entry.');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToDashboard = () => {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      navigate(`/dashboard/${userId}`);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="bg-black min-h-screen text-white">
      {/* Decorative background elements */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div className="relative left-1/2 top-1/4 w-[50rem] h-[50rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-10" />
      </div>

      {/* Top Navigation */}
      <div className="border-b border-purple-900/30 px-4 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToDashboard}
              className="text-purple-200 hover:text-white transition-colors p-2 rounded hover:bg-purple-900/20">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center space-x-3">
              <Book size={20} className="text-purple-400" />
              <h1 className="text-xl font-semibold text-purple-200">
                New Journal Entry
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto p-6 lg:p-8">
        <div className="space-y-8">
          {/* Title Input */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium mb-2 text-purple-200">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-purple-900/10 border border-purple-800/50 rounded-lg px-4 py-3 text-white placeholder-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              placeholder="e.g., Reflections on this week's trades"
            />
          </div>

          {/* Content Textarea */}
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium mb-2 text-purple-200">
              Your Thoughts
            </label>
            <textarea
              id="content"
              rows={15}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-purple-900/10 border border-purple-800/50 rounded-lg px-4 py-3 text-white placeholder-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              placeholder="Write about your trading decisions, emotions, and lessons learned..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4">
            <button
              onClick={handleBackToDashboard}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={submitting || !title || !content}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center space-x-2">
              <Save size={18} />
              <span>{submitting ? 'Saving...' : 'Save Entry'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalEntry;
