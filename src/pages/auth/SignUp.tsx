import { SignUp as SignUpAuthUI } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "../../hooks/useSupabase";
import { Link, useSearchParams } from "react-router-dom";

const SignUp = () => {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/profile";

  return (
    <div className="m-auto flex h-full max-w-7xl items-center justify-center">
      <div className="w-96 rounded-md p-8">
        <h1 className="mb-8 text-3xl font-semibold text-gray-600">Sign Up</h1>
        <SignUpAuthUI
          providers={[]}
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          redirectTo={window.origin + returnTo}
        />
        <div className="pt-4 text-center">
          <Link className="block pb-2 text-blue-500" to={`/sign-in${returnTo !== "/profile" ? `?returnTo=${returnTo}` : ""}`}>
            Already have an account?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
