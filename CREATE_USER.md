# How to Create User Document in Firestore

## For User: amanda.pevko16@inbox.lv

### ⚡ Quick Method (Firebase Console)

**Step 1: Get the User's UID**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `piffdeals-staff-firebase`
3. Navigate to **Authentication** → **Users**
4. Find the user with email: `amanda.pevko16@inbox.lv`
5. Click on the user to view details
6. **Copy the UID** (it's a long string like: `abc123xyz456...`)

**Step 2: Create Firestore Document**
1. In Firebase Console, go to **Firestore Database**
2. If you don't have a `users` collection yet:
   - Click **"Start collection"**
   - Collection ID: `users`
   - Click **"Next"**
3. Click **"Add document"** (or click on `users` collection if it exists)
4. **Document ID**: Paste the UID you copied in Step 1
5. Add the following fields (click "Add field" for each):

   | Field Name | Type | Value |
   |------------|------|-------|
   | `email` | string | `amanda.pevko16@inbox.lv` |
   | `displayName` | string | `Amanda Pevko` (or preferred name) |
   | `role` | string | `employee` (or `admin` or `super_admin`) |
   | `status` | string | `active` |
   | `createdAt` | timestamp | Click "timestamp" → Select "now" |
   | `updatedAt` | timestamp | Click "timestamp" → Select "now" |
   | `createdBy` | string | `null` (or leave empty) |
   | `lastLoginAt` | string | `null` (or leave empty) |
   | `avatar` | string | `null` (or leave empty) |

6. Click **"Save"**

**Done!** The user can now log in with their proper role.

---

### 🔧 Alternative: Browser Console Method

If you're already logged in to the app:

1. **Get the UID**:
   - Open browser console (F12)
   - Type: `auth.currentUser.uid` (if you're logged in as that user)
   - OR get it from Firebase Console → Authentication

2. **Run the script**:
   - In browser console, type:
   ```javascript
   // For employee role:
   window.createUserDocumentWithUID('USER_UID_HERE', {
     email: 'amanda.pevko16@inbox.lv',
     displayName: 'Amanda Pevko',
     role: 'employee',
     status: 'active'
   });
   
   // OR use the helper function:
   window.createAmandaUser('USER_UID_HERE', 'employee');
   ```
   - Replace `USER_UID_HERE` with the actual UID

---

### 📋 Complete Field Reference

Here's the exact structure for the Firestore document:

```json
{
  "email": "amanda.pevko16@inbox.lv",
  "displayName": "Amanda Pevko",
  "role": "employee",
  "status": "active",
  "createdAt": [Firestore Timestamp - current time],
  "updatedAt": [Firestore Timestamp - current time],
  "createdBy": null,
  "lastLoginAt": null,
  "avatar": null
}
```

**Role Options:**
- `employee` - Basic access (cannot access User Accounts page)
- `admin` - Can create employees, manage employees, access User Accounts
- `super_admin` - Full access, can create admins and manage all users

**Status Options:**
- `active` - User can log in
- `inactive` - User cannot log in
- `suspended` - User cannot log in (future use)

### Option 1: Using Firebase Console (Recommended)

1. **Get the User's UID**:
   - Go to Firebase Console → Authentication
   - Find the user with email `amanda.pevko16@inbox.lv`
   - Copy their UID (it will look like: `abc123xyz...`)

2. **Create Firestore Document**:
   - Go to Firebase Console → Firestore Database
   - Click "Start collection" (if no collections exist) or select existing `users` collection
   - Click "Add document"
   - Set Document ID to the UID you copied
   - Add the following fields:

   ```
   email: "amanda.pevko16@inbox.lv"
   displayName: "Amanda Pevko" (or any name you prefer)
   role: "employee" (or "admin" or "super_admin")
   status: "active"
   createdAt: [Click "timestamp" and select current time]
   updatedAt: [Click "timestamp" and select current time]
   createdBy: null (or the UID of the admin who created this)
   lastLoginAt: null
   avatar: null
   ```

### Option 2: Using Browser Console Script

1. **Get the User's UID**:
   - Log in to your app with the account `amanda.pevko16@inbox.lv`
   - Open browser console (F12)
   - Type: `auth.currentUser.uid` and press Enter
   - Copy the UID

2. **Run the script**:
   - In the browser console, paste and run:

   ```javascript
   // Import the function (if using modules)
   // Or use the global function if available
   
   // For employee role:
   createUserByEmail('USER_UID_HERE', 'amanda.pevko16@inbox.lv', 'employee');
   
   // For admin role:
   createUserByEmail('USER_UID_HERE', 'amanda.pevko16@inbox.lv', 'admin');
   
   // For super_admin role:
   createUserByEmail('USER_UID_HERE', 'amanda.pevko16@inbox.lv', 'super_admin');
   ```

   Replace `USER_UID_HERE` with the actual UID you copied.

### Option 3: Using Node.js Script

Create a file `scripts/createUser.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createUser() {
  // Replace with actual UID
  const uid = 'USER_UID_HERE';
  
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    email: 'amanda.pevko16@inbox.lv',
    displayName: 'Amanda Pevko',
    role: 'employee', // or 'admin' or 'super_admin'
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: null,
    lastLoginAt: null,
    avatar: null,
  });
  
  console.log('User document created!');
}

createUser();
```

## Quick Steps for amanda.pevko16@inbox.lv

1. **Find UID in Firebase Console**:
   - Authentication → Users → Find `amanda.pevko16@inbox.lv` → Copy UID

2. **Create Document in Firestore**:
   - Firestore Database → `users` collection → Add document
   - Document ID: `[UID from step 1]`
   - Fields:
     - `email`: `amanda.pevko16@inbox.lv`
     - `displayName`: `Amanda Pevko` (or preferred name)
     - `role`: `employee` (or `admin` or `super_admin`)
     - `status`: `active`
     - `createdAt`: [timestamp - now]
     - `updatedAt`: [timestamp - now]
     - `createdBy`: `null`
     - `lastLoginAt`: `null`
     - `avatar`: `null`

3. **Save the document**

The user will now be able to log in with their proper role and access the dashboard!

