'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleAssigned, setRoleAssigned] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/profile/get-profile');
        const data = await response.json();

        if (data.user) {
          setUserRole(data.user.role);
          setRoleAssigned(data.user.roleAssigned);

          if (!data.user.roleAssigned) {
            // Role not assigned, show support message
            setIsLoading(false);
            return;
          }

          if (!allowedRoles.includes(data.user.role)) {
            // User role not allowed, redirect
            router.replace('/dashboard');
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!roleAssigned) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Role Assignment Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription className="text-base">
                Your account has been created successfully, but your access role has not been assigned yet.
                <br />
                <br />
                Please contact the <strong>Support Team</strong> to assign your access permissions.
                <br />
                <br />
                <strong>Support Contact:</strong> support@attesthub.com
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!allowedRoles.includes(userRole || '')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                You do not have permission to access this section. Your current role: <strong>{userRole}</strong>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
