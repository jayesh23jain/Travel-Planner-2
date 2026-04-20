import { Component, lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { TripProvider } from '../context/TripContext'
import AppShell from '../components/layout/AppShell'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Login from '../pages/Auth/Login'
import Signup from '../pages/Auth/Signup'
import NotFound from '../pages/NotFound'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#222', color: 'red', zIndex: 9999, position: 'relative' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}


const Dashboard     = lazy(() => import('../pages/Dashboard'))
const Transport     = lazy(() => import('../pages/Transport'))
const Itinerary     = lazy(() => import('../pages/Itinerary'))
const Checklist     = lazy(() => import('../pages/Checklist'))
const BudgetTracker = lazy(() => import('../pages/BudgetTracker'))
const InTripRadar   = lazy(() => import('../pages/InTripRadar'))

function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#07070f]">
      <LoadingSpinner size="lg" label="Loading JourneyOS..." />
    </div>
  )
}

function ProtectedRoute({ element }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true, state: { from: location } })
    }
  }, [user, loading, navigate, location])

  if (loading) return <PageLoader />
  if (!user) return null
  
  return element
}

function AuthLayout() {
  const { loading } = useAuth()
  
  if (loading) return <PageLoader />
  return <Suspense fallback={<PageLoader />}><AppShell /></Suspense>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return <PageLoader />

  return (
    <Routes>
      {!user ? (
        <>
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<AuthLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="transport" element={<Suspense fallback={<PageLoader />}><Transport /></Suspense>} />
            <Route path="itinerary" element={<Suspense fallback={<PageLoader />}><Itinerary /></Suspense>} />
            <Route path="checklist" element={<Suspense fallback={<PageLoader />}><Checklist /></Suspense>} />
            <Route path="budget"    element={<Suspense fallback={<PageLoader />}><BudgetTracker /></Suspense>} />
            <Route path="radar"     element={<Suspense fallback={<PageLoader />}><InTripRadar /></Suspense>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </>
      )}
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <TripProvider>
            <AppRoutes />
          </TripProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
