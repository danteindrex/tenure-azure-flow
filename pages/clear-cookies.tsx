import { useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { authClient } from "@/lib/auth-client";
import { Card } from "../src/components/ui/card";
import { Button } from "../src/components/ui/button";

export default function ClearCookiesPage() {
  const [status, setStatus] = useState<"idle" | "clearing" | "done" | "error">("idle");
  const [detail, setDetail] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    async function run() {
      setStatus("clearing");
      try {
        // Sign out Better Auth session
        await authClient.signOut();
      } catch {}
      try {
        // Clear custom auth cookie and any other cookies
        const res = await fetch("/api/auth/clear-cookies", { method: "POST" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || "Failed to clear cookies");
        try {
          // Clear localStorage/sessionStorage as an extra step
          if (typeof window !== "undefined") {
            window.localStorage?.clear?.();
            window.sessionStorage?.clear?.();
          }
        } catch {}
        if (mounted) {
          setDetail(`Cleared ${json?.cleared ?? 0} cookies`);
          setStatus("done");
        }
      } catch (e: any) {
        if (mounted) {
          setDetail(e?.message || "Unknown error");
          setStatus("error");
        }
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <Head>
        <title>Clear Cookies</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen w-full flex items-center justify-center p-6">
        <Card className="p-6 max-w-md w-full space-y-4 text-center">
          <h1 className="text-xl font-semibold">Clear Cookies</h1>
          {status === "clearing" && <p className="text-muted-foreground">Clearing cookies and session…</p>}
          {status === "done" && <p className="text-green-600">Done. {detail}</p>}
          {status === "error" && <p className="text-red-600">{detail}</p>}
          <div className="flex gap-2 justify-center">
            <Link href="/login"><Button variant="outline">Go to Login</Button></Link>
            <Link href="/signup"><Button>Go to Signup</Button></Link>
          </div>
        </Card>
      </div>
    </>
  );
}