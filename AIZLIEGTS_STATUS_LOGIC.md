# Aizliegts (Suspended) Status Logic - Implementation

## Overview
This document explains the implementation of the "Aizliegts" (suspended/banned) status logic in the user management system.

## Status Values
- **`active`** = Aktīvs (Active)
- **`inactive`** = Neaktīvs (Inactive)
- **`suspended`** = Aizliegts (Banned/Forbidden)

---

## Business Rules Implemented

### 1. **Admins CAN change status TO "aizliegts"**
✅ Both admins and super_admins can suspend users by setting status to "suspended"

**Location:** `src/pages/UserAccounts.jsx` - Edit user modal shows all status options

### 2. **Once "aizliegts", ONLY super_admin can change status**
✅ If a user has status "suspended", only super_admin can change it to another status

**Implementation:** `handleEditUser()` function
```javascript
// Only super_admin can change status FROM "suspended"
if (editingUser.status === 'suspended' && values.status !== 'suspended' && !isSuperAdmin) {
  message.error('Tikai galvenais administrators var mainīt aizliegtu lietotāju statusu');
  return;
}
```

### 3. **Admins CANNOT edit users with "aizliegts" status**
✅ The edit button is hidden for suspended users if logged in as admin (not super_admin)

**Implementation:** `canEditUser()` function
```javascript
// Admins cannot edit users with "aizliegts" (suspended) status
// Only super_admin can edit suspended users
if (targetUser.status === 'suspended' && !isSuperAdmin) {
  return false;
}
```

### 4. **Confirmation popup when changing status to "aizliegts"**
✅ Modal confirmation appears when changing status to "suspended"

**Features:**
- Shows warning message
- Explains user will not be able to log in
- For admins: warns that only super_admin can unsuspend
- Requires explicit confirmation with danger button
- Works for both individual and bulk status changes

**Implementation:**
- Individual edit: `handleEditUser()` → shows `Modal.confirm()`
- Bulk change: `handleBulkStatusChange()` → shows `Modal.confirm()`

---

## Technical Implementation Details

### File: `src/pages/UserAccounts.jsx`

#### 1. **canEditUser() Function** (Lines 281-310)
Prevents admins from editing suspended users:
```javascript
if (targetUser.status === 'suspended' && !isSuperAdmin) {
  return false;
}
```

#### 2. **handleEditUser() Function** (Lines 294-365)
Validation and confirmation logic:
- Checks if admin is trying to change FROM suspended status
- Shows confirmation modal when changing TO suspended status
- Delegates actual update to `performUserUpdate()`

#### 3. **performUserUpdate() Function** (Lines 367-392)
Performs the actual database update after validation/confirmation

#### 4. **handleBulkStatusChange() Function** (Lines 228-257)
Handles bulk status changes with confirmation:
- Shows confirmation modal when changing to suspended
- Delegates actual update to `performBulkStatusUpdate()`

#### 5. **performBulkStatusUpdate() Function** (Lines 259-279)
Performs the actual bulk database update

#### 6. **Row Selection Config** (Lines 394-411)
Prevents admins from selecting suspended users for bulk operations:
```javascript
(isAdmin && !isSuperAdmin && record.status === 'suspended')
```

#### 7. **Bulk Actions UI** (Lines 672-759)
Added "Mainīt statusu" (Change Status) dropdown with options:
- Aktīvs (Active)
- Neaktīvs (Inactive)
- Aizliegts (Suspended) - shown in red with danger flag

---

## User Experience Flow

### **Scenario A: Admin Suspends a User**

1. Admin opens edit modal for an active user
2. Changes status dropdown to "Aizliegts"
3. Clicks "Saglabāt izmaiņas" (Save Changes)
4. **Confirmation modal appears:**
   - Title: "Vai tiešām vēlaties bloķēt šo lietotāju?"
   - Content: "Lietotājs 'Name' vairs nevarēs pieslēgties sistēmai. Tikai galvenais administrators varēs atbloķēt šo kontu."
   - Buttons: "Jā, bloķēt" (danger) | "Atcelt"
5. Admin confirms → user is suspended
6. Success message: "Lietotāja dati veiksmīgi atjaunināti"

### **Scenario B: Admin Tries to Edit Suspended User**

