// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const moment = require('moment');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Add axios for HTTP requests
const axios = require('axios');
const cheerio = require('cheerio');

// Video streaming API endpoint
app.post('/api/get-stream-url', async (req, res) => {
  try {
    const { animeTitle, episodeNumber } = req.body;
    
    if (!animeTitle || !episodeNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Anime title and episode number are required' 
      });
    }
    
    // Get the actual embed URL from animegg.org
    const embedUrl = await scrapeAnimeggEmbedUrl(animeTitle, episodeNumber);
    
    if (!embedUrl) {
      // Fallback to placeholder if scraping fails
      return res.json({
        success: true,
        embedUrl: `https://placehold.co/1280x720/333/white?text=${encodeURIComponent(animeTitle)}+Episode+${episodeNumber}`,
        sources: [
          {
            quality: '720p',
            url: `https://placehold.co/1280x720/333/white?text=${encodeURIComponent(animeTitle)}+Episode+${episodeNumber}`
          }
        ]
      });
    }
    
    res.json({
      success: true,
      embedUrl,
      sources: [
        {
          quality: '720p',
          url: embedUrl
        }
      ]
    });
  } catch (error) {
    console.error('Error getting stream URL:', error);
    res.status(500).json({ success: false, error: 'Failed to get stream URL' });
  }
});

/**
 * Scrape animegg.org to get the embed URL for a specific anime episode
 * @param {string} animeTitle - The title of the anime
 * @param {number} episodeNumber - The episode number
 * @returns {Promise<string|null>} - The embed URL or null if not found
 */
async function scrapeAnimeggEmbedUrl(animeTitle, episodeNumber) {
  try {
    // Step 1: Search for the anime on animegg.org
    const searchUrl = `https://www.animegg.org/search/?q=${encodeURIComponent(animeTitle)}`;
    console.log(`Searching for anime at: ${searchUrl}`);
    
    const searchResponse = await axios.get(searchUrl);
    const $ = cheerio.load(searchResponse.data);
    
    // Find the first search result
    const searchResults = $('.moose.page .mse');
    
    if (searchResults.length === 0) {
      console.log('No search results found');
      return null;
    }
    
    // Get the URL of the first result
    let animeUrl = '';
    let foundTitle = '';
    
    // Try to find the most relevant result by comparing titles
    let bestMatch = null;
    let bestMatchScore = 0;
    
    searchResults.each((i, el) => {
      const resultTitle = $(el).find('h2').text().trim();
      const resultUrl = $(el).attr('href');
      
      // Simple string similarity check (can be improved)
      const score = calculateSimilarity(resultTitle.toLowerCase(), animeTitle.toLowerCase());
      
      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestMatch = {
          title: resultTitle,
          url: resultUrl
        };
      }
    });
    
    if (bestMatch && bestMatchScore > 0.5) { // Threshold for considering it a match
      animeUrl = bestMatch.url;
      foundTitle = bestMatch.title;
      console.log(`Found anime: ${foundTitle} at ${animeUrl} with score ${bestMatchScore}`);
    } else {
      // Just take the first result if no good match
      animeUrl = $(searchResults[0]).attr('href');
      foundTitle = $(searchResults[0]).find('h2').text().trim();
      console.log(`Using first result: ${foundTitle} at ${animeUrl}`);
    }
    
    if (!animeUrl) {
      console.log('Could not extract anime URL');
      return null;
    }
    
    // Make sure the URL is absolute
    if (animeUrl.startsWith('/')) {
      animeUrl = 'https://www.animegg.org' + animeUrl;
    }
    
    // Step 2: Construct the episode URL
    // Extract the series slug from the URL
    const seriesSlug = animeUrl.split('/').pop();
    const episodeUrl = `https://www.animegg.org/${seriesSlug}-episode-${episodeNumber}`;
    console.log(`Accessing episode at: ${episodeUrl}`);
    
    // Step 3: Access the episode page to get the embed ID
    const episodeResponse = await axios.get(episodeUrl);
    const episodeHtml = cheerio.load(episodeResponse.data);
    
    // Find the embed iframe
    const embedSrc = episodeHtml('.tab-content.embed-responsive iframe').attr('src');
    
    if (!embedSrc) {
      console.log('Could not find embed source');
      return null;
    }
    
    // Extract the embed ID and construct the full embed URL
    const embedId = embedSrc.split('/').pop();
    const fullEmbedUrl = `https://www.animegg.org/embed/${embedId}`;
    console.log(`Found embed URL: ${fullEmbedUrl}`);
    
    return fullEmbedUrl;
  } catch (error) {
    console.error('Error scraping animegg:', error);
    return null;
  }
}

