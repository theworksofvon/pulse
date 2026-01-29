import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

export interface ProviderDataPoint {
  provider: string;
  costCents: number;
  requests?: number;
}

interface ProviderSplitChartProps {
  data: ProviderDataPoint[];
}

function formatCurrency(value: number): string {
  return '$' + value.toFixed(2);
}

function getProviderColor(provider: string, index: number): string {
  const colors: Record<string, string> = {
    openai: '#34d399',      // emerald-400
    anthropic: '#fb923c',   // orange-400
    openrouter: '#a78bfa',  // violet-400
  };
  return colors[provider.toLowerCase()] || ['#34d399', '#fb923c', '#a78bfa'][index % 3];
}

// Custom tooltip
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string; payload: ProviderDataPoint }> }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const total = payload.reduce((sum, entry) => sum + entry.value, 0);
  const percentage = total > 0 ? ((data.costCents / total) * 100).toFixed(0) : '0';

  return (
    <div className="bg-neutral-850 border border-neutral-700 rounded px-3 py-2 shadow-xl">
      <p className="text-xs text-neutral-400 capitalize mb-1">{data.provider}</p>
      <p className="text-sm font-medium text-white">{formatCurrency(data.costCents / 100)} <span className="text-neutral-500">({percentage}%)</span></p>
    </div>
  );
}

export default function ProviderSplitChart({ data }: ProviderSplitChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-neutral-500 border border-dashed border-neutral-800 rounded">
        <p className="text-sm">No provider data available</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.provider,
    value: item.costCents / 100, // Convert to dollars
    raw: item,
  }));

  const totalCost = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-4">
      {/* Doughnut Chart */}
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getProviderColor(entry.raw.provider, index)}
                  stroke="#1a1a1a"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {data.map((item, index) => {
          const cost = item.costCents / 100;
          const percentage = totalCost > 0 ? ((item.costCents / 100 / totalCost) * 100).toFixed(0) : '0';
          const color = getProviderColor(item.provider, index);

          return (
            <div key={item.provider} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-neutral-300 capitalize">{item.provider}</span>
              </div>
              <span className="font-medium text-white">{formatCurrency(cost)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
