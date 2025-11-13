import { USER_ROLES, ROLE_PERMISSIONS } from '../types/user';

/**
 * Check if user has a specific permission
 * @param {string} userRole - User's role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export const hasPermission = (userRole, permission) => {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) {
    return false;
  }
  return ROLE_PERMISSIONS[userRole][permission] === true;
};

/**
 * Check if user can access a specific page
 * @param {string} userRole - User's role
 * @param {string} page - Page name (e.g., 'userAccounts')
 * @returns {boolean}
 */
export const canAccessPage = (userRole, page) => {
  const pagePermissions = {
    dashboard: 'canAccessDashboard',
    invoices: 'canAccessInvoices',
    salesCharts: 'canAccessSalesCharts',
    settings: 'canAccessSettings',
    userAccounts: 'canAccessUserAccounts',
  };

  const permission = pagePermissions[page];
  if (!permission) {
    return false;
  }

  return hasPermission(userRole, permission);
};

/**
 * Check if user can create a user with a specific role
 * @param {string} userRole - Current user's role
 * @param {string} targetRole - Role of user to be created
 * @returns {boolean}
 */
export const canCreateRole = (userRole, targetRole) => {
  if (userRole === USER_ROLES.SUPER_ADMIN) {
    // Super admin can create any role
    return true;
  }

  if (userRole === USER_ROLES.ADMIN) {
    // Admin can only create employees
    return targetRole === USER_ROLES.EMPLOYEE;
  }

  // Employee cannot create any users
  return false;
};

/**
 * Check if user can manage (edit/deactivate) another user
 * @param {string} userRole - Current user's role
 * @param {string} targetUserRole - Role of user to be managed
 * @returns {boolean}
 */
export const canManageUser = (userRole, targetUserRole) => {
  if (userRole === USER_ROLES.SUPER_ADMIN) {
    // Super admin can manage all users
    return true;
  }

  if (userRole === USER_ROLES.ADMIN) {
    // Admin can only manage employees
    return targetUserRole === USER_ROLES.EMPLOYEE;
  }

  // Employee cannot manage any users
  return false;
};

/**
 * Get all roles that a user can create
 * @param {string} userRole - Current user's role
 * @returns {string[]} Array of roles that can be created
 */
export const getCreatableRoles = (userRole) => {
  if (userRole === USER_ROLES.SUPER_ADMIN) {
    return [USER_ROLES.EMPLOYEE, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN];
  }

  if (userRole === USER_ROLES.ADMIN) {
    return [USER_ROLES.EMPLOYEE];
  }

  return [];
};

/**
 * Check if user role is valid
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
export const isValidRole = (role) => {
  return Object.values(USER_ROLES).includes(role);
};

/**
 * Get role display name
 * @param {string} role - User role
 * @returns {string} Display name for the role
 */
export const getRoleDisplayName = (role) => {
  const displayNames = {
    [USER_ROLES.EMPLOYEE]: 'Employee',
    [USER_ROLES.ADMIN]: 'Admin',
    [USER_ROLES.SUPER_ADMIN]: 'Super Admin',
  };

  return displayNames[role] || role;
};

/**
 * Check if user is admin or super admin
 * @param {string} userRole - User's role
 * @returns {boolean}
 */
export const isAdmin = (userRole) => {
  return userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.SUPER_ADMIN;
};

/**
 * Check if user is super admin
 * @param {string} userRole - User's role
 * @returns {boolean}
 */
export const isSuperAdmin = (userRole) => {
  return userRole === USER_ROLES.SUPER_ADMIN;
};


