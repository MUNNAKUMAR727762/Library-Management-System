import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Edit,
  CreditCard,
  ArrowRightLeft,
  UserMinus,
  User,
  Clock,
  History,
  Printer,
  Sheet,
  FileText,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { Payment, Student, StudentHistoryEntry } from '@/lib/mock-data';
import { useApp } from '@/contexts/AppContext';
import { paymentsApi, studentsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PaymentFormDialog } from '@/components/PaymentFormDialog';
import { SeatChangeDialog } from '@/components/SeatChangeDialog';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { StudentFormDialog } from '@/components/StudentFormDialog';
import { downloadCsv, downloadWordDocument, openPrintWindow } from '@/lib/export';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  studentId: string;
  initialStudent?: Student | null;
  initialTab?: string;
  highlightBillingMonth?: string;
  onClose: () => void;
}

const historyIcons: Record<string, typeof Clock> = {
  admission: User,
  payment: CreditCard,
  seat_change: ArrowRightLeft,
  status_change: Clock,
  edit: Edit,
};

function getNextMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return '';
  const [yearText, monthText] = month.split('-');
  const baseYear = Number(yearText);
  const baseMonth = Number(monthText);
  const nextDate = new Date(baseYear, baseMonth, 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
}

function formatHistoryValue(value: unknown) {
  if (value && typeof value === 'object' && 'from' in (value as Record<string, unknown>) && 'to' in (value as Record<string, unknown>)) {
    const change = value as { from?: unknown; to?: unknown };
    return `${String(change.from ?? '-')} -> ${String(change.to ?? '-')}`;
  }
  return String(value ?? '-');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
          className="relative z-10 w-full max-w-5xl overflow-hidden rounded-xl card-surface"
          style={{ boxShadow: 'var(--shadow-modal)' }}
        >
          {children}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function TabSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center gap-3 text-sm text-muted-foreground">
      <Loader2 size={18} className="animate-spin text-primary" />
      {label}
    </div>
  );
}

