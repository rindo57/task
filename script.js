const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect("mongodb+srv://diablo:OH4WLGrCZOlG6FH6@cluster0.qokt3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  createdAt: { type: Date, default: Date.now }
});

// Task Schema
const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  description: String,
  dueDate: Date,
  status: { type: String, enum: ["To Do", "In Progress", "Completed"], default: "To Do" },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

// Middleware to authenticate user
const authenticateUser = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).send('Access denied. No token provided.');

  try {
    const decoded = jwt.verify(token, "asdfjhj324");
    req.user = await User.findById(decoded._id);
    next();
  } catch (err) {
    res.status(400).send('Invalid token.');
  }
};

// Routes

// Register a new user
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    res.status(201).send('User registered successfully.');
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Login a user
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send('Invalid email or password.');

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).send('Invalid email or password.');

    const token = jwt.sign({ _id: user._id }, "asdfjhj324");
    res.send({ token });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Create a task
app.post('/tasks', authenticateUser, async (req, res) => {
  try {
    const { title, description, dueDate } = req.body;
    const task = new Task({ userId: req.user._id, title, description, dueDate });
    await task.save();
    res.status(201).send(task);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Get all tasks for a user
app.get('/tasks', authenticateUser, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id });
    res.send(tasks);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Update a task
app.put('/tasks/:id', authenticateUser, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!task) return res.status(404).send('Task not found.');
    res.send(task);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Delete a task
app.delete('/tasks/:id', authenticateUser, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!task) return res.status(404).send('Task not found.');
    res.send('Task deleted successfully.');
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Start the server
// Start the server
const PORT = process.env.PORT || 80;
const HOST = '0.0.0.0'; // Add this line
app.listen(PORT, HOST, () => console.log(`Server running on http://${HOST}:${PORT}`));
