const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'contacts.db');
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name_first TEXT,
      name_last TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      cell TEXT,
      street_number INTEGER,
      street_name TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      postcode TEXT,
      picture_large TEXT,
      picture_medium TEXT,
      picture_thumbnail TEXT,
      dob_date TEXT,
      dob_age INTEGER,
      registered_date TEXT,
      registered_age INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Helper function to transform contact data
function transformContactFromDB(row) {
  return {
    id: row.id,
    name: {
      first: row.name_first,
      last: row.name_last
    },
    email: row.email,
    phone: row.phone,
    cell: row.cell,
    location: {
      street: {
        number: row.street_number,
        name: row.street_name
      },
      city: row.city,
      state: row.state,
      country: row.country,
      postcode: row.postcode
    },
    picture: {
      large: row.picture_large,
      medium: row.picture_medium,
      thumbnail: row.picture_thumbnail
    },
    dob: {
      date: row.dob_date,
      age: row.dob_age
    },
    registered: {
      date: row.registered_date,
      age: row.registered_age
    }
  };
}

function transformContactForDB(contact) {
  return {
    id: contact.id || uuidv4(),
    name_first: contact.name?.first || '',
    name_last: contact.name?.last || '',
    email: contact.email,
    phone: contact.phone,
    cell: contact.cell,
    street_number: contact.location?.street?.number || 0,
    street_name: contact.location?.street?.name || '',
    city: contact.location?.city || '',
    state: contact.location?.state || '',
    country: contact.location?.country || '',
    postcode: contact.location?.postcode || '',
    picture_large: contact.picture?.large || '',
    picture_medium: contact.picture?.medium || '',
    picture_thumbnail: contact.picture?.thumbnail || '',
    dob_date: contact.dob?.date || '',
    dob_age: contact.dob?.age || 0,
    registered_date: contact.registered?.date || new Date().toISOString(),
    registered_age: contact.registered?.age || 0
  };
}

// Routes

// Get all contacts
app.get('/api/contacts', (req, res) => {
  const sql = 'SELECT * FROM contacts ORDER BY name_last, name_first';
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const contacts = rows.map(transformContactFromDB);
    res.json({ contacts });
  });
});

// Get contact by ID
app.get('/api/contacts/:id', (req, res) => {
  const sql = 'SELECT * FROM contacts WHERE id = ?';
  
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!row) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    
    res.json({ contact: transformContactFromDB(row) });
  });
});

// Create new contact
app.post('/api/contacts', (req, res) => {
  const contactData = transformContactForDB(req.body);
  
  const sql = `
    INSERT INTO contacts (
      id, name_first, name_last, email, phone, cell,
      street_number, street_name, city, state, country, postcode,
      picture_large, picture_medium, picture_thumbnail,
      dob_date, dob_age, registered_date, registered_age
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    contactData.id, contactData.name_first, contactData.name_last,
    contactData.email, contactData.phone, contactData.cell, contactData.street_number,
    contactData.street_name, contactData.city, contactData.state, contactData.country,
    contactData.postcode, contactData.picture_large, contactData.picture_medium,
    contactData.picture_thumbnail, contactData.dob_date, contactData.dob_age,
    contactData.registered_date, contactData.registered_age
  ];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.status(201).json({ 
      contact: { ...req.body, id: contactData.id },
      message: 'Contact created successfully'
    });
  });
});

// Update contact
app.put('/api/contacts/:id', (req, res) => {
  const contactData = transformContactForDB({ ...req.body, id: req.params.id });
  
  const sql = `
    UPDATE contacts SET 
      name_first = ?, name_last = ?, email = ?, phone = ?, cell = ?,
      street_number = ?, street_name = ?, city = ?, state = ?, country = ?, postcode = ?,
      picture_large = ?, picture_medium = ?, picture_thumbnail = ?,
      dob_date = ?, dob_age = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  const params = [
    contactData.name_first, contactData.name_last,
    contactData.email, contactData.phone, contactData.cell, contactData.street_number,
    contactData.street_name, contactData.city, contactData.state, contactData.country,
    contactData.postcode, contactData.picture_large, contactData.picture_medium,
    contactData.picture_thumbnail, contactData.dob_date, contactData.dob_age,
    req.params.id
  ];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    
    res.json({ 
      contact: { ...req.body, id: req.params.id },
      message: 'Contact updated successfully'
    });
  });
});

// Delete contact
app.delete('/api/contacts/:id', (req, res) => {
  const sql = 'DELETE FROM contacts WHERE id = ?';
  
  db.run(sql, [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    
    res.json({ message: 'Contact deleted successfully' });
  });
});

// Add random contacts from randomuser.me
app.post('/api/contacts/random', async (req, res) => {
  try {
    const count = req.body.count || 10;
    const response = await axios.get(`https://randomuser.me/api/?results=${count}`);
    const users = response.data.results;
    
    const insertedContacts = [];
    
    for (const user of users) {
      const contactData = transformContactForDB({
        ...user,
        id: uuidv4()
      });
      
      const sql = `
        INSERT INTO contacts (
          id, name_first, name_last, email, phone, cell,
          street_number, street_name, city, state, country, postcode,
          picture_large, picture_medium, picture_thumbnail,
          dob_date, dob_age, registered_date, registered_age
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        contactData.id, contactData.name_first, contactData.name_last,
        contactData.email, contactData.phone, contactData.cell, contactData.street_number,
        contactData.street_name, contactData.city, contactData.state, contactData.country,
        contactData.postcode, contactData.picture_large, contactData.picture_medium,
        contactData.picture_thumbnail, contactData.dob_date, contactData.dob_age,
        contactData.registered_date, contactData.registered_age
      ];
      
      await new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) {
            console.error('Error inserting contact:', err.message);
            reject(err);
          } else {
            insertedContacts.push(transformContactFromDB({
              ...contactData,
              ...user
            }));
            resolve();
          }
        });
      });
    }
    
    res.status(201).json({
      message: `${insertedContacts.length} random contacts added successfully`,
      contacts: insertedContacts
    });
    
  } catch (error) {
    console.error('Error fetching random users:', error.message);
    res.status(500).json({ error: 'Failed to fetch random users' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Contact Management API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
