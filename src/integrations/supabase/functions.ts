import { supabase } from "./client";

// NOTE: Replace 'rcfbzckaanhypnnlxuvo' with your actual Supabase Project ID if it changes.
const SUPABASE_PROJECT_ID = "rcfbzckaanhypnnlxuvo";
const BASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

interface CreateUserPayload {
  email: string;
  password: string;
  user_metadata?: Record<string, any>;
}

interface UpdateUserPayload {
  userId: string;
  email?: string;
  password?: string;
  user_metadata?: {
    nome?: string;
  };
  admin?: boolean;
}

interface DeleteUserPayload {
  userId: string;
}

const getAuthHeaders = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Authentication error: ${error.message}`);
  if (!session) throw new Error("User not authenticated. Please log in.");
  return { Authorization: `Bearer ${session.access_token}` };
};

const handleFunctionResponse = (data: any, error: Error | null, functionName: string) => {
  if (error) {
    console.error(`Error invoking ${functionName}:`, error);
    throw new Error(error.message);
  }
  
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};

/**
 * Invokes the admin-create-user Edge Function to create a new user.
 * Requires the current user to be authenticated and have admin: true in the 'user' table.
 */
export const adminCreateUser = async (payload: CreateUserPayload) => {
  const headers = await getAuthHeaders();
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: payload,
    method: "POST",
    headers,
  });
  return handleFunctionResponse(data, error, "adminCreateUser");
};

/**
 * Invokes the admin-update-user Edge Function to update an existing user.
 * Requires the current user to be authenticated and have admin: true in the 'user' table.
 */
export const adminUpdateUser = async (payload: UpdateUserPayload) => {
  const headers = await getAuthHeaders();
  const { data, error } = await supabase.functions.invoke("admin-update-user", {
    body: payload,
    method: "POST",
    headers,
  });
  return handleFunctionResponse(data, error, "adminUpdateUser");
};

/**
 * Invokes the admin-delete-user Edge Function to delete a user.
 * Requires the current user to be authenticated and have admin: true in the 'user' table.
 */
export const adminDeleteUser = async (payload: DeleteUserPayload) => {
  const headers = await getAuthHeaders();
  const { data, error } = await supabase.functions.invoke("admin-delete-user", {
    body: payload,
    method: "POST",
    headers,
  });
  return handleFunctionResponse(data, error, "adminDeleteUser");
};