    // backend/routes/auth.js
    const express = require('express');
    const router = express.Router();
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');

    // @route   POST /api/auth/register
    // @desc    Register a new user
    // @access  Public
    router.post('/register', async (req, res) => {
      const { username, password, role } = req.body;
      try {
        let user = await User.findOne({ username });
        if (user) {
          return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({ username, password, role });
        await user.save();

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(
          payload,
          process.env.JWT_SECRET,
          { expiresIn: '1h' }, // Token expires in 1 hour
          (err, token) => {
            if (err) throw err;
            res.json({ token });
          }
        );
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
    });

    // @route   POST /api/auth/login
    // @desc    Authenticate user & get token
    // @access  Public
    router.post('/login', async (req, res) => {
      const { username, password } = req.body;
      try {
        let user = await User.findOne({ username });
        if (!user) {
          return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
          return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(
          payload,
          process.env.JWT_SECRET,
          { expiresIn: '1h' },
          (err, token) => {
            if (err) throw err;
            res.json({ token });
          }
        );
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
    });

    module.exports = router;