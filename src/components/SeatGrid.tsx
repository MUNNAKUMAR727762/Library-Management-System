import { useApp } from '@/contexts/AppContext';
import { SeatCard } from '@/components/SeatCard';
import { Seat } from '@/lib/mock-data';
import { useState } from 'react';
import { StudentDetailModal } from '@/components/StudentDetailModal';
import { QRCodePopup } from '@/components/QRCodePopup';
import { AlertTriangle, CheckCircle2, Clock3, Wallet } from 'lucide-react';

export function SeatGrid() {
  const { seats, students, payments, activeShift } = useApp();
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [showStudent, setShowStudent] = useState(false);

  const shiftSeats = seats.filter(s => s.shift === activeShift);
  const reminderStatusByStudentId = payments.reduce<Record<string, 'due_soon' | 'overdue'>>((map, payment) => {
    if (payment.paymentStatus === 'overdue') {
      map[payment.studentId] = 'overdue';
    } else if (payment.paymentStatus === 'due_soon' && !map[payment.studentId]) {
      map[payment.studentId] = 'due_soon';
    }
    return map;
  }, {});

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === 'occupied' || seat.status === 'pending') {
      setSelectedSeat(seat);
      setShowStudent(true);
    } else if (seat.status === 'available') {
      setSelectedSeat(seat);
      setShowQR(true);
    }
  };

  const selectedStudent = selectedSeat?.studentId
    ? students.find(s => s.id === selectedSeat.studentId)
    : undefined;

  const legendItems = [
    { label: 'Available', color: 'bg-status-available', icon: CheckCircle2, note: 'Seat is free' },
    { label: 'Occupied', color: 'bg-status-occupied', icon: CheckCircle2, note: 'Seat is assigned' },
    { label: 'Pending', color: 'bg-status-pending', icon: Wallet, note: 'Payment open, no reminder yet' },
    { label: 'Due Soon Alert', color: 'bg-[hsl(var(--status-due-soon))]', icon: Clock3, note: 'Reminder starts 2 days before due date' },
    { label: 'Overdue Alert', color: 'bg-status-overdue', icon: AlertTriangle, note: 'Needs immediate payment follow-up' },
    { label: 'Disabled', color: 'bg-status-disabled', icon: Wallet, note: 'Seat blocked from use' },
  ] as const;

  return (
    <>
      <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
        {shiftSeats.map(seat => (
          <SeatCard
            key={seat.number}
            seat={seat}
            student={students.find(s => s.id === seat.studentId)}
            reminderStatus={seat.studentId ? reminderStatusByStudentId[seat.studentId] ?? null : null}
            onClick={() => handleSeatClick(seat)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">Payment reminder states that matter</p>
          <p className="mt-1 text-muted-foreground">
            Only <span className="font-medium text-foreground">Due Soon</span> and <span className="font-medium text-foreground">Overdue</span> trigger seat alerts and payment reminder follow-up. Plain <span className="font-medium text-foreground">Pending</span> means unpaid, but the reminder window has not started yet.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {legendItems.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-2 rounded-full bg-secondary/50 px-3 py-2">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <Icon size={14} className="text-foreground/80" />
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="hidden text-muted-foreground md:inline">{item.note}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showStudent && selectedSeat?.studentId && (
        <StudentDetailModal
          studentId={selectedSeat.studentId}
          initialStudent={selectedStudent}
          onClose={() => { setShowStudent(false); setSelectedSeat(null); }}
        />
      )}

      {showQR && selectedSeat && (
        <QRCodePopup
          seat={selectedSeat}
          onClose={() => { setShowQR(false); setSelectedSeat(null); }}
        />
      )}
    </>
  );
}
