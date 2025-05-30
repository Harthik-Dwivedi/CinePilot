require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Socket.IO connection handling
const connectedUsers = new Set();
const userSocketMap = {};

io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;
    if (userId) {
        userSocketMap[userId] = socket.id;
    }
    // Add user to connected users
    connectedUsers.add(socket.id);
    io.emit('online users', connectedUsers.size);

    // Handle chat messages
    socket.on('chat message', async (message) => {
        try {
            if (!userId) return;
            // If recipientId is present, it's a user-to-user chat
            let recipientId = message.recipientId || null;
            let movieId = message.movieId || null;
            const [result] = await pool.query(`
                INSERT INTO chatmessages (user_id, recipient_id, content, message_type, movie_id)
                VALUES (?, ?, ?, ?, ?)
            `, [userId, recipientId, message.content, message.type, movieId]);

            const [newMessage] = await pool.query(`
                SELECT cm.*, u.username, u.profile_picture
                FROM chatmessages cm
                JOIN Users u ON cm.user_id = u.user_id
                WHERE cm.message_id = ?
            `, [result.insertId]);

            // Emit to sender
            socket.emit('chat message', newMessage[0]);
            // Emit to recipient if online
            const recipientSocketId = userSocketMap[recipientId];
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('chat message', newMessage[0]);
            }
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        // Remove from userSocketMap
        for (const [uid, sid] of Object.entries(userSocketMap)) {
            if (sid === socket.id) delete userSocketMap[uid];
        }
        io.emit('online users', connectedUsers.size);
    });
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set to true if using HTTPS
}));

// Set view engine
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cinepilot',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
};

// Create necessary directories
const uploadDir = 'public/uploads/profile_pictures';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files
app.use(express.static('public'));

// User routes
const userRoutes = require('./routes/user');
app.use('/user', isAuthenticated, userRoutes);

// Import social routes
const socialRoutes = require('./routes/social');

// Import chat routes
const chatRoutes = require('./routes/chat');

// Routes
app.get('/', async (req, res) => {
  try {
    const [movies] = await pool.query('SELECT * FROM Movies LIMIT 6');
    const [showtimes] = await pool.query(`
      SELECT s.*, m.title as movie_title, t.name as theater_name 
      FROM Showtimes s
      JOIN Movies m ON s.movie_id = m.movie_id
      JOIN Theaters t ON s.theater_id = t.theater_id
      WHERE s.show_date >= CURDATE()
      ORDER BY s.show_date, s.show_time
      LIMIT 10
    `);
    
    res.render('index', { 
      user: req.session.user || null,
      movies,
      showtimes
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Server error');
  }
});

// Login routes
app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const [users] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.render('login', { error: 'Invalid email or password' });
    }
    
    const user = users[0];
    
    // In a real app, use bcrypt.compare
    // For demo purposes, we'll just compare the hashed password directly
    if (user.password_hash !== password) {
      return res.render('login', { error: 'Invalid email or password' });
    }
    
    req.session.userId = user.user_id;
    req.session.user = {
      id: user.user_id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name
    };
    
    res.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { error: 'Server error' });
  }
});

