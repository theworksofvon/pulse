import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { validateApiKey } from '../lib/apiClient';

export default function Login() {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (isAuthenticated()) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setError('Please enter your API key');
      return;
    }

    setIsLoading(true);
    try {
      const response = await validateApiKey(trimmedKey);
      if (response.authenticated) {
        login(trimmedKey);
        navigate('/');
      } else {
        setError('Invalid API key. Please check your key and try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate API key. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-neutral-950 text-neutral-100 min-h-screen antialiased flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <span className="text-xl font-bold tracking-tight text-white">
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
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-neutral-850 border border-neutral-700 rounded-lg text-sm focus:border-accent focus:outline-none transition-colors disabled:opacity-50"
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
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-accent hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Validating...' : 'Start monitoring'}
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
