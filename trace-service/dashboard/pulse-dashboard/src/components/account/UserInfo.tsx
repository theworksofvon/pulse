interface UserInfoProps {
  name: string;
  email: string;
  apiKey?: string;
  onNameChange?: (name: string) => void;
  onSave?: () => void;
  saveStatus?: 'idle' | 'saved';
}

export default function UserInfo({ name, email, apiKey, onNameChange, onSave, saveStatus = 'idle' }: UserInfoProps) {
  const initial = name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase();
  const maskedApiKey = apiKey ? `${apiKey.slice(0, 12)}...${apiKey.slice(-4)}` : 'No API key';

  return (
    <section className="mb-10">
      <h2 className="text-lg font-medium mb-1">Profile</h2>
      <p className="text-sm text-neutral-500 mb-6">Your personal information</p>

      <div className="space-y-6">
        {/* Avatar */}
        <div>
          <label className="block text-sm font-medium mb-3">Avatar</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-xl font-semibold text-white">
              {initial}
            </div>
            <div>
              <div className="text-sm font-medium text-neutral-100">{name || 'API Key User'}</div>
              <div className="text-sm text-neutral-500">{email}</div>
            </div>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange?.(e.target.value)}
            placeholder="Your name"
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-300 focus:border-accent focus:outline-none"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-500 cursor-not-allowed"
          />
          <p className="text-xs text-neutral-500 mt-1">Email is derived from your API key.</p>
        </div>

        {/* API Key Info */}
        <div className="bg-neutral-900 border border-neutral-800 rounded p-4">
          <div className="text-sm font-medium mb-1">Current API Key</div>
          <div className="text-sm text-neutral-500 font-mono">{maskedApiKey}</div>
        </div>

        {onSave && (
          <div className="pt-4 flex items-center gap-3">
            <button
              onClick={onSave}
              className="px-4 py-2 text-sm text-white bg-accent hover:bg-accent/90 rounded transition-colors"
            >
              Save Changes
            </button>
            {saveStatus === 'saved' && (
              <span className="text-sm text-success">Saved!</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
