/**
 * Watch Party Modal functionality for the anime website
 * Handles creating and joining watch party rooms
 */

document.addEventListener('DOMContentLoaded', () => {
    // Get modal elements
    const modal = document.getElementById('party-modal');
    const modalTabs = document.querySelectorAll('.modal-tab');
    const modalContents = document.querySelectorAll('.modal-tab-content');
    const closeModal = document.querySelector('.close-modal');
    const watchPartyBtn = document.getElementById('watchparty-btn');
    const createRoomForm = document.getElementById('create-room-form');
    const joinRoomForm = document.getElementById('join-room-form');
    
    // Show modal when Watch Party button is clicked
    watchPartyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.style.display = 'block';
    });
    
    // Close modal when X is clicked
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Handle tab switching
    modalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            modalTabs.forEach(t => t.classList.remove('active'));
            modalContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show corresponding content
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // Handle create room form submission
    createRoomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get the room name
        const roomName = document.getElementById('room-name').value.trim();
        
        if (!roomName) {
            alert('Please enter a room name');
            return;
        }
        
        try {
            // Check if user is logged in
            const session = sessionManager.getSession();
            
            if (!session) {
                alert('You need to be logged in to create a watch party room');
                return;
            }
            
            // Create the room
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
                // Save room info to localStorage
                localStorage.setItem('party_room_token', data.roomToken);
                localStorage.setItem('party_room_name', data.roomName);
                localStorage.setItem('party_is_host', 'true');
                
                // Redirect to party page
                window.location.href = 'party.html';
            } else {
                alert(`Error creating room: ${data.error}`);
            }
        } catch (error) {
            console.error('Error creating room:', error);
            alert('An error occurred while creating the room');
        }
    });
    
    // Handle join room form submission
    joinRoomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get the room token
        const roomToken = document.getElementById('room-token').value.trim();
        
        if (!roomToken) {
            alert('Please enter a room token');
            return;
        }
        
        try {
            // Check if user is logged in
            const session = sessionManager.getSession();
            
            if (!session) {
                alert('You need to be logged in to join a watch party room');
                return;
            }
            
            // Join the room
            const response = await fetch('/api/party/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomToken,
                    userToken: session.token
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Save room info to localStorage
                localStorage.setItem('party_room_token', data.roomToken);
                localStorage.setItem('party_room_name', data.roomName);
                localStorage.setItem('party_is_host', data.isHost.toString());
                
                // Redirect to party page
                window.location.href = 'party.html';
            } else {
                alert(`Error joining room: ${data.error}`);
            }
        } catch (error) {
            console.error('Error joining room:', error);
            alert('An error occurred while joining the room');
        }
    });
});
