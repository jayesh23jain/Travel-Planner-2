import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function useTripAuth(redirectTo = '/login') {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) navigate(redirectTo, { replace: true })
  }, [user, loading, navigate, redirectTo])

  return { user, profile, loading }
}
