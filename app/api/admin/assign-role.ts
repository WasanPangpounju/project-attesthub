import { auth } from '@clerk/nextjs/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

// Admin-only endpoint to assign user role
export async function POST(req: Request) {
  try {
    const { userId: adminId } = await auth();

    if (!adminId) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Check if requester is admin
    const admin = await User.findOne({ clerkUserId: adminId, role: 'admin' });
    if (!admin) {
      return Response.json(
        { error: 'Only admins can assign roles' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { targetUserId, role } = body;

    if (!['admin', 'tester', 'customer'].includes(role)) {
      return Response.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const user = await User.findOneAndUpdate(
      { clerkUserId: targetUserId },
      {
        role,
        roleAssigned: true,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!user) {
      return Response.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: `User role assigned to ${role}`,
      user,
    });
  } catch (error) {
    console.error('Assign role error:', error);
    return Response.json(
      { error: 'Failed to assign role' },
      { status: 500 }
    );
  }
}

// Get all users for admin management
export async function GET(req: Request) {
  try {
    const { userId: adminId } = await auth();

    if (!adminId) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Check if requester is admin
    const admin = await User.findOne({ clerkUserId: adminId, role: 'admin' });
    if (!admin) {
      return Response.json(
        { error: 'Only admins can view user list' },
        { status: 403 }
      );
    }

    const users = await User.find({})
      .select('clerkUserId email firstName lastName role roleAssigned status createdAt')
      .limit(100);

    return Response.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return Response.json(
      { error: 'Failed to get users' },
      { status: 500 }
    );
  }
}
