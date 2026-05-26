import { NextResponse } from "next/server";
import { getAuthContext, toErrorResponse } from "@/lib/serverAuth";

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    return NextResponse.json({
      authenticated: Boolean(auth),
      uid: auth?.uid ?? null,
      email: auth?.email ?? null,
      role: auth?.role ?? null,
      superAdmin: auth?.superAdmin ?? false,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
