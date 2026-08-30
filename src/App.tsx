import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import Layout from '@/components/Layout';
import LandingPage from '@/pages/LandingPage';
import StudentSetupPage from '@/pages/StudentSetupPage';
import LearnPage from '@/pages/LearnPage';
import LessonPlannerPage from '@/pages/LessonPlannerPage';
import ClassroomPage from '@/pages/ClassroomPage';
import AssessmentPage from '@/pages/AssessmentPage';
import ReportPage from '@/pages/ReportPage';
import DashboardPage from '@/pages/DashboardPage';
import LearningPathPage from '@/pages/LearningPathPage';
import ProgressPage from '@/pages/ProgressPage';
import ProfilePage from '@/pages/ProfilePage';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/setup" element={<StudentSetupPage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/planner" element={<LessonPlannerPage />} />
            <Route path="/classroom" element={<ClassroomPage />} />
            <Route path="/assessment" element={<AssessmentPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/path" element={<LearningPathPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
