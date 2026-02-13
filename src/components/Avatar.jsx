import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getItemById, STORE_ITEMS } from '../utils/storeItems';

const iconMap = {
  flask_blue: '🧪',
  atom_green: '⚛️',
  molecule: '🔬',
  fire: '🔥',
  lightning: '⚡',
  crystal: '💎',
  explosion: '💥',
  star: '⭐',
  crown: '👑',
  trophy: '🏆'
};

const sizeClasses = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-lg'
};

function getInitials(name) {
  if (!name) return 'U';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

export default function Avatar({
  userId,
  displayName,
  profilePicId,
  themeId,
  profileColor,
  fetchUser = true,
  size = 'sm',
  className = ''
}) {
  const [loaded, setLoaded] = useState(false);
  const [fetched, setFetched] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!userId || !fetchUser) {
        setLoaded(true);
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (!isMounted) return;
        setFetched(snap.exists() ? snap.data() : null);
      } catch {
        if (!isMounted) return;
        setFetched(null);
      } finally {
        if (!isMounted) return;
        setLoaded(true);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [userId, fetchUser]);

  const resolved = useMemo(() => {
    const equipped = fetched?.equipped || {};

    const resolvedProfilePicId = profilePicId || equipped.profilePic || 'flask_blue';
    const resolvedThemeId = themeId || equipped.theme || 'default';

    const themeItem = getItemById(resolvedThemeId);
    const gradient = themeItem?.preview || STORE_ITEMS.themes?.[0]?.preview || 'linear-gradient(135deg, #2563eb, #1e40af)';

    const fallbackColor = profileColor || fetched?.profileColor || '#2563eb';

    return {
      icon: iconMap[resolvedProfilePicId] || '🧪',
      gradient,
      fallbackColor
    };
  }, [fetched, profilePicId, themeId, profileColor]);

  const initials = useMemo(() => getInitials(displayName || fetched?.displayName), [displayName, fetched]);
  const avatarClass = sizeClasses[size] || sizeClasses.sm;

  const backgroundStyle = resolved?.gradient
    ? { background: resolved.gradient }
    : { background: `linear-gradient(135deg, ${resolved.fallbackColor}, ${resolved.fallbackColor}dd)` };

  const content = resolved?.icon || initials;

  if (userId && !loaded) {
    return (
      <div className={`${avatarClass} rounded-full bg-slate-200 animate-pulse ${className}`} />
    );
  }

  return (
    <div
      className={`${avatarClass} rounded-full flex items-center justify-center shadow-md font-black select-none ${className}`}
      style={backgroundStyle}
      title={displayName || fetched?.displayName || ''}
    >
      <span className="text-white leading-none">{content}</span>
    </div>
  );
}
