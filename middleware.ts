import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/wireframes/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/wireframes/", "/preview/");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/wireframes/:path*"
};
