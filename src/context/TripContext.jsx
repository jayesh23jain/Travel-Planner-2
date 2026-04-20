import { createContext, useCallback, useContext, useEffect, useReducer } from 'react'
import { db } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore'

const TripContext = createContext(null)

const initialState = {
  trips: [],
  activeTrip: null,
  loading: false,
  error: null,
}

function tripReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':  return { ...state, loading: action.payload }
    case 'SET_TRIPS':    return { ...state, trips: action.payload, loading: false }
    case 'SET_ACTIVE':   return { ...state, activeTrip: action.payload }
    case 'ADD_TRIP':     return { ...state, trips: [action.payload, ...state.trips] }
    case 'UPDATE_TRIP':
      return {
        ...state,
        trips: state.trips.map(t => t.id === action.payload.id ? action.payload : t),
        activeTrip: state.activeTrip?.id === action.payload.id ? action.payload : state.activeTrip,
      }
    case 'DELETE_TRIP':
      return {
        ...state,
        trips: state.trips.filter(t => t.id !== action.payload),
        activeTrip: state.activeTrip?.id === action.payload ? null : state.activeTrip,
      }
    case 'SET_ERROR': return { ...state, error: action.payload, loading: false }
    default:          return state
  }
}

export function TripProvider({ children }) {
  const [state, dispatch] = useReducer(tripReducer, initialState)
  const { user } = useAuth()

  // Set up real-time listener for trips
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'SET_TRIPS', payload: [] })
      dispatch({ type: 'SET_ACTIVE', payload: null })
      return
    }

    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const q = query(
        collection(db, 'trips'),
        where('user_id', '==', user.uid)
      )

      // Real-time listener - updates automatically when data changes
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          // Sort by created_at in JavaScript
          data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          console.log('Trips updated from Firestore:', data)
          dispatch({ type: 'SET_TRIPS', payload: data })
          if (data.length > 0) {
            dispatch({ type: 'SET_ACTIVE', payload: data[0] })
          }
          dispatch({ type: 'SET_LOADING', payload: false })
        },
        (error) => {
          console.error('Error listening to trips:', error)
          dispatch({ type: 'SET_ERROR', payload: error.message })
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      )

      // Clean up listener on unmount or user change
      return () => unsubscribe()
    } catch (error) {
      console.error('Error setting up trips listener:', error)
      dispatch({ type: 'SET_ERROR', payload: error.message })
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [user])

  const setActiveTrip = useCallback(trip => {
    dispatch({ type: 'SET_ACTIVE', payload: trip })
  }, [])

  const createTrip = useCallback(async (tripData) => {
    try {
      console.log('Creating trip with data:', tripData)
      const docRef = await addDoc(collection(db, 'trips'), {
        ...tripData,
        user_id: user.uid,
        created_at: new Date(),
        updated_at: new Date(),
      })
      console.log('Trip created successfully with ID:', docRef.id)
      // Real-time listener will automatically update the UI
      return { data: { id: docRef.id, ...tripData }, error: null }
    } catch (error) {
      console.error('Error creating trip:', error)
      return { data: null, error: error.message }
    }
  }, [user])

  const updateTrip = useCallback(async (id, updates) => {
    try {
      await updateDoc(doc(db, 'trips', id), {
        ...updates,
        updated_at: new Date(),
      })
      const data = { id, ...updates }
      dispatch({ type: 'UPDATE_TRIP', payload: data })
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }, [])

  const deleteTrip = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, 'trips', id))
      dispatch({ type: 'DELETE_TRIP', payload: id })
      return { error: null }
    } catch (error) {
      return { error: error.message }
    }
  }, [])

  return (
    <TripContext.Provider value={{
      ...state, setActiveTrip, createTrip, updateTrip, deleteTrip,
    }}>
      {children}
    </TripContext.Provider>
  )
}

export const useTrip = () => useContext(TripContext)
