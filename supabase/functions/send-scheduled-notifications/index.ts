import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const bibleVerses = [
  { verse: "For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.", reference: "Jeremiah 29:11" },
  { verse: "Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.", reference: "Proverbs 3:5-6" },
  { verse: "I can do all this through him who gives me strength.", reference: "Philippians 4:13" },
  { verse: "Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.", reference: "Joshua 1:9" },
  { verse: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", reference: "John 3:16" },
  { verse: "The LORD is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.", reference: "Psalm 23:1-3" },
  { verse: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", reference: "Romans 8:28" },
  { verse: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", reference: "Philippians 4:6" },
  { verse: "The LORD is close to the brokenhearted and saves those who are crushed in spirit.", reference: "Psalm 34:18" },
  { verse: "But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.", reference: "Isaiah 40:31" },
  { verse: "Commit to the LORD whatever you do, and he will establish your plans.", reference: "Proverbs 16:3" },
  { verse: "The Lord is not slow in keeping his promise, as some understand slowness. Instead he is patient with you, not wanting anyone to perish, but everyone to come to repentance.", reference: "2 Peter 3:9" },
  { verse: "But seek first his kingdom and his righteousness, and all these things will be given to you as well.", reference: "Matthew 6:33" },
  { verse: "Therefore I tell you, whatever you ask for in prayer, believe that you have received it, and it will be yours.", reference: "Mark 11:24" },
  { verse: "For nothing will be impossible with God.", reference: "Luke 1:37" },
  { verse: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7" },
  { verse: "If God is for us, who can be against us?", reference: "Romans 8:31" },
  { verse: "The Lord is my light and my salvation, whom shall I fear? The Lord is the stronghold of my life, of whom shall I be afraid?", reference: "Psalm 27:1" },
  { verse: "Wait for the LORD; be strong and take heart and wait for the LORD.", reference: "Psalm 27:14" },
  { verse: "He has shown you, O mortal, what is good. And what does the LORD require of you? To act justly and to love mercy and to walk humbly with your God.", reference: "Micah 6:8" },
];

function getDailyVerse(): { verse: string; reference: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return bibleVerses[dayOfYear % bibleVerses.length];
}

function base64url(input: string | ArrayBuffer): string {
  let bytes: Uint8Array;
  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = new Uint8Array(input);
  }
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPrivateKey(pemKey: string): Promise<CryptoKey> {
  const pemContents = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKey = await importPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );
  const jwt = `${unsignedToken}.${base64url(signature)}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    throw new Error(`Failed to get access token: ${errText}`);
  }

  const tokenData = await tokenResp.json();
  return tokenData.access_token;
}

async function sendFcmToToken(accessToken: string, projectId: string, token: string, title: string, body: string, url: string): Promise<{ ok: boolean; stale: boolean }> {
  const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const message = {
    message: {
      token,
      notification: { title, body },
      data: { title, body, click_action: url },
      webpush: {
        fcmOptions: { link: url },
        notification: { icon: "/logo.png", badge: "/logo.png" },
      },
    },
  };

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (resp.ok) return { ok: true, stale: false };

  const errText = await resp.text();
  const stale = errText.includes("UNREGISTERED") || errText.includes("invalid-registration");
  console.error(`FCM failed for token ...${token.slice(-8)}: ${errText}`);
  return { ok: false, stale };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");

    if (!serviceAccountJson || !projectId) {
      return new Response(JSON.stringify({ error: "Firebase credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "daily_verse";
    // Custom label for the notification title (e.g. "Morning Verse", "Noon Verse")
    const label = url.searchParams.get("label") || "";

    let title = "";
    let body = "";
    let clickUrl = "/";

    if (type === "daily_verse") {
      const dv = getDailyVerse();
      title = label ? `ABC | ${label}` : "ABC Daily Verse";
      body = `"${dv.verse}" — ${dv.reference} (NIV)`;
      clickUrl = "/";
    } else if (type === "notice") {
      title = "New Notice Posted";
      body = "A new notice has been posted. Tap to read.";
      clickUrl = "/notices";
    } else if (type === "blog") {
      title = "New Blog Post";
      body = "A new article has been published. Tap to read.";
      clickUrl = "/blog";
    } else {
      title = "Aizawl Bible College";
      body = "You have a new notification.";
      clickUrl = "/";
    }

    // Fetch subscriptions ordered by newest first (per user we use newest token only)
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("fcm_token, user_id, created_at")
      .order("created_at", { ascending: false });

    if (subError) {
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No push subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate: one token per user (the most recently registered one)
    const seenUsers = new Set<string>();
    const uniqueSubscriptions: { fcm_token: string; user_id: string }[] = [];
    for (const sub of subscriptions) {
      if (!seenUsers.has(sub.user_id)) {
        seenUsers.add(sub.user_id);
        uniqueSubscriptions.push(sub);
      }
    }

    const accessToken = await getAccessToken(serviceAccountJson);

    let successCount = 0;
    const staleTokens: string[] = [];

    for (const sub of uniqueSubscriptions) {
      const result = await sendFcmToToken(accessToken, projectId, sub.fcm_token, title, body, clickUrl);
      if (result.ok) {
        successCount++;
      } else if (result.stale) {
        staleTokens.push(sub.fcm_token);
      }
    }

    // Clean up stale tokens
    if (staleTokens.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("fcm_token", staleTokens);
    }

    // Insert ONE notification record per user
    const userIds = uniqueSubscriptions.map((s) => s.user_id);
    if (userIds.length > 0) {
      const notifRows = userIds.map((uid) => ({
        user_id: uid,
        title,
        message: body,
        type,
        is_read: false,
      }));
      await supabase.from("notifications").insert(notifRows);
    }

    return new Response(JSON.stringify({
      sent: successCount,
      failed: uniqueSubscriptions.length - successCount,
      stale_removed: staleTokens.length,
      type,
      label,
      total_users: uniqueSubscriptions.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Scheduled notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
