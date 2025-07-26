/*
 * Entry point for the LithoCoreX prototype server.
 *
 * This Express application serves two purposes:
 *  - It delivers the static front‑end located in the `public` directory.
 *  - It acts as a thin proxy between the front‑end and the Mindat API.  The
 *    Mindat API requires authentication via a token; exposing requests
 *    directly from the browser would leak the API key.  By sending
 *    requests through this server, the key stays on the server side.
 *
 * The server exposes two API endpoints:
 *
 *   GET /api/searchMineral?query=<string>
 *     Performs a search for geomaterials (minerals) whose names or
 *     properties match the query string.  Returns a list of basic
 *     information about matching minerals (id, name, formula, colour
 *     attributes etc.).
 *
 *   GET /api/localities?mineralId=<id>
 *     Fetches locality (find‑spot) information for a given mineral
 *     identifier.  The returned data includes geographic coordinates,
 *     status (official/official/potential), descriptive information and
 *     a recommended Google Maps route link for navigation.
 *
 * If the Mindat API specification evolves, these endpoints can be
 * updated accordingly without changing the front‑end code.
 */

const express = require('express');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.  The `.env` file should
// contain a line like:
//   MINDAT_API_KEY=your_secret_key
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the `public` directory.  This includes
// index.html, styles and client‑side scripts.
app.use(express.static(path.join(__dirname, 'public')));

// Helper to build headers for Mindat API requests.
function authHeaders() {
  const apiKey = process.env.MINDAT_API_KEY;
  if (!apiKey) {
    throw new Error('MINDAT_API_KEY is not defined. Please set it in .env');
  }
  return {
    Authorization: `Token ${apiKey}`
  };
}

// Search minerals by keyword.  This uses the Mindat geomaterials
// search endpoint.  See the OpenMindat documentation for more
// details.  If the API changes, adjust the URL and parameters here.
app.get('/api/searchMineral', async (req, res) => {
  const query = req.query.query;
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }
  try {
    const response = await axios.get('https://api.mindat.org/v1/geomaterials/', {
      headers: authHeaders(),
      params: {
        q: query,
        page_size: 20
      }
    });
    // Map the results to a simplified structure.  We return only
    // properties needed by the client; unneeded fields are removed.
    const minerals = (response.data?.results || []).map((item) => ({
      id: item.id,
      name: item.name,
      formula: item.ima_formula || item.formula || null,
      colour: item.colour || item.color || null,
      description: item.description || null
    }));
    res.json({ minerals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch minerals from Mindat' });
  }
});

// Retrieve localities for a specific mineral ID.  This uses the
// Mindat localities endpoint.  Only the first page of results is
// returned for brevity.  Pagination can be added later.
app.get('/api/localities', async (req, res) => {
  const mineralId = req.query.mineralId;
  if (!mineralId) {
    return res.status(400).json({ error: 'Missing mineralId parameter' });
  }
  try {
    const response = await axios.get('https://api.mindat.org/v1/localities/', {
      headers: authHeaders(),
      params: {
        geomaterial_id: mineralId,
        page_size: 200
      }
    });
    const localities = (response.data?.results || []).map((loc) => ({
      id: loc.id,
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      status: loc.status || null,
      description: loc.description || null,
      country: loc.country || null,
      // Create a route link that opens Google Maps for driving directions.
      routeLink: loc.latitude && loc.longitude
        ? `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`
        : null
    }));
    res.json({ localities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch localities from Mindat' });
  }
});

// Fallback to index.html for any unmatched route.  This supports
// client‑side routing if needed in future.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});