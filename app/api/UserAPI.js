import { auth } from "../config/firebase";
import { apiFetch } from "./apiClient";
import API_BASE_URL from "../config/api";

const parseJsonSafely = async (response, label) => {
  const raw = await response.text();
  if (!raw || !raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`${label} returned non-JSON payload`, response.status);
    return null;
  }
};

const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

const backendUserIdCache = new Map();
let currentUserProfileCache = null;

const clearUserCaches = () => {
  backendUserIdCache.clear();
  currentUserProfileCache = null;
};

const normalizeIdentifier = (value) =>
  typeof value === "string" ? value.trim() : "";

const withCurrentAuthShape = (user) => {
  if (!user) {
    return null;
  }

  if (!auth.currentUser?.uid) {
    return user;
  }

  return {
    ...user,
    uid: auth.currentUser.uid,
    photoURL:
      typeof auth.currentUser.photoURL === "string"
        ? auth.currentUser.photoURL
        : user?.photoURL || null,
  };
};

const cacheResolvedUser = (user, sourceIdentifier = null) => {
  if (user?.id) {
    backendUserIdCache.set(user.id, user.id);
  }

  if (user?.id && sourceIdentifier) {
    backendUserIdCache.set(sourceIdentifier, user.id);
  }
};

const shouldSyncAvatarUrl = (photoURL, avatarUrl) =>
  typeof photoURL === "string" &&
  /^https?:\/\//i.test(photoURL) &&
  photoURL.trim().length > 0 &&
  photoURL !== avatarUrl;

export const getCurrentUserProfile = async ({ forceRefresh = false } = {}) => {
  if (!auth.currentUser?.uid) {
    clearUserCaches();
    return null;
  }

  if (!forceRefresh && currentUserProfileCache?.id) {
    return currentUserProfileCache;
  }

  try {
    const response = await apiFetch("/users/me", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }, { authRequired: true });

    const currentUser = await parseJsonSafely(response, "GET /users/me");
    if (!response.ok || !currentUser) {
      return null;
    }

    const hydratedUser = withCurrentAuthShape(currentUser);
    currentUserProfileCache = hydratedUser;
    cacheResolvedUser(hydratedUser, auth.currentUser.uid);

    if (
      shouldSyncAvatarUrl(auth.currentUser.photoURL, hydratedUser?.avatarUrl)
    ) {
      try {
        const syncResult = await updateCurrentUserProfile({
          avatarUrl: auth.currentUser.photoURL,
        });
        const syncedUser = withCurrentAuthShape(syncResult?.user || syncResult);
        if (syncedUser?.id) {
          currentUserProfileCache = syncedUser;
          cacheResolvedUser(syncedUser, auth.currentUser.uid);
        }
      } catch (error) {}
    }

    return currentUserProfileCache;
  } catch (error) {
    console.error("Failed to load current user profile");
    return null;
  }
};

export const getUsernameByUID = async (userID) => {
  try {
    const response = await apiFetch(
      `${API_BASE_URL}/users/${userID}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
      { authRequired: Boolean(auth.currentUser) }
    );
    const json = await parseJsonSafely(response, "GET /users/:id");
    return json?.username || null;
  } catch (error) {
    console.error("Failed to load username");
    return null;
  }
};

export const getUserByIdentifier = async (identifier) => {
  if (!identifier) {
    return null;
  }

  if (auth.currentUser?.uid && identifier === auth.currentUser.uid) {
    return getCurrentUserProfile();
  }

  try {
    const response = await apiFetch(
      `${API_BASE_URL}/users/${encodeURIComponent(identifier)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
      { authRequired: Boolean(auth.currentUser) }
    );
    const user = await parseJsonSafely(response, "GET /users/:id");

    if (!response.ok) {
      return null;
    }

    cacheResolvedUser(user, identifier);

    return user;
  } catch (error) {
    console.error("Failed to load user");
    return null;
  }
};

/**
 * Fetch a full user object by Firebase UID or backend UUID.
 */
export const getFullUserByUid = async (uid) => {
  try {
    if (uid && auth.currentUser?.uid === uid) {
      return getCurrentUserProfile();
    }

    if (isUuid(uid)) {
      return getUserByIdentifier(uid);
    }

    return null;
  } catch (error) {
    console.error("Failed to load current user profile");
    return null;
  }
};

export const resolveBackendUserId = async (identifier) => {
  if (!identifier) return null;
  if (isUuid(identifier)) return identifier;

  if (backendUserIdCache.has(identifier)) {
    return backendUserIdCache.get(identifier);
  }

  if (auth.currentUser?.uid && identifier === auth.currentUser.uid) {
    const fullUser = await getCurrentUserProfile();
    const resolvedId = fullUser?.id ?? null;
    if (resolvedId) {
      backendUserIdCache.set(identifier, resolvedId);
    }
    return resolvedId;
  }

  const fullUser = await getUserByIdentifier(identifier);
  return fullUser?.id ?? null;
};

export const getProfileImageForUser = async (user) => {
  if (!user) {
    return null;
  }

  if (typeof user?.photoURL === "string" && user.photoURL.trim()) {
    return user.photoURL;
  }

  if (typeof user?.avatarUrl === "string" && user.avatarUrl.trim()) {
    return user.avatarUrl;
  }

  if (
    auth.currentUser?.uid &&
    (user?.uid === auth.currentUser.uid ||
      (currentUserProfileCache?.id && user?.id === currentUserProfileCache.id))
  ) {
    const currentUser = await getCurrentUserProfile();
    if (typeof currentUser?.avatarUrl === "string" && currentUser.avatarUrl.trim()) {
      return currentUser.avatarUrl;
    }
    if (typeof currentUser?.photoURL === "string" && currentUser.photoURL.trim()) {
      return currentUser.photoURL;
    }
  }

  if (user?.id) {
    const latestUser = await getUserByIdentifier(user.id);
    if (!latestUser) {
      return null;
    }

    if (typeof latestUser?.photoURL === "string" && latestUser.photoURL.trim()) {
      return latestUser.photoURL;
    }

    if (typeof latestUser?.avatarUrl === "string" && latestUser.avatarUrl.trim()) {
      return latestUser.avatarUrl;
    }
  }

  return null;
};

export const getUsersByUsername = async (username) => {
  try {
    const response = await apiFetch(
      `${API_BASE_URL}/users?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
      { authRequired: Boolean(auth.currentUser) }
    );
    const json = await parseJsonSafely(response, "GET /users");
    return json;
  } catch (error) {
    console.error("Failed to search users");
    return [];
  }
};

export const getSignupAvailability = async ({ username } = {}) => {
  const requestBody = {};

  if (typeof username === "string" && username.trim()) {
    requestBody.username = username.trim();
  }

  if (!Object.keys(requestBody).length) {
    return {
      usernameAvailable: null,
      emailAvailable: null,
      usernameValid: null,
      emailValid: null,
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/availability`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    const data = await parseJsonSafely(response, "POST /users/availability");

    if (!response.ok || !data) {
      throw new Error(data?.message || "Could not check account availability");
    }

    return data;
  } catch (error) {
    console.error("Failed to check account availability");
    throw error;
  }
};

export const createBackendUserProfile = async ({
  email,
  username,
  firstName,
  lastName,
} = {}) => {
  try {
    const response = await apiFetch("/users", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        username,
        firstName,
        lastName,
      }),
    }, { authRequired: true });
    const data = await parseJsonSafely(response, "POST /users");

    if (!response.ok) {
      const error = new Error(data?.message || "Could not create user profile");
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to create user profile");
    throw error;
  }
};

