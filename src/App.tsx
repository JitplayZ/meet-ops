import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/layout/MainLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Public pages
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ResetPassword from '@/pages/ResetPassword';

// Protected pages
import Dashboard from '@/pages/Dashboard';
import Rooms from '@/pages/Rooms';
import Meetings from '@/pages/Meetings';
import MeetingSchedule from '@/pages/MeetingSchedule';
import CalendarPage from '@/pages/Calendar';
import Admin from '@/pages/Admin';
import Settings from '@/pages/Settings';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/meetings/new" element={<MeetingSchedule />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
