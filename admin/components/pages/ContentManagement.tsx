'use client'

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

interface Alert {
  id: string;
  title: string;
  message: string;
  type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ContentManagement() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    severity: "info",
    status: "draft",
  });

  // Fetch alerts via server API (uses service role)
  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin-alerts');
      if (!res.ok) throw new Error(await res.text());
      const { alerts } = await res.json();
      setAlerts(alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to load alerts');
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchAlerts();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('admin-alerts-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'admin_alerts' },
        (payload) => {
          console.log('Alert change received:', payload);
          fetchAlerts(); // Refresh alerts on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const publishAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('admin_alerts')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Alert published');
      fetchAlerts();
    } catch (e) {
      console.error(e);
      toast.error('Failed to publish alert');
    }
  };

  // archive removed

  const openCreateDialog = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ title: "", message: "", severity: "info", status: "draft" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (alert: Alert) => {
    setIsEditing(true);
    setEditingId(alert.id);
    setFormData({
      title: alert.title || "",
      message: alert.message || "",
      severity: (alert as any).severity || "info",
      status: (alert as any).status || "draft",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.title || !formData.message) {
        toast.error('Title and message are required');
        return;
      }
      if (isEditing && editingId) {
        const res = await fetch(`/api/admin-alerts/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success('Alert updated');
      } else {
        const res = await fetch('/api/admin-alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success('Alert created');
      }
      setIsDialogOpen(false);
      fetchAlerts();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save alert');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin-alerts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Alert deleted');
      fetchAlerts();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete alert');
    }
  };

  // create/publish/delete post UI removed; using admin_alerts list instead

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Content Management
          </h1>
          <p className="text-muted-foreground">
            Create and manage content for the member news feed.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAlerts}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" /> New Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Alert' : 'Create Alert'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" rows={6} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity</Label>
                    <Input id="severity" value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Input id="status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>{isEditing ? 'Save Changes' : 'Create'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Admin Alerts (real-time) */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground">Loading alerts…</p>
        ) : alerts.length === 0 ? (
          <p className="text-muted-foreground">No alerts found.</p>
        ) : (
          alerts.map((alert: any) => (
            <Card key={alert.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <CardTitle>{alert.title}</CardTitle>
                  </div>
                  <Badge variant="outline">{alert.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{alert.message}</p>
                <div className="flex gap-2">
                  {alert.status !== 'published' && (
                    <Button size="sm" onClick={() => publishAlert(alert.id)}>Publish</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(alert)}>
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(alert.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Removed legacy posts UI */}
    </div>
  );
}
