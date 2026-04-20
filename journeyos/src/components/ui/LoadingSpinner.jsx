import { motion } from 'framer-motion'

export default function LoadingSpinner({ size = 'md', label }) {
  const sizes = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-16 h-16' }
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className={`${sizes[size]} rounded-full border-2 border-white/10 border-t-cyan-400`}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      {label && <p className="text-white/40 text-sm font-mono">{label}</p>}
    </div>
  )
}
