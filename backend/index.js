console.log('====== SERVER STARTING ======');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Import the Pool class from pg

const app = express();
const PORT = process.env.PORT || 3001; // Use environment variable or default to 3001

// --- Database Connection Setup ---
// IMPORTANT: Use environment variables for credentials in production!
// For now, using placeholders. Replace 'YOUR_PASSWORD_HERE' locally.
const pool = new Pool({
  user: 'USER', // Or your specific DB user
  host: 'localhost',
  database: 'civ_db', // Your database name
  password: 'PASSWORD', // REPLACE THIS LOCALLY
  port: 5432,
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
  } else {
    console.log('Connected to database at:', res.rows[0].now);
  }
});
// --- End Database Setup ---

// Middleware
app.use(cors()); // Enable CORS for requests from frontend (different port)
app.use(express.json()); // Parse JSON request bodies

// Basic Route
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

// Placeholder for future API routes
// app.use('/api', require('./routes/api')); // Example for organizing routes

// --- API Routes ---

// GET /api/settlements?max_year=<year>
app.get('/api/settlements', async (req, res) => {
  const maxYearQuery = req.query.max_year;

  // --- Basic Input Validation ---
  if (maxYearQuery === undefined || maxYearQuery === null || maxYearQuery === '') {
    return res.status(400).json({ error: 'Missing required query parameter: max_year' });
  }

  const maxYear = parseInt(maxYearQuery, 10);

  if (isNaN(maxYear)) {
    return res.status(400).json({ error: 'Invalid max_year parameter: Must be an integer.' });
  }
  // --- End Validation ---

  try {
    // Query the database
    const queryText = `
      SELECT id, location, type_site, latitude, longitude, established_year, picture, culture, unesco_whs, type_icon, continent, region, country, hist_period
      FROM settlements
      WHERE established_year <= $1
      ORDER BY established_year ASC;
    `;
    const result = await pool.query(queryText, [maxYear]);

    res.json(result.rows); // Send the locations back as JSON

  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/global-population?year=<year>
app.get('/api/global-population', async (req, res) => {
  try {
    const yearQuery = req.query.year;
    console.log(`Received request for year: ${yearQuery}`);
    
    const targetYear = parseInt(yearQuery, 10);
    
    // Get before and after data points
    const query = `
      (SELECT year, population FROM global_population 
       WHERE year <= $1 ORDER BY year DESC LIMIT 1)
      UNION
      (SELECT year, population FROM global_population 
       WHERE year > $1 ORDER BY year ASC LIMIT 1)
      ORDER BY year
    `;
    
    const result = await pool.query(query, [targetYear]);
    console.log('Query result:', result.rows);
    
    let population = 0;
    
    if (result.rows.length === 0) {
      // No data at all
      population = 0;
    } 
    else if (result.rows.length === 1) {
      // Only one point found
      population = parseInt(result.rows[0].population);
    }
    else {
      // Two points - interpolate
      const before = result.rows[0];
      const after = result.rows[1];
      
      population = parseInt(before.population) + 
        (targetYear - parseInt(before.year)) * 
        (parseInt(after.population) - parseInt(before.population)) / 
        (parseInt(after.year) - parseInt(before.year));
      
      population = Math.round(population);
    }
    
    console.log(`Calculated population for year ${targetYear}: ${population}`);
    res.json({ year: targetYear, population });
    
  } catch (err) {
    console.error('Error in population endpoint:', err);
    res.json({ year: parseInt(req.query.year, 10), population: 0 });
  }
});

// --- End API Routes ---

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
}); 