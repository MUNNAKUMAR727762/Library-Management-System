import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useApp } from '@/contexts/AppContext';

const COLORS = {
  primary: 'hsl(221, 83%, 53%)',
  accent: 'hsl(38, 92%, 50%)',
  available: 'hsl(142, 71%, 45%)',
  occupied: 'hsl(0, 72%, 51%)',
  pending: 'hsl(48, 96%, 57%)',
};

const pieColors = [COLORS.available, COLORS.pending, COLORS.accent, COLORS.occupied];

export function DashboardCharts() {
  const { dashboardCharts } = useApp();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="card-surface p-5 rounded-xl">
        <h3 className="text-sm font-semibold text-foreground mb-4">Seat Usage by Shift</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dashboardCharts.shiftUsage}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }} />
            <Bar dataKey="occupied" fill={COLORS.occupied} radius={[4, 4, 0, 0]} />
            <Bar dataKey="available" fill={COLORS.available} radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending" fill={COLORS.pending} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card-surface p-5 rounded-xl">
        <h3 className="text-sm font-semibold text-foreground mb-4">Payment Status</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={dashboardCharts.paymentStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
              {dashboardCharts.paymentStatus.map((entry, index) => (
                <Cell key={entry.name} fill={pieColors[index] || COLORS.primary} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {dashboardCharts.paymentStatus.map((item, index) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pieColors[index] || COLORS.primary }} />
              {item.name}
            </div>
          ))}
        </div>
      </div>

      <div className="card-surface p-5 rounded-xl">
        <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Revenue</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dashboardCharts.revenue}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}
              formatter={(value: number) => [`Rs.${value.toLocaleString('en-IN')}`, 'Revenue']}
            />
            <Bar dataKey="revenue" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
