import { motion } from 'framer-motion'

const cardVariants = {
  hidden:  { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

export default function GlassCard({ children, className = '', onClick, hover = true, animate = true }) {
  return (
    <motion.div
      variants={animate ? cardVariants : undefined}
      whileHover={hover ? { scale: 1.015, y: -4 } : {}}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl border border-white/10
        bg-white/5 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.4)]
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/8 via-transparent to-transparent pointer-events-none" />
      {children}
    </motion.div>
  )
}
