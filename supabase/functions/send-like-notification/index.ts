import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { liked_user_id, liker_id } = await req.json();

    if (!liked_user_id || !liker_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get liked user's email
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(liked_user_id);
    if (authError || !authUser?.user?.email) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = authUser.user.email;
    const likedUsername = likedProfile?.username || "there";

    // Get liker's profile
    const { data: likedProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", liked_user_id)
      .single();

    const likerUsername = likerProfile?.username || "Someone";
    const likerAvatarUrl = likerProfile?.avatar_url || null;
    const likerProfileUrl = `https://flip-fm.com/u/${likerUsername}`;
    const myProfileUrl = `https://flip-fm.com/u/${likedUsername}`;

    const avatarHtml = likerAvatarUrl
      ? `<img src="${likerAvatarUrl}" width="72" height="72" style="border-radius:50%;object-fit:cover;display:block;margin:0 auto;border:2px solid rgba(255,255,255,0.1);" />`
      : `<div style="width:72px;height:72px;border-radius:50%;background:#1a1a1a;border:2px solid rgba(255,255,255,0.1);margin:0 auto;line-height:72px;font-size:28px;font-weight:900;color:#ffffff;text-transform:uppercase;text-align:center;">${likerUsername[0]}</div>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Flip-FM <noreply@flip-fm.com>",
        to: email,
        subject: `@${likerUsername} liked your crate`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin:0;padding:0;background:#0a0a0a;font-family:Helvetica,Arial,sans-serif;color:#ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;">

                    <!-- Top border -->
                    <tr>
                      <td style="background:#ffffff;height:3px;border-radius:3px 3px 0 0;"></td>
                    </tr>

                    <!-- Main card -->
                    <tr>
                      <td style="background:#111111;border:1px solid rgba(255,255,255,0.08);border-top:none;border-radius:0 0 16px 16px;padding:44px 36px;">

                        <!-- Logo -->
                        <p style="margin:0 0 36px;font-size:20px;font-weight:900;font-style:italic;letter-spacing:-1px;text-transform:uppercase;color:#ffffff;">
                          FLIP-FM
                        </p>

                        <!-- Red heart -->
                        <div style="text-align:center;margin-bottom:28px;">
                          <span style="font-size:40px;line-height:1;">❤️</span>
                        </div>

                        <!-- Liker avatar -->
                        <div style="text-align:center;margin-bottom:16px;">
                          ${avatarHtml}
                        </div>

                        <!-- Liker username -->
                        <p style="margin:0 0 6px;font-size:22px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:-1px;color:#ffffff;">
                          @${likerUsername}
                        </p>
                        <p style="margin:0 0 28px;font-size:11px;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:3px;color:#555555;">
                          liked your crate
                        </p>

                        <!-- Divider -->
                        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 28px;" />

                        <!-- Message -->
                        <p style="margin:0 0 36px;font-size:14px;color:#888888;text-align:center;line-height:1.7;">
                          Hey @${likedUsername} — someone just appreciated your taste in music.<br/>
                          Check out their crate or head back to yours.
                        </p>

                        <!-- Two CTA buttons -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
                          <tr>
                            <td style="padding-right:6px;">
                              <a href="${likerProfileUrl}"
                                style="display:block;background:#ffffff;color:#000000;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-decoration:none;padding:14px 16px;border-radius:100px;text-align:center;">
                                @${likerUsername}'s Crate →
                              </a>
                            </td>
                            <td style="padding-left:6px;">
                              <a href="${myProfileUrl}"
                                style="display:block;background:transparent;border:1px solid rgba(255,255,255,0.2);color:#ffffff;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-decoration:none;padding:14px 16px;border-radius:100px;text-align:center;">
                                My Crate
                              </a>
                            </td>
                          </tr>
                        </table>

                        <!-- Divider -->
                        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:0 0 20px;" />

                        <!-- Footer -->
                        <p style="margin:0;font-size:10px;color:#333333;text-align:center;line-height:1.8;">
                          You're receiving this because you have an account on Flip-FM.<br/>
                          <a href="https://flip-fm.com/privacy" style="color:#444444;text-decoration:underline;">Privacy Policy</a>
                          &nbsp;·&nbsp;
                          <a href="https://flip-fm.com/terms" style="color:#444444;text-decoration:underline;">Terms of Service</a>
                        </p>

                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      return new Response(JSON.stringify({ error: "Email failed", detail: err }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});