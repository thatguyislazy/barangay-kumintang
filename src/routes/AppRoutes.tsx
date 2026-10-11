import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import Home from "../pages/public/Home";
import MedicalAppointment from "../pages/public/MedicalAppointment";
import AdminLogin from "../pages/admin/AdminLogin";
import Dashboard from "../pages/admin/Dashboard";
import Appointments from "../pages/admin/Appointments";
import ClinicQueue from "../pages/admin/ClinicQueue";
import Patients from "../pages/admin/Patients";
import Medicines from "../pages/admin/Medicines";
import Reports from "../pages/admin/Reports";
import Announcements from "../pages/admin/Announcements";
import QueueDisplay from "../pages/public/QueueDisplay";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/medical-appointment" element={<MedicalAppointment />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/announcements"
        element={
          <ProtectedRoute>
            <Announcements />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/appointments"
        element={
          <ProtectedRoute>
            <Appointments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/queue"
        element={
          <ProtectedRoute>
            <ClinicQueue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/patients"
        element={
          <ProtectedRoute>
            <Patients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/medicines"
        element={
          <ProtectedRoute>
            <Medicines />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Home />} />
      <Route path="/queue-display" element={<QueueDisplay />} />
    </Routes>
  );
}