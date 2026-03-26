import { List } from "../logic/List";
import { apiFetch } from "./apiClient";
import {
  getUsernameByUID,
  resolveBackendUserId,
} from "./UserAPI";
import API_BASE_URL from "../config/api";
import { auth } from "../config/firebase";

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

export const getAllLists = async (limit = 5, offset = 0, viewerUid = null) => {
  const fetchData = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  try {
    const searchParams = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });

    const requestUrl = `${API_BASE_URL}/lists?${searchParams.toString()}`;
    const response = await apiFetch(requestUrl, fetchData, {
      authRequired: Boolean(viewerUid),
    });
    const json = await parseJsonSafely(response, "GET /lists");

    if (!response.ok || !json) {
      return [];
    }

    const jsonData = json.data || [];
    const listArray = await Promise.all(jsonData.map(jsonToLists));
    return listArray;
  } catch (error) {
    console.error("Failed to load lists");
    return [];
  }
};

export const searchListsByTitle = async (title, page = 0, limit = 10) => {
  const normalizedTitle = title?.trim();

  if (!normalizedTitle) {
    return [];
  }

  try {
    const searchParams = new URLSearchParams({
      title: normalizedTitle,
      limit: String(limit),
      offset: String(page * limit),
    });
    const requestUrl = `${API_BASE_URL}/lists?${searchParams.toString()}`;
    const response = await apiFetch(
      requestUrl,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
      { authRequired: Boolean(auth.currentUser) }
    );
    const json = await parseJsonSafely(response, "GET /lists title search");

    if (!response.ok || !json) {
      return [];
    }

    const jsonData = Array.isArray(json?.data) ? json.data : [];
    return Promise.all(jsonData.map(jsonToLists));
  } catch (error) {
    console.error("Failed to search lists");
    return [];
  }
};

export const getListsByAlbumId = async (
  albumId,
  { offset = 0, limit = 20 } = {}
) => {
  const normalizedAlbumId = albumId?.trim?.();

  if (!normalizedAlbumId) {
    return { data: [], hasMore: false, totalCount: 0 };
  }

  try {
    const searchParams = new URLSearchParams({
      albumId: normalizedAlbumId,
      limit: String(limit),
      offset: String(offset),
    });
    const requestUrl = `${API_BASE_URL}/lists?${searchParams.toString()}`;
    const response = await apiFetch(
      requestUrl,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
      { authRequired: Boolean(auth.currentUser) }
    );
    const json = await parseJsonSafely(response, "GET /lists album lookup");

    if (!response.ok || !json) {
      return { data: [], hasMore: false, totalCount: 0 };
    }

    const rawLists = Array.isArray(json?.data) ? json.data : [];
    const mappedLists = await Promise.all(rawLists.map(jsonToLists));

    return {
      data: mappedLists,
      hasMore: Boolean(json?.hasMore),
      totalCount: Number(json?.totalCount || 0),
    };
  } catch (error) {
    console.error("Failed to load album lists");
    return { data: [], hasMore: false, totalCount: 0 };
  }
};
export const getHasMore = async (limit = 5, offset = 0) => {
  const fetchData = {
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
    const json = await parseJsonSafely(response, "GET /lists hasMore");
    const jsonData = json?.hasMore;
    return jsonData;
  } catch (error) {
    console.error("Failed to load list pagination state");
    return false;
  }
};
export const getListByUID = async (uid) => {
  const fetchData = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  try {
    const resolvedUserId = (await resolveBackendUserId(uid)) || uid;
    const requestUrl = `${API_BASE_URL}/lists?userID=${encodeURIComponent(
      resolvedUserId
    )}`;
    const response = await apiFetch(
      requestUrl,
      fetchData,
      { authRequired: Boolean(auth.currentUser) }
    );

    if (!response.ok) {
      throw new Error("Unable to fetch lists from backend");
    }

    const json = await parseJsonSafely(response, "GET /lists");
    const dedupedLists = Array.isArray(json?.data) ? json.data : [];

    if (dedupedLists.length === 0) {
      return [];
    }

    const listArray = await Promise.all(dedupedLists.map(jsonToLists));
    return listArray;
  } catch (error) {
    console.error("Failed to load user lists");
    return [];
  }
};

export const getListById = async (listId) => {
  if (!listId) {
    return null;
  }

  try {
    const requestUrl = `${API_BASE_URL}/lists/detail/${encodeURIComponent(listId)}`;
    const response = await apiFetch(
      requestUrl,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
      { authRequired: Boolean(auth.currentUser) }
    );
    const json = await parseJsonSafely(response, "GET /lists/detail/:id");

    if (!response.ok || !json) {
      return null;
    }

    return await jsonToLists(json);
  } catch (error) {
    console.error("Failed to load list");
    return null;
  }
};

