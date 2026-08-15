const express = require("express");
const router = express.Router();
const authcontroller = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

// Patient register
router.post('/register', authcontroller.register);


// Patient login
router.post('/login', authcontroller.login);




module.exports = router;