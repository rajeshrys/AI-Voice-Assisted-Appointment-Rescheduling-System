const express = require('express');
const app = express();
const cors = require('cors');
const cookieparser = require('cookie-parser');
require('dotenv').config()
const authRoutes = require("./api/routes/auth.routes");

// middlewares
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(cookieparser());

// routes
app.use('/api/auth', authRoutes);


module.exports = app;