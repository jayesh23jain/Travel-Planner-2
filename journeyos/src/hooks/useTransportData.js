import { useCallback, useEffect, useReducer } from 'react'
import { db } from '../lib/supabaseClient'
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'

const initialState = {
  options: { flight: [], train: [], bus: [] },
  loading: false,
  error: null,
  selected: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOADING': return { ...state, loading: true, error: null }
    case 'SUCCESS': return { ...state, loading: false, options: action.payload }
    case 'ERROR':   return { ...state, loading: false, error: action.payload }
    case 'SELECT':  return { ...state, selected: action.payload }
    default:        return state
  }
}

export function useTransportData(tripId) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const fetchOptions = useCallback(async () => {
    if (!tripId) return
    dispatch({ type: 'LOADING' })
    try {
      const q = query(
        collection(db, 'transport_options'),
        where('trip_id', '==', tripId)
      )
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      const grouped = { flight: [], train: [], bus: [] }
      data
        .sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
        .forEach(item => {
          if (grouped[item.mode]) grouped[item.mode].push(item)
          else grouped.bus.push(item)
        })
      dispatch({ type: 'SUCCESS', payload: grouped })
    } catch (error) {
      dispatch({ type: 'ERROR', payload: error.message })
    }
  }, [tripId])

  useEffect(() => { fetchOptions() }, [fetchOptions])

  const selectOption = useCallback(async (option) => {
    try {
      const q = query(
        collection(db, 'transport_options'),
        where('trip_id', '==', tripId)
      )
      const snapshot = await getDocs(q)
      snapshot.docs.forEach(async (doc) => {
        if (doc.id !== option.id) {
          await updateDoc(doc.ref, { is_selected: false })
        }
      })
      
      await updateDoc(doc(db, 'transport_options', option.id), { is_selected: true })
      dispatch({ type: 'SELECT', payload: { ...option, is_selected: true } })
    } catch (error) {
      console.error('Error selecting option:', error)
    }
  }, [tripId])

  return { ...state, refetch: fetchOptions, selectOption }
}
