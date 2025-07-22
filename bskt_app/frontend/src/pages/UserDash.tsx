import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Activity, DollarSign, TrendingUp, X } from 'lucide-react';

interface FormData {
  sessionName: string;
  startDate: string;
  endDate: string;
  startingCapital: string;
}

interface Session {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  starting_capital: number;
  result: number | null;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
}

const TraderDashboard = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    sessionName: '',
    startDate: '',
    endDate: '',
    startingCapital: '',
  });

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('access_token');
  };

  // Check authentication
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;

      try {
        const token = getAuthToken();
        if (!token) {
          setError('No authentication token found');
          return;
        }

        const response = await fetch(
          `http://localhost:8000/userdash/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          setError('Failed to fetch user data');
        }
      } catch (err) {
        setError('Network error occurred');
      }
    };

    fetchUser();
  }, [userId]);

  // Fetch user sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setError('No authentication token found');
          return;
        }

        const response = await fetch('http://localhost:8000/sessions', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSessions(data);
        } else {
          setError('Failed to fetch sessions');
        }
      } catch (err) {
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (): Promise<void> => {
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        setError('No authentication token found');
        navigate('/login');
        return;
      }

      // Validate form data
      if (!formData.sessionName.trim()) {
        setError('Session name is required');
        return;
      }

      if (
        !formData.startingCapital ||
        parseFloat(formData.startingCapital) <= 0
      ) {
        setError('Starting capital must be greater than 0');
        return;
      }

      if (!formData.startDate || !formData.endDate) {
        setError('Both start and end dates are required');
        return;
      }

      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        setError('End date must be after start date');
        return;
      }

      const sessionData = {
        name: formData.sessionName.trim(),
        start_date: formData.startDate,
        end_date: formData.endDate,
        starting_capital: parseFloat(formData.startingCapital),
      };

      const response = await fetch('http://localhost:8000/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (response.ok) {
        const newSession = await response.json();
        setSessions([newSession, ...sessions]);
        setShowCreateForm(false);
        setFormData({
          sessionName: '',
          startDate: '',
          endDate: '',
          startingCapital: '',
        });
      } else if (response.status === 401) {
        setError('Session expired. Please login again.');
        localStorage.removeItem('access_token');
        navigate('/login');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to create session');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error creating session:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate stats from actual sessions
  const calculateStats = () => {
    const activeSessions = sessions.filter(
      (session) => session.result === null
    ).length;
    const totalPnL = sessions.reduce((sum, session) => {
      return sum + (session.result || 0);
    }, 0);

    const completedSessions = sessions.filter(
      (session) => session.result !== null
    );
    const winningSessions = completedSessions.filter(
      (session) => (session.result || 0) > 0
    ).length;
    const winRate =
      completedSessions.length > 0
        ? Math.round((winningSessions / completedSessions.length) * 100)
        : 0;

    return { activeSessions, totalPnL, winRate };
  };

  const { activeSessions, totalPnL, winRate } = calculateStats();

  // Format session display data
  const formatSession = (session: Session) => {
    const startDate = new Date(session.start_date);
    const endDate = new Date(session.end_date);
    const now = new Date();

    const isActive = session.result === null;
    const pnl = session.result
      ? `${session.result >= 0 ? '+' : ''}$${session.result.toLocaleString()}`
      : 'In Progress';

    // Calculate duration or time elapsed
    const duration = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const timeDisplay = `${duration}d planned`;

    return {
      ...session,
      displayPnL: pnl,
      status: isActive ? 'Active' : 'Closed',
      timeDisplay,
    };
  };

  if (loading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen">
      <div className="relative isolate px-6 pt-14 lg:px-8">
        {/* Purple blur effects */}
        <div
          aria-hidden="true"
          className="absolute top-10 right-10 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative w-96 h-96 bg-purple-600/20 rounded-full" />
        </div>
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-0 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative w-80 h-80 bg-purple-800/15 rounded-full" />
        </div>
        <div
          aria-hidden="true"
          className="absolute bottom-20 right-1/2 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative w-72 h-72 bg-purple-500/10 rounded-full" />
        </div>
        <div
          aria-hidden="true"
          className="absolute top-1/4 left-1/2 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative w-64 h-64 bg-purple-700/20 rounded-full" />
        </div>

        {/* Top Navigation */}
        <nav className="border-b border-gray-800 -mx-6 px-6 mb-8">
          <div className="max-w-6xl mx-auto py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-purple-300">BKST</h1>
              <div className="flex items-center space-x-8">
                <span className="text-gray-400">
                  Welcome back, {user ? user.username : 'Trader'}
                </span>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          </div>
        </nav>

        <div className="mx-auto max-w-6xl py-8">
          {/* Main Action Area */}
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light mb-4 text-white">
              Your Trading Command Center
            </h2>
            <p className="text-gray-400 text-lg mb-12">
              Test your strategies with precision and confidence
            </p>

            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-all duration-200 flex items-center space-x-3 mx-auto">
              <Plus size={24} />
              <span>Create Session</span>
            </button>
          </div>

          {/* Quick Stats Bar */}
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
                  {totalPnL.toLocaleString()}
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

          {/* Sessions List */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl font-medium mb-6 text-center text-white">
              Your Trading Sessions
            </h3>
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg mb-4">
                  No sessions created yet
                </p>
                <p className="text-gray-500">
                  Create your first trading session to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const formattedSession = formatSession(session);
                  return (
                    <div
                      key={session.id}
                      onClick={() => navigate(`/trading/${session.id}`)}
                      className="border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors cursor-pointer hover:bg-gray-900/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          <div>
                            <h4 className="font-medium text-lg text-white">
                              {session.name}
                            </h4>
                            <p className="text-gray-400 text-sm">
                              ${session.starting_capital.toLocaleString()}{' '}
                              starting capital • {formattedSession.timeDisplay}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {new Date(
                                session.start_date
                              ).toLocaleDateString()}{' '}
                              -{' '}
                              {new Date(session.end_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          <span
                            className={`text-lg font-medium ${
                              session.result === null
                                ? 'text-gray-400'
                                : session.result >= 0
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}>
                            {formattedSession.displayPnL}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm ${
                              formattedSession.status === 'Active'
                                ? 'bg-green-900/30 text-green-300 border border-green-800'
                                : 'bg-gray-800/30 text-gray-400 border border-gray-700'
                            }`}>
                            {formattedSession.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Create Session Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-white">
                  New Trading Session
                </h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-white transition-colors">
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
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., EUR/USD Scalping Strategy"
                    required
                  />
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
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                      className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                      className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors">
                    {submitting ? 'Creating...' : 'Create Session'}
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors">
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
