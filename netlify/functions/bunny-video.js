const crypto = require('crypto');

const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const BUNNY_TOKEN_AUTH_KEY = process.env.BUNNY_TOKEN_AUTH_KEY;
const BUNNY_API_BASE = 'https://video.bunnycdn.com/library';

const headers = {
  'Content-Type': 'application/json',
  'AccessKey': BUNNY_API_KEY,
};

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL
  || 'https://nhnpqsbmpypdxdvdqlfq.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY
  // public anon key, already shipped in the web bundle; fallback so auth checks never 401 on a missing env var
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5obnBxc2JtcHlwZHhkdmRxbGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NDgzMDgsImV4cCI6MjA4NzEyNDMwOH0.zjEVz-5vQy6kVJfPB81xu5VxxSWnykk5BhX2CkbfY1U';

// Web app plus the Capacitor WebViews (iOS capacitor://localhost, Android https://localhost).
const ALLOWED_ORIGINS = [
  'https://medulochub.netlify.app',
  'capacitor://localhost',
  'ionic://localhost',
  'https://localhost',
  'http://localhost',
];
const NATIVE_ORIGINS = ['capacitor://localhost', 'ionic://localhost', 'https://localhost', 'http://localhost'];
const isLocalDev = (origin) => /^http:\/\/localhost:\d+$/.test(origin);

// Store builds up to 1.0.6 call this function without a token. Until those are
// gone, a native-app origin may still call without one. Set BUNNY_REQUIRE_AUTH=true
// in Netlify once 1.0.7 is the only build in use.
const REQUIRE_AUTH = process.env.BUNNY_REQUIRE_AUTH === 'true';

const ADMIN_ACTIONS = new Set(['create', 'delete']);

function corsFor(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) || isLocalDev(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Vary': 'Origin',
  };
}

// Returns { id, isAdmin } for a valid Supabase session token, else null.
async function getCaller(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return null;
  const user = await userRes.json();
  if (!user?.id) return null;

  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(user.id)}&select=is_admin,is_owner`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } }
  );
  const rows = profileRes.ok ? await profileRes.json() : [];
  const profile = rows[0] || {};
  return { id: user.id, isAdmin: profile.is_admin === true || profile.is_owner === true };
}

let corsHeaders = corsFor('');

exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  corsHeaders = corsFor(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const action = event.queryStringParameters?.action;

  try {
    const hasToken = /^Bearer\s+\S+/i.test(event.headers?.authorization || event.headers?.Authorization || '');
    const legacyNative = !REQUIRE_AUTH && !hasToken && NATIVE_ORIGINS.includes(origin);

    if (legacyNative) {
      console.warn(`bunny-video: legacy no-token call from ${origin}, action=${action}`);
    } else {
      const caller = await getCaller(event);
      if (!caller) return respond(401, { error: 'Unauthorized' });
      if (ADMIN_ACTIONS.has(action) && !caller.isAdmin) return respond(403, { error: 'Forbidden' });
    }

    switch (action) {
      case 'create':
        return await createVideo(event);
      case 'status':
        return await getVideoStatus(event);
      case 'delete':
        return await deleteVideo(event);
      case 'embed-token':
        return await getEmbedToken(event);
      default:
        return respond(400, { error: 'Invalid action. Use: create, status, delete, embed-token' });
    }
  } catch (err) {
    console.error('Bunny video error:', err);
    return respond(500, { error: 'Internal server error' });
  }
};

async function createVideo(event) {
  const body = JSON.parse(event.body || '{}');
  const title = body.title || 'Untitled Video';

  // Create a video object in Bunny library
  const res = await fetch(`${BUNNY_API_BASE}/${BUNNY_LIBRARY_ID}/videos`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Bunny create error:', errorText);
    return respond(res.status, { error: 'Failed to create video in Bunny' });
  }

  const video = await res.json();

  // Generate TUS auth signature for direct upload
  const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  const signatureString = `${BUNNY_LIBRARY_ID}${BUNNY_API_KEY}${expirationTime}${video.guid}`;
  const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

  return respond(200, {
    videoId: video.guid,
    libraryId: BUNNY_LIBRARY_ID,
    tusConfig: {
      uploadUrl: `https://video.bunnycdn.com/tusupload`,
      expirationTime,
      signature,
      videoId: video.guid,
      libraryId: BUNNY_LIBRARY_ID,
    },
  });
}

async function getVideoStatus(event) {
  const videoId = event.queryStringParameters?.videoId;
  if (!videoId) {
    return respond(400, { error: 'videoId is required' });
  }

  const res = await fetch(`${BUNNY_API_BASE}/${BUNNY_LIBRARY_ID}/videos/${videoId}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    return respond(res.status, { error: 'Failed to get video status' });
  }

  const video = await res.json();

  // Bunny status codes: 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error
  let status = 'processing';
  if (video.status === 4) status = 'ready';
  else if (video.status === 5) status = 'error';
  else if (video.status >= 1 && video.status <= 3) status = 'processing';

  return respond(200, {
    videoId: video.guid,
    status,
    bunnyStatus: video.status,
    title: video.title,
    length: video.length,
    width: video.width,
    height: video.height,
  });
}

async function deleteVideo(event) {
  const videoId = event.queryStringParameters?.videoId;
  if (!videoId) {
    return respond(400, { error: 'videoId is required' });
  }

  const res = await fetch(`${BUNNY_API_BASE}/${BUNNY_LIBRARY_ID}/videos/${videoId}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Bunny delete error:', errorText);
    return respond(res.status, { error: 'Failed to delete video' });
  }

  return respond(200, { success: true });
}

async function getEmbedToken(event) {
  const videoId = event.queryStringParameters?.videoId;
  if (!videoId) {
    return respond(400, { error: 'videoId is required' });
  }

  // Generate a signed token for the embed URL
  // Token expires in 1 hour
  const expiresTimestamp = Math.floor(Date.now() / 1000) + 3600;
  const tokenString = `${BUNNY_TOKEN_AUTH_KEY}${videoId}${expiresTimestamp}`;
  const token = crypto.createHash('sha256').update(tokenString).digest('hex');

  const embedUrl = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}?token=${token}&expires=${expiresTimestamp}`;

  return respond(200, { embedUrl });
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
