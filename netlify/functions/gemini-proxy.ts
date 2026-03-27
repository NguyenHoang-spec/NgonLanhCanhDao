
// @ts-nocheck
import type { Config, Context } from "@netlify/edge-functions";

/**
 * Netlify Edge Function acting as a Proxy for Google Gemini API.
 * This hides the real API Key and handles CORS for the frontend.
 */
export default async (request: Request, context: Context) => {
  // 1. Handle CORS Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-goog-api-key",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace("/.netlify/functions/gemini-proxy", "");
    
    // Construct the real Gemini API URL
    const targetUrl = new URL(`https://generativelanguage.googleapis.com${path}${url.search}`);

    // 2. Security: Check for Proxy Password (Optional but recommended)
    const proxyPassword = Netlify.env.get("MY_PROXY_PASSWORD");
    if (proxyPassword) {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || authHeader !== `Bearer ${proxyPassword}`) {
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid Proxy Key" }), {
          status: 401,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    // 3. Get the REAL API KEY from Environment Variables
    const realApiKey = Netlify.env.get("REAL_GEMINI_API_KEY") || Netlify.env.get("GEMINI_API_KEY");
    if (!realApiKey) {
      return new Response(JSON.stringify({ error: "Server Configuration Error: Missing API Key" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 4. Prepare Headers for Google
    const headers = new Headers(request.headers);
    headers.set("x-goog-api-key", realApiKey);
    headers.delete("Authorization"); // Don't leak proxy password to Google
    headers.delete("host");

    // 5. Forward the request
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.body,
      // @ts-ignore: duplex is needed for streaming bodies in some environments
      duplex: "half",
    });

    // 6. Return the response with CORS headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
};

export const config: Config = {
  path: "/api/gemini/*",
};
