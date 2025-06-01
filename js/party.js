/**
 * Watch Party functionality for the anime website
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Party page loaded');
    
    // Initialize the chat tabs
    initializeChatTabs();
    
    // Check if user is in a watch party room
    const roomToken = localStorage.getItem('party_room_token');
    const roomName = localStorage.getItem('party_room_name');
    const isHost = localStorage.getItem('party_is_host') === 'true';
    
    if (!roomToken || !roomName) {
        // Redirect to home page if not in a room
        alert('You are not in a watch party room. Redirecting to home page.');
        window.location.href = 'index.html';
        return;
    }
    
    // Update room info in the UI
    document.title = `Watch Party: ${roomName} - AniExplore`;
    const roomInfoElement = document.getElementById('room-info');
    roomInfoElement.innerHTML = `
        <h3>${roomName}</h3>
        <p>Room Token: <span class="room-token">${roomToken}</span></p>
        <p>Status: ${isHost ? 'Host' : 'Member'}</p>
    `;
    
    // Add leave room button
    const leaveRoomBtn = document.createElement('button');
    leaveRoomBtn.className = 'leave-room-btn';
    leaveRoomBtn.innerHTML = 'Leave Room';
    leaveRoomBtn.addEventListener('click', leaveRoom);
    roomInfoElement.appendChild(leaveRoomBtn);
    
    // Initialize Socket.IO connection
    await initializeSocketConnection();
    
    // Initialize video player
    initializeVideoPlayer();
});

/**
 * Initialize the chat tabs functionality
 */
function initializeChatTabs() {
    const chatTabs = document.querySelectorAll('.chat-tab');
    const chatContents = document.querySelectorAll('.chat-tab-content');
    
    chatTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            chatTabs.forEach(t => t.classList.remove('active'));
            chatContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show corresponding content
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId + '-tab').classList.add('active');
        });
    });
}

/**
 * Initialize Socket.IO connection for the watch party
 */
async function initializeSocketConnection() {
    // Wait for session manager to load
    await loadSessionManagerScript();
    
    // Get session and room info
    const session = sessionManager.getSession();
    const roomToken = localStorage.getItem('party_room_token');
    
    if (!session || !roomToken) {
        alert('Session or room token not found. Please try again.');
        window.location.href = 'index.html';
        return;
    }
    
    // Join the party room
    socket.emit('join_party_room', {
        roomToken,
        userToken: session.token
    });
    
    // Handle party error
    socket.on('party_error', (data) => {
        alert(`Party Error: ${data.message}`);
        leaveRoom();
    });
    
    // Handle party joined
    socket.on('party_joined', (data) => {
        console.log('Joined party room:', data);
    });
    
    // Handle party messages
    socket.on('party_message', (data) => {
        addPartyMessage(data);
    });
    
    // Handle party members update
    socket.on('party_members', (data) => {
        updatePartyMembers(data);
    });
    
    // Handle party ended
    socket.on('party_ended', (data) => {
        alert(`Watch Party Ended: ${data.message}`);
        leaveRoom();
    });
    
    // Handle video sync events
    socket.on('video_sync', (data) => {
        handleVideoSync(data);
    });
    
    // Set up party chat input
    const partyChatInput = document.getElementById('party-chat-input');
    const partySendButton = document.getElementById('party-send-message');
    
    partyChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && partyChatInput.value.trim() !== '') {
            sendPartyMessage();
        }
    });
    
    partySendButton.addEventListener('click', () => {
        if (partyChatInput.value.trim() !== '') {
            sendPartyMessage();
        }
    });
}

/**
 * Send a message to the party chat
 */
function sendPartyMessage() {
    const partyChatInput = document.getElementById('party-chat-input');
    const message = partyChatInput.value.trim();
    
    if (message === '') return;
    
    socket.emit('party_message', { message });
    partyChatInput.value = '';
}

/**
 * Add a message to the party chat
 */
