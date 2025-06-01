/**
 * Chat functionality for the anime website using Socket.IO
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Load session manager script first and wait for it to load
    await loadSessionManagerScript();
    
    // Load Socket.IO script dynamically
    loadSocketIOScript();
});

/**
 * Load session manager script dynamically
 */
function loadSessionManagerScript() {
    return new Promise((resolve) => {
        // Check if script is already loaded
        if (document.querySelector('script[src="/js/session-manager.js"]')) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = '/js/session-manager.js';
        script.onload = () => {
            console.log('Session manager loaded');
            resolve();
        };
        document.head.appendChild(script);
    });
}

/**
 * Load Socket.IO script dynamically
 */
function loadSocketIOScript() {
    return new Promise((resolve, reject) => {
        // Check if script is already loaded
        if (document.querySelector('script[src="https://cdn.socket.io/4.7.2/socket.io.min.js"]')) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        script.integrity = 'sha384-mZLF4UVrpi/QTWPA7BjNPEnkIfRFn4ZEO3Qt/HFklTJBj/gBOV8G3HcKn4NfQblz';
        script.crossOrigin = 'anonymous';
        
        script.onload = () => {
            console.log('Socket.IO loaded');
            // Make sure sessionManager is available before initializing chat
            setTimeout(() => {
                if (typeof sessionManager !== 'undefined') {
                    // Initialize chat manager after Socket.IO is loaded
                    initializeChat();
                    resolve();
                } else {
                    console.error('Session manager not available');
                    reject(new Error('Session manager not available'));
                }
            }, 100);
        };
        
        script.onerror = () => {
            console.error('Failed to load Socket.IO script');
            // Fall back to mock chat if Socket.IO fails to load
            initializeMockChat();
            reject(new Error('Failed to load Socket.IO'));
        };
        
        document.head.appendChild(script);
    });
}

/**
 * Initialize real-time chat with Socket.IO
 */
