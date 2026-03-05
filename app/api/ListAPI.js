import { List } from "../logic/List";
import { getUsernameByUID, getFullUserByUid } from "./UserAPI";
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

/** Generate URL-safe slug from title */
const generateSlug = (title) => {
  if (!title) return "";
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const getAllLists = async (limit = 5, offset = 0) => {
  let json;
  // let reviewArray;
  fetchData = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${API_BASE_URL}/lists?limit=${limit}&offset=${offset}`,
      fetchData
    );
    json = await response.json();
    jsonData = json.data;
    console.log("getAll List params: ", limit, offset);
    const listArray = await Promise.all(jsonData.map(jsonToLists));
    //console.log("List Array " + listArray);
    return listArray;
  } catch (error) {
    console.error(error);
    console.log("This be throwing an error!");
  }
};
export const getHasMore = async (limit = 5, offset = 0) => {
  let json;
  // let reviewArray;
  fetchData = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${API_BASE_URL}/lists?limit=${limit}&offset=${offset}`,
      fetchData
    );
    json = await response.json();
    jsonData = json.hasMore;
    console.log("getHasMore call: ", jsonData);
    //console.log("List Array " + listArray);
    return jsonData;
  } catch (error) {
    console.error(error);
    console.log("This be throwing an error!");
  }
};
export const getListByUID = async (uid) => {
  fetchData = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  try {
    const fullUser = await getFullUserByUid(uid);
    const candidateIds = [uid];
    if (fullUser?.id && !candidateIds.includes(fullUser.id)) {
      candidateIds.push(fullUser.id);
    }
    if (fullUser?.oauthId && !candidateIds.includes(fullUser.oauthId)) {
      candidateIds.push(fullUser.oauthId);
    }

    let failedRequests = 0;
    const listBuckets = await Promise.all(
      candidateIds.map(async (candidateId) => {
        const requestUrl = `${API_BASE_URL}/lists?userID=${encodeURIComponent(
          candidateId
        )}`;
        const response = await fetch(
          requestUrl,
          fetchData
        );
        if (!response.ok) {
          failedRequests += 1;
          const errorBody = await response.text();
          console.error("[getListByUID] list fetch failed", {
            requestUrl,
            status: response.status,
            body: errorBody?.slice?.(0, 400) || errorBody || "",
          });
          return [];
        }
        const json = await parseJsonSafely(response, "GET /lists");
        if (!json) {
          failedRequests += 1;
          console.error("[getListByUID] empty/non-JSON list response", {
            requestUrl,
            status: response.status,
          });
          return [];
        }
        return json?.data || [];
      })
    );

    const mergedLists = listBuckets.flat();
    const dedupedLists = Array.from(
      new Map(mergedLists.map((list) => [list.id, list])).values()
    );

    if (failedRequests === candidateIds.length && dedupedLists.length === 0) {
      throw new Error("Unable to fetch lists from backend");
    }

    if (dedupedLists.length === 0) {
      return dedupedLists;
    } else {
      const listArray = await Promise.all(dedupedLists.map(jsonToLists));
      console.log("listArray " + listArray[0].listName);
      return listArray;
    }
  } catch (error) {
    console.error(error);
    console.log("This be throwing an error!");
  }
};
export const patchAlbumList = async (list, id) => {
  //get all albums from list of listId
  //console.log("This is the list ID being passed " + listId);

  //console.log("these are the albumsIDs that are about to be patched " + list);
  //patch list with updated albumlist
  try {
    const response = await fetch(
      `${API_BASE_URL}/lists/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          albumList: list,
          albumIds: list,
        }),
      }
    );
    const data = await response.json();

    if (response.ok) {
      console.log("Success:", data);
      return data;
    } else {
      console.error("Error:", data);
      return data;
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
};
/**
 * Create a new list. Matches AlbumList entity:
 * - ownerId (UUID from backend user)
 * - firebaseUid (Firebase UID for reference)
 * - title, slug, listType, visibility, description
 */
export const postList = async (uid, description, name) => {
  try {
    const user = await getFullUserByUid(uid);
    const ownerId = user?.id ?? uid;

    const slug = generateSlug(name) || "untitled-list";

    const body = {
      ownerId,
      firebaseUid: uid,
      title: name || "Untitled List",
      slug,
      listType: "custom",
      visibility: "public",
      description: description || null,
    };

    const response = await fetch(`${API_BASE_URL}/lists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (response.ok) {
      console.log("Success:", data);
      return data;
    } else {
      console.error("Error:", data);
      return data;
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
};
/**
 * Create a list with a specific type (e.g. "backlog", "favorite").
 * Maps to AlbumList entity listType enum: custom, favorites, top_n, year, theme.
 */
export const postListWithType = async (uid, type) => {
  try {
    const user = await getFullUserByUid(uid);
    const ownerId = user?.id ?? uid;

    const listTypeMap = {
      backlog: "custom",
      favorite: "favorites",
      favorites: "favorites",
      top_n: "top_n",
      year: "year",
      theme: "theme",
    };
    const listType = listTypeMap[type?.toLowerCase()] || "custom";

    const slug =
      type === "backlog"
        ? "backlog"
        : type === "favorite" || type === "favorites"
        ? "favorites"
        : `list-${Date.now()}`;

    const titleMap = {
      backlog: "Backlog",
      favorite: "Favorites",
      favorites: "Favorites",
    };
    const title = titleMap[type?.toLowerCase()] || "Untitled List";

    const body = {
      ownerId,
      firebaseUid: uid,
      title,
      slug,
      listType,
      visibility: "public",
      description: null,
    };

    const response = await fetch(`${API_BASE_URL}/lists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (response.ok) {
      console.log("Post with type Success:", data);
      return data.id ?? data.insertedId;
    } else {
      console.error("Error:", data);
      return response;
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
};

/**
 * Convert backend API response to List instance
 * Maps backend AlbumList entity to frontend List class
 * Handles both new backend format and legacy format for backward compatibility
 */
const jsonToLists = async (jsonResponse) => {
  let data =
    typeof jsonResponse === "string" ? JSON.parse(jsonResponse) : jsonResponse;
  
  // Check if this is the new backend format (has ownerId, title, etc.)
  if (data.ownerId || data.title) {
    // New backend format - use fromBackendResponse
    return List.fromBackendResponse(data);
  }
  
  // Legacy format - map old fields to new structure
    const list = new List({
      id: data._id || data.id,
      ownerId: data.userID || data.uid,
      title: data.listName || data.title || '',
      description: data.listDescription || data.description,
    visibility: data.visible === false ? 'private' : (data.visibility || 'public'),
    listType: data.listType || 'custom',
    likesCount: data.likes || data.likesCount || 0,
      commentsCount: data.comments || data.commentsCount || 0,
      createdAt: data.date || data.createdAt,
      // Legacy fields
      albumIds: data.albumIds || data.albumList || [],
      percentageListened: data.percentageListened || 0,
    });
  
  console.log("list ID:", list.id, "Title:", list.title);
  return list;
};