export const updateListAlbumOrder = async (listId, albumIds = []) => {
  if (!listId) {
    throw new Error("listId is required");
  }

  const normalizedAlbumIds = Array.isArray(albumIds)
    ? albumIds
        .filter((albumId) => typeof albumId === "string")
        .map((albumId) => albumId.trim())
        .filter(Boolean)
    : [];

  const response = await apiFetch(
    `/lists/${encodeURIComponent(listId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        albumIds: normalizedAlbumIds,
        albumList: normalizedAlbumIds,
      }),
    },
    { authRequired: true }
  );
  const data = await parseJsonSafely(response, "PATCH /lists/:id");

  if (!response.ok) {
    throw new Error(data?.message || "Failed to update list order");
  }

  return data;
};

export const likeList = async (currentUid, listId) => {
  if (!currentUid || !listId) {
    throw new Error("currentUid and listId are required");
  }

  const response = await apiFetch(`/lists/${encodeURIComponent(
    listId
  )}/like`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  }, { authRequired: true });
  const data = await parseJsonSafely(response, "POST /lists/:id/like");

  if (!response.ok) {
    throw new Error(data?.message || "Failed to like list");
  }

  return data;
};

export const unlikeList = async (currentUid, listId) => {
  if (!currentUid || !listId) {
    throw new Error("currentUid and listId are required");
  }

  const response = await apiFetch(`/lists/${encodeURIComponent(
    listId
  )}/like`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  }, { authRequired: true });
  const data = await parseJsonSafely(response, "DELETE /lists/:id/like");

  if (!response.ok) {
    throw new Error(data?.message || "Failed to unlike list");
  }

  return data;
};

export const getListLikeState = async (currentUid, listId) => {
  if (!currentUid || !listId) {
    return { liked: false, likesCount: 0 };
  }

  const response = await apiFetch(`/lists/${encodeURIComponent(
    listId
  )}/is-liked`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  }, { authRequired: true });
  const data = await parseJsonSafely(response, "GET /lists/:id/is-liked");

  if (!response.ok) {
    throw new Error(data?.message || "Failed to get like state");
  }

  return data || { liked: false, likesCount: 0 };
};

export const getMyLikedLists = async (
  currentUid,
  { offset = 0, limit = 50 } = {}
) => {
  if (!currentUid) {
    return { data: [], hasMore: false, totalCount: 0 };
  }

  try {
    const searchParams = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
    });
    const requestUrl = `${API_BASE_URL}/lists/me/liked?${searchParams.toString()}`;
    const response = await apiFetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }, { authRequired: true });
    const json = await parseJsonSafely(response, "GET /lists/me/liked");

    if (!response.ok || !json) {
      return { data: [], hasMore: false, totalCount: 0 };
    }

    const likedLists = Array.isArray(json?.data) ? json.data : [];
    const mappedLists = await Promise.all(likedLists.map(jsonToLists));

    return {
      data: mappedLists,
      hasMore: Boolean(json?.hasMore),
      totalCount: Number(json?.totalCount || 0),
    };
  } catch (error) {
    console.error("Failed to load liked lists");
    return { data: [], hasMore: false, totalCount: 0 };
  }
};
export const patchAlbumList = async (list, id) => {
  //get all albums from list of listId
  //console.log("This is the list ID being passed " + listId);

  //console.log("these are the albumsIDs that are about to be patched " + list);
  //patch list with updated albumlist
  try {
    const response = await apiFetch(
      `/lists/${id}`,
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
      },
      { authRequired: true }
    );
    const data = await parseJsonSafely(response, "PATCH /lists/:id");

    if (response.ok) {
      return data;
    } else {
      return data;
    }
  } catch (error) {
    console.error("Failed to update list");
  }
};
/**
 * Create a new list for the authenticated user.
 * Actor identity is derived from the bearer token on the backend.
 */
export const postList = async (uid, description, name) => {
  try {
    const slug = generateSlug(name) || "untitled-list";

    const body = {
      title: name || "Untitled List",
      slug,
      listType: "custom",
      visibility: "public",
      description: description || null,
    };

    const response = await apiFetch("/lists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }, { authRequired: true });
    const data = await parseJsonSafely(response, "POST /lists");

    if (response.ok) {
      return data;
    } else {
      return data;
    }
  } catch (error) {
    console.error("Failed to create list");
  }
};
/**
 * Create a list with a specific type (e.g. "backlog", "favorite").
 * Maps to AlbumList entity listType enum: custom, favorites, top_n, year, theme.
 * Actor identity is derived from the bearer token on the backend.
 */
export const postListWithType = async (uid, type) => {
  try {
    const normalizedType = type?.toLowerCase?.() || "";

    const listTypeMap = {
      backlog: "custom",
      favorite: "favorites",
      favorites: "favorites",
      top_n: "top_n",
      year: "year",
      theme: "theme",
    };
    const listType = listTypeMap[normalizedType] || "custom";

    const slug =
      normalizedType === "backlog"
        ? "backlog"
        : normalizedType === "favorite" || normalizedType === "favorites"
        ? "favorites"
        : `list-${Date.now()}`;

    const titleMap = {
      backlog: "Backlog",
      favorite: "Favorites",
      favorites: "Favorites",
    };
    const title = titleMap[normalizedType] || "Untitled List";

    const body = {
      title,
      slug,
      listType,
      visibility: "public",
      description: null,
    };

    const response = await apiFetch("/lists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }, { authRequired: true });
    const data = await parseJsonSafely(response, "POST /lists");

    if (response.ok) {
      return data.id ?? data.insertedId;
    } else {
      return response;
    }
  } catch (error) {
    console.error("Failed to create system list");
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
  
  return list;
};
