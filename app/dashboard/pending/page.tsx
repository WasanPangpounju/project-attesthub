import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PendingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <Alert>
            <AlertDescription className="text-base text-center">
              <h3 className="font-semibold mb-2">Role Assignment Pending</h3>
              <p>
                Your account has been created successfully. Please contact the{' '}
                <strong>Support Team</strong> to assign your access permissions.
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
