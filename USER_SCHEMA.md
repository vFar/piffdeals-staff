# User Schema Documentation

## Overview

This document describes the user schema and role-based access control (RBAC) system for the Piffdeals Staff application.

## User Roles

The system supports three user roles with hierarchical permissions:

### 1. Employee (`employee`)
- **Access**: Can access all pages except "User Accounts"
- **Permissions**:
  - ✅ Dashboard
  - ✅ Invoices
  - ✅ Sales Charts
  - ✅ Settings
  - ❌ User Accounts
  - ❌ Cannot create users
  - ❌ Cannot manage users

### 2. Admin (`admin`)
- **Access**: Can access all pages including "User Accounts"
- **Permissions**:
  - ✅ Dashboard
  - ✅ Invoices
  - ✅ Sales Charts
  - ✅ Settings
  - ✅ User Accounts
  - ✅ Can create users (employees only)
  - ✅ Can deactivate employee accounts
  - ✅ Can manage employees
  - ❌ Cannot create admins
  - ❌ Cannot manage other admins

### 3. Super Admin (`super_admin`)
- **Access**: Full access to all pages and features
- **Permissions**:
  - ✅ Dashboard
  - ✅ Invoices
  - ✅ Sales Charts
  - ✅ Settings
  - ✅ User Accounts
  - ✅ Can create users (employees, admins, and super admins)
  - ✅ Can deactivate any user account
  - ✅ Can manage all users

## Firestore Schema

### Collection: `users`

#### Document Structure
```javascript
{
  uid: string,                    // Firebase Auth UID (document ID)
  email: string,                  // User email address
  displayName: string,            // User's display name
  role: 'employee' | 'admin' | 'super_admin',  // User role
  status: 'active' | 'inactive' | 'suspended', // User status
  createdAt: Timestamp,           // Creation timestamp
  updatedAt: Timestamp,           // Last update timestamp
  createdBy: string | null,       // UID of user who created this account (null for super_admin)
  lastLoginAt: Timestamp | null,  // Last login timestamp (optional)
  avatar: string | null           // URL to user avatar image (optional)
}
```

## Setting Up the First Super Admin

### Option 1: Using Firebase Console

1. **Create Firebase Auth User**:
   - Go to Firebase Console → Authentication
   - Click "Add user"
   - Enter email and password
   - Note the UID

2. **Create Firestore Document**:
   - Go to Firebase Console → Firestore Database
   - Create a new collection called `users`
   - Create a document with the UID as the document ID
   - Add the following fields:
     ```json
     {
       "email": "admin@example.com",
       "displayName": "Super Admin",
       "role": "super_admin",
       "status": "active",
       "createdAt": [current timestamp],
       "updatedAt": [current timestamp],
       "createdBy": null,
       "lastLoginAt": null
     }
     ```

### Option 2: Using the Application (After First Super Admin is Created)

1. Log in as the super admin
2. Navigate to "User Accounts" page
3. Click "Create User"
4. Fill in the form:
   - Email
   - Password
   - Display Name
   - Role (select from available roles based on your permissions)

## Role Hierarchy and Permissions

### Permission Matrix

| Permission | Employee | Admin | Super Admin |
|------------|----------|-------|-------------|
| Access Dashboard | ✅ | ✅ | ✅ |
| Access Invoices | ✅ | ✅ | ✅ |
| Access Sales Charts | ✅ | ✅ | ✅ |
| Access Settings | ✅ | ✅ | ✅ |
| Access User Accounts | ❌ | ✅ | ✅ |
| Create Employees | ❌ | ✅ | ✅ |
| Create Admins | ❌ | ❌ | ✅ |
| Create Super Admins | ❌ | ❌ | ✅ |
| Deactivate Employees | ❌ | ✅ | ✅ |
| Deactivate Admins | ❌ | ❌ | ✅ |
| Deactivate Super Admins | ❌ | ❌ | ✅ |
| Manage Employees | ❌ | ✅ | ✅ |
| Manage Admins | ❌ | ❌ | ✅ |

## User Status

Users can have one of three statuses:

- **active**: User can log in and access the system
- **inactive**: User account is deactivated, cannot log in
- **suspended**: User account is suspended (future use)

## Security Rules (Firestore)

To secure the Firestore database, add these security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Allow read if user is authenticated
      allow read: if request.auth != null;
      
      // Allow write only if:
      // 1. User is creating their own document (first time setup)
      // 2. User is an admin/super_admin updating other users
      allow write: if request.auth != null && (
        request.auth.uid == userId || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin']
      );
      
      // Super admins can update any user
      // Admins can only update employees
      allow update: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin' ||
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' &&
         get(/databases/$(database)/documents/users/$(userId)).data.role == 'employee')
      );
    }
  }
}
```

## API Functions

### User Service Functions

Located in `src/services/userService.js`:

- `getUser(uid)` - Get user document by UID
- `createUserDocument(uid, userData)` - Create user document in Firestore
- `updateUserDocument(uid, updates)` - Update user document
- `getAllUsers()` - Get all users
- `getUsersByRole(role)` - Get users by role
- `createUser(email, password, displayName, role, createdBy)` - Create new user (Auth + Firestore)
- `deactivateUser(uid)` - Deactivate user account
- `activateUser(uid)` - Activate user account
- `updateUserRole(uid, role)` - Update user role
- `updateLastLogin(uid)` - Update last login timestamp

### RBAC Utility Functions

Located in `src/utils/rbac.js`:

- `hasPermission(userRole, permission)` - Check if user has permission
- `canAccessPage(userRole, page)` - Check if user can access page
- `canCreateRole(userRole, targetRole)` - Check if user can create role
- `canManageUser(userRole, targetUserRole)` - Check if user can manage user
- `getCreatableRoles(userRole)` - Get roles user can create
- `isValidRole(role)` - Validate role
- `getRoleDisplayName(role)` - Get role display name
- `isAdmin(userRole)` - Check if user is admin
- `isSuperAdmin(userRole)` - Check if user is super admin

## Usage Example

```javascript
import { useAuth } from '../contexts/AuthContext';
import { canAccessPage, canCreateRole } from '../utils/rbac';

function MyComponent() {
  const { userProfile } = useAuth();
  const userRole = userProfile?.role;

  // Check if user can access a page
  if (canAccessPage(userRole, 'userAccounts')) {
    // Show user accounts page
  }

  // Check if user can create a specific role
  if (canCreateRole(userRole, 'admin')) {
    // Show create admin button
  }
}
```

## Migration Guide

If you have existing users in Firebase Auth but no Firestore documents:

1. Create a migration script to sync Firebase Auth users to Firestore
2. Assign default role `employee` to existing users
3. Create the first super admin manually (see "Setting Up the First Super Admin")
4. Use the super admin to manage other users through the UI

## Notes

- User documents are created automatically when a new user is created through the User Accounts page
- Last login timestamp is updated automatically on each login
- Users cannot delete their own accounts (only deactivate)
- Super admins cannot be deactivated by admins (only by other super admins)


