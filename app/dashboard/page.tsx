import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? '';

  await connectToDatabase();

  // 1. Find by real clerkUserId first (returning user)
  let user = await User.findOne({ clerkUserId: userId }).lean<{
    roleAssigned: boolean;
    role?: string;
  }>();

  // 2. If not found, try matching pre-registered record by email and merge
  if (!user && email) {
    const preRegistered = await User.findOne({ email });
    if (preRegistered) {
      preRegistered.clerkUserId = userId;
      preRegistered.isPreRegistered = false;
      if (!preRegistered.firstName && clerkUser?.firstName) preRegistered.firstName = clerkUser.firstName;
      if (!preRegistered.lastName && clerkUser?.lastName) preRegistered.lastName = clerkUser.lastName;
      preRegistered.updatedAt = new Date();
      await preRegistered.save();
      user = preRegistered.toObject();
    }
  }

  // 3. Create new record if still nothing found
  if (!user) {
    const created = await User.create({
      clerkUserId: userId,
      email,
      firstName: clerkUser?.firstName ?? '',
      lastName: clerkUser?.lastName ?? '',
      roleAssigned: false,
      status: 'active',
      isPreRegistered: false,
    });
    user = created.toObject();
  }

  if (!user!.roleAssigned) redirect('/dashboard/pending');
  if (user!.role === 'admin') redirect('/dashboard/admin');
  if (user!.role === 'tester') redirect('/dashboard/tester');
  if (user!.role === 'customer') redirect('/dashboard/customer');

  redirect('/dashboard/pending');
}
