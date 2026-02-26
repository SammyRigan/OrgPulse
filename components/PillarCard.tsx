"use client";

import { LucideIcon } from "lucide-react";

interface PillarInput {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}

interface PillarCardProps {
  title: string;
  icon: LucideIcon;
  inputs: PillarInput[];
}

export default function PillarCard({ title, icon: Icon, inputs }: PillarCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-2 border-b border-gray-50 pb-3">
        <Icon className="h-5 w-5 text-[#D97706]" />
        <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      <div className="space-y-6">
        {inputs.map(({ id, label, value, onChange }) => (
          <div key={id}>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                {label}
              </label>
              <span className="value-badge rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-900">
                {value}%
              </span>
            </div>
            <input
              type="range"
              id={`input-${id}`}
              min={0}
              max={100}
              value={value}
              onChange={(e) => onChange(parseInt(e.target.value, 10))}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
