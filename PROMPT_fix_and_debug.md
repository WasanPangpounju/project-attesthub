# Fix: Profile Merge Not Working

## Step 1 — Investigate (do this first, show output)

Run these commands and show the results:

```bash
cat app/api/profile/get-profile.ts
cat app/dashboard/page.tsx
npx tsx -e "
import('./lib/mongodb').then(m => m.connectToDatabase()).then(async () => {
  const mongoose = await import('mongoose')
  const users = await mongoose.connection.db.collection('users').find({}).toArray()
  console.log(JSON.stringify(users, null, 2))
  process.exit(0)
})
"
```

## Step 2 — Fix based on what you find

### Fix A: If `get-profile.ts` does NOT have email-based merge logic
Rewrite the entire GET handler in `app/api/profile/get-profile.ts`:

```ts
import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import User from "@/models/User"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const clerkUser = await currentUser()
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? ""

    await connectToDatabase()

    // 1. Find by real clerkUserId first (returning user)
    let user = await User.findOne({ clerkUserId: userId })

    // 2. If not found, try matching pre-registered record by email
    if (!user && email) {
      user = await User.findOne({ email })
      if (user) {
        // Merge pre-registered record with real Clerk account
        user.clerkUserId = userId
        user.isPreRegistered = false
        if (!user.firstName && clerkUser?.firstName) user.firstName = clerkUser.firstName
        if (!user.lastName && clerkUser?.lastName) user.lastName = clerkUser.lastName
        user.updatedAt = new Date()
        await user.save()
      }
    }

    // 3. Create new record if nothing found
    if (!user) {
      user = await User.create({
        clerkUserId: userId,
        email,
        firstName: clerkUser?.firstName ?? "",
        lastName: clerkUser?.lastName ?? "",
        roleAssigned: false,
        status: "active",
        isPreRegistered: false,
      })
    }

    return NextResponse.json({ data: user }, { status: 200 })
  } catch (err) {
    console.error("[GET /api/profile/get-profile] error:", err)
    return NextResponse.json({ error: "Failed to get profile" }, { status: 500 })
  }
}
```

### Fix B: If MongoDB has 2 records for same email
Delete the duplicate directly via the DB:

```ts
// Run this one-time cleanup script: scripts/cleanup-duplicate-users.ts
import { connectToDatabase } from "../lib/mongodb"
import User from "../models/User"

async function main() {
  await connectToDatabase()
  
  // Find all pre_ placeholder records
  const preRegistered = await User.find({ 
    clerkUserId: { $regex: /^pre_/ } 
  }).lean()
  
  console.log(`Found ${preRegistered.length} pre-registered records:`)
  preRegistered.forEach(u => console.log(` - ${u.email} | ${u.clerkUserId} | role: ${u.role}`))
  
  // Delete them (real records matched by email already exist)
  const result = await User.deleteMany({ clerkUserId: { $regex: /^pre_/ } })
  console.log(`Deleted ${result.deletedCount} placeholder records`)
  
  // Show remaining records
  const remaining = await User.find({}).lean()
  console.log("\nRemaining users:")
  remaining.forEach(u => console.log(` - ${u.email} | ${u.clerkUserId} | role: ${u.role} | roleAssigned: ${u.roleAssigned}`))
  
  process.exit(0)
}

main().catch(console.error)
```

Run it:
```bash
npx tsx scripts/cleanup-duplicate-users.ts
```

### Fix C: If real clerkUserId record exists but roleAssigned is false
Update it directly:

```bash
npx tsx -e "
import('./lib/mongodb').then(m => m.connectToDatabase()).then(async () => {
  const { default: User } = await import('./models/User')
  const result = await User.findOneAndUpdate(
    { email: 'tactiledev.wasan@gmail.com' },
    { \$set: { role: 'customer', roleAssigned: true, isPreRegistered: false, updatedAt: new Date() } },
    { new: true }
  ).lean()
  console.log('Updated:', JSON.stringify(result, null, 2))
  process.exit(0)
})
"
```

### Fix D: If `app/dashboard/page.tsx` still has FORCE_ADMIN or hardcoded redirect
Remove it completely. The file must only contain:

```tsx
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { connectToDatabase } from "@/lib/mongodb"
import User from "@/models/User"

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  await connectToDatabase()
  const user = await User.findOne({ clerkUserId: userId }).lean()

  if (!user || !user.roleAssigned) redirect("/dashboard/pending")
  if (user.role === "admin") redirect("/dashboard/admin")
  if (user.role === "tester") redirect("/dashboard/tester")
  if (user.role === "customer") redirect("/dashboard/customer")

  redirect("/dashboard/pending")
}
```

## Step 3 — Verify get-profile is actually being called on login

Check if `app/dashboard/page.tsx` calls `get-profile` before querying role.
If it queries MongoDB directly without calling get-profile, the merge never triggers.

The fix: call get-profile BEFORE the role redirect, or inline the merge logic directly
in `dashboard/page.tsx` the same way get-profile does it.

Recommended: move the full merge logic INTO `dashboard/page.tsx` directly so it runs
on every dashboard visit without needing a separate API call:

```tsx
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { connectToDatabase } from "@/lib/mongodb"
import User from "@/models/User"

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? ""

  await connectToDatabase()

  // Try find by clerkUserId
  let user = await User.findOne({ clerkUserId: userId })

  // If not found, try merge with pre-registered record by email
  if (!user && email) {
    user = await User.findOne({ email })
    if (user) {
      user.clerkUserId = userId
      user.isPreRegistered = false
      if (!user.firstName && clerkUser?.firstName) user.firstName = clerkUser.firstName
      if (!user.lastName && clerkUser?.lastName) user.lastName = clerkUser.lastName
      user.updatedAt = new Date()
      await user.save()
    }
  }

  // Create new if still nothing
  if (!user) {
    user = await User.create({
      clerkUserId: userId,
      email,
      firstName: clerkUser?.firstName ?? "",
      lastName: clerkUser?.lastName ?? "",
      roleAssigned: false,
      status: "active",
      isPreRegistered: false,
    })
  }

  if (!user.roleAssigned) redirect("/dashboard/pending")
  if (user.role === "admin") redirect("/dashboard/admin")
  if (user.role === "tester") redirect("/dashboard/tester")
  if (user.role === "customer") redirect("/dashboard/customer")

  redirect("/dashboard/pending")
}
```

## Step 4 — Final test
1. Restart dev server: `npm run dev`
2. Login with `tactiledev.wasan@gmail.com`
3. Must redirect to `/dashboard/customer`

## Definition of Done
- [ ] MongoDB shows exactly 1 record for tactiledev.wasan@gmail.com
- [ ] That record has real clerkUserId (starts with `user_`), role=customer, roleAssigned=true
- [ ] Login redirects to /dashboard/customer
- [ ] `npm run lint` passes
