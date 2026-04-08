'use client';

//adminUsersPage 
// This page allows admin users to manage the users of the system. 
// It includes features to view all users, search/filter users, create new users, edit existing users, and delete users. 
// The page is protected so that only admin users can access it, and it uses React Query for data fetching and mutations.

import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Types
// User type returned from the API
interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'INVESTOR';
  createdAt: string;
}

// Form data for creating/updating a user
interface CreateUserForm {
  name: string;
  email: string;
  password?: string;
  role: 'ADMIN' | 'INVESTOR';
}

// Main page component for managing users.
// Displays a list of users in a table with actions to edit or delete each user. Also includes a button to create new users.
export default function AdminUsers() {
  const { user: currentUser, token, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<CreateUserForm>({
    name: '',
    email: '',
    password: '',
    role: 'INVESTOR',
  });

  
  // Fetch users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: !!token && currentUser?.role === 'ADMIN',
  });

  // Create user
  const createMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      const res = await fetch('http://localhost:3001/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'INVESTOR' });
    },
  });

  // Update user 
  const updateMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      if (!selectedUser) throw new Error('No user selected');
      const res = await fetch(`http://localhost:3001/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          role: data.role,
          // Only send password if it's changed
          ...(data.password && { password: data.password }),
        }),
      });
      if (!res.ok) throw new Error('Failed to update user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditModalOpen(false);
      setSelectedUser(null);
      setFormData({ name: '', email: '', password: '', role: 'INVESTOR' });
    },
  });

  // Delete user
  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`http://localhost:3001/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Check if user is authenticated
  if (isAuthLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background flex flex-col text-muted-foreground">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
            <SidebarTrigger className="-ml-1 text-muted" />
            <div className="h-4 w-[1px] bg-border mx-2" />
            <h1 className="text-sm font-medium text-accent tracking-tight">Users Management</h1>
          </header>
          <main className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Check if user is admin
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-destructive">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You must be an admin to access this page</p>
          <Button
            className="mt-4 bg-primary text-black"
            onClick={() => router.push('/dashboard')}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  // Filter users
  const filteredUsers = users?.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  // Edit user handler 
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  // Open edit modal
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Don't pre-fill password
      role: user.role,
    });
    setIsEditModalOpen(true);
  };

  // Check if users are loading
  if (isLoading) return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col text-muted-foreground">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent tracking-tight">Users Management</h1>
        </header>
        <main className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );

  // Render
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col text-muted-foreground">

        {/* HEADER */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger className="-ml-1 text-muted" />
          <div className="h-4 w-[1px] bg-border mx-2" />
          <h1 className="text-sm font-medium text-accent tracking-tight">Users Management</h1>
        </header>

        <main className="p-6 flex flex-col gap-8 w-full max-w-[1400px] mx-auto">

          {/* TITLE & ACTION */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-[10px] font-bold uppercase tracking-widest opacity-60">Admin Panel</p>
              <h2 className="text-2xl font-bold tracking-tighter text-foreground">Users</h2>
              <p className="text-sm text-muted-foreground mt-1">Total: {users?.length || 0} users</p>
            </div>
            <Button
              className="bg-primary text-black font-bold h-10 px-6"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </div>

          {/* SEARCH */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted opacity-50" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card border-border text-sm h-10"
            />
          </div>

          {/* USERS TABLE */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-muted border-b border-border bg-white/[0.02]">
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Role</th>
                    <th className="p-4 font-medium">Created</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-white/[0.01] transition-colors">
                        <td className="p-4">
                          <span className="font-medium text-foreground">{u.name}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-muted-foreground text-xs">{u.email}</span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded ${u.role === 'ADMIN'
                              ? 'bg-destructive/10 text-destructive border border-destructive/20'
                              : 'bg-primary/10 text-primary border border-primary/20'
                            }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-xs text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            {/* EDIT BUTTON */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs hover:bg-primary/10"
                              onClick={() => openEditModal(u)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            {/* DELETE BUTTON */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs hover:bg-destructive/10 text-destructive"
                              onClick={() => {
                                if (confirm(`Delete user ${u.name}?`)) {
                                  deleteMutation.mutate(u.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </SidebarInset>

      {/* CREATE USER MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user to the system</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Name</label>
              <Input
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-background/50 border-border text-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Email</label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-background/50 border-border text-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Password</label>
              <Input
                type="password"
                placeholder="Temporary password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-background/50 border-border text-foreground"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'INVESTOR' })}
                className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-foreground"
              >
                <option value="INVESTOR">Investor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 bg-background/50 border-border text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT USER MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Name</label>
              <Input
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-background/50 border-border text-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Email</label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-background/50 border-border text-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Password (Leave empty to keep current)</label>
              <Input
                type="password"
                placeholder="New password (optional)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-background/50 border-border text-foreground"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'INVESTOR' })}
                className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-foreground"
              >
                <option value="INVESTOR">Investor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 bg-background/50 border-border text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Updating...' : 'Update User'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}