import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { VisualThemeProvider } from "@/contexts/ThemeContext";
import Operations from "./pages/Operations";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import CheckIn from "./pages/CheckIn";
import ManualAccess from "./pages/ManualAccess";
import TemporaryExits from "./pages/TemporaryExits";
import Visits from "./pages/Visits";
import Personnel from "./pages/Personnel";
import Staff from "./pages/Staff";
import QRGenerator from "./pages/QRGenerator";
import UserManagement from "./pages/UserManagement";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Cargando...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Cargando...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <VisualThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/" element={<ProtectedRoute><Operations /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/checkin" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
              <Route path="/manual" element={<ProtectedRoute><ManualAccess /></ProtectedRoute>} />
              <Route path="/temporary" element={<ProtectedRoute><TemporaryExits /></ProtectedRoute>} />
              <Route path="/visits" element={<ProtectedRoute><Visits /></ProtectedRoute>} />
              <Route path="/register" element={<ProtectedRoute><Register /></ProtectedRoute>} />
              <Route path="/personnel" element={<ProtectedRoute><Personnel /></ProtectedRoute>} />
              <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
              <Route path="/qr-generator" element={<ProtectedRoute><QRGenerator /></ProtectedRoute>} />
              <Route path="/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </VisualThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
