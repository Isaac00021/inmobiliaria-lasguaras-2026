import { getStore } from '@netlify/blobs';

// Revisa que quien escribe (crear/borrar) mande la contraseña correcta de administrador.
// La contraseña real se configura como variable de entorno ADMIN_PASSWORD en Netlify,
// nunca queda escrita en este archivo.
function isAdmin(req) {
  const sent = req.headers.get('x-admin-password') || '';
  const real = process.env.ADMIN_PASSWORD || '';
  return real.length > 0 && sent === real;
}

export default async (req) => {
  const store = getStore('properties');
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  // Cualquier visitante puede LEER la lista de propiedades (sitio público)
  if (req.method === 'GET') {
    const { blobs } = await store.list();
    const properties = await Promise.all(
      blobs.map((b) => store.get(b.key, { type: 'json' }))
    );
    properties.sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0));
    return new Response(JSON.stringify(properties.filter(Boolean)), {
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  // Crear una propiedad nueva: solo el administrador
  if (req.method === 'POST') {
    if (!isAdmin(req)) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    const body = await req.json();
    const id =
      (globalThis.crypto && globalThis.crypto.randomUUID)
        ? globalThis.crypto.randomUUID()
        : 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2);

    const property = {
      id,
      title: String(body.title || '').slice(0, 120),
      description: String(body.description || '').slice(0, 1000),
      price: Number(body.price) || 0,
      type: ['casa', 'terreno', 'apartamento'].includes(body.type) ? body.type : 'casa',
      operation: body.operation === 'renta' ? 'renta' : 'venta',
      location: String(body.location || '').slice(0, 120),
      beds: Number(body.beds) || 0,
      baths: Number(body.baths) || 0,
      area: String(body.area || '').slice(0, 40),
      photos: Array.isArray(body.photos) ? body.photos.slice(0, 6) : [],
      createdAt: Date.now(),
    };

    await store.setJSON(id, property);
    return new Response(JSON.stringify(property), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  // Borrar una propiedad: solo el administrador
  if (req.method === 'DELETE') {
    if (!isAdmin(req)) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    const id = new URL(req.url).searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'Falta el id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    await store.delete(id);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  return new Response('Método no permitido', { status: 405, headers: cors });
};

export const config = { path: '/api/properties' };
