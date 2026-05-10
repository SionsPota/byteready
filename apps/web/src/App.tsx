import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ResumesPage } from './pages/ResumesPage'
import { ResumeDetailPage } from './pages/ResumeDetailPage'
import { NewInterviewPage } from './pages/NewInterviewPage'
import { InterviewRunPage } from './pages/InterviewRunPage'
import { ReviewPage } from './pages/ReviewPage'
import { TrendsPage } from './pages/TrendsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function RootRedirect() {
  const { user } = useAuth()
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/resumes" element={<ProtectedRoute><ResumesPage /></ProtectedRoute>} />
          <Route path="/resumes/:id" element={<ProtectedRoute><ResumeDetailPage /></ProtectedRoute>} />
          <Route path="/interviews/new" element={<ProtectedRoute><NewInterviewPage /></ProtectedRoute>} />
          <Route path="/interviews/:id/run" element={<ProtectedRoute><InterviewRunPage /></ProtectedRoute>} />
          <Route path="/reviews/:id" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
          <Route path="/trends" element={<ProtectedRoute><TrendsPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
