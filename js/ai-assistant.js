/**
 * AI Assistant for Anime Website
 * Integrates with OpenRouter API to provide AI chat functionality
 */
class AIAssistant {
    constructor() {
        // Server API endpoint
        this.apiUrl = '/api/ai-assistant';
        
        // DOM Elements
        this.floatingBtn = null;
        this.modal = null;
        this.closeBtn = null;
        this.chatContainer = null;
        this.inputField = null;
        this.sendBtn = null;
        this.historyToggle = null;
        this.historyContainer = null;
        this.typingIndicator = null;
        
        // State
        this.isProcessing = false;
        this.chatHistory = [];
        this.position = 'right'; // 'right' or 'left'
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the AI Assistant
     */
    init() {
        // Initialize dragging state
        this.isDragging = false;
        this.dragStartX = 0;
        this.initialX = 0;
        
        // Create DOM elements if they don't exist
        this.createElements();
        
        // Load chat history from localStorage
        this.loadChatHistory();
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Create necessary DOM elements
     */
    createElements() {
        // Create floating button if it doesn't exist
        if (!document.querySelector('.ai-floating-btn')) {
            const floatingBtn = document.createElement('button');
            floatingBtn.className = 'ai-floating-btn';
            floatingBtn.innerHTML = '<i class="fas fa-robot"></i>';
            floatingBtn.setAttribute('title', 'AI Anime Assistant');
            document.body.appendChild(floatingBtn);
            this.floatingBtn = floatingBtn;
            
            // Set position from localStorage or default to right
            const savedPosition = localStorage.getItem('ai_button_position') || 'right';
            this.position = savedPosition;
            
            // Check if we have a saved x-position
            const savedXPosition = localStorage.getItem('ai_button_x_position');
            
            if (savedXPosition !== null) {
                // Use the exact saved position
                this.floatingBtn.style.left = `${savedXPosition}px`;
                this.floatingBtn.style.right = 'auto';
            } else {
                // Use the default position (left or right)
                if (this.position === 'left') {
                    this.floatingBtn.style.left = '20px';
                    this.floatingBtn.style.right = 'auto';
                } else {
                    this.floatingBtn.style.right = '20px';
                    this.floatingBtn.style.left = 'auto';
                }
            }
        } else {
            this.floatingBtn = document.querySelector('.ai-floating-btn');
        }
        
        // Create modal if it doesn't exist
        if (!document.querySelector('.ai-modal')) {
            const modalHTML = `
                <div class="ai-modal">
                    <div class="ai-modal-content">
                        <div class="ai-modal-header">
                            <h3>AI Anime Assistant</h3>
                            <button class="ai-close-modal"><i class="fas fa-times"></i></button>
                        </div>
                        <div class="ai-modal-body">
                            <button class="ai-history-toggle">
                                <i class="fas fa-history"></i> View Chat History
                            </button>
                            <div class="ai-history-container"></div>
                            <div class="ai-chat-container"></div>
                            <div class="ai-typing" style="display: none;">
                                <span>AI is thinking</span>
                                <div class="dot"></div>
                                <div class="dot"></div>
                                <div class="dot"></div>
                            </div>
                            <div class="ai-input-container">
                                <input type="text" class="ai-input" placeholder="Ask about anime...">
                                <button class="ai-send-btn"><i class="fas fa-paper-plane"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHTML;
            document.body.appendChild(modalContainer.firstElementChild);
            
            this.modal = document.querySelector('.ai-modal');
            this.closeBtn = document.querySelector('.ai-close-modal');
            this.chatContainer = document.querySelector('.ai-chat-container');
            this.inputField = document.querySelector('.ai-input');
            this.sendBtn = document.querySelector('.ai-send-btn');
            this.historyToggle = document.querySelector('.ai-history-toggle');
            this.historyContainer = document.querySelector('.ai-history-container');
            this.typingIndicator = document.querySelector('.ai-typing');
        } else {
            this.modal = document.querySelector('.ai-modal');
            this.closeBtn = document.querySelector('.ai-close-modal');
            this.chatContainer = document.querySelector('.ai-chat-container');
            this.inputField = document.querySelector('.ai-input');
            this.sendBtn = document.querySelector('.ai-send-btn');
            this.historyToggle = document.querySelector('.ai-history-toggle');
            this.historyContainer = document.querySelector('.ai-history-container');
            this.typingIndicator = document.querySelector('.ai-typing');
        }
    }
    
    /**
     * Show welcome message when modal is opened
     */
    showWelcomeMessage() {
        // Only show welcome message if chat is empty
        if (this.chatContainer.children.length > 0) return;
        
        const welcomeHTML = `
            <div class="ai-welcome">
                <h3>Welcome to AniExplore AI Assistant!</h3>
                <p>I can help you discover new anime, learn about your favorite series, or answer questions about characters, genres, and more.</p>
                <p>What would you like to know today?</p>
                <div class="ai-suggestions">
                    <div class="ai-suggestion-chip">Recommend anime like Attack on Titan</div>
                    <div class="ai-suggestion-chip">Best anime of 2024</div>
                    <div class="ai-suggestion-chip">Anime with strong female leads</div>
                    <div class="ai-suggestion-chip">Explain Neon Genesis Evangelion</div>
                </div>
            </div>
        `;
        
        this.chatContainer.innerHTML = welcomeHTML;
        
        // Add click event listeners to suggestion chips
        const suggestionChips = document.querySelectorAll('.ai-suggestion-chip');
        suggestionChips.forEach(chip => {
            chip.addEventListener('click', () => {
                this.inputField.value = chip.textContent;
                this.sendMessage();
            });
        });
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Floating button click
        this.floatingBtn.addEventListener('click', (e) => {
            if (!this.isDragging) {
                this.toggleModal(true);
            }
        });
        
        // Double click to toggle position
        this.floatingBtn.addEventListener('dblclick', (e) => {
            // Toggle position between left and right
            this.position = this.position === 'left' ? 'right' : 'left';
            
            // Apply new position
            if (this.position === 'left') {
                this.floatingBtn.style.left = '20px';
                this.floatingBtn.style.right = 'auto';
            } else {
                this.floatingBtn.style.right = '20px';
                this.floatingBtn.style.left = 'auto';
            }
            
            // Save position to localStorage
            localStorage.setItem('ai_button_position', this.position);
            
            // Remove any saved exact position
            localStorage.removeItem('ai_button_x_position');
        });
        
        // Close button click
        this.closeBtn.addEventListener('click', () => {
            this.toggleModal(false);
        });
        
        // Send button click
        this.sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Input field enter key
        this.inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // History toggle click
        this.historyToggle.addEventListener('click', () => {
            this.toggleChatHistory();
        });
        
        // Mouse events for dragging
        this.floatingBtn.addEventListener('mousedown', this.dragStart.bind(this));
        document.addEventListener('mousemove', this.dragMove.bind(this));
        document.addEventListener('mouseup', this.dragEnd.bind(this));
        
        // Touch events for mobile
        this.floatingBtn.addEventListener('touchstart', this.dragStart.bind(this));
        document.addEventListener('touchmove', this.dragMove.bind(this));
        document.addEventListener('touchend', this.dragEnd.bind(this));
    }
    
    // initDraggable method removed - functionality moved to initEventListeners
    
    /**
     * Handle drag start event
     * @param {Event} e - Mouse or touch event
     */
    dragStart(e) {
        e.preventDefault();
        
        // Get current button position
        const rect = this.floatingBtn.getBoundingClientRect();
        const buttonX = rect.left;
        
        // Store initial positions
        if (e.type === 'touchstart') {
            this.dragStartX = e.touches[0].clientX;
        } else {
            this.dragStartX = e.clientX;
        }
        
        this.initialX = buttonX;
        this.isDragging = true;
        
        // Add dragging class
        this.floatingBtn.classList.add('dragging');
    }
    
    /**
     * Handle drag move event
     * @param {Event} e - Mouse or touch event
     */
    dragMove(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        
        // Ensure no transition during drag for responsive movement
        this.floatingBtn.style.transition = 'none';
        
        // Calculate new position
        let currentX;
        if (e.type === 'touchmove') {
            currentX = e.touches[0].clientX;
        } else {
            currentX = e.clientX;
        }
        
        const deltaX = currentX - this.dragStartX;
        let newX = this.initialX + deltaX;
        
        // Constrain to window bounds with a small margin
        const buttonWidth = this.floatingBtn.offsetWidth;
        const maxX = window.innerWidth - buttonWidth - 10;
        const minX = 10;
        
        if (newX < minX) newX = minX;
        if (newX > maxX) newX = maxX;
        
        // Update button position (x-axis only)
        this.floatingBtn.style.left = `${newX}px`;
        this.floatingBtn.style.right = 'auto';
        
        // Visual feedback - show which side it will snap to
        const windowWidth = window.innerWidth;
        if (newX + (buttonWidth / 2) < windowWidth / 2) {
            // Will snap left
            this.floatingBtn.setAttribute('data-snap', 'left');
        } else {
            // Will snap right
            this.floatingBtn.setAttribute('data-snap', 'right');
        }
    }
    
    /**
     * Handle drag end event
     */
    dragEnd() {
        if (!this.isDragging) return;
        
        // Remove dragging class
        this.floatingBtn.classList.remove('dragging');
        
        // Remove snap indicator
        this.floatingBtn.removeAttribute('data-snap');
        
        // Determine if button should snap to left or right side
        const rect = this.floatingBtn.getBoundingClientRect();
        const position = rect.left;
        const windowWidth = window.innerWidth;
        
        // Add smooth transition for snapping
        this.floatingBtn.style.transition = 'left 0.3s ease, right 0.3s ease';
        
        // Snap to left or right based on current position
        if (position < windowWidth / 2) {
            // Snap to left
            this.position = 'left';
            this.floatingBtn.style.left = '20px';
            this.floatingBtn.style.right = 'auto';
        } else {
            // Snap to right
            this.position = 'right';
            this.floatingBtn.style.right = '20px';
            this.floatingBtn.style.left = 'auto';
        }
        
        // Save position to localStorage
        localStorage.setItem('ai_button_position', this.position);
        
        // Remove any saved exact position since we're snapping
        localStorage.removeItem('ai_button_x_position');
        
        // Reset dragging state
        this.isDragging = false;
        
        // Remove transition after snapping is complete
        setTimeout(() => {
            this.floatingBtn.style.transition = 'background-color 0.3s ease';
        }, 300);
    }
    
    /**
     * Toggle modal visibility
     * @param {boolean} show - Whether to show or hide the modal
     */
    toggleModal(show) {
        if (show) {
            this.modal.classList.add('active');
            this.inputField.focus();
            
            // Show welcome message if this is the first time opening
            this.showWelcomeMessage();
        } else {
            this.modal.classList.remove('active');
        }
    }
    
    /**
     * Toggle floating button position between left and right
     */
    toggleButtonPosition() {
        if (this.position === 'right') {
            this.position = 'left';
            this.floatingBtn.style.left = '20px';
            this.floatingBtn.style.right = 'auto';
        } else {
            this.position = 'right';
            this.floatingBtn.style.right = '20px';
            this.floatingBtn.style.left = 'auto';
        }
        
        // Save position to localStorage
        localStorage.setItem('ai_button_position', this.position);
        
        // Remove any saved exact position
        localStorage.removeItem('ai_button_x_position');
    }
    
    /**
     * Toggle chat history visibility
     */
    toggleChatHistory() {
        const isVisible = this.historyContainer.style.display === 'block';
        
        if (isVisible) {
            this.historyContainer.style.display = 'none';
            this.historyToggle.innerHTML = '<i class="fas fa-history"></i> View Chat History';
        } else {
            this.historyContainer.style.display = 'block';
            this.historyToggle.innerHTML = '<i class="fas fa-times"></i> Hide Chat History';
            this.displayChatHistory();
        }
    }
    
    /**
     * Display chat history in the history container
     */
    displayChatHistory() {
        // Get chat history from localStorage
        const history = JSON.parse(localStorage.getItem('ai_chat_history') || '[]');
        
        // Clear history container
        this.historyContainer.innerHTML = '';
        
        if (history.length === 0) {
            this.historyContainer.innerHTML = '<div class="ai-history-empty">No chat history yet</div>';
            return;
        }
        
        // Create history items in reverse order (newest first)
        history.slice().reverse().forEach((item, index) => {
            const { timestamp, userMessage, aiResponse } = item;
            
            // Format date
            const date = new Date(timestamp);
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            
            // Create history item
            const historyItem = document.createElement('div');
            historyItem.className = 'ai-history-item';
            
            // Determine if aiResponse is JSON string (for anime recommendations)
            let responseDisplay = aiResponse;
            try {
                const parsedResponse = JSON.parse(aiResponse);
                if (parsedResponse && typeof parsedResponse === 'object') {
                    // If it's an anime recommendation, just show the intro text
                    if (parsedResponse.introText) {
                        responseDisplay = parsedResponse.introText + ' [Anime recommendations]';
                    }
                }
            } catch (e) {
                // Not JSON, use as is
            }
            
            historyItem.innerHTML = `
                <div class="ai-history-header">
                    <span class="ai-history-date">${formattedDate}</span>
                    <button class="ai-history-load" data-index="${index}">Load</button>
                </div>
                <div class="ai-history-content">
                    <div class="ai-history-user"><strong>You:</strong> ${userMessage}</div>
                    <div class="ai-history-ai"><strong>AI:</strong> ${responseDisplay}</div>
                </div>
            `;
            
            // Add click event to load button
            const loadButton = historyItem.querySelector('.ai-history-load');
            loadButton.addEventListener('click', () => {
                this.loadChatFromHistory(item);
            });
            
            this.historyContainer.appendChild(historyItem);
        });
    }
    
    /**
     * Load a chat from history
     * @param {Object} historyItem - Chat history item
     */
    loadChatFromHistory(historyItem) {
        const { userMessage, aiResponse } = historyItem;
        
        // Clear chat container
        this.chatContainer.innerHTML = '';
        
        // Add user message
        this.addMessageToChat('user', userMessage);
        
        // Determine if aiResponse is JSON string (for anime recommendations)
        try {
            const parsedResponse = JSON.parse(aiResponse);
            if (parsedResponse && typeof parsedResponse === 'object') {
                // If it has introText and recommendations, it's an anime recommendation
                if (parsedResponse.introText && parsedResponse.recommendations) {
                    this.addMessageToChat('assistant', parsedResponse, true);
                    return;
                }
            }
        } catch (e) {
            // Not JSON, use as is
        }
        
        // Add AI response as regular text
        this.addMessageToChat('assistant', aiResponse);
        
        // Hide history container
        this.historyContainer.style.display = 'none';
        this.historyToggle.innerHTML = '<i class="fas fa-history"></i> View Chat History';
    }
    
    /**
     * Send user message and get AI response
     */
    async sendMessage() {
        const userMessage = this.inputField.value.trim();
        
        if (!userMessage) return;
        
        // Clear input field
        this.inputField.value = '';
        
        // Add user message to chat
        this.addMessageToChat('user', userMessage);
        
        // Show typing indicator
        this.typingIndicator.style.display = 'flex';
        
        try {
            // Get AI response
            const response = await this.getAIResponse(userMessage);
            
            // Hide typing indicator
            this.typingIndicator.style.display = 'none';
            
            // Add AI response to chat based on type
            if (response.isAnimeRecommendation) {
                // For anime recommendations, display as cards
                this.addMessageToChat('assistant', response.content, true);
            } else {
                // For regular text responses
                this.addMessageToChat('assistant', response.content);
            }
            
            // Save to chat history (store the raw content for now)
            this.saveToHistory(userMessage, typeof response.content === 'object' ? 
                JSON.stringify(response.content) : response.content);
        } catch (error) {
            // Hide typing indicator
            this.typingIndicator.style.display = 'none';
            
            // Show error message
            this.addMessageToChat('assistant', 'Sorry, I encountered an error. Please try again later.');
            console.error('Error in sendMessage:', error);
        }
    }
    
    /**
     * Add message to chat container
     * @param {string} role - 'user' or 'assistant'
     * @param {*} content - Message content (string or object for anime recommendations)
     * @param {boolean} isAnimeRecommendation - Whether this is an anime recommendation
     */
    addMessageToChat(role, content, isAnimeRecommendation = false) {
        const messageElement = document.createElement('div');
        messageElement.className = `ai-message ${role}`;
        
        if (role === 'assistant' && isAnimeRecommendation) {
            // Handle anime recommendation display
            const { introText, recommendations } = content;
            
            // Create intro text
            const introElement = document.createElement('p');
            introElement.textContent = introText;
            messageElement.appendChild(introElement);
            
            // Create anime cards container
            const cardsContainer = document.createElement('div');
            cardsContainer.className = 'anime-cards-container';
            
            // Add each anime card
            recommendations.forEach(anime => {
                const card = this.createAnimeCard(anime);
                cardsContainer.appendChild(card);
            });
            
            messageElement.appendChild(cardsContainer);
        } else {
            // Regular text message
            messageElement.textContent = content;
        }
        
        this.chatContainer.appendChild(messageElement);
        
        // Scroll to bottom
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
    
    /**
     * Create an anime card element
     * @param {Object} anime - Anime data
     * @returns {HTMLElement} - Card element
     */
    createAnimeCard(anime) {
        const { title, year, genres, rating, imageUrl, description, malId } = anime;
        
        const card = document.createElement('div');
        card.className = 'anime-card';
        
        // Use a placeholder image if the URL is invalid or missing
        const safeImageUrl = imageUrl || `https://via.placeholder.com/150x225?text=${encodeURIComponent(title)}`;
        
        // Create genre badges if available
        let genreBadges = '';
        if (genres && Array.isArray(genres) && genres.length > 0) {
            genreBadges = '<div class="anime-card-genres">' + 
                genres.slice(0, 3).map(genre => `<span class="genre-badge">${genre}</span>`).join('') + 
                '</div>';
        }
        
        card.innerHTML = `
            <img src="${safeImageUrl}" alt="${title}" class="anime-card-image" onerror="this.src='https://via.placeholder.com/150x225?text=No+Image'">
            <div class="anime-card-content">
                <div class="anime-card-title">${title}</div>
                <div class="anime-card-info">
                    <span>${year || 'N/A'}</span>
                    <span>⭐ ${rating || 'N/A'}</span>
                </div>
                ${genreBadges}
                <div class="anime-card-description">${description || 'No description available.'}</div>
                <div class="anime-card-actions">
                    <a href="#" class="anime-card-link view-details" data-title="${title}">View Details</a>
                    <a href="#" class="anime-card-link create-party" data-title="${title}">Create Watch Party</a>
                </div>
            </div>
        `;
        
        // Add click event to the view details link
        const detailsLink = card.querySelector('.view-details');
        detailsLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.fetchAnimeDetails(title);
        });
        
        // Add click event to the create watch party link
        const partyLink = card.querySelector('.create-party');
        partyLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.createWatchParty(title);
        });
        
