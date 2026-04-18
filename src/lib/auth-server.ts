import { prisma } from "./prisma";

export async function getUserIdFromToken(token: string) {
  if (!token) return { userId: null, error: "Missing token" };

  try {
    // Verify token with Firebase Auth REST API
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.error("CRITICAL: NEXT_PUBLIC_FIREBASE_API_KEY is missing on the server!");
      return { userId: null, error: "Server configuration error" };
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
      return { userId: null, error: data.error?.message || "Invalid session" };
    }

    const firebaseUser = data.users[0];
    const firebaseUid = firebaseUser.localId;

    let user = await prisma.user.findUnique({
      where: { id: firebaseUid },
    });

    if (!user && firebaseUser.email) {
      // Check if user exists with this email but different ID
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: firebaseUser.email },
      });

      if (existingUserByEmail) {
        // If the ID is different, we have a mismatch. 
        // In a strict firebase_uid mapping system, the DB ID should be the firebaseUid.
        // Since we can't easily change @id in Prisma, we'll return the existing ID
        // but log this as a potential inconsistency.
        // However, the best approach for consistency is to ensure we use the same ID everywhere.
        console.warn(`User mismatch: Email ${firebaseUser.email} has DB ID ${existingUserByEmail.id} but Firebase UID ${firebaseUid}`);
        return { userId: existingUserByEmail.id, error: null };
      }

      user = await prisma.user.create({
        data: {
          id: firebaseUid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || null,
          image: firebaseUser.photoUrl || null,
        },
      });
    }

    if (!user) {
      return { userId: null, error: "Could not find or create user account" };
    }

    return { userId: user.id, error: null };
  } catch (error: any) {
    console.error("Error in getUserIdFromToken:", error);
    return { userId: null, error: error.message || "Internal auth error" };
  }
}
