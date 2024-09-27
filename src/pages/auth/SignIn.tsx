import { SignIn as SignInAuthUI } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "../../useSupabase";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../../hooks/useAuthProvider";

const SignIn = () => {
  const { session, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate("/profile");
    }
  }, [session, navigate]);

  return (
    <div className="m-auto flex h-full max-w-7xl items-center justify-center">
      <div className="w-96 rounded-md bg-white p-8">
        <h1 className="mb-8 text-3xl font-semibold text-gray-600">Sign In</h1>
        <SignInAuthUI
          supabaseClient={supabase}
          providers={[]}
          appearance={{ theme: ThemeSupa }}
          redirectTo={window.origin + "/profile"}
        />
        <div className="pt-4 text-center">
          Not registered yet?{" "}
          <Link to="/sign-up" className="text-blue-500 underline">
            Create an account
          </Link>
        </div>
        <div className="pt-4 text-center">
          Forgott password?{" "}
          <Link to="/forgot-password" className="text-blue-500 underline">
            Reset Password
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