function addPartyMessage(data) {
    const partyChatMessages = document.getElementById('party-chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    const timestamp = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
        <div class="message-avatar">
            <img src="${data.avatar}" alt="${data.username}">
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-username">${data.username}</span>
            </div>
            <div class="message-text">${data.message}</div>
            <div class="message-info">
                <span class="message-time">${timestamp}</span>
            </div>
        </div>
    `;
    
    partyChatMessages.appendChild(messageElement);
    partyChatMessages.scrollTop = partyChatMessages.scrollHeight;
}

/**
 * Update the party members list
 */
function updatePartyMembers(members) {
    console.log('Party members:', members);
    
    const partyMembersContainer = document.getElementById('party-members-container');
    
    // Clear previous content
    partyMembersContainer.innerHTML = '';
    
    if (!members || members.length === 0) {
        partyMembersContainer.innerHTML = '<p>No members in this party room.</p>';
        return;
    }
    
    // Create members list
    const membersList = document.createElement('div');
    membersList.className = 'party-members-list';
    
    members.forEach(member => {
        const memberItem = document.createElement('div');
        memberItem.className = 'party-member';
        
        // Add host badge if member is host
        const isHost = member.isHost ? '<span class="host-badge">Host</span>' : '';
        
        memberItem.innerHTML = `
            <div class="member-avatar">
                <img src="${member.avatar || 'https://placehold.co/100x100.png?text=User'}" alt="${member.username}">
            </div>
            <div class="member-info">
                <div class="member-name">${member.username} ${isHost}</div>
                <div class="member-status">${member.status || 'Online'}</div>
            </div>
        `;
        
        membersList.appendChild(memberItem);
    });
    
    partyMembersContainer.appendChild(membersList);
}

/**
 * Initialize the video player with sync functionality
 */
function initializeVideoPlayer() {
    const videoContainer = document.getElementById('video-player');
    const playButton = document.getElementById('party-play');
    const pauseButton = document.getElementById('party-pause');
    const seekBackwardButton = document.getElementById('party-backward');
    const seekForwardButton = document.getElementById('party-forward');
    const volumeControl = document.getElementById('party-volume');
    const progressBar = document.getElementById('party-progress');
    const currentTimeDisplay = document.getElementById('current-time');
    const totalTimeDisplay = document.getElementById('total-time');
    const prevEpisodeButton = document.getElementById('prev-episode');
    const nextEpisodeButton = document.getElementById('next-episode');
    const isHost = localStorage.getItem('party_is_host') === 'true';
    
    // Load video stream from API
    loadVideoStream();
    
    // Set up controls for video player
    // Note: Since we're using an iframe for the video player,
    // we can't directly control the video with JavaScript.
    // Instead, we'll emit socket events for synchronized playback
    // and show notifications to users
    
    // Only allow host to control playback
    if (isHost) {
        // Play button event
        playButton.addEventListener('click', () => {
            socket.emit('video_sync', { action: 'play' });
            showVideoNotification('Playback started');
        });
        
        // Pause button event
        pauseButton.addEventListener('click', () => {
            socket.emit('video_sync', { action: 'pause' });
            showVideoNotification('Playback paused');
        });
        
        // Seek backward button event
        seekBackwardButton.addEventListener('click', () => {
            socket.emit('video_sync', { action: 'backward' });
            showVideoNotification('Skipped backward 10 seconds');
        });
        
        // Seek forward button event
        seekForwardButton.addEventListener('click', () => {
            socket.emit('video_sync', { action: 'forward' });
            showVideoNotification('Skipped forward 10 seconds');
        });
        
        // Previous episode button event
        prevEpisodeButton.addEventListener('click', () => {
            const currentEpisode = parseInt(document.getElementById('current-episode').textContent.replace('Episode ', '')) || 1;
            if (currentEpisode > 1) {
                const newEpisode = currentEpisode - 1;
                socket.emit('video_sync', { 
                    action: 'change_episode', 
                    episode: newEpisode 
                });
                document.getElementById('current-episode').textContent = `Episode ${newEpisode}`;
                loadVideoStream(newEpisode);
            }
        });
        
        // Next episode button event
        nextEpisodeButton.addEventListener('click', () => {
            const currentEpisode = parseInt(document.getElementById('current-episode').textContent.replace('Episode ', '')) || 1;
            const newEpisode = currentEpisode + 1;
            socket.emit('video_sync', { 
                action: 'change_episode', 
                episode: newEpisode 
            });
            document.getElementById('current-episode').textContent = `Episode ${newEpisode}`;
            loadVideoStream(newEpisode);
        });
    } else {
        // Disable controls for non-host users
        playButton.disabled = true;
        pauseButton.disabled = true;
        seekBackwardButton.disabled = true;
        seekForwardButton.disabled = true;
        progressBar.style.pointerEvents = 'none';
        prevEpisodeButton.disabled = true;
        nextEpisodeButton.disabled = true;
    }
}

/**
 * Format time in seconds to MM:SS format
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

/**
 * Sync video state with other party members
 */
function syncVideoState(action, time) {
    socket.emit('video_sync', { action, time });
}

/**
 * Load video stream from the server
 * @param {number} episodeNum - Optional episode number to load
 */
async function loadVideoStream(episodeNum) {
    const videoContainer = document.getElementById('video-player');
    const roomName = localStorage.getItem('party_room_name');
    
    // Make sure we keep the video placeholder and notification elements
    const placeholder = videoContainer.querySelector('.video-placeholder');
    const notification = videoContainer.querySelector('.video-notification');
    
    // Create loading element
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading';
    loadingElement.textContent = 'Loading video stream...';
    
    // Add loading element to container
    videoContainer.appendChild(loadingElement);
    
    try {
        // Default anime title and episode for demonstration
        // In a real implementation, this would be selected by the host
        const animeTitle = roomName || 'Sample Anime';
        const episodeNumber = episodeNum || 1;
        
        // Request stream URL from server
        const response = await fetch('https://new-ainimehub-production.up.railway.app/api/get-stream-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                animeTitle: animeTitle,
                episodeNumber: episodeNumber
            })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to get stream URL');
        }
        
        if (!data.embedUrl) {
            throw new Error('No embed URL returned from server');
        }
        
        console.log('Stream URL received:', data.embedUrl);
        
        // Remove loading element
        if (loadingElement.parentNode) {
            loadingElement.parentNode.removeChild(loadingElement);
        }
        
        // Hide the placeholder
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        // Create iframe element
        const iframe = document.createElement('iframe');
        iframe.src = data.embedUrl;
        iframe.frameBorder = '0';
        iframe.allowFullscreen = true;
        iframe.className = 'video-iframe';
        iframe.sandbox = 'allow-scripts allow-same-origin';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.zIndex = '2';
        
        // Add iframe to container
        videoContainer.appendChild(iframe);
        
        // Show a notification that video is loaded
        showVideoNotification('Video loaded successfully');
        
    } catch (error) {
        console.error('Error loading video stream:', error);
        
        // Remove loading element
        if (loadingElement.parentNode) {
            loadingElement.parentNode.removeChild(loadingElement);
        }
        
        // Create error element
        const errorElement = document.createElement('div');
        errorElement.className = 'error-container';
        errorElement.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <p>Error loading video: ${error.message}</p>
        `;
        
        // Add error element to container
        videoContainer.appendChild(errorElement);
    }
}

