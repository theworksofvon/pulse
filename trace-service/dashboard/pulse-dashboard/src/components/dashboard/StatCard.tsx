interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'cyan' | 'indigo' | 'pink';
  change?: {
    value: string;
    positive: boolean;
  };
  subtitle?: string;
}

const colorClasses = {
  emerald: {
    gradient: '',
    iconBg: 'bg-emerald-500/5',
    iconText: 'text-emerald-400/70',
    valueText: 'text-white',
  },
  blue: {
    gradient: '',
    iconBg: 'bg-blue-500/5',
    iconText: 'text-blue-400/70',
    valueText: 'text-white',
  },
  purple: {
    gradient: '',
    iconBg: 'bg-purple-500/5',
    iconText: 'text-purple-400/70',
    valueText: 'text-white',
  },
  amber: {
    gradient: '',
    iconBg: 'bg-amber-500/5',
    iconText: 'text-amber-400/70',
    valueText: 'text-white',
  },
  rose: {
    gradient: '',
    iconBg: 'bg-rose-500/5',
    iconText: 'text-rose-400/70',
    valueText: 'text-white',
  },
  cyan: {
    gradient: '',
    iconBg: 'bg-cyan-500/5',
    iconText: 'text-cyan-400/70',
    valueText: 'text-white',
  },
  indigo: {
    gradient: '',
    iconBg: 'bg-indigo-500/5',
    iconText: 'text-indigo-400/70',
    valueText: 'text-white',
  },
  pink: {
    gradient: '',
    iconBg: 'bg-pink-500/5',
    iconText: 'text-pink-400/70',
    valueText: 'text-white',
  },
};

export function StatCard({ label, value, icon, color, change, subtitle }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 transition-colors hover:bg-neutral-850">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
            <span className={colors.iconText}>{icon}</span>
          </div>
          <span className="text-xs text-neutral-500 uppercase tracking-wide">{label}</span>
        </div>
        {change && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              change.positive
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-rose-400 bg-rose-500/10'
            }`}
          >
            {change.positive ? '+' : ''}{change.value}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-semibold ${colors.valueText}`}>{value}</span>
      </div>
      {subtitle && (
        <div className="mt-2 text-xs text-neutral-500">{subtitle}</div>
      )}
    </div>
  );
}
