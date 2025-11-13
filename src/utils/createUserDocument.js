/**
 * Utility function to create a user document in Firestore
 * This can be run from the browser console or used programmatically
 * 
 * Usage in browser console:
 * import { createUserDocument } from './utils/createUserDocument';
 * createUserDocument('user-uid-here', { email: 'user@example.com', role: 'employee' });
 */

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { USER_ROLES, USER_STATUS } from '../types/user';

/**
 * Create a user document in Firestore
 * @param {string} uid - Firebase Auth UID
 * @param {Object} userData - User data
 * @param {string} userData.email - User email
 * @param {string} userData.displayName - User display name (optional)
 * @param {string} userData.role - User role: 'employee' | 'admin' | 'super_admin'
 * @param {string} userData.status - User status: 'active' | 'inactive' | 'suspended' (default: 'active')
 * @param {string} userData.createdBy - UID of user who created this account (optional)
 * @returns {Promise<void>}
 */
export const createUserDocument = async (uid, userData) => {
  try {
    const {
      email,
      displayName = '',
      role = USER_ROLES.EMPLOYEE,
      status = USER_STATUS.ACTIVE,
      createdBy = null,
    } = userData;

    // Validate role
    if (!Object.values(USER_ROLES).includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be one of: ${Object.values(USER_ROLES).join(', ')}`);
    }

    // Validate status
    if (!Object.values(USER_STATUS).includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${Object.values(USER_STATUS).join(', ')}`);
    }

    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      email,
      displayName,
      role,
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy,
      lastLoginAt: null,
      avatar: null,
    });

    console.log(`✅ User document created successfully for ${email} (${uid})`);
    return { success: true, uid, email };
  } catch (error) {
    console.error('❌ Error creating user document:', error);
    throw error;
  }
};

/**
 * Helper function to create user document from email
 * First, you need to get the user's UID from Firebase Auth
 * 
 * Usage:
 * 1. Get the user's UID from Firebase Console → Authentication
 * 2. Run: createUserByEmail('user-uid', 'user@example.com', 'employee')
 */
export const createUserByEmail = async (uid, email, role = USER_ROLES.EMPLOYEE) => {
  return createUserDocument(uid, {
    email,
    displayName: email.split('@')[0], // Use email prefix as display name
    role,
    status: USER_STATUS.ACTIVE,
  });
};

// Make it available globally for browser console usage
if (typeof window !== 'undefined') {
  window.createUserDocument = createUserDocument;
  window.createUserByEmail = createUserByEmail;
}

