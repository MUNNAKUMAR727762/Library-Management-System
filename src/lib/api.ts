import axios from 'axios';
import {
  AdmissionRequest,
  CurrentUser,
  DashboardChartsData,
  DashboardSummary,
  Notification,
  Payment,
  Seat,
  ShiftDefinition,
  StorageSummary,
  StudentDetailRecord,
  StudentSeatAssignment,
  Student,
  StudentHistoryEntry,
} from '@/lib/mock-data';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  withCredentials: true,
});

const mapHistory = (entry: any): StudentHistoryEntry => ({
  id: entry.id,
  type: entry.type,
  description: entry.description,
  date: entry.date,
  details: entry.details,
  actorName: entry.actor_name,
  metadata: entry.metadata,
});

const mapStudent = (student: any): Student => ({
  id: student.id,
  name: student.name,
  mobile: student.mobile,
  fatherName: student.father_name || '',
  fatherNumber: student.father_number || '',
  aadharNumber: student.aadhar_number || '',
  photo: student.photo_file_id ? `/api/files/${student.photo_file_id}` : student.photo_url || '',
  seatNumber: student.seat_number,
  shift: student.shift_id,
  shiftIds: Array.isArray(student.shift_ids) && student.shift_ids.length ? student.shift_ids : [student.shift_id].filter(Boolean),
  admissionDate: student.admission_date,
  monthlyFee: student.monthly_fee,
  status: student.status,
  history: Array.isArray(student.history) ? student.history.map(mapHistory) : [],
});

const mapPayment = (payment: any): Payment => ({
  id: payment.id,
  studentId: payment.student_id,
  studentName: payment.studentName,
  seatNumber: payment.seatNumber ?? null,
  shift: payment.shift ?? null,
  shiftIds: Array.isArray(payment.shift_ids) ? payment.shift_ids : [payment.shift].filter(Boolean),
  month: payment.billing_month,
  feeAmount: payment.fee_amount,
  amountPaid: payment.amount_paid,
  receiptNumber: payment.receipt_number,
  paymentMethod: payment.payment_method,
  paymentStatus: payment.payment_status,
  paymentDate: payment.payment_date,
  notes: payment.notes,
});

const mapSeatAssignment = (assignment: any): StudentSeatAssignment => ({
  id: assignment.id,
  studentId: assignment.student_id,
  shiftId: assignment.shift_id,
  seatNumber: assignment.seat_number,
  assignmentStatus: assignment.assignment_status,
  createdAt: assignment.created_at,
  releasedAt: assignment.released_at,
});

const mapSeat = (seat: any): Seat => ({
  number: seat.number,
  shift: seat.shift,
  status: seat.status,
  studentId: seat.studentId,
  studentName: seat.studentName,
});

const mapNotification = (notification: any): Notification => ({
  id: notification.id,
  type: notification.type,
  message: notification.message,
  time: notification.time,
  read: notification.read,
  entityType: notification.entity_type,
  entityId: notification.entity_id,
  targetPath: notification.target_path,
  targetLabel: notification.target_label,
});

const mapAdmissionRequest = (request: any): AdmissionRequest => ({
  id: request.id,
  name: request.name,
  mobile: request.mobile,
  fatherName: request.father_name,
  fatherNumber: request.father_number,
  aadharNumber: request.aadhar_number,
  notes: request.notes,
  photoFileId: request.photo_file_id,
  photoFilename: request.photo_filename,
  photoContentType: request.photo_content_type,
  photoSize: request.photo_size,
  seatNumber: request.seat_number,
  shiftId: request.shift_id,
  shiftIds: Array.isArray(request.shift_ids) ? request.shift_ids : [request.shift_id].filter(Boolean),
  status: request.status,
  createdAt: request.created_at,
  rejectionReason: request.rejection_reason,
});

export function extractApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export const authApi = {
  login: async (email: string, password: string): Promise<CurrentUser> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data.user;
  },
  logout: () => api.post('/auth/logout'),
  me: async (): Promise<CurrentUser | null> => {
    const response = await api.get('/auth/me');
    return response.data.user ?? null;
  },
};

export const settingsApi = {
  get: async (): Promise<{ shifts: ShiftDefinition[] }> => {
    const response = await api.get('/settings');
    return { shifts: response.data.settings?.shifts ?? [] };
  },
};

