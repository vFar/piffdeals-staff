/**
 * User Schema and Types
 * 
 * User roles hierarchy:
 * - employee: Basic access, cannot access User Accounts page
 * - admin: Full access, can create employees, can deactivate employees, cannot create admins
 * - super_admin: Full access, can create admins and employees, can manage all users
 * 
 * Firestore Collection: users
 * Document ID: userId (Firebase Auth UID)
 */

/**
 * User roles enum
 */
export const USER_ROLES = {
  EMPLOYEE: 'employee',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

/**
 * User status enum
 */
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
};

/**
 * User document schema in Firestore
 * @typedef {Object} UserDocument
 * @property {string} uid - Firebase Auth UID (document ID)
 * @property {string} email - User email address
 * @property {string} displayName - User's display name
 * @property {string} role - User role: 'employee' | 'admin' | 'super_admin'
 * @property {string} status - User status: 'active' | 'inactive' | 'suspended'
 * @property {string} createdAt - ISO timestamp when user was created
 * @property {string} updatedAt - ISO timestamp when user was last updated
 * @property {string} createdBy - UID of user who created this account (null for super_admin)
 * @property {string} lastLoginAt - ISO timestamp of last login (optional)
 * @property {string} avatar - URL to user avatar image (optional)
 */

/**
 * User profile with Firebase Auth user data
 * @typedef {Object} UserProfile
 * @property {string} uid - Firebase Auth UID
 * @property {string} email - User email
 * @property {string} displayName - User display name
 * @property {string} role - User role
 * @property {string} status - User status
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 * @property {string} createdBy - Creator UID
 * @property {string} lastLoginAt - Last login timestamp
 * @property {string} avatar - Avatar URL
 */

/**
 * Role permissions
 */
export const ROLE_PERMISSIONS = {
  [USER_ROLES.EMPLOYEE]: {
    canAccessDashboard: true,
    canAccessInvoices: true,
    canAccessSalesCharts: true,
    canAccessSettings: true,
    canAccessUserAccounts: false,
    canCreateUsers: false,
    canCreateEmployees: false,
    canCreateAdmins: false,
    canDeactivateUsers: false,
    canManageUsers: false,
  },
  [USER_ROLES.ADMIN]: {
    canAccessDashboard: true,
    canAccessInvoices: true,
    canAccessSalesCharts: true,
    canAccessSettings: true,
    canAccessUserAccounts: true,
    canCreateUsers: true,
    canCreateEmployees: true,
    canCreateAdmins: false,
    canDeactivateUsers: true,
    canManageUsers: true,
    // Admin can only manage employees, not other admins
    canManageEmployeesOnly: true,
  },
  [USER_ROLES.SUPER_ADMIN]: {
    canAccessDashboard: true,
    canAccessInvoices: true,
    canAccessSalesCharts: true,
    canAccessSettings: true,
    canAccessUserAccounts: true,
    canCreateUsers: true,
    canCreateEmployees: true,
    canCreateAdmins: true,
    canDeactivateUsers: true,
    canManageUsers: true,
    // Super admin can manage all users
    canManageAllUsers: true,
  },
};


