// Verifica la contraseña de administrador. La contraseña real vive en la variable
// de entorno ADMIN_PASSWORD (Netlify > Site settings > Environment variables),
// nunca en el código, para que no quede expuesta en el sitio publicado.
export default async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== 'POST') {
    return new Response('Método no permitido', { status: 405, headers: cors });
  }

  const { password } = await req.json().catch(() => ({}));
  const real = process.env.ADMIN_PASSWORD || '';
  const ok = real.length > 0 && password === real;

  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 401,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
};

export const config = { path: '/api/login' };
