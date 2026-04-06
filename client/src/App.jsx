import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { MaterialDetailPage } from './pages/MaterialDetailPage';
import { UploadMaterialPage } from './pages/UploadMaterialPage';
import { EditMaterialPage } from './pages/EditMaterialPage';
import { ProfilePage } from './pages/ProfilePage';
import { ArchivedMaterialsPage } from './pages/ArchivedMaterialsPage';

import { UsersPage } from './pages/admin/UsersPage';
import { RolesPage } from './pages/admin/RolesPage';
import { RoleRequestsPage } from './pages/admin/RoleRequestsPage';
import { SubjectsPage } from './pages/admin/SubjectsPage';
import { TopicsPage } from './pages/admin/TopicsPage';
import { AdminClassesPage } from './pages/admin/AdminClassesPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';

import { ConfirmProvider } from './contexts/ConfirmContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { PrivacyNotice } from './components/common/PrivacyNotice';

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <ConfirmProvider>
            <PrivacyNotice />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                {/* Protected routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="materials" element={<MaterialsPage />} />
                  <Route path="materials/:id" element={<MaterialDetailPage />} />
                  <Route path="materials/:id/edit" element={<EditMaterialPage />} />
                  <Route path="upload" element={<UploadMaterialPage />} />
                  <Route path="archived" element={<ArchivedMaterialsPage />} />

                  <Route path="profile" element={<ProfilePage />} />

                  {/* Admin routes */}
                  <Route path="admin" element={<AdminDashboardPage />}>
                    <Route index element={<Navigate to="users" replace />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="roles" element={<RolesPage />} />
                    <Route path="role-requests" element={<RoleRequestsPage />} />
                    <Route path="subjects" element={<SubjectsPage />} />
                    <Route path="topics" element={<TopicsPage />} />
                    <Route path="classes" element={<AdminClassesPage />} />
                  </Route>
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </ConfirmProvider>
        </AuthProvider>
    </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;

