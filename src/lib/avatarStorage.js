const key = (uid) => `fitgroup_avatar_${uid}`;

export function getStoredAvatarDataUrl(uid) {
  if (!uid || typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key(uid));
  } catch {
    return null;
  }
}

export function setStoredAvatarDataUrl(uid, dataUrl) {
  if (!uid || typeof localStorage === 'undefined') return;
  try {
    if (dataUrl) localStorage.setItem(key(uid), dataUrl);
    else localStorage.removeItem(key(uid));
  } catch {
    /* ignore quota */
  }
}
