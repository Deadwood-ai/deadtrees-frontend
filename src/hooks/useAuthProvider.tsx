import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";

import { supabase } from "../useSupabase";

interface AuthProviderProps {
  children: React.ReactNode;
}

type AuthContextType = {
  session: Session | null;
  user: User | null;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  signOut: async () => {
    await supabase.auth.signOut();
  },
});

const AuthProvider = (props: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
    });

    const setData = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }

      setSession(session);
      setUser(session?.user || null);
    };

    setData();

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}> {props.children} </AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthProvider;
