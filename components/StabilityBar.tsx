"use client";

interface StabilityBarProps {
  value: number;
  label: string;
  barColor: string;
}

export default function StabilityBar({
  value,
  label,
  barColor,
}: StabilityBarProps) {
  return (
    <div className="mt-8 border-t border-white/10 pt-8">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D97706]">
            Risk Assessment
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: barColor }}
          >
            {label}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full transition-all duration-700 ease-out"
            style={{ width: `${value}%`, backgroundColor: barColor }}
          />
        </div>
        <div className="mt-4 flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
          <span>Vulnerable</span>
          <span>Stable</span>
          <span>Resilient</span>
        </div>
      </div>
    </div>
  );
}
