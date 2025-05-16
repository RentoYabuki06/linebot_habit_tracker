import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log("🔐 Supabase config:", {
	url: process.env.SUPABASE_URL,
	key: process.env.SUPABASE_KEY ? '[SET]' : '[MISSING]',
});

// Make sure we have the required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
	console.error("Missing Supabase environment variables. Check your .env file.");
	console.error("SUPABASE_URL:", process.env.SUPABASE_URL);
	console.error("SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "Set but hidden" : "Not set");
	throw new Error("Missing required Supabase environment variables");
}

export const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_ANON_KEY
);

console.log("Supabase client initialized successfully");