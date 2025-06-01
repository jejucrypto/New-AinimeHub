/**
 * Session Manager for the anime website
 * Handles user session tokens and persistence across pages
 */

class SessionManager {
    constructor() {
        this.tokenKey = 'aniexplore_user_token';
        this.usernameKey = 'aniexplore_username';
        this.avatarKey = 'aniexplore_avatar';
        this.sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }

    /**
     * Generate a unique token
     * @returns {string} - Unique token
     */
    generateToken() {
        const timestamp = new Date().getTime();
        const randomPart = Math.random().toString(36).substring(2, 15);
        return `${timestamp}-${randomPart}`;
    }

    /**
     * Save user session to localStorage
     * @param {string} username - User's username
     * @param {string} avatar - User's avatar URL
     * @param {string} token - Server-provided token (optional)
     * @returns {string} - Saved token
     */
    saveSession(username, avatar, token = null) {
        // Use provided token or generate a new one
        const sessionToken = token || this.generateToken();
        
        // Save to localStorage
        localStorage.setItem(this.tokenKey, sessionToken);
        localStorage.setItem(this.usernameKey, username);
        localStorage.setItem(this.avatarKey, avatar);
        
        // Set expiration time
        const expirationTime = new Date().getTime() + this.sessionDuration;
        localStorage.setItem('aniexplore_session_expiry', expirationTime);
        
        return sessionToken;
    }

    /**
     * Check if a session exists and is valid
     * @returns {boolean} - Whether a valid session exists
     */
    hasValidSession() {
        const token = localStorage.getItem(this.tokenKey);
        const expirationTime = localStorage.getItem('aniexplore_session_expiry');
        
        if (!token || !expirationTime) {
            return false;
        }
        
        // Check if session has expired
        const currentTime = new Date().getTime();
        if (currentTime > parseInt(expirationTime)) {
            this.clearSession();
            return false;
        }
        
        return true;
    }

    /**
     * Get the current session data
     * @returns {Object|null} - Session data or null if no valid session
     */
    getSession() {
        if (!this.hasValidSession()) {
            return null;
        }
        
        return {
            token: localStorage.getItem(this.tokenKey),
            username: localStorage.getItem(this.usernameKey),
            avatar: localStorage.getItem(this.avatarKey)
        };
    }

    /**
     * Clear the current session
     */
    clearSession() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.usernameKey);
        localStorage.removeItem(this.avatarKey);
        localStorage.removeItem('aniexplore_session_expiry');
    }

    /**
     * Extend the current session
     */
    extendSession() {
        if (this.hasValidSession()) {
            const expirationTime = new Date().getTime() + this.sessionDuration;
            localStorage.setItem('aniexplore_session_expiry', expirationTime);
        }
    }
}

// Create a singleton instance
const sessionManager = new SessionManager();
