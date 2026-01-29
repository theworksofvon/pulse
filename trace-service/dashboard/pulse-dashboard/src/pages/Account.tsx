import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import UserInfo from '../components/account/UserInfo';
import AccountActions from '../components/account/AccountActions';

const USER_NAME_KEY = 'pulse_user_name';

type AccountSection = 'profile' | 'security' | 'preferences';

export default function Account() {
  const { apiKey } = useAuth();
  const [activeSection, setActiveSection] = useState<AccountSection>('profile');

  // User info state - persist name in localStorage
  const userEmail = apiKey ? `user@${apiKey.slice(0, 8)}...` : 'user@pulse.dev';
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem(USER_NAME_KEY) || '';
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  // Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [timezone, setTimezone] = useState('America/New_York');

  useEffect(() => {
    // Load preferences from localStorage
    const storedPrefs = localStorage.getItem('pulse_user_preferences');
    if (storedPrefs) {
      const prefs = JSON.parse(storedPrefs);
      setEmailNotifications(prefs.emailNotifications ?? true);
      setMarketingEmails(prefs.marketingEmails ?? false);
      setTheme(prefs.theme ?? 'dark');
      setTimezone(prefs.timezone ?? 'America/New_York');
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(USER_NAME_KEY, userName);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const savePreferences = (newPrefs: Partial<{
    emailNotifications: boolean;
    marketingEmails: boolean;
    theme: string;
    timezone: string;
  }>) => {
    const prefs = {
      emailNotifications,
      marketingEmails,
      theme,
      timezone,
      ...newPrefs,
    };
    localStorage.setItem('pulse_user_preferences', JSON.stringify(prefs));
  };

  const navItems: { key: AccountSection; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'security', label: 'Security' },
    { key: 'preferences', label: 'Preferences' },
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Account Navigation */}
      <div className="w-48 border-r border-neutral-800 py-4 px-2 flex-shrink-0">
        <nav className="space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                activeSection === item.key
                  ? 'bg-accent/10 text-white'
                  : 'text-neutral-400 hover:bg-neutral-850 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Account Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl p-6">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <>
              <UserInfo
                name={userName}
                email={userEmail}
                apiKey={apiKey || undefined}
                onNameChange={setUserName}
                onSave={handleSave}
                saveStatus={saveStatus}
              />
              <AccountActions />
            </>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <section className="mb-10">
              <h2 className="text-lg font-medium mb-1">Security</h2>
              <p className="text-sm text-neutral-500 mb-6">Manage your account security</p>

              <div className="space-y-6">
                {/* Current API Key */}
                <div className="bg-neutral-900 border border-neutral-800 rounded p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">API Key</div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Your current authentication key
                      </p>
                    </div>
                    <span className="text-xs px-1.5 py-0.5 bg-success/10 text-success rounded">
                      Active
                    </span>
                  </div>
                  <div className="mt-3 font-mono text-sm text-neutral-400">
                    {apiKey ? `${apiKey.slice(0, 12)}...${apiKey.slice(-4)}` : 'No API key'}
                  </div>
                </div>

                {/* Active Session */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Active Session</label>
                  <div className="bg-neutral-900 border border-neutral-800 rounded">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <svg
                          className="w-5 h-5 text-neutral-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <div>
                          <div className="text-sm">Current Browser</div>
                          <div className="text-xs text-neutral-500">Current session</div>
                        </div>
                      </div>
                      <span className="text-xs px-1.5 py-0.5 bg-success/10 text-success rounded">
                        This device
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Preferences Section */}
          {activeSection === 'preferences' && (
            <section className="mb-10">
              <h2 className="text-lg font-medium mb-1">Preferences</h2>
              <p className="text-sm text-neutral-500 mb-6">Customize your experience</p>

              <div className="space-y-4">
                {/* Email Notifications */}
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium">Email Notifications</div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Receive email updates about your projects
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEmailNotifications(!emailNotifications);
                      savePreferences({ emailNotifications: !emailNotifications });
                    }}
                    className={`relative w-10 h-[22px] rounded-full transition-colors ${
                      emailNotifications ? 'bg-accent' : 'bg-neutral-700'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-[18px] h-[18px] bg-white rounded-full transition-transform ${
                        emailNotifications ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Marketing Emails */}
                <div className="flex items-center justify-between py-3 border-t border-neutral-800">
                  <div>
                    <div className="text-sm font-medium">Marketing Emails</div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Receive news and product updates
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setMarketingEmails(!marketingEmails);
                      savePreferences({ marketingEmails: !marketingEmails });
                    }}
                    className={`relative w-10 h-[22px] rounded-full transition-colors ${
                      marketingEmails ? 'bg-accent' : 'bg-neutral-700'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-[18px] h-[18px] bg-white rounded-full transition-transform ${
                        marketingEmails ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Theme */}
                <div className="flex items-center justify-between py-3 border-t border-neutral-800">
                  <div>
                    <div className="text-sm font-medium">Theme</div>
                    <p className="text-xs text-neutral-500 mt-0.5">Select your preferred theme</p>
                  </div>
                  <select
                    value={theme}
                    onChange={(e) => {
                      setTheme(e.target.value);
                      savePreferences({ theme: e.target.value });
                    }}
                    className="bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm text-neutral-300 focus:outline-none focus:border-accent"
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="system">System</option>
                  </select>
                </div>

                {/* Timezone */}
                <div className="flex items-center justify-between py-3 border-t border-neutral-800">
                  <div>
                    <div className="text-sm font-medium">Timezone</div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Used for displaying times in the dashboard
                    </p>
                  </div>
                  <select
                    value={timezone}
                    onChange={(e) => {
                      setTimezone(e.target.value);
                      savePreferences({ timezone: e.target.value });
                    }}
                    className="bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm text-neutral-300 focus:outline-none focus:border-accent"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