/**
 * Show a video notification message that fades out
 */
function showVideoNotification(message) {
    const notification = document.getElementById('video-notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.classList.add('show');
    
    // Remove the show class after animation completes
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/**
 * Format seconds into MM:SS format
 */
function formatTime(seconds) {
    if (!seconds && seconds !== 0) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Handle video sync events from other party members
 */
function handleVideoSync(data) {
    // Since we're using an iframe, we can't directly control the video
    // Instead, we'll show a notification to the user
    let message = '';
    
    switch (data.action) {
        case 'play':
            message = 'Host started playback';
            break;
        case 'pause':
            message = 'Host paused playback';
            break;
        case 'backward':
            message = 'Host skipped backward';
            break;
        case 'forward':
            message = 'Host skipped forward';
            break;
        case 'seek':
            message = `Host seeked to ${formatTime(data.time)}`;
            break;
        case 'change_episode':
            message = `Host changed to episode ${data.episode}`;
            break;
        default:
            message = 'Video playback synchronized';
    }
    
    // Use our notification system
    showVideoNotification(message);
}

/**
 * Leave the watch party room
 */
function leaveRoom() {
    const roomToken = localStorage.getItem('party_room_token');
    const session = sessionManager.getSession();
    
    if (roomToken && session) {
        fetch('/api/party/leave', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roomToken,
                userToken: session.token
            })
        }).catch(error => {
            console.error('Error leaving room:', error);
        });
    }
    
    // Clear room info from localStorage
    localStorage.removeItem('party_room_token');
    localStorage.removeItem('party_room_name');
    localStorage.removeItem('party_is_host');
    
    // Redirect to home page
    window.location.href = 'index.html';
}

