/**
 * Review class compatible with backend Review entity and DTOs
 * Maps to: b-backend/src/review/review.entity.ts
 */
export class Review {
  constructor(data = {}) {
    // --- Core identifiers (from backend) ---
    this.id = data.id || null;
    this.userId = data.userId || null;
    
    // --- MusicBrainz identifiers ---
    this.releaseGroupMbId = data.releaseGroupMbId || null; // Primary album identifier
    this.releaseMbId = data.releaseMbId || null;
    this.artistMbId = data.artistMbId || null;
    
    // --- External service IDs (optional) ---
    this.spotifyAlbumId = data.spotifyAlbumId || null;
    this.discogsMasterId = data.discogsMasterId || null;
    
    // --- Snapshots (denormalized album info) ---
    this.albumTitleSnapshot = data.albumTitleSnapshot || '';
    this.artistNameSnapshot = data.artistNameSnapshot || '';
    this.coverUrlSnapshot = data.coverUrlSnapshot || null;
    
    // --- Review content ---
    // ratingHalfSteps: 1-10 where 1 = 0.5 stars, 10 = 5.0 stars
    this.ratingHalfSteps = data.ratingHalfSteps || null;
    this.headline = data.headline || null;
    this.body = data.body || null;
    this.isSpoiler = data.isSpoiler || false;
    this.isDraft = data.isDraft || false;
    this.visibility = data.visibility || 'public'; // 'public' or 'private'
    
    // --- Optional arrays ---
    this.tags = data.tags || [];
    this.trackHighlights = data.trackHighlights || [];
    
    // --- Counters ---
    this.likesCount = data.likesCount || 0;
    this.commentsCount = data.commentsCount || 0;
    
    // --- Diary/log fields ---
    this.listenedOn = data.listenedOn || null;
    this.relistenCount = data.relistenCount || 0;
    
    // --- Timestamps ---
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
    this.publishedAt = data.publishedAt || null;
    
    // --- Computed/display properties (for backward compatibility) ---
    // These are populated by ReviewAPI when fetching reviews
    this.username = data.username || null;
    
    // --- Legacy property mappings (for backward compatibility) ---
    // These getters/setters maintain compatibility with existing code
    Object.defineProperty(this, 'userID', {
      get: () => this.userId,
      set: (value) => { this.userId = value; },
      enumerable: true,
      configurable: true
    });
    
    Object.defineProperty(this, 'albumID', {
      get: () => this.spotifyAlbumId || this.releaseGroupMbId,
      set: (value) => { 
        // Try to determine if it's a Spotify ID or MusicBrainz ID
        if (value && value.length === 22) {
          this.spotifyAlbumId = value;
        } else {
          this.releaseGroupMbId = value;
        }
      },
      enumerable: true,
      configurable: true
    });
    
    Object.defineProperty(this, 'albumName', {
      get: () => this.albumTitleSnapshot,
      set: (value) => { this.albumTitleSnapshot = value; },
      enumerable: true,
      configurable: true
    });
    
    Object.defineProperty(this, 'artistName', {
      get: () => this.artistNameSnapshot,
      set: (value) => { this.artistNameSnapshot = value; },
      enumerable: true,
      configurable: true
    });
    
    Object.defineProperty(this, 'albumCover', {
      get: () => this.coverUrlSnapshot,
      set: (value) => { this.coverUrlSnapshot = value; },
      enumerable: true,
      configurable: true
    });
    
    Object.defineProperty(this, 'rating', {
      get: () => {
        // Convert ratingHalfSteps (1-10) to display rating (0.5-5.0)
        if (this.ratingHalfSteps !== null && this.ratingHalfSteps !== undefined) {
          return (this.ratingHalfSteps / 2).toFixed(1);
        }
        return null;
      },
      set: (value) => {
        // Convert display rating (0.5-5.0) to ratingHalfSteps (1-10)
        if (value !== null && value !== undefined) {
          this.ratingHalfSteps = Math.round(parseFloat(value) * 2);
        }
      },
      enumerable: true,
      configurable: true
    });
    
    Object.defineProperty(this, 'reviewBody', {
      get: () => this.body,
      set: (value) => { this.body = value; },
      enumerable: true,
      configurable: true
    });
    
    Object.defineProperty(this, 'likes', {
      get: () => this.likesCount,
      set: (value) => { this.likesCount = value; },
      enumerable: true,
      configurable: true
    });
    
    Object.defineProperty(this, 'comments', {
      get: () => this.commentsCount,
      set: (value) => { this.commentsCount = value; },
      enumerable: true,
      configurable: true
    });
    
    Object.defineProperty(this, 'visible', {
      get: () => this.visibility === 'public',
      set: (value) => { this.visibility = value ? 'public' : 'private'; },
      enumerable: true,
      configurable: true
    });
    
    Object.defineProperty(this, 'date', {
      get: () => this.createdAt || this.listenedOn,
      set: (value) => { 
        this.listenedOn = value;
        if (!this.createdAt) {
          this.createdAt = value;
        }
      },
      enumerable: true,
      configurable: true
    });
  }
  
  /**
   * Convert ratingHalfSteps to display format (0.5-5.0 stars)
   */
  getRatingDisplay() {
    if (this.ratingHalfSteps === null || this.ratingHalfSteps === undefined) {
      return null;
    }
    return (this.ratingHalfSteps / 2).toFixed(1);
  }
  
  /**
   * Convert display rating to ratingHalfSteps
   */
  setRatingFromDisplay(rating) {
    if (rating === null || rating === undefined) {
      this.ratingHalfSteps = null;
    } else {
      this.ratingHalfSteps = Math.round(parseFloat(rating) * 2);
    }
  }
  
  /**
   * Create a Review instance from backend API response
   */
  static fromBackendResponse(data) {
    return new Review({
      id: data.id,
      userId: data.userId,
      releaseGroupMbId: data.releaseGroupMbId,
      releaseMbId: data.releaseMbId,
      artistMbId: data.artistMbId,
      spotifyAlbumId: data.spotifyAlbumId,
      discogsMasterId: data.discogsMasterId,
      albumTitleSnapshot: data.albumTitleSnapshot,
      artistNameSnapshot: data.artistNameSnapshot,
      coverUrlSnapshot: data.coverUrlSnapshot,
      ratingHalfSteps: data.ratingHalfSteps,
      headline: data.headline,
      body: data.body,
      isSpoiler: data.isSpoiler,
      isDraft: data.isDraft,
      visibility: data.visibility,
      tags: data.tags || [],
      trackHighlights: data.trackHighlights || [],
      likesCount: data.likesCount || 0,
      commentsCount: data.commentsCount || 0,
      listenedOn: data.listenedOn,
      relistenCount: data.relistenCount || 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      publishedAt: data.publishedAt,
    });
  }
  
  /**
   * Convert to CreateReviewDto format for POST requests
   */
  toCreateDto() {
    return {
      userId: this.userId,
      releaseGroupMbId: this.releaseGroupMbId,
      releaseMbId: this.releaseMbId,
      artistMbId: this.artistMbId,
      albumTitleSnapshot: this.albumTitleSnapshot,
      artistNameSnapshot: this.artistNameSnapshot,
      coverUrlSnapshot: this.coverUrlSnapshot,
      ratingHalfSteps: this.ratingHalfSteps,
      headline: this.headline,
      body: this.body,
      isSpoiler: this.isSpoiler,
      isDraft: this.isDraft,
      visibility: this.visibility,
      listenedOn: this.listenedOn,
      relistenCount: this.relistenCount,
      trackHighlights: this.trackHighlights,
      tags: this.tags,
    };
  }
  
  /**
   * Convert to UpdateReviewDto format for PATCH requests
   */
  toUpdateDto() {
    return {
      ratingHalfSteps: this.ratingHalfSteps,
      headline: this.headline,
      body: this.body,
      isSpoiler: this.isSpoiler,
      isDraft: this.isDraft,
      visibility: this.visibility,
      listenedOn: this.listenedOn,
      relistenCount: this.relistenCount,
      trackHighlights: this.trackHighlights,
      tags: this.tags,
    };
  }
}
