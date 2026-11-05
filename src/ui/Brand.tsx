import { motion } from 'framer-motion'

/** Bold "N" that opens to the right into "Noter" on hover and folds back when the pointer leaves. */
export function Brand() {
  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      animate="rest"
      className="flex h-9 cursor-default items-center pl-2 text-primary select-none"
      aria-label="Noter"
    >
      <span className="text-4xl font-semibold">N</span>
      <motion.span
        aria-hidden
        className="overflow-hidden text-4xl font-semibold whitespace-nowrap"
        variants={{
          rest: { width: 0, opacity: 0 },
          hover: { width: 'auto', opacity: 1 },
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        oter
      </motion.span>
    </motion.div>
  )
}
