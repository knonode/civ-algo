import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './_utils/db';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Set CORS headers
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*'); // Or restrict to your frontend domain
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  // Handle OPTIONS request (preflight)
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  if (request.method !== 'GET') {
    response.setHeader('Allow', ['GET']);
    return response.status(405).end(`Method ${request.method} Not Allowed`);
  }

  const maxYearQuery = request.query.max_year;

  if (typeof maxYearQuery !== 'string' || maxYearQuery === '') {
    return response.status(400).json({ error: 'Missing required query parameter: max_year' });
  }

  const maxYear = parseInt(maxYearQuery, 10);

  if (isNaN(maxYear)) {
    return response.status(400).json({ error: 'Invalid max_year parameter: Must be an integer.' });
  }

  try {
    const pool = getDbPool();
    const queryText = `
      SELECT id, location, type_site, latitude, longitude, established_year, picture, culture, unesco_whs, type_icon, continent, region, country, hist_period
      FROM settlements
      WHERE established_year <= $1
      ORDER BY established_year ASC;
    `;
    const result = await pool.query(queryText, [maxYear]);

    response.status(200).json(result.rows);

  } catch (error: any) {
    console.error('Error executing settlements query:', error.stack);
    response.status(500).json({ error: 'Internal server error' });
  }
} 