/**
 * Calculate similarity between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score between 0 and 1
 */
function calculateSimilarity(str1, str2) {
  // Simple implementation - can be improved with more sophisticated algorithms
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  
  let matchCount = 0;
  for (const word1 of words1) {
    if (word1.length < 3) continue; // Skip very short words
    
    for (const word2 of words2) {
      if (word2.length < 3) continue;
      
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matchCount++;
        break;
      }
    }
  }
  
  return matchCount / Math.max(words1.length, words2.length);
}

// API endpoints for session management
app.post('/api/session/create', (req, res) => {
  const { username, avatar } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  // Generate a token
  const token = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
  
  insertOrUpdateUser(username, avatar, timestamp, token, (success) => {
    if (success) {
      res.json({ token, username, avatar });
    } else {
      res.status(500).json({ error: 'Failed to create session' });
    }
  });
});

app.post('/api/session/validate', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  
  validateUserToken(token, (user) => {
    if (user) {
      // Update last_seen
      const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
      insertOrUpdateUser(user.username, user.avatar, timestamp, null, () => {});
      
      res.json({ valid: true, username: user.username, avatar: user.avatar });
    } else {
      res.json({ valid: false });
    }
  });
});

app.post('/api/session/invalidate', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  
  db.run('UPDATE users SET token = NULL, token_expiry = NULL WHERE token = ?', [token], (err) => {
    if (err) {
      console.error('Error invalidating token:', err.message);
      res.status(500).json({ error: 'Failed to invalidate session' });
    } else {
      res.json({ success: true });
    }
  });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize SQLite database
const db = new sqlite3.Database('./chat.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create messages table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        avatar TEXT
      )
    `);

    // Create users table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        avatar TEXT,
        last_seen TEXT,
        token TEXT,
        token_expiry TEXT
      )
    `);
    
    // Create watch party rooms table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS party_rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_name TEXT NOT NULL,
        room_token TEXT UNIQUE NOT NULL,
        host_token TEXT NOT NULL,
        created_at TEXT NOT NULL,
        active INTEGER DEFAULT 1
      )
    `);
    
    // Create watch party members table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS party_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_token TEXT NOT NULL,
        user_token TEXT NOT NULL,
        username TEXT NOT NULL,
        joined_at TEXT NOT NULL,
        FOREIGN KEY (room_token) REFERENCES party_rooms(room_token),
        FOREIGN KEY (user_token) REFERENCES users(token)
      )
    `);
  }
});

// Helper function to get recent messages
function getRecentMessages(limit, callback) {
  db.all('SELECT * FROM messages ORDER BY id DESC LIMIT ?', [limit], (err, rows) => {
    if (err) {
      console.error('Error fetching messages:', err.message);
      callback([]);
    } else {
      callback(rows.reverse());
    }
  });
}

// Helper function to get active users
function getActiveUsers(callback) {
  db.all(
    'SELECT username, avatar FROM users WHERE datetime(last_seen) > datetime(?, "-5 minutes")',
    [moment().format('YYYY-MM-DD HH:mm:ss')],
    (err, rows) => {
      if (err) {
        console.error('Error fetching active users:', err.message);
        callback([]);
      } else {
        callback(rows);
      }
    }
  );
}