        return card;
    }
    
    /**
     * Fetch anime details from the Jikan API via our server
     * @param {string} title - Anime title
     */
    async fetchAnimeDetails(title) {
        try {
            const response = await fetch(`/api/anime-info/${encodeURIComponent(title)}`);
            const data = await response.json();
            
            if (data.success && data.animeInfo) {
                // Redirect to the details page with the anime ID
                window.location.href = `details.html?id=${data.animeInfo.mal_id}`;
            } else {
                console.error('Anime not found:', title);
                alert(`Sorry, we couldn't find detailed information for "${title}".`);
            }
        } catch (error) {
            console.error('Error fetching anime details:', error);
            alert('An error occurred while fetching anime details.');
        }
    }
    
    /**
     * Create a watch party room for an anime
     * @param {string} title - Anime title
     */
    async createWatchParty(title) {
        try {
            // First, check if the user is logged in
            if (typeof sessionManager === 'undefined') {
                // Load session manager if not already loaded
                await this.loadSessionManagerScript();
            }
            
            const session = sessionManager.getSession();
            
            if (!session) {
                alert('You need to be logged in to create a watch party room');
                return;
            }
            
            // Create a room name based on the anime title
            const roomName = `${title} Watch Party`;
            
            // Create the room via API
            const response = await fetch('/api/party/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomName,
                    userToken: session.token
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Add a message to the chat about the successful room creation
                this.addMessageToChat('assistant', `Watch party room "${roomName}" created successfully! Room token: ${data.roomToken}`);
                
                // Save room info to localStorage
                localStorage.setItem('party_room_token', data.roomToken);
                localStorage.setItem('party_room_name', roomName);
                localStorage.setItem('party_is_host', 'true');
                
                // Ask user if they want to join the room now
                if (confirm(`Watch party room for "${title}" created successfully! Do you want to join it now?`)) {
                    // Redirect to party page
                    window.location.href = 'party.html';
                }
            } else {
                this.addMessageToChat('assistant', `Error creating watch party room: ${data.error}`);
            }
        } catch (error) {
            console.error('Error creating watch party room:', error);
            this.addMessageToChat('assistant', 'An error occurred while creating the watch party room.');
        }
    }
    
    /**
     * Load the session manager script if not already loaded
     * @returns {Promise} - Resolves when the script is loaded
     */
    loadSessionManagerScript() {
        return new Promise((resolve, reject) => {
            if (typeof sessionManager !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = '/js/session-manager.js';
            script.onload = () => resolve();
            script.onerror = (error) => reject(error);
            document.body.appendChild(script);
        });
    }
    
    /**
     * Get response from server API endpoint
     * @param {string} userMessage - User message
     * @returns {Promise<Object>} - AI response with type and content
     */
    async getAIResponse(userMessage) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: userMessage })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to get AI response');
            }
            
            // Check if this is an anime recommendation
            if (data.isAnimeRecommendation) {
                return {
                    isAnimeRecommendation: true,
                    isWatchPartyRequest: false,
                    content: data.response
                };
            }
            
            // Check if this is a watch party request
            if (data.isWatchPartyRequest) {
                // If the AI provided an anime title, create a watch party
                if (data.response.animeTitle) {
                    // Create a watch party for the anime
                    this.createWatchParty(data.response.animeTitle);
                }
                
                return {
                    isAnimeRecommendation: false,
                    isWatchPartyRequest: true,
                    content: data.response.message
                };
            }
            
            // Regular text response
            return {
                isAnimeRecommendation: false,
                isWatchPartyRequest: false,
                content: data.response
            };
        } catch (error) {
            console.error('Error getting AI response:', error);
            throw error;
        }
    }
    
    /**
     * Save conversation to history
     * @param {string} userMessage - User message
     * @param {string} aiResponse - AI response
     */
    saveToHistory(userMessage, aiResponse) {
        // Get existing history or initialize empty array
        const history = JSON.parse(localStorage.getItem('ai_chat_history') || '[]');
        
        // Add new conversation
        history.push({
            timestamp: new Date().toISOString(),
            userMessage,
            aiResponse
        });
        
        // Limit history to last 10 conversations
        const limitedHistory = history.slice(-10);
        
        // Save to localStorage
        localStorage.setItem('ai_chat_history', JSON.stringify(limitedHistory));
        
        // Update history container if visible
        if (this.historyContainer.style.display === 'block') {
            this.displayChatHistory();
        }
    }
    
    /**
     * Load chat history from localStorage
     */
    loadChatHistory() {
        const savedHistory = localStorage.getItem('ai_chat_history');
        
        if (savedHistory) {
            try {
                this.chatHistory = JSON.parse(savedHistory);
            } catch (error) {
                console.error('Error parsing chat history:', error);
                this.chatHistory = [];
            }
        }
    }
    
    /**
     * Render chat history in the history container
     */
    renderChatHistory() {
        // Clear history container
        this.historyContainer.innerHTML = '';
        
        if (this.chatHistory.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'ai-history-empty';
            emptyMessage.textContent = 'No chat history yet';
            this.historyContainer.appendChild(emptyMessage);
            return;
        }
        
        // Add each conversation to history container
        this.chatHistory.forEach(conversation => {
            const historyItem = document.createElement('div');
            historyItem.className = 'ai-history-item';
            
            // Format timestamp
            const date = new Date(conversation.timestamp);
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            
            // Get first user message as preview
            const preview = conversation.messages[0].content;
            const truncatedPreview = preview.length > 30 ? preview.substring(0, 30) + '...' : preview;
            
            historyItem.innerHTML = `
                <div class="ai-history-time">${formattedDate}</div>
                <div class="ai-history-preview">${truncatedPreview}</div>
            `;
            
            // Add click event to load this conversation
            historyItem.addEventListener('click', () => {
                this.loadConversation(conversation);
            });
            
            this.historyContainer.appendChild(historyItem);
        });
    }
    
    /**
     * Load a conversation from history into the chat
     * @param {Object} conversation - Conversation object
     */
    loadConversation(conversation) {
        // Clear chat container
        this.chatContainer.innerHTML = '';
        
        // Add each message to chat
        conversation.messages.forEach(message => {
            this.addMessageToChat(message.role, message.content);
        });
        
        // Hide history
        this.historyContainer.classList.remove('active');
    }
}

// Initialize AI Assistant when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load Font Awesome if not already loaded
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fontAwesomeLink = document.createElement('link');
        fontAwesomeLink.rel = 'stylesheet';
        fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
        document.head.appendChild(fontAwesomeLink);
    }
    
    // Load AI Assistant CSS if not already loaded
    if (!document.querySelector('link[href*="ai-assistant.css"]')) {
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'css/ai-assistant.css';
        document.head.appendChild(cssLink);
    }
    
    // Initialize AI Assistant
    window.aiAssistant = new AIAssistant();
});

// Initialize AI Assistant if the DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        if (!window.aiAssistant) {
            window.aiAssistant = new AIAssistant();
        }
    }, 100);
}
