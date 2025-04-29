const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const db = require('../models');
const authMiddleware = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation'); // Import validation handler

const router = express.Router();
const User = db.User;
const Role = db.Role;

// Password validation regex (consider making this configurable)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;

// --- Swagger Definitions ---

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRegister:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - full_name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address.
 *         password:
 *           type: string
 *           format: password
 *           description: User's password (must meet complexity requirements).
 *           minLength: 12
 *         full_name:
 *           type: string
 *           description: User's full name.
 *       example:
 *         email: user@example.com
 *         password: StrongPassword123!
 *         full_name: John Doe
 *     UserLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address.
 *         password:
 *           type: string
 *           format: password
 *           description: User's password.
 *       example:
 *         email: user@example.com
 *         password: StrongPassword123!
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT authentication token.
 *         user:
 *           $ref: '#/components/schemas/User' # Reference the User model schema
 *     UserResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/User' # Reference the User model schema
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * security:
 *   - bearerAuth: []
 */

// --- Routes ---

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     full_name:
 *                       type: string
 *       400:
 *         description: Bad Request (e.g., user already exists)
 *       422:
 *         description: Validation Error
 *       500:
 *         description: Server Error
 */
router.post(
  '/register',
  [
    body('email')
      .trim()
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail() // Normalize email address
      .escape(), // Sanitize email
    body('password')
      .matches(passwordRegex)
      .withMessage('Password must be at least 12 characters and include uppercase, lowercase, numbers, and symbols'),
      // No sanitization for password before hashing
    body('full_name')
      .trim()
      .notEmpty().withMessage('Full name is required')
      .escape(), // Sanitize full name
  ],
  handleValidationErrors, // Apply validation error handler
  async (req, res, next) => { // Added next for error propagation
    const { email, password, full_name } = req.body;

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Create user
      const user = await User.create({
        email,
        password_hash,
        full_name,
      });

      // Assign default role (Data Entry Clerk) - Ensure this role exists via seeding
      const dataEntryRole = await Role.findOne({ where: { name: 'Data Entry Clerk' } });
      if (dataEntryRole) {
        await user.addRole(dataEntryRole);
      } else {
          console.warn("Default role 'Data Entry Clerk' not found. User created without role.");
          // Potentially log this as an error or handle differently
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
        },
      });
    } catch (err) {
      // Pass error to the centralized error handler
      next(err);
    }
  }
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user and get JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *       422:
 *         description: Validation Error
 *       500:
 *         description: Server Error
 */
router.post(
  '/login',
  [
    body('email')
      .trim()
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail()
      .escape(),
    body('password')
      .notEmpty().withMessage('Password is required'),
      // No sanitization for password
  ],
  handleValidationErrors, // Apply validation error handler
  async (req, res, next) => { // Added next
    const { email, password } = req.body;

    try {
      // Check if user exists
      const user = await User.findOne({
        where: { email },
        include: [{ model: Role, as: 'roles', attributes: ['id', 'name'] }], // Specify attributes for roles
      });

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Validate password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Create JWT payload
      const payload = {
        user: {
          id: user.id,
          email: user.email,
          roles: user.roles.map(role => role.name), // Keep roles as names in token payload
        },
      };

      // Sign token
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }, // Use env var for expiration
        (err, token) => {
          if (err) {
              // If signing fails, pass error to central handler
              return next(new Error('Failed to sign JWT token'));
          }
          res.json({
            token,
            user: {
              id: user.id,
              email: user.email,
              full_name: user.full_name,
              roles: user.roles, // Return full role objects in response body
            },
          });
        }
      );
    } catch (err) {
      // Pass error to the centralized error handler
      next(err);
    }
  }
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user's details
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized (token missing or invalid)
 *       404:
 *         description: User not found
 *       500:
 *         description: Server Error
 */
router.get('/me', authMiddleware, async (req, res, next) => { // Added next
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash', 'createdAt', 'updatedAt'] }, // Exclude timestamps too
      include: [{ model: Role, as: 'roles', attributes: ['id', 'name'] }], // Specify attributes
    });

    if (!user) {
      // Use 404 for resource not found
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user }); // Simplify response structure
  } catch (err) {
     // Pass error to the centralized error handler
    next(err);
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user (informational endpoint)
 *     tags: [Auth]
 *     description: Logs out the user. Since JWT is stateless, this is primarily handled client-side by removing the token. This endpoint exists for API consistency.
 *     responses:
 *       200:
 *         description: Logout successful message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 */
router.post('/logout', (req, res) => {
  // JWT is stateless, actual logout is deleting the token on the client
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;