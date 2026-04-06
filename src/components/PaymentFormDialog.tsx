import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useApp, extractApiError } from '@/contexts/AppContext';
import { Payment } from '@/lib/mock-data';
import { AlertTriangle, CheckCircle2, Clock3, CreditCard, FileText, Loader2, User, Wallet } from 'lucide-react';
import { DecoratedFieldShell, DecoratedLabel } from '@/components/FormFieldDecorators';

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: Payment | null;
  initialStudentId?: string;
  lockStudent?: boolean;
}

export function PaymentFormDialog({ open, onOpenChange, payment, initialStudentId, lockStudent = false }: PaymentFormDialogProps) {
  const { students, addPayment, updatePayment } = useApp();
  const [form, setForm] = useState({
    studentId: '',
    billingMonth: '',
    feeAmount: 800,
    amountPaid: 800,
    receiptNumber: '',
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    paymentDate: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fieldInputClassName = 'h-11 rounded-xl border-border/70 bg-background pl-12 text-sm shadow-sm focus-visible:ring-primary/30';
  const fieldSelectClassName = 'h-11 w-full rounded-xl border border-input border-border/70 bg-background pl-12 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/30';

  useEffect(() => {
    setForm({
      studentId: payment?.studentId ?? initialStudentId ?? students[0]?.id ?? '',
      billingMonth: payment?.month ?? new Date().toISOString().slice(0, 7),
      feeAmount: payment?.feeAmount ?? 800,
      amountPaid: payment?.amountPaid ?? 800,
      receiptNumber: payment?.receiptNumber ?? '',
      paymentMethod: payment?.paymentMethod ?? 'cash',
      paymentStatus: payment?.paymentStatus === 'paid' ? 'paid' : 'pending',
      paymentDate: payment?.paymentDate ?? new Date().toISOString().slice(0, 10),
      notes: payment?.notes ?? '',
    });
    setError('');
    setSaving(false);
  }, [initialStudentId, open, payment, students]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    if (!form.studentId) {
      setError('Please select a student.');
      setSaving(false);
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(form.billingMonth)) {
      setError('Billing month must be in YYYY-MM format.');
      setSaving(false);
      return;
    }
    if (form.feeAmount <= 0 || form.feeAmount > 50000) {
      setError('Fee amount must be between 1 and 50000.');
      setSaving(false);
      return;
    }
    if (form.amountPaid < 0 || form.amountPaid > 50000) {
      setError('Amount paid must be between 0 and 50000.');
      setSaving(false);
      return;
    }
    if (form.amountPaid > form.feeAmount) {
      setError('Amount paid cannot be greater than fee amount.');
      setSaving(false);
      return;
    }
    if (form.receiptNumber && !/^[A-Z0-9/_-]{1,40}$/.test(form.receiptNumber)) {
      setError('Receipt number can only use letters, numbers, slash, dash, and underscore.');
      setSaving(false);
      return;
    }
    try {
      const normalizedStatus = Number(form.amountPaid) >= Number(form.feeAmount) ? 'paid' : form.paymentStatus;
      const payload = {
        student_id: form.studentId,
        billing_month: form.billingMonth,
        fee_amount: Number(form.feeAmount),
        amount_paid: Number(form.amountPaid),
        receipt_number: form.receiptNumber || undefined,
        payment_method: form.paymentMethod,
        payment_status: normalizedStatus,
        payment_date: form.paymentDate,
        notes: form.notes,
      };
      if (payment) {
        await updatePayment(payment.id, payload);
      } else {
        await addPayment(payload);
      }
      onOpenChange(false);
    } catch (submissionError) {
      setError(extractApiError(submissionError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{payment ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <DecoratedLabel htmlFor="payment-student" icon={User}>Student</DecoratedLabel>
            <DecoratedFieldShell icon={User}>
              <select
                id="payment-student"
                value={form.studentId}
                onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}
                disabled={lockStudent}
                className={fieldSelectClassName}
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </DecoratedFieldShell>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <DecoratedLabel htmlFor="billing-month" icon={Clock3}>Billing Month</DecoratedLabel>
              <DecoratedFieldShell icon={Clock3}>
                <Input
                  id="billing-month"
                  type="month"
                  value={form.billingMonth}
                  onChange={(event) => setForm((current) => ({ ...current, billingMonth: event.target.value }))}
                  className={fieldInputClassName}
                />
              </DecoratedFieldShell>
            </div>
            <div className="space-y-2">
              <DecoratedLabel htmlFor="payment-date" icon={Clock3}>Payment Date</DecoratedLabel>
              <DecoratedFieldShell icon={Clock3}>
                <Input
                  id="payment-date"
                  type="date"
                  value={form.paymentDate}
                  onChange={(event) => setForm((current) => ({ ...current, paymentDate: event.target.value }))}
                  className={fieldInputClassName}
                />
              </DecoratedFieldShell>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <DecoratedLabel htmlFor="fee-amount" icon={Wallet}>Fee Amount</DecoratedLabel>
              <DecoratedFieldShell icon={Wallet}>
                <Input
                  id="fee-amount"
                  type="number"
                  value={form.feeAmount}
                  onChange={(event) => setForm((current) => ({ ...current, feeAmount: Number(event.target.value) }))}
                  className={fieldInputClassName}
                />
              </DecoratedFieldShell>
            </div>
            <div className="space-y-2">
              <DecoratedLabel htmlFor="amount-paid" icon={Wallet}>Amount Paid</DecoratedLabel>
              <DecoratedFieldShell icon={Wallet}>
                <Input
                  id="amount-paid"
                  type="number"
                  value={form.amountPaid}
                  onChange={(event) => setForm((current) => ({ ...current, amountPaid: Number(event.target.value) }))}
                  className={fieldInputClassName}
                />
              </DecoratedFieldShell>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <DecoratedLabel htmlFor="payment-method" icon={CreditCard}>Method</DecoratedLabel>
              <DecoratedFieldShell icon={CreditCard}>
                <select
                  id="payment-method"
                  value={form.paymentMethod}
                  onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
                  className={fieldSelectClassName}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                </select>
              </DecoratedFieldShell>
            </div>
            <div className="space-y-2">
              <DecoratedLabel htmlFor="payment-status" icon={CheckCircle2}>Status</DecoratedLabel>
              <DecoratedFieldShell icon={CheckCircle2}>
                <select
                  id="payment-status"
                  value={form.paymentStatus}
                  onChange={(event) => setForm((current) => ({ ...current, paymentStatus: event.target.value }))}
                  className={fieldSelectClassName}
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </DecoratedFieldShell>
            </div>
          </div>
          <div className="rounded-lg border border-primary/10 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Reminder states are automatic</p>
            <div className="mt-1 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1">
                <Clock3 size={12} className="text-[hsl(var(--status-due-soon))]" />
                Due Soon matters for reminders
              </span>
              <span className="inline-flex items-center gap-1">
                <AlertTriangle size={12} className="text-status-overdue" />
                Overdue is highest priority
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <DecoratedLabel htmlFor="receipt-number" icon={FileText}>Receipt Number</DecoratedLabel>
            <DecoratedFieldShell icon={FileText}>
              <Input
                id="receipt-number"
                value={form.receiptNumber}
                onChange={(event) => setForm((current) => ({ ...current, receiptNumber: event.target.value.toUpperCase() }))}
                placeholder="Optional custom receipt number"
                className={fieldInputClassName}
              />
            </DecoratedFieldShell>
          </div>
          <div className="space-y-2">
            <DecoratedLabel htmlFor="payment-notes" icon={FileText}>Notes</DecoratedLabel>
            <DecoratedFieldShell icon={FileText}>
              <Input
                id="payment-notes"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className={fieldInputClassName}
              />
            </DecoratedFieldShell>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? 'Saving...' : payment ? 'Save Payment' : 'Create Payment'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
