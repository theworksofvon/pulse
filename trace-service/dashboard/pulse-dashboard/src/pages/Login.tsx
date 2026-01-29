import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (isAuthenticated()) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }

    login(apiKey.trim());
    navigate('/');
  };

  return (
    <div className="bg-neutral-950 text-neutral-100 min-h-screen antialiased flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <span className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Pulse
          </span>
        </div>

        {/* Login Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="text-center mb-6">
            <h1 className="text-lg font-medium mb-1">Sign in to Pulse</h1>
            <p className="text-sm text-neutral-500">Enter your API key to continue</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* API Key */}
              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-850 border border-neutral-700 rounded-lg text-sm focus:border-accent focus:outline-none transition-colors"
                  placeholder="pulse_sk_..."
                  autoFocus
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-accent hover:bg-blue-600 transition-colors"
              >
                Start monitoring
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-neutral-600 mt-6">
          Pulse - LLM Observability
        </p>
      </div>
    </div>
  );
}
