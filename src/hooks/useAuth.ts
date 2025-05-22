import { useState, useEffect } from "react";

interface User {
  id: string;
  role?: string;
  email?: string;
  [key: string]: unknown;
}

interface Session {
  access_token: string;
  expires_at: number;
}

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

export const useAuth = (): AuthContextProps => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading auth data
    const loadAuth = async () => {
      setIsLoading(true);

      try {
        // For development purposes, generate a mock user with processor role
        // In a real app, this would come from Supabase or another auth provider
        setUser({
          id: "123",
          role: "processor",
          email: "processor@example.com",
        });

        setSession({
          access_token: "mock-token",
          expires_at: Date.now() + 3600000, // 1 hour from now
        });
      } catch (error) {
        console.error("Error loading auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  const signOut = async (): Promise<void> => {
    // In a real app, this would call an auth provider's signOut method
    setUser(null);
    setSession(null);
  };

  return {
    user,
    session,
    signOut,
    isLoading,
  };
};
