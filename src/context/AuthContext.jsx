import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../lib/supabaseClient'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      const profileDoc = await getDoc(doc(db, 'profiles', userId))
      if (profileDoc.exists()) {
        setProfile(profileDoc.data())
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      return { data: result, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { data: null, error: { message: error.message } }
    }
  }

  const signUp = async (email, password, username) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      if (result.user) {
        await setDoc(doc(db, 'profiles', result.user.uid), {
          id: result.user.uid,
          email: result.user.email,
          username: username || email.split('@')[0],
          createdAt: new Date(),
        })
      }
      return { data: result, error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { data: null, error: { message: error.message } }
    }
  }

  const signOut = () => firebaseSignOut(auth)

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
