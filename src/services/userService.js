import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { USER_STATUS } from '../types/user';

/**
 * Get user document from Firestore
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} User document or null
 */
export const getUser = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return {
        uid: userSnap.id,
        ...userSnap.data(),
      };
    }
    
    return null;
  } catch (error) {
    // Check if it's a network/offline error
    if (error.code === 'unavailable' || 
        error.message?.includes('offline') || 
        error.message?.includes('Failed to get document') ||
        error.message?.includes('network') ||
        error.code === 'failed-precondition') {
      console.warn('Firestore is unavailable (might be blocked or offline):', error.message);
      // Return null to indicate user document doesn't exist or can't be fetched
      // This will trigger the temporary profile creation in AuthContext
      return null;
    }
    console.error('Error getting user:', error);
    throw error;
  }
};

/**
 * Create user document in Firestore
 * @param {string} uid - User ID
 * @param {Object} userData - User data
 * @returns {Promise<void>}
 */
export const createUserDocument = async (uid, userData) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
};

/**
 * Update user document in Firestore
 * @param {string} uid - User ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<void>}
 */
export const updateUserDocument = async (uid, updates) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user document:', error);
    throw error;
  }
};

/**
 * Get all users
 * @returns {Promise<Array>} Array of user documents
 */
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    const users = [];
    usersSnap.forEach((doc) => {
      users.push({
        uid: doc.id,
        ...doc.data(),
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

/**
 * Get users by role
 * @param {string} role - User role
 * @returns {Promise<Array>} Array of user documents
 */
export const getUsersByRole = async (role) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', role));
    const usersSnap = await getDocs(q);
    
    const users = [];
    usersSnap.forEach((doc) => {
      users.push({
        uid: doc.id,
        ...doc.data(),
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting users by role:', error);
    throw error;
  }
};

/**
 * Create a new user (Firebase Auth + Firestore)
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User display name
 * @param {string} role - User role
 * @param {string} createdBy - UID of user creating this account
 * @returns {Promise<Object>} Created user data
 */
export const createUser = async (email, password, displayName, role, createdBy) => {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name in Firebase Auth
    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Create user document in Firestore
    await createUserDocument(user.uid, {
      email,
      displayName: displayName || '',
      role,
      status: USER_STATUS.ACTIVE,
      createdBy,
      lastLoginAt: null,
    });

    // Return user data
    return await getUser(user.uid);
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Deactivate user account
 * @param {string} uid - User ID
 * @returns {Promise<void>}
 */
export const deactivateUser = async (uid) => {
  try {
    await updateUserDocument(uid, {
      status: USER_STATUS.INACTIVE,
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    throw error;
  }
};

/**
 * Activate user account
 * @param {string} uid - User ID
 * @returns {Promise<void>}
 */
export const activateUser = async (uid) => {
  try {
    await updateUserDocument(uid, {
      status: USER_STATUS.ACTIVE,
    });
  } catch (error) {
    console.error('Error activating user:', error);
    throw error;
  }
};

/**
 * Update user role
 * @param {string} uid - User ID
 * @param {string} role - New role
 * @returns {Promise<void>}
 */
export const updateUserRole = async (uid, role) => {
  try {
    await updateUserDocument(uid, {
      role,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

/**
 * Update last login timestamp
 * @param {string} uid - User ID
 * @returns {Promise<void>}
 */
export const updateLastLogin = async (uid) => {
  try {
    await updateUserDocument(uid, {
      lastLoginAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating last login:', error);
    // Don't throw error for last login update failures
  }
};

