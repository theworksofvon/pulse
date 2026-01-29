import { useState, useEffect, useCallback } from 'react';
import ApiKeyList, { type ApiKey } from '../components/api-keys/ApiKeyList';
import CreateApiKeyModal from '../components/api-keys/CreateApiKeyModal';
import { getApiKeys, deleteApiKey } from '../lib/apiClient';

// Icons
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getApiKeys();
      const mappedKeys: ApiKey[] = response.keys.map((k) => ({
        id: k.id,
        name: k.projectName,
        key: `pulse_sk_****${k.id.slice(-4)}`,
        created_at: k.createdAt,
        status: 'active' as const,
      }));
      setKeys(mappedKeys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleKeyCreated = (_name: string, _fullKey: string) => {
    // Refetch the list to get the new key with proper data
    fetchKeys();
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await deleteApiKey(keyId);
      setKeys(prev => prev.filter(k => k.id !== keyId));
    } catch (err) {
      console.error('Failed to revoke key:', err);
    }
    setShowRevokeModal(null);
  };

  const handleCopyKey = async (keyValue: string) => {
    await navigator.clipboard.writeText(keyValue);
  };

  const handleNameChange = async (keyId: string, newName: string) => {
    // TODO: Replace with actual API call
    setKeys(prev => prev.map(k => k.id === keyId ? { ...k, name: newName } : k));
  };

  const keyToRevoke = keys.find(k => k.id === showRevokeModal);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-neutral-800 flex-shrink-0 bg-neutral-950">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-medium">API Keys</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-accent hover:bg-accent/90 rounded transition-colors"
        >
          <PlusIcon />
          Create Key
        </button>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto">
          {/* Info Banner */}
          <div className="bg-accent/5 border border-accent/20 rounded p-4 mb-6">
            <div className="flex gap-3">
              <InfoIcon />
              <div>
                <p className="text-sm text-neutral-300">
                  API keys are used to authenticate requests to the Pulse API. Keep your keys secure and never share them publicly.
                </p>
                <a href="#" className="text-sm text-accent hover:underline mt-1 inline-block">
                  View API documentation
                </a>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-error/5 border border-error/20 rounded p-4 mb-6">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm text-error">{error}</p>
                  <button
                    onClick={fetchKeys}
                    className="text-sm text-accent hover:underline mt-1 inline-block"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Keys List */}
          <ApiKeyList
            keys={keys}
            loading={loading}
            onCreateClick={() => setShowCreateModal(true)}
            onCopyKey={handleCopyKey}
            onRevokeKey={(keyId) => setShowRevokeModal(keyId)}
            onNameChange={handleNameChange}
          />
        </div>
      </div>

      {/* Create Key Modal */}
      <CreateApiKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onKeyCreated={handleKeyCreated}
      />

      {/* Revoke Confirmation Modal */}
      {showRevokeModal && keyToRevoke && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <h3 className="text-sm font-medium">Revoke API Key</h3>
              <button
                onClick={() => setShowRevokeModal(null)}
                className="p-1 hover:bg-neutral-800 rounded"
              >
                <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="bg-error/5 border border-error/20 rounded p-3 mb-4">
                <div className="flex gap-2">
                  <svg className="w-4 h-4 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-error">This action cannot be undone. Any applications using this key will stop working.</p>
                </div>
              </div>
              <p className="text-sm text-neutral-400">
                Are you sure you want to revoke <span className="text-white font-medium">{keyToRevoke.name}</span>?
              </p>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-neutral-800">
              <button
                onClick={() => setShowRevokeModal(null)}
                className="px-4 py-2 text-sm text-neutral-400 border border-neutral-700 hover:bg-neutral-850 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevokeKey(keyToRevoke.id)}
                className="px-4 py-2 text-sm text-white bg-error hover:bg-error/80 rounded transition-colors"
              >
                Revoke Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
