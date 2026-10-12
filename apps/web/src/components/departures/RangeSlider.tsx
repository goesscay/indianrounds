"use client";

/** A two-handled slider built from two native range inputs, so it works with the keyboard and screen readers. */
export function RangeSlider({ label, min, max, step = 1, value, onChange, format }: {
  label: string; min: number; max: number; step?: number; value: [number, number]; onChange: (v: [number, number]) => void; format: (n: number) => string;
}) {
  const span = Math.max(1, max - min);
  const left = ((value[0] - min) / span) * 100;
  const right = 100 - ((value[1] - min) / span) * 100;
  const thumb =
    "pointer-events-none absolute inset-x-0 top-0 h-5 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-brand-red [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-brand-red";

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-muted">{format(value[0])} to {format(value[1])}</span>
      </div>
      <div className="relative mt-3 h-5">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded bg-black/10" />
        <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-brand-red" style={{ left: `${left}%`, right: `${right}%` }} />
        <input type="range" aria-label={`${label}, lowest`} min={min} max={max} step={step} value={value[0]} onChange={(e) => onChange([Math.min(Number(e.target.value), value[1]), value[1]])} className={thumb} />
        <input type="range" aria-label={`${label}, highest`} min={min} max={max} step={step} value={value[1]} onChange={(e) => onChange([value[0], Math.max(Number(e.target.value), value[0])])} className={thumb} />
      </div>
    </div>
  );
}
