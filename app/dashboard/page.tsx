'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
//hard code เข้า admin
  useEffect(() => {
    router.replace('/dashboard/admin');
  }, [router]);

  useEffect(() => {
    const fetchUserAndRedirect = async () => {
      try {
        const response = await fetch('/api/profile/get-profile');
        const data = await response.json();

        if (!data.user) {
          setError('Unable to fetch user profile');
          setIsLoading(false);
          return;
        }

        // If role not assigned, show pending message
        if (!data.user.roleAssigned) {
          setIsLoading(false);
          return;
        }

        // Redirect based on role
        const role = data.user.role;
        switch (role) {
          case 'admin':
            router.replace('/dashboard/admin');
            break;
          case 'tester':
            router.replace('/dashboard/tester');
            break;
          case 'customer':
            router.replace('/dashboard/customer');
            break;
          default:
            setError('Unknown role');
            setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('Failed to load profile');
        setIsLoading(false);
      }
    };

    fetchUserAndRedirect();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show pending message or error
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <Alert>
            <AlertDescription className="text-base text-center">
              <h3 className="font-semibold mb-2">Role Assignment Pending</h3>
              <p>
                Your account has been created successfully. Please contact the <strong>Support Team</strong> to assign your access permissions.
              </p>
              <p className="mt-3 text-sm">
                <strong>Support Email:</strong> support@attesthub.com
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
