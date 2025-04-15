import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './_utils/db';

interface PopulationDataPoint {
  year: number;
  population: number;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Set CORS headers (same as settlements.ts)
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

  const yearQuery = request.query.year;

  if (typeof yearQuery !== 'string' || yearQuery === '') {
    return response.status(400).json({ error: 'Missing required query parameter: year' });
  }

  const targetYear = parseInt(yearQuery, 10);

  if (isNaN(targetYear)) {
    return response.status(400).json({ error: 'Invalid year parameter: Must be an integer.' });
  }

  try {
    const pool = getDbPool();
    const query = `
      (SELECT year::int, population::bigint FROM global_population
       WHERE year <= $1 ORDER BY year DESC LIMIT 1)
      UNION
      (SELECT year::int, population::bigint FROM global_population
       WHERE year > $1 ORDER BY year ASC LIMIT 1)
      ORDER BY year
    `;

    const result = await pool.query<PopulationDataPoint>(query, [targetYear]);

    let calculatedPopulation = 0;

    if (result.rows.length === 0) {
      calculatedPopulation = 0; // No data points found
    } else if (result.rows.length === 1) {
      // Exact match or only one bounding point found
      calculatedPopulation = Number(result.rows[0].population);
    } else {
      // Two points found - interpolate
      const before = result.rows[0];
      const after = result.rows[1];

      // Ensure years are different to avoid division by zero
      if (after.year === before.year) {
         calculatedPopulation = Number(before.population); 
      } else {
        // Perform linear interpolation
        calculatedPopulation = Number(before.population) + 
          (targetYear - before.year) * 
          (Number(after.population) - Number(before.population)) / 
          (after.year - before.year);
      }
      calculatedPopulation = Math.round(calculatedPopulation);
    }

    response.status(200).json({ year: targetYear, population: calculatedPopulation });

  } catch (error: any) {
    console.error('Error in population endpoint:', error.stack);
    // Send a default value or error - adjust as needed
    response.status(500).json({ error: 'Internal server error', year: targetYear, population: 0 }); 
  }
} 