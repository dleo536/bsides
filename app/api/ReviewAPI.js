import { Review } from "../logic/Review";
import { getAlbumName, getAlbumCover, getAlbum } from "./SpotifyAPI";
import { getUsernameByUID, resolveBackendUserId } from "./UserAPI";
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

export const getAllReviews = async (limit = 5, offset = 0, viewerUid = null) => {
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
    if (viewerUid) {
      const viewerId = await resolveBackendUserId(viewerUid);
      if (viewerId) {
        searchParams.append("viewerId", viewerId);
      } else {
        searchParams.append("viewerUid", viewerUid);
      }
    }

    const requestUrl = `${API_BASE_URL}/reviews?${searchParams.toString()}`;
    const response = await fetch(requestUrl, fetchData);
    const json = await parseJsonSafely(response, "GET /reviews");

    if (!response.ok || !json) {
      console.error("[getAllReviews] request failed", {
        requestUrl,
        status: response.status,
        body: json,
      });
      return [];
    }

    const reviews = json.data || json; // Handle both array and object responses

    const reviewArray = await Promise.all(reviews.map(jsonToReviews));
    console.log("-------review array: ", json);
    return reviewArray;
  } catch (error) {
    console.error(error);
    console.log("This be throwing an error!");
  }
};
export const getReviewsByUID = async (uid) => {
  const response = await fetch(
    `${API_BASE_URL}/reviews?userID=${uid}`
  );
  const json = await response.json();
  const reviews = json.data || json; // Handle both array and object responses
  const reviewArray = await Promise.all(reviews.map(jsonToReviews));
  return reviewArray;
};
/**
 * Create a new review
 * @param {string} userId - User ID creating the review
 * @param {Object} reviewData - Review data matching CreateReviewDto
 * @returns {Promise<Response>}
 */
export const postReview = async (userId, reviewData) => {
  try {
    // If reviewData is a Review instance, convert it to DTO format
    const createDto = reviewData.toCreateDto ? reviewData.toCreateDto() : {
      userId: userId,
      ...reviewData
    };
    console.log("createDto: ", JSON.stringify(createDto));
    const response = await fetch(`${API_BASE_URL}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(createDto),
    });
    const data = await response.json();

    if (response.ok) {
      console.log("Success:", data);
      return data;
    } else {
      console.error("Error:", data);
      return { error: data };
    }
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

/**
 * Get a single review by ID
 * @param {string} reviewId - Review ID
 * @returns {Promise<Review>}
 */
export const getReviewById = async (reviewId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/reviews/${reviewId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    const json = await response.json();
    return await jsonToReviews(json);
  } catch (error) {
    console.error("Error fetching review:", error);
    throw error;
  }
};

/**
 * Update an existing review
 * @param {string} reviewId - Review ID to update
 * @param {Review|Object} reviewData - Review data matching UpdateReviewDto
 * @returns {Promise<Response>}
 */
export const updateReview = async (reviewId, reviewData) => {
  try {
    // If reviewData is a Review instance, convert it to DTO format
    const updateDto = reviewData.toUpdateDto ? reviewData.toUpdateDto() : reviewData;

    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(updateDto),
    });
    const data = await response.json();

    if (response.ok) {
      console.log("Review updated successfully:", data);
      return data;
    } else {
      console.error("Error updating review:", data);
      return { error: data };
    }
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

/**
 * Delete a review
 * @param {string} reviewId - Review ID to delete
 * @returns {Promise<Response>}
 */
export const deleteReview = async (reviewId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      console.log("Review deleted successfully");
      return { success: true };
    } else {
      const data = await response.json();
      console.error("Error deleting review:", data);
      return { error: data };
    }
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

/**
 * Legacy postReview function for backward compatibility
 * @deprecated Use postReview with CreateReviewDto format instead
 */
export const postReviewLegacy = async (rating, description, albumID, userId) => {
  // Convert legacy format to new DTO format
  // Note: This assumes albumID is a Spotify ID or releaseGroupMbId
  const review = new Review({
    userId: userId || "zfGQ77diIIao9wwk6ETxfmXk9N72",
    spotifyAlbumId: albumID?.length === 22 ? albumID : null,
    releaseGroupMbId: albumID?.length !== 22 ? albumID : null,
    ratingHalfSteps: rating ? Math.round(parseFloat(rating) * 2) : null,
    body: description,
    isDraft: false,
    visibility: 'public',
  });
  
  return postReview(userId, review);
};
/**
 * Convert backend API response to Review instance
 * Maps backend Review entity to frontend Review class
 */
const jsonToReviews = async (jsonResponse) => {
  let data =
    typeof jsonResponse === "string" ? JSON.parse(jsonResponse) : jsonResponse;
  
  // Use the static method to create Review from backend response
  let review = Review.fromBackendResponse(data);
  
  // Fetch additional display data if needed
  // Note: The backend already provides snapshots, but we can enhance with Spotify data if available
  if (review.spotifyAlbumId) {
    try {
      const albumData = await getAlbum(review.spotifyAlbumId);
      if (albumData) {
        // Update snapshots if Spotify provides better data
        if (!review.albumTitleSnapshot && albumData.name) {
          review.albumTitleSnapshot = albumData.name;
        }
        if (!review.coverUrlSnapshot && albumData.images?.[0]?.url) {
          review.coverUrlSnapshot = albumData.images[0].url;
        }
        if (!review.artistNameSnapshot && albumData.artists?.[0]?.name) {
          review.artistNameSnapshot = albumData.artists[0].name;
        }
      }
    } catch (error) {
      console.log("Could not fetch Spotify data for review:", error);
    }
  }
  
  // Fetch username for display
  try {
    review.username = await getUsernameByUID(review.userId);
  } catch (error) {
    console.log("Could not fetch username for review:", error);
    review.username = null;
  }
  
  console.log("review ID:", review.id, "Album:", review.albumTitleSnapshot);
  return review;
};
//export { getAllReviews };
