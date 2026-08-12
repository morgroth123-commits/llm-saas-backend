const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable compression (gzip/br when supported)
app.use(compression());

// Serve static assets with long cache lifetime and fingerprinting assumed
app.use('/static', express.static(path.join(__dirname, 'public'), { maxAge: '30d' }));

// Example dynamic route with cache-control for short-lived responses
app.get('/api/hello', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ message: 'Hello, world!' });
});

app.get('/', (req, res) => {
  res.send('<html><head></head><body><h1>Compression sample</h1><img src="/static/sample.txt"/></body></html>');
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
