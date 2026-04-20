import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTripAuth } from '../hooks/useTripAuth'
import { useGeolocation } from '../hooks/useGeolocation'

const stagger = { hidden:{}, visible:{ transition:{ staggerChildren:0.07 } } }
const fadeUp  = { hidden:{ opacity:0, y:16 }, visible:{ opacity:1, y:0, transition:{ duration:0.35 } } }

const PLACE_TYPES = {
  atm:        { icon:'🏧', label:'ATMs',          query:'atm',           color:'text-emerald-300', bg:'bg-emerald-500/10 border-emerald-400/20' },
  pharmacy:   { icon:'💊', label:'Pharmacies',    query:'pharmacy',      color:'text-rose-300',    bg:'bg-rose-500/10 border-rose-400/20'   },
  supermarket:{ icon:'🛒', label:'Supermarkets',  query:'supermarket',   color:'text-sky-300',     bg:'bg-sky-500/10 border-sky-400/20'     },
  hospital:   { icon:'🏥', label:'Hospitals',     query:'hospital',      color:'text-amber-300',   bg:'bg-amber-500/10 border-amber-400/20' },
  restaurant: { icon:'🍽️', label:'Restaurants',  query:'restaurant',    color:'text-violet-300',  bg:'bg-violet-500/10 border-violet-400/20' },
  police:     { icon:'👮', label:'Police',        query:'police',        color:'text-cyan-300',    bg:'bg-cyan-500/10 border-cyan-400/20'   },
}

// Simulated nearby places (in production, call Google Places API with location)
function generateMockPlaces(type, lat, lng) {
  const names = {
    atm:         ['HDFC Bank ATM','SBI ATM','ICICI ATM','Axis Bank ATM','Canara Bank ATM'],
    pharmacy:    ['Apollo Pharmacy','MedPlus','Wellness Forever','Frank Ross','Netmeds'],
    supermarket: ['DMart','Reliance Fresh','Big Bazaar','Star Bazaar','Nature\'s Basket'],
    hospital:    ['Apollo Hospital','Fortis','Manipal Hospital','NIMHANS','Victoria Hospital'],
    restaurant:  ['Café Coffee Day','Barbeque Nation','Paradise Biryani','A2B','Saravana Bhavan'],
    police:      ['Local Police Station','Traffic Control','Tourist Police','PCR Van Stand','Control Room'],
  }
  const list = names[type] || names.atm
  return list.slice(0,4).map((name, i) => ({
    id: `${type}_${i}`,
    name,
    distance: `${(0.2 + i * 0.35 + Math.random()*0.2).toFixed(1)} km`,
    rating: (3.8 + Math.random()*1.2).toFixed(1),
    open: Math.random() > 0.2,
    lat: lat + (Math.random()-0.5)*0.01,
    lng: lng + (Math.random()-0.5)*0.01,
    address: `${Math.floor(Math.random()*200)+1}, Main Road, Near Landmark`,
  }))
}

function PlaceCard({ place, meta }) {
  return (
    <motion.div variants={fadeUp}
      className={`rounded-xl border p-4 ${meta.bg} backdrop-blur-sm hover:scale-[1.015] transition-transform`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm truncate ${meta.color}`}>{place.name}</p>
          <p className="text-white/30 text-xs mt-0.5 truncate">{place.address}</p>
        </div>
        <span className={`shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full border
          ${place.open ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400' : 'bg-rose-500/15 border-rose-400/30 text-rose-400'}`}>
          {place.open ? 'OPEN' : 'CLOSED'}
        </span>
      </div>
      <div className="flex items-center gap-4 mt-3">
        <span className="text-white/50 text-xs">📍 {place.distance}</span>
        <span className="text-yellow-400 text-xs">⭐ {place.rating}</span>
        <motion.a whileHover={{ scale:1.05 }}
          href={`https://maps.google.com/?q=${place.lat},${place.lng}`}
          target="_blank" rel="noopener noreferrer"
          className="ml-auto text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
          Maps →
        </motion.a>
      </div>
    </motion.div>
  )
}

function Bg() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <div className="absolute inset-0 bg-[#07070f]" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-radial from-rose-500/15 to-transparent blur-[100px]" />
      <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-gradient-radial from-cyan-500/10 to-transparent blur-[90px]" />
    </div>
  )
}

