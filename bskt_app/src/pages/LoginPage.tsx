import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../Login.css'; // Assuming you have this CSS file for styling

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State for form inputs, loading, and errors
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // API URL configuration
  const apiUrl =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:8000' : '/api');

  // Check for a success message from the signup page
  const successMessage = location.state?.message;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Create a URL-encoded form data object, as required by OAuth2PasswordRequestForm
      const formBody = new URLSearchParams();
      formBody.append('username', formData.email); // FastAPI's OAuth2 form uses 'username' for the email field
      formBody.append('password', formData.password);

      // FIX: Use apiUrl for fetch call
      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
      });

      if (response.ok) {
        const data = await response.json();

        // Save the token and user ID to local storage
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_id', data.user_id);

        navigate(`/dashboard/${data.user_id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Invalid email or password.');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black">
      <div className="relative isolate px-6 pt-14 lg:px-8">
        {/* Background gradient */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
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

              {/* Display success or error messages */}
              {successMessage && !error && (
                <div className="bg-green-900/30 border border-green-800 text-green-300 px-4 py-3 rounded-lg mb-4">
                  {successMessage}
                </div>
              )}
              {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={loading}
                placeholder="Enter your email"
              />

              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={loading}
                placeholder="Enter your password"
              />

              <button
                type="submit"
                disabled={loading}
                className={loading ? 'opacity-50 cursor-not-allowed' : ''}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="w-full border-t border-purple-300/30 my-6"></div>
              <div className="flex items-center justify-center gap-4 whitespace-nowrap">
                <span className="text-purple-200 text-xs">
                  Don't have an account?
                </span>
                <a
                  href="/signup"
                  className="text-purple-300 hover:text-purple-200 font-medium text-[19px]"
                >
                  Sign up
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
