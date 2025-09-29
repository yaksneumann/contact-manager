# Contact Management Backend

This is the backend API for the Contact Management application built with Node.js, Express, and SQLite.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

## API Endpoints

- `GET /api/contacts` - Get all contacts
- `GET /api/contacts/:id` - Get contact by ID
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `POST /api/contacts/random` - Add random contacts from randomuser.me
- `GET /api/health` - Health check

## Database

The application uses SQLite database stored in `contacts.db` file.

## CORS

CORS is enabled for all origins to support frontend development.
