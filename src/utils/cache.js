/**
 * Simple in-memory cache with TTL and LRU eviction
 * For production with multiple servers, consider Redis
 */

class Cache {
    constructor(options = {}) {
        this.maxSize = options.maxSize || 1000;
        this.defaultTTL = options.defaultTTL || 1800000; // 30 minutes in ms
        this.cache = new Map();
        this.accessOrder = new Map(); // Track access time for LRU
    }

    /**
     * Get value from cache
     * @param {string} key 
     * @returns {any|null} Cached value or null if not found/expired
     */
    get(key) {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.accessOrder.delete(key);
            return null;
        }

        // Update access time for LRU
        this.accessOrder.set(key, Date.now());

        return entry.value;
    }

    /**
     * Set value in cache
     * @param {string} key 
     * @param {any} value 
     * @param {number} ttl - Time to live in milliseconds
     */
    set(key, value, ttl = null) {
        const timeToLive = ttl || this.defaultTTL;
        const expiresAt = Date.now() + timeToLive;

        // Evict if cache is full
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this._evictLRU();
        }

        this.cache.set(key, {
            value,
            expiresAt,
            createdAt: Date.now()
        });

        this.accessOrder.set(key, Date.now());
    }

    /**
     * Invalidate (delete) a cache entry
     * @param {string} key 
     */
    invalidate(key) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
    }

    /**
     * Invalidate all keys matching a pattern
     * @param {RegExp|string} pattern 
     */
    invalidatePattern(pattern) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.invalidate(key);
            }
        }
    }

    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
        this.accessOrder.clear();
    }

    /**
     * Get cache statistics
     */
    getStats() {
        let expired = 0;
        const now = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                expired++;
            }
        }

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            expired,
            activeEntries: this.cache.size - expired
        };
    }

    /**
     * Evict least recently used entry
     * @private
     */
    _evictLRU() {
        // Find the least recently accessed key
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, accessTime] of this.accessOrder.entries()) {
            if (accessTime < oldestTime) {
                oldestTime = accessTime;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.invalidate(oldestKey);
        }
    }

    /**
     * Clean up expired entries (run periodically)
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.invalidate(key);
                cleaned++;
            }
        }

        return cleaned;
    }
}

// Create singleton instance
const cache = new Cache({
    maxSize: 1000,
    defaultTTL: 1800000 // 30 minutes
});

// Run cleanup every 5 minutes
setInterval(() => {
    const cleaned = cache.cleanup();
    if (cleaned > 0) {
        console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
}, 300000); // 5 minutes

module.exports = cache;
