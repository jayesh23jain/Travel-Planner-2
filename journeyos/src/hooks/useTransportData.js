import { useCallback, useEffect, useReducer } from 'react'
import { db } from '../lib/supabaseClient'
import { collection, query, where, getDocs, updateDoc, doc, writeBatch, getDoc } from 'firebase/firestore'

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

// Helpers for dummy generation
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const addMinutes = (date, mins) => new Date(date.getTime() + mins * 60000)

const AIRLINES = ['Indigo', 'Vistara', 'Air India', 'SpiceJet', 'Akasa Air', 'Air India Express']
const TRAINS = ['Vande Bharat Express', 'Shatabdi Express', 'Rajdhani Express', 'Duronto Express', 'Superfast Express']
const BUSES = ['IntrCity SmartBus', 'Zingbus', 'RedBus Platinum', 'SRS Travels', 'VRL Travels', 'Orange Travels']

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
      
      // AUTO-SEED DUMMY DATA IF EMPTY
      if (snapshot.empty) {
        const tripRef = doc(db, 'trips', tripId)
        const tripSnap = await getDoc(tripRef)
        const trip = tripSnap.exists() ? tripSnap.data() : { start_date: new Date().toISOString() }
        const baseDate = new Date(trip.start_date || new Date())
        
        const batch = writeBatch(db)
        
        const generateOptions = (mode, count, limitProviders, durationLimit, priceLimit) => {
          for (let i = 0; i < count; i++) {
            const docRef = doc(collection(db, 'transport_options'))
            const duration = randomInt(durationLimit[0], durationLimit[1])
            const depTime = addMinutes(baseDate, randomInt(360, 1080)) // Between 6am and 6pm on start date
            const arrTime = addMinutes(depTime, duration)
            const price = randomInt(priceLimit[0], priceLimit[1])
            
            batch.set(docRef, {
              trip_id: tripId,
              mode,
              provider: limitProviders[randomInt(0, limitProviders.length - 1)],
              price,
              duration_mins: duration,
              departure_time: depTime.toISOString(),
              arrival_time: arrTime.toISOString(),
              comfort_score: randomInt(3, 5),
              is_selected: false,
              created_at: new Date().toISOString()
            })
          }
        }

        generateOptions('flight', randomInt(3, 5), AIRLINES, [90, 240], [3500, 9500])
        generateOptions('train', randomInt(2, 4), TRAINS, [300, 900], [800, 3200])
        generateOptions('bus', randomInt(3, 6), BUSES, [400, 1000], [500, 1800])
        
        await batch.commit()
        
        // Refetch immediately to get the seeded data including their IDs
        const newSnapshot = await getDocs(q)
        processSnapshot(newSnapshot)
        return
      }

      processSnapshot(snapshot)
    } catch (error) {
      dispatch({ type: 'ERROR', payload: error.message })
    }
  }, [tripId])

  const processSnapshot = (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const grouped = { flight: [], train: [], bus: [] }
    let hasSelected = null
    
    data
      .sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
      .forEach(item => {
        if (item.is_selected) hasSelected = item
        if (grouped[item.mode]) grouped[item.mode].push(item)
        else grouped.bus.push(item) // Fallback
      })
      
    dispatch({ type: 'SUCCESS', payload: grouped })
    if (hasSelected) dispatch({ type: 'SELECT', payload: hasSelected })
  }

  useEffect(() => { fetchOptions() }, [fetchOptions])

  const selectOption = useCallback(async (option) => {
    try {
      const q = query(
        collection(db, 'transport_options'),
        where('trip_id', '==', tripId)
      )
      const snapshot = await getDocs(q)
      
      const batch = writeBatch(db)
      snapshot.docs.forEach((d) => {
        if (d.id !== option.id) batch.update(d.ref, { is_selected: false })
      })
      batch.update(doc(db, 'transport_options', option.id), { is_selected: true })
      await batch.commit()

      dispatch({ type: 'SELECT', payload: { ...option, is_selected: true } })
    } catch (error) {
      console.error('Error selecting option:', error)
    }
  }, [tripId])

  return { ...state, refetch: fetchOptions, selectOption }
}
