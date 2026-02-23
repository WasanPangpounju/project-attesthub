import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? '';

    await connectToDatabase();

    // 1. Find by real clerkUserId first (returning user)
    let user = await User.findOne({ clerkUserId: userId });

    // 2. If not found, try matching pre-registered record by email
    if (!user && email) {
      user = await User.findOne({ email });
      if (user) {
        // Merge pre-registered record with real Clerk account
        user.clerkUserId = userId;
        user.isPreRegistered = false;
        if (!user.firstName && clerkUser?.firstName) user.firstName = clerkUser.firstName;
        if (!user.lastName && clerkUser?.lastName) user.lastName = clerkUser.lastName;
        user.updatedAt = new Date();
        await user.save();
      }
    }

    // 3. Create new record if nothing found
    if (!user) {
      user = await User.create({
        clerkUserId: userId,
        email,
        firstName: clerkUser?.firstName ?? '',
        lastName: clerkUser?.lastName ?? '',
        roleAssigned: false,
        status: 'active',
        isPreRegistered: false,
      });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/profile/get-profile] error:', err);
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 });
  }
}
