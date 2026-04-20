import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTrip } from '../context/TripContext'
import { useTripAuth } from '../hooks/useTripAuth'
import { db } from '../lib/supabaseClient'
import { collection, query, where, getDocs } from 'firebase/firestore'

const InteractiveGlobe = lazy(() => import('../components/globe/InteractiveGlobe'))

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}
const fadeUp = {
  hidden:  { opacity: 0, y: 28, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

/* ── Background ── */
function Bg() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[#07070f]" />
      <motion.div animate={{ x:[0,60,0], y:[0,40,0] }} transition={{ duration:18, repeat:Infinity, ease:'easeInOut' }}
        className="absolute -top-60 -left-60 w-[700px] h-[700px] rounded-full bg-gradient-radial from-cyan-500/25 to-transparent blur-[110px]" />
      <motion.div animate={{ x:[0,-50,0], y:[0,60,0] }} transition={{ duration:22, repeat:Infinity, ease:'easeInOut', delay:5 }}
        className="absolute top-1/3 -right-60 w-[600px] h-[600px] rounded-full bg-gradient-radial from-violet-600/25 to-transparent blur-[100px]" />
      <motion.div animate={{ x:[0,35,0], y:[0,-30,0] }} transition={{ duration:26, repeat:Infinity, ease:'easeInOut', delay:10 }}
        className="absolute -bottom-60 left-1/3 w-[500px] h-[500px] rounded-full bg-gradient-radial from-amber-500/15 to-transparent blur-[100px]" />
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />
    </div>
  )
}

/* ── Glass Card ── */
function GlassCard({ children, className = '', onClick, hover = true }) {
  return (
    <motion.div variants={fadeUp} whileHover={hover ? { scale: 1.012, y: -3 } : {}} onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl
        shadow-[0_8px_40px_rgba(0,0,0,0.45)] ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/8 via-transparent to-transparent pointer-events-none" />
      {children}
    </motion.div>
  )
}

/* ── Stat tile ── */
function StatTile({ icon, label, value, sub, accent, onClick }) {
  return (
    <GlassCard onClick={onClick} className="p-5 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${accent}`}>{icon}</div>
      <div>
        <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono">{label}</p>
        <p className="text-white text-2xl font-bold mt-0.5 leading-tight">{value}</p>
        {sub && <p className="text-white/35 text-xs mt-1">{sub}</p>}
      </div>
    </GlassCard>
  )
}

/* ── Countdown ring ── */
function CountdownRing({ days }) {
  const max = 365
  const r   = 38
  const c   = 2 * Math.PI * r
  const pct = Math.min(days / max, 1)
  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
        <motion.circle cx="50" cy="50" r={r} fill="none" stroke="url(#rg)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.6, ease: 'easeOut', delay: 0.5 }} />
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white text-xl font-bold leading-none">{days}</span>
        <span className="text-white/35 text-[10px] mt-0.5">days</span>
      </div>
    </div>
  )
}

/* ── Budget bar ── */
function BudgetBar({ spent, total }) {
  const pct  = total > 0 ? Math.min((spent / total) * 100, 100) : 0
  const warn = pct > 80
  return (
    <div className="space-y-1.5 w-full">
      <div className="flex justify-between text-xs">
        <span className="text-white/40">Spent</span>
        <span className={warn ? 'text-amber-400' : 'text-white/55'}>
          ₹{spent.toLocaleString()} / ₹{total.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <motion.div className={`h-full rounded-full ${warn
          ? 'bg-gradient-to-r from-amber-500 to-red-500'
          : 'bg-gradient-to-r from-cyan-400 to-violet-500'}`}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.6 }} />
      </div>
    </div>
  )
}

