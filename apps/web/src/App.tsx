import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ResumesPage } from './pages/ResumesPage'
import { ResumeDetailPage } from './pages/ResumeDetailPage'
import { ResumeEditPage } from './pages/ResumeEditPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { NewProjectPage } from './pages/NewProjectPage'
import { TrainingPage } from './pages/TrainingPage'
import { NewTrainingPage } from './pages/NewTrainingPage'
import { InterviewRunPage } from './pages/InterviewRunPage'
import { ReviewsPage } from './pages/ReviewsPage'
import { ReviewPage } from './pages/ReviewPage'
import { NewReviewPage } from './pages/NewReviewPage'
import { TrendsPage } from './pages/TrendsPage'
import { ExplorePage } from './pages/ExplorePage'
import { ExperiencesPage } from './pages/ExperiencesPage'
import { ExperienceDetailPage } from './pages/ExperienceDetailPage'
import { ExploreTrendsPage } from './pages/ExploreTrendsPage'
import { ExploreTrendDetailPage } from './pages/ExploreTrendDetailPage'
import { ExploreProjectsPage } from './pages/ExploreProjectsPage'
import { ExploreProjectDetailPage } from './pages/ExploreProjectDetailPage'
import { QuestionSearchPage } from './pages/QuestionSearchPage'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-slate-300 rounded-full animate-spin" />
      </div>
    )
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-slate-300 rounded-full animate-spin" />
      </div>
    )
  }
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/dashboard" element={<AuthGuard><DashboardPage /></AuthGuard>} />
          <Route path="/resumes" element={<AuthGuard><ResumesPage /></AuthGuard>} />
          <Route path="/resumes/:id" element={<AuthGuard><ResumeDetailPage /></AuthGuard>} />
          <Route path="/resumes/:id/edit" element={<AuthGuard><ResumeEditPage /></AuthGuard>} />
          <Route path="/projects" element={<AuthGuard><ProjectsPage /></AuthGuard>} />
          <Route path="/projects/:id" element={<AuthGuard><ProjectDetailPage /></AuthGuard>} />
          <Route path="/projects/new" element={<AuthGuard><NewProjectPage /></AuthGuard>} />
          <Route path="/training" element={<AuthGuard><TrainingPage /></AuthGuard>} />
          <Route path="/training/new" element={<AuthGuard><NewTrainingPage /></AuthGuard>} />
          <Route path="/training/:id" element={<AuthGuard><InterviewRunPage /></AuthGuard>} />
          <Route path="/reviews" element={<AuthGuard><ReviewsPage /></AuthGuard>} />
          <Route path="/reviews/:id" element={<AuthGuard><ReviewPage /></AuthGuard>} />
          <Route path="/reviews/new" element={<AuthGuard><NewReviewPage /></AuthGuard>} />
          <Route path="/trends" element={<AuthGuard><TrendsPage /></AuthGuard>} />
          <Route path="/explore" element={<AuthGuard><ExplorePage /></AuthGuard>} />
          <Route path="/explore/experiences" element={<AuthGuard><ExperiencesPage /></AuthGuard>} />
          <Route path="/explore/experiences/:id" element={<AuthGuard><ExperienceDetailPage /></AuthGuard>} />
          <Route path="/explore/trends" element={<AuthGuard><ExploreTrendsPage /></AuthGuard>} />
          <Route path="/explore/trends/:id" element={<AuthGuard><ExploreTrendDetailPage /></AuthGuard>} />
          <Route path="/explore/projects" element={<AuthGuard><ExploreProjectsPage /></AuthGuard>} />
          <Route path="/explore/projects/:id" element={<AuthGuard><ExploreProjectDetailPage /></AuthGuard>} />
          <Route path="/explore/questions" element={<AuthGuard><QuestionSearchPage /></AuthGuard>} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
