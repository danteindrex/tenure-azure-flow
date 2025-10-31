import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const accounts = await auth.api.listUserAccounts();
    // Filter out the credentials account so we only show social logins
    const socialAccounts = accounts.filter(acc => acc.providerId !== 'credentials');

    return NextResponse.json(socialAccounts);
  } catch (error) {
    console.error("Error listing accounts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
