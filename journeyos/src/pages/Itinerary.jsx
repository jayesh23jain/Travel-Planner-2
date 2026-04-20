import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTrip } from '../context/TripContext'
import { useTripAuth } from '../hooks/useTripAuth'
import { db } from '../lib/supabaseClient'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore'

const TYPE_META = {
  activity:      { icon:'🎯', color:'text-violet-300',  bg:'bg-violet-500/10 border-violet-400/20' },
  meal:          { icon:'🍽️', color:'text-amber-300',   bg:'bg-amber-500/10 border-amber-400/20' },
  transport:     { icon:'✈️', color:'text-sky-300',     bg:'bg-sky-500/10 border-sky-400/20' },
  accommodation: { icon:'🏨', color:'text-emerald-300', bg:'bg-emerald-500/10 border-emerald-400/20' },
  other:         { icon:'📌', color:'text-white/60',    bg:'bg-white/5 border-white/10' },
}

const stagger = { hidden:{}, visible:{ transition:{ staggerChildren:0.07 } } }
const fadeUp  = { hidden:{ opacity:0, y:16 }, visible:{ opacity:1, y:0, transition:{ duration:0.35 } } }

function Bg() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <div className="absolute inset-0 bg-[#07070f]" />
      <div className="absolute top-0 right-1/3 w-[500px] h-[500px] rounded-full bg-gradient-radial from-violet-500/15 to-transparent blur-[100px]" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-gradient-radial from-sky-500/10 to-transparent blur-[90px]" />
    </div>
  )
}

