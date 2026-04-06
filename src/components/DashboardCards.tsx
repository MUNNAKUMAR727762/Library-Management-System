import { Armchair, Users, CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';

export function DashboardCards() {
  const { dashboardSummary } = useApp();

  const cards = [
    { label: 'Total Seats', value: String(dashboardSummary.totalSeats), icon: Armchair, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Occupied', value: String(dashboardSummary.occupied), icon: CheckCircle, color: 'text-status-occupied', bg: 'bg-status-occupied/10' },
    { label: 'Available', value: String(dashboardSummary.available), icon: Clock, color: 'text-status-available', bg: 'bg-status-available/10' },
    { label: 'Total Students', value: String(dashboardSummary.totalStudents), icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Monthly Revenue', value: `Rs.${dashboardSummary.monthlyRevenue.toLocaleString('en-IN')}`, icon: CreditCard, color: 'text-status-available', bg: 'bg-status-available/10' },
    { label: 'Pending Payments', value: String(dashboardSummary.pendingPayments), icon: AlertTriangle, color: 'text-accent', bg: 'bg-accent/10' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, type: 'spring', duration: 0.4, bounce: 0 }}
          className="card-surface p-4 rounded-xl"
        >
          <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
            <card.icon size={18} className={card.color} />
          </div>
          <p className="label-caps">{card.label}</p>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">{card.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
