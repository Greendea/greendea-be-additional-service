const express = require('express');
const nodemailer = require('nodemailer');
const Joi = require('joi');
const cors = require("cors");
const winston = require('winston');
const NodeCache = require("node-cache");
const { Pool } = require("pg");
const expressWinston = require('express-winston');
require('dotenv').config();
// Configure logging using Winston
const app = express();
const logger = winston.createLogger({
    level: 'info',
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});
//CORS
app.use(
    cors({
        origin: true, // Enable CORS for all origins
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // Allow all HTTP methods
        credentials: true, // Enable credentials (cookies, authorization headers, etc.)
    })
);
// Enable JSON request parsing
app.use(express.json());
//LOG
app.use(expressWinston.logger({
    winstonInstance: logger,
    meta: false,
    msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
    colorize: true,
    skip: (req, res) => res.statusCode < 400
}));
// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
///Cache init
const pool = new Pool({
    connectionString: process.env.DB_CONNECTION,
});
const cache = new NodeCache({ stdTTL: 60 });




// Define a POST endpoint for sending emails
const schema = Joi.object({
    recipients: Joi.array().items(Joi.string().email()).min(1).required(),
    message_text: Joi.string().min(1).required(),
    message_html: Joi.string().min(1).required(),
    subject: Joi.string().min(1).required(),
});

// Define a POST endpoint for sending emails
app.post('/send-email', (req, res) => {
    try {
        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { recipients, message_text, message_html, subject } = value;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipients.join(', '),
            subject: subject,
            text: message_text,
            html: message_html
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
                logger.error(error.message);
                res.status(500).json({ error: 'An error occurred while sending the email.' });
            } else {
                console.log('Email sent: ' + info.response);
                res.status(200).json({ message: 'Email sent successfully.' });
            }
        });
    } catch (err) {
        console.error(err);
        logger.error(err.message);
        res.status(500).json({ error: 'An error occurred while sending the email.' });
    }
});




// Cache user
async function countRecords() {
    const { rows } = await pool.query("SELECT COUNT(*) FROM users");
    return rows[0].count
}

function updateCache() {
    countRecords().then(res => {
        console.log("Available user in sytem", res)
        cache.set("available_user", res)
    }).catch(err => {
        console.log(err)
    })
}
setInterval(updateCache, 10000);

// Define a route that retrieves data from the cache
app.post("active_email/", (req, res) => {
    try {
        return res.status(200).json(cache.set(req.query.email, "", 30))
    } catch (err) {
        console.log(err)
        return res.status(500).json()
    }
});

// Define a route that retrieves data from the cache
app.get("users/", (req, res) => {
    try {
        return res.status(200).json({
            "online_users": cache.keys().map(key => cache.getTtl(key) > 0 ? 1 : 0).reduce((a, b) => a + b, -1),
            "all_users": cache.get("available_user")
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json()
    }
});




// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});