/**
 * Load the session manager script
 */
function loadSessionManagerScript() {
    return new Promise((resolve, reject) => {
        if (window.sessionManager) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'js/session-manager.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load session manager script'));
        document.head.appendChild(script);
    });
}

/**
 * Initialize the watch party functionality
 */
function initializeWatchParty() {
    // DOM Elements
    const videoPlayer = document.getElementById('party-video');
    const playButton = document.getElementById('party-play');
    const pauseButton = document.getElementById('party-pause');
    const syncButton = document.getElementById('party-sync');
    const animeTitle = document.getElementById('party-anime-title');
    const episodeInfo = document.getElementById('party-episode-info');
    const membersList = document.getElementById('party-members-list');
    const chatMessages = document.getElementById('party-chat-messages');
    const chatInput = document.getElementById('party-chat-input');
    const sendMessageButton = document.getElementById('party-send-message');
    const searchInput = document.getElementById('party-search-input');
    const searchButton = document.getElementById('party-search-button');
    const animeResults = document.getElementById('party-anime-results');
    const partyNameInput = document.getElementById('party-name');
    const partyPrivacy = document.getElementById('party-privacy');
    const partyCodeGroup = document.getElementById('party-code-group');
    const partyCodeInput = document.getElementById('party-code');
    const copyCodeButton = document.getElementById('copy-party-code');
    const createPartyButton = document.getElementById('create-party');
    const joinPartyButton = document.getElementById('join-party');
    
    // Party state
    let partyId = null;
    let isHost = false;
    let currentAnimeId = null;
    let currentEpisode = 1;
    let partyMembers = [];
    let socket = null;
    
    // Check if user is authenticated
    let username = 'Anonymous';
    let userAvatar = 'https://ui-avatars.com/api/?name=Anonymous';
    
    if (typeof sessionManager !== 'undefined' && sessionManager.hasValidSession()) {
        const session = sessionManager.getSession();
        username = session.username;
        userAvatar = session.avatar;
    }
    
    // Connect to Socket.IO server
    try {
        socket = io('https://new-ainimehub-production.up.railway.app/');
        
        // Connection event
        socket.on('connect', () => {
            console.log('Connected to party server');
            addSystemMessage('Connected to the party server');
            
            // Check URL for party code
            const urlParams = new URLSearchParams(window.location.search);
            const partyCode = urlParams.get('party');
            
            if (partyCode) {
                joinPartyWithCode(partyCode);
            }
        });
        
        // Party created event
        socket.on('party_created', (data) => {
            partyId = data.partyId;
            isHost = true;
            
            // Show party code
            partyCodeGroup.style.display = 'block';
            partyCodeInput.value = partyId;
            
            addSystemMessage(`Party created! Share the code "${partyId}" with your friends.`);
            updatePartyMembers(data.members);
        });
        
        // Party joined event
        socket.on('party_joined', (data) => {
            partyId = data.partyId;
            isHost = data.isHost;
            
            // Show party code if host
            if (isHost) {
                partyCodeGroup.style.display = 'block';
                partyCodeInput.value = partyId;
            }
            
            addSystemMessage(`Joined party "${data.partyName}"!`);
            updatePartyMembers(data.members);
            
            // Update video if there's already one playing
            if (data.currentAnime) {
                currentAnimeId = data.currentAnime.id;
                currentEpisode = data.currentEpisode || 1;
                animeTitle.textContent = data.currentAnime.title;
                episodeInfo.textContent = `Episode ${currentEpisode}`;
                
                // Set video source if available
                if (data.videoUrl) {
                    videoPlayer.src = data.videoUrl;
                    videoPlayer.currentTime = data.currentTime || 0;
                    
                    if (data.isPlaying) {
                        videoPlayer.play();
                    }
                }
            }
        });
        
        // Member joined event
        socket.on('member_joined', (data) => {
            addSystemMessage(`${data.username} joined the party!`);
            updatePartyMembers(data.members);
        });
        
        // Member left event
        socket.on('member_left', (data) => {
            addSystemMessage(`${data.username} left the party.`);
            updatePartyMembers(data.members);
        });
        
        // Video control events
        socket.on('video_play', (data) => {
            videoPlayer.currentTime = data.currentTime;
            videoPlayer.play();
            addSystemMessage(`${data.username} started playback.`);
        });
        
        socket.on('video_pause', (data) => {
            videoPlayer.pause();
            videoPlayer.currentTime = data.currentTime;
            addSystemMessage(`${data.username} paused playback.`);
        });
        
        socket.on('video_sync', (data) => {
            videoPlayer.currentTime = data.currentTime;
            addSystemMessage(`Playback synchronized by ${data.username}.`);
        });
        
        // Anime selected event
        socket.on('anime_selected', (data) => {
            currentAnimeId = data.anime.id;
            currentEpisode = data.episode || 1;
            animeTitle.textContent = data.anime.title;
            episodeInfo.textContent = `Episode ${currentEpisode}`;
            
            // Set video source if available
            if (data.videoUrl) {
                videoPlayer.src = data.videoUrl;
                videoPlayer.load();
            }
            
            addSystemMessage(`${data.username} selected "${data.anime.title}" Episode ${currentEpisode}.`);
        });
        
        // Chat message event
        socket.on('party_message', (data) => {
            addChatMessage(data.username, data.message, data.avatar);
        });
        
        // Disconnection event
        socket.on('disconnect', () => {
            console.log('Disconnected from party server');
            addSystemMessage('Disconnected from the party server. Trying to reconnect...');
        });
        
        // Error events
        socket.on('party_error', (data) => {
            addSystemMessage(`Error: ${data.message}`);
        });
        
    } catch (error) {
        console.error('Failed to connect to party server:', error);
        addSystemMessage('Failed to connect to the party server. Please try again later.');
    }
    
    // Event Listeners
    playButton.addEventListener('click', () => {
        if (partyId) {
            socket.emit('video_play', {
                partyId,
                currentTime: videoPlayer.currentTime
            });
            videoPlayer.play();
        } else {
            addSystemMessage('Please create or join a party first.');
        }
    });
    
    pauseButton.addEventListener('click', () => {
        if (partyId) {
            socket.emit('video_pause', {
                partyId,
                currentTime: videoPlayer.currentTime
            });
            videoPlayer.pause();
        } else {
            addSystemMessage('Please create or join a party first.');
        }
    });
    
    syncButton.addEventListener('click', () => {
        if (partyId) {
            socket.emit('video_sync', {
                partyId,
                currentTime: videoPlayer.currentTime
            });
        } else {
            addSystemMessage('Please create or join a party first.');
        }
    });
    
    sendMessageButton.addEventListener('click', () => {
        sendChatMessage();
    });
    
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    searchButton.addEventListener('click', () => {
        searchAnime();
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchAnime();
        }
    });
    
    createPartyButton.addEventListener('click', () => {
        const partyName = partyNameInput.value.trim() || `${username}'s Party`;
        const privacy = partyPrivacy.value;
        
        if (socket && socket.connected) {
            socket.emit('create_party', {
                name: partyName,
                privacy: privacy,
                host: {
                    username: username,
                    avatar: userAvatar
                }
            });
        } else {
            addSystemMessage('Not connected to server. Please refresh the page.');
        }
    });
    
    joinPartyButton.addEventListener('click', () => {
        const partyCode = prompt('Enter party code:');
        if (partyCode) {
            joinPartyWithCode(partyCode);
        }
    });
    
    copyCodeButton.addEventListener('click', () => {
        partyCodeInput.select();
        document.execCommand('copy');
        addSystemMessage('Party code copied to clipboard!');
    });
    
    // Helper Functions
    function joinPartyWithCode(code) {
        if (socket && socket.connected) {
            socket.emit('join_party', {
                partyId: code,
                member: {
                    username: username,
                    avatar: userAvatar
                }
            });
        } else {
            addSystemMessage('Not connected to server. Please refresh the page.');
        }
    }
    
    function sendChatMessage() {
        const message = chatInput.value.trim();
        
        if (message && partyId) {
            socket.emit('party_message', {
                partyId: partyId,
                message: message,
                username: username,
                avatar: userAvatar
            });
            
            chatInput.value = '';
        } else if (!partyId) {
            addSystemMessage('Please create or join a party first.');
        }
    }
    
    function searchAnime() {
        const query = searchInput.value.trim();
        
        if (query) {
            animeResults.innerHTML = '<div class="loading">Searching...</div>';
            
            // Use the Jikan API to search for anime
            fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&sfw=true&limit=5`)
                .then(response => response.json())
                .then(data => {
                    displayAnimeResults(data.data);
                })
                .catch(error => {
                    console.error('Error searching anime:', error);
                    animeResults.innerHTML = '<div class="message">Error searching. Please try again.</div>';
                });
        }
    }
    
    function displayAnimeResults(results) {
        if (!results || results.length === 0) {
            animeResults.innerHTML = '<div class="message">No results found.</div>';
            return;
        }
        
        animeResults.innerHTML = '';
        
        results.forEach(anime => {
            const animeItem = document.createElement('div');
            animeItem.className = 'anime-result-item';
            animeItem.innerHTML = `
                <img src="${anime.images.jpg.image_url}" alt="${anime.title}">
                <div class="anime-info">
                    <h4 class="anime-title">${anime.title}</h4>
                    <div class="anime-details">
                        ${anime.episodes ? anime.episodes + ' episodes' : 'Unknown episodes'} • ${anime.status}
                    </div>
                </div>
            `;
            
            animeItem.addEventListener('click', () => {
                if (partyId && isHost) {
                    selectAnime(anime);
                } else if (!partyId) {
                    addSystemMessage('Please create or join a party first.');
                } else {
                    addSystemMessage('Only the host can select anime.');
                }
            });
            
            animeResults.appendChild(animeItem);
        });
    }
    
    function selectAnime(anime) {
        if (socket && socket.connected && partyId) {
            socket.emit('select_anime', {
                partyId: partyId,
                anime: {
                    id: anime.mal_id,
                    title: anime.title,
                    episodes: anime.episodes,
                    image: anime.images.jpg.image_url
                },
                episode: 1,
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' // Sample video URL
            });
        }
    }
    
    function updatePartyMembers(members) {
        partyMembers = members;
        membersList.innerHTML = '';
        
        members.forEach(member => {
            const memberItem = document.createElement('div');
            memberItem.className = 'party-member';
            memberItem.innerHTML = `
                <img src="${member.avatar}" alt="${member.username}">
                <span class="member-name">${member.username}</span>
                ${member.isHost ? '<span class="host-badge">Host</span>' : ''}
            `;
            membersList.appendChild(memberItem);
        });
    }
    
    function addSystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message system-message';
        messageElement.innerHTML = `
            <div class="message-content">
                <span class="system-text">${message}</span>
            </div>
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function addChatMessage(username, message, avatar) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.innerHTML = `
            <div class="message-avatar">
                <img src="${avatar}" alt="${username}">
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-username">${username}</span>
                </div>
                <div class="message-text">${message}</div>
            </div>
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

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
