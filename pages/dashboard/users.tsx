import Head from "next/head";
import DashboardLayout from "../../src/components/DashboardLayout";
import { Card } from "../../src/components/ui/card";
import { Input } from "../../src/components/ui/input";
import { Button } from "../../src/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

interface Profile {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  street_address?: string | null;
  created_at?: string | null;
}

export default function UsersPage() {
  const supabase = useSupabaseClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return profiles.filter((p) =>
      [p.email, p.full_name, p.city, p.state].some((field) => (field || "").toLowerCase().includes(q))
    );
  }, [profiles, search]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, city, state, zip_code, street_address, created_at")
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
      } else if (mounted) {
        setProfiles(data || []);
      }
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("public:profiles")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload: any) => {
          setProfiles((prev) => [payload.new as Profile, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload: any) => {
          setProfiles((prev) => prev.map((p) => (p.id === payload.new.id ? (payload.new as Profile) : p)));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <DashboardLayout>
      <Head>
        <title>Users | Tenure</title>
        <meta name="description" content="Real-time list of signed-up users." />
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Signed-up Users</h1>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search by email, name, city, state"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-80"
            />
            <Button variant="outline" onClick={() => setSearch("")}>Clear</Button>
          </div>
        </div>

        <Card className="p-4">
          {loading ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">City</th>
                    <th className="py-2 pr-4">State</th>
                    <th className="py-2 pr-4">ZIP</th>
                    <th className="py-2 pr-4">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-accent/5">
                      <td className="py-2 pr-4">{p.email}</td>
                      <td className="py-2 pr-4">{p.full_name || "—"}</td>
                      <td className="py-2 pr-4">{p.phone || "—"}</td>
                      <td className="py-2 pr-4">{p.city || "—"}</td>
                      <td className="py-2 pr-4">{p.state || "—"}</td>
                      <td className="py-2 pr-4">{p.zip_code || "—"}</td>
                      <td className="py-2 pr-4">{p.created_at ? new Date(p.created_at).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}