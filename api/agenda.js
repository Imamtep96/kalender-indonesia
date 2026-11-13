import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Header CORS agar aman diakses dari berbagai perangkat
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-access-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validasi Access Key di sisi server
  const accessKey = req.headers['x-access-key'];
  if (accessKey !== 'Imamtp26') {
    return res.status(401).json({ error: 'Access Key tidak valid!' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // AMBIL DATA DARI NEON
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT data FROM user_agendas WHERE access_key = ${accessKey}
      `;
      const agendas = rows.length > 0 ? rows[0].data : {};
      return res.status(200).json({ agendas });
    }

    // SIMPAN / UPDATE DATA KE NEON
    if (req.method === 'POST') {
      const { agendas } = req.body;
      if (!agendas || typeof agendas !== 'object') {
        return res.status(400).json({ error: 'Format data tidak valid' });
      }

      await sql`
        INSERT INTO user_agendas (access_key, data, updated_at)
        VALUES (${accessKey}, ${JSON.stringify(agendas)}::jsonb, NOW())
        ON CONFLICT (access_key)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method tidak diizinkan' });
  } catch (error) {
    console.error('Database Error:', error);
    return res.status(500).json({ error: 'Gagal terhubung ke database Neon' });
  }
}
