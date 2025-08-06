import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Login.css';

const SignupPage = () => {
  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  // API URL configuration
  const apiUrl =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:8000' : '/api');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate form data
      if (!formData.fullName.trim()) {
        setError('Full name is required');
        return;
      }

      if (!formData.username.trim()) {
        setError('Username is required');
        return;
      }

      if (!formData.email.trim()) {
        setError('Email is required');
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Prepare signup data
      const signupData = {
        full_name: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
      };

      // FIX: Use apiUrl for fetch call
      const response = await fetch(`${apiUrl}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      });

      if (response.ok) {
        // FIX: Removed unused 'userData' variable to resolve TS6133 error.
        // The response body doesn't need to be read here.
        await response.json();

        // Account created successfully, redirect to login
        navigate('/login', {
          state: {
            message: 'Account created successfully! Please log in.',
          },
        });
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to create account');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black">
      <div className="relative isolate px-6 pt-14 lg:px-8">
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
            <form onSubmit={handleSignup}>
              <h1 className="text-5xl font-semibold tracking-tight text-balance text-purple-200 sm:text-7xl mb-8">
                BKST.
              </h1>

              {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                disabled={loading}
                placeholder="Enter your full name"
              />

              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                disabled={loading}
                placeholder="Choose a username"
              />

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
                placeholder="Create a password"
                minLength={6}
              />

              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                disabled={loading}
                placeholder="Confirm your password"
                minLength={6}
              />

              <button
                type="submit"
                disabled={loading}
                className={loading ? 'opacity-50 cursor-not-allowed' : ''}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <div className="w-full border-t border-purple-300/30 my-6"></div>
              <div className="flex items-center justify-center gap-4 whitespace-nowrap">
                <span className="text-purple-200 text-xs">
                  Already have an account?
                </span>
                <a
                  href="/login"
                  className="text-purple-300 hover:text-purple-200 font-medium text-[19px]"
                >
                  Sign in
                </a>
              </div>
            </form>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="bg-black-200 absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        >
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

export default SignupPage;