// Helper function to insert or update a user
function insertOrUpdateUser(username, avatar, timestamp, token = null, callback) {
  const tokenExpiry = token ? moment().add(24, 'hours').format('YYYY-MM-DD HH:mm:ss') : null;
  
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      console.error('Error checking user:', err.message);
      if (callback) callback(false);
      return;
    }
    
    if (row) {
      // Update existing user
      const query = token 
        ? 'UPDATE users SET avatar = ?, last_seen = ?, token = ?, token_expiry = ? WHERE username = ?'
        : 'UPDATE users SET avatar = ?, last_seen = ? WHERE username = ?';
      
      const params = token 
        ? [avatar, timestamp, token, tokenExpiry, username]
        : [avatar, timestamp, username];
      
      db.run(query, params, (err) => {
        if (err) {
          console.error('Error updating user:', err.message);
          if (callback) callback(false);
        } else {
          if (callback) callback(true);
        }
      });
    } else {
      // Insert new user
      const query = token 
        ? 'INSERT INTO users (username, avatar, last_seen, token, token_expiry) VALUES (?, ?, ?, ?, ?)'
        : 'INSERT INTO users (username, avatar, last_seen) VALUES (?, ?, ?)';
      
      const params = token 
        ? [username, avatar, timestamp, token, tokenExpiry]
        : [username, avatar, timestamp];
      
      db.run(query, params, (err) => {
        if (err) {
          console.error('Error inserting user:', err.message);
          if (callback) callback(false);
        } else {
          if (callback) callback(true);
        }
      });
    }
  });
}