export const deleteCurrentUserAccount = async () => {
  try {
    const response = await apiFetch(
      "/users/me",
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
      { authRequired: true }
    );
    const data = await parseJsonSafely(response, "DELETE /users/me");

    if (!response.ok) {
      const error = new Error(data?.message || "Could not delete your account");
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    clearUserCaches();
    return data;
  } catch (error) {
    console.error("Failed to delete current user account");
    throw error;
  }
};

export const updateCurrentUserProfile = async (updates = {}) => {
  try {
    const response = await apiFetch("/users/me", {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }, { authRequired: true });
    const data = await parseJsonSafely(response, "PATCH /users/me");

    if (!response.ok || !data?.user) {
      const error = new Error(data?.message || "Could not update user profile");
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    currentUserProfileCache = withCurrentAuthShape(data.user);
    cacheResolvedUser(currentUserProfileCache, auth.currentUser?.uid ?? null);
    return data;
  } catch (error) {
    console.error("Failed to update current user profile");
    throw error;
  }
};
export const followUser = async (currentUid, targetUserId) => {
  if (!currentUid || !targetUserId) {
    throw new Error("currentUid and targetUserId are required");
  }

  const targetId =
    (await resolveBackendUserId(targetUserId)) || targetUserId;

  const response = await apiFetch(`/users/${encodeURIComponent(
    targetId
  )}/follow`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  }, { authRequired: true });
  const data = await parseJsonSafely(response, "POST /users/:id/follow");

  if (!response.ok) {
    throw new Error(data?.message || "Failed to follow user");
  }

  return data;
};

export const unfollowUser = async (currentUid, targetUserId) => {
  if (!currentUid || !targetUserId) {
    throw new Error("currentUid and targetUserId are required");
  }

  const targetId =
    (await resolveBackendUserId(targetUserId)) || targetUserId;

  const response = await apiFetch(`/users/${encodeURIComponent(
    targetId
  )}/follow`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  }, { authRequired: true });
  const data = await parseJsonSafely(response, "DELETE /users/:id/follow");

  if (!response.ok) {
    throw new Error(data?.message || "Failed to unfollow user");
  }

  return data;
};

export const getFollowState = async (currentUid, targetUserId) => {
  if (!currentUid || !targetUserId) {
    return { following: false, isSelf: false };
  }

  const targetId =
    (await resolveBackendUserId(targetUserId)) || targetUserId;

  const response = await apiFetch(`/users/${encodeURIComponent(
    targetId
  )}/is-following`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  }, { authRequired: true });
  const data = await parseJsonSafely(response, "GET /users/:id/is-following");

  if (!response.ok) {
    throw new Error(data?.message || "Failed to get follow state");
  }

  return data || { following: false, isSelf: false };
};

export const getMyFollowing = async (currentUid) => {
  if (!currentUid) {
    return { followingIds: [], following: [] };
  }

  const response = await apiFetch("/users/me/following", {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  }, { authRequired: true });
  const data = await parseJsonSafely(response, "GET /users/me/following");

  if (!response.ok) {
    throw new Error(data?.message || "Failed to get following list");
  }

  return data || { followingIds: [], following: [] };
};
