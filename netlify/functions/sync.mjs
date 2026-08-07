const MAX_BODY_BYTES = 64 * 1024;

export default async request => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST' } });
  }

  const targetUrl = Netlify.env.get('FLOWPT_SYNC_URL');
  const apiToken = Netlify.env.get('FLOWPT_API_TOKEN');
  if (!targetUrl || !apiToken) {
    return Response.json({ error: 'sync_not_configured' }, { status: 503 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: 'payload_too_large' }, { status: 413 });
  }

  let record;
  try {
    record = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!record || typeof record !== 'object' || typeof record.uuid !== 'string' || !record.uuid || typeof record.scene !== 'string' || !record.scene || typeof record.shot !== 'string' || !record.shot || !Array.isArray(record.cameras)) {
    return Response.json({ error: 'invalid_record' }, { status: 400 });
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
        'Idempotency-Key': record.uuid
      },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(15_000)
    });

    if (!upstream.ok) {
      console.error('FlowPT sync failed:', upstream.status);
      return Response.json({ error: 'upstream_sync_failed' }, { status: 502 });
    }
    return Response.json({ ok: true, uuid: record.uuid });
  } catch (error) {
    console.error('FlowPT sync request error:', error);
    return Response.json({ error: 'upstream_unreachable' }, { status: 502 });
  }
};
