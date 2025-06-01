/**
 * API Service for Jikan API (Unofficial MyAnimeList API)
 * Documentation: https://docs.api.jikan.moe/
 */
class AnimeAPI {
    constructor() {
        this.baseUrl = 'https://api.jikan.moe/v4';
        // Rate limiting - Jikan API has a limit of 3 requests per second and 60 per minute
        this.requestQueue = [];
        this.processing = false;
        this.retryDelay = 2000; // Initial retry delay in ms
        this.maxRetries = 5; // Maximum number of retries
        this.requestsThisMinute = 0;
        this.lastRequestTime = 0;
        
        // Initialize cache
        this.cache = {};
        this.cacheExpiry = 15 * 60 * 1000; // Cache expiry time in ms (15 minutes)
        
        // Try to load cache from localStorage
        this.loadCacheFromStorage();
    }
    
    /**
     * Helper function to calculate match score
     * @param {string} title - Anime title
     * @param {Array} queryWords - Query words
     * @returns {number} - Match score
     */
    calculateMatchScore(title, queryWords) {
        let score = 0;

        // Exact match gets highest score
        if (title === queryWords.join(' ')) {
            return 1000;
        }

        // Check each query word
        queryWords.forEach(word => {
            // Word at start of title gets high score
            if (title.startsWith(word)) {
                score += 100;
            }

            // Word as whole word in title gets medium score
            if (title.includes(` ${word} `) || title.includes(` ${word}`) || title.includes(`${word} `)) {
                score += 50;
            }

            // Word as substring gets low score
            if (title.includes(word)) {
                score += 10;
            }

            // Check for similar words (e.g., "leveling" vs "levelling")
            if (title.includes(word.replace(/ing$/, 'ing')) ||
                title.includes(word.replace(/ing$/, 'ing'))) {
                score += 5;
            }
        });

        return score;
    }

    /**
     * Helper function to normalize title
     * @param {string} title - Anime title
     * @returns {string} - Normalized title
     */
    normalizeTitle(title) {
        return title.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special characters
            .replace(/\s+/g, ' ')        // Normalize spaces
            .trim();
    }

