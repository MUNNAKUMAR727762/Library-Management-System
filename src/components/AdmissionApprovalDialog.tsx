import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { ShiftMultiSelect } from '@/components/ShiftMultiSelect';
import { AdmissionRequest } from '@/lib/mock-data';
import { extractApiError, useApp } from '@/contexts/AppContext';
import { DecoratedFieldShell, DecoratedLabel } from '@/components/FormFieldDecorators';
import { CheckCircle2, Clock3, CreditCard, FileText, Phone, User, Users, Wallet } from 'lucide-react';

interface AdmissionApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: AdmissionRequest | null;
}

export function AdmissionApprovalDialog({ open, onOpenChange, request }: AdmissionApprovalDialogProps) {
  const { approveAdmissionRequest, shifts } = useApp();
  const [monthlyFee, setMonthlyFee] = useState(800);
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('active');
  const [paymentStartMonth, setPaymentStartMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedShiftIds, setSelectedShiftIds] = useState<number[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptNumber, setReceiptNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fieldInputClassName = 'h-11 rounded-xl border-border/70 bg-background pl-12 text-sm shadow-sm focus-visible:ring-primary/30';
  const fieldSelectClassName = 'h-11 w-full rounded-xl border border-input border-border/70 bg-background pl-12 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/30';

  useEffect(() => {
    if (!open || !request) return;
    setMonthlyFee(800);
    setAdmissionDate(new Date().toISOString().slice(0, 10));
    setStatus('active');
    setPaymentStartMonth(new Date().toISOString().slice(0, 7));
    setPaymentMethod('cash');
    setPaymentStatus('paid');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setSelectedShiftIds(request.shiftIds?.length ? request.shiftIds : [request.shiftId]);
    setReceiptNumber(`GSL-${request.shiftId}-${request.seatNumber}`);
    setPaymentNotes('');
    setSaving(false);
    setError('');
  }, [open, request?.id]);

  if (!request) return null;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Approve Admission"
      description={`Review the student's submitted details first, then confirm admission, payment months, and receipt details for Seat ${request.seatNumber}.`}
      className="max-w-3xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setError('');
              if (monthlyFee <= 0 || monthlyFee > 50000) {
                setError('Monthly fee must be between 1 and 50000.');
                setSaving(false);
                return;
              }
              if (selectedShiftIds.length === 0 || selectedShiftIds.length > 3) {
                setError('Please select between 1 and 3 shifts for this student.');
                setSaving(false);
                return;
              }
              if (!/^\d{4}-\d{2}$/.test(paymentStartMonth)) {
                setError('First billing month must be in YYYY-MM format.');
                setSaving(false);
                return;
              }
              if (!receiptNumber.trim()) {
                setError('Receipt number is required for the first recorded payment.');
                setSaving(false);
                return;
              }
              try {
                await approveAdmissionRequest(request.id, {
                  monthly_fee: monthlyFee,
                  admission_date: admissionDate,
                  status,
                  shift_ids: selectedShiftIds,
                  payment_start_month: paymentStartMonth,
                  payment_method: paymentMethod,
                  payment_status: paymentStatus,
                  payment_date: paymentDate,
                  receipt_number: receiptNumber,
                  payment_notes: paymentNotes,
                });
                onOpenChange(false);
              } catch (submissionError) {
                setError(extractApiError(submissionError));
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Approving...' : 'Approve and Create Payments'}
          </Button>
        </>
      }
    >
      <div className="mb-4 rounded-xl border border-border bg-secondary/40 p-4">
        <p className="label-caps mb-3">Student Submitted Details</p>
        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
          <div className="overflow-hidden rounded-xl bg-background">
            {request.photoFileId ? (
              <img
                src={`/api/files/${request.photoFileId}`}
                alt={request.name}
                className="h-[120px] w-full object-cover"
              />
            ) : (
              <div className="flex h-[120px] items-center justify-center text-xs text-muted-foreground">No photo</div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-background px-3 py-2">
              <p className="label-caps mb-1">Student Name</p>
              <p className="text-sm font-medium text-foreground">{request.name}</p>
            </div>
            <div className="rounded-lg bg-background px-3 py-2">
              <p className="label-caps mb-1">Student Mobile Number</p>
              <p className="text-sm font-medium text-foreground">{request.mobile}</p>
            </div>
            <div className="rounded-lg bg-background px-3 py-2">
              <p className="label-caps mb-1">Requested Seat</p>
              <p className="text-sm font-medium text-foreground">Seat {request.seatNumber}</p>
            </div>
            <div className="rounded-lg bg-background px-3 py-2">
              <p className="label-caps mb-1">Requested Shift</p>
              <p className="text-sm font-medium text-foreground">
                {shifts.find((shift) => shift.id === request.shiftId)?.label ?? `Shift ${request.shiftId}`}
              </p>
            </div>
            <div className="rounded-lg bg-background px-3 py-2">
              <p className="label-caps mb-1">Father Name</p>
              <p className="text-sm font-medium text-foreground">{request.fatherName || '-'}</p>
            </div>
            <div className="rounded-lg bg-background px-3 py-2">
              <p className="label-caps mb-1">Father Mobile Number</p>
              <p className="text-sm font-medium text-foreground">{request.fatherNumber || '-'}</p>
            </div>
            <div className="rounded-lg bg-background px-3 py-2 sm:col-span-2">
              <p className="label-caps mb-1">Aadhar Number</p>
              <p className="text-sm font-medium text-foreground">{request.aadharNumber || '-'}</p>
            </div>
            <div className="rounded-lg bg-background px-3 py-2 sm:col-span-2">
              <p className="label-caps mb-1">Student Note</p>
              <p className="text-sm font-medium text-foreground">{request.notes || 'No note submitted by the student.'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-primary/10 bg-primary/5 p-4">
        <p className="label-caps mb-1">Admin Approval Setup</p>
        <p className="text-sm text-muted-foreground">
          These fields control the final student record, the selected shifts for the seat, the first recorded payment, and the rolling monthly ledger after approval.
        </p>
      </div>

      <div className="mb-4">
        <ShiftMultiSelect
          shifts={shifts}
          selectedShiftIds={selectedShiftIds}
          onChange={setSelectedShiftIds}
          label="Approved Shift Access"
          helperText="You can assign this seat for one shift or combine up to 3 shifts for the same student."
          labelIcon={Clock3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <DecoratedLabel htmlFor="monthly-fee" icon={Wallet}>Monthly Fee Amount</DecoratedLabel>
          <DecoratedFieldShell icon={Wallet}>
            <Input id="monthly-fee" type="number" value={monthlyFee} onChange={(event) => setMonthlyFee(Number(event.target.value))} className={fieldInputClassName} />
          </DecoratedFieldShell>
        </div>
        <div className="space-y-2">
          <DecoratedLabel htmlFor="admission-date-approve" icon={Clock3}>Final Admission Date</DecoratedLabel>
          <DecoratedFieldShell icon={Clock3}>
            <Input id="admission-date-approve" type="date" value={admissionDate} onChange={(event) => setAdmissionDate(event.target.value)} className={fieldInputClassName} />
          </DecoratedFieldShell>
        </div>
        <div className="space-y-2">
          <DecoratedLabel htmlFor="student-status-approve" icon={User}>Student Status After Approval</DecoratedLabel>
          <DecoratedFieldShell icon={User}>
            <select id="student-status-approve" value={status} onChange={(event) => setStatus(event.target.value)} className={fieldSelectClassName}>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
          </DecoratedFieldShell>
        </div>
        <div className="space-y-2">
          <DecoratedLabel htmlFor="payment-start-month" icon={Clock3}>First Billing Month</DecoratedLabel>
          <DecoratedFieldShell icon={Clock3}>
            <Input id="payment-start-month" type="month" value={paymentStartMonth} onChange={(event) => setPaymentStartMonth(event.target.value)} className={fieldInputClassName} />
          </DecoratedFieldShell>
        </div>
        <div className="space-y-2">
          <DecoratedLabel htmlFor="payment-date-approve" icon={Clock3}>Recorded Payment Date</DecoratedLabel>
          <DecoratedFieldShell icon={Clock3}>
            <Input id="payment-date-approve" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className={fieldInputClassName} />
          </DecoratedFieldShell>
        </div>
        <div className="space-y-2">
          <DecoratedLabel htmlFor="receipt-number-approve" icon={FileText}>Starting Receipt Number</DecoratedLabel>
          <DecoratedFieldShell icon={FileText}>
            <Input
              id="receipt-number-approve"
              value={receiptNumber}
              onChange={(event) => setReceiptNumber(event.target.value.toUpperCase())}
              placeholder="Example: GSL-2-7"
              className={fieldInputClassName}
            />
          </DecoratedFieldShell>
        </div>
        <div className="space-y-2">
          <DecoratedLabel htmlFor="payment-method-approve" icon={CreditCard}>Payment Method</DecoratedLabel>
          <DecoratedFieldShell icon={CreditCard}>
            <select id="payment-method-approve" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={fieldSelectClassName}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>
          </DecoratedFieldShell>
        </div>
        <div className="space-y-2">
          <DecoratedLabel htmlFor="payment-status-approve" icon={CheckCircle2}>Payment Status For Created Months</DecoratedLabel>
          <DecoratedFieldShell icon={CheckCircle2}>
            <select id="payment-status-approve" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className={fieldSelectClassName}>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </DecoratedFieldShell>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Due soon and overdue reminder states are generated automatically from the payment due date.
      </p>
      <div className="mt-4 space-y-2">
        <DecoratedLabel htmlFor="payment-notes-approve" icon={FileText}>Payment Notes</DecoratedLabel>
        <DecoratedFieldShell icon={FileText}>
          <Input id="payment-notes-approve" value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} placeholder="Optional notes for created payment records" className={fieldInputClassName} />
        </DecoratedFieldShell>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </ResponsiveModal>
  );
}
