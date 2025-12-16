'use client'

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

async function fetchNewsfeedPosts() {
  const response = await fetch('/api/newsfeed?limit=100');
  if (!response.ok) throw new Error('Failed to fetch newsfeed posts');
  return response.json();
}

async function createPost(data: any) {
  const response = await fetch('/api/newsfeed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create post');
  return response.json();
}

async function updatePost(id: string, data: any) {
  const response = await fetch(`/api/newsfeed/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update post');
  return response.json();
}

async function deletePost(id: string) {
  const response = await fetch(`/api/newsfeed/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete post');
  return response.json();
}

export default function NewsfeedManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isPublished: false,
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['newsfeed-posts'],
    queryFn: fetchNewsfeedPosts,
  });

  const createMutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsfeed-posts'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Post created successfully!');
    },
    onError: () => {
      toast.error('Failed to create post');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updatePost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsfeed-posts'] });
      setIsDialogOpen(false);
      setEditingPost(null);
      resetForm();
      toast.success('Post updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update post');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsfeed-posts'] });
      toast.success('Post deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete post');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      isPublished: false,
    });
    setEditingPost(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (post: any) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      isPublished: post.isPublished,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.content) {
      toast.error('Title and content are required');
      return;
    }

    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      deleteMutation.mutate(id);
    }
  };

  const togglePublish = (post: any) => {
    updateMutation.mutate({
      id: post.id,
      data: { isPublished: !post.isPublished },
    });
  };

  if (isLoading) {
    return <div>Loading newsfeed posts...</div>;
  }

  const posts = data?.posts || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Newsfeed Management</h1>
          <p className="text-muted-foreground">Create and manage newsfeed posts for users</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Post
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Newsfeed Posts ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Content Preview</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post: any) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell className="max-w-md truncate">{post.content}</TableCell>
                  <TableCell>
                    <Badge variant={post.isPublished ? "default" : "secondary"}>
                      {post.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {post.created_at ? new Date(post.created_at).toLocaleDateString() : 
                     post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePublish(post)}
                    >
                      {post.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(post)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {posts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No newsfeed posts yet. Create your first post!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
            {editingPost && (
              <p className="text-sm text-muted-foreground">
                Created: {editingPost.created_at ? 
                  new Date(editingPost.created_at).toLocaleString() : 
                  editingPost.createdAt ? 
                  new Date(editingPost.createdAt).toLocaleString() : 'Unknown'}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter post title"
              />
            </div>
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter post content"
                rows={6}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPublished"
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
              />
              <Label htmlFor="isPublished">Publish immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingPost ? 'Update' : 'Create'} Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
