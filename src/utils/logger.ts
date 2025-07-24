import { supabase } from "../hooks/useSupabase";

interface LoggerProps {
  user_id: string;
  file_name: string;
  process: string;
  level: string;
  message: string;
}

const logger = async ({ user_id, file_name, process, level, message }: LoggerProps) => {
  const { error } = await supabase.from("v2_logs").insert([
    {
      user_id,
      name: file_name, // Map file_name to name
      category: process, // Map process to category
      level,
      message,
    },
  ]);

  if (error) {
    console.error(error);
  }
};

export default logger;
