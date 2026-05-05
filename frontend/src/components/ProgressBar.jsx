/**
 * ProgressBar.jsx — Animated completion percentage bar.
 *
 * Props:
 *   pct   : number 0-100
 *   color : tailwind color class for the fill (default: brand gradient)
 */
export default function ProgressBar({ pct = 0, label }) {
  const clamped = Math.min(100, Math.max(0, pct))

  // Derive color based on percentage
  const fillClass =
    clamped >= 80
      ? 'bg-emerald-500'
      : clamped >= 50
      ? 'bg-brand-500'
      : clamped >= 25
      ? 'bg-amber-500'
      : 'bg-rose-500'

  return (
    <div className="w-full">
      {label !== undefined && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-slate-400">{label}</span>
          <span className="text-xs font-semibold text-slate-300">{clamped.toFixed(0)}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${fillClass}`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}
