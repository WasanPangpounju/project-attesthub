import { auth } from '@clerk/nextjs/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ clerkUserId: userId });

    if (!user) {
      // Create new user if doesn't exist
      const { user: clerkUser } = await auth();
      const newUser = await User.create({
        clerkUserId: userId,
        email: clerkUser?.emailAddresses[0]?.emailAddress,
        firstName: clerkUser?.firstName,
        lastName: clerkUser?.lastName,
        roleAssigned: false,
        status: 'active',
      });

      return Response.json({
        success: true,
        user: newUser,
        roleAssigned: false,
      });
    }

    return Response.json({
      success: true,
      user,
      roleAssigned: user.roleAssigned,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return Response.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}
