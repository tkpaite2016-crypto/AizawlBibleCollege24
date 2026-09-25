import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace("Bearer ", "");

    // Verify the caller's identity
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { "apikey": supabaseAnonKey, "Authorization": `Bearer ${token}` },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const caller = await userResponse.json();

    // Check caller role
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${caller.id}&select=role`,
      { headers: { "apikey": supabaseAnonKey, "Authorization": `Bearer ${token}` } },
    );

    const profiles = await profileResponse.json();
    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const callerRole = profiles[0].role;
    if (!["admin", "faculty", "finance"].includes(callerRole)) {
      return new Response(
        JSON.stringify({ error: "Only admin, faculty, or finance can create student accounts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { full_name, email, phone, student_year, course, ab_number } = body;

    if (!full_name || !email) {
      return new Response(
        JSON.stringify({ error: "Full name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate password: last 4 letters of username + last 4 digits of phone, all lowercase
    const username = email.split("@")[0] || "";
    const phoneDigits = (phone || "").replace(/\D/g, "");
    const usernamePart = username.slice(-4).toLowerCase();
    const phonePart = phoneDigits.slice(-4);
    const password = `${usernamePart}${phonePart}`;

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Generated password is too short. Student must have a username of at least 4 characters and a phone number with at least 4 digits." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create the auth user via admin API
    const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      }),
    });

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text();
      let errorMessage = "Failed to create user account";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.msg || errorJson.message || errorMessage;
      } catch {
        // keep default
      }
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const newUser = await createUserResponse.json();
    const newUserId = newUser.id;

    // The handle_new_user trigger creates a profile with role 'standard'.
    // Update it to 'student' with the extra fields.
    const updateProfileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${newUserId}`,
      {
        method: "PATCH",
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          role: "student",
          full_name,
          phone: phone || null,
          student_year: student_year || null,
          course: course || null,
          ab_number: ab_number || null,
        }),
      },
    );

    if (!updateProfileResponse.ok) {
      console.error("Failed to update profile to student role:", await updateProfileResponse.text());
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        password,
        email,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in create-student-auth function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
