import { List } from "../logic/List";
import { getUsernameByUID } from "./UserAPI";
import API_BASE_URL from "../config/api";

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
      `${API_BASE_URL}/lists?userID=${uid}`,
      fetchData
    );
    json = await response.json();
    const lists = json.data;

    if (lists.length == 0) {
      return lists;
    } else {
      const listArray = await Promise.all(lists.map(jsonToLists));
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
export const postList = async (uid, description, name) => {
  try {
    const response = await fetch(`${API_BASE_URL}/lists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        userID: uid,
        listName: name,
        listDescription: description,
        listType: "user",
        percentageListened: 0,
        albumList: [],
        likes: 0,
        comments: null,
        visible: true,
      }),
    });
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
export const postListWithType = async (uid, type) => {
  try {
    const response = await fetch(`${API_BASE_URL}/lists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        userID: uid,
        listName: "",
        listDescription: "",
        listType: type,
        percentageListened: 0,
        albumList: [],
        likes: 0,
        comments: null,
        visible: true,
      }),
    });
    const data = await response.json();

    if (response.ok) {
      console.log("Post with type Success:", data);
      return data.insertedId;
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
    albumList: data.albumList || [],
    percentageListened: data.percentageListened || 0,
  });
  
  console.log("list ID:", list.id, "Title:", list.title);
  return list;
};
