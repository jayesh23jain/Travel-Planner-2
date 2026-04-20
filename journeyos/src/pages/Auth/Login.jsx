import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const { signIn }  = useAuth()
  const navigate    = useNavigate()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(form.email, form.password)
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#07070f] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <motion.div animate={{ x: [0,40,0], y: [0,30,0] }} transition={{ duration: 15, repeat: Infinity }}
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-radial from-cyan-500/20 to-transparent blur-[80px]" />
      <motion.div animate={{ x: [0,-30,0], y: [0,40,0] }} transition={{ duration: 20, repeat: Infinity, delay: 5 }}
        className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-radial from-violet-500/20 to-transparent blur-[80px]" />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-md relative">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-violet-500/30">
            🌍
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-white/40 text-sm mt-1">Sign in to JourneyOS</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-white/50 text-xs font-mono uppercase tracking-wider block mb-2">Email</label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20
                           focus:outline-none focus:border-cyan-400/50 focus:bg-white/10 transition-all text-sm"
              />
            </div>
            <div>
              <label className="text-white/50 text-xs font-mono uppercase tracking-wider block mb-2">Password</label>
              <input
                type="password" required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20
                           focus:outline-none focus:border-cyan-400/50 focus:bg-white/10 transition-all text-sm"
              />
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold
                         shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-shadow disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-white/30 text-sm mt-6">
          No account?{' '}
          <Link to="/signup" className="text-cyan-400 hover:text-cyan-300 transition-colors">Create one →</Link>
        </p>
      </motion.div>
    </div>
  )
}
