'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@clerk/nextjs';

interface UserProfile {
  _id: string;
  clerkUserId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  roleAssigned: boolean;
  status: string;
  createdAt: string;
}

export function UserProfileComponent() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  const { user } = useUser();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/profile/get-profile');
        const data = await response.json();

        if (data.user) {
          setProfile(data.user);
          setFormData({
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
            email: data.user.email || '',
          });
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdateProfile = async () => {
    try {
      const response = await fetch('/api/profile/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setIsEditing(false);
        // Show success message
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading profile...</div>
        </CardContent>
      </Card>
    );
  }

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'tester':
        return 'bg-blue-100 text-blue-800';
      case 'customer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>Manage your account information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Role Information */}
        <div className="border-b pb-6">
          <h3 className="font-semibold mb-3">Account Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Role:</span>
              {profile?.roleAssigned && profile?.role ? (
                <Badge className={getRoleBadgeColor(profile.role)}>
                  {profile.role.toUpperCase()}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-50">
                  PENDING ASSIGNMENT
                </Badge>
              )}
            </div>
            {!profile?.roleAssigned && (
              <Alert className="mt-3 bg-amber-50 border-amber-200">
                <AlertDescription className="text-amber-800">
                  Your access role is pending assignment. Please contact Support to complete your setup.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Profile Information */}
        <div className="space-y-4">
          <h3 className="font-semibold">Profile Information</h3>

          {!isEditing ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Email</Label>
                <p className="text-sm font-medium">{profile?.email || user?.emailAddresses[0]?.emailAddress || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">First Name</Label>
                  <p className="text-sm font-medium">{profile?.firstName || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Last Name</Label>
                  <p className="text-sm font-medium">{profile?.lastName || 'Not set'}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Account Created</Label>
                <p className="text-sm font-medium">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>

              <Button onClick={() => setIsEditing(true)} className="mt-4">
                Edit Profile
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  placeholder="Enter first name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  placeholder="Enter last name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleUpdateProfile}>Save Changes</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    if (profile) {
                      setFormData({
                        firstName: profile.firstName || '',
                        lastName: profile.lastName || '',
                        email: profile.email || '',
                      });
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
