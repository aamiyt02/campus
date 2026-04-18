"use client";

import { useState, useEffect, FormEvent } from "react";
import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  linkWithCredential,
  AuthCredential,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  EmailAuthProvider
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Mail, Zap, ArrowRight, AlertCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FirebaseLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Conflict resolution state
  const [conflictState, setConflictState] = useState<{
    email: string;
    pendingCredential: any;
    existingMethods: string[];
  } | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Handle redirect result and magic link on mount
  useEffect(() => {
    const handleAuthRedirects = async () => {
      try {
        // 1. Check for Google redirect result first
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult) {
          const idToken = await redirectResult.user.getIdToken();
          const credential = GoogleAuthProvider.credentialFromResult(redirectResult);
          const googleAccessToken = credential?.accessToken;

          // Sync with backend
          const syncRes = await fetch("/api/auth/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken, googleAccessToken }),
          });

          if (!syncRes.ok) {
            const syncData = await syncRes.json();
            console.error("Sync failed after redirect:", syncData);
          }

          window.localStorage.setItem("idToken", idToken);
          router.push("/dashboard");
          return;
        }

        // 2. Check for Magic Link completion
        if (isSignInWithEmailLink(auth, window.location.href)) {
          let emailForSignIn = window.localStorage.getItem("emailForSignIn");
          if (!emailForSignIn) {
            emailForSignIn = window.prompt("Please provide your email for confirmation");
          }

          if (emailForSignIn) {
            setLoading(true);
            const result = await signInWithEmailLink(auth, emailForSignIn, window.location.href);
            window.localStorage.removeItem("emailForSignIn");
            
            const idToken = await result.user.getIdToken();
            await fetch("/api/auth/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken }),
            });

            // Check if we have a pending credential to link
            const pendingCredJson = window.sessionStorage.getItem("pendingCredential");
            if (pendingCredJson) {
              window.sessionStorage.removeItem("pendingCredential");
            }
            
            router.push("/dashboard");
            return;
          }
        }

        // 3. Check if user is already signed in
        if (auth.currentUser) {
          router.push("/dashboard");
          return;
        }
      } catch (error: any) {
        console.error("Auth redirect handling error:", error);
        if (error.code === "auth/account-exists-with-different-credential") {
          const conflictEmail = error.customData?.email;
          if (conflictEmail) {
            const methods = await fetchSignInMethodsForEmail(auth, conflictEmail);
            const pendingCred = GoogleAuthProvider.credentialFromError(error);
            setConflictState({
              email: conflictEmail,
              pendingCredential: pendingCred || null,
              existingMethods: methods,
            });
          }
        } else if (error.code !== "auth/popup-blocked") {
          setErrorMsg("Failed to complete sign-in. Please try again.");
        }
      } finally {
        setInitializing(false);
        setLoading(false);
      }
    };

    handleAuthRedirects();
  }, [router]);

  // Sync user to backend after successful sign-in
  const syncWithBackend = async (idToken: string, googleAccessToken?: string | null) => {
    try {
      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          idToken, 
          ...(googleAccessToken && { googleAccessToken }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("Backend sync error:", data);
        throw new Error(data.error || "Sync failed");
      }

      return await res.json();
    } catch (err) {
      console.error("Sync error:", err);
      throw err;
    }
  };

  // Magic link action
  const handleSendMagicLink = async (conflictEmail: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const actionCodeSettings = {
        url: window.location.href,
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

  // Google Sign-in — tries popup first, falls back to redirect
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    const provider = new GoogleAuthProvider();
    // Request Gmail readonly access for email sync
    provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
    // Force account selection prompt
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      // Try popup first (works on most desktop browsers)
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      // Get Google Access Token
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const googleAccessToken = credential?.accessToken;

      // Sync with backend
      await syncWithBackend(idToken, googleAccessToken);

      // Save token locally
      window.localStorage.setItem("idToken", idToken);

      // If resolving a conflict, link the pending credential
      if (conflictState?.pendingCredential) {
        try {
          await linkWithCredential(result.user, conflictState.pendingCredential);
        } catch (linkErr) {
          console.warn("Could not auto-link credential:", linkErr);
        }
        setConflictState(null);
      }

      router.push("/dashboard");
    } catch (error: any) {
      if (error.code === "auth/popup-blocked" || error.code === "auth/popup-closed-by-user") {
        // Fallback to redirect-based sign in
        console.log("Popup blocked/closed, falling back to redirect...");
        try {
          await signInWithRedirect(auth, provider);
          // Page will reload after redirect completes — handled in useEffect
        } catch (redirectErr: any) {
          console.error("Redirect sign-in also failed:", redirectErr);
          setErrorMsg("Sign-in failed. Please allow popups or try again.");
          setLoading(false);
        }
      } else if (error.code === "auth/account-exists-with-different-credential") {
        const conflictEmail = error.customData?.email;
        const pendingCred = GoogleAuthProvider.credentialFromError(error);

        if (conflictEmail) {
          const methods = await fetchSignInMethodsForEmail(auth, conflictEmail);
          setConflictState({
            email: conflictEmail,
            pendingCredential: pendingCred || null,
            existingMethods: methods,
          });
        }
        setLoading(false);
      } else if (error.code === "auth/cancelled-popup-request") {
        // User cancelled — not really an error
        setLoading(false);
      } else {
        console.error("Google sign-in error:", error);
        setErrorMsg(`Sign-in failed: ${error.message || "Please try again."}`);
        setLoading(false);
      }
    }
  };

  const [isSignUp, setIsSignUp] = useState(false);

  // Email/Password Sign-in
  const handleEmailSignIn = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    const targetEmail = conflictState ? conflictState.email : email;

    if (!targetEmail || !password) {
      setErrorMsg("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      let result;
      if (isSignUp && !conflictState) {
        result = await createUserWithEmailAndPassword(auth, targetEmail, password);
      } else {
        result = await signInWithEmailAndPassword(auth, targetEmail, password);
      }
      
      const idToken = await result.user.getIdToken();

      // Sync with backend
      await syncWithBackend(idToken);

      window.localStorage.setItem("idToken", idToken);
      
      // If resolving a conflict, link the pending credential
      if (conflictState?.pendingCredential) {
        try {
          await linkWithCredential(result.user, conflictState.pendingCredential);
        } catch (linkErr) {
          console.warn("Could not auto-link credential:", linkErr);
        }
        setConflictState(null);
      }

      router.push("/dashboard");
    } catch (error: any) {
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        setErrorMsg("Incorrect email or password. Please try again.");
      } else if (error.code === "auth/email-already-in-use" && isSignUp) {
        const methods = await fetchSignInMethodsForEmail(auth, targetEmail);
        setConflictState({
          email: targetEmail,
          pendingCredential: EmailAuthProvider.credential(targetEmail, password),
          existingMethods: methods,
        });
      } else if (error.code === "auth/account-exists-with-different-credential") {
        const conflictEmail = error.customData?.email;
        const pendingCred = EmailAuthProvider.credential(targetEmail, password);
        if (conflictEmail) {
          const methods = await fetchSignInMethodsForEmail(auth, conflictEmail);
          setConflictState({
            email: conflictEmail,
            pendingCredential: pendingCred,
            existingMethods: methods,
          });
        }
      } else if (error.code === "auth/weak-password") {
        setErrorMsg("Password should be at least 6 characters.");
      } else if (error.code === "auth/user-not-found") {
        setErrorMsg("No account found with this email. Click 'Sign Up' to create one.");
      } else if (error.code === "auth/invalid-email") {
        setErrorMsg("Please enter a valid email address.");
      } else if (error.code === "auth/too-many-requests") {
        setErrorMsg("Too many failed attempts. Please wait a moment and try again.");
      } else {
        setErrorMsg(error.message || `Failed to ${isSignUp ? 'sign up' : 'sign in'}. Please try again.`);
      }
      console.error("Email sign-in error:", error);
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

  // Show loading state while checking redirects
  if (initializing) {
    return (
      <div className="glass-card animate-fade-in" style={{ padding: 48, textAlign: "center", maxWidth: 420, width: "100%" }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: "linear-gradient(135deg, var(--accent), #4f46e5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
          animation: "pulse-glow 2s infinite",
        }}>
          <Zap size={26} color="white" />
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Checking authentication...</p>
      </div>
    );
  }

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
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <Chrome size={18} />}
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
                className="input"
                placeholder="••••••••"
                style={{ width: "100%", marginBottom: 12 }}
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
            style={{ background: "transparent", border: "1px solid var(--border)", padding: "10px", borderRadius: 8, cursor: "pointer", fontSize: "0.875rem", marginTop: 8, color: "var(--text-secondary)" }}
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

      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: 32, lineHeight: 1.6 }}>
        {isSignUp ? 'Join CampusExtract to organize your events.' : 'Sign in to access your campus events dashboard.'}
      </p>

      {errorMsg && (
        <div style={{ color: "var(--danger)", fontSize: "0.875rem", marginBottom: 16, padding: "12px", background: "rgba(239,68,68,0.1)", borderRadius: 8 }}>
          {errorMsg}
        </div>
      )}

      <button 
        className="btn-primary" 
        onClick={handleGoogleSignIn} 
        disabled={loading} 
        id="google-signin-btn"
        style={{ width: "100%", justifyContent: "center", padding: "14px 24px", marginBottom: 16 }}
      >
        {loading ? <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} /> : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        )}
        Continue with Google
      </button>

      <div style={{ position: "relative", textAlign: "center", margin: "24px 0" }}>
        <hr style={{ borderTop: "1px solid var(--border)", border: "none", borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: "var(--border)" }} />
        <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "var(--bg-card)", padding: "0 12px", fontSize: "0.875rem", color: "var(--text-muted)" }}>
          OR
        </span>
      </div>

      <form onSubmit={handleEmailSignIn} style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: "0.875rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            className="input" 
            placeholder="you@example.com" 
            id="email-input"
          />
        </div>
        <div>
          <label style={{ fontSize: "0.875rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            className="input" 
            placeholder="••••••••" 
            id="password-input"
          />
        </div>
        <button 
          type="submit" 
          className="btn-primary" 
          disabled={loading} 
          id="email-signin-btn"
          style={{ width: "100%", justifyContent: "center", padding: "14px 24px" }}
        >
          {loading ? <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} /> : (isSignUp ? "Create Account" : "Login with Email")}
        </button>
      </form>
      
      <p style={{ marginTop: 24, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        {isSignUp ? "Already have an account?" : "Don't have an account?"}
        <button 
          onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(null); }}
          style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", marginLeft: 6, fontWeight: 600 }}
        >
          {isSignUp ? "Back to Login" : "Sign Up"}
        </button>
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
