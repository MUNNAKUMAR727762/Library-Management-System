import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AlertTriangle, CheckCircle2, Clock3, Wallet } from 'lucide-react';

export function PaymentTable() {
  const { payments, searchQuery, shifts } = useApp();
  const [monthFilter, setMonthFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = payments.filter((payment) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!payment.studentName.toLowerCase().includes(query) && !String(payment.seatNumber ?? '').includes(query)) {
        return false;
      }
    }
    if (monthFilter && payment.month !== monthFilter) return false;
    if (shiftFilter && !payment.shiftIds.map(String).includes(shiftFilter)) return false;
    if (statusFilter && payment.paymentStatus !== statusFilter) return false;
    return true;
  });

  const months = Array.from(new Set(payments.map((payment) => payment.month))).sort();

  const statusStyle = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-status-available/10 text-status-available';
      case 'pending':
        return 'bg-status-occupied/10 text-status-occupied';
      case 'due_soon':
        return 'bg-[hsl(var(--status-due-soon)/0.12)] text-[hsl(var(--status-due-soon))]';
      case 'overdue':
        return 'bg-status-overdue/10 text-status-overdue';
      default:
        return '';
    }
  };

  const getShiftLabel = (shiftIds: number[]) =>
    shiftIds.map((shiftId) => shifts.find((shift) => shift.id === shiftId)?.label ?? `Shift ${shiftId}`).join(', ');

  const statusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 size={14} className="shrink-0" />;
      case 'pending':
        return <Wallet size={14} className="shrink-0" />;
      case 'due_soon':
        return <Clock3 size={14} className="shrink-0" />;
      case 'overdue':
        return <AlertTriangle size={14} className="shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={monthFilter}
          onChange={(event) => setMonthFilter(event.target.value)}
          className="text-sm px-3 py-2 rounded-lg bg-secondary text-foreground border-0 focus:ring-2 focus:ring-ring/40"
        >
          <option value="">All Months</option>
          {months.map((month) => <option key={month} value={month}>{month}</option>)}
        </select>
        <select
          value={shiftFilter}
          onChange={(event) => setShiftFilter(event.target.value)}
          className="text-sm px-3 py-2 rounded-lg bg-secondary text-foreground border-0 focus:ring-2 focus:ring-ring/40"
        >
          <option value="">All Shifts</option>
          {shifts.map((shift) => <option key={shift.id} value={String(shift.id)}>{shift.label}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="text-sm px-3 py-2 rounded-lg bg-secondary text-foreground border-0 focus:ring-2 focus:ring-ring/40"
        >
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="due_soon">Due Soon</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="card-surface rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Student', 'Seat', 'Shift', 'Month', 'Amount', 'Method', 'Receipt', 'Status', 'Date'].map((header) => (
                  <th key={header} className="text-left px-4 py-3 label-caps whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No payments found.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 50).map((payment) => (
                  <tr key={payment.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">{payment.studentName}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-foreground">#{payment.seatNumber ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{payment.shiftIds.length ? getShiftLabel(payment.shiftIds) : '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{payment.month}</td>
                    <td className="px-4 py-3 text-sm tabular-nums font-medium text-foreground">Rs.{payment.amountPaid}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground uppercase">{payment.paymentMethod}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{payment.receiptNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${statusStyle(payment.paymentStatus)}`}>
                        {statusIcon(payment.paymentStatus)}
                        {payment.paymentStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{payment.paymentDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