// Sortable item
function SortableItem({ item, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const meta = TYPE_META[item.type] || TYPE_META.other

  return (
    <motion.div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 p-3.5 rounded-xl border backdrop-blur-sm ${meta.bg}
        ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'} transition-opacity`}>
      {/* Drag handle */}
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 transition-colors px-1">
        ⠿
      </div>
      <span className="text-xl">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${meta.color}`}>{item.title}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {item.start_time && <span className="text-white/30 text-xs">{item.start_time}</span>}
          {item.location   && <span className="text-white/30 text-xs truncate">📍 {item.location}</span>}
          {item.cost > 0   && <span className="text-white/30 text-xs">₹{Number(item.cost).toLocaleString()}</span>}
        </div>
      </div>
      <button onClick={() => onDelete(item.id)} className="text-rose-400/30 hover:text-rose-400 text-xs transition-colors px-1">✕</button>
    </motion.div>
  )
}

function DayCard({ day, items, onDeleteItem, onAddItem }) {
  const [form, setForm] = useState({ title:'', type:'activity', start_time:'', location:'', cost:'' })
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding]     = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    setAdding(true)
    await onAddItem(day.id, { ...form, cost: Number(form.cost) || 0, sort_order: items.length })
    setForm({ title:'', type:'activity', start_time:'', location:'', cost:'' })
    setAdding(false)
    setShowForm(false)
  }

  const dayTotal = useMemo(() => items.reduce((s,i) => s + Number(i.cost||0), 0), [items])

  return (
    <motion.div variants={fadeUp} className="rounded-2xl border border-white/10 bg-white/4 backdrop-blur-xl overflow-hidden">
      {/* Day header */}
      <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white">
            {day.day_number}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Day {day.day_number}</p>
            <p className="text-white/35 text-xs">
              {new Date(day.date).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {dayTotal > 0 && <span className="text-white/40 text-xs">₹{dayTotal.toLocaleString()}</span>}
          <motion.button whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}
            onClick={() => setShowForm(v=>!v)}
            className="w-7 h-7 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white text-sm transition-all">
            {showForm ? '−' : '+'}
          </motion.button>
        </div>
      </div>

      {/* Items */}
      <div className="p-3 space-y-2">
        <SortableContext items={items.map(i=>i.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {items.length === 0 ? (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                className="text-center py-6 text-white/20 text-sm">
                No activities yet. Add one below ↓
              </motion.div>
            ) : (
              items.map(item => <SortableItem key={item.id} item={item} onDelete={onDeleteItem} />)
            )}
          </AnimatePresence>
        </SortableContext>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            className="overflow-hidden border-t border-white/8">
            <form onSubmit={handleAdd} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/35 text-[10px] font-mono uppercase tracking-wider block mb-1">Title *</label>
                  <input required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Beach walk"
                    className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-violet-400/50 transition-all" />
                </div>
                <div>
                  <label className="text-white/35 text-[10px] font-mono uppercase tracking-wider block mb-1">Type</label>
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}
                    className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-400/50 transition-all">
                    {Object.entries(TYPE_META).map(([k,v]) => <option key={k} value={k} className="bg-[#0d0d1a] capitalize">{v.icon} {k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/35 text-[10px] font-mono uppercase tracking-wider block mb-1">Time</label>
                  <input type="time" value={form.start_time} onChange={e=>setForm(f=>({...f,start_time:e.target.value}))}
                    className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-400/50 transition-all" />
                </div>
                <div>
                  <label className="text-white/35 text-[10px] font-mono uppercase tracking-wider block mb-1">Cost (₹)</label>
                  <input type="number" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))} placeholder="0"
                    className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-violet-400/50 transition-all" />
                </div>
              </div>
              <div>
                <label className="text-white/35 text-[10px] font-mono uppercase tracking-wider block mb-1">Location</label>
                <input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Baga Beach"
                  className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-violet-400/50 transition-all" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={()=>setShowForm(false)} className="px-4 py-1.5 rounded-lg border border-white/10 text-white/40 text-sm hover:text-white/70 transition-colors">Cancel</button>
                <motion.button type="submit" disabled={adding} whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                  className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-sm disabled:opacity-60">
                  {adding ? 'Adding…' : 'Add'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Itinerary() {
  useTripAuth()
  const { activeTrip } = useTrip()
  const [days, setDays]     = useState([])
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(false)
  const [creatingDay, setCreatingDay] = useState(false)
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    if (!activeTrip) {
      setDays([])
      setItems([])
      return
    }

    let isMounted = true
    setLoading(true)

    try {
      const q = query(
        collection(db, 'itinerary'),
        where('trip_id', '==', activeTrip.id)
      )

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!isMounted) return
          const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
          data.sort((a, b) => a.day_number - b.day_number)
          setDays(data)
          setItems(data)
          setLoading(false)
        },
        (error) => {
          if (!isMounted) return
          console.error('Error fetching itinerary:', error)
          setDays([])
          setItems([])
          setLoading(false)
        }
      )

      return () => {
        isMounted = false
        unsubscribe()
      }
    } catch (error) {
      if (isMounted) {
        console.error('Error setting up itinerary listener:', error)
        setLoading(false)
      }
    }
  }, [activeTrip])

  const addDay = async () => {
    if (!activeTrip) return
    setCreatingDay(true)
    const dayNum = days.length + 1
    const date = new Date(activeTrip.start_date)
    date.setDate(date.getDate() + dayNum - 1)
    const dateStr = date.toISOString().split('T')[0]
    const { data } = await supabase.from('itinerary_days')
      .insert({ trip_id: activeTrip.id, day_number: dayNum, date: dateStr }).select().single()
    if (data) setDays(prev => [...prev, data])
    setCreatingDay(false)
  }

  const addItem = useCallback(async (dayId, itemData) => {
    const { data } = await supabase.from('itinerary_items').insert({ ...itemData, day_id: dayId }).select().single()
    if (data) setItems(prev => [...prev, data])
  }, [])

  const deleteItem = useCallback(async (id) => {
    await supabase.from('itinerary_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const handleDragEnd = useCallback(async ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)

    // Persist new sort_order
    const updates = reordered.map((item, idx) => ({ id: item.id, sort_order: idx }))
    for (const u of updates) {
      await supabase.from('itinerary_items').update({ sort_order: u.sort_order }).eq('id', u.id)
    }
  }, [items])

  // useMemo for per-day totals
  const dayTotals = useMemo(() =>
    days.reduce((acc, day) => {
      const dayItems = items.filter(i => i.day_id === day.id)
      acc[day.id] = dayItems.reduce((s,i) => s + Number(i.cost||0), 0)
      return acc
    }, {}),
  [days, items])

  const totalCost = useMemo(() => Object.values(dayTotals).reduce((s,v)=>s+v,0), [dayTotals])
  const activeItem = activeId ? items.find(i => i.id === activeId) : null

  return (
    <div className="relative min-h-screen text-white">
      {!activeTrip && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#07070f]">
          <div className="text-center">
            <p className="text-white/50 text-lg">Loading trip data...</p>
          </div>
        </div>
      )}
      <Bg />
      <div className="max-w-4xl mx-auto px-5 py-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} className="flex items-end justify-between">
          <div>
            <p className="text-white/35 text-xs font-mono uppercase tracking-widest mb-1">Module · Itinerary</p>
            <h1 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-violet-300 to-pink-400 bg-clip-text text-transparent">Drag-and-Drop</span>{' '}
              Itinerary
            </h1>
          </div>
          {activeTrip && (
            <div className="text-right">
              <p className="text-white/35 text-xs">Total cost</p>
              <p className="text-white font-bold">₹{totalCost.toLocaleString()}</p>
            </div>
          )}
        </motion.div>

        {!activeTrip ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-16 text-center">
            <p className="text-4xl mb-3">🗺️</p>
            <p className="text-white/40">Select an active trip from the Dashboard first</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <motion.div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-violet-400"
              animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter}
            onDragStart={({ active }) => setActiveId(active.id)}
            onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
            <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">

              {days.length === 0 ? (
                <motion.div variants={fadeUp} className="rounded-2xl border border-dashed border-white/10 p-16 text-center">
                  <p className="text-5xl mb-4">📅</p>
                  <p className="text-white/50 font-semibold">No days planned yet</p>
                  <p className="text-white/25 text-sm mt-1">Click "Add Day" to start building your itinerary</p>
                </motion.div>
              ) : (
                days.map(day => (
                  <DayCard
                    key={day.id} day={day}
                    items={items.filter(i => i.day_id === day.id)}
                    onDeleteItem={deleteItem}
                    onAddItem={addItem}
                  />
                ))
              )}

              <motion.div variants={fadeUp}>
                <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                  onClick={addDay} disabled={creatingDay}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-white/15 text-white/40 hover:text-white/70 hover:border-white/30 text-sm font-medium transition-all disabled:opacity-50">
                  {creatingDay ? 'Adding day…' : `+ Add Day ${days.length + 1}`}
                </motion.button>
              </motion.div>
            </motion.div>

            <DragOverlay>
              {activeItem && (
                <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${TYPE_META[activeItem.type]?.bg || 'bg-white/10 border-white/20'} shadow-2xl opacity-95`}>
                  <span className="text-xl">{TYPE_META[activeItem.type]?.icon}</span>
                  <p className="text-white text-sm font-medium">{activeItem.title}</p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  )
}
