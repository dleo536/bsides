import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase"; // your config
import { auth } from "../config/firebase";
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

export const getProfileImage = async (uid) => {
  const imageRef = ref(storage, `profileImages/${uid}.jpg`);

  try {
    const url = await getDownloadURL(imageRef);
    return url; // You can use this as the `src` or `uri`
  } catch (error) {
    console.error("Image not found or access denied:", error);
    return null;
  }
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

/**
 * Fetch full user object by Firebase UID.
 * Returns user with id (UUID) for use as ownerId when creating lists.
 */
export const getFullUserByUid = async (uid) => {
  try {
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
      if (user && user.id) return user;
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
      `${API_BASE_URL}/users?username=${username}`
    );
    json = await response.json();
    console.log("Log from USER API:", json);

    return json;
  } catch (error) {
    console.error(error);
    console.log("This be throwing an error!");
  }
};
export const patchUser = async (uid, backlogListId, favoriteListId) => {
  print(
    "Patching user with uid:",
    uid,
    "backlogListId:",
    backlogListId,
    "favoriteListId:",
    favoriteListId
  );
  try {
    const response = await fetch(
      `${API_BASE_URL}/users/${uid}`,
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
      }
    );
    const data = await response.json();

    if (response.ok) {
      console.log("Success:", data);
      return response;
    } else {
      console.error("Error:", data);
      return response;
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
};
export const followUser = async (currentUid, userUid) => {
  console.log("Following user:", userUid);
  try {
    const response = await fetch(
      `${API_BASE_URL}/users/${currentUid}/follow/${userUid}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    const data = await response.json();
    console.log("Follow response:", data);
    return response;
  } catch (error) {
    console.error("Follow error:", error);
    throw error;
  }
};
