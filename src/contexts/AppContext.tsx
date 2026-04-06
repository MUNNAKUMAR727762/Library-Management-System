import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  AdmissionRequest,
  CurrentUser,
  DashboardChartsData,
  DashboardSummary,
  Notification,
  Payment,
  Seat,
  SHIFTS,
  ShiftDefinition,
  StorageSummary,
  Student,
} from '@/lib/mock-data';
import {
  admissionApi,
  authApi,
  dashboardApi,
  extractApiError,
  notificationsApi,
  paymentsApi,
  seatsApi,
  settingsApi,
  studentsApi,
} from '@/lib/api';

interface AppState {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  currentUser: CurrentUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  students: Student[];
  payments: Payment[];
  seats: Seat[];
  notifications: Notification[];
  admissionRequests: AdmissionRequest[];
  shifts: ShiftDefinition[];
  dashboardSummary: DashboardSummary;
  dashboardCharts: DashboardChartsData;
  storageSummary: StorageSummary;
  activeShift: number;
  setActiveShift: (s: number) => void;
  addStudent: (s: Record<string, unknown>) => Promise<void>;
  updateStudent: (id: string, data: Record<string, unknown>) => Promise<void>;
  removeStudent: (id: string) => Promise<void>;
  changeStudentSeat: (id: string, seatNumber: number, shiftIds: number[]) => Promise<void>;
  addPayment: (p: Record<string, unknown>) => Promise<void>;
  updatePayment: (id: string, data: Record<string, unknown>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  approveAdmissionRequest: (id: string, data: Record<string, unknown>) => Promise<void>;
  rejectAdmissionRequest: (id: string, reason: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refreshAll: () => Promise<void>;
}

const emptySummary: DashboardSummary = {
  totalSeats: 41,
  occupied: 0,
  available: 41,
  pendingSeats: 0,
  totalStudents: 0,
  monthlyRevenue: 0,
  pendingPayments: 0,
};

const emptyCharts: DashboardChartsData = {
  shiftUsage: [],
  paymentStatus: [],
  revenue: [],
};

const emptyStorage: StorageSummary = {
  usedBytes: 0,
  remainingBytes: 512 * 1024 * 1024,
  limitBytes: 512 * 1024 * 1024,
  percentUsed: 0,
  collections: 0,
  objects: 0,
  avgObjectSize: 0,
  collectionBreakdown: [],
  photoUsage: { fileCount: 0, chunkCount: 0, totalBytes: 0 },
};

const AppContext = createContext<AppState | null>(null);

const authQueryKey = ['auth', 'me'];
const studentsQueryKey = ['students'];
const paymentsQueryKey = ['payments'];
const notificationsQueryKey = ['notifications'];
const admissionRequestsQueryKey = ['admission-requests'];
const settingsQueryKey = ['settings'];
const studentDetailQueryKey = ['student-detail'];
const seatsQueryKey = ['seats'];
const dashboardSummaryQueryKey = ['dashboard', 'summary'];
const dashboardChartsQueryKey = ['dashboard', 'charts'];
const dashboardStorageQueryKey = ['dashboard', 'storage'];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [activeShift, setActiveShift] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const isPublicAdmissionRoute = location.pathname.startsWith('/admit');

  const authQuery = useQuery({
    queryKey: authQueryKey,
    queryFn: authApi.me,
    enabled: !isPublicAdmissionRoute,
    retry: false,
  });

  const isAuthenticated = Boolean(authQuery.data);

  const settingsQuery = useQuery({
    queryKey: settingsQueryKey,
    queryFn: settingsApi.get,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (settingsQuery.data?.shifts?.length && !settingsQuery.data.shifts.find((shift) => shift.id === activeShift)) {
      setActiveShift(settingsQuery.data.shifts[0].id);
    }
  }, [activeShift, settingsQuery.data]);

  const studentsQuery = useQuery({
    queryKey: studentsQueryKey,
    queryFn: studentsApi.getAll,
    enabled: isAuthenticated,
  });

  const paymentsQuery = useQuery({
    queryKey: paymentsQueryKey,
    queryFn: paymentsApi.getAll,
    enabled: isAuthenticated,
  });

  const seatsQuery = useQuery({
    queryKey: ['seats', activeShift],
    queryFn: () => seatsApi.getAll(activeShift),
    enabled: isAuthenticated,
  });

  const notificationsQuery = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: notificationsApi.getAll,
    enabled: isAuthenticated,
  });

  const admissionRequestsQuery = useQuery({
    queryKey: admissionRequestsQueryKey,
    queryFn: admissionApi.list,
    enabled: isAuthenticated,
  });

  const dashboardSummaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', activeShift],
    queryFn: () => dashboardApi.summary(activeShift),
    enabled: isAuthenticated,
  });

  const dashboardChartsQuery = useQuery({
    queryKey: ['dashboard', 'charts'],
    queryFn: dashboardApi.charts,
    enabled: isAuthenticated,
  });

  const storageQuery = useQuery({
    queryKey: ['dashboard', 'storage'],
    queryFn: dashboardApi.storage,
    enabled: isAuthenticated,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authApi.login(email, password),
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
  });

  const refreshAll = async () => {
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: studentsQueryKey }),
      queryClient.invalidateQueries({ queryKey: paymentsQueryKey }),
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
      queryClient.invalidateQueries({ queryKey: admissionRequestsQueryKey }),
      queryClient.invalidateQueries({ queryKey: dashboardSummaryQueryKey }),
      queryClient.invalidateQueries({ queryKey: dashboardChartsQueryKey }),
      queryClient.invalidateQueries({ queryKey: dashboardStorageQueryKey }),
      queryClient.invalidateQueries({ queryKey: seatsQueryKey }),
      queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
      queryClient.invalidateQueries({ queryKey: authQueryKey }),
    ]);
  };

  const refreshQueries = async (queryKeys: Array<readonly unknown[]>) => {
    await Promise.allSettled(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  };

  const login = async (email: string, password: string) => {
    try {
      await loginMutation.mutateAsync({ email, password });
      await queryClient.invalidateQueries({ queryKey: authQueryKey });
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    queryClient.clear();
    await queryClient.invalidateQueries({ queryKey: authQueryKey });
  };

  const runMutation = async (
    task: () => Promise<unknown>,
    syncQueryKeys: Array<readonly unknown[]>,
    backgroundQueryKeys: Array<readonly unknown[]> = [],
  ) => {
    await task();
    await refreshQueries(syncQueryKeys);
    if (backgroundQueryKeys.length) {
      void refreshQueries(backgroundQueryKeys);
    }
  };

  const syncDeletedStudentCaches = (studentId: string) => {
    const deletedStudent = students.find((student) => student.id === studentId);
    const deletedPayments = payments.filter((payment) => payment.studentId === studentId);
    if (!deletedStudent) return;

    queryClient.setQueryData<Student[]>(studentsQueryKey, (current) =>
      (current ?? []).filter((student) => student.id !== studentId),
    );
    queryClient.setQueryData<Payment[]>(paymentsQueryKey, (current) =>
      (current ?? []).filter((payment) => payment.studentId !== studentId),
    );
    queryClient.removeQueries({ queryKey: ['student-detail', studentId] });
    queryClient.removeQueries({ queryKey: ['student', studentId] });
    queryClient.removeQueries({ queryKey: ['student-payments', studentId] });
    queryClient.removeQueries({ queryKey: ['student-history', studentId] });
    queryClient.setQueriesData<Seat[]>({ queryKey: seatsQueryKey }, (current) =>
      (current ?? []).map((seat) =>
        seat.studentId === studentId
          ? { ...seat, status: 'available', studentId: null, studentName: null }
          : seat,
      ),
    );

    const removedPaidTotal = deletedPayments
      .filter((payment) => payment.paymentStatus === 'paid')
      .reduce((sum, payment) => sum + payment.amountPaid, 0);
    const removedPendingCount = deletedPayments.filter((payment) => payment.paymentStatus !== 'paid').length;

    for (const [queryKey, summary] of queryClient.getQueriesData<DashboardSummary>({ queryKey: dashboardSummaryQueryKey })) {
      if (!summary) continue;
      const shiftId = Number(queryKey[2]);
      const affectsShift = deletedStudent.shiftIds.includes(shiftId);
      queryClient.setQueryData<DashboardSummary>(queryKey, {
        ...summary,
        occupied:
          affectsShift && deletedStudent.status === 'active'
            ? Math.max(summary.occupied - 1, 0)
            : summary.occupied,
        available:
          affectsShift
            ? Math.min(summary.available + 1, summary.totalSeats)
            : summary.available,
        pendingSeats:
          affectsShift && deletedStudent.status !== 'active'
            ? Math.max(summary.pendingSeats - 1, 0)
            : summary.pendingSeats,
        totalStudents: Math.max(summary.totalStudents - 1, 0),
        monthlyRevenue: Math.max(summary.monthlyRevenue - removedPaidTotal, 0),
        pendingPayments: Math.max(summary.pendingPayments - removedPendingCount, 0),
      });
    }

    const shiftLabelById = new Map(shifts.map((shift) => [shift.id, shift.label]));
    const affectedShiftLabels = new Set(
      deletedStudent.shiftIds.map((shiftId) => shiftLabelById.get(shiftId) ?? `Shift ${shiftId}`),
    );
    const removedPaymentStatusCounts = deletedPayments.reduce<Record<string, number>>((counts, payment) => {
      counts[payment.paymentStatus] = (counts[payment.paymentStatus] ?? 0) + 1;
      return counts;
    }, {});
    const removedRevenueByMonth = deletedPayments
      .filter((payment) => payment.paymentStatus === 'paid')
      .reduce<Record<string, number>>((months, payment) => {
        months[payment.month] = (months[payment.month] ?? 0) + payment.amountPaid;
        return months;
      }, {});

    for (const [queryKey, charts] of queryClient.getQueriesData<DashboardChartsData>({ queryKey: dashboardChartsQueryKey })) {
      if (!charts) continue;
      queryClient.setQueryData<DashboardChartsData>(queryKey, {
        shiftUsage: charts.shiftUsage.map((entry) => {
          if (!affectedShiftLabels.has(entry.name)) return entry;
          return {
            ...entry,
            occupied:
              deletedStudent.status === 'active'
                ? Math.max(entry.occupied - 1, 0)
                : entry.occupied,
            available: entry.available + 1,
            pending:
              deletedStudent.status !== 'active'
                ? Math.max(entry.pending - 1, 0)
                : entry.pending,
          };
        }),
        paymentStatus: charts.paymentStatus.map((entry) => {
          const statusKey =
            entry.name === 'Paid'
              ? 'paid'
              : entry.name === 'Pending'
                ? 'pending'
                : entry.name === 'Due Soon'
                  ? 'due_soon'
                  : 'overdue';
          return {
            ...entry,
            value: Math.max(entry.value - (removedPaymentStatusCounts[statusKey] ?? 0), 0),
          };
        }),
        revenue: charts.revenue
          .map((entry) => ({
            ...entry,
            revenue: Math.max(entry.revenue - (removedRevenueByMonth[entry.month] ?? 0), 0),
          }))
          .filter((entry) => entry.revenue > 0),
      });
    }
  };

  const coreSyncMutationQueries: Array<readonly unknown[]> = [
    studentsQueryKey,
    paymentsQueryKey,
    dashboardSummaryQueryKey,
    seatsQueryKey,
    studentDetailQueryKey,
  ];

  const coreBackgroundMutationQueries: Array<readonly unknown[]> = [
    notificationsQueryKey,
    dashboardChartsQueryKey,
    dashboardStorageQueryKey,
  ];

  const admissionSyncMutationQueries: Array<readonly unknown[]> = [
    ...coreSyncMutationQueries,
    admissionRequestsQueryKey,
  ];

  const admissionBackgroundMutationQueries: Array<readonly unknown[]> = [
    ...coreBackgroundMutationQueries,
  ];

  const value: AppState = {
    isAuthenticated,
    isAuthLoading: !isPublicAdmissionRoute && authQuery.isLoading,
    currentUser: authQuery.data ?? null,
    login,
    logout,
    students: studentsQuery.data ?? [],
    payments: paymentsQuery.data ?? [],
    seats: seatsQuery.data ?? [],
    notifications: notificationsQuery.data ?? [],
    admissionRequests: admissionRequestsQuery.data ?? [],
    shifts: settingsQuery.data?.shifts?.length ? settingsQuery.data.shifts : SHIFTS,
    dashboardSummary: dashboardSummaryQuery.data ?? emptySummary,
    dashboardCharts: dashboardChartsQuery.data ?? emptyCharts,
    storageSummary: storageQuery.data ?? emptyStorage,
    activeShift,
    setActiveShift,
    addStudent: (student) => runMutation(() => studentsApi.create(student), coreSyncMutationQueries, coreBackgroundMutationQueries),
    updateStudent: (id, data) => runMutation(() => studentsApi.update(id, data), coreSyncMutationQueries, coreBackgroundMutationQueries),
    removeStudent: async (id) => {
      await studentsApi.delete(id);
      syncDeletedStudentCaches(id);
      await refreshQueries(coreSyncMutationQueries);
      void refreshQueries(coreBackgroundMutationQueries);
    },
    changeStudentSeat: (id, seatNumber, shiftIds) =>
      runMutation(() => studentsApi.changeSeat(id, { seat_number: seatNumber, shift_ids: shiftIds }), coreSyncMutationQueries, coreBackgroundMutationQueries),
    addPayment: (payment) => runMutation(() => paymentsApi.create(payment), coreSyncMutationQueries, coreBackgroundMutationQueries),
    updatePayment: (id, data) => runMutation(() => paymentsApi.update(id, data), coreSyncMutationQueries, coreBackgroundMutationQueries),
    deletePayment: (id) => runMutation(() => paymentsApi.delete(id), coreSyncMutationQueries, coreBackgroundMutationQueries),
    approveAdmissionRequest: (id, data) =>
      runMutation(() => admissionApi.approve(id, data), admissionSyncMutationQueries, admissionBackgroundMutationQueries),
    rejectAdmissionRequest: (id, reason) =>
      runMutation(() => admissionApi.reject(id, { reason }), admissionSyncMutationQueries, admissionBackgroundMutationQueries),
    markNotificationRead: (id) => runMutation(() => notificationsApi.markRead(id), [notificationsQueryKey]),
    searchQuery,
    setSearchQuery,
    refreshAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { extractApiError };
