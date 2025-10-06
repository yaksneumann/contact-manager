# 🚀 Contact Management Backend API

RESTful API server for the Contact Management application, built with Node.js, Express, and SQLite. Provides comprehensive contact CRUD operations with support for offline-first frontend applications.

## 📋 Overview

This backend service powers the Contact Management PWA, offering:
- **RESTful API** endpoints for contact management
- **SQLite Database** for lightweight, file-based data storage
- **RandomUser.me Integration** for generating sample contact data
- **CORS Support** for cross-origin frontend requests
- **Error Handling** with meaningful HTTP status codes

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3 with SQL DDL/DML operations
- **External APIs**: RandomUser.me for sample data generation
- **Middleware**: CORS, Express JSON parser

## 📦 Installation

```bash
# Install dependencies
npm install

# Database will be automatically created on first run
```

## 🏃‍♂️ Running the Server

### Development Mode
```bash
npm run dev
# Server runs on http://localhost:3000 with auto-restart
```

### Production Mode
```bash
npm start
# Server runs on http://localhost:3000
```

### Environment Variables
```bash
PORT=3000  # Default port (configurable via environment)
```

## 🗄️ Database Schema

## 🔌 API Endpoints

### Contact Management

#### Get All Contacts
```http
GET /api/contacts
```
- **Response**: `200 OK` with contacts array
- **Features**: Alphabetical sorting by last name, first name

#### Get Contact by ID
```http
GET /api/contacts/:id
```
- **Response**: `200 OK` with contact object or `404 Not Found`

#### Create New Contact
```http
POST /api/contacts
Content-Type: application/json

{
  "name": { "first": "John", "last": "Doe" },
  "email": "john.doe@example.com",
  "phone": "+1-555-123-4567",
  "cell": "+1-555-987-6543",
  "location": {
    "street": { "number": 123, "name": "Main St" },
    "city": "Anytown",
    "state": "CA",
    "country": "USA",
    "postcode": "12345"
  },
  "picture": {
    "large": "https://example.com/photo.jpg",
    "medium": "https://example.com/photo-medium.jpg",
    "thumbnail": "https://example.com/photo-thumb.jpg"
  },
  "dob": { "date": "1990-01-01", "age": 33 }
}
```
- **Response**: `201 Created` with created contact or `409 Conflict` for duplicate email

#### Update Contact
```http
PUT /api/contacts/:id
Content-Type: application/json
```
- **Response**: `200 OK` with updated contact or `404 Not Found`

#### Delete Contact
```http
DELETE /api/contacts/:id
```
- **Response**: `200 OK` with success message or `404 Not Found`

#### Generate Random Contacts
```http
POST /api/contacts/random
Content-Type: application/json

{
  "count": 10
}
```
- **Response**: `201 Created` with array of created contacts
- **Features**: Fetches data from RandomUser.me API, sanitizes phone numbers

### System Health

#### Health Check
```http
GET /api/health
```
- **Response**: `200 OK` with server status

## 🔧 Features

### Data Validation
- **Email Uniqueness**: Prevents duplicate email addresses
- **Phone Sanitization**: Removes letters and invalid characters from phone numbers
- **Input Validation**: Server-side validation for required fields

### Error Handling
- **409 Conflict**: Duplicate email addresses
- **404 Not Found**: Contact not found
- **500 Internal Server Error**: Database or server errors
- **Meaningful Error Messages**: Descriptive error responses

### CORS Configuration
- **Enabled for All Origins**: Supports frontend development
- **All HTTP Methods**: GET, POST, PUT, DELETE
- **Content-Type Support**: JSON request/response handling

## 📁 Project Structure

```
backend/
├── server.js          # Main Express server with all routes
├── package.json       # Dependencies and scripts
├── contacts.db        # SQLite database (auto-created)
└── README.md         # This documentation
```

## 🚀 Deployment Considerations

### Production Setup
1. Set `NODE_ENV=production`
2. Configure appropriate `PORT` environment variable
3. Ensure SQLite file permissions for write access
4. Consider using process manager (PM2, Forever)

### Database Backup
```bash
# Backup SQLite database
cp contacts.db contacts_backup_$(date +%Y%m%d).db
```

## 🔍 Development & Testing

### API Testing
```bash
# Test server health
curl http://localhost:3000/api/health

# Get all contacts
curl http://localhost:3000/api/contacts

# Create a test contact
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"name":{"first":"Test","last":"User"},"email":"test@example.com"}'
```

### Database Inspection
```bash
# Open SQLite database
sqlite3 contacts.db

# View table structure
.schema contacts

# Query contacts
SELECT * FROM contacts LIMIT 5;
```

## 🤝 Integration with Frontend

This backend is designed to work seamlessly with the Angular frontend:
- **Consistent JSON Structure**: Matches frontend Contact model
- **Error Handling**: Provides meaningful HTTP status codes
- **Offline Support**: RESTful design supports frontend caching strategies
- **Real-time Data**: Fresh data on each request supports live updates
