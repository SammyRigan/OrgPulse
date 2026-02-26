"use client";

interface ExecutiveHeaderProps {
  globalScore: number;
  stabilityLabel: string;
  stabilityColor: string;
}

export default function ExecutiveHeader({
  globalScore,
  stabilityLabel,
  stabilityColor,
}: ExecutiveHeaderProps) {
  return (
    <header className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-end mb-10">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
          Organizational <span className="text-[#D97706]">Health Check</span>
        </h1>
        <p className="mt-2 font-medium text-gray-500">
          Diagnostic engine for structural and cultural performance.
        </p>
      </div>
      <div className="flex items-center gap-6 rounded-2xl border border-gray-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Global Score
          </span>
          <span className="text-3xl font-black text-gray-800">
            {globalScore}%
          </span>
        </div>
        <div className="h-10 w-px bg-gray-200" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Stability
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: stabilityColor }}
          >
            {stabilityLabel}
          </span>
        </div>
      </div>
    </header>
  );
}
