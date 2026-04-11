"use client";

import { useState, FormEvent } from "react";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  linkWithCredential,
  AuthCredential,
  sendSignInLinkToEmail
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Mail, Zap, ArrowRight, AlertCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FirebaseLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Conflict resolution state
  const [conflictState, setConflictState] = useState<{
    email: string;
    pendingCredential: AuthCredential | null;
    existingMethods: string[];
  } | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Magic link action
  const handleSendMagicLink = async (conflictEmail: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const actionCodeSettings = {
        url: window.location.origin + "/dashboard", // Set dynamic URL instead of hardcoded
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, conflictEmail, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", conflictEmail);
      setMagicLinkSent(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to send magic link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-in Trigger
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    const provider = new GoogleAuthProvider();
    // Force prompt to select account, preventing loop
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      // Get Google Access Token from the result
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const googleAccessToken = credential?.accessToken;

      // Sync with backend
      await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          idToken, 
          googleAccessToken,
        }),
      });

      // Save token for future API calls if needed (though we use cookies or local storage)
      window.localStorage.setItem("idToken", idToken);

      // Success. If we had a pending credential from a previous conflict, link it:
      if (conflictState?.pendingCredential) {
        await linkWithCredential(result.user, conflictState.pendingCredential);
        setConflictState(null); // Resolved
        router.push("/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      if (error.code === "auth/account-exists-with-different-credential") {
        // 1. Extract email and credential
        const conflictEmail = error.customData?.email;
        const pendingCred = GoogleAuthProvider.credentialFromError(error);

        if (conflictEmail) {
          // 2. Fetch existing sign-in methods
          const methods = await fetchSignInMethodsForEmail(auth, conflictEmail);
          setConflictState({
            email: conflictEmail,
            pendingCredential: pendingCred || null,
            existingMethods: methods,
          });
        }
      } else {
        setErrorMsg("Failed to sign in with Google. Please try again.");
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const [isSignUp, setIsSignUp] = useState(false);

  // Email/Password Trigger (either as primary or as resolution)
  const handleEmailSignIn = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    // Use conflict email if resolving, else what's in the form
    const targetEmail = conflictState ? conflictState.email : email;

    try {
      let result;
      if (isSignUp && !conflictState) {
        result = await createUserWithEmailAndPassword(auth, targetEmail, password);
      } else {
        result = await signInWithEmailAndPassword(auth, targetEmail, password);
      }
      
      const idToken = await result.user.getIdToken();

      // Sync with backend
      await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      window.localStorage.setItem("idToken", idToken);
      
      // If we are resolving a conflict, link the pending credential now
      if (conflictState?.pendingCredential) {
        await linkWithCredential(result.user, conflictState.pendingCredential);
        setConflictState(null); // Resolved
        router.push("/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      if (error.code === "auth/wrong-password") {
        setErrorMsg("Incorrect password. Please try again or use the Magic Link option.");
      } else if (error.code === "auth/email-already-in-use") {
        setErrorMsg("Email already in use. Try logging in instead.");
      } else if (error.code === "auth/weak-password") {
        setErrorMsg("Password should be at least 6 characters.");
      } else if (error.code === "auth/user-not-found" && !isSignUp) {
        setErrorMsg("Account does not exist. Click 'Sign Up' below to create one.");
      } else {
        setErrorMsg(`Failed to ${isSignUp ? 'sign up' : 'sign in'}. Please verify your credentials.`);
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const cancelConflict = () => {
    setConflictState(null);
    setPassword("");
    setErrorMsg(null);
    setMagicLinkSent(false);
  };

  // Guided UI for conflict resolution
  if (conflictState) {
    const isGoogle = conflictState.existingMethods.includes("google.com");
    const isPassword = conflictState.existingMethods.includes("password");
    
    let methodText = "another method";
    if (isGoogle && !isPassword) methodText = "Google";
    if (isPassword && !isGoogle) methodText = "Email & Password";
    if (isGoogle && isPassword) methodText = "Google or Email";

    return (
      <div className="glass-card animate-fade-in" style={{ padding: 48, textAlign: "center", maxWidth: 420, width: "100%" }}>
        <div style={{
            width: 56, height: 56, borderRadius: 16, background: "rgba(239,68,68,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px"
        }}>
          <AlertCircle size={26} color="var(--danger)" />
        </div>
        
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8 }}>Account Conflict Detected</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: 24, lineHeight: 1.6 }}>
          You previously signed in using <strong>{methodText}</strong>. Please continue with that method to link your accounts automatically.
        </p>

        {errorMsg && (
          <div style={{ color: "var(--danger)", fontSize: "0.875rem", marginBottom: 16 }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isGoogle && (
            <button className="btn-primary" onClick={handleGoogleSignIn} disabled={loading} style={{ justifyContent: "center" }}>
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <Mail size={18} />}
              Continue with Google
            </button>
          )}

          {isPassword && (
            <div style={{ textAlign: "left", marginTop: 8 }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Password for {conflictState.email}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                style={{ width: "100%", padding: "12px", borderRadius: 8, border: "1px solid var(--border)", marginBottom: 12 }}
              />
              <button className="btn-primary" onClick={() => handleEmailSignIn()} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                Login with Email
              </button>
            </div>
          )}

          {magicLinkSent ? (
            <p style={{ color: "green", fontSize: "0.875rem", marginTop: 12 }}>Magic link sent! Check your email.</p>
          ) : (
            <button 
              onClick={() => handleSendMagicLink(conflictState.email)}
              style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.875rem", marginTop: 12, textDecoration: "underline" }}
            >
              Forgot password? Send Magic Link
            </button>
          )}

          <button 
            onClick={cancelConflict}
            style={{ background: "transparent", border: "1px solid var(--border)", padding: "10px", borderRadius: 8, cursor: "pointer", fontSize: "0.875rem", marginTop: 8 }}
          >
            Cancel & Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card animate-fade-in" style={{ padding: 48, textAlign: "center", maxWidth: 420, width: "100%" }}>
      <div style={{
          width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, var(--accent), #4f46e5)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px"
      }}>
        <Zap size={26} color="white" />
      </div>

      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>{isSignUp ? 'Create Account' : 'Firebase Auth'}</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: 32, lineHeight: 1.6 }}>
        {isSignUp ? 'Join us to organize your events with AI.' : 'Sign in to your account with conflict resolution.'}
      </p>

      {errorMsg && (
        <div style={{ color: "var(--danger)", fontSize: "0.875rem", marginBottom: 16, padding: "12px", background: "rgba(239,68,68,0.1)", borderRadius: 8 }}>
          {errorMsg}
        </div>
      )}

      <button className="btn-primary" onClick={handleGoogleSignIn} disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "14px 24px", marginBottom: 16 }}>
        {loading ? <RefreshCw className="animate-spin" size={18} /> : <Mail size={18} />}
        Continue with Google
      </button>

      <div style={{ position: "relative", textAlign: "center", margin: "24px 0" }}>
        <hr style={{ borderTop: "1px solid var(--border)" }} />
        <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "var(--bg-primary)", padding: "0 12px", fontSize: "0.875rem", color: "var(--text-muted)" }}>
          OR
        </span>
      </div>

      <form onSubmit={handleEmailSignIn} style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: "0.875rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" placeholder="you@example.com" style={{ width: "100%", padding: "12px", borderRadius: 8, border: "1px solid var(--border)" }} />
        </div>
        <div>
          <label style={{ fontSize: "0.875rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-field" placeholder="••••••••" style={{ width: "100%", padding: "12px", borderRadius: 8, border: "1px solid var(--border)" }} />
        </div>
        <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "14px 24px" }}>
          {loading ? <RefreshCw className="animate-spin" size={18} /> : (isSignUp ? "Create Account" : "Login with Email")}
        </button>
      </form>
      
      <p style={{ marginTop: 24, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        {isSignUp ? "Already have an account?" : "Don't have an account?"}
        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", marginLeft: 6, fontWeight: 600 }}
        >
          {isSignUp ? "Back to Login" : "Sign Up"}
        </button>
      </p>
    </div>
  );
}
