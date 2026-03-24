import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase"; // your config
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
    console.warn(
      `${label} returned non-JSON payload`,
      response.status,
      raw.slice(0, 160)
    );
    return null;
  }
};

const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

const backendUserIdCache = new Map();
const profileImageUrlCache = new Map();
const profileImageExtensions = ["", ".jpg", ".jpeg", ".png", ".webp"];

const normalizeIdentifier = (value) =>
  typeof value === "string" ? value.trim() : "";

const cacheResolvedUser = (user) => {
  if (user?.id && user?.oauthId) {
    backendUserIdCache.set(user.oauthId, user.id);
  }
};

const getProfileImagePathCandidates = (identifier) => {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  if (!normalizedIdentifier) {
    return [];
  }

  return profileImageExtensions.map(
    (extension) => `profileImages/${normalizedIdentifier}${extension}`
  );
};

export const getProfileImage = async (identifier) => {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  if (!normalizedIdentifier || !storage) {
    return null;
  }

  if (profileImageUrlCache.has(normalizedIdentifier)) {
    return profileImageUrlCache.get(normalizedIdentifier);
  }

  let lastError = null;

  for (const path of getProfileImagePathCandidates(normalizedIdentifier)) {
    try {
      const url = await getDownloadURL(ref(storage, path));
      profileImageUrlCache.set(normalizedIdentifier, url);
      return url;
    } catch (error) {
      if (error?.code !== "storage/object-not-found") {
        lastError = error;
      }
    }
  }

  if (lastError) {
    console.error("Image not found or access denied:", lastError);
  }

  return null;
};

export const getUsernameByUID = async (userID) => {
  let json;
  fetchData = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${API_BASE_URL}/users/${userID}`
    );
    json = await response.json();
    console.log("Log from USER API:", json.username);

    return json.username;
  } catch (error) {
    console.error(error);
    console.log("This be throwing an error!");
  }
};

export const getUserByIdentifier = async (identifier) => {
  if (!identifier) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/users/${encodeURIComponent(identifier)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    const user = await parseJsonSafely(response, "GET /users/:id");

    if (!response.ok) {
      console.error("[getUserByIdentifier] request failed", {
        identifier,
        status: response.status,
        body: user,
      });
      return null;
    }

    cacheResolvedUser(user);

    return user;
  } catch (error) {
    console.error("getUserByIdentifier error:", error);
    return null;
  }
};

/**
 * Fetch a full user object by Firebase UID or backend UUID.
 */
export const getFullUserByUid = async (uid) => {
  try {
    if (uid && auth.currentUser?.uid === uid) {
      const currentUserResponse = await apiFetch("/users/me", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }, { authRequired: true });

      if (currentUserResponse.ok) {
        const currentUser = await parseJsonSafely(
          currentUserResponse,
          "GET /users/me"
        );
        cacheResolvedUser(currentUser);
        return currentUser;
      }
    }

    // 1) Direct lookup (backend id or oauthId if supported server-side)
    let response = await fetch(`${API_BASE_URL}/users/${uid}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const user = await parseJsonSafely(response, "GET /users/:id");
      cacheResolvedUser(user);
      return user;
    }

    // 2) Query by oauthId
    response = await fetch(
      `${API_BASE_URL}/users?oauthId=${encodeURIComponent(uid)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    if (response.ok) {
      const user = await parseJsonSafely(response, "GET /users?oauthId");
      if (user && user.id) {
        cacheResolvedUser(user);
        return user;
      }
    }

    // 3) Fallback by username (for older users without oauthId populated)
    const username = auth.currentUser?.displayName;
    if (username) {
      response = await fetch(
        `${API_BASE_URL}/users?username=${encodeURIComponent(
          username
        )}&offset=0&limit=1`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const users = await parseJsonSafely(response, "GET /users?username");
        if (Array.isArray(users) && users.length > 0) {
          cacheResolvedUser(users[0]);
          return users[0];
        }
      }
    }

    return null;
  } catch (error) {
    console.error("getFullUserByUid error:", error);
    return null;
  }
};

export const resolveBackendUserId = async (identifier) => {
  if (!identifier) return null;
  if (isUuid(identifier)) return identifier;

  if (backendUserIdCache.has(identifier)) {
    return backendUserIdCache.get(identifier);
  }

  const fullUser = await getFullUserByUid(identifier);
  const resolvedId = fullUser?.id ?? null;
  if (resolvedId) {
    backendUserIdCache.set(identifier, resolvedId);
  }
  return resolvedId;
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

  const identifierCandidates = [user?.oauthId, user?.uid]
    .map(normalizeIdentifier)
    .filter(Boolean);

  for (const identifier of identifierCandidates) {
    const imageUrl = await getProfileImage(identifier);
    if (imageUrl) {
      return imageUrl;
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

    const refreshedIdentifierCandidates = [latestUser?.oauthId, latestUser?.uid]
      .map(normalizeIdentifier)
      .filter(Boolean);

    for (const identifier of refreshedIdentifierCandidates) {
      const imageUrl = await getProfileImage(identifier);
      if (imageUrl) {
        return imageUrl;
      }
    }
  }

  return null;
};

export const getUsersByUsername = async (username) => {
  console.log("Getting user by username:", username);
  let json;
  fetchData = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${API_BASE_URL}/users?username=${encodeURIComponent(username)}`
    );
    json = await response.json();
    console.log("Log from USER API:", json);

    return json;
  } catch (error) {
    console.error(error);
    console.log("This be throwing an error!");
  }
};

export const getSignupAvailability = async ({ username, email } = {}) => {
  const searchParams = new URLSearchParams();

  if (typeof username === "string" && username.trim()) {
    searchParams.append("username", username.trim());
  }

  if (typeof email === "string" && email.trim()) {
    searchParams.append("email", email.trim());
  }

  if (![...searchParams.keys()].length) {
    return {
      usernameAvailable: null,
      emailAvailable: null,
      usernameValid: null,
      emailValid: null,
    };
  }

  const requestUrl = `${API_BASE_URL}/users/availability?${searchParams.toString()}`;

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    const data = await parseJsonSafely(response, "GET /users/availability");

    if (!response.ok || !data) {
      console.error("[getSignupAvailability] request failed", {
        requestUrl,
        status: response.status,
        body: data,
      });
      throw new Error(data?.message || "Could not check account availability");
    }

    return data;
  } catch (error) {
    console.error("getSignupAvailability error:", error);
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
    console.error("createBackendUserProfile error:", error);
    throw error;
  }
};
export const patchUser = async (uid, backlogListId, favoriteListId) => {
  try {
    const response = await apiFetch(
      "/users/me",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          backlogListId: backlogListId,
          favoriteListId: favoriteListId,
        }),
      },
      { authRequired: true }
    );
    const data = await parseJsonSafely(response, "PATCH /users/me");

    if (response.ok) {
      return data;
    } else {
      console.error("Error:", data);
      return data;
    }
  } catch (error) {
    console.error("Fetch error:", error);
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
