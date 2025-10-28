import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, Plus, Trash2, Smartphone, Monitor, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

interface Passkey {
  id: string;
  name: string;
  deviceType: 'platform' | 'cross-platform';
  createdAt: string;
  lastUsedAt?: string;
}

const PasskeyManager = () => {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadPasskeys();
  }, []);

  const loadPasskeys = async () => {
    try {
      setLoading(true);
      const result = await authClient.passkey.list();
      
      if (result.error) {
        console.error("Failed to load passkeys:", result.error);
        return;
      }

      setPasskeys(result.data || []);
    } catch (error) {
      console.error("Error loading passkeys:", error);
    } finally {
      setLoading(false);
    }
  };

  const registerPasskey = async () => {
    if (!newPasskeyName.trim()) {
      toast.error("Please enter a name for your passkey");
      return;
    }

    try {
      setRegistering(true);
      
      const result = await authClient.passkey.addPasskey({
        name: newPasskeyName.trim()
      });

      if (result.error) {
        toast.error(`Failed to register passkey: ${result.error.message}`);
        return;
      }

      toast.success("Passkey registered successfully!");
      setNewPasskeyName("");
      setShowAddForm(false);
      await loadPasskeys();
    } catch (error) {
      console.error("Passkey registration error:", error);
      toast.error("Failed to register passkey");
    } finally {
      setRegistering(false);
    }
  };

  const deletePasskey = async (passkeyId: string) => {
    try {
      const result = await authClient.passkey.deletePasskey({ 
        passkeyId: passkeyId 
      });

      if (result.error) {
        toast.error("Failed to delete passkey");
        return;
      }

      toast.success("Passkey deleted successfully");
      await loadPasskeys();
    } catch (error) {
      console.error("Error deleting passkey:", error);
      toast.error("Failed to delete passkey");
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    return deviceType === 'platform' ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Fingerprint className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-lg font-semibold">Passkeys</h3>
            <p className="text-sm text-muted-foreground">
              Secure authentication with Face ID, Touch ID, or Windows Hello
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          disabled={registering}
          className="bg-accent hover:bg-accent/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Passkey
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-4 mb-4 bg-muted/50">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passkeyName">Passkey Name</Label>
              <Input
                id="passkeyName"
                placeholder="e.g., iPhone 15 Pro, MacBook Pro"
                value={newPasskeyName}
                onChange={(e) => setNewPasskeyName(e.target.value)}
                disabled={registering}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={registerPasskey}
                disabled={registering || !newPasskeyName.trim()}
                className="bg-accent hover:bg-accent/90"
              >
                {registering ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Fingerprint className="w-4 h-4 mr-2" />
                )}
                {registering ? "Registering..." : "Register Passkey"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewPasskeyName("");
                }}
                disabled={registering}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {passkeys.length === 0 ? (
        <div className="text-center py-8">
          <Fingerprint className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-lg font-medium mb-2">No passkeys registered</h4>
          <p className="text-muted-foreground mb-4">
            Add a passkey to enable secure, passwordless authentication
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="flex items-center justify-between p-4 border border-border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getDeviceIcon(passkey.deviceType)}
                <div>
                  <h4 className="font-medium">{passkey.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(passkey.createdAt).toLocaleDateString()}
                    {passkey.lastUsedAt && (
                      <> • Last used {new Date(passkey.lastUsedAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deletePasskey(passkey.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default PasskeyManager;