export function StudentDetailModal({
  studentId,
  initialStudent = null,
  initialTab = 'overview',
  highlightBillingMonth,
  onClose,
}: Props) {
  const { removeStudent, shifts } = useApp();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(initialTab);
  const [showSeatDialog, setShowSeatDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    setTab(initialTab || (highlightBillingMonth ? 'payments' : 'overview'));
  }, [highlightBillingMonth, initialTab, studentId]);

  const paymentsNeeded = tab === 'overview' || tab === 'payments' || tab === 'documents' || Boolean(highlightBillingMonth);
  const historyNeeded = tab === 'timeline';

  const studentQuery = useQuery<Student>({
    queryKey: ['student', studentId],
    queryFn: () => studentsApi.getOne(studentId),
    placeholderData: initialStudent ?? undefined,
  });

  const paymentsQuery = useQuery<Payment[]>({
    queryKey: ['student-payments', studentId],
    queryFn: () => paymentsApi.getAll(studentId),
    enabled: Boolean(studentId) && paymentsNeeded,
    staleTime: 60000,
  });

  const historyQuery = useQuery<StudentHistoryEntry[]>({
    queryKey: ['student-history', studentId],
    queryFn: () => studentsApi.history(studentId),
    enabled: Boolean(studentId) && historyNeeded,
    staleTime: 60000,
  });

  const student = studentQuery.data;

  const studentPayments = useMemo(
    () => (paymentsQuery.data ?? [])
      .slice()
      .sort((first, second) => second.month.localeCompare(first.month) || second.paymentDate.localeCompare(first.paymentDate)),
    [paymentsQuery.data],
  );
  const studentHistory = historyQuery.data ?? student?.history ?? [];

  if (!student) {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex items-center justify-between border-b border-border p-6">
          <h2 className="text-lg font-semibold text-foreground">Student Details</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          {studentQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load the student record right now.</p>
          ) : (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 size={18} className="animate-spin text-primary" />
              Loading student record...
            </div>
          )}
        </div>
      </ModalShell>
    );
  }

  const shift = shifts.find((item) => item.id === student.shift);
  const latestPayment = studentPayments[0];
  const nextDueMonth = latestPayment ? getNextMonth(latestPayment.month) : getNextMonth(student.admissionDate.slice(0, 7));
  const previousReceipt = studentPayments[1]?.receiptNumber || '-';
  const pendingPayments = studentPayments
    .filter((payment) => payment.paymentStatus !== 'paid')
    .sort((first, second) => first.month.localeCompare(second.month));
  const pendingMonths = pendingPayments.length;
  const oldestUnpaidMonth = pendingPayments[0]?.month || '-';
  const outstandingAmount = studentPayments
    .filter((payment) => payment.paymentStatus !== 'paid')
    .reduce((sum, payment) => sum + Math.max(payment.feeAmount - payment.amountPaid, 0), 0);
  const shiftLabels = student.shiftIds.map((shiftId) => shifts.find((item) => item.id === shiftId)?.label ?? `Shift ${shiftId}`).join(', ');
  const uploadedPhotoLabel = student.photo ? 'Uploaded and linked to this student record' : 'No uploaded photo is linked yet';
  const activeTabFetching = studentQuery.isFetching || (paymentsNeeded && paymentsQuery.isFetching) || (historyNeeded && historyQuery.isFetching);

  const ensureExportData = async () => {
    const [payments, history] = await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ['student-payments', studentId],
        queryFn: () => paymentsApi.getAll(studentId),
      }),
      queryClient.ensureQueryData({
        queryKey: ['student-history', studentId],
        queryFn: () => studentsApi.history(studentId),
      }),
    ]);
    return {
      payments: payments
        .slice()
        .sort((first, second) => second.month.localeCompare(first.month) || second.paymentDate.localeCompare(first.paymentDate)),
      history,
    };
  };

  const buildStudentRecordHtml = (payments: Payment[], history: StudentHistoryEntry[]) => `
    <h1>${escapeHtml(student.name)}</h1>
    <p class="muted">Seat ${student.seatNumber} | ${escapeHtml(shiftLabels)}</p>
    <h2>Profile</h2>
    <table>
      <tbody>
        <tr><th>Student Name</th><td>${escapeHtml(student.name)}</td></tr>
        <tr><th>Student Mobile</th><td>${escapeHtml(student.mobile)}</td></tr>
        <tr><th>Father Name</th><td>${escapeHtml(student.fatherName || '-')}</td></tr>
        <tr><th>Father Mobile</th><td>${escapeHtml(student.fatherNumber || '-')}</td></tr>
        <tr><th>Aadhar Number</th><td>${escapeHtml(student.aadharNumber || '-')}</td></tr>
        <tr><th>Admission Date</th><td>${escapeHtml(student.admissionDate)}</td></tr>
        <tr><th>Status</th><td>${escapeHtml(student.status)}</td></tr>
        <tr><th>Monthly Fee</th><td>Rs.${student.monthlyFee}</td></tr>
        <tr><th>Latest Receipt</th><td>${escapeHtml(payments[0]?.receiptNumber || '-')}</td></tr>
        <tr><th>Oldest Unpaid Month</th><td>${escapeHtml(oldestUnpaidMonth)}</td></tr>
        <tr><th>Next Due Month</th><td>${escapeHtml(nextDueMonth || '-')}</td></tr>
        <tr><th>Outstanding Amount</th><td>Rs.${outstandingAmount}</td></tr>
      </tbody>
    </table>
    <h2>Payment Ledger</h2>
    <table>
      <thead><tr><th>Month</th><th>Receipt</th><th>Status</th><th>Fee</th><th>Paid</th><th>Date</th><th>Method</th></tr></thead>
      <tbody>
        ${payments.map((payment) => `<tr><td>${escapeHtml(payment.month)}</td><td>${escapeHtml(payment.receiptNumber)}</td><td>${escapeHtml(payment.paymentStatus)}</td><td>Rs.${payment.feeAmount}</td><td>Rs.${payment.amountPaid}</td><td>${escapeHtml(payment.paymentDate)}</td><td>${escapeHtml(payment.paymentMethod.toUpperCase())}</td></tr>`).join('')}
      </tbody>
    </table>
    <h2>Timeline</h2>
    <table>
      <thead><tr><th>Date</th><th>Action</th><th>Actor</th><th>Details</th></tr></thead>
      <tbody>
        ${history.map((entry) => `<tr><td>${escapeHtml(entry.date)}</td><td>${escapeHtml(entry.description)}</td><td>${escapeHtml(entry.actorName || '-')}</td><td>${escapeHtml(entry.details || '-')}</td></tr>`).join('')}
      </tbody>
    </table>
  `;

  return (
    <>
      <ModalShell onClose={onClose}>
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Student Details</h2>
            {activeTabFetching ? <Loader2 size={16} className="animate-spin text-primary" /> : null}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="gap-1.5"><User size={14} />Overview</TabsTrigger>
              <TabsTrigger value="payments" className="gap-1.5"><CreditCard size={14} />Payments</TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1.5"><History size={14} />Timeline</TabsTrigger>
              <TabsTrigger value="documents" className="gap-1.5"><FolderOpen size={14} />Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {!paymentsQuery.data && paymentsQuery.isLoading ? (
                <TabSpinner label="Loading payment summary..." />
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
                      {student.photo ? (
                        <img src={student.photo} alt={student.name} className="h-full w-full object-cover" />
                      ) : (
                        <User size={28} className="text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{student.name}</h3>
                      <p className="text-sm text-muted-foreground">{student.mobile}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Seat', value: `#${student.seatNumber}` },
                      { label: 'Shift', value: shiftLabels || shift?.label || '' },
                      { label: 'Admission', value: student.admissionDate },
                      { label: 'Monthly Fee', value: `Rs.${student.monthlyFee}` },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg bg-secondary p-3">
                        <p className="label-caps mb-1">{item.label}</p>
                        <p className="text-sm font-semibold tabular-nums text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {student.fatherName || student.fatherNumber || student.aadharNumber ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {student.fatherName ? (
                        <div className="rounded-lg bg-secondary p-3">
                          <p className="label-caps mb-1">Father Name</p>
                          <p className="text-sm font-semibold text-foreground">{student.fatherName}</p>
                        </div>
                      ) : null}
                      {student.fatherNumber ? (
                        <div className="rounded-lg bg-secondary p-3">
                          <p className="label-caps mb-1">Father Mobile Number</p>
                          <p className="text-sm font-semibold text-foreground">{student.fatherNumber}</p>
                        </div>
                      ) : null}
                      {student.aadharNumber ? (
                        <div className="rounded-lg bg-secondary p-3">
                          <p className="label-caps mb-1">Aadhar Number</p>
                          <p className="text-sm font-semibold text-foreground">{student.aadharNumber}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                    <p className="label-caps mb-2">Payment Reminder</p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Next month to follow up</p>
                        <p className="text-xs text-muted-foreground">
                          {nextDueMonth || 'No payment month available yet'} {latestPayment ? `after receipt ${latestPayment.receiptNumber}` : 'after admission'}
                        </p>
                      </div>
                      <div className="rounded-full bg-background px-3 py-1 text-sm font-semibold text-primary">
                        {nextDueMonth || 'Pending'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="label-caps mb-1">Latest Receipt</p>
                      <p className="text-sm font-semibold text-foreground">{latestPayment?.receiptNumber || '-'}</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="label-caps mb-1">Pending Months</p>
                      <p className="text-sm font-semibold text-foreground">{pendingMonths}</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="label-caps mb-1">Outstanding Amount</p>
                      <p className="text-sm font-semibold text-foreground">Rs.{outstandingAmount}</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="label-caps mb-1">Oldest Unpaid</p>
                      <p className="text-sm font-semibold text-foreground">{oldestUnpaidMonth}</p>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              {!paymentsQuery.data && paymentsQuery.isLoading ? (
                <TabSpinner label="Loading payment history..." />
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="label-caps mb-1">Latest Receipt</p>
                      <p className="text-sm font-semibold text-foreground">{latestPayment?.receiptNumber || '-'}</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="label-caps mb-1">Pending Months</p>
                      <p className="text-sm font-semibold text-foreground">{pendingMonths}</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="label-caps mb-1">Outstanding Amount</p>
                      <p className="text-sm font-semibold text-foreground">Rs.{outstandingAmount}</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="label-caps mb-1">Oldest Unpaid</p>
                      <p className="text-sm font-semibold text-foreground">{oldestUnpaidMonth}</p>
                    </div>
                  </div>
                  {studentPayments.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No payment record yet.</p>
                  ) : (
                    <div>
                      <p className="label-caps mb-2">Monthly Track Record</p>
                      <div className="space-y-2">
                        {studentPayments.map((payment, index) => (
                          <div
                            key={payment.id}
                            className={`rounded-lg px-3 py-3 text-sm ${
                              highlightBillingMonth === payment.month
                                ? 'border border-primary bg-primary/5 shadow-sm'
                                : 'bg-secondary'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-foreground">{payment.month}</span>
                              <div className="flex items-center gap-2">
                                {highlightBillingMonth === payment.month ? (
                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                    Requested from reminder
                                  </span>
                                ) : null}
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  payment.paymentStatus === 'paid' ? 'bg-status-available/10 text-status-available' :
                                  payment.paymentStatus === 'overdue' ? 'bg-status-overdue/10 text-status-overdue' :
                                  payment.paymentStatus === 'due_soon' ? 'bg-[hsl(var(--status-due-soon)/0.12)] text-[hsl(var(--status-due-soon))]' :
                                  'bg-status-pending/10 text-status-pending'
                                }`}>
                                  {payment.paymentStatus.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                              <p>Receipt: <span className="font-medium text-foreground">{payment.receiptNumber}</span></p>
                              <p>Paid: <span className="font-medium text-foreground">Rs.{payment.amountPaid}</span></p>
                              <p>Fee: <span className="font-medium text-foreground">Rs.{payment.feeAmount}</span></p>
                              <p>Date: <span className="font-medium text-foreground">{payment.paymentDate}</span></p>
                              <p>Method: <span className="font-medium text-foreground">{payment.paymentMethod.toUpperCase()}</span></p>
                              <p>Previous Receipt: <span className="font-medium text-foreground">{studentPayments[index + 1]?.receiptNumber ?? '-'}</span></p>
                            </div>
                            {payment.notes ? (
                              <p className="mt-2 text-xs text-muted-foreground">Note: {payment.notes}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-1">
              {!historyQuery.data && historyQuery.isLoading ? (
                <TabSpinner label="Loading student timeline..." />
              ) : studentHistory.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No history yet.</p>
              ) : (
                <div className="relative">
                  <div className="absolute bottom-2 left-4 top-2 w-px bg-border" />
                  <div className="space-y-4">
                    {studentHistory.map((entry) => {
                      const Icon = historyIcons[entry.type] || Clock;
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className="relative flex items-start gap-3 pl-2"
                        >
                          <div className="z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-card">
                            <Icon size={10} className="text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground">{entry.description}</p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{entry.date}</span>
                              {entry.actorName ? (
                                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{entry.actorName}</span>
                              ) : null}
                              {entry.details ? (
                                <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">{entry.details}</span>
                              ) : null}
                            </div>
                            {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {Object.entries(entry.metadata).slice(0, 4).map(([key, value]) => (
                                  <span key={key} className="rounded bg-secondary px-2 py-1 text-[11px] text-muted-foreground">
                                    {key.replaceAll('_', ' ')}: {formatHistoryValue(value)}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              {!paymentsQuery.data && paymentsQuery.isLoading ? (
                <TabSpinner label="Loading document references..." />
              ) : (
                <>
                  <div className="rounded-xl border border-border bg-secondary/40 p-4">
                    <p className="label-caps mb-2">Stored Photo</p>
                    {student.photo ? (
                      <img src={student.photo} alt={student.name} className="h-56 w-full rounded-xl object-cover sm:h-72" />
                    ) : (
                      <div className="flex h-56 items-center justify-center rounded-xl bg-background text-sm text-muted-foreground sm:h-72">
                        No photo available
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="label-caps mb-1">Document Summary</p>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Photo status: <span className="font-medium text-foreground">{uploadedPhotoLabel}</span></p>
                        <p>Admission date: <span className="font-medium text-foreground">{student.admissionDate}</span></p>
                        <p>Selected shifts: <span className="font-medium text-foreground">{shiftLabels || '-'}</span></p>
                        <p>Seat number: <span className="font-medium text-foreground">#{student.seatNumber}</span></p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="label-caps mb-1">Payment Reference</p>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Latest receipt: <span className="font-medium text-foreground">{latestPayment?.receiptNumber || '-'}</span></p>
                        <p>Previous receipt: <span className="font-medium text-foreground">{previousReceipt}</span></p>
                        <p>Next due month: <span className="font-medium text-foreground">{nextDueMonth || '-'}</span></p>
                        <p>Outstanding amount: <span className="font-medium text-foreground">Rs.{outstandingAmount}</span></p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="label-caps mb-1">Export Packet</p>
                      <p className="text-sm text-muted-foreground">
                        Use the export actions below to download the full student packet with profile, payment ledger, and timeline.
                      </p>
                    </div>
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="label-caps mb-1">Future Documents</p>
                      <p className="text-sm text-muted-foreground">
                        This area is ready for future ID proofs, signed forms, extra receipts, and other student files.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex flex-wrap gap-2 p-6 pt-0">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={studentQuery.isLoading}
            onClick={async () => {
              const { payments, history } = await ensureExportData();
              downloadCsv(`student-${student.name.replaceAll(' ', '-').toLowerCase()}.csv`, payments.map((payment) => ({
                student: student.name,
                studentMobile: student.mobile,
                fatherName: student.fatherName || '',
                fatherMobile: student.fatherNumber || '',
                aadharNumber: student.aadharNumber || '',
                seat: student.seatNumber,
                shifts: shiftLabels,
                admissionDate: student.admissionDate,
                monthlyFee: student.monthlyFee,
                month: payment.month,
                receipt: payment.receiptNumber,
                amountPaid: payment.amountPaid,
                feeAmount: payment.feeAmount,
                paymentStatus: payment.paymentStatus,
                paymentDate: payment.paymentDate,
                paymentMethod: payment.paymentMethod,
                paymentNotes: payment.notes || '',
                latestHistoryEvent: history[0]?.description || '',
              })));
            }}
          >
            <Sheet size={14} /> Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={studentQuery.isLoading}
            onClick={async () => {
              const { payments, history } = await ensureExportData();
              downloadWordDocument(
                `student-${student.name.replaceAll(' ', '-').toLowerCase()}.doc`,
                `${student.name} Record`,
                buildStudentRecordHtml(payments, history),
              );
            }}
          >
            <FileText size={14} /> Word
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={studentQuery.isLoading}
            onClick={async () => {
              const { payments, history } = await ensureExportData();
              openPrintWindow(`${student.name} Record`, buildStudentRecordHtml(payments, history));
            }}
          >
            <Printer size={14} /> Print Full Record
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowEditDialog(true)}>
            <Edit size={14} /> Edit Student
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowPaymentDialog(true)}>
            <CreditCard size={14} /> Add Payment
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowSeatDialog(true)}>
            <ArrowRightLeft size={14} /> Change Seat
          </Button>
          <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setShowDeleteDialog(true)}>
            <UserMinus size={14} /> Remove
          </Button>
        </div>
      </ModalShell>

      <StudentFormDialog open={showEditDialog} onOpenChange={setShowEditDialog} student={student} />
      <SeatChangeDialog open={showSeatDialog} onOpenChange={setShowSeatDialog} student={student} />
      <PaymentFormDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog} initialStudentId={student.id} lockStudent />
      <ConfirmActionDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Remove Student"
        description={`Remove ${student.name} from Seat ${student.seatNumber}?`}
        confirmLabel="Remove Student"
        variant="destructive"
        onConfirm={async () => {
          await removeStudent(student.id);
          onClose();
        }}
      />
    </>
  );
}
