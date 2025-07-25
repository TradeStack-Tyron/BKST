import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Login.css';

const LoginPage = () => {
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Prepare form data for FastAPI OAuth2PasswordRequestForm
      const formData = new FormData();
      formData.append('username', email); // FastAPI OAuth2 uses 'username' field for email
      formData.append('password', password);

      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();

        // Store the token in localStorage
        localStorage.setItem('access_token', data.access_token);

        // Get user info to navigate to their dashboard
        const userResponse = await fetch('http://localhost:8000/userdash', {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          localStorage.setItem('user_id', userData.id.toString());

          // Navigate to user's dashboard
          navigate(`/dashboard/${userData.id}`);
        } else {
          setError('Failed to get user information');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Invalid email or password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black">
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-288.75"
          />
        </div>

        <div className="mx-auto max-w-2xl py-16 sm:py-24 lg:py-32">
          <div className="login-outer-div">
            <form onSubmit={handleLogin}>
              <h1 className="text-5xl font-semibold tracking-tight text-balance text-purple-200 sm:text-7xl mb-8">
                BKST.
              </h1>

              {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />

              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />

              <button
                type="submit"
                disabled={loading}
                className={loading ? 'opacity-50 cursor-not-allowed' : ''}>
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <div className="w-full border-t border-purple-300/30 my-6"></div>
              <div className="flex items-center justify-center gap-4 whitespace-nowrap">
                <span className="text-purple-200 text-xs">
                  If you don't have an account
                </span>
                <a
                  href="/signup"
                  className="text-purple-300 hover:text-purple-200 font-medium text-[19px]">
                  Sign up
                </a>
              </div>
            </form>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="bg-black-200 absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%+3rem)] aspect-1155/678 w-144.5 -translate-x-1/2 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-288.75"
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
