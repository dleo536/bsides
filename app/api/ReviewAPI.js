import { Review } from "../logic/Review";
import { apiFetch } from "./apiClient";
import { getAlbumName, getAlbumCover, getAlbum } from "./SpotifyAPI";
import { getUsernameByUID, resolveBackendUserId } from "./UserAPI";
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

const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

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

    const requestUrl = `${API_BASE_URL}/reviews?${searchParams.toString()}`;
    const response = await apiFetch(requestUrl, fetchData, {
      authRequired: Boolean(viewerUid),
    });
    const json = await parseJsonSafely(response, "GET /reviews");

    if (!response.ok || !json) {
      return [];
    }

    const reviews = json.data || json; // Handle both array and object responses

    const reviewArray = await Promise.all(reviews.map(jsonToReviews));
    return reviewArray;
  } catch (error) {
    console.error("Failed to load reviews");
    return [];
  }
};
export const getReviewsByUID = async (uid) => {
  const resolvedUserId = (await resolveBackendUserId(uid)) || uid;
  const requestUrl = `${API_BASE_URL}/reviews?userID=${encodeURIComponent(
    resolvedUserId
  )}`;
  const response = await apiFetch(requestUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  }, {
    authRequired: Boolean(auth.currentUser),
  });
  const json = await parseJsonSafely(response, "GET /reviews by user");

  if (!response.ok || !json) {
    return [];
  }

  const reviews = json.data || json; // Handle both array and object responses
  const reviewArray = await Promise.all(reviews.map(jsonToReviews));
  return reviewArray;
};

export const getReviewsByAlbum = async (
  { spotifyAlbumId = null, releaseGroupMbId = null } = {},
  { offset = 0, limit = 20 } = {}
) => {
  const normalizedSpotifyAlbumId = spotifyAlbumId?.trim?.() || "";
  const normalizedReleaseGroupMbId = releaseGroupMbId?.trim?.() || "";

  if (!normalizedSpotifyAlbumId && !normalizedReleaseGroupMbId) {
    return { data: [], hasMore: false, totalCount: 0 };
  }

  try {
    const searchParams = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
    });

    if (normalizedSpotifyAlbumId) {
      searchParams.append("spotifyAlbumId", normalizedSpotifyAlbumId);
    }
    if (normalizedReleaseGroupMbId) {
      searchParams.append("releaseGroupMbId", normalizedReleaseGroupMbId);
    }

    const requestUrl = `${API_BASE_URL}/reviews?${searchParams.toString()}`;
    const response = await apiFetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }, {
      authRequired: Boolean(auth.currentUser),
    });
    const json = await parseJsonSafely(response, "GET /reviews album lookup");

    if (!response.ok || !json) {
      return { data: [], hasMore: false, totalCount: 0 };
    }

    const reviews = Array.isArray(json?.data) ? json.data : [];
    const reviewArray = await Promise.all(reviews.map(jsonToReviews));

    return {
      data: reviewArray,
      hasMore: Boolean(json?.hasMore),
      totalCount: Number(json?.totalCount || 0),
    };
  } catch (error) {
    console.error("Failed to load album reviews");
    return { data: [], hasMore: false, totalCount: 0 };
  }
};
/**
 * Create a new review
 * @param {string} _ignoredUserId - Legacy argument, actor identity now comes from the bearer token
 * @param {Object} reviewData - Review data matching CreateReviewDto
 * @returns {Promise<Response>}
 */
export const postReview = async (_ignoredUserId, reviewData) => {
  try {
    // If reviewData is a Review instance, convert it to DTO format
    const createDto = reviewData.toCreateDto ? reviewData.toCreateDto() : {
      ...reviewData
    };

    delete createDto.userId;
    delete createDto.firebaseUid;

    const response = await apiFetch("/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(createDto),
    }, { authRequired: true });
    const data = await parseJsonSafely(response, "POST /reviews");

    if (response.ok) {
      return data;
    } else {
      return { error: data };
    }
  } catch (error) {
    console.error("Failed to create review");
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
    const requestUrl = `${API_BASE_URL}/reviews/${reviewId}`;
    const response = await apiFetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }, {
      authRequired: Boolean(auth.currentUser),
    });
    const json = await parseJsonSafely(response, "GET /reviews/:id");

    if (!response.ok || !json) {
      throw new Error(`Failed to fetch review ${reviewId}`);
    }

    return await jsonToReviews(json);
  } catch (error) {
    console.error("Failed to load review");
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

    const response = await apiFetch(`/reviews/${reviewId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(updateDto),
    }, { authRequired: true });
    const data = await parseJsonSafely(response, "PATCH /reviews/:id");

    if (response.ok) {
      return data;
    } else {
      return { error: data };
    }
  } catch (error) {
    console.error("Failed to update review");
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
    const response = await apiFetch(`/reviews/${reviewId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }, { authRequired: true });

    if (response.ok) {
      return { success: true };
    } else {
      const data = await response.json();
      return { error: data };
    }
  } catch (error) {
    console.error("Failed to delete review");
    throw error;
  }
};

/**
 * Legacy postReview function for backward compatibility
 * @deprecated Use postReview with CreateReviewDto format instead
 */
export const postReviewLegacy = async (rating, description, albumID, userId) => {
  const parsedRating = Number.parseFloat(rating);
  const normalizedRating = Number.isFinite(parsedRating)
    ? (parsedRating <= 5 ? parsedRating * 2 : parsedRating)
    : null;

  // Convert legacy format to new DTO format
  // Note: This assumes albumID is a Spotify ID or releaseGroupMbId
  const review = new Review({
    spotifyAlbumId: albumID?.length === 22 ? albumID : null,
    releaseGroupMbId: albumID?.length !== 22 ? albumID : null,
    ratingHalfSteps: normalizedRating !== null ? Number(normalizedRating.toFixed(1)) : null,
    body: description,
    isDraft: false,
    visibility: 'public',
  });
  
  return postReview(null, review);
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
        review.albumData = albumData;
        review.primaryArtistId = albumData.artists?.[0]?.id || null;
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
      console.error("Failed to enrich review album data");
    }
  }
  
  // Fetch username for display
  try {
    review.username = await getUsernameByUID(review.userId);
  } catch (error) {
    console.error("Failed to enrich review username");
    review.username = null;
  }

  return review;
};
//export { getAllReviews };
