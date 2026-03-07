import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://knpwncirbhcytssrxcqx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtucHduY2lyYmhjeXRzc3J4Y3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMjY2NDAsImV4cCI6MjA3MzYwMjY0MH0.i5JtOB5o8OqU92axiJb2adkqV1kSO8hw7WwGJC1De7Y";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
