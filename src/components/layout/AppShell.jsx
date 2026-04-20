import { useCallback, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useTrip } from '../../context/TripContext'

const NAV_ITEMS = [
  { path: '/dashboard', icon: '🏠', label: 'Dashboard'  },
  { path: '/transport', icon: '✈️', label: 'Transport'  },
  { path: '/itinerary', icon: '🗺️', label: 'Itinerary' },
  { path: '/checklist', icon: '📋', label: 'Checklist'  },
  { path: '/budget',    icon: '💸', label: 'Budget'     },
  { path: '/radar',     icon: '📡', label: 'Radar'      },
]

export default function AppShell() {
  const { signOut, profile }   = useAuth()
  const { activeTrip }         = useTrip()
  const location               = useLocation()
  const navigate               = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = useCallback(async () => {
    await signOut()
    navigate('/login', { replace: true })
  }, [signOut, navigate])

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-20 lg:w-56 shrink-0 border-r border-white/8 bg-black/20 backdrop-blur-xl sticky top-0 h-screen py-6 z-40">
        <div className="px-4 mb-8">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-lg shadow-lg">
              🌍
            </div>
            <span className="hidden lg:block font-bold text-base">
              Journey<span className="text-cyan-400">OS</span>
            </span>
          </Link>
        </div>

        {activeTrip && (
          <div className="hidden lg:block mx-3 mb-5 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white/30 text-[10px] font-mono uppercase tracking-wider">Active Trip</p>
            <p className="text-white/80 text-sm font-medium truncate mt-0.5">→ {activeTrip.destination}</p>
          </div>
        )}

        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map(({ path, icon, label }) => (
            <NavLink key={path} to={path} end={path === '/dashboard'}>
              {({ isActive }) => (
                <motion.div
                  whileHover={{ x: 3 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer
                    ${isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-400/30 text-white'
                      : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                >
                  <span className="text-lg w-6 text-center">{icon}</span>
                  <span className="hidden lg:block">{label}</span>
                  {isActive && (
                    <motion.div layoutId="nav-dot" className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  )}
                </motion.div>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 mt-4 border-t border-white/8 pt-4 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-cyan-600 flex items-center justify-center text-xs font-bold shrink-0">
              {profile?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="hidden lg:block">
              <p className="text-white/70 text-sm font-medium truncate max-w-[110px]">{profile?.username ?? 'Traveller'}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ x: 2 }}
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-xl text-white/30 hover:text-rose-400 text-sm flex items-center gap-3 hover:bg-white/5 transition-colors"
          >
            <span className="text-lg">🚪</span>
            <span className="hidden lg:block">Sign out</span>
          </motion.button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-xl border-b border-white/8">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-sm">🌍</div>
          <span className="font-bold text-sm">Journey<span className="text-cyan-400">OS</span></span>
        </Link>
        <button onClick={() => setMobileOpen(v => !v)} className="text-white/60 text-2xl">☰</button>
      </div>

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="md:hidden fixed inset-0 z-50 bg-[#07070f]/95 backdrop-blur-xl flex flex-col pt-16 px-6"
          >
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-white/40 text-2xl">✕</button>
            <nav className="space-y-2 mt-4">
              {NAV_ITEMS.map(({ path, icon, label }) => (
                <Link key={path} to={path} onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/10 text-base transition-colors">
                  <span className="text-2xl">{icon}</span>{label}
                </Link>
              ))}
            </nav>
            <button onClick={handleSignOut} className="mt-auto mb-8 text-white/30 text-sm hover:text-rose-400 transition-colors">Sign out</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page outlet ── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden md:pt-0 pt-14">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
