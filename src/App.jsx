import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Landing from './pages/Landing';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import SecurityPrivacy from './pages/SecurityPrivacy';
import SelectSchool from './pages/SelectSchool';
import ForceResetPassword from './pages/ForceResetPassword';
import StaffManagement from './pages/StaffManagement';
import ClassManagement from './pages/ClassManagement';
import Schedule from './pages/Schedule';
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
import Subjects from './pages/Subjects';
import TrainingPortal from './pages/TrainingPortal';
import TrainingDashboard from './pages/TrainingDashboard';
import AdminLogin from './pages/AdminLogin';
import DashboardLayout from '@/components/DashboardLayout';
import ExecutiveOverview from './pages/ExecutiveOverview';
import AcademicPerformance from './pages/AcademicPerformance';
import AttendanceEngagement from './pages/AttendanceEngagement';
import StudentsDemographics from './pages/StudentsDemographics';
import PredictiveInsights from './pages/PredictiveInsights';
import Students from './pages/Students';
import AccessReview from './pages/AccessReview';
import Homeroom from './pages/Homeroom';
import ReportBuilder from './pages/ReportBuilder';
import StudentDashboard from './pages/StudentDashboard';
import StudentPerformance from './pages/StudentPerformance';
import StudentSchedule from './pages/StudentSchedule';
import StudentAttendance from './pages/StudentAttendance';
import MyAssignments from './pages/MyAssignments';
import TeacherAssignmentSubmissions from './pages/TeacherAssignmentSubmissions';
import ClassCover from './pages/ClassCover';
import LessonPlans from './pages/LessonPlans';
import LessonPlanReviews from './pages/LessonPlanReviews';
import Syllabuses from './pages/Syllabuses';
import Messages from './pages/Messages';
import ParentConversations from './pages/ParentConversations';
import AccountSettings from './pages/AccountSettings';
import StudentAccessAudit from './pages/StudentAccessAudit';
import StudentLoginManagement from './pages/StudentLoginManagement';
import StudentPortalLayout from '@/components/StudentPortalLayout';
import SeatingPlan from './pages/SeatingPlan';
import AssessmentWeights from './pages/AssessmentWeights';
import AttendancePhotoUpload from './pages/AttendancePhotoUpload';
import AttendanceReview from './pages/AttendanceReview';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  if (window.location.pathname === "/attendance-photo") return <AttendancePhotoUpload />;

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
      <Route path="/" element={<Landing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/security" element={<SecurityPrivacy />} />
      <Route path="/login" element={<SelectSchool />} />
      <Route path="/reset-password" element={<ForceResetPassword />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin" element={<Administration />} />
      <Route path="/admin/ferpa" element={<FerpaCompliance />} />
      <Route path="/admin/security" element={<SecurityDashboard />} />
      <Route path="/sso-callback" element={<SsoCallback />} />
      <Route element={<StudentPortalLayout />}>
        <Route path="/my-student" element={<StudentDashboard />} />
        <Route path="/student-performance" element={<StudentPerformance />} />
        <Route path="/student-schedule" element={<StudentSchedule />} />
        <Route path="/student-attendance" element={<StudentAttendance />} />
        <Route path="/my-assignments" element={<MyAssignments />} />
      </Route>
      <Route path="/admin/policies" element={<PolicyManagement />} />
      <Route element={<DashboardLayout />}>
        <Route path="/overview" element={<ExecutiveOverview />} />
        <Route path="/academics" element={<AcademicPerformance />} />
        <Route path="/attendance" element={<AttendanceEngagement />} />
        <Route path="/attendance-review" element={<AttendanceReview />} />
        <Route path="/demographics" element={<StudentsDemographics />} />
        <Route path="/students" element={<Students />} />
        <Route path="/insights" element={<PredictiveInsights />} />
        <Route path="/staff" element={<StaffManagement />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/classes" element={<ClassManagement />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/academic-years" element={<AcademicYears />} />
        <Route path="/teacher-assignments" element={<TeacherAssignments />} />
        <Route path="/student-assignments" element={<StudentAssignments />} />
        <Route path="/student-access-audit" element={<StudentAccessAudit />} />
        <Route path="/student-logins" element={<StudentLoginManagement />} />
        <Route path="/assessment-weights" element={<AssessmentWeights />} />
        <Route path="/my-classes" element={<MyClasses />} />
        <Route path="/assignment-submissions" element={<TeacherAssignmentSubmissions />} />
        <Route path="/classes/:classId" element={<ClassDashboard />} />
        <Route path="/classes/:classId/seating-plan" element={<SeatingPlan />} />
        <Route path="/students/:studentId" element={<StudentProfile />} />
        <Route path="/training" element={<TrainingPortal />} />
        <Route path="/training-dashboard" element={<TrainingDashboard />} />
        <Route path="/access-review" element={<AccessReview />} />
        <Route path="/homerooms" element={<Homeroom />} />
        <Route path="/reports" element={<ReportBuilder />} />
        <Route path="/class-cover" element={<ClassCover />} />
        <Route path="/lesson-plans" element={<LessonPlans />} />
        <Route path="/syllabuses" element={<Syllabuses />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/parent-conversations" element={<ParentConversations />} />
        <Route path="/settings" element={<AccountSettings />} />
        <Route path="/lesson-plan-reviews" element={<LessonPlanReviews />} />
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