// Helper function to validate a user token
function validateUserToken(token, callback) {
  if (!token) {
    callback(null);
    return;
  }
  
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  
  // Handle token as string (normal case)
  if (typeof token === 'string') {
    db.get(
      'SELECT * FROM users WHERE token = ? AND datetime(token_expiry) > datetime(?)',
      [token, currentTime],
      (err, row) => {
        if (err) {
          console.error('Error validating token:', err.message);
          callback(null);
        } else {
          callback(row);
        }
      }
    );
  } 
  // Handle token as object (for backward compatibility)
  else if (typeof token === 'object' && token.username) {
    db.get(
      'SELECT * FROM users WHERE username = ?',
      [token.username],
      (err, userRow) => {
        if (err) {
          console.error('Error finding user by username:', err.message);
          callback(null);
        } else {
          callback(userRow);
        }
      }
    );
  } else {
    callback(null);
  }
}

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New client connected');
  let username = 'Anonymous_' + Math.floor(Math.random() * 1000);
  let userAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username);
  let userToken = null;
  let currentRoomToken = null;
  
  // Send recent messages to the newly connected client
  getRecentMessages(50, (messages) => {
    socket.emit('load_messages', messages);
  });
  
  // Send active users list
  getActiveUsers((users) => {
    io.emit('active_users', users);
  });
  
  // Handle user authentication with token
  socket.on('authenticate', (data) => {
    const { token } = data;
    
    if (!token) {
      socket.emit('auth_error', { message: 'No token provided' });
      return;
    }
    
    validateUserToken(token, (user) => {
      if (user) {
        username = user.username;
        userAvatar = user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username);
        userToken = token;
        
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        insertOrUpdateUser(username, userAvatar, timestamp, token, () => {});
        
        socket.emit('auth_success', { username, avatar: userAvatar });
        
        // Notify all clients about the user joining
        io.emit('user_joined', { username, avatar: userAvatar });
        
        // Update active users list
        getActiveUsers((users) => {
          io.emit('active_users', users);
        });
      } else {
        socket.emit('auth_error', { message: 'Invalid token' });
      }
    });
  });
  
  // Handle user joining with username
  socket.on('join', (data) => {
    username = data.username || username;
    userAvatar = data.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username);
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // Generate a token for the user
    const token = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    userToken = token;
    
    // Update user in database with token
    insertOrUpdateUser(username, userAvatar, timestamp, token, (success) => {
      if (success) {
        // Send token to client
        socket.emit('token_created', { token, username, avatar: userAvatar });
        
        // Notify all clients about the new user
        io.emit('user_joined', { username, avatar: userAvatar });
        
        // Update active users list
        getActiveUsers((users) => {
          io.emit('active_users', users);
        });
        
        // Add system message
        const systemMessage = {
          username: 'System',
          message: `${username} has joined the chat`,
          timestamp,
          avatar: 'https://ui-avatars.com/api/?name=System'
        };
        
        // Save system message to database
        db.run(
          'INSERT INTO messages (username, message, timestamp, avatar) VALUES (?, ?, ?, ?)',
          ['System', `${username} has joined the chat`, timestamp, 'https://ui-avatars.com/api/?name=System'],
          (err) => {
            if (err) {
              console.error('Error saving system message:', err.message);
            }
          }
        );
        
        io.emit('message', systemMessage);
      } else {
        socket.emit('join_error', { message: 'Failed to join chat' });
      }
    });
  });
  
  // Handle chat messages
  socket.on('message', (data) => {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const messageData = {
      username: username,
      message: data.message,
      timestamp,
      avatar: userAvatar
    };
    
    // Save message to database
    db.run(
      'INSERT INTO messages (username, message, timestamp, avatar) VALUES (?, ?, ?, ?)',
      [username, data.message, timestamp, userAvatar],
      (err) => {
        if (err) {
          console.error('Error saving message:', err.message);
        } else {
          // Update user's last seen
          insertOrUpdateUser(username, userAvatar, timestamp, userToken, () => {});
          
          // Broadcast message to all clients
          io.emit('message', messageData);
        }
      }
    );
  });
  
  // Handle message deletion after expiration
  // Set up a timer to delete messages older than 10 minutes
  const messageCleanupInterval = setInterval(() => {
    const tenMinutesAgo = moment().subtract(10, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    
    db.run('DELETE FROM messages WHERE datetime(timestamp) < datetime(?)', [tenMinutesAgo], (err) => {
      if (err) {
        console.error('Error cleaning up old messages:', err.message);
      }
    });
  }, 60000); // Run every minute
  
  // Handle watch party room joining
  socket.on('join_party_room', (data) => {
    const { roomToken, userToken } = data;
    
    if (!roomToken || !userToken) {
      socket.emit('party_error', { message: 'Room token and user token are required' });
      return;
    }
    
    // Validate the user token first
    validateUserToken(userToken, (user) => {
      if (!user) {
        socket.emit('party_error', { message: 'Invalid user token' });
        return;
      }
      
      // Check if the room exists and is active
      db.get('SELECT * FROM party_rooms WHERE room_token = ? AND active = 1', [roomToken], (err, room) => {
        if (err || !room) {
          socket.emit('party_error', { message: 'Watch party room not found or inactive' });
          return;
        }
        
        // Join the socket.io room
        socket.join(roomToken);
        currentRoomToken = roomToken;
        
        // Notify room members about the new user
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const joinMessage = {
          username: 'Party System',
          message: `${user.username} has joined the watch party`,
          timestamp,
          avatar: 'https://ui-avatars.com/api/?name=Party'
        };
        
        io.to(roomToken).emit('party_message', joinMessage);
        
        // Get room members
        db.all('SELECT username FROM party_members WHERE room_token = ?', [roomToken], (err, members) => {
          if (err) {
            console.error('Error getting room members:', err.message);
          } else {
            io.to(roomToken).emit('party_members', members);
          }
        });
        
        // Check if user is host
        const isHost = room.host_token === userToken;
        socket.emit('party_joined', { roomToken, roomName: room.room_name, isHost });
      });
    });
  });
  
  // Handle watch party messages
  socket.on('party_message', (data) => {
    if (!currentRoomToken) {
      socket.emit('party_error', { message: 'Not in a watch party room' });
      return;
    }
    
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const messageData = {
      username: username,
      message: data.message,
      timestamp,
      avatar: userAvatar
    };
    
    // Broadcast message to all room members
    io.to(currentRoomToken).emit('party_message', messageData);
  });
  
  // Handle video sync events
  socket.on('video_sync', (data) => {
    if (!currentRoomToken) {
      socket.emit('party_error', { message: 'Not in a watch party room' });
      return;
    }
    
    // Forward the sync event to all room members except sender
    socket.to(currentRoomToken).emit('video_sync', data);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    
    // Clear the message cleanup interval
    clearInterval(messageCleanupInterval);
    
    // If in a watch party room, notify other members
    if (currentRoomToken) {
      // Check if user is the host
      db.get('SELECT * FROM party_rooms WHERE room_token = ? AND host_token = ?', [currentRoomToken, userToken], (err, room) => {
        if (err) {
          console.error('Error checking watch party host:', err.message);
        } else if (room) {
          // If the user is the host, deactivate the room
          db.run('UPDATE party_rooms SET active = 0 WHERE room_token = ?', [currentRoomToken], (err) => {
            if (err) {
              console.error('Error deactivating watch party room:', err.message);
            } else {
              // Notify all room members that the party has ended
              io.to(currentRoomToken).emit('party_ended', { message: 'The host has left the watch party' });
              
              // Remove all members
              db.run('DELETE FROM party_members WHERE room_token = ?', [currentRoomToken], (err) => {
                if (err) {
                  console.error('Error removing watch party members:', err.message);
                }
              });
            }
          });
        } else {
          // If the user is not the host, just remove them as a member
          db.run('DELETE FROM party_members WHERE room_token = ? AND user_token = ?', [currentRoomToken, userToken], (err) => {
            if (err) {
              console.error('Error removing watch party member:', err.message);
            } else {
              // Notify room members that the user has left
              const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
              const leaveMessage = {
                username: 'Party System',
                message: `${username} has left the watch party`,
                timestamp,
                avatar: 'https://ui-avatars.com/api/?name=Party'
              };
              
              io.to(currentRoomToken).emit('party_message', leaveMessage);
              
              // Update room members list
              db.all('SELECT username FROM party_members WHERE room_token = ?', [currentRoomToken], (err, members) => {
                if (err) {
                  console.error('Error getting room members:', err.message);
                } else {
                  io.to(currentRoomToken).emit('party_members', members);
                }
              });
            }
          });
        }
      });
    }
    
    // Add system message about user leaving global chat
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const systemMessage = {
      username: 'System',
      message: `${username} has left the chat`,
      timestamp,
      avatar: 'https://ui-avatars.com/api/?name=System'
    };
    
    // Save system message to database
    db.run(
      'INSERT INTO messages (username, message, timestamp, avatar) VALUES (?, ?, ?, ?)',
      ['System', `${username} has left the chat`, timestamp, 'https://ui-avatars.com/api/?name=System'],
      (err) => {
        if (err) {
          console.error('Error saving system message:', err.message);
        } else {
          io.emit('message', systemMessage);
          
          // Update active users list after a short delay
          setTimeout(() => {
            getActiveUsers((users) => {
              io.emit('active_users', users);
            });
          }, 1000);
        }
      }
    );
  });
});

