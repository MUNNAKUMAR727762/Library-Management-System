import { motion } from 'framer-motion';
import { Seat, Student } from '@/lib/mock-data';
import { useState } from 'react';
import { AlertTriangle, Clock3 } from 'lucide-react';

interface SeatCardProps {
  seat: Seat;
  student?: Student;
  reminderStatus?: 'due_soon' | 'overdue' | null;
  onClick: () => void;
}

const statusDot: Record<string, string> = {
  available: 'bg-status-available',
  occupied: 'bg-status-occupied',
  pending: 'bg-status-pending',
  disabled: 'bg-status-disabled',
};

const statusBg: Record<string, string> = {
  available: 'bg-status-available/10 ring-status-available/20 hover:bg-status-available/20',
  occupied: 'bg-status-occupied/10 ring-status-occupied/20 hover:bg-status-occupied/20',
  pending: 'bg-status-pending/10 ring-status-pending/20 hover:bg-status-pending/20',
  disabled: 'bg-status-disabled/10 ring-status-disabled/20',
};

const statusText: Record<string, string> = {
  available: 'text-status-available',
  occupied: 'text-status-occupied',
  pending: 'text-status-pending',
  disabled: 'text-status-disabled',
};

export function SeatCard({ seat, student, reminderStatus, onClick }: SeatCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isDisabled = seat.status === 'disabled';
  const shiftLabel = student?.shiftIds?.length ? student.shiftIds.join(', ') : student?.shift;
  const ReminderIcon = reminderStatus === 'overdue' ? AlertTriangle : reminderStatus === 'due_soon' ? Clock3 : null;
  const reminderStateClass =
    reminderStatus === 'overdue'
      ? 'ring-2 ring-status-overdue/70 shadow-[0_0_0_4px_hsl(var(--status-overdue)/0.16)] animate-seat-alert'
      : reminderStatus === 'due_soon'
        ? 'ring-2 ring-[hsl(var(--status-due-soon)/0.7)] shadow-[0_0_0_4px_hsl(var(--status-due-soon)/0.16)]'
        : '';
  const reminderDotClass =
    reminderStatus === 'overdue'
      ? 'bg-status-overdue animate-pulse'
      : reminderStatus === 'due_soon'
        ? 'bg-[hsl(var(--status-due-soon))] animate-pulse'
        : statusDot[seat.status];
  const reminderBadgeClass =
    reminderStatus === 'overdue'
      ? 'bg-status-overdue text-white'
      : 'bg-[hsl(var(--status-due-soon))] text-white';

  return (
    <div className="relative">
      <motion.button
        onClick={isDisabled ? undefined : onClick}
        onMouseEnter={() => student && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        whileHover={!isDisabled ? { scale: 1.05 } : {}}
        whileTap={!isDisabled ? { scale: 0.97 } : {}}
        transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
        className={`w-full aspect-[4/5] rounded-xl flex flex-col items-center justify-center gap-2 ring-1 transition-all duration-200 ${statusBg[seat.status]} ${reminderStateClass} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ willChange: 'transform' }}
      >
        {reminderStatus ? (
          <span className={`absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${reminderBadgeClass}`}>
            <span className="inline-flex items-center gap-1">
              {ReminderIcon ? <ReminderIcon size={11} /> : null}
              {reminderStatus === 'overdue' ? 'Overdue' : 'Due'}
            </span>
          </span>
        ) : null}
        <span className={`tabular-nums text-lg font-semibold ${statusText[seat.status]}`}>{seat.number}</span>
        <div className={`w-2.5 h-2.5 rounded-full ${reminderDotClass} transition-colors duration-200`} />
      </motion.button>

      {showTooltip && student ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 card-surface p-3 rounded-lg text-left pointer-events-none"
          style={{ boxShadow: 'var(--shadow-modal)' }}
        >
          <p className="text-sm font-semibold text-foreground">{student.name}</p>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p>Seat {student.seatNumber} | Shift {shiftLabel}</p>
            <p>Admitted: {student.admissionDate}</p>
            <p>Fee: Rs.{student.monthlyFee}/mo</p>
            {reminderStatus ? (
              <p className="inline-flex items-center gap-1 font-medium text-foreground">
                {ReminderIcon ? <ReminderIcon size={12} /> : null}
                Payment alert: {reminderStatus === 'overdue' ? 'Overdue' : 'Due soon'}
              </p>
            ) : null}
            <p className="flex items-center gap-1">
              Status:
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${student.status === 'active' ? 'bg-status-available' : 'bg-status-pending'}`} />
              <span className="capitalize">{student.status}</span>
            </p>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-card rotate-45 -mt-1.5" />
        </motion.div>
      ) : null}
    </div>
  );
}
