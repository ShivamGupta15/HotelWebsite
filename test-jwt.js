const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

const token = jwt.sign(
  { id: 1, email: 'admin@test.com', role: 'admin' },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('Token:', token);

axios.delete('http://localhost:5001/api/admin/booking-logs', {
  headers: {
    Authorization: `Bearer ${token}`
  }
}).then(res => {
  console.log('Success:', res.data);
}).catch(err => {
  console.error('Error:', err.response ? err.response.data : err.message);
});
