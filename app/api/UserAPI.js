import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase"; // your config
import API_BASE_URL from "../config/api";

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
