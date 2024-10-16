import { SignUp as SignUpAuthUI } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "../../hooks/useSupabase";
import { Link } from "react-router-dom";

const SignUp = () => {
  return (
    <div className="m-auto flex h-full max-w-7xl items-center justify-center">
      <div className="w-96 rounded-md bg-white p-8">
        <h1 className="mb-8 text-3xl font-semibold text-gray-600">Sign Up</h1>
        <SignUpAuthUI
          providers={[]}
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          redirectTo={window.origin + "/profile"}
        />
        <div className="pt-4 text-center">
          <Link className="block pb-2 text-blue-500" to="/sign-in">
            Already have an account?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
