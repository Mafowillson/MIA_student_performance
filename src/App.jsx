import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { RoleProvider, ROLES } from './context/RoleContext';
import { ConfirmDialogProvider } from './components/ConfirmDialogProvider';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import PublicLayout from './components/layout/PublicLayout';

import Home from './pages/public/Home';
import About from './pages/public/About';
import Programs from './pages/public/Programs';
import Contact from './pages/public/Contact';

import Login from './pages/Login';
import SharedStudentView from './pages/SharedStudentView';

import NationalSupervisorDashboard from './pages/national/NationalSupervisorDashboard';
import ManageRegionalSupervisors from './pages/national/ManageRegionalSupervisors';
import ManageRegions from './pages/national/ManageRegions';
import RegionalSupervisorDashboard from './pages/supervisor/RegionalSupervisorDashboard';
import ManageAdmins from './pages/supervisor/ManageAdmins';
import ManageCenters from './pages/supervisor/ManageCenters';
import ManagePrograms from './pages/supervisor/ManagePrograms';
import RegionalCoordinatorDashboard from './pages/coordinator/RegionalCoordinatorDashboard';
import ManageSubjects from './pages/coordinator/ManageSubjects';
import HODDashboard from './pages/hod/HODDashboard';
import CenterCoordinatorDashboard from './pages/center/CenterCoordinatorDashboard';
import ManualMarkEntry from './pages/center/ManualMarkEntry';
import ExcelUpload from './pages/center/ExcelUpload';
import ManageMentors from './pages/center/ManageMentors';
import MentorDashboard from './pages/mentor/MentorDashboard';
import MenteeDetail from './pages/mentor/MenteeDetail';

import CenterDrillDown from './pages/shared/CenterDrillDown';
import CategoryDrillDown from './pages/shared/CategoryDrillDown';
import StudentProfilePage from './pages/shared/StudentProfilePage';

const ALL_LOGGED_IN_ROLES = Object.values(ROLES);

export default function App() {
  return (
    <LanguageProvider>
      <RoleProvider>
        <ConfirmDialogProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/programs" element={<Programs />} />
              <Route path="/contact" element={<Contact />} />
            </Route>

            <Route path="/login" element={<Login />} />
            <Route path="/share/:studentId" element={<SharedStudentView />} />

            <Route element={<AppShell />}>
              <Route
                path="/national"
                element={
                  <ProtectedRoute allow={[ROLES.NATIONAL_SUPERVISOR]}>
                    <NationalSupervisorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/national/admins"
                element={
                  <ProtectedRoute allow={[ROLES.NATIONAL_SUPERVISOR]}>
                    <ManageRegionalSupervisors />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/national/regions"
                element={
                  <ProtectedRoute allow={[ROLES.NATIONAL_SUPERVISOR]}>
                    <ManageRegions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/national/region/:regionId"
                element={
                  <ProtectedRoute allow={[ROLES.NATIONAL_SUPERVISOR]}>
                    <RegionalSupervisorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/national/region/:regionId/center/:centerId"
                element={
                  <ProtectedRoute allow={[ROLES.NATIONAL_SUPERVISOR]}>
                    <CenterDrillDown />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/national/region/:regionId/category/:categoryId"
                element={
                  <ProtectedRoute allow={[ROLES.NATIONAL_SUPERVISOR]}>
                    <CategoryDrillDown />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/supervisor"
                element={
                  <ProtectedRoute allow={[ROLES.REGIONAL_SUPERVISOR]}>
                    <RegionalSupervisorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/supervisor/center/:centerId"
                element={
                  <ProtectedRoute allow={[ROLES.REGIONAL_SUPERVISOR]}>
                    <CenterDrillDown />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/supervisor/category/:categoryId"
                element={
                  <ProtectedRoute allow={[ROLES.REGIONAL_SUPERVISOR]}>
                    <CategoryDrillDown />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/supervisor/admins"
                element={
                  <ProtectedRoute allow={[ROLES.REGIONAL_SUPERVISOR]}>
                    <ManageAdmins />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/supervisor/centers"
                element={
                  <ProtectedRoute allow={[ROLES.REGIONAL_SUPERVISOR]}>
                    <ManageCenters />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/supervisor/programs"
                element={
                  <ProtectedRoute allow={[ROLES.REGIONAL_SUPERVISOR]}>
                    <ManagePrograms />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/coordinator"
                element={
                  <ProtectedRoute allow={[ROLES.REGIONAL_COORDINATOR]}>
                    <RegionalCoordinatorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/center/:centerId"
                element={
                  <ProtectedRoute allow={[ROLES.REGIONAL_COORDINATOR]}>
                    <CenterDrillDown />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/subjects"
                element={
                  <ProtectedRoute allow={[ROLES.REGIONAL_COORDINATOR]}>
                    <ManageSubjects />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hod"
                element={
                  <ProtectedRoute allow={[ROLES.HOD]}>
                    <HODDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/center"
                element={
                  <ProtectedRoute allow={[ROLES.CENTER_COORDINATOR]}>
                    <CenterCoordinatorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/center/mark-entry"
                element={
                  <ProtectedRoute allow={[ROLES.CENTER_COORDINATOR]}>
                    <ManualMarkEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/center/upload"
                element={
                  <ProtectedRoute allow={[ROLES.CENTER_COORDINATOR]}>
                    <ExcelUpload />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/center/mentors"
                element={
                  <ProtectedRoute allow={[ROLES.CENTER_COORDINATOR]}>
                    <ManageMentors />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/mentor"
                element={
                  <ProtectedRoute allow={[ROLES.MENTOR]}>
                    <MentorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mentor/mentee/:studentId"
                element={
                  <ProtectedRoute allow={[ROLES.MENTOR]}>
                    <MenteeDetail />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/students/:studentId"
                element={
                  <ProtectedRoute allow={ALL_LOGGED_IN_ROLES}>
                    <StudentProfilePage />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
        </ConfirmDialogProvider>
      </RoleProvider>
    </LanguageProvider>
  );
}
