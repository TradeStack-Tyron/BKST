import { useState, useEffect } from 'react'; // FIX: Removed unused 'React' import.
import { useNavigate, useParams } from 'react-router-dom';
import { Book, ArrowLeft, Save, Trash2 } from 'lucide-react';

const JournalEntryPage = () => {
  const { journalId } = useParams<{ journalId: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const isEditing = Boolean(journalId);

  const apiUrl =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV
      ? 'http://localhost:8000'
      : 'https://bkst-production.up.railway.app');

  const getAuthToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    const fetchEntry = async () => {
      if (!isEditing) {
        setLoading(false);
        return;
      }

      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${apiUrl}/journal-entries/${journalId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setTitle(data.title);
          setContent(data.content);
        } else {
          setError(
            'Failed to load journal entry. It may not exist or you may not have permission to view it.'
          );
        }
      } catch (err) {
        setError('A network error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchEntry();
  }, [journalId, isEditing, navigate, apiUrl]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    const url = isEditing
      ? `${apiUrl}/journal-entries/${journalId}`
      : `${apiUrl}/journal-entries`;

    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content }),
      });

      if (response.ok) {
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

  const handleDelete = async () => {
    if (
      !isEditing ||
      !window.confirm(
        'Are you sure you want to delete this entry? This action cannot be undone.'
      )
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);
    const token = getAuthToken();

    try {
      const response = await fetch(`${apiUrl}/journal-entries/${journalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const userId = localStorage.getItem('user_id');
        navigate(`/dashboard/${userId}`);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to delete entry.');
      }
    } catch (err) {
      setError('A network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToDashboard = () => {
    const userId = localStorage.getItem('user_id');
    navigate(userId ? `/dashboard/${userId}` : '/login');
  };

  if (loading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center text-white">
        Loading Entry...
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 transform-gpu overflow-hidden blur-3xl"
      >
        <div className="relative left-1/2 top-1/4 w-[50rem] h-[50rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-10" />
      </div>
      <div className="border-b border-purple-900/30 px-4 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToDashboard}
              className="text-purple-200 hover:text-white p-2 rounded hover:bg-purple-900/20"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center space-x-3">
              <Book size={20} className="text-purple-400" />
              <h1 className="text-xl font-semibold text-purple-200">
                {isEditing ? 'Edit Journal Entry' : 'New Journal Entry'}
              </h1>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto p-6 lg:p-8">
        <div className="space-y-8">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium mb-2 text-purple-200"
            >
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-purple-900/10 border border-purple-800/50 rounded-lg px-4 py-3 text-white placeholder-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Reflections on this week's trades"
            />
          </div>
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium mb-2 text-purple-200"
            >
              Your Thoughts
            </label>
            <textarea
              id="content"
              rows={15}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-purple-900/10 border border-purple-800/50 rounded-lg px-4 py-3 text-white placeholder-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Write about your trading decisions, emotions, and lessons learned..."
            />
          </div>
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="flex justify-between items-center pt-4">
            <div>
              {isEditing && (
                <button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="bg-red-800 hover:bg-red-700 disabled:bg-gray-600 text-white px-6 py-2.5 rounded-lg font-medium flex items-center space-x-2"
                >
                  <Trash2 size={18} />
                  <span>Delete</span>
                </button>
              )}
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleBackToDashboard}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={submitting || !title || !content}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-2.5 rounded-lg font-medium flex items-center space-x-2"
              >
                <Save size={18} />
                <span>{submitting ? 'Saving...' : 'Save Entry'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalEntryPage;
