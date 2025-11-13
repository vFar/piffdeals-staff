/**
 * Script to add user to Firestore
 * 
 * This script can be run from the browser console after logging in
 * 
 * Usage:
 * 1. Log in to the app
 * 2. Open browser console (F12)
 * 3. Import and run:
 *    import { addUserToFirestore } from './utils/addUserToFirestore';
 *    addUserToFirestore('amanda.pevko16@inbox.lv', 'employee');
 * 
 * OR use the global function:
 * window.addUserToFirestore('amanda.pevko16@inbox.lv', 'employee');
 */

import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { USER_ROLES, USER_STATUS } from '../types/user';

/**
 * Add user to Firestore by email
 * @param {string} email - User email
 * @param {string} role - User role (employee, admin, super_admin)
 * @param {string} displayName - Display name (optional)
 * @returns {Promise<void>}
 */
export const addUserToFirestore = async (email, role = USER_ROLES.EMPLOYEE, displayName = null) => {
  try {
    // Get current user to check if they're authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('You must be logged in to create user documents');
    }

    // Find user by email in Firebase Auth
    // Note: This requires admin SDK in production, but for now we'll use the current user's UID
    // In production, you'd use Firebase Admin SDK to get UID from email
    
    console.log('⚠️ Note: This function requires the user UID.');
    console.log('Please get the UID from Firebase Console → Authentication → Users');
    console.log('Then use: createUserDocument(uid, { email, role, ... })');
    
    return null;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

/**
 * Create user document with UID
 * @param {string} uid - Firebase Auth UID
 * @param {Object} userData - User data
 * @returns {Promise<void>}
 */
export const createUserDocumentWithUID = async (uid, userData) => {
  try {
    const {
      email,
      displayName = email?.split('@')[0] || 'User',
      role = USER_ROLES.EMPLOYEE,
      status = USER_STATUS.ACTIVE,
      createdBy = auth.currentUser?.uid || null,
    } = userData;

    // Validate role
    if (!Object.values(USER_ROLES).includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be one of: ${Object.values(USER_ROLES).join(', ')}`);
    }

    // Check if document already exists
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      console.warn(`⚠️ User document already exists for ${email} (${uid})`);
      console.log('Existing data:', userSnap.data());
      return { success: false, message: 'User document already exists', uid, email };
    }

    // Create the document
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

    console.log(`✅ User document created successfully!`);
    console.log(`   Email: ${email}`);
    console.log(`   UID: ${uid}`);
    console.log(`   Role: ${role}`);
    console.log(`   Status: ${status}`);
    
    return { success: true, uid, email, role, status };
  } catch (error) {
    console.error('❌ Error creating user document:', error);
    throw error;
  }
};

// Make functions available globally for browser console
if (typeof window !== 'undefined') {
  window.addUserToFirestore = addUserToFirestore;
  window.createUserDocumentWithUID = createUserDocumentWithUID;
  
  // Helper function specifically for amanda.pevko16@inbox.lv
  window.createAmandaUser = async (uid, role = 'employee') => {
    return createUserDocumentWithUID(uid, {
      email: 'amanda.pevko16@inbox.lv',
      displayName: 'Amanda Pevko',
      role: role,
      status: 'active',
    });
  };
}

