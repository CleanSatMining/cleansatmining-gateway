import { createClient, SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseClient(): SupabaseClient<any, "public", any> {
  const apiKey = process.env.SUPABASE_API_KEY;
  const supabaseUrl = process.env.SUPABASE_API_URL;
  if (!apiKey) {
    throw new Error("API key is missing.");
  }
  if (!supabaseUrl) {
    throw new Error("Supabase URL is missing.");
  }

  return createClient(supabaseUrl, apiKey);
}