// OpenRouter AI Assistant API endpoint
app.post('/api/ai-assistant', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }
    
    // Check if this is an anime recommendation request
    const isAnimeRecommendation = (
      message.toLowerCase().includes('recommend') ||
      message.toLowerCase().includes('suggest') ||
      message.toLowerCase().includes('similar to') ||
      message.toLowerCase().includes('like') ||
      message.toLowerCase().includes('best anime')
    ) && (
      message.toLowerCase().includes('anime') ||
      message.toLowerCase().includes('series') ||
      message.toLowerCase().includes('show')
    );
    
    // Check if this is a watch party creation request
    const isWatchPartyRequest = (
      message.toLowerCase().includes('create') ||
      message.toLowerCase().includes('start') ||
      message.toLowerCase().includes('make') ||
      message.toLowerCase().includes('setup')
    ) && (
      message.toLowerCase().includes('watch party') ||
      message.toLowerCase().includes('watching party') ||
      message.toLowerCase().includes('watch room') ||
      message.toLowerCase().includes('viewing party')
    );
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': req.headers.origin || 'http://localhost:3000',
      'X-Title': 'Anime Website AI Assistant'
    };
    
    // If it's a recommendation request, ask the AI to format the response in a structured way
    let systemPrompt = 'You are an AI assistant for an anime website called AniExplore. You help users find anime recommendations, answer questions about anime series, characters, and genres. Keep responses concise and helpful. If asked about non-anime topics, politely redirect to anime-related discussions.';
    
    if (isAnimeRecommendation) {
      systemPrompt += ' For anime recommendations, return your response in a structured JSON format with an introductory text and an array of recommended anime. Each anime should include title, year, genres, rating, and a brief description. DO NOT include image URLs as these will be fetched automatically. Format your entire response as valid JSON with this structure: {"introText": "Your introduction here", "recommendations": [{"title": "Anime Title", "year": "Year", "genres": ["Genre1", "Genre2"], "rating": "8.5", "description": "Brief description"}]}. Make sure to include 3-5 relevant recommendations with realistic data. Be accurate with anime titles to ensure proper image fetching.';
    } else if (isWatchPartyRequest) {
      systemPrompt += ' For watch party creation requests, extract the anime title from the user message. If no specific anime is mentioned, ask the user which anime they want to watch. Return your response in a structured JSON format with a suggested anime title. Format your entire response as valid JSON with this structure: {"isWatchPartyRequest": true, "animeTitle": "Suggested Anime Title", "message": "Your response message here"}. If the user mentioned a specific anime, use that exact title.';
    }
    
    const data = {
      model: 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 1000
    };
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', data, { headers });
    const aiResponse = response.data.choices[0].message.content;
    
    // Try to parse JSON from the response
    try {
      // Find JSON in the response (in case the AI included other text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonResponse = JSON.parse(jsonMatch[0]);
        
        // Handle anime recommendations
        if (isAnimeRecommendation && jsonResponse.recommendations && Array.isArray(jsonResponse.recommendations)) {
          // Process each recommendation to fetch images from Jikan API
          const fetchPromises = jsonResponse.recommendations.map(async (anime) => {
            try {
              // Search for anime using Jikan API
              const response = await axios.get(
                `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(anime.title)}&limit=1`,
                { timeout: 5000 } // Set timeout to avoid hanging
              );
              
              if (response.data.data && response.data.data.length > 0) {
                const animeInfo = response.data.data[0];
                // Add the image URL from Jikan API
                anime.imageUrl = animeInfo.images.jpg.image_url;
                // Also add the MAL ID for potential future use
                anime.malId = animeInfo.mal_id;
                return anime;
              }
              return anime; // Return original if no match found
            } catch (error) {
              console.error(`Error fetching image for ${anime.title}:`, error.message);
              // If there's an error, just return the original anime without image
              return anime;
            }
          });
          
          // Wait for all image fetching to complete
          const recommendationsWithImages = await Promise.all(fetchPromises);
          jsonResponse.recommendations = recommendationsWithImages;
          
          // Return the recommendation response
          return res.json({
            success: true,
            isAnimeRecommendation: true,
            response: jsonResponse
          });
        }
        
        // Handle watch party requests
        if (isWatchPartyRequest && jsonResponse.isWatchPartyRequest) {
          // If the AI provided an anime title, fetch its image
          if (jsonResponse.animeTitle) {
            try {
              // Search for anime using Jikan API
              const response = await axios.get(
                `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(jsonResponse.animeTitle)}&limit=1`,
                { timeout: 5000 }
              );
              
              if (response.data.data && response.data.data.length > 0) {
                const animeInfo = response.data.data[0];
                jsonResponse.imageUrl = animeInfo.images.jpg.image_url;
                jsonResponse.malId = animeInfo.mal_id;
              }
            } catch (error) {
              console.error(`Error fetching image for watch party anime:`, error.message);
            }
          }
          
          // Return the watch party response
          return res.json({
            success: true,
            isWatchPartyRequest: true,
            response: jsonResponse
          });
        }
      }
    } catch (jsonError) {
      console.error('Error parsing JSON from AI response:', jsonError);
      // If JSON parsing fails, continue with the regular response
    }
    
    // Regular response for non-recommendation queries or if JSON parsing failed
    res.json({
      success: true,
      isAnimeRecommendation: false,
      response: aiResponse
    });
  } catch (error) {
    console.error('Error calling OpenRouter API:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get AI response' 
    });
  }
});

