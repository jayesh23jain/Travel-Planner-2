import { useCallback, useEffect, useState } from 'react'

export function useGeolocation() {
  const [location, setLocation]   = useState(null)
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  useEffect(() => { getLocation() }, [getLocation])

  return { location, error, loading, retry: getLocation }
}
