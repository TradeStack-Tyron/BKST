import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Activity,
  DollarSign,
  TrendingUp,
  X,
  LogOut,
  BookOpen,
  ChevronRight,
  Trash2,
} from 'lucide-react';

// --- Type Definitions ---
type TimeFrame = '1min' | '5min' | '15min' | '30min' | '4h' | '1day';

// --- Interface Definitions ---
interface FormData {
  sessionName: string;
  symbol: string;
  timeframe: TimeFrame;
  startDate: string;
  endDate: string;
  startingCapital: string;
}

interface Session {
  id: number;
  name: string;
  symbol: string;
  start_date: string;
  end_date: string;
  starting_capital: number | string;
  result: number | string | null;
  created_at: string;
  is_completed: boolean;
  current_balance: number | string | null;
}

interface JournalEntry {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string | null;
}

interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
}

const availableSymbols = ['EUR/USD', 'GBP/JPY', 'GBP/EUR', 'BTC/USD'];
const availableTimeframes: { value: TimeFrame; label: string }[] = [
  { value: '1min', label: '1 Minute' },
  { value: '5min', label: '5 Minutes' },
  { value: '15min', label: '15 Minutes' },
  { value: '30min', label: '30 Minutes' },
  { value: '4h', label: '4 Hours' },
  { value: '1day', label: '1 Day' },
];