// Endpoint to fetch anime info from Jikan API
app.get('/api/anime-info/:title', async (req, res) => {
  try {
    const { title } = req.params;
    
    // Search for anime using Jikan API
    const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`);
    
    if (response.data.data && response.data.data.length > 0) {
      const animeInfo = response.data.data[0];
      res.json({
        success: true,
        animeInfo
      });
    } else {
      res.json({
        success: false,
        error: 'Anime not found'
      });
    }
  } catch (error) {
    console.error('Error fetching anime info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch anime info'
    });
  }
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint to get recent messages
app.get('/api/messages', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  getRecentMessages(limit, (messages) => {
    res.json(messages);
  });
});

// API endpoint to get active users
app.get('/api/users/active', (req, res) => {
  getActiveUsers((users) => {
    res.json(users);
  });
});

// API endpoint to create a watch party room
app.post('/api/party/create', (req, res) => {
  const { roomName, userToken } = req.body;
  
  if (!roomName || !userToken) {
    return res.status(400).json({ error: 'Room name and user token are required' });
  }
  
  // Validate the user token first
  validateUserToken(userToken, (user) => {
    if (!user) {
      return res.status(401).json({ error: 'Invalid user token' });
    }
    
    // Generate a unique room token
    const roomToken = `party-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // Create the room in the database
    db.run(
      'INSERT INTO party_rooms (room_name, room_token, host_token, created_at) VALUES (?, ?, ?, ?)',
      [roomName, roomToken, userToken, timestamp],
      function(err) {
        if (err) {
          console.error('Error creating watch party room:', err.message);
          return res.status(500).json({ error: 'Failed to create watch party room' });
        }
        
        // Add the host as the first member
        db.run(
          'INSERT INTO party_members (room_token, user_token, username, joined_at) VALUES (?, ?, ?, ?)',
          [roomToken, userToken, user.username, timestamp],
          function(err) {
            if (err) {
              console.error('Error adding host to watch party room:', err.message);
              return res.status(500).json({ error: 'Failed to add host to watch party room' });
            }
            
            res.json({ roomToken, roomName, hostUsername: user.username });
          }
        );
      }
    );
  });
});

