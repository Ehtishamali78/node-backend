const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getCosmosContainer } = require('../config/cosmos');

const router = express.Router();

// Sign Up
router.post('/signup', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).send('All fields are required');
  }

  try {
    const container = await getCosmosContainer();

    // Check for existing username
    const { resources: existingUsers } = await container.items
      .query(`SELECT * FROM c WHERE c.username = "${username}"`)
      .fetchAll();

    if (existingUsers.length > 0) {
      return res.status(400).send('Username already exists');
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = { id: `user-${Date.now()}`, username, password: hashedPassword, role };

    await container.items.create(user);
    res.status(201).send('User registered successfully');
  } catch (err) {
    console.error('Error registering user:', err.message, err.stack);
    res.status(500).send('Error registering user');
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const container = await getCosmosContainer();
    const { resources: users } = await container.items
      .query(`SELECT * FROM c WHERE c.username = "${username}"`)
      .fetchAll();

    if (users.length === 0) {
      return res.status(404).send('User not found');
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send('Invalid credentials');
    }

    // Generate token and include role in the response
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, role: user.role }); // Include role in response
  } catch (err) {
    console.error('Error logging in:', err.message, err.stack);
    res.status(500).send('Error logging in');
  }
});


module.exports = router;
