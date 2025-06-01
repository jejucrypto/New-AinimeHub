/**
 * Database migration script to update the schema
 */
const sqlite3 = require('sqlite3').verbose();

// Initialize SQLite database
const db = new sqlite3.Database('./chat.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    process.exit(1);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Check if token column exists
    db.get("PRAGMA table_info(users)", (err, rows) => {
      if (err) {
        console.error('Error checking table schema:', err.message);
        closeAndExit(1);
      }
      
      // Add token and token_expiry columns if they don't exist
      db.run(`ALTER TABLE users ADD COLUMN token TEXT;`, (err) => {
        if (err) {
          // Column might already exist
          console.log('Token column already exists or error:', err ? err.message : 'No error');
        } else {
          console.log('Added token column to users table');
        }
        
        db.run(`ALTER TABLE users ADD COLUMN token_expiry TEXT;`, (err) => {
          if (err) {
            // Column might already exist
            console.log('Token_expiry column already exists or error:', err ? err.message : 'No error');
          } else {
            console.log('Added token_expiry column to users table');
          }
          
          // Close the database connection
          closeAndExit(0);
        });
      });
    });
  }
});

function closeAndExit(code) {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(code);
  });
}
