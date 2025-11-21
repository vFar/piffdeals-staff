/**
 * Script to create Supabase Auth users and profiles for dummy data
 * 
 * This script creates:
 *   1. Auth users with password "test1234"
 *   2. User profiles linked to the auth users
 * 
 * Usage:
 *   1. Set environment variables:
 *      export SUPABASE_URL="your-supabase-url"
 *      export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 * 
 *   2. Run: node create_dummy_auth_users.js
 * 
 *   3. Then run dummy_data.sql to create invoices and activity logs
 *      (The SQL file will skip user creation since users are created here)
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
// Option 1: Set them directly:
//   export SUPABASE_URL="your-url"
//   export SUPABASE_SERVICE_ROLE_KEY="your-key"
// Option 2: Install dotenv and create a .env file:
//   npm install dotenv
//   Then create .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  console.error('You can set them as environment variables or in a .env file');
  process.exit(1);
}

// Create Supabase admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// All user emails from dummy_data.sql
const users = [
  // Super Admins (5)
  { email: 'superadmin1@test.com', username: 'superadmin1', role: 'super_admin', status: 'active' },
  { email: 'superadmin2@test.com', username: 'superadmin2', role: 'super_admin', status: 'active' },
  { email: 'superadmin3@test.com', username: 'superadmin3', role: 'super_admin', status: 'active' },
  { email: 'superadmin4@test.com', username: 'superadmin4', role: 'super_admin', status: 'inactive' },
  { email: 'superadmin5@test.com', username: 'superadmin5', role: 'super_admin', status: 'active' },
  
  // Admins (10)
  { email: 'admin1@test.com', username: 'admin1', role: 'admin', status: 'active' },
  { email: 'admin2@test.com', username: 'admin2', role: 'admin', status: 'active' },
  { email: 'admin3@test.com', username: 'admin3', role: 'admin', status: 'active' },
  { email: 'admin4@test.com', username: 'admin4', role: 'admin', status: 'inactive' },
  { email: 'admin5@test.com', username: 'admin5', role: 'admin', status: 'active' },
  { email: 'admin6@test.com', username: 'admin6', role: 'admin', status: 'suspended' },
  { email: 'admin7@test.com', username: 'admin7', role: 'admin', status: 'active' },
  { email: 'admin8@test.com', username: 'admin8', role: 'admin', status: 'active' },
  { email: 'admin9@test.com', username: 'admin9', role: 'admin', status: 'inactive' },
  { email: 'admin10@test.com', username: 'admin10', role: 'admin', status: 'active' },
  
  // Employees (35)
  { email: 'employee1@test.com', username: 'employee1', role: 'employee', status: 'active' },
  { email: 'employee2@test.com', username: 'employee2', role: 'employee', status: 'active' },
  { email: 'employee3@test.com', username: 'employee3', role: 'employee', status: 'active' },
  { email: 'employee4@test.com', username: 'employee4', role: 'employee', status: 'inactive' },
  { email: 'employee5@test.com', username: 'employee5', role: 'employee', status: 'active' },
  { email: 'employee6@test.com', username: 'employee6', role: 'employee', status: 'active' },
  { email: 'employee7@test.com', username: 'employee7', role: 'employee', status: 'suspended' },
  { email: 'employee8@test.com', username: 'employee8', role: 'employee', status: 'active' },
  { email: 'employee9@test.com', username: 'employee9', role: 'employee', status: 'active' },
  { email: 'employee10@test.com', username: 'employee10', role: 'employee', status: 'active' },
  { email: 'employee11@test.com', username: 'employee11', role: 'employee', status: 'active' },
  { email: 'employee12@test.com', username: 'employee12', role: 'employee', status: 'inactive' },
  { email: 'employee13@test.com', username: 'employee13', role: 'employee', status: 'active' },
  { email: 'employee14@test.com', username: 'employee14', role: 'employee', status: 'active' },
  { email: 'employee15@test.com', username: 'employee15', role: 'employee', status: 'active' },
  { email: 'employee16@test.com', username: 'employee16', role: 'employee', status: 'active' },
  { email: 'employee17@test.com', username: 'employee17', role: 'employee', status: 'suspended' },
  { email: 'employee18@test.com', username: 'employee18', role: 'employee', status: 'active' },
  { email: 'employee19@test.com', username: 'employee19', role: 'employee', status: 'active' },
  { email: 'employee20@test.com', username: 'employee20', role: 'employee', status: 'active' },
  { email: 'employee21@test.com', username: 'employee21', role: 'employee', status: 'active' },
  { email: 'employee22@test.com', username: 'employee22', role: 'employee', status: 'inactive' },
  { email: 'employee23@test.com', username: 'employee23', role: 'employee', status: 'active' },
  { email: 'employee24@test.com', username: 'employee24', role: 'employee', status: 'active' },
  { email: 'employee25@test.com', username: 'employee25', role: 'employee', status: 'active' },
  { email: 'employee26@test.com', username: 'employee26', role: 'employee', status: 'active' },
  { email: 'employee27@test.com', username: 'employee27', role: 'employee', status: 'active' },
  { email: 'employee28@test.com', username: 'employee28', role: 'employee', status: 'active' },
  { email: 'employee29@test.com', username: 'employee29', role: 'employee', status: 'inactive' },
  { email: 'employee30@test.com', username: 'employee30', role: 'employee', status: 'active' },
  { email: 'employee31@test.com', username: 'employee31', role: 'employee', status: 'active' },
  { email: 'employee32@test.com', username: 'employee32', role: 'employee', status: 'active' },
  { email: 'employee33@test.com', username: 'employee33', role: 'employee', status: 'suspended' },
  { email: 'employee34@test.com', username: 'employee34', role: 'employee', status: 'active' },
  { email: 'employee35@test.com', username: 'employee35', role: 'employee', status: 'active' },
];

const PASSWORD = 'test1234';

async function createUsers() {
  console.log('Creating auth users and profiles with password: test1234\n');
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  const createdUserIds = [];

  for (const user of users) {
    try {
      // Step 1: Create auth user first
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: PASSWORD,
        email_confirm: true, // Auto-confirm email
      });

      if (authError) {
        // Check if user already exists
        if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
          // Try to get existing user
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(u => u.email === user.email);
          
          if (existingUser) {
            // Check if profile exists
            const { data: existingProfile } = await supabaseAdmin
              .from('user_profiles')
              .select('id')
              .eq('id', existingUser.id)
              .single();
            
            if (!existingProfile) {
              // Create profile for existing auth user
              await createProfile(existingUser.id, user);
            }
            console.log(`⚠️  ${user.email}: Already exists, skipped`);
            continue;
          } else {
            console.error(`❌ ${user.email}: ${authError.message}`);
            errorCount++;
            errors.push({ email: user.email, error: authError.message });
            continue;
          }
        } else {
          console.error(`❌ ${user.email}: ${authError.message}`);
          errorCount++;
          errors.push({ email: user.email, error: authError.message });
          continue;
        }
      }

      if (!authData?.user) {
        console.error(`❌ ${user.email}: Failed to create auth user`);
        errorCount++;
        errors.push({ email: user.email, error: 'Failed to create auth user' });
        continue;
      }

      const userId = authData.user.id;
      createdUserIds.push(userId);

      // Step 2: Create user profile
      const profileError = await createProfile(userId, user);
      
      if (profileError) {
        console.error(`❌ ${user.email}: Failed to create profile: ${profileError}`);
        errorCount++;
        errors.push({ email: user.email, error: `Profile creation failed: ${profileError}` });
        // Optionally delete the auth user if profile creation fails
        // await supabaseAdmin.auth.admin.deleteUser(userId);
      } else {
        console.log(`✅ ${user.email} (${user.role})`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ ${user.email}: ${error.message}`);
      errorCount++;
      errors.push({ email: user.email, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Summary:`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log('='.repeat(50));

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(({ email, error }) => {
      console.log(`  - ${email}: ${error}`);
    });
  }

  console.log('\n✅ Done! All users can now log in with password: test1234');
  console.log('Next step: Run dummy_data.sql to create invoices and activity logs');
}

async function createProfile(userId, user) {
  try {
    // Map each user to their specific days ago value from the original SQL
    const daysAgoMap = {
      // Super Admins
      'superadmin1@test.com': 100,
      'superadmin2@test.com': 90,
      'superadmin3@test.com': 80,
      'superadmin4@test.com': 70,
      'superadmin5@test.com': 60,
      // Admins
      'admin1@test.com': 95,
      'admin2@test.com': 85,
      'admin3@test.com': 75,
      'admin4@test.com': 65,
      'admin5@test.com': 55,
      'admin6@test.com': 45,
      'admin7@test.com': 35,
      'admin8@test.com': 25,
      'admin9@test.com': 15,
      'admin10@test.com': 5,
      // Employees
      'employee1@test.com': 100,
      'employee2@test.com': 95,
      'employee3@test.com': 90,
      'employee4@test.com': 85,
      'employee5@test.com': 80,
      'employee6@test.com': 75,
      'employee7@test.com': 70,
      'employee8@test.com': 65,
      'employee9@test.com': 60,
      'employee10@test.com': 55,
      'employee11@test.com': 50,
      'employee12@test.com': 45,
      'employee13@test.com': 40,
      'employee14@test.com': 35,
      'employee15@test.com': 30,
      'employee16@test.com': 25,
      'employee17@test.com': 20,
      'employee18@test.com': 15,
      'employee19@test.com': 10,
      'employee20@test.com': 5,
      'employee21@test.com': 4,
      'employee22@test.com': 3,
      'employee23@test.com': 2,
      'employee24@test.com': 1,
      'employee25@test.com': 0,
      'employee26@test.com': 100,
      'employee27@test.com': 90,
      'employee28@test.com': 80,
      'employee29@test.com': 70,
      'employee30@test.com': 60,
      'employee31@test.com': 50,
      'employee32@test.com': 40,
      'employee33@test.com': 30,
      'employee34@test.com': 20,
      'employee35@test.com': 10,
    };
    
    const daysAgo = daysAgoMap[user.email] || 0;
    const created_at = new Date();
    created_at.setDate(created_at.getDate() - daysAgo);

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        created_at: created_at.toISOString(),
      });

    if (profileError) {
      // Check if profile already exists
      if (profileError.code === '23505') { // Unique violation
        return null; // Profile already exists, that's okay
      }
      return profileError.message;
    }
    return null; // Success
  } catch (error) {
    return error.message;
  }
}

// Run the script
createUsers().catch(console.error);