    /**
     * Process the request queue with rate limiting
     */
    async processQueue() {
        if (this.processing || this.requestQueue.length === 0) return;
        
        // Check if we need to throttle requests (60 per minute limit)
        const now = Date.now();
        const elapsedSinceLastRequest = now - this.lastRequestTime;
        
        // Reset counter if more than a minute has passed
        if (elapsedSinceLastRequest > 60000) {
            this.requestsThisMinute = 0;
        }
        
        // If we're approaching the limit, add delay
        if (this.requestsThisMinute >= 50) {
            const timeToWait = Math.max(0, 60000 - elapsedSinceLastRequest + 1000);
            if (timeToWait > 0) {
                console.log(`Approaching rate limit (${this.requestsThisMinute}/60). Waiting ${timeToWait}ms before next request.`);
                setTimeout(() => {
                    this.requestsThisMinute = 0;
                    this.processQueue();
                }, timeToWait);
                return;
            }
            this.requestsThisMinute = 0;
        }
        
        this.processing = true;
        const { url, resolve, reject, retries = 0 } = this.requestQueue.shift();
        
        try {
            // Update rate limit tracking
            this.lastRequestTime = Date.now();
            this.requestsThisMinute++;
            
            const response = await fetch(url);
            
            // Handle rate limiting (429) or server errors (5xx)
            if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
                if (retries < this.maxRetries) {
                    console.log(`Rate limited or server error. Retrying (${retries + 1}/${this.maxRetries})...`);
                    // Put back in queue with increased retries
                    this.requestQueue.unshift({ url, resolve, reject, retries: retries + 1 });
                    // Exponential backoff with jitter
                    const backoffDelay = this.retryDelay * Math.pow(2, retries) * (0.8 + Math.random() * 0.4);
                    console.log(`Backing off for ${Math.round(backoffDelay)}ms`);
                    setTimeout(() => {
                        this.processing = false;
                        this.processQueue();
                    }, backoffDelay);
                    return;
                } else {
                    console.error(`Max retries (${this.maxRetries}) reached for ${url}`);
                }
            }
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            resolve(data);
        } catch (error) {
            console.error('API Request Error:', error);
            reject(error);
        } finally {
            this.processing = false;
            // Wait longer between requests to avoid rate limiting
            const waitTime = 1000 + Math.random() * 500; // 1000-1500ms
            setTimeout(() => this.processQueue(), waitTime);
        }
    }

    /**
     * Add a request to the queue
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @returns {Promise} - Promise that resolves with the API response
     */
    async request(endpoint, params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const url = `${this.baseUrl}${endpoint}${queryParams ? '?' + queryParams : ''}`;
        
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ url, resolve, reject });
            this.processQueue();
        });
    }

    /**
     * Fetch popular anime directly without using the request queue
     * @param {number} limit - Number of results to return
     * @returns {Promise} - Promise that resolves with an array of anime data
     */
    async fetchPopularAnime(limit = 20) {
        const cacheKey = `popular_anime_${limit}`;
        
        // Try to get from cache first
        const cachedData = this.getFromCache(cacheKey);
        if (cachedData) {
            return cachedData;
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/top/anime?filter=bypopularity&limit=${limit}`);
            if (!response.ok) {
                if (response.status === 429) {
                    // Handle rate limiting
                    const retryAfter = response.headers.get('Retry-After') || 2;
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    return this.fetchPopularAnime(limit);
                }
                throw new Error(`API Error: ${response.status}`);
            }
            const data = await response.json();
            const animeData = data.data || [];
            
            // Save to cache
            if (animeData.length > 0) {
                this.saveToCache(cacheKey, animeData);
            }
            
            return animeData;
        } catch (error) {
            console.error('Error fetching popular anime:', error);
            return [];
        }
    }
    
    /**
     * Fetch new anime releases directly without using the request queue
     * @param {number} limit - Number of results to return
     * @returns {Promise} - Promise that resolves with an array of anime data
     */
    async fetchNewReleases(limit = 20) {
        const cacheKey = `new_releases_${limit}`;
        
        // Try to get from cache first
        const cachedData = this.getFromCache(cacheKey);
        if (cachedData) {
            return cachedData;
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/seasons/now?limit=${limit}`);
            if (!response.ok) {
                if (response.status === 429) {
                    // Handle rate limiting
                    const retryAfter = response.headers.get('Retry-After') || 2;
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    return this.fetchNewReleases(limit);
                }
                throw new Error(`API Error: ${response.status}`);
            }
            const data = await response.json();
            const animeData = data.data || [];
            
            // Save to cache
            if (animeData.length > 0) {
                this.saveToCache(cacheKey, animeData);
            }
            
            return animeData;
        } catch (error) {
            console.error('Error fetching new releases:', error);
            return [];
        }
    }
    
    /**
     * Fetch highest rated anime directly without using the request queue
     * @param {number} limit - Number of results to return
     * @returns {Promise} - Promise that resolves with an array of anime data
     */
    async fetchHighestRatedAnime(limit = 20) {
        const cacheKey = `highest_rated_anime_${limit}`;
        
        // Try to get from cache first
        const cachedData = this.getFromCache(cacheKey);
        if (cachedData) {
            return cachedData;
        }
        
        try {
            // According to Jikan API docs, we should use the top anime endpoint
            // Valid filters are: airing, upcoming, bypopularity, favorite
            // For highest rated, we don't specify a filter to get default scoring
            const response = await fetch(`${this.baseUrl}/top/anime?limit=${limit}`);
            if (!response.ok) {
                if (response.status === 429) {
                    // Handle rate limiting
                    const retryAfter = response.headers.get('Retry-After') || 2;
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    return this.fetchHighestRatedAnime(limit);
                }
                console.warn(`API Error fetching highest rated anime: ${response.status}`);
                // Return empty array instead of throwing to prevent page load failure
                return [];
            }
            const data = await response.json();
            // The top anime endpoint already returns anime sorted by score
            // but we'll ensure it's sorted correctly
            const sortedData = data.data
                .filter(anime => anime.score) // Filter out anime without scores
                .sort((a, b) => b.score - a.score);
            
            // Save to cache
            if (sortedData.length > 0) {
                this.saveToCache(cacheKey, sortedData);
            }
            
            return sortedData || [];
        } catch (error) {
            console.error('Error fetching highest rated anime:', error);
            return [];
        }
    }
    
    /**
     * Get top anime (using request queue - may be less reliable)
     * @param {string} type - Type of ranking (all, airing, upcoming, etc.)
     * @param {number} page - Page number
     * @param {number} limit - Number of results per page
     * @returns {Promise} - Promise that resolves with the API response
     */
    async getTopAnime(filter = 'bypopularity', page = 1, limit = 12) {
        // In Jikan API v4, 'filter' should be one of: airing, upcoming, bypopularity, favorite
        // The old 'type' parameter is no longer supported
        return this.request('/top/anime', { 
            page, 
            limit,
            filter // Using the proper filter parameter
        });
    }

    /**
     * Search for anime
     * @param {string} query - Search query
     * @param {number} page - Page number
     * @param {number} limit - Number of results per page
     * @returns {Promise} - Promise that resolves with the API response
     */
    async searchAnime(query, page = 1, limit = 12) {
        return this.request('/anime', { 
            q: query, 
            page, 
            limit 
        });
    }

    /**
     * Get anime by ID
     * @param {number} id - Anime ID
     * @returns {Promise} - Promise that resolves with the API response
     */
    async getAnimeById(id) {
        return this.request(`/anime/${id}/full`);
    }

    /**
     * Get anime episodes
     * @param {number} id - Anime ID
     * @param {number} page - Page number
     * @returns {Promise} - Promise that resolves with the API response
     */
    async getAnimeEpisodes(id, page = 1) {
        return this.request(`/anime/${id}/episodes`, { page });
    }

    /**
     * Get seasonal anime
     * @param {number} year - Year
     * @param {string} season - Season (winter, spring, summer, fall)
     * @param {number} page - Page number
     * @param {number} limit - Number of results per page
     * @returns {Promise} - Promise that resolves with the API response
     */
    async getSeasonalAnime(year, season, page = 1, limit = 12) {
        return this.request(`/seasons/${year}/${season}`, { 
            page, 
            limit 
        });
    }

    /**
     * Get current season anime
     * @param {number} page - Page number
     * @param {number} limit - Number of results per page
     * @returns {Promise} - Promise that resolves with the API response
     */
    async getCurrentSeasonAnime(page = 1, limit = 12) {
        return this.request('/seasons/now', { 
            page, 
            limit 
        });
    }

    /**
     * Get anime genres
     * @returns {Promise} - Promise that resolves with the API response
     */
    async getAnimeGenres() {
        return this.request('/genres/anime');
    }

    /**
     * Get anime by genre
     * @param {number} genreId - Genre ID
     * @param {number} page - Page number
     * @param {number} limit - Number of results per page
     * @returns {Promise} - Promise that resolves with the API response
     */
    async getAnimeByGenre(genreId, page = 1, limit = 12) {
        return this.request('/anime', { 
            genres: genreId, 
            page, 
            limit 
        });
    }
    
    /**
     * Get anime by exact title
     * @param {string} title - Exact anime title
     * @returns {Promise} - Promise that resolves with the API response
     */
    async getAnimeByTitle(title) {
        return this.request('/anime', {
            q: title,
            limit: 5 // Limit to 5 results for exact matches
        });
    }
    
    /**
     * Get multiple specific anime titles
     * @param {Array} titles - Array of anime titles to search for
     * @returns {Promise} - Promise that resolves with an array of anime data
     */
    async getSpecificAnimes(titles) {
        try {
            // Create a cache key based on the titles array
            const titlesKey = titles.sort().join('_').toLowerCase();
            const cacheKey = `specific_animes_${titlesKey}`;
            
            // Try to get from cache first
            const cachedData = this.getFromCache(cacheKey);
            if (cachedData) {
                return cachedData;
            }
            
            const results = [];
            const pendingTitles = [];
            
            // Check individual title cache first
            for (const title of titles) {
                const titleCacheKey = `anime_title_${title.toLowerCase()}`;
                const cachedTitle = this.getFromCache(titleCacheKey);
                
                if (cachedTitle) {
                    results.push(cachedTitle);
                } else {
                    pendingTitles.push(title);
                }
            }
            
            // For each uncached title, search and find the best match
            for (const title of pendingTitles) {
                try {
                    // Use a direct fetch with error handling instead of the queue system
                    // This provides better control over individual title errors
                    const url = `${this.baseUrl}/anime?q=${encodeURIComponent(title)}&limit=5`;
                    const response = await fetch(url);
                    
                    if (!response.ok) {
                        console.warn(`Error fetching anime "${title}": ${response.status}`);
                        // Continue to next title instead of failing the whole batch
                        continue;
                    }
                    
                    const data = await response.json();
                    const animeList = data.data || [];
                    
                    if (animeList.length > 0) {
                        // Normalize search query
                        const normalizedQuery = this.normalizeTitle(title);
                        const queryWords = normalizedQuery.split(' ');
                        
                        // Score each result for relevance
                        const scoredResults = animeList.map(anime => {
                            const normalizedTitle = this.normalizeTitle(anime.title);
                            const score = this.calculateMatchScore(normalizedTitle, queryWords);
                            return { anime, score };
                        });
                        
                        // Sort by score (highest first) and take the best match
                        scoredResults.sort((a, b) => b.score - a.score);
                        const bestMatch = scoredResults[0].anime;
                        
                        // Cache individual title result
                        const titleCacheKey = `anime_title_${title.toLowerCase()}`;
                        this.saveToCache(titleCacheKey, bestMatch);
                        
                        results.push(bestMatch);
                    }
                } catch (titleError) {
                    console.warn(`Error processing anime "${title}": ${titleError.message}`);
                    // Continue to next title instead of failing the whole batch
                }
                
                // Add delay between requests to avoid rate limiting
                if (pendingTitles.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            // Cache the complete results
            if (results.length > 0) {
                this.saveToCache(cacheKey, results);
            }
            
            return results;
        } catch (error) {
            console.error('Error getting specific animes:', error);
            return [];
        }
    }

    /**
     * Get anime characters
     * @param {number} animeId - Anime ID
     * @returns {Promise} - Promise that resolves with an array of character data
     */
    async getAnimeCharacters(animeId) {
        try {
            const response = await fetch(`${this.baseUrl}/anime/${animeId}/characters`);
            if (!response.ok) {
                if (response.status === 429) {
                    // Handle rate limiting
                    const retryAfter = response.headers.get('Retry-After') || 2;
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    return this.getAnimeCharacters(animeId);
                }
                throw new Error(`API Error: ${response.status}`);
            }
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching anime characters:', error);
            return [];
        }
    }
    
    /**
     * Get anime staff
     * @param {number} animeId - Anime ID
     * @returns {Promise} - Promise that resolves with an array of staff data
     */
    async getAnimeStaff(animeId) {
        try {
            const response = await fetch(`${this.baseUrl}/anime/${animeId}/staff`);
            if (!response.ok) {
                if (response.status === 429) {
                    // Handle rate limiting
                    const retryAfter = response.headers.get('Retry-After') || 2;
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    return this.getAnimeStaff(animeId);
                }
                throw new Error(`API Error: ${response.status}`);
            }
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching anime staff:', error);
            return [];
        }
    }
    
    /**
     * Get anime reviews
     * @param {number} animeId - Anime ID
     * @returns {Promise} - Promise that resolves with an array of review data
     */
    async getAnimeReviews(animeId) {
        try {
            const response = await fetch(`${this.baseUrl}/anime/${animeId}/reviews`);
            if (!response.ok) {
                if (response.status === 429) {
                    // Handle rate limiting
                    const retryAfter = response.headers.get('Retry-After') || 2;
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    return this.getAnimeReviews(animeId);
                }
                throw new Error(`API Error: ${response.status}`);
            }
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching anime reviews:', error);
            return [];
        }
    }
    
    /**
     * Get anime recommendations
     * @param {number} animeId - Anime ID
     * @returns {Promise} - Promise that resolves with an array of recommendation data
     */
    async getAnimeRecommendations(animeId) {
        try {
            const response = await fetch(`${this.baseUrl}/anime/${animeId}/recommendations`);
            if (!response.ok) {
                if (response.status === 429) {
                    // Handle rate limiting
                    const retryAfter = response.headers.get('Retry-After') || 2;
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    return this.getAnimeRecommendations(animeId);
                }
                throw new Error(`API Error: ${response.status}`);
            }
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching anime recommendations:', error);
            return [];
        }
    }
    
    /**
     * Load cache from localStorage
     */
    loadCacheFromStorage() {
        try {
            const cachedData = localStorage.getItem('animeAPICache');
            if (cachedData) {
                const parsedCache = JSON.parse(cachedData);
                // Only use cache if it's not expired
                if (parsedCache.timestamp && (Date.now() - parsedCache.timestamp) < this.cacheExpiry) {
                    this.cache = parsedCache.data || {};
                    console.log('Loaded anime data from cache');
                } else {
                    // Cache is expired, clear it
                    localStorage.removeItem('animeAPICache');
                    this.cache = {};
                    console.log('Cache expired, cleared');
                }
            }
        } catch (error) {
            console.error('Error loading cache:', error);
            this.cache = {};
        }
    }
    
    /**
     * Save cache to localStorage
     */
    saveCacheToStorage() {
        try {
            const cacheData = {
                timestamp: Date.now(),
                data: this.cache
            };
            localStorage.setItem('animeAPICache', JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error saving cache:', error);
        }
    }
    
    /**
     * Get data from cache
     * @param {string} key - Cache key
     * @returns {Object|null} - Cached data or null if not found
     */
    getFromCache(key) {
        if (this.cache[key] && this.cache[key].timestamp) {
            // Check if cache entry is expired
            if ((Date.now() - this.cache[key].timestamp) < this.cacheExpiry) {
                console.log(`Cache hit for ${key}`);
                return this.cache[key].data;
            } else {
                // Remove expired cache entry
                delete this.cache[key];
                this.saveCacheToStorage();
            }
        }
        return null;
    }
    
    /**
     * Save data to cache
     * @param {string} key - Cache key
     * @param {Object} data - Data to cache
     */
    saveToCache(key, data) {
        this.cache[key] = {
            timestamp: Date.now(),
            data: data
        };
        // Debounce saving to storage to prevent excessive writes
        if (this._saveCacheTimeout) {
            clearTimeout(this._saveCacheTimeout);
        }
        this._saveCacheTimeout = setTimeout(() => {
            this.saveCacheToStorage();
        }, 2000);
    }
}

// Create a singleton instance
const animeAPI = new AnimeAPI();
