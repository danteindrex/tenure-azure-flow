import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const passkeys = await auth.api.listPasskeys();

    return NextResponse.json(passkeys);
  } catch (error) {
    console.error("Error listing passkeys:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
