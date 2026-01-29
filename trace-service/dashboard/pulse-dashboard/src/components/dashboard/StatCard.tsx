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
    gradient: 'from-emerald-500/5',
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
    valueText: 'text-emerald-400',
  },
  blue: {
    gradient: 'from-blue-500/5',
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-400',
    valueText: 'text-blue-400',
  },
  purple: {
    gradient: 'from-purple-500/5',
    iconBg: 'bg-purple-500/10',
    iconText: 'text-purple-400',
    valueText: 'text-purple-400',
  },
  amber: {
    gradient: 'from-amber-500/5',
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-400',
    valueText: 'text-amber-400',
  },
  rose: {
    gradient: 'from-rose-500/5',
    iconBg: 'bg-rose-500/10',
    iconText: 'text-rose-400',
    valueText: 'text-rose-400',
  },
  cyan: {
    gradient: 'from-cyan-500/5',
    iconBg: 'bg-cyan-500/10',
    iconText: 'text-cyan-400',
    valueText: 'text-cyan-400',
  },
  indigo: {
    gradient: 'from-indigo-500/5',
    iconBg: 'bg-indigo-500/10',
    iconText: 'text-indigo-400',
    valueText: 'text-indigo-400',
  },
  pink: {
    gradient: 'from-pink-500/5',
    iconBg: 'bg-pink-500/10',
    iconText: 'text-pink-400',
    valueText: 'text-pink-400',
  },
};

export function StatCard({ label, value, icon, color, change, subtitle }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 relative overflow-hidden transition-colors hover:bg-neutral-800/50">
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} to-transparent`} />
      <div className="relative">
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
    </div>
  );
}
