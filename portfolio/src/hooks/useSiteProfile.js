import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import defaultAvatar from '../assets/profilephoto1.jpg';

/** Admin-editable profile (bio and photos); the site falls back to built-in copy. */
export const siteProfileRef = () => doc(db, 'siteSettings', 'profile');

/** Shown on both skins until a bio is saved, or if it can't be loaded. */
export const DEFAULT_BIO = 'vancouver -> waterloo. thanks for stopping by!';

/** Stands in until a profile image is chosen in the dev window. */
export const DEFAULT_AVATAR = defaultAvatar;

const EMPTY = { bio: null, photos: [], avatarUrl: null };

function readProfile(data) {
  const bio = data?.bio;
  const photos = Array.isArray(data?.photos) ? data.photos.filter((url) => typeof url === 'string' && url) : [];
  const avatarUrl = typeof data?.avatarUrl === 'string' && data.avatarUrl ? data.avatarUrl : null;
  return { bio: typeof bio === 'string' && bio.trim() ? bio : null, photos, avatarUrl };
}

/**
 * Live `siteSettings/profile`.
 * - `bio`: saved text, or null (callers show `DEFAULT_BIO`).
 * - `photos`: the About gallery, in display order (may be empty).
 * - `avatar`: the chosen profile image, else the first photo, else the default.
 * - `gallery`: `photos`, or just the avatar when none are uploaded.
 */
export function useSiteProfile() {
  const [state, setState] = useState({ ...EMPTY, loaded: false, error: '' });

  useEffect(() => onSnapshot(
    siteProfileRef(),
    (snapshot) => setState({ ...readProfile(snapshot.data()), loaded: true, error: '' }),
    (error) => setState({ ...EMPTY, loaded: true, error: error?.message || 'Could not load the profile.' }),
  ), []);

  const avatar = state.avatarUrl || state.photos[0] || DEFAULT_AVATAR;
  const gallery = state.photos.length > 0 ? state.photos : [avatar];
  return { ...state, avatar, gallery };
}
