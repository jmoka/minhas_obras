import { supabase } from "./client";

// NOTE: Replace 'rcfbzckaanhypnnlxuvo' with your actual Supabase Project ID if it changes.
const SUPABASE_PROJECT_ID = "rcfbzckaanhypnnlxuvo";
const BASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

interface CreateUserPayload {
  email: string;
  password: string;
  user_metadata?: Record<string, any>;
}

/**
 * Invokes the admin-create-user Edge Function to create a new user.
 * Requires the current user to be authenticated and have admin: true in the 'user' table.
 */
export const adminCreateUser = async (payload: CreateUserPayload) => {
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: payload,
    method: "POST",
  });

  if (error) {
    console.error("Error invoking adminCreateUser:", error);
    throw new Error(error.message);
  }
  
  // The response from the Edge Function is in data.data
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};