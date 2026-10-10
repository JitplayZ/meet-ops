import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// We need the SERVICE_ROLE_KEY to bypass RLS and create users directly if needed,
// but for standard signup the anon key is fine. We will securely use the ANON key 
// to simulate exactly what the frontend does.
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedTestUser() {
  const email = 'admin@resourceflow.test';
  const password = 'password123';
  const name = 'Admin Test User';
  const role = 'admin';

  console.log(`Checking if test user ${email} exists...`);
  
  // Try to sign in first
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInData?.user) {
    console.log(`User already exists and authenticated! UID: ${signInData.user.id}`);
    
    // Ensure they have the admin role in the users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', signInData.user.id);
      
    if (updateError) {
      console.error('Failed to update existing user to admin role:', updateError.message);
    } else {
      console.log('Verified user has admin role in database.');
    }
    process.exit(0);
  }

  console.log('User not found. Creating new test user...');

  // Sign up the user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        name: name,
        role: role,
      }
    }
  });

  if (signUpError) {
    console.error('Error creating user:', signUpError.message);
    process.exit(1);
  }

  // The database trigger we added earlier handles inserting them into the 'users' table automatically.
  console.log(`Successfully created test user! UID: ${signUpData.user?.id}`);
  console.log('You can now log in with:');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  process.exit(0);
}

seedTestUser();
