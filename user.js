const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('../db');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: 'public/uploads/profile_pictures',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Profile picture upload
router.post('/profile/picture', upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const profilePicturePath = '/uploads/profile_pictures/' + req.file.filename;
    await pool.query(
      'UPDATE Users SET profile_picture = ? WHERE user_id = ?',
      [profilePicturePath, req.session.userId]
    );

    res.json({ success: true, profilePicture: profilePicturePath });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user preferences
router.post('/preferences', async (req, res) => {
  try {
    const { preferredGenres, notificationPreferences } = req.body;
    
    await pool.query(
      'INSERT INTO UserPreferences (user_id, preferred_genres, notification_preferences) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE preferred_genres = ?, notification_preferences = ?',
      [
        req.session.userId,
        JSON.stringify(preferredGenres),
        JSON.stringify(notificationPreferences),
        JSON.stringify(preferredGenres),
        JSON.stringify(notificationPreferences)
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Request password reset
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      'UPDATE Users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
      [token, expires, email]
    );

    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${token}`;
    
    await transporter.sendMail({
      to: email,
      subject: 'Password Reset Request',
      html: `Click <a href="${resetUrl}">here</a> to reset your password. This link will expire in 1 hour.`
    });

    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password with token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const [users] = await pool.query(
      'SELECT * FROM Users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE Users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE user_id = ?',
      [hashedPassword, users[0].user_id]
    );

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Share booking
router.post('/share-booking', async (req, res) => {
  try {
    const { bookingId, userId, message } = req.body;
    
    await pool.query(
      'INSERT INTO SharedBookings (booking_id, shared_by_user_id, shared_with_user_id, message) VALUES (?, ?, ?, ?)',
      [bookingId, req.session.userId, userId, message]
    );

    // Send notification to shared user
    await pool.query(
      'INSERT INTO Notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
      [userId, 'BOOKING_CONFIRMATION', 'Shared Booking', message]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error sharing booking:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Recommend movie
router.post('/recommend-movie', async (req, res) => {
  try {
    const { movieId, userId, message } = req.body;
    
    await pool.query(
      'INSERT INTO MovieRecommendations (movie_id, recommended_by_user_id, recommended_to_user_id, message) VALUES (?, ?, ?, ?)',
      [movieId, req.session.userId, userId, message]
    );

    // Send notification to recommended user
    await pool.query(
      'INSERT INTO Notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
      [userId, 'SYSTEM', 'Movie Recommendation', message]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error recommending movie:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get notifications
router.get('/notifications', async (req, res) => {
  try {
    const [notifications] = await pool.query(
      'SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.session.userId]
    );

    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
router.post('/notifications/:id/read', async (req, res) => {
  try {
    await pool.query(
      'UPDATE Notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 