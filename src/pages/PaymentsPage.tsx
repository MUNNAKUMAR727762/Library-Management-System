import { useMemo, useState } from 'react';
import { AlertTriangle, BellRing, CheckCircle2, Clock3, FileText, Plus, Printer, Sheet, Wallet } from 'lucide-react';
import { PaymentTable } from '@/components/PaymentTable';
import { Button } from '@/components/ui/button';
import { PaymentFormDialog } from '@/components/PaymentFormDialog';
import { useApp } from '@/contexts/AppContext';
import { downloadCsv, downloadWordDocument, openPrintWindow } from '@/lib/export';
import { Payment } from '@/lib/mock-data';

export default function PaymentsPage() {
  const { notifications, payments, shifts } = useApp();
  const [open, setOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const rows = payments.map((payment) => ({
    student: payment.studentName,
    seat: payment.seatNumber,
    shifts: payment.shiftIds.map((shiftId) => shifts.find((shift) => shift.id === shiftId)?.label ?? `Shift ${shiftId}`).join(', '),
    billingMonth: payment.month,
    receipt: payment.receiptNumber,
    amountPaid: payment.amountPaid,
    feeAmount: payment.feeAmount,
    method: payment.paymentMethod,
    status: payment.paymentStatus,
    paymentDate: payment.paymentDate,
  }));

  const reminderPayments = useMemo(() => {
    return notifications
      .filter((notification) => !notification.read && notification.entityType === 'payment_reminder' && notification.entityId)
      .map((notification) => {
        const [studentId, billingMonth] = String(notification.entityId).split(':');
        const payment = payments.find((item) => item.studentId === studentId && item.month === billingMonth && item.paymentStatus !== 'paid');
        if (!payment) return null;
        return { notification, payment };
      })
      .filter((item): item is { notification: typeof notifications[number]; payment: Payment } => Boolean(item))
      .sort((first, second) => first.payment.paymentDate.localeCompare(second.payment.paymentDate));
  }, [notifications, payments]);

  const reminderLegend = [
    {
      label: 'Pending',
      note: 'Unpaid, but reminder window has not started.',
      icon: Wallet,
      tone: 'bg-status-pending/10 text-status-pending border-status-pending/20',
    },
    {
      label: 'Due Soon',
      note: 'This matters for reminder follow-up. It appears 2 days before the due date.',
      icon: Clock3,
      tone: 'border-[hsl(var(--status-due-soon)/0.25)] bg-[hsl(var(--status-due-soon)/0.12)] text-[hsl(var(--status-due-soon))]',
    },
    {
      label: 'Overdue',
      note: 'This matters most. Payment is late and should be actioned first.',
      icon: AlertTriangle,
      tone: 'bg-status-overdue/10 text-status-overdue border-status-overdue/20',
    },
    {
      label: 'Paid',
      note: 'Closed successfully. No reminder stays active.',
      icon: CheckCircle2,
      tone: 'bg-status-available/10 text-status-available border-status-available/20',
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track and manage student payments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2 self-start" onClick={() => downloadCsv('payments-report.csv', rows)}>
            <Sheet size={16} /> Excel
          </Button>
          <Button
            variant="outline"
            className="gap-2 self-start"
            onClick={() => downloadWordDocument('payments-report.doc', 'Payments Report', `
              <h1>Payments Report</h1>
              <table>
                <thead><tr><th>Student</th><th>Seat</th><th>Shifts</th><th>Month</th><th>Receipt</th><th>Amount Paid</th><th>Fee</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>${rows.map((row) => `<tr><td>${row.student}</td><td>${row.seat ?? '-'}</td><td>${row.shifts}</td><td>${row.billingMonth}</td><td>${row.receipt}</td><td>${row.amountPaid}</td><td>${row.feeAmount}</td><td>${row.status}</td><td>${row.paymentDate}</td></tr>`).join('')}</tbody>
              </table>
            `)}
          >
            <FileText size={16} /> Word
          </Button>
          <Button
            variant="outline"
            className="gap-2 self-start"
            onClick={() => openPrintWindow('Payments Report', `
              <h1>Payments Report</h1>
              <table>
                <thead><tr><th>Student</th><th>Seat</th><th>Shifts</th><th>Month</th><th>Receipt</th><th>Amount Paid</th><th>Fee</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>${rows.map((row) => `<tr><td>${row.student}</td><td>${row.seat ?? '-'}</td><td>${row.shifts}</td><td>${row.billingMonth}</td><td>${row.receipt}</td><td>${row.amountPaid}</td><td>${row.feeAmount}</td><td>${row.status}</td><td>${row.paymentDate}</td></tr>`).join('')}</tbody>
              </table>
            `)}
          >
            <Printer size={16} /> Print / PDF
          </Button>
          <Button className="gap-2 self-start" onClick={() => setOpen(true)}>
            <Plus size={16} /> Add Payment
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <BellRing size={18} />
              <h2 className="text-lg font-semibold text-foreground">Payment Reminders</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Reminders appear 2 days before the student's next due date and stay here until that payment month is marked paid.
            </p>
          </div>
          <div className="rounded-full bg-background px-3 py-1 text-sm font-medium text-primary">
            {reminderPayments.length} active reminder{reminderPayments.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {reminderLegend.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-xl border px-4 py-3 ${item.tone}`}>
                <div className="flex items-center gap-2">
                  <Icon size={16} />
                  <p className="text-sm font-semibold">{item.label}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-foreground/80">{item.note}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl border border-status-overdue/20 bg-background px-4 py-3 text-sm">
          <p className="font-medium text-foreground">Reminder priority</p>
          <p className="mt-1 text-muted-foreground">
            Focus first on <span className="font-medium text-status-overdue">Overdue</span> payments, then on <span className="font-medium text-[hsl(var(--status-due-soon))]">Due Soon</span>. A plain <span className="font-medium text-status-pending">Pending</span> payment is not yet in the reminder window.
          </p>
        </div>

        {reminderPayments.length === 0 ? (
          <div className="mt-4 rounded-xl bg-background px-4 py-6 text-sm text-muted-foreground">
            No active reminders right now. When a payment reaches its reminder window, it will appear here.
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {reminderPayments.map(({ notification, payment }) => (
              <div key={notification.id} className="rounded-xl bg-background px-4 py-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {payment.studentName} • {payment.month}
                      </p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                        payment.paymentStatus === 'overdue'
                          ? 'bg-status-overdue/10 text-status-overdue'
                          : 'bg-[hsl(var(--status-due-soon)/0.14)] text-[hsl(var(--status-due-soon))]'
                      }`}>
                        {payment.paymentStatus === 'overdue' ? <AlertTriangle size={12} /> : <Clock3 size={12} />}
                        {payment.paymentStatus === 'overdue' ? 'Overdue' : 'Due Soon'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Receipt: {payment.receiptNumber}</span>
                      <span>Due date: {payment.paymentDate}</span>
                      <span>Amount: Rs.{payment.feeAmount}</span>
                    </div>
                  </div>
                  <Button
                    className="self-start lg:self-auto"
                    onClick={() => {
                      setOpen(false);
                      setSelectedPayment(payment);
                      setOpen(true);
                    }}
                  >
                    Update Payment
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PaymentTable />

      <PaymentFormDialog
        key={`payment-${selectedPayment?.id ?? 'new'}-${open ? 'open' : 'closed'}`}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setSelectedPayment(null);
          }
        }}
        payment={selectedPayment}
        initialStudentId={selectedPayment?.studentId}
        lockStudent={Boolean(selectedPayment)}
      />
    </div>
  );
}
