import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { AppLayout } from "@/components/AppLayout";
import { lazy, Suspense } from "react";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import NotFound from "./pages/NotFound.tsx";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const Index = lazy(() => import("./pages/Index"));
const SeatsPage = lazy(() => import("./pages/SeatsPage"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"));
const AdmissionsPage = lazy(() => import("./pages/AdmissionsPage"));
const AdmissionPage = lazy(() => import("./pages/AdmissionPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthLoading } = useApp();
  if (isAuthLoading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthLoading } = useApp();
  if (isAuthLoading) return <Loading />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const Loading = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <AppErrorBoundary>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
                <Route path="/admit" element={<AdmissionPage />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/seats" element={<ProtectedRoute><SeatsPage /></ProtectedRoute>} />
                <Route path="/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
                <Route path="/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
                <Route path="/admissions" element={<ProtectedRoute><AdmissionsPage /></ProtectedRoute>} />
                <Route path="/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AppErrorBoundary>
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
