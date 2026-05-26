"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
        OrgPulse
      </h1>
      <p className="mb-12 max-w-md text-center text-gray-500">
        Sign in or create your organization to run assessments, invite employees,
        and view reports.
      </p>
      <Link
        href="/org"
        className="flex items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white px-8 py-6 text-left shadow-sm transition-colors hover:border-[#D97706] hover:bg-amber-50/50"
      >
        <Building2 className="h-8 w-8 text-[#D97706]" />
        <div>
          <h2 className="font-semibold text-gray-900">Continue to OrgPulse</h2>
          <p className="text-sm text-gray-500">Organization login and sign up</p>
        </div>
      </Link>
    </div>
  );
}
