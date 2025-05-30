const express = require('express');
const router = express.Router();
const pool = require('../db');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Please log in to access this feature' });
    }
};

// Forum routes
router.post('/forums', isAuthenticated, async (req, res) => {
    try {
        const { movie_id, title, description } = req.body;
        const [result] = await pool.query(
            'INSERT INTO Forums (movie_id, title, description, created_by) VALUES (?, ?, ?, ?)',
            [movie_id, title, description, req.session.user.user_id]
        );
        res.json({ forum_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/forums/:forum_id/posts', isAuthenticated, async (req, res) => {
    try {
        const { content } = req.body;
        const [result] = await pool.query(
            'INSERT INTO ForumPosts (forum_id, user_id, content) VALUES (?, ?, ?)',
            [req.params.forum_id, req.session.user.user_id, content]
        );
        res.json({ post_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Review routes
router.post('/movies/:movie_id/reviews', isAuthenticated, async (req, res) => {
    try {
        const { rating, review_text } = req.body;
        const [result] = await pool.query(
            'INSERT INTO Reviews (movie_id, user_id, rating, review_text) VALUES (?, ?, ?, ?)',
            [req.params.movie_id, req.session.user.user_id, rating, review_text]
        );
        res.json({ review_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Friend system routes
router.post('/friends/request/:friend_id', isAuthenticated, async (req, res) => {
    try {
        const [result] = await pool.query(
            'INSERT INTO Friends (user_id, friend_id) VALUES (?, ?)',
            [req.session.user.user_id, req.params.friend_id]
        );
        res.json({ friendship_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/friends/:friendship_id/accept', isAuthenticated, async (req, res) => {
    try {
        await pool.query(
            'UPDATE Friends SET status = "accepted" WHERE friendship_id = ?',
            [req.params.friendship_id]
        );
        res.json({ message: 'Friend request accepted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Watch Party routes
router.post('/watch-parties', isAuthenticated, async (req, res) => {
    try {
        const { movie_id, title, description, scheduled_time, max_participants } = req.body;
        const [result] = await pool.query(
            'INSERT INTO WatchParties (movie_id, host_id, title, description, scheduled_time, max_participants) VALUES (?, ?, ?, ?, ?, ?)',
            [movie_id, req.session.userId, title, description, scheduled_time, max_participants]
        );
        res.json({ party_id: result.insertId });
    } catch (error) {
        console.error('Error creating watch party:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/watch-parties/:party_id/join', isAuthenticated, async (req, res) => {
    try {
        const [result] = await pool.query(
            'INSERT INTO WatchPartyParticipants (party_id, user_id) VALUES (?, ?)',
            [req.params.party_id, req.session.user.user_id]
        );
        res.json({ participant_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Social sharing routes
router.post('/share/:movie_id', isAuthenticated, async (req, res) => {
    try {
        const { platform, share_text } = req.body;
        const [result] = await pool.query(
            'INSERT INTO SocialShares (user_id, movie_id, platform, share_text) VALUES (?, ?, ?, ?)',
            [req.session.user.user_id, req.params.movie_id, platform, share_text]
        );
        res.json({ share_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get routes for fetching data
router.get('/forums/:movie_id', async (req, res) => {
    try {
        const [forums] = await pool.query(
            'SELECT * FROM Forums WHERE movie_id = ?',
            [req.params.movie_id]
        );
        res.json(forums);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/movies/:movie_id/reviews', async (req, res) => {
    try {
        const [reviews] = await pool.query(
            'SELECT r.*, u.username FROM Reviews r JOIN Users u ON r.user_id = u.user_id WHERE r.movie_id = ?',
            [req.params.movie_id]
        );
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/watch-parties', isAuthenticated, async (req, res) => {
    try {
        const [parties] = await pool.query(
            'SELECT wp.*, m.title as movie_title, u.username as host_name FROM WatchParties wp JOIN Movies m ON wp.movie_id = m.movie_id JOIN Users u ON wp.host_id = u.user_id WHERE wp.status = "scheduled"'
        );
        res.json(parties);
    } catch (error) {
        console.error('Error fetching watch parties:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all watch parties where the user is host or participant
router.get('/my-watch-parties', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const [parties] = await pool.query(`
            SELECT wp.*, m.title as movie_title, u.username as host_name
            FROM WatchParties wp
            JOIN Movies m ON wp.movie_id = m.movie_id
            JOIN Users u ON wp.host_id = u.user_id
            WHERE wp.host_id = ?
            OR wp.party_id IN (SELECT party_id FROM WatchPartyParticipants WHERE user_id = ?)
            ORDER BY wp.scheduled_time DESC
        `, [userId, userId]);
        res.json(parties);
    } catch (error) {
        console.error('Error fetching my watch parties:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 