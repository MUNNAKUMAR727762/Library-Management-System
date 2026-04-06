export interface StudentHistoryEntry {
  id: string;
  type: 'admission' | 'payment' | 'seat_change' | 'status_change' | 'edit';
  description: string;
  date: string;
  details?: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
}

export interface Student {
  id: string;
  name: string;
  mobile: string;
  fatherName?: string;
  fatherNumber?: string;
  aadharNumber?: string;
  photo?: string;
  seatNumber: number;
  shift: number;
  shiftIds: number[];
  admissionDate: string;
  monthlyFee: number;
  status: 'active' | 'pending' | 'expired';
  history: StudentHistoryEntry[];
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  seatNumber: number | null;
  shift: number | null;
  shiftIds: number[];
  month: string;
  feeAmount: number;
  amountPaid: number;
  receiptNumber: string;
  paymentMethod: 'cash' | 'upi';
  paymentStatus: 'paid' | 'pending' | 'due_soon' | 'overdue';
  paymentDate: string;
  notes?: string;
}

export interface StudentSeatAssignment {
  id: string;
  studentId: string;
  shiftId: number;
  seatNumber: number;
  assignmentStatus: string;
  createdAt: string;
  releasedAt?: string;
}

export interface StudentDetailRecord {
  student: Student;
  payments: Payment[];
  assignments: StudentSeatAssignment[];
}

export interface Seat {
  number: number;
  shift: number;
  status: 'available' | 'occupied' | 'pending' | 'disabled';
  studentId?: string | null;
  studentName?: string | null;
}

export interface Notification {
  id: string;
  type: 'payment_due' | 'pending' | 'due_soon' | 'overdue' | 'seat_available' | 'admission_pending';
  message: string;
  time: string;
  read: boolean;
  entityType?: string;
  entityId?: string;
  targetPath?: string;
  targetLabel?: string;
}

export interface AdmissionRequest {
  id: string;
  name: string;
  mobile: string;
  fatherName?: string;
  fatherNumber?: string;
  aadharNumber?: string;
  notes?: string;
  photoFileId?: string;
  photoFilename?: string;
  photoContentType?: string;
  photoSize?: number;
  seatNumber: number;
  shiftId: number;
  shiftIds?: number[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  rejectionReason?: string;
}

export interface ShiftDefinition {
  id: number;
  label: string;
  time: string;
}

export interface DashboardSummary {
  totalSeats: number;
  occupied: number;
  available: number;
  pendingSeats: number;
  totalStudents: number;
  monthlyRevenue: number;
  pendingPayments: number;
}

export interface DashboardChartsData {
  shiftUsage: Array<{ name: string; occupied: number; available: number; pending: number }>;
  paymentStatus: Array<{ name: string; value: number }>;
  revenue: Array<{ month: string; revenue: number }>;
}

export interface StorageSummary {
  usedBytes: number;
  remainingBytes: number;
  limitBytes: number;
  percentUsed: number;
  collections: number;
  objects: number;
  avgObjectSize: number;
  collectionBreakdown?: Array<{
    name: string;
    documentCount: number;
    sizeBytes: number;
    storageBytes: number;
    indexBytes: number;
  }>;
  photoUsage?: {
    fileCount: number;
    chunkCount: number;
    totalBytes: number;
  };
}

export interface CurrentUser {
  id: string;
  email: string;
  role: string;
}

export const SHIFTS: ShiftDefinition[] = [
  { id: 1, label: 'Shift 1', time: '6 AM - 11 AM' },
  { id: 2, label: 'Shift 2', time: '11 AM - 4 PM' },
  { id: 3, label: 'Shift 3', time: '4 PM - 9 PM' },
  { id: 4, label: '2 Shift', time: 'Two Shift Plan' },
  { id: 5, label: 'Full Shift', time: 'Full Day Access' },
];