export default function InTripRadar() {
  useTripAuth()
  const { location, error: geoError, loading: geoLoading, retry } = useGeolocation()
  const [activeType, setActiveType] = useState('atm')
  const [results, setResults]       = useState({})
  const [searching, setSearching]   = useState(false)

  const search = useCallback(async (type) => {
    setActiveType(type)
    if (!location) return
    if (results[type]) return // cached

    setSearching(true)
    await new Promise(r => setTimeout(r, 800)) // simulate network
    const places = generateMockPlaces(type, location.lat, location.lng)
    setResults(prev => ({ ...prev, [type]: places }))
    setSearching(false)
  }, [location, results])

  const currentResults = results[activeType] || []
  const meta           = PLACE_TYPES[activeType]

  return (
    <div className="relative min-h-screen text-white">
      <Bg />
      <div className="max-w-4xl mx-auto px-5 py-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }}>
          <p className="text-white/35 text-xs font-mono uppercase tracking-widest mb-1">Module · Radar</p>
          <h1 className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-rose-300 to-orange-400 bg-clip-text text-transparent">In-Trip</span>{' '}
            Essentials Radar
          </h1>
        </motion.div>

        {/* Location status */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible"
          className={`rounded-2xl border p-5 backdrop-blur-xl
            ${location ? 'border-emerald-400/25 bg-emerald-500/8' : 'border-white/10 bg-white/5'}`}>
          {geoLoading ? (
            <div className="flex items-center gap-3">
              <motion.div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-cyan-400"
                animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
              <p className="text-white/60 text-sm">Acquiring your location…</p>
            </div>
          ) : geoError ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-rose-400 text-sm font-medium">Location access denied</p>
                <p className="text-white/35 text-xs mt-0.5">{geoError}</p>
              </div>
              <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }} onClick={retry}
                className="px-4 py-2 rounded-xl border border-white/15 text-white/60 hover:text-white text-sm transition-colors">
                Retry
              </motion.button>
            </div>
          ) : location ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center">
                  <motion.div className="w-3 h-3 rounded-full bg-emerald-400"
                    animate={{ scale:[1,1.3,1] }} transition={{ duration:2, repeat:Infinity }} />
                </div>
                <div>
                  <p className="text-emerald-300 text-sm font-semibold">Location acquired</p>
                  <p className="text-white/35 text-xs font-mono">
                    {location.lat.toFixed(4)}°N, {location.lng.toFixed(4)}°E
                  </p>
                </div>
              </div>
              <span className="text-emerald-400/60 text-xs font-mono">LIVE</span>
            </div>
          ) : null}
        </motion.div>

        {location && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">

            {/* Type selector */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
              {Object.entries(PLACE_TYPES).map(([type, m]) => (
                <motion.button key={type} whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
                  onClick={() => search(type)}
                  className={`px-4 py-2 rounded-full text-sm border transition-all
                    ${activeType===type
                      ? `${m.bg} ${m.color} border-opacity-60`
                      : 'border-white/8 text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
                  {m.icon} {m.label}
                </motion.button>
              ))}
            </motion.div>

            {/* Results */}
            <motion.div variants={fadeUp}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
              <div className="p-5 border-b border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{meta.icon}</span>
                  <h2 className="text-white font-semibold">Nearby {meta.label}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {searching && (
                    <motion.div className="w-4 h-4 rounded-full border-2 border-white/10 border-t-cyan-400"
                      animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
                  )}
                  <span className="text-white/30 text-xs font-mono">{currentResults.length} found</span>
                </div>
              </div>

              <div className="p-4">
                {!searching && currentResults.length === 0 ? (
                  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="text-center py-10">
                    <p className="text-3xl mb-2">{meta.icon}</p>
                    <p className="text-white/30 text-sm">Click a category above to search nearby</p>
                  </motion.div>
                ) : (
                  <motion.div variants={stagger} initial="hidden" animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {searching ? (
                      Array.from({ length:4 }).map((_,i) => (
                        <motion.div key={i} className="rounded-xl border border-white/8 bg-white/5 p-4 space-y-2 animate-pulse">
                          <div className="h-4 bg-white/10 rounded w-3/4" />
                          <div className="h-3 bg-white/8 rounded w-1/2" />
                          <div className="h-3 bg-white/8 rounded w-2/3" />
                        </motion.div>
                      ))
                    ) : (
                      currentResults.map(place => (
                        <PlaceCard key={place.id} place={place} meta={meta} />
                      ))
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Mini map placeholder */}
            <motion.div variants={fadeUp}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
              <div className="p-5 border-b border-white/8">
                <h2 className="text-white font-semibold">Map View</h2>
                <p className="text-white/35 text-sm">Open in Google Maps for full navigation</p>
              </div>
              <div className="p-5">
                <motion.a
                  href={`https://maps.google.com/?q=${location.lat},${location.lng}&layer=transit`}
                  target="_blank" rel="noopener noreferrer"
                  whileHover={{ scale:1.01 }}
                  className="flex items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 transition-all group">
                  <span className="text-3xl group-hover:scale-110 transition-transform">🗺️</span>
                  <div>
                    <p className="text-white/70 font-medium group-hover:text-white transition-colors">Open in Google Maps</p>
                    <p className="text-white/30 text-sm">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
                  </div>
                </motion.a>
              </div>
            </motion.div>

          </motion.div>
        )}
      </div>
    </div>
  )
}