export const dashboardApi = {
  summary: async (shift: number): Promise<DashboardSummary> => {
    const response = await api.get(`/dashboard/summary?shift=${shift}`);
    return response.data.summary;
  },
  charts: async (): Promise<DashboardChartsData> => {
    const response = await api.get('/dashboard/charts');
    return response.data.charts;
  },
  storage: async (): Promise<StorageSummary> => {
    const response = await api.get('/dashboard/storage');
    return response.data.storage;
  },
};

export const seatsApi = {
  getAll: async (shift: number): Promise<Seat[]> => {
    const response = await api.get(`/seats?shift=${shift}`);
    return response.data.seats.map(mapSeat);
  },
  disable: (shift: number, seatNumber: number) => api.patch(`/seats/${shift}/${seatNumber}/disable`),
  enable: (shift: number, seatNumber: number) => api.patch(`/seats/${shift}/${seatNumber}/enable`),
  admissionLink: async (shift: number, seatNumber: number): Promise<{ token: string; url: string; expiresInSeconds: number }> => {
    const response = await api.get(`/seats/${shift}/${seatNumber}/admission-link`);
    return response.data.link;
  },
};

export const studentsApi = {
  getAll: async (): Promise<Student[]> => {
    const response = await api.get('/students');
    return response.data.students.map(mapStudent);
  },
  getOne: async (id: string): Promise<Student> => {
    const response = await api.get(`/students/${id}`);
    return mapStudent(response.data.student);
  },
  getDetail: async (id: string): Promise<StudentDetailRecord> => {
    const response = await api.get(`/students/${id}/details`);
    return {
      student: mapStudent(response.data.student),
      payments: (response.data.payments ?? []).map(mapPayment),
      assignments: (response.data.assignments ?? []).map(mapSeatAssignment),
    };
  },
  create: async (data: Record<string, unknown>): Promise<Student> => {
    const response = await api.post('/students', data);
    return mapStudent(response.data.student);
  },
  update: async (id: string, data: Record<string, unknown>): Promise<Student> => {
    const response = await api.patch(`/students/${id}`, data);
    return mapStudent(response.data.student);
  },
  delete: (id: string) => api.delete(`/students/${id}`),
  changeSeat: async (id: string, data: { seat_number: number; shift_ids: number[] }): Promise<Student> => {
    const response = await api.post(`/students/${id}/change-seat`, data);
    return mapStudent(response.data.student);
  },
  history: async (id: string): Promise<StudentHistoryEntry[]> => {
    const response = await api.get(`/students/${id}/history`);
    return response.data.history.map(mapHistory);
  },
};

export const paymentsApi = {
  getAll: async (studentId?: string): Promise<Payment[]> => {
    const response = await api.get('/payments', {
      params: studentId ? { student_id: studentId } : undefined,
    });
    return response.data.payments.map(mapPayment);
  },
  create: async (data: Record<string, unknown>): Promise<Payment> => {
    const response = await api.post('/payments', data);
    return mapPayment(response.data.payment);
  },
  update: async (id: string, data: Record<string, unknown>): Promise<Payment> => {
    const response = await api.patch(`/payments/${id}`, data);
    return mapPayment(response.data.payment);
  },
  delete: (id: string) => api.delete(`/payments/${id}`),
};

export const notificationsApi = {
  getAll: async (): Promise<Notification[]> => {
    const response = await api.get('/notifications');
    return response.data.notifications.map(mapNotification);
  },
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
};

export const admissionApi = {
  list: async (): Promise<AdmissionRequest[]> => {
    const response = await api.get('/admission-requests');
    return response.data.requests.map(mapAdmissionRequest);
  },
  approve: (id: string, data: {
    monthly_fee: number;
    admission_date: string;
    status?: string;
    payment_start_month?: string;
    payment_months_count?: number;
    payment_method?: string;
    payment_status?: string;
    payment_date?: string;
    payment_notes?: string;
    receipt_number?: string;
    shift_ids?: number[];
  }) =>
    api.post(`/admission-requests/${id}/approve`, data),
  reject: (id: string, data: { reason: string }) => api.post(`/admission-requests/${id}/reject`, data),
  getForm: async (token: string) => {
    const response = await api.get(`/public/admission-form?token=${encodeURIComponent(token)}`);
    return response.data.form as {
      seatNumber: number;
      shiftId: number;
      shiftIds: number[];
      shiftLabel: string;
      shiftTime: string;
      shiftOptions: Array<{ id: number; label: string; time: string; available: boolean }>;
      available: boolean;
      token: string;
      submitUrl: string;
    };
  },
  createRequest: async (data: FormData): Promise<AdmissionRequest> => {
    const response = await api.post('/public/admission-requests', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return mapAdmissionRequest(response.data.request);
  },
};

export default api;