/* ── Trip pill ── */
function TripPill({ trip, isActive, onClick }) {
  return (
    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap
        ${isActive
          ? 'bg-cyan-400/20 border-cyan-400/50 text-cyan-300'
          : 'bg-white/5 border-white/10 text-white/45 hover:text-white/75 hover:bg-white/10'}`}>
      {trip.destination}
    </motion.button>
  )
}

/* ── Globe skeleton ── */
function GlobeSkeleton() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <motion.div className="w-36 h-36 rounded-full border-2 border-cyan-400/30"
        animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
      <p className="text-white/25 text-xs font-mono">Initialising 3D renderer…</p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate              = useNavigate()
  const { profile }           = useTripAuth()
  const { trips, activeTrip, setActiveTrip } = useTrip()

  const [expenses, setExpenses]   = useState([])
  const [greeting, setGreeting]   = useState('')
  const [time, setTime]           = useState(new Date())
  const [showNewTrip, setShowNewTrip] = useState(false)
  const [newTrip, setNewTrip]     = useState({ title:'', origin:'', destination:'', start_date:'', end_date:'', total_budget:'' })
  const [creating, setCreating]   = useState(false)
  const { createTrip }            = useTrip()

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
    const t = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!activeTrip) return
    getDocs(query(collection(db, 'expenses'), where('trip_id', '==', activeTrip.id)))
      .then((snapshot) => setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(error => console.error('Error fetching expenses:', error))
  }, [activeTrip])

  const budget = useMemo(() => {
    const spent = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const total = activeTrip?.total_budget ?? 0
    return { spent, remaining: total - spent, pct: total > 0 ? ((spent/total)*100).toFixed(1) : 0 }
  }, [expenses, activeTrip])

  const daysUntil = useMemo(() => {
    if (!activeTrip?.start_date || isNaN(new Date(activeTrip.start_date))) return null
    return Math.max(0, Math.ceil((new Date(activeTrip.start_date) - new Date()) / 86400000))
  }, [activeTrip])

  const duration = useMemo(() => {
    if (!activeTrip?.start_date || !activeTrip?.end_date || isNaN(new Date(activeTrip.start_date)) || isNaN(new Date(activeTrip.end_date))) return null
    return Math.ceil((new Date(activeTrip.end_date) - new Date(activeTrip.start_date)) / 86400000)
  }, [activeTrip])

  const goTo = useCallback(path => navigate(path), [navigate])

  const handleCreateTrip = async (e) => {
    e.preventDefault()
    setCreating(true)
    await createTrip({ ...newTrip, total_budget: Number(newTrip.total_budget), status: 'planning' })
    setCreating(false)
    setShowNewTrip(false)
    setNewTrip({ title:'', origin:'', destination:'', start_date:'', end_date:'', total_budget:'' })
  }

  const modules = [
    { icon:'✈️', title:'Transport Engine',  desc:'Compare flights, trains & buses.',            accent:'text-sky-400',     path:'/transport' },
    { icon:'🗺️', title:'Itinerary Builder', desc:'Drag-and-drop daily planner + hotel map.',   accent:'text-violet-400',  path:'/itinerary' },
    { icon:'📋', title:'Smart Checklist',   desc:'Weather-aware packing & document vault.',    accent:'text-emerald-400', path:'/checklist' },
    { icon:'💸', title:'Burn Rate Tracker', desc:'Live budget charts with spend analytics.',   accent:'text-amber-400',   path:'/budget'    },
    { icon:'📡', title:'In-Trip Radar',     desc:'Nearest ATMs, pharmacies & supermarkets.',  accent:'text-rose-400',    path:'/radar'     },
  ]

  return (
    <div className="relative min-h-screen text-white">
      {console.log('Dashboard rendering - activeTrip:', activeTrip)}
      {!activeTrip && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#07070f]">
          <div className="text-center">
            <p className="text-white/50 text-lg">Loading trip data...</p>
          </div>
        </div>
      )}
      <Bg />
      <div className="max-w-[1400px] mx-auto px-5 py-8 space-y-8">

        {/* ── Header ── */}
        <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-white/35 text-sm font-mono">
              {time.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold mt-0.5">
              {greeting},{' '}
              <span className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">
                {profile?.username ?? 'Traveller'}
              </span>{' '}👋
            </h1>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            {trips.map(trip => (
              <TripPill key={trip.id} trip={trip} isActive={activeTrip?.id === trip.id} onClick={() => setActiveTrip(trip)} />
            ))}
            <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
              onClick={() => setShowNewTrip(true)}
              className="px-4 py-1.5 rounded-full text-sm border border-dashed border-white/20 text-white/35
                         hover:text-white/70 hover:border-white/40 transition-all">
              + New Trip
            </motion.button>
          </div>
        </motion.div>

        {/* ── New Trip Modal ── */}
        <AnimatePresence>
          {showNewTrip && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
              onClick={e => e.target === e.currentTarget && setShowNewTrip(false)}>
              <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }}
                className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0d1a] backdrop-blur-xl p-8">
                <h2 className="text-white text-xl font-bold mb-6">Plan a New Trip</h2>
                <form onSubmit={handleCreateTrip} className="space-y-4">
                  {[
                    { key:'title',       label:'Trip Title',    type:'text',   placeholder:'e.g. Goa Getaway 2025' },
                    { key:'origin',      label:'Origin',        type:'text',   placeholder:'e.g. Bengaluru'         },
                    { key:'destination', label:'Destination',   type:'text',   placeholder:'e.g. Goa'              },
                    { key:'start_date',  label:'Start Date',    type:'date',   placeholder:''                      },
                    { key:'end_date',    label:'End Date',      type:'date',   placeholder:''                      },
                    { key:'total_budget',label:'Total Budget (₹)', type:'number', placeholder:'e.g. 25000'         },
                  ].map(({ key, label, type, placeholder }) => (
                    <div key={key}>
                      <label className="text-white/40 text-xs font-mono uppercase tracking-wider block mb-1.5">{label}</label>
                      <input type={type} required value={newTrip[key]} placeholder={placeholder}
                        onChange={e => setNewTrip(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm
                                   placeholder-white/20 focus:outline-none focus:border-cyan-400/50 transition-all" />
                    </div>
                  ))}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowNewTrip(false)}
                      className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white/80 text-sm transition-colors">
                      Cancel
                    </button>
                    <motion.button type="submit" disabled={creating} whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold text-sm disabled:opacity-60">
                      {creating ? 'Creating…' : 'Create Trip'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Active Trip Hero ── */}
        <AnimatePresence mode="wait">
          {activeTrip ? (
            <motion.div key={activeTrip.id} initial={{ opacity:0, scale:0.98 }} animate={{ opacity:1, scale:1 }}
              exit={{ opacity:0, scale:0.96 }} transition={{ duration:0.35 }}
              className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

              {/* Trip card */}
              <GlassCard className="p-0 overflow-hidden" hover={false}>
                {/* Header */}
                <div className="relative h-32 bg-gradient-to-br from-cyan-700/40 via-violet-700/40 to-[#07070f] overflow-hidden">
                  <div className="absolute inset-0 flex items-center px-8 gap-4">
                    <div className="text-center">
                      <p className="text-white/40 text-[10px] font-mono uppercase tracking-wider">From</p>
                      <p className="text-white text-xl font-bold">{activeTrip.origin}</p>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-px bg-white/15" />
                      <motion.span className="text-2xl" animate={{ x:[0,8,0] }} transition={{ duration:2, repeat:Infinity }}>✈</motion.span>
                      <div className="flex-1 h-px bg-white/15" />
                    </div>
                    <div className="text-center">
                      <p className="text-white/40 text-[10px] font-mono uppercase tracking-wider">To</p>
                      <p className="text-white text-xl font-bold">{activeTrip.destination}</p>
                    </div>
                  </div>
                  <div className="absolute top-3 right-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold border uppercase tracking-widest
                      ${activeTrip.status==='active'   ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                      : activeTrip.status==='planning' ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                                                       : 'bg-white/10 border-white/15 text-white/40'}`}>
                      {activeTrip.status}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex gap-6">
                      {[['Departs', activeTrip.start_date], ['Returns', activeTrip.end_date]].map(([lbl, d]) => (
                        <div key={lbl}>
                          <p className="text-white/35 text-[10px] font-mono uppercase tracking-wider">{lbl}</p>
                          <p className="text-white font-semibold text-sm mt-0.5">
                            {d && !isNaN(new Date(d)) ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : 'TBD'}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-white/35 text-sm">{duration} days · {activeTrip.title}</p>
                    <BudgetBar spent={budget.spent} total={activeTrip.total_budget ?? 0} />
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      { label:'View Itinerary',    path:'/itinerary', cls:'from-cyan-500/15 to-violet-500/15 border-cyan-400/25' },
                      { label:'Compare Transport', path:'/transport', cls:'from-violet-500/15 to-rose-500/15 border-violet-400/25' },
                      { label:'Track Budget',      path:'/budget',    cls:'from-amber-500/15 to-orange-500/15 border-amber-400/25' },
                    ].map(({ label, path, cls }) => (
                      <motion.button key={path} whileHover={{ x:5 }} whileTap={{ scale:0.97 }} onClick={() => goTo(path)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium text-white/75 hover:text-white bg-gradient-to-r ${cls} transition-all`}>
                        {label} →
                      </motion.button>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {/* Right col */}
              <div className="flex flex-col gap-4">
                <GlassCard className="p-6 flex flex-col items-center gap-4" hover={false}>
                  <p className="text-white/35 text-[10px] font-mono uppercase tracking-widest">
                    {daysUntil === 0 ? "It's today! 🎉" : 'Countdown'}
                  </p>
                  <CountdownRing days={daysUntil ?? 0} />
                  <p className="text-white/45 text-sm text-center">
                    {daysUntil === 0 ? 'Bon voyage!' : `until ${activeTrip.destination}`}
                  </p>
                </GlassCard>
                <GlassCard className="p-5 flex-1" hover={false}>
                  <p className="text-white/35 text-[10px] font-mono uppercase tracking-widest mb-4">Budget</p>
                  <div className="space-y-3">
                    {[
                      { label:'Total',    val:`₹${(activeTrip.total_budget??0).toLocaleString()}`, col:'text-white'       },
                      { label:'Spent',    val:`₹${budget.spent.toLocaleString()}`,                 col:'text-cyan-400'    },
                      { label:'Remaining',val:`₹${budget.remaining.toLocaleString()}`,             col:'text-emerald-400' },
                      { label:'Burn Rate',val:`${budget.pct}%`,                                   col:'text-violet-400'  },
                    ].map(({ label, val, col }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-white/35 text-sm">{label}</span>
                        <span className={`font-bold text-sm ${col}`}>{val}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }}>
              <GlassCard className="py-20 flex flex-col items-center gap-5 text-center" hover={false}>
                <motion.span className="text-7xl" animate={{ rotate:[0,10,-10,0] }} transition={{ duration:3, repeat:Infinity }}>🌍</motion.span>
                <h2 className="text-2xl font-bold">No active trip</h2>
                <p className="text-white/35 max-w-sm">Create your first trip to unlock the full JourneyOS experience.</p>
                <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }} onClick={() => setShowNewTrip(true)}
                  className="px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 font-semibold text-sm shadow-lg shadow-violet-500/30">
                  Plan a New Trip
                </motion.button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Globe ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <GlassCard className="overflow-hidden" hover={false}>
            <div className="p-5 border-b border-white/8 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">Destination Globe</h2>
                <p className="text-white/35 text-sm">Drag to rotate · Scroll to zoom</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/25 text-cyan-300 text-xs font-mono">3D · LIVE</span>
            </div>
            <div className="h-[360px] sm:h-[420px]">
              <Suspense fallback={<GlobeSkeleton />}>
                <InteractiveGlobe markers={trips.map(t => ({ label: t.destination, isActive: t.id === activeTrip?.id }))} />
              </Suspense>
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Stats ── */}
        <motion.div variants={stagger} initial="hidden" animate="visible"
          className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatTile icon="🛫" label="Trips Planned" value={trips.length}
            sub={`${trips.filter(t=>t.status==='active').length} active`}
            accent="bg-cyan-400/10 text-cyan-300" onClick={() => {}} />
          <StatTile icon="💰" label="Total Spent" value={`₹${budget.spent.toLocaleString()}`}
            sub="this trip" accent="bg-amber-400/10 text-amber-300" onClick={() => goTo('/budget')} />
          <StatTile icon="📋" label="Checklist" value="Smart"
            sub="Weather-aware packing" accent="bg-emerald-400/10 text-emerald-300" onClick={() => goTo('/checklist')} />
          <StatTile icon="📡" label="Radar" value="Live"
            sub="Nearby essentials" accent="bg-rose-400/10 text-rose-300" onClick={() => goTo('/radar')} />
        </motion.div>

        {/* ── Modules ── */}
        <div>
          <motion.h2 initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.3 }}
            className="text-white/35 text-xs font-mono uppercase tracking-widest mb-5">— Modules</motion.h2>
          <motion.div variants={stagger} initial="hidden" animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {modules.map(({ icon, title, desc, accent, path }) => (
              <GlassCard key={path} onClick={() => goTo(path)} className="p-6 group">
                <div className={`text-3xl mb-4 inline-block transition-transform duration-300 group-hover:scale-110 ${accent}`}>{icon}</div>
                <h3 className="text-white font-semibold text-sm mb-1">{title}</h3>
                <p className="text-white/35 text-xs leading-relaxed">{desc}</p>
                <motion.div className="mt-4 text-xs font-mono text-white/25 group-hover:text-white/60 transition-colors flex items-center gap-1"
                  whileHover={{ x:4 }}>
                  Open <span>→</span>
                </motion.div>
              </GlassCard>
            ))}
          </motion.div>
        </div>

        <p className="text-center text-white/10 text-xs font-mono pb-4">
          JourneyOS v1.0 · React + Firebase + Three.js
        </p>
      </div>
    </div>
  )
}