// API endpoint to join a watch party room
app.post('/api/party/join', (req, res) => {
  const { roomToken, userToken } = req.body;
  
  if (!roomToken || !userToken) {
    return res.status(400).json({ error: 'Room token and user token are required' });
  }
  
  // Validate the user token first
  validateUserToken(userToken, (user) => {
    if (!user) {
      return res.status(401).json({ error: 'Invalid user token' });
    }
    
    // Check if the room exists and is active
    db.get('SELECT * FROM party_rooms WHERE room_token = ? AND active = 1', [roomToken], (err, room) => {
      if (err) {
        console.error('Error checking watch party room:', err.message);
        return res.status(500).json({ error: 'Failed to check watch party room' });
      }
      
      if (!room) {
        return res.status(404).json({ error: 'Watch party room not found or inactive' });
      }
      
      // Check if the user is already a member
      db.get('SELECT * FROM party_members WHERE room_token = ? AND user_token = ?', [roomToken, userToken], (err, member) => {
        if (err) {
          console.error('Error checking watch party membership:', err.message);
          return res.status(500).json({ error: 'Failed to check watch party membership' });
        }
        
        if (member) {
          return res.json({ roomToken, roomName: room.room_name, isHost: room.host_token === userToken });
        }
        
        // Add the user as a member
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        db.run(
          'INSERT INTO party_members (room_token, user_token, username, joined_at) VALUES (?, ?, ?, ?)',
          [roomToken, userToken, user.username, timestamp],
          function(err) {
            if (err) {
              console.error('Error adding member to watch party room:', err.message);
              return res.status(500).json({ error: 'Failed to add member to watch party room' });
            }
            
            res.json({ roomToken, roomName: room.room_name, isHost: room.host_token === userToken });
          }
        );
      });
    });
  });
});

// API endpoint to leave a watch party room
app.post('/api/party/leave', (req, res) => {
  const { roomToken, userToken } = req.body;
  
  if (!roomToken || !userToken) {
    return res.status(400).json({ error: 'Room token and user token are required' });
  }
  
  // Check if the user is the host
  db.get('SELECT * FROM party_rooms WHERE room_token = ? AND host_token = ?', [roomToken, userToken], (err, room) => {
    if (err) {
      console.error('Error checking watch party host:', err.message);
      return res.status(500).json({ error: 'Failed to check watch party host' });
    }
    
    if (room) {
      // If the user is the host, deactivate the room
      db.run('UPDATE party_rooms SET active = 0 WHERE room_token = ?', [roomToken], (err) => {
        if (err) {
          console.error('Error deactivating watch party room:', err.message);
          return res.status(500).json({ error: 'Failed to deactivate watch party room' });
        }
        
        // Remove all members
        db.run('DELETE FROM party_members WHERE room_token = ?', [roomToken], (err) => {
          if (err) {
            console.error('Error removing watch party members:', err.message);
            return res.status(500).json({ error: 'Failed to remove watch party members' });
          }
          
          res.json({ success: true, message: 'Watch party room closed' });
        });
      });
    } else {
      // If the user is not the host, just remove them as a member
      db.run('DELETE FROM party_members WHERE room_token = ? AND user_token = ?', [roomToken, userToken], (err) => {
        if (err) {
          console.error('Error removing watch party member:', err.message);
          return res.status(500).json({ error: 'Failed to remove watch party member' });
        }
        
        res.json({ success: true, message: 'Left watch party room' });
      });
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
