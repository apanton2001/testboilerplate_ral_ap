const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const winston = require('winston');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Database models
const db = require('./models');

// --- Logger Setup ---
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }), // Log stack trace
    winston.format.splat(),
    winston.format.json() // Log in JSON format
  ),
  defaultMeta: { service: 'customs-api' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Create a stream object with a 'write' function that will be used by `morgan`
const stream = {
  write: (message) => {
    // Use the 'info' level so the output will be picked up by both transports
    logger.info(message.trim());
  },
};

// --- Initialize express app ---
const app = express();

// --- Middleware ---

// Security Headers (Helmet) - More specific configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], // Default policy for loading content such as JavaScript, Images, CSS, Fonts, AJAX requests, Frames, HTML5 Media
      scriptSrc: ["'self'", "'unsafe-inline'"], // Defines valid sources for JavaScript. 'unsafe-inline' might be needed for some libraries, review carefully.
      styleSrc: ["'self'", "'unsafe-inline'"], // Defines valid sources for stylesheets.
      imgSrc: ["'self'", "data:"], // Defines valid sources of images.
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'], // Specifies which URIs the application can connect to (via XHR, WebSockets, and EventSource).
      fontSrc: ["'self'"], // Defines valid sources for fonts loaded using @font-face.
      objectSrc: ["'none'"], // Defines valid sources for the <object>, <embed>, and <applet> elements.
      upgradeInsecureRequests: [], // Instructs user agents to treat all of a site's insecure URLs (those served over HTTP) as though they have been replaced with secure URLs (those served over HTTPS).
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Control how much referrer information is included with requests.
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }, // Enforce HTTPS
  frameguard: { action: 'deny' }, // Prevent clickjacking
  xssFilter: true, // Enable XSS filtering (deprecated but still useful in some browsers)
  noSniff: true, // Prevent MIME type sniffing
}));

// CORS Configuration - Allow specific origin
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // Allow cookies to be sent
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
  handler: (req, res, next, options) => {
		logger.warn(`Rate limit exceeded for IP ${req.ip}`);
		res.status(options.statusCode).send(options.message);
	},
});
app.use('/api', limiter); // Apply the rate limiting middleware to API calls only

// Compression
app.use(compression());

// Logging (Morgan with Winston stream)
app.use(morgan('combined', { stream }));

// Body Parsing
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies, limit size
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// --- Swagger API Documentation Setup ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Automated Customs Documentation Platform API',
      version: '1.0.0',
      description: 'API documentation for the Automated Customs Documentation Platform',
    },
    servers: [
      {
        url: `/api/v1`,
      },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            }
        }
    },
    security: [{
        bearerAuth: []
    }]
  },
  // Path to the API docs files
  apis: ['./src/routes/*.js', './src/models/*.js'], // Adjust path as needed
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
logger.info(`API Docs available at /api-docs`);

// --- Routes ---
app.get('/', (req, res) => {
  res.json({
    message: 'Automated Customs Documentation Platform API',
    version: '1.0.0', // Updated version
    status: 'operational'
  });
});

// Import route modules
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/invoices', require('./routes/invoices'));
app.use('/api/v1/classification', require('./routes/classification'));
app.use('/api/v1/documents', require('./routes/documents'));
app.use('/api/v1/submissions', require('./routes/submissions'));
app.use('/api/v1/reviews', require('./routes/reviews'));
app.use('/api/v1/notifications', require('./routes/notifications'));
app.use('/api/v1/integrations', require('./routes/integrations'));
app.use('/api/v1/reports', require('./routes/reports'));

// --- Centralized Error Handling Middleware ---
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Log the error internally
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, { error: err });

  // Respond with generic error in production
  const statusCode = err.status || 500;
  const response = {
    error: true,
    message: 'An unexpected error occurred on the server.',
  };

  // Provide more details in development
  if (process.env.NODE_ENV !== 'production') {
    response.message = err.message;
    response.stack = err.stack; // Include stack trace in dev
    if (err.details) { // Include validation details if available (e.g., from Joi or express-validator)
        response.details = err.details;
    }
  }

  res.status(statusCode).json(response);
});

// --- Database initialization and server startup ---
const PORT = process.env.PORT || 5000;

db.sequelize.sync({ force: process.env.DB_FORCE_SYNC === 'true' }) // Control sync force via env var
  .then(() => {
    logger.info('Database connected successfully');
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  })
  .catch(err => {
    logger.error('Failed to connect to the database:', { error: err });
    process.exit(1); // Exit if DB connection fails
  });

module.exports = app; // For testing