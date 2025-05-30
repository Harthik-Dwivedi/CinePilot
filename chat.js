const express = require('express');
const router = express.Router();
const db = require('../db');

// Get recent chat messages
router.get('/messages', async (req, res) => {
    try {
        const [messages] = await db.query(`
            SELECT cm.*, u.username, u.profile_picture, m.title as movie_title
            FROM ChatMessages cm
            JOIN Users u ON cm.user_id = u.user_id
            LEFT JOIN Movies m ON cm.movie_id = m.movie_id
            ORDER BY cm.created_at DESC
            LIMIT 50
        `);
        res.json(messages.reverse());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get message reactions
router.get('/messages/:messageId/reactions', async (req, res) => {
    try {
        const [reactions] = await db.query(`
            SELECT mr.*, u.username
            FROM MessageReactions mr
            JOIN Users u ON mr.user_id = u.user_id
            WHERE mr.message_id = ?
        `, [req.params.messageId]);
        res.json(reactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a reaction to a message
router.post('/messages/:messageId/reactions', async (req, res) => {
    try {
        const { emoji } = req.body;
        const userId = req.session.userId;
        const messageId = req.params.messageId;

        await db.query(`
            INSERT INTO MessageReactions (message_id, user_id, emoji)
            VALUES (?, ?, ?)
        `, [messageId, userId, emoji]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users except current user
router.get('/users', async (req, res) => {
    try {
        const userId = req.session.userId;
        const [users] = await db.query('SELECT user_id, username, profile_picture FROM Users WHERE user_id != ?', [userId]);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get messages between current user and selected user
router.get('/messages/:userId', async (req, res) => {
    try {
        const userId = req.session.userId;
        const otherUserId = req.params.userId;
        const [messages] = await db.query(`
            SELECT cm.*, u.username, u.profile_picture
            FROM ChatMessages cm
            JOIN Users u ON cm.user_id = u.user_id
            WHERE (cm.user_id = ? AND cm.recipient_id = ?) OR (cm.user_id = ? AND cm.recipient_id = ?)
            ORDER BY cm.created_at ASC
        `, [userId, otherUserId, otherUserId, userId]);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send a message to selected user
router.post('/messages/:userId', async (req, res) => {
    try {
        const fromUserId = req.session.userId;
        const toUserId = req.params.userId;
        const { content, message_type } = req.body;
        await db.query(
            'INSERT INTO ChatMessages (user_id, recipient_id, content, message_type, movie_id) VALUES (?, ?, ?, ?, NULL)',
            [fromUserId, toUserId, content, message_type || 'text']
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 