function initializeChat() {
    // DOM Elements
    const chatContainer = document.getElementById('chat-container');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    
    // Chat state
    let username = 'User_' + Math.floor(Math.random() * 1000);
    let avatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username);
    let socket = null;
    let connected = false;
    let sessionToken = null;
    
    // Connect to Socket.IO server
    try {
        socket = io('https://new-ainimehub-production.up.railway.app/');
        
        // Connection event
        socket.on('connect', () => {
            console.log('Connected to chat server');
            connected = true;
            addSystemMessage('Connected to the chat server');
            
            // Check if we have a valid session
            if (typeof sessionManager !== 'undefined' && sessionManager.hasValidSession()) {
                const session = sessionManager.getSession();
                sessionToken = session.token;
                
                // Authenticate with the server using the token
                socket.emit('authenticate', { token: sessionToken });
            } else {
                // Ask for username if no session exists
                setTimeout(() => {
                    const newUsername = prompt('Enter your username for the chat:', username);
                    if (newUsername && newUsername.trim() !== '') {
                        username = newUsername.trim();
                        avatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username);
                        
                        // Join the chat with the username
                        socket.emit('join', { username, avatar });
                    }
                }, 1000);
            }
        });
        
        // Authentication success event
        socket.on('auth_success', (data) => {
            console.log('Authentication successful');
            username = data.username;
            avatar = data.avatar;
            addSystemMessage(`Welcome back, ${username}!`);
            
            // Extend the session
            if (typeof sessionManager !== 'undefined') {
                sessionManager.extendSession();
            }
        });
        
        // Authentication error event
        socket.on('auth_error', (data) => {
            console.log('Authentication failed:', data.message);
            addSystemMessage('Session expired. Please enter a new username.');
            
            // Clear the invalid session
            if (typeof sessionManager !== 'undefined') {
                sessionManager.clearSession();
            }
            
            // Ask for a new username
            setTimeout(() => {
                const newUsername = prompt('Enter your username for the chat:', username);
                if (newUsername && newUsername.trim() !== '') {
                    username = newUsername.trim();
                    avatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username);
                    
                    // Join the chat with the username
                    socket.emit('join', { username, avatar });
                }
            }, 1000);
        });
        
        // Token created event
        socket.on('token_created', (data) => {
            console.log('Token created');
            sessionToken = data.token;
            
            // Save the session to localStorage with the server-provided token
            if (typeof sessionManager !== 'undefined') {
                sessionManager.saveSession(data.username, data.avatar, data.token);
            }
        });
        
        // Disconnection event
        socket.on('disconnect', () => {
            console.log('Disconnected from chat server');
            connected = false;
            addSystemMessage('Disconnected from the chat server. Trying to reconnect...');
        });
        
        // Load previous messages
        socket.on('load_messages', (messages) => {
            // Clear existing messages
            chatMessages.innerHTML = '';
            
            // Add welcome message
            addSystemMessage('Welcome to the AniExplore Global Chat! Discuss your favorite anime with other fans.');
            
            // Add previous messages
            messages.forEach(msg => {
                const isUser = msg.username === username;
                addChatMessage(msg.username, msg.message, isUser, msg.timestamp, msg.avatar);
            });
            
            scrollToBottom();
        });
        
        // New message event
        socket.on('message', (data) => {
            const isUser = data.username === username;
            addChatMessage(data.username, data.message, isUser, data.timestamp, data.avatar);
        });
        
        // User joined event
        socket.on('user_joined', (data) => {
            if (data.username !== username) {
                addSystemMessage(`${data.username} has joined the chat`);
            }
        });
        
        // Active users update
        socket.on('active_users', (users) => {
            console.log('Active users:', users);
            updateActiveUsersList(users);
        });
        
        // Set up event listeners
        sendButton.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        /**
         * Send a message
         */
        function sendMessage() {
            const message = chatInput.value.trim();
            if (message && connected) {
                // Send message to server
                socket.emit('message', { 
                    message,
                    avatar
                });
                
                // Clear input
                chatInput.value = '';
            } else if (!connected) {
                addSystemMessage('Cannot send message: Not connected to the chat server');
            }
        }
        
    } catch (error) {
        console.error('Error initializing Socket.IO chat:', error);
        initializeMockChat();
    }
    
    /**
     * Log active users to console (but don't display in UI)
     * @param {Array} users - List of active users
     */
    function updateActiveUsersList(users) {
        // Just log to console instead of displaying in UI
        console.log('Active users:', users);
    }
    
    /**
     * Add a chat message to the chat container
     * @param {string} username - Username
     * @param {string} message - Message text
     * @param {boolean} isUser - Whether the message is from the current user
     * @param {string} timestamp - Message timestamp
     * @param {string} userAvatar - User's avatar URL
     */
    function addChatMessage(username, message, isUser = false, timestamp = null, userAvatar = null) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${isUser ? 'user-message' : 'other-message'}`;
        
        // Format time
        let time;
        if (timestamp) {
            // Format the timestamp from the server
            const date = new Date(timestamp);
            time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            // Use current time if no timestamp provided
            time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        const avatarUrl = userAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username);
        
        messageElement.innerHTML = `
            <div class="message-avatar">
                <img src="${avatarUrl}" alt="${username}">
            </div>
            <div class="message-bubble">
                <div class="message-info">
                    <span class="message-username">${username}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">${message}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }
    
    /**
     * Add a system message
     * @param {string} message - Message text
     */
    function addSystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message system-message';
        
        messageElement.innerHTML = `
            <div class="message-bubble">
                <div class="message-info">
                    <span class="message-username">System</span>
                </div>
                <div class="message-text">${message}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }
    
    /**
     * Scroll to bottom of chat messages
     */
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

/**
 * Initialize mock chat (fallback if Socket.IO fails)
 */
function initializeMockChat() {
    // DOM Elements
    const chatContainer = document.getElementById('chat-container');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    
    // Mock user data
    const currentUser = {
        id: 'user_' + Math.floor(Math.random() * 10000),
        name: 'AnimeUser' + Math.floor(Math.random() * 100),
        avatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent('AnimeUser')
    };

    // Mock chat data
    const mockUsers = [
        { id: 'user_1', name: 'OnePieceFan', avatar: 'https://ui-avatars.com/api/?name=OnePieceFan' },
        { id: 'user_2', name: 'DemonSlayer', avatar: 'https://ui-avatars.com/api/?name=DemonSlayer' },
        { id: 'user_3', name: 'AnimeExplorer', avatar: 'https://ui-avatars.com/api/?name=AnimeExplorer' },
        { id: 'user_4', name: 'OtakuMaster', avatar: 'https://ui-avatars.com/api/?name=OtakuMaster' },
        { id: 'user_5', name: 'MangaReader', avatar: 'https://ui-avatars.com/api/?name=MangaReader' }
    ];

    const mockMessages = [
        { userId: 'user_1', text: 'Has anyone watched the latest One Piece episode?', timestamp: new Date(Date.now() - 3600000 * 2) },
        { userId: 'user_2', text: 'I just finished Demon Slayer season 2. It was amazing!', timestamp: new Date(Date.now() - 3600000) },
        { userId: 'user_3', text: 'What anime are you all watching this season?', timestamp: new Date(Date.now() - 1800000) },
        { userId: 'user_4', text: 'I highly recommend Jujutsu Kaisen if you haven\'t seen it yet.', timestamp: new Date(Date.now() - 900000) },
        { userId: 'user_5', text: 'Does anyone know when the next season of Chainsaw Man is coming out?', timestamp: new Date(Date.now() - 300000) }
    ];
    
    // Add system message
    addSystemMessage('Welcome to the AniExplore Chat! (Mock Mode - Server Unavailable)');
    
    // Load initial messages
    mockMessages.forEach(message => {
        addMessageToChat(message);
    });
    
    // Set up event listeners
    sendButton.addEventListener('click', sendUserMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendUserMessage();
    });
    
    // Auto-respond to user messages
    setInterval(() => {
        if (Math.random() > 0.7) {
            // Add a random message occasionally
            addRandomMessage();
        }
    }, 30000); // Check every 30 seconds
    
    /**
     * Send a user message
     */
    function sendUserMessage() {
        const messageText = chatInput.value.trim();
        
        if (!messageText) return;
        
        // Create message object
        const message = {
            userId: currentUser.id,
            text: messageText,
            timestamp: new Date()
        };
        
        // Add message to chat
        addMessageToChat(message);
        
        // Clear input field
        chatInput.value = '';
        
        // Auto-respond after a delay
        setTimeout(() => {
            const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
            const responses = [
                'I agree with you!',
                'That\'s an interesting point.',
                'I haven\'t thought about it that way.',
                'Have you watched the latest episode?',
                'What\'s your favorite anime this season?',
                'I think the manga is better than the anime.',
                'The animation quality is really good in that one.',
                'Who\'s your favorite character?',
                'The plot twist in the latest episode was amazing!',
                'I can\'t wait for the next season!'
            ];
            
            const responseMessage = {
                userId: randomUser.id,
                text: responses[Math.floor(Math.random() * responses.length)],
                timestamp: new Date()
            };
            
            addMessageToChat(responseMessage);
        }, 1000 + Math.random() * 2000);
    }

    /**
     * Add a message to the chat
     * @param {Object} message - Message object
     */
    function addMessageToChat(message) {
        const messageElement = document.createElement('div');
        const isCurrentUser = message.userId === currentUser.id;
        
        messageElement.className = `chat-message ${isCurrentUser ? 'user-message' : 'other-message'}`;
        
        // Get user info
        const user = isCurrentUser ? currentUser : mockUsers.find(u => u.id === message.userId) || { name: 'Unknown', avatar: 'https://ui-avatars.com/api/?name=Unknown' };
        
        // Format timestamp
        const formattedTime = formatTimestamp(message.timestamp);
        
        messageElement.innerHTML = `
            <div class="message-avatar">
                <img src="${user.avatar}" alt="${user.name}">
            </div>
            <div class="message-bubble">
                <div class="message-info">
                    <span class="message-username">${user.name}</span>
                    <span class="message-time">${formattedTime}</span>
                </div>
                <div class="message-text">${message.text}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        scrollToBottom();
    }

    /**
     * Add a system message
     * @param {string} message - Message text
     */
    function addSystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message system-message';
        
        messageElement.innerHTML = `
            <div class="message-bubble">
                <div class="message-info">
                    <span class="message-username">System</span>
                </div>
                <div class="message-text">${message}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }

    /**
     * Format timestamp
     * @param {Date} timestamp - Timestamp to format
     * @returns {string} - Formatted timestamp
     */
    function formatTimestamp(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        
        // If less than a minute ago
        if (diff < 60000) {
            return 'just now';
        }
        
        // If less than an hour ago
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        }
        
        // If less than a day ago
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        }
        
        // Otherwise show date
        return timestamp.toLocaleDateString();
    }

    /**
     * Scroll to bottom of chat messages
     */
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Add a random message to the chat
     */
    function addRandomMessage() {
        // Add a new message from a random user
        const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
        const messages = [
            'Has anyone seen the new episode?',
            'What\'s your favorite anime this season?',
            'I just finished watching Attack on Titan!',
            'Any recommendations for a new anime to watch?',
            'The animation in Demon Slayer is incredible.',
            'One Piece is still the best anime of all time.',
            'I can\'t believe what happened in the latest episode!',
            'Who\'s your favorite character?',
            'The manga is so much better than the anime.',
            'I\'m so excited for the next season!'
        ];
        
        const message = {
            userId: randomUser.id,
            text: messages[Math.floor(Math.random() * messages.length)],
            timestamp: new Date()
        };
        
        addMessageToChat(message);
    }
}
