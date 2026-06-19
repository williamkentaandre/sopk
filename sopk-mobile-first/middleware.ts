import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** App statique Capacitor : pas d’auth edge. Évite le middleware monorepo parent (next-auth). */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}
