'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Link, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

// This should be kept in sync with your better-auth config
const supportedProviders = ['google', 'github', 'discord']; 

export function AccountLinkingTab() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/accounts');
      if (!res.ok) throw new Error('Failed to load accounts');
      const data = await res.json();
      setAccounts(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (provider) => {
    const result = await authClient.linkSocial({ provider });
    if (result.error) {
      toast.error(`Failed to link ${provider}: ${result.error.message}`);
    } else {
      toast.success(`Successfully linked ${provider}`);
      loadAccounts();
    }
  };

  const handleUnlink = async (accountId: string, providerId: string) => {
    const result = await authClient.unlinkAccount({ accountId, providerId });
    if (result.error) {
      toast.error(`Failed to unlink account: ${result.error.message}`);
    } else {
      toast.success("Successfully unlinked account");
      loadAccounts();
    }
  };

  const linkedProviders = accounts.map(acc => acc.providerId);
  const unlinkedProviders = supportedProviders.filter(p => !linkedProviders.includes(p));

  if (loading) {
    return <Loader2 className="w-6 h-6 animate-spin" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Linked Accounts</CardTitle>
          <CardDescription>Manage your connected social accounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.map(account => (
            <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium capitalize">{account.providerId}</p>
                <p className="text-sm text-muted-foreground">Linked on {new Date(account.createdAt).toLocaleDateString()}</p>
              </div>
              <Button variant="destructive" onClick={() => handleUnlink(account.id, account.providerId)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Unlink
              </Button>
            </div>
          ))}
          {accounts.length === 0 && <p className="text-muted-foreground">No accounts linked.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Link New Account</CardTitle>
          <CardDescription>Connect other accounts to sign in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {unlinkedProviders.map(provider => (
            <div key={provider} className="flex items-center justify-between p-4 border rounded-lg">
              <p className="font-medium capitalize">{provider}</p>
              <Button onClick={() => handleLink(provider)}>
                <Link className="w-4 h-4 mr-2" />
                Link {provider}
              </Button>
            </div>
          ))}
          {unlinkedProviders.length === 0 && <p className="text-muted-foreground">All available providers are linked.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
