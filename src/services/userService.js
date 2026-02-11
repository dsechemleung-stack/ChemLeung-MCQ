// ============================================================================
// USER SERVICE - Fetch user profiles and data
// ============================================================================

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getItemById } from '../utils/storeItems';

/**
 * Fetch a single user's public profile
 */
export async function getUserProfile(userId) {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        userId,
        ...docSnap.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Fetch multiple users' profiles at once (batch fetch)
 */
export async function getUserProfiles(userIds) {
  try {
    const profiles = {};
    const promises = userIds.map(id => getUserProfile(id));
    const results = await Promise.all(promises);
    
    results.forEach((profile, index) => {
      if (profile) {
        profiles[userIds[index]] = profile;
      }
    });
    
    return profiles;
  } catch (error) {
    console.error('Error fetching user profiles:', error);
    return {};
  }
}

/**
 * Get user's equipped profile picture icon
 */
export function getUserProfilePicIcon(userProfile) {
  if (!userProfile) return '🧪'; // default
  
  const equippedId = userProfile.equipped?.profilePic || 'flask_blue';
  const item = getItemById(equippedId);
  return item?.icon || '🧪';
}

/**
 * Get user avatar component data
 */
export function getUserAvatarData(userProfile) {
  return {
    icon: getUserProfilePicIcon(userProfile),
    displayName: userProfile?.displayName || 'Anonymous',
    initial: (userProfile?.displayName || 'U').charAt(0).toUpperCase()
  };
}