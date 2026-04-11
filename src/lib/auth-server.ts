import { prisma } from "./prisma";

export async function getUserIdFromToken(token: string) {
  if (!token) return null;

  try {
    // Verify token with Firebase Auth REST API
    // This is a lightweight way to verify an ID token without firebase-admin
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.error("CRITICAL: NEXT_PUBLIC_FIREBASE_API_KEY is missing on the server!");
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: token }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.users || data.users.length === 0) {
      console.error("Firebase token verification failed. Status:", response.status, "Error:", data.error);
      return null;
    }

    const firebaseUser = data.users[0];
    const firebaseUid = firebaseUser.localId;

    // Find or Create user in our DB using the firebaseUid as the user ID
    // We use the 'id' field in Prisma to store the Firebase UID
    let user = await prisma.user.findUnique({
      where: { id: firebaseUid },
    });

    if (!user) {
      // Check if user exists with the same email (conflict resolution/migration)
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: firebaseUser.email },
      });

      if (existingUserByEmail) {
        // If user exists with email but different ID (e.g. old NextAuth user),
        // we might want to update their ID or link them.
        // For simplicity and to follow "Use Firebase uid as unique identifier",
        // we will update the existing user's ID if possible, 
        // but Prisma doesn't allow updating @id.
        // So we just return the existing user's ID for now, 
        // OR we can choose to use the firebaseUid going forward.
        return existingUserByEmail.id;
      }

      // Create new user if they don't exist
      user = await prisma.user.create({
        data: {
          id: firebaseUid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || null,
          image: firebaseUser.photoUrl || null,
        },
      });
    }

    return user.id;
  } catch (error) {
    console.error("Error in getUserIdFromToken:", error);
    return null;
  }
}
