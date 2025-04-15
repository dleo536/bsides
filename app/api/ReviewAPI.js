import { Review } from "../logic/Review";
import { getAlbumName, getAlbumCover, getAlbum } from "./SpotifyAPI";
import { getUsernameByUID } from "./UserAPI";

export const getAllReviews = async (limit = 5, offset = 0) => {
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
      `https://test1.bsidesdatapath.xyz/reviews?limit=${limit}&offset=${offset}`,
      fetchData
    );
    json = await response.json();
    //const reviewsArray = await jsonToReviews(json[0]);

    const reviewArray = await Promise.all(json.map(jsonToReviews));
    console.log("-------rreview array: ", json);
    //console.log("reviewArray " + reviewArray[0].albumID);
    return reviewArray;
  } catch (error) {
    console.error(error);
    console.log("This be throwing an error!");
  }
};
export const postReview = async (rating, description, albumID) => {
  try {
    const response = await fetch("https://test1.bsidesdatapath.xyz/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        userID: "zfGQ77diIIao9wwk6ETxfmXk9N72",
        albumID: albumID,
        date: "2014-01-22T14:56:59.301Z",
        rating: rating,
        reviewBody: description,
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
const jsonToReviews = async (jsonResponse) => {
  let data =
    typeof jsonResponse === "string" ? JSON.parse(jsonResponse) : jsonResponse;
  let review = new Review();
  review.id = jsonResponse._id;
  review.albumID = jsonResponse.albumID;
  review.rating = jsonResponse.rating;
  review.userID = jsonResponse.userID;
  review.date = jsonResponse.date;
  review.reviewBody = jsonResponse.reviewBody;
  review.likes = jsonResponse.likes;
  review.comments = jsonResponse.comments;
  review.visible = jsonResponse.visible;
  console.log("review ID:", review.albumID);
  review.albumName = await getAlbumName(review.albumID).then((response) => {
    return response;
  });
  review.albumCover = await getAlbumCover(review.albumID).then((response) => {
    return response;
  });
  review.artistName = await getAlbum(review.albumID).then((response) => {
    return response.artists[0].name;
  });
  review.username = await getUsernameByUID(review.userID).then((response) => {
    return response;
  });
  return review;
};
//export { getAllReviews };