const TraderDashboard = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);

  // --- MODIFIED FOR DEPLOYMENT ---
  // This variable reads the backend URL from environment variables.
  // It defaults to your localhost address for easy local development.
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  // --- END OF MODIFICATION ---

  const [formData, setFormData] = useState<FormData>({
    sessionName: '',
    symbol: availableSymbols[0],
    timeframe: availableTimeframes[2].value,
    startDate: '',
    endDate: '',
    startingCapital: '',
  });

  const getAuthToken = () => localStorage.getItem('access_token');

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    navigate('/');
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        // --- MODIFIED FOR DEPLOYMENT ---
        const [userResponse, sessionsResponse, journalsResponse] =
          await Promise.all([
            fetch(`${apiUrl}/userdash/${userId}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${apiUrl}/sessions`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${apiUrl}/journal-entries`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
        // --- END OF MODIFICATION ---
        if (!userResponse.ok) throw new Error('Failed to fetch user data');
        if (!sessionsResponse.ok) throw new Error('Failed to fetch sessions');
        if (!journalsResponse.ok)
          throw new Error('Failed to fetch journal entries');
        const userData = await userResponse.json();
        const sessionsData = await sessionsResponse.json();
        const journalsData = await journalsResponse.json();
        setUser(userData);
        setSessions(sessionsData);
        setJournalEntries(journalsData);
      } catch (err: any) {
        setError(err.message || 'A network error occurred.');
      } finally {
        setLoading(false);
      }
    };
    if (userId) {
      fetchAllData();
    }
  }, [userId, navigate, apiUrl]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (): Promise<void> => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = getAuthToken();
      const sessionData = {
        name: formData.sessionName.trim(),
        symbol: formData.symbol,
        timeframe: formData.timeframe,
        start_date: formData.startDate,
        end_date: formData.endDate,
        starting_capital: parseFloat(formData.startingCapital),
      };
      // --- MODIFIED FOR DEPLOYMENT ---
      const response = await fetch(`${apiUrl}/sessions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });
      // --- END OF MODIFICATION ---
      if (response.ok) {
        const newSession = await response.json();
        setSessions([newSession, ...sessions]);
        setShowCreateForm(false);
        setFormData({
          sessionName: '',
          symbol: availableSymbols[0],
          timeframe: '15min',
          startDate: '',
          endDate: '',
          startingCapital: '',
        });
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to create session');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSession = async (sessionIdToDelete: number) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this session? This action cannot be undone.'
      )
    ) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      // --- MODIFIED FOR DEPLOYMENT ---
      const response = await fetch(`${apiUrl}/sessions/${sessionIdToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      // --- END OF MODIFICATION ---

      if (response.ok) {
        setSessions((prevSessions) =>
          prevSessions.filter((session) => session.id !== sessionIdToDelete)
        );
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to delete session.');
      }
    } catch (err: any) {
      setError(err.message || 'A network error occurred.');
    }
  };

  const calculateStats = () => {
    const activeSessions = sessions.filter((s) => !s.is_completed).length;
    const totalPnL = sessions.reduce((sum, session) => {
      const startingCapitalValue = parseFloat(
        session.starting_capital as string
      );
      let currentProfit = 0;
      if (session.is_completed && session.result != null) {
        currentProfit =
          parseFloat(session.result as string) - startingCapitalValue;
      } else if (!session.is_completed && session.current_balance != null) {
        currentProfit =
          parseFloat(session.current_balance as string) - startingCapitalValue;
      }
      return sum + currentProfit;
    }, 0);
    const completedSessions = sessions.filter((s) => s.is_completed);
    const winningSessions = completedSessions.filter((s) => {
      const resultValue = s.result ? parseFloat(s.result as string) : 0;
      const startingCapitalValue = parseFloat(s.starting_capital as string);
      return resultValue > startingCapitalValue;
    }).length;
    const winRate =
      completedSessions.length > 0
        ? Math.round((winningSessions / completedSessions.length) * 100)
        : 0;
    return { activeSessions, totalPnL, winRate };
  };

  const { activeSessions, totalPnL, winRate } = calculateStats();

  if (loading)
    return (
      <div className="bg-black min-h-screen flex items-center justify-center text-white text-xl">
        Loading Dashboard...
      </div>
    );
  if (error)
    return (
      <div className="bg-black min-h-screen flex items-center justify-center text-red-400 text-xl">
        {error}
      </div>
    );

  return (
    <div className="bg-black min-h-screen">
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div
          aria-hidden="true"
          className="absolute top-10 right-10 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative w-96 h-96 bg-purple-600/20 rounded-full" />
        </div>
        <nav className="border-b border-gray-800 -mx-6 px-6 mb-8">
          <div className="max-w-6xl mx-auto py-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-purple-300">BKST</h1>
            <div className="flex items-center space-x-8">
              <span className="text-gray-400">
                Welcome back, {user?.username || 'Trader'}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </nav>
        <div className="mx-auto max-w-6xl py-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light mb-4 text-white">
              Your Trading Command Center
            </h2>
            <p className="text-gray-400 text-lg mb-12">
              Test your strategies with precision and confidence
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg text-lg font-medium flex items-center space-x-3">
                <Plus size={24} />
                <span>Create Session</span>
              </button>
              <button
                onClick={() => navigate('/journal/new')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg text-lg font-medium flex items-center space-x-3">
                <BookOpen size={24} />
                <span>Add Journal Entry</span>
              </button>
            </div>
          </div>
          <div className="flex justify-center space-x-16 mb-16">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Activity className="text-purple-400 mr-2" size={20} />
                <span className="text-2xl font-bold text-white">
                  {activeSessions}
                </span>
              </div>
              <p className="text-gray-400 text-sm">Active Sessions</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <DollarSign
                  className={`mr-2 ${
                    totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                  size={20}
                />
                <span
                  className={`text-2xl font-bold ${
                    totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                  {totalPnL >= 0 ? '+' : ''}
                  {totalPnL.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <p className="text-gray-400 text-sm">Total P&L</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="text-blue-400 mr-2" size={20} />
                <span className="text-2xl font-bold text-white">
                  {winRate}%
                </span>
              </div>
              <p className="text-gray-400 text-sm">Win Rate</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div>
              <h3 className="text-xl font-medium mb-6 text-center text-white">
                Your Trading Sessions
              </h3>
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No sessions created yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => navigate(`/trading/${s.id}`)}
                      className="border border-gray-800 rounded-lg p-4 hover:border-gray-700 cursor-pointer hover:bg-gray-900/50 flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white">{s.name}</h4>
                        <span className="text-sm text-gray-400">
                          {s.symbol}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            !s.is_completed
                              ? 'bg-green-900/30 text-green-300'
                              : 'bg-gray-800/30 text-gray-400'
                          }`}>
                          {!s.is_completed ? 'Active' : 'Closed'}
                        </span>
                        {/* This button correctly calls the delete handler. */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(s.id);
                          }}
                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-900/20 rounded-full transition-colors"
                          title="Delete Session">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-medium mb-6 text-center text-white">
                Your Journal Entries
              </h3>
              {journalEntries.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No journal entries yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {journalEntries.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => navigate(`/journal/edit/${entry.id}`)}
                      className="border border-gray-800 rounded-lg p-4 hover:border-gray-700 cursor-pointer hover:bg-gray-900/50">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-white truncate">
                          {entry.title}
                        </h4>
                        <div className="flex items-center space-x-4">
                          <p className="text-gray-500 text-sm">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </p>
                          <ChevronRight size={18} className="text-gray-600" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-white">
                  New Trading Session
                </h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Session Name
                  </label>
                  <input
                    type="text"
                    name="sessionName"
                    value={formData.sessionName}
                    onChange={handleInputChange}
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white"
                    placeholder="e.g., EUR/USD Scalping Strategy"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">
                      Symbol
                    </label>
                    <select
                      name="symbol"
                      value={formData.symbol}
                      onChange={handleInputChange}
                      className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white">
                      {availableSymbols.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">
                      Timeframe
                    </label>
                    <select
                      name="timeframe"
                      value={formData.timeframe}
                      onChange={handleInputChange}
                      className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white">
                      {availableTimeframes.map((tf) => (
                        <option key={tf.value} value={tf.value}>
                          {tf.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Starting Capital ($)
                  </label>
                  <input
                    type="number"
                    name="startingCapital"
                    value={formData.startingCapital}
                    onChange={handleInputChange}
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white"
                    placeholder="10000"
                    min="100"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white"
                      required
                    />
                  </div>
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={
                      !formData.sessionName ||
                      !formData.startingCapital ||
                      !formData.startDate ||
                      !formData.endDate ||
                      submitting
                    }
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-3 rounded-lg">
                    Create Session
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TraderDashboard;
