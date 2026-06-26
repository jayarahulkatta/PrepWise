require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./db');

// Route imports
const usersRoutes = require('./routes/users');
const { router: questionsRoutes } = require('./routes/questions');
const aiRoutes = require('./routes/ai');
const codeRoutes = require('./routes/code');

const app = express();
const PORT = process.env.PORT || 5000;

// Security and middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

// Connect to MongoDB
connectDB();

// ─── ROUTES ─────────────────────────────────────────────────────────────────

app.use('/api/user', usersRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api', aiRoutes);
app.use('/api/code', codeRoutes);

// Base health check
app.get('/api', (req, res) => {
  res.json({ message: 'PrepWise API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
});

module.exports = app;
