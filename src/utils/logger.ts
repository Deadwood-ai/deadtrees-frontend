import { supabase } from "../hooks/useSupabase";

interface LoggerProps {
  user_id: string;
  process: string;
  level: string;
  message: string;
}

const logger = async ({ user_id, process, level, message }: LoggerProps) => {
  const { data, error } = await supabase.from("deadtrees_logs").insert([
    {
      user_id,
      process,
      level,
      message,
    },
  ]);

  if (error) {
    console.error(error);
  }
};

export default logger;
