import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const accounts = await auth.api.listUserAccounts();
    const hasPasswordAccount = accounts.some(account => account.providerId === 'credentials');

    return NextResponse.json({ hasPasswordAccount });
  } catch (error) {
    console.error("Error checking password account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