// Register routes
app.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
  const { username, email, password, firstName, lastName, phone } = req.body;
  
  try {
    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM Users WHERE email = ? OR username = ?', 
      [email, username]
    );
    
    if (existingUsers.length > 0) {
      return res.render('register', { error: 'Email or username already exists' });
    }
    
    // In a real app, hash the password with bcrypt
    // const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPassword = password; // For demo only
    
    await pool.query(
      'INSERT INTO Users (username, email, password_hash, first_name, last_name, phone_number) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, hashedPassword, firstName, lastName, phone]
    );
    
    res.redirect('/login');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', { error: 'Server error' });
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Movies routes
app.get('/movies', async (req, res) => {
  try {
    const {
      genre,
      rating,
      minDate,
      maxDate,
      minDuration,
      maxDuration,
      status,
      sort = 'release_date',
      order = 'DESC',
      page = 1,
      limit = 12,
      q: searchQuery = ''
    } = req.query;

    let query = 'SELECT DISTINCT m.* FROM Movies m';
    const params = [];
    const conditions = [];

    if (searchQuery) {
      conditions.push('(m.title LIKE ? OR m.description LIKE ?)');
      params.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    if (genre) {
      query += ' JOIN MovieGenres mg ON m.movie_id = mg.movie_id';
      conditions.push('mg.genre = ?');
      params.push(genre);
    }

    if (rating) {
      conditions.push('m.rating = ?');
      params.push(rating);
    }

    if (minDate) {
      conditions.push('m.release_date >= ?');
      params.push(minDate);
    }

    if (maxDate) {
      conditions.push('m.release_date <= ?');
      params.push(maxDate);
    }

    if (minDuration) {
      conditions.push('m.duration_minutes >= ?');
      params.push(minDuration);
    }

    if (maxDuration) {
      conditions.push('m.duration_minutes <= ?');
      params.push(maxDuration);
    }

    if (status) {
      conditions.push('m.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add sorting
    const validSortFields = ['release_date', 'title', 'duration_minutes', 'imdb_rating'];
    const validOrders = ['ASC', 'DESC'];
    const sortField = validSortFields.includes(sort) ? sort : 'release_date';
    const sortOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';
    query += ` ORDER BY ${sortField} ${sortOrder}`;

    // Add pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const offset = (pageNum - 1) * limitNum;
    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [movies] = await pool.query(query, params);
    
    // Get total count for pagination
    const [totalCount] = await pool.query(
      'SELECT COUNT(DISTINCT m.movie_id) as total FROM Movies m' + 
      (conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''),
      params.slice(0, -2)
    );

    res.render('movies', {
      user: req.session.user || null,
      movies,
      filters: req.query,
      searchQuery,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount[0].total / limitNum),
        totalItems: totalCount[0].total
      }
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).send('Server error');
  }
});

app.get('/movies/:id', async (req, res) => {
  try {
    // Get movie details
    const [movies] = await pool.query('SELECT * FROM Movies WHERE movie_id = ?', [req.params.id]);
    
    if (movies.length === 0) {
      return res.status(404).render('error', { 
        message: 'Movie not found',
        error: {}
      });
    }
    
    const movie = movies[0];
    
    // Get genres
    const [genres] = await pool.query('SELECT genre FROM MovieGenres WHERE movie_id = ?', [req.params.id]);
    movie.genres = genres.map(g => g.genre);
    
    // Get showtimes
    const [showtimes] = await pool.query(`
      SELECT s.*, t.name as theater_name 
      FROM Showtimes s
      JOIN Theaters t ON s.theater_id = t.theater_id
      WHERE s.movie_id = ? AND s.show_date >= CURDATE()
      ORDER BY s.show_date, s.show_time
    `, [req.params.id]);

    // Get cast
    const [cast] = await pool.query('SELECT * FROM Cast WHERE movie_id = ?', [req.params.id]);
    
    // Get reviews
    const [reviews] = await pool.query(`
      SELECT r.*, u.username 
      FROM Reviews r
      JOIN Users u ON r.user_id = u.user_id
      WHERE r.movie_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.id]);

    // Get tags
    const [tags] = await pool.query('SELECT tag FROM MovieTags WHERE movie_id = ?', [req.params.id]);

    // Get similar movies based on genres
    const [similarMovies] = await pool.query(`
      SELECT DISTINCT m.* 
      FROM Movies m
      JOIN MovieGenres mg ON m.movie_id = mg.movie_id
      WHERE mg.genre IN (SELECT genre FROM MovieGenres WHERE movie_id = ?)
      AND m.movie_id != ?
      LIMIT 4
    `, [req.params.id, req.params.id]);
    
    res.render('movie-detail', {
      user: req.session.user || null,
      movie,
      showtimes,
      cast,
      reviews,
      genres: movie.genres,
      tags: tags.map(t => t.tag),
      similarMovies
    });
  } catch (error) {
    console.error('Error fetching movie details:', error);
    res.status(500).render('error', { 
      message: 'Error loading movie details',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Booking routes
app.get('/book/:showtimeId', isAuthenticated, async (req, res) => {
  try {
    const [showtimes] = await pool.query(`
      SELECT s.*, m.title as movie_title, t.name as theater_name, m.movie_id 
      FROM Showtimes s
      JOIN Movies m ON s.movie_id = m.movie_id
      JOIN Theaters t ON s.theater_id = t.theater_id
      WHERE s.showtime_id = ?
    `, [req.params.showtimeId]);
    
    if (showtimes.length === 0) {
      return res.status(404).send('Showtime not found');
    }
    
    res.render('booking', { 
      user: req.session.user,
      showtime: showtimes[0]
    });
  } catch (error) {
    console.error('Error fetching showtime details:', error);
    res.status(500).send('Server error');
  }
});

app.post('/book', isAuthenticated, async (req, res) => {
    console.log('Booking for userId:', req.session.userId, 'Body:', req.body);
  let { showtimeId, seats } = req.body;
  const userId = req.session.userId;

  // Convert seats to integer and validate
  seats = parseInt(seats, 10);
  if (!showtimeId || isNaN(seats) || seats < 1) {
    return res.status(400).json({ success: false, message: 'Invalid booking details.' });
  }

  try {
    // Get showtime details to calculate total amount
    const [showtimes] = await pool.query(
      'SELECT * FROM Showtimes WHERE showtime_id = ?', 
      [showtimeId]
    );
    
    if (showtimes.length === 0) {
      return res.status(404).json({ success: false, message: 'Showtime not found' });
    }
    
    const showtime = showtimes[0];
    
    if (showtime.available_seats < seats) {
      return res.status(400).json({ 
        success: false, 
        message: 'Not enough seats available' 
      });
    }
    
    const totalAmount = Number(showtime.price) * seats;
    
    // Create booking in transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [result] = await connection.query(
        'INSERT INTO Bookings (user_id, showtime_id, number_of_seats, total_amount, created_at) VALUES (?, ?, ?, ?, NOW())',
        [userId, showtimeId, seats, totalAmount]
      );
      
      // The trigger will automatically update the available seats
      
      await connection.commit();
      
      res.json({ 
        success: true, 
        bookingId: result.insertId,
        message: 'Booking successful!' 
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// My bookings route
app.get('/my-bookings', isAuthenticated, async (req, res) => {
  try {
    const [bookings] = await pool.query(`
      SELECT b.*, s.show_date, s.show_time, m.title as movie_title, t.name as theater_name
      FROM Bookings b
      JOIN Showtimes s ON b.showtime_id = s.showtime_id
      JOIN Movies m ON s.movie_id = m.movie_id
      JOIN Theaters t ON s.theater_id = t.theater_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `, [req.session.userId]);
    
    res.render('my-bookings', { 
      user: req.session.user,
      bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).send('Server error');
  }
});

// Add Movie page
app.get('/add-movie', isAuthenticated, (req, res) => {
  res.render('add-movie', { user: req.session.user, error: null });
});

app.post('/add-movie', isAuthenticated, async (req, res) => {
  const {
    title,
    genres,
    release_date,
    duration_minutes,
    rating,
    status,
    language,
    subtitles,
    description,
    image_url,
    trailer_url,
    imdb_rating,
    rotten_tomatoes_rating,
    tags
  } = req.body;

  // Validate required fields
  if (!title || !release_date || !duration_minutes || !rating || !status || !language || !description || !image_url) {
    return res.render('add-movie', {
      user: req.session.user,
      error: 'Please fill in all required fields',
      formData: req.body
    });
  }

  try {
    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert movie
      const [result] = await connection.query(
        `INSERT INTO Movies (
          title, release_date, duration_minutes, rating, status,
          language, subtitles, description, image_url, trailer_url,
          imdb_rating, rotten_tomatoes_rating
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          release_date,
          parseInt(duration_minutes),
          rating,
          status,
          language,
          subtitles || null,
          description,
          image_url,
          trailer_url || null,
          imdb_rating ? parseFloat(imdb_rating) : null,
          rotten_tomatoes_rating ? parseInt(rotten_tomatoes_rating) : null
        ]
      );

      const movieId = result.insertId;

      // Insert genres
      if (genres && Array.isArray(genres) && genres.length > 0) {
        const genreValues = genres.map(genre => [movieId, genre]);
        await connection.query(
          'INSERT INTO MovieGenres (movie_id, genre) VALUES ?',
          [genreValues]
        );
      }

      // Insert tags
      if (tags) {
        const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        if (tagList.length > 0) {
          const tagValues = tagList.map(tag => [movieId, tag]);
          await connection.query(
            'INSERT INTO MovieTags (movie_id, tag) VALUES ?',
            [tagValues]
          );
        }
      }

      await connection.commit();
      res.redirect('/movies');
    } catch (error) {
      await connection.rollback();
      console.error('Error in transaction:', error);
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error adding movie:', error);
    res.render('add-movie', {
      user: req.session.user,
      error: 'Failed to add movie. Please check all required fields and try again.',
      formData: req.body
    });
  }
});

// All Bookings page
app.get('/all-bookings', isAuthenticated, async (req, res) => {
  try {
    const [bookings] = await pool.query(`
      SELECT b.*, u.username, s.show_date, s.show_time, m.title as movie_title, t.name as theater_name
      FROM Bookings b
      JOIN Users u ON b.user_id = u.user_id
      JOIN Showtimes s ON b.showtime_id = s.showtime_id
      JOIN Movies m ON s.movie_id = m.movie_id
      JOIN Theaters t ON s.theater_id = t.theater_id
      ORDER BY b.created_at DESC
    `);
    res.render('all-bookings', { user: req.session.user, bookings });
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).send('Server error');
  }
});

// Watchlist routes
app.post('/watchlist/add', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  const { movieId } = req.body;
  try {
    // Prevent duplicates
    const [existing] = await pool.query('SELECT * FROM Watchlist WHERE user_id = ? AND movie_id = ?', [userId, movieId]);
    if (existing.length === 0) {
      await pool.query('INSERT INTO Watchlist (user_id, movie_id) VALUES (?, ?)', [userId, movieId]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    res.status(500).json({ success: false });
  }
});

app.post('/watchlist/remove', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  const { movieId } = req.body;
  try {
    await pool.query('DELETE FROM Watchlist WHERE user_id = ? AND movie_id = ?', [userId, movieId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({ success: false });
  }
});

app.get('/watchlist', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  try {
    const [movies] = await pool.query(`
      SELECT DISTINCT m.*, w.created_at
      FROM Movies m
      JOIN Watchlist w ON m.movie_id = w.movie_id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `, [userId]);

    // Get genres for each movie
    for (let movie of movies) {
      const [genres] = await pool.query(
        'SELECT genre FROM MovieGenres WHERE movie_id = ?',
        [movie.movie_id]
      );
      movie.genres = genres.map(g => g.genre);
    }

    res.render('watchlist', {
      user: req.session.user,
      movies,
      error: null
    });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.render('watchlist', {
      user: req.session.user,
      movies: [],
      error: 'Error loading watchlist. Please try again.'
    });
  }
});

// Search feature
app.get('/search', async (req, res) => {
  const query = req.query.q || '';
  try {
    const [movies] = await pool.query(
      `SELECT * FROM Movies WHERE title LIKE ? OR genre LIKE ?`,
      [`%${query}%`, `%${query}%`]
    );
    res.render('movies', { user: req.session.user || null, movies, searchQuery: query });
  } catch (error) {
    console.error('Error searching movies:', error);
    res.status(500).send('Server error');
  }
});

// Add review
app.post('/movies/:id/review', isAuthenticated, async (req, res) => {
  const { rating, reviewText } = req.body;
  const movieId = req.params.id;
  const userId = req.session.userId;

  try {
    await pool.query(
      'INSERT INTO Reviews (movie_id, user_id, rating, review_text) VALUES (?, ?, ?, ?)',
      [movieId, userId, rating, reviewText]
    );
    res.redirect(`/movies/${movieId}`);
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).send('Server error');
  }
});

// Profile page route
app.get('/profile', isAuthenticated, async (req, res) => {
  try {
    // Get user data
    const [users] = await pool.query(
      'SELECT * FROM Users WHERE user_id = ?',
      [req.session.userId]
    );

    if (users.length === 0) {
      return res.status(404).send('User not found');
    }

    const user = users[0];

    // Get user preferences
    const [preferences] = await pool.query(
      'SELECT * FROM UserPreferences WHERE user_id = ?',
      [req.session.userId]
    );

    // Get notifications
    const [notifications] = await pool.query(
      'SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [req.session.userId]
    );

    res.render('profile', {
      user: {
        ...user,
        firstName: user.first_name,
        lastName: user.last_name
      },
      userPreferences: preferences[0] || {},
      notifications: notifications || []
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.status(500).render('error', {
      message: 'Error loading profile',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Add social routes
app.use('/social', socialRoutes);

// Add watch parties page route
app.get('/watch-parties', isAuthenticated, (req, res) => {
    res.render('watch-parties', {
        user: req.session.user,
        title: 'Watch Parties'
    });
});

// API endpoint to get all movies (for watch party creation)
app.get('/api/movies', async (req, res) => {
  try {
    const [movies] = await pool.query('SELECT movie_id, title FROM Movies ORDER BY title');
    res.json(movies);
  } catch (error) {
    console.error('Error fetching movies for API:', error);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// Add chat routes
app.use('/chat', chatRoutes);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 