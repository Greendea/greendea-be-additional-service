### Additional Backend Service
## This project implements an additional backend service with the following functions:

Sendmail with Nodemailer: This function allows sending emails using the Node.js package Nodemailer. This can be used for sending transactional emails, newsletters, or any other type of email.

Trigger activate user online with cache-node: This function triggers the activation of a user when they come online. It uses the Node.js package cache-node to cache the user's activation status, so that subsequent requests do not result in unnecessary database queries.

Get available users connect to PostgreSQL: This function retrieves the list of users who are currently available in the system. It connects to a PostgreSQL database using the Node.js package pg, and returns the the count of users.

## Prerequisites
Node.js v12 or later
PostgreSQL v11 or later
