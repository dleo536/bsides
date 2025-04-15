import { List } from "../logic/List";
import { getUsernameByUID } from "./UserAPI";

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
      `https://test1.bsidesdatapath.xyz/lists?limit=${limit}&offset=${offset}`,
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
      `https://test1.bsidesdatapath.xyz/lists?limit=${limit}&offset=${offset}`,
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
      "https://test1.bsidesdatapath.xyz/lists/" + uid,
      fetchData
    );
    json = await response.json();

    if (json.length == 0) {
      return json;
    } else {
      const listArray = await Promise.all(json.map(jsonToLists));
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
      "https://test1.bsidesdatapath.xyz/lists/" + id,
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
    const response = await fetch("https://test1.bsidesdatapath.xyz/lists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        userID: uid,
        listName: name,
        listDescription: description,
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
const jsonToLists = async (jsonResponse) => {
  let data =
    typeof jsonResponse === "string" ? JSON.parse(jsonResponse) : jsonResponse;
  let list = new List();
  list.id = jsonResponse._id;
  list.uid = jsonResponse.userID;
  list.listName = jsonResponse.listName;
  list.listDescription = jsonResponse.listDescription;
  list.percentageListened = jsonResponse.percentageListened;
  list.albumList = jsonResponse.albumList;
  list.likes = list.likes;
  list.comments = list.comments;
  list.visible = list.visible;
  // list.username = await getUsernameByUID(jsonResponse.userID).then(
  //   (response) => {
  //     return response;
  //   }
  // );
  console.log("list ID:", list.listName);
  return list;
};
