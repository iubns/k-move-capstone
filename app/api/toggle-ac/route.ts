// Simple proxy route to toggle the air conditioner by forwarding a POST to the device endpoint.
// This avoids CORS issues when called from the browser and centralizes error handling.
export async function POST(req: Request) {
  try {
    const res = await fetch('http://home.iubns.net/', {
      method: 'POST',
      // No body forwarded by default; if the device needs a body, modify as needed.
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    let body: any;
    if (contentType.includes('application/json')) {
      try {
        body = await res.json();
      } catch (e) {
        body = await res.text();
      }
    } else {
      body = await res.text();
    }

    // Return structured info: whether fetch succeeded and the external response body under `data`.
    return new Response(JSON.stringify({ ok: true, status: res.status, data: body }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
