import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  return NextResponse.next();
}


export const config = {
  // Disable next-auth matcher
  matcher: [],
};
