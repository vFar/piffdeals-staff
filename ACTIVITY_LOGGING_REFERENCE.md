# Activity Logging Reference Chart

## Overview

The Activity Logging system tracks all major actions performed by admins, super_admins, and employees in the Piffdeals Staff Portal. This provides a complete audit trail for security, compliance, and operational oversight.

**Key Features:**
- Only super_admins can view activity logs
- Logs are immutable (cannot be edited or deleted)
- Tracks user, action type, timestamp, IP address, and detailed information
- Organized by categories for easy filtering and analysis

**Access:**
- View logs: `/activity-logs` (super_admin only)
- Log actions: Use `activityLogService.js` functions

---

## Table of Contents

1. [User Management Actions](#user-management-actions)
2. [Invoice Management Actions](#invoice-management-actions)
3. [System Actions](#system-actions)
4. [Security Actions](#security-actions)
5. [Priority Levels](#priority-levels)
6. [When to Log vs When Not to Log](#when-to-log-vs-when-not-to-log)
7. [Code Examples](#code-examples)
8. [Best Practices](#best-practices)
9. [Implementation Checklist](#implementation-checklist)

---

## User Management Actions

Actions related to user account management, role changes, and status updates.

### Critical Priority

| Action Type | Description | When to Log | Details to Include |
|------------|-------------|-------------|-------------------|
| `user_created` | New user account created | Immediately after successful user creation | `{ email, username, role, status, created_by }` |
| `user_deleted` | User account deleted | Immediately after successful deletion | `{ deleted_user_email, deleted_user_username, deleted_user_role }` |
| `role_changed` | User role changed | When role is updated | `{ old_role, new_role, reason }` |
| `status_changed` | User status changed (active/inactive/suspended) | When status is updated | `{ old_status, new_status, reason }` |

### High Priority

| Action Type | Description | When to Log | Details to Include |
|------------|-------------|-------------|-------------------|
| `user_updated` | User profile updated (email, username, etc.) | When non-critical fields are updated | `{ changed_fields: ['email', 'username'], old_values, new_values }` |
| `bulk_user_action` | Bulk operation on multiple users | When bulk action completes | `{ action_type, affected_count, user_ids }` |

### Medium Priority

| Action Type | Description | When to Log | Details to Include |
|------------|-------------|-------------|-------------------|
| `password_changed` | User password changed | When password is reset/changed | `{ changed_by_admin: true/false }` |

**Implementation Notes:**
- Log user creation in `UserAccounts.jsx` after successful Edge Function call
- Log role/status changes in `UserAccounts.jsx` update handlers
- Log bulk actions after successful batch operations
- Always include target user ID in `targetId` parameter

---

## Invoice Management Actions

Actions related to invoice creation, updates, status changes, and payments.

### Critical Priority

| Action Type | Description | When to Log | Details to Include |
|------------|-------------|-------------|-------------------|
| `invoice_created` | New invoice created | After invoice is successfully saved | `{ invoice_number, customer_name, total, status }` |
| `invoice_deleted` | Invoice deleted | When draft invoice is deleted | `{ invoice_number, customer_name, total }` |
| `invoice_sent` | Invoice sent to customer | When email is successfully sent | `{ invoice_number, customer_email, sent_method }` |
| `invoice_paid` | Invoice marked as paid | When status changes to 'paid' | `{ invoice_number, payment_method, payment_date, total }` |

### High Priority

| Action Type | Description | When to Log | Details to Include |
|------------|-------------|-------------|-------------------|
| `invoice_status_changed` | Invoice status changed | When status changes (draft→sent, sent→paid, etc.) | `{ invoice_number, old_status, new_status }` |
| `invoice_updated` | Invoice details updated | When draft invoice is modified | `{ invoice_number, changed_fields, old_values, new_values }` |

**Implementation Notes:**
- Log invoice creation in `CreateInvoice.jsx` after successful save
- Log invoice sending in email sending function/edge function
- Log status changes in status update handlers
- Always include invoice ID in `targetId` parameter
- For status changes, include both old and new status in details

---

## System Actions

General system-level actions and user session management.

### High Priority

| Action Type | Description | When to Log | Details to Include |
|------------|-------------|-------------|-------------------|
| `login` | User logged in | After successful authentication | `{ login_method, ip_address }` |
| `logout` | User logged out | When user explicitly logs out | `{ session_duration }` |

### Medium Priority

| Action Type | Description | When to Log | Details to Include |
|------------|-------------|-------------|-------------------|
| `system_config_changed` | System configuration changed | When admin changes system settings | `{ config_key, old_value, new_value }` |

**Implementation Notes:**
- Log login in `AuthContext.jsx` after successful sign-in
- Log logout in `DashboardLayout.jsx` logout handler
- System config changes are for future use (when settings page is added)

---

## Security Actions

Security-related events and suspicious activities.

### Critical Priority

| Action Type | Description | When to Log | Details to Include |
|------------|-------------|-------------|-------------------|
| `unauthorized_access_attempt` | Attempted access to restricted resource | When user tries to access resource without permission | `{ attempted_resource, user_role, reason }` |
| `suspicious_activity` | Detected suspicious behavior | When unusual patterns are detected | `{ activity_type, description, risk_level }` |

**Implementation Notes:**
- Log unauthorized access in `RoleRoute.jsx` when access is denied
- Log suspicious activity in security monitoring functions
- These are for future security enhancements

---

## Priority Levels

### Critical
**Must be logged immediately.** These actions have significant security, financial, or operational impact.
- User creation/deletion
- Role changes
- Status changes (especially to 'suspended')
- Invoice creation/deletion
- Invoice payment
- Unauthorized access attempts

### High
**Should be logged.** Important for audit trail and operational oversight.
- User profile updates
- Bulk user actions
- Invoice status changes
- Invoice updates
- Login/logout events

### Medium
**Good to log.** Useful for comprehensive audit trail.
- Password changes
- System configuration changes

### Low
**Optional.** May be logged for completeness but not required.
- Profile view actions
- Search queries
- Filter changes

---

## When to Log vs When Not to Log

### ✅ DO Log:

1. **All write operations** (create, update, delete)
2. **Permission changes** (role, status)
3. **Financial transactions** (invoice creation, payment)
4. **Security events** (unauthorized access, suspicious activity)
5. **Bulk operations** (affecting multiple records)
6. **Status transitions** (especially critical ones like draft→sent, sent→paid)
7. **Admin actions** (all actions by admin/super_admin should be logged)

### ❌ DON'T Log:

1. **Read operations** (viewing invoices, viewing users)
2. **UI interactions** (opening modals, changing filters)
3. **Search queries** (unless security-related)
4. **Navigation** (page changes, route changes)
5. **Failed operations** (unless security-related - use security category)
6. **Routine operations** (auto-save, auto-refresh)
7. **Client-side only actions** (local state changes)

### ⚠️ Special Cases:

- **Failed operations**: Only log if security-related (unauthorized access attempt)
- **Auto-actions**: Log system-initiated actions (e.g., auto-delete drafts) but not routine background tasks
- **Bulk operations**: Always log with count of affected records

---

## Code Examples

### User Management

#### Log User Creation
```javascript
import { logUserAction, ActionTypes } from '../services/activityLogService';

// After successful user creation
await logUserAction(
  ActionTypes.USER_CREATED,
  `Created new user account: ${username} (${email})`,
  {
    email: userData.email,
    username: userData.username,
    role: userData.role,
    status: userData.status,
    created_by: currentUser.id
  },
  newUserId
);
```

#### Log Role Change
```javascript
import { logUserAction, ActionTypes } from '../services/activityLogService';

// When role is updated
await logUserAction(
  ActionTypes.ROLE_CHANGED,
  `Changed role for ${username} from ${oldRole} to ${newRole}`,
  {
    old_role: oldRole,
    new_role: newRole,
    reason: 'Admin update'
  },
  targetUserId
);
```

#### Log Status Change
```javascript
import { logUserAction, ActionTypes } from '../services/activityLogService';

// When status is updated (especially to 'suspended')
await logUserAction(
  ActionTypes.STATUS_CHANGED,
  `Changed status for ${username} from ${oldStatus} to ${newStatus}`,
  {
    old_status: oldStatus,
    new_status: newStatus,
    reason: 'Account suspension'
  },
  targetUserId
);
```

#### Log Bulk User Action
```javascript
import { logUserAction, ActionTypes } from '../services/activityLogService';

// After bulk role change
await logUserAction(
  ActionTypes.BULK_USER_ACTION,
  `Bulk role change: ${selectedCount} users changed to ${newRole}`,
  {
    action_type: 'bulk_role_change',
    affected_count: selectedCount,
    new_role: newRole,
    user_ids: selectedUserIds
  },
  null // No single target for bulk operations
);
```

### Invoice Management

#### Log Invoice Creation
```javascript
import { logInvoiceAction, ActionTypes } from '../services/activityLogService';

// After successful invoice creation
await logInvoiceAction(
  ActionTypes.INVOICE_CREATED,
  `Created invoice ${invoiceNumber} for ${customerName} (€${total})`,
  {
    invoice_number: invoiceNumber,
    customer_name: customerName,
    customer_email: customerEmail,
    total: total,
    status: 'draft',
    item_count: items.length
  },
  invoiceId
);
```

#### Log Invoice Status Change
```javascript
import { logInvoiceAction, ActionTypes } from '../services/activityLogService';

// When invoice status changes
await logInvoiceAction(
  ActionTypes.INVOICE_STATUS_CHANGED,
  `Invoice ${invoiceNumber} status changed from ${oldStatus} to ${newStatus}`,
  {
    invoice_number: invoiceNumber,
    old_status: oldStatus,
    new_status: newStatus,
    customer_name: customerName
  },
  invoiceId
);
```

#### Log Invoice Sent
```javascript
import { logInvoiceAction, ActionTypes } from '../services/activityLogService';

// After email is successfully sent
await logInvoiceAction(
  ActionTypes.INVOICE_SENT,
  `Sent invoice ${invoiceNumber} to ${customerEmail}`,
  {
    invoice_number: invoiceNumber,
    customer_email: customerEmail,
    sent_method: 'email',
    total: total
  },
  invoiceId
);
```

#### Log Invoice Paid
```javascript
import { logInvoiceAction, ActionTypes } from '../services/activityLogService';

// When invoice is marked as paid
await logInvoiceAction(
  ActionTypes.INVOICE_PAID,
  `Invoice ${invoiceNumber} marked as paid (€${total})`,
  {
    invoice_number: invoiceNumber,
    payment_method: paymentMethod,
    payment_date: paidDate,
    total: total
  },
  invoiceId
);
```

### System Actions

#### Log Login
```javascript
import { logActivity, ActionTypes, ActionCategories } from '../services/activityLogService';

// After successful login
await logActivity({
  actionType: ActionTypes.LOGIN,
  actionCategory: ActionCategories.SYSTEM,
  description: `User logged in: ${userEmail}`,
  details: {
    login_method: 'email',
    ip_address: ipAddress
  },
  targetType: 'user',
  targetId: userId
});
```

#### Log Logout
```javascript
import { logActivity, ActionTypes, ActionCategories } from '../services/activityLogService';

// When user logs out
await logActivity({
  actionType: ActionTypes.LOGOUT,
  actionCategory: ActionCategories.SYSTEM,
  description: `User logged out: ${userEmail}`,
  details: {
    session_duration: sessionDuration
  },
  targetType: 'user',
  targetId: userId
});
```

### Security Actions

#### Log Unauthorized Access Attempt
```javascript
import { logSecurityAction, ActionTypes } from '../services/activityLogService';

// When access is denied
await logSecurityAction(
  ActionTypes.UNAUTHORIZED_ACCESS_ATTEMPT,
  `Unauthorized access attempt: ${userRole} tried to access ${resourcePath}`,
  {
    attempted_resource: resourcePath,
    user_role: userRole,
    reason: 'Insufficient permissions',
    ip_address: ipAddress
  }
);
```

---

## Best Practices

### 1. Description Format
- Use clear, human-readable descriptions
- Include relevant identifiers (invoice number, username, email)
- Format: `"Action performed: [Entity] [Identifier] - [Details]"`
- Examples:
  - ✅ `"Created new user account: John Doe (john@example.com)"`
  - ✅ `"Invoice INV-001 status changed from draft to sent"`
  - ❌ `"User created"` (too vague)
  - ❌ `"Updated"` (not descriptive)

### 2. Details Structure
- Always include relevant context in `details` object
- Use consistent field names (e.g., `old_value`/`new_value`, `old_status`/`new_status`)
- Include identifiers (invoice_number, email, username)
- For bulk operations, include count and list of affected IDs

### 3. Error Handling
- Activity logging should **never break** the main operation
- Use try-catch blocks around logging calls
- Log errors to console but don't throw
- Example:
```javascript
try {
  await logUserAction(...);
} catch (error) {
  console.error('Failed to log activity:', error);
  // Continue with main operation
}
```

### 4. Performance
- Log asynchronously (don't await if not critical)
- Use fire-and-forget for non-critical logs
- Batch log entries when possible (for bulk operations)

### 5. Privacy & Security
- Don't log sensitive data (passwords, payment details)
- Log user actions, not user data
- Include IP addresses for security events
- Store user info at time of action (for historical reference)

### 6. Consistency
- Use predefined action types from `ActionTypes` enum
- Use helper functions (`logUserAction`, `logInvoiceAction`) when available
- Follow the same pattern across similar actions

---

## Implementation Checklist

### User Management
- [ ] Log user creation in `UserAccounts.jsx` → `handleCreateUser`
- [ ] Log user update in `UserAccounts.jsx` → `performUserUpdate`
- [ ] Log role change (when role field changes)
- [ ] Log status change (when status field changes, especially to 'suspended')
- [ ] Log user deletion in `UserAccounts.jsx` → `handleBulkDelete`
- [ ] Log bulk role change in `UserAccounts.jsx` → `handleBulkRoleChange`
- [ ] Log password changes (if password reset functionality exists)

### Invoice Management
- [ ] Log invoice creation in `CreateInvoice.jsx` → after successful save
- [ ] Log invoice update in `CreateInvoice.jsx` → when draft is modified
- [ ] Log invoice deletion (when draft is deleted)
- [ ] Log invoice sent in email sending function/edge function
- [ ] Log invoice status change (draft→sent, sent→paid, etc.)
- [ ] Log invoice paid (when marked as paid)

### System Actions
- [ ] Log login in `AuthContext.jsx` → `signIn` function
- [ ] Log logout in `DashboardLayout.jsx` → `handleUserMenuClick` logout handler
- [ ] Log system config changes (when settings page is implemented)

### Security Actions
- [ ] Log unauthorized access in `RoleRoute.jsx` → when access denied
- [ ] Log suspicious activity (when security monitoring is implemented)

### General
- [ ] Import `activityLogService` in all relevant files
- [ ] Add error handling (try-catch) around all logging calls
- [ ] Test logging doesn't break main operations
- [ ] Verify logs appear in Activity Logs page
- [ ] Review log descriptions for clarity and consistency

---

## Additional Recommended Actions

These actions are not yet implemented but should be logged when the features are added:

### User Management
- `profile_updated` - User updates their own profile
- `email_changed` - User email address changed
- `two_factor_enabled` - Two-factor authentication enabled/disabled

### Invoice Management
- `invoice_duplicated` - Invoice duplicated/cloned
- `invoice_exported` - Invoice exported to PDF/Excel
- `invoice_reminder_sent` - Payment reminder email sent
- `invoice_cancelled` - Invoice cancelled

### System
- `settings_updated` - User settings changed
- `notification_preferences_changed` - Notification settings updated
- `data_exported` - User exported their data

### Security
- `password_reset_requested` - Password reset requested
- `password_reset_completed` - Password reset completed
- `account_locked` - Account locked due to failed login attempts
- `session_expired` - Session expired

---

## Summary

This reference chart provides a comprehensive guide for implementing activity logging throughout the Piffdeals Staff Portal. Follow the priority levels, use the code examples, and implement logging consistently across all major actions to maintain a complete audit trail.

**Remember:**
- Log all write operations
- Use clear, descriptive messages
- Include relevant context in details
- Never let logging break main operations
- Test thoroughly before deploying

For questions or updates to this reference, contact the development team.