1. Admin sees user with "Aizliegts" status in table
2. **Edit button is hidden/disabled** for that user
3. **Checkbox is disabled** for bulk selection
4. Admin cannot perform any actions on that user

### **Scenario C: Admin Tries to Unsuspend (via database manipulation)**

1. If somehow admin tries to change status from "suspended"
2. Validation blocks it with error:
   - "Tikai galvenais administrators var mainīt aizliegtu lietotāju statusu"
3. Status remains "suspended"

### **Scenario D: Super Admin Unsuspends a User**

1. Super admin opens edit modal for suspended user ✅ (allowed)
2. Changes status to "Aktīvs" or "Neaktīvs"
3. Clicks save
4. **No confirmation needed** (unsuspending doesn't need confirmation)
5. User is unsuspended successfully
6. User can now log in again

### **Scenario E: Bulk Status Change to Aizliegts**

1. Admin/Super admin selects multiple users (3 users)
2. Clicks "Mainīt statusu" dropdown
3. Selects "Aizliegts" (shown in red)
4. **Confirmation modal appears:**
   - Title: "Vai tiešām vēlaties bloķēt izvēlētos lietotājus?"
   - Content: "3 lietotāji vairs nevarēs pieslēgties sistēmai..."
   - Buttons: "Jā, bloķēt" (danger) | "Atcelt"
5. Confirms → all 3 users suspended
6. Success message: "3 lietotāju statusi veiksmīgi mainīti"

---

## Login Behavior (Already Implemented)

**File:** `src/pages/Login.jsx` (Lines 69-75)

When a suspended user tries to log in:
```javascript
if (profileData.status === 'suspended') {
  errorMessage = 'Konts bloķēts';
  message.error(errorMessage);
  return;
}
```

Result: Login is blocked with message "Konts bloķēts" (Account Blocked)

---

## Security Considerations

### ✅ **What's Protected:**
1. Suspended users cannot log in
2. Admins cannot edit suspended users
3. Admins cannot unsuspend users
4. Admins cannot select suspended users for bulk operations
5. Confirmation required before suspending

### ⚠️ **Potential Issues:**

#### **Issue 1: Admin Suspends Super Admin**
If admin suspends a super_admin account:
- Admin CAN suspend (because super_admin is not suspended yet)
- Super_admin will be locked out
- Only ANOTHER super_admin can unsuspend them

**Mitigation:** Admin cannot edit super_admin accounts anyway (existing logic prevents this)

#### **Issue 2: Super Admin Suspends Themselves**
Currently NOT prevented - super_admin could accidentally suspend themselves.

**Recommendation:** Add validation to prevent self-suspension:
```javascript
if (editingUser.id === userProfile.id && values.status === 'suspended') {
  message.error('Jūs nevarat bloķēt savu pašu kontu!');
  return;
}
```

#### **Issue 3: All Super Admins Suspended**
If all super_admins get suspended:
- No one can unsuspend them
- Requires direct database access to fix

**Recommendation:** Add check to prevent suspending last active super_admin

---

## Testing Checklist

### As Admin:
- ✅ Can suspend active employee → shows confirmation
- ✅ Can suspend inactive employee → shows confirmation
- ✅ Cannot see edit button for suspended users
- ✅ Cannot select suspended users for bulk operations
- ✅ Cannot unsuspend via edit (should show error if tried)
- ✅ Bulk suspend shows confirmation

### As Super Admin:
- ✅ Can suspend any user (employees, admins)
- ✅ Can edit suspended users
- ✅ Can unsuspend users (change from suspended to active/inactive)
- ✅ Can select suspended users for bulk operations
- ✅ Suspension confirmation shows (without "only super_admin" message)

### As Suspended User:
- ✅ Cannot log in
- ✅ See "Konts bloķēts" error message

---

## Summary

The implementation follows the business rules exactly:

| Action | Admin | Super Admin |
|--------|-------|-------------|
| Suspend active user | ✅ Yes (with confirmation) | ✅ Yes (with confirmation) |
| Edit suspended user | ❌ No | ✅ Yes |
| Unsuspend user | ❌ No | ✅ Yes |
| Select suspended user (bulk) | ❌ No | ✅ Yes |
| See edit button for suspended | ❌ No | ✅ Yes |

**Result:** Once a user is "aizliegts", only super_admin has control over them.

