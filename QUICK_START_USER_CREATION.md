# Quick Start: User Creation Setup

## 🎯 Goal
Enable the "Create User" functionality so new users appear in both:
- ✅ Supabase Auth (can login)
- ✅ Application table (appears in user list)

---

## ⚡ Option 1: Automated Deployment (RECOMMENDED)

### Windows PowerShell
```powershell
.\deploy-edge-function.ps1
```

### Mac/Linux
```bash
chmod +x deploy-edge-function.sh
./deploy-edge-function.sh
```

The script will guide you through:
1. Installing/checking Supabase CLI
2. Logging into Supabase
3. Linking your project
4. Setting the service role key
5. Deploying the function

**That's it!** After the script completes, user creation will work.

---

## 📝 Option 2: Manual Deployment

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login
```bash
supabase login
```

### 3. Link Project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```
*(Get project ref from Supabase Dashboard > Settings > General)*

### 4. Set Service Role Key
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
*(Get service_role key from Supabase Dashboard > Settings > API)*

### 5. Deploy Function
```bash
supabase functions deploy create-user
```

---

## 🧪 Testing

After deployment:

1. Go to your application at http://localhost:5173/user-accounts
2. Click "Pievienot jaunu lietotāju" (Add New User)
3. Fill in the form:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
   - Role: Darbinieks (Employee)
   - Status: Aktīvs (Active)
4. Click "Izveidot lietotāju" (Create User)

**Expected Result:**
- ✅ Success message appears
- ✅ New user appears in the table
- ✅ User can login with email and password
- ✅ User appears in Supabase Dashboard > Authentication > Users

---

## 🔍 Troubleshooting

### Still getting CORS error?
```bash
# Check if function is deployed
supabase functions list

# Redeploy if needed
supabase functions deploy create-user
```

### Check function logs
```bash
supabase functions logs create-user --follow
```

### Service role key not set?
```bash
# List secrets
supabase secrets list

# Set again if missing
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
```

---

## 🔐 What Gets Created

When you create a user, the Edge Function:

1. **Creates Auth User** in Supabase Authentication
   - Email: ✅
   - Password: ✅ (hashed securely)
   - Email confirmed: ✅ (auto-confirmed)
   - User metadata: username

2. **Creates Profile** in `user_profiles` table
   - ID: (same as auth user ID)
   - Email: ✅
   - Username: ✅
   - Role: ✅ (employee/admin/super_admin)
   - Status: ✅ (active/inactive/suspended)
   - Created at: ✅ (timestamp)

3. **User can immediately:**
   - Login with email and password
   - Access the application based on their role
   - Appear in the user management table

---

## 🚨 Security Notes

**Service Role Key:**
- ⚠️ NEVER commit to git
- ⚠️ NEVER expose in frontend code
- ✅ Only stored securely in Supabase Edge Function environment
- ✅ Gives admin-level access to bypass Row Level Security (RLS)

**Why we need it:**
- Normal users can't create auth users (security restriction)
- Service role key allows Edge Function to act as admin
- Edge Function runs on Supabase servers (secure environment)
- Your frontend never sees the service role key

---

## 📚 Additional Resources

- **Full Setup Guide:** See `EDGE_FUNCTION_SETUP.md`
- **Supabase Edge Functions Docs:** https://supabase.com/docs/guides/functions
- **Supabase CLI Docs:** https://supabase.com/docs/reference/cli

---

## ❓ Need Help?

If you encounter issues:

1. Check the function logs: `supabase functions logs create-user`
2. Verify secrets are set: `supabase secrets list`
3. Ensure project is linked: `supabase projects list`
4. Try redeploying: `supabase functions deploy create-user`

---

## 🎉 Success Checklist

After deployment, you should be able to:
- ✅ Click "Add New User" button
- ✅ Fill out the form without errors
- ✅ See success message after submission
- ✅ New user appears in the table immediately
- ✅ New user can login with their credentials
- ✅ New user appears in Supabase Auth dashboard

If all these work - **you're done!** 🚀










