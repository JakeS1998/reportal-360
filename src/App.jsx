import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import SelectSchool from './pages/SelectSchool';
import ForceResetPassword from './pages/ForceResetPassword';
import StaffManagement from './pages/StaffManagement';
import ClassManagement from './pages/ClassManagement';
import AcademicYears from './pages/AcademicYears';
import TeacherAssignments from './pages/TeacherAssignments';
import StudentAssignments from './pages/StudentAssignments';
import MyClasses from './pages/MyClasses';
import ClassDashboard from './pages/ClassDashboard';
import StudentProfile from './pages/StudentProfile';
import Administration from './pages/Administration';
import FerpaCompliance from './pages/FerpaCompliance';
import SecurityDashboard from './pages/SecurityDashboard';
import SsoCallback from './pages/SsoCallback';
import PolicyManagement from './pages/PolicyManagement';
import AdminLogin from './pages/AdminLogin';
import DashboardLayout from '@/components/DashboardLayout';
import ExecutiveOverview from './pages/ExecutiveOverview';
import AcademicPerformance from './pages/AcademicPerformance';
import AttendanceEngagement from './pages/AttendanceEngagement';
import StudentsDemographics from './pages/StudentsDemographics';
import PredictiveInsights from './pages/PredictiveInsights';
import Students from './pages/Students';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Add your page Route elements here */}
      <Route path="/" element={<SelectSchool />} />
      <Route path="/reset-password" element={<ForceResetPassword />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin" element={<Administration />} />
      <Route path="/admin/ferpa" element={<FerpaCompliance />} />
      <Route path="/admin/security" element={<SecurityDashboard />} />
      <Route path="/sso-callback" element={<SsoCallback />} />
      <Route path="/admin/policies" element={<PolicyManagement />} />
      <Route element={<DashboardLayout />}>
        <Route path="/overview" element={<ExecutiveOverview />} />
        <Route path="/academics" element={<AcademicPerformance />} />
        <Route path="/attendance" element={<AttendanceEngagement />} />
        <Route path="/demographics" element={<StudentsDemographics />} />
        <Route path="/students" element={<Students />} />
        <Route path="/insights" element={<PredictiveInsights />} />
        <Route path="/staff" element={<StaffManagement />} />
        <Route path="/classes" element={<ClassManagement />} />
        <Route path="/academic-years" element={<AcademicYears />} />
        <Route path="/teacher-assignments" element={<TeacherAssignments />} />
        <Route path="/student-assignments" element={<StudentAssignments />} />
        <Route path="/my-classes" element={<MyClasses />} />
        <Route path="/classes/:classId" element={<ClassDashboard />} />
        <Route path="/students/:studentId" element={<StudentProfile />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App