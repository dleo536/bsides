/**
 * List class compatible with backend AlbumList entity
 * Maps to: b-backend/src/list/list.entity.ts
 */
export class List {
  constructor(data = {}) {
    // --- Core identifiers (from backend) ---
    this.id = data.id || null;
    this.ownerId = data.ownerId || null;
    
    // --- Identity / display ---
    this.title = data.title || '';
    this.slug = data.slug || '';
    this.listType = data.listType || 'custom'; // 'custom', 'favorites', 'top_n', 'year', 'theme'
    this.visibility = data.visibility || 'public'; // 'public', 'friends', 'private'
    this.description = data.description || null;
    
    // --- Visuals ---
    this.coverUrl = data.coverUrl || null;
    
    // --- Collaboration ---
    this.isCollaborative = data.isCollaborative || false;
    this.editorIds = data.editorIds || [];
    
    // --- Ordering / behavior ---
    this.isPinned = data.isPinned || false;
    this.isLocked = data.isLocked || false;
    
    // --- Counters (denormalized) ---
    this.itemsCount = data.itemsCount || 0;
    this.followersCount = data.followersCount || 0;
    this.likesCount = data.likesCount || 0;
    this.commentsCount = data.commentsCount || 0;
    
    // --- Timestamps ---
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
    this.deletedAt = data.deletedAt || null;
    
    // --- Legacy property mappings (for backward compatibility) ---
    Object.defineProperty(this, 'userID', {
      get: () => this.ownerId,
      set: (value) => { this.ownerId = value; },
      enumerable: true,
      configurable: true
    });
    
    Object.defineProperty(this, 'uid', {
      get: () => this.ownerId,
      set: (value) => { this.ownerId = value; },
      enumerable: true,
      configurable: true
    });
    
    Object.defineProperty(this, 'listName', {
      get: () => this.title,
      set: (value) => { this.title = value; },
      enumerable: true,
      configurable: true
    });
    
    Object.defineProperty(this, 'listDescription', {
      get: () => this.description,
      set: (value) => { this.description = value; },
      enumerable: true,
      configurable: true
    });
    
    Object.defineProperty(this, 'visible', {
      get: () => this.visibility === 'public',
      set: (value) => { this.visibility = value ? 'public' : 'private'; },
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
    
    Object.defineProperty(this, 'date', {
      get: () => this.createdAt,
      set: (value) => { this.createdAt = value; },
      enumerable: true,
      configurable: true
    });
    
    // Note: albumList and percentageListened are not in the backend entity
    // They may be stored separately or calculated
    // Keeping them for backward compatibility but they're not part of the core entity
    this.albumList = data.albumList || [];
    this.percentageListened = data.percentageListened || 0;
  }
  
  /**
   * Create a List instance from backend API response
   */
  static fromBackendResponse(data) {
    return new List({
      id: data.id,
      ownerId: data.ownerId,
      title: data.title,
      slug: data.slug,
      listType: data.listType,
      visibility: data.visibility,
      description: data.description,
      coverUrl: data.coverUrl,
      isCollaborative: data.isCollaborative,
      editorIds: data.editorIds || [],
      isPinned: data.isPinned,
      isLocked: data.isLocked,
      itemsCount: data.itemsCount || 0,
      followersCount: data.followersCount || 0,
      likesCount: data.likesCount || 0,
      commentsCount: data.commentsCount || 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      deletedAt: data.deletedAt,
      // Legacy fields if present
      albumList: data.albumList || [],
      percentageListened: data.percentageListened || 0,
    });
  }
  
  /**
   * Convert to CreateListDto format for POST requests
   */
  toCreateDto() {
    return {
      ownerId: this.ownerId,
      title: this.title,
      slug: this.slug || this.generateSlug(),
      description: this.description,
      visibility: this.visibility,
    };
  }
  
  /**
   * Convert to UpdateListDto format for PATCH requests
   */
  toUpdateDto() {
    return {
      title: this.title,
      description: this.description,
      visibility: this.visibility,
    };
  }
  
  /**
   * Generate a URL-safe slug from the title
   */
  generateSlug() {
    if (!this.title) return '';
    return this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
}
