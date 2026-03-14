import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_COOLDOWN_HOURS = 24;

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

    // Check cooldown
    const { data: likedProfile } = await supabase
      .from("profiles")
      .select("username, last_like_email_sent_at")
      .eq("id", liked_user_id)
      .single();

    if (likedProfile?.last_like_email_sent_at) {
      const lastSent = new Date(likedProfile.last_like_email_sent_at);
      const hoursSince = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
      if (hoursSince < EMAIL_COOLDOWN_HOURS) {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: "cooldown" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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
    const { data: likerProfile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", liker_id)
      .single();

    const likerUsername = likerProfile?.username || "Someone";
    const likerAvatarUrl = likerProfile?.avatar_url || null;
    const likerProfileUrl = `https://flip-fm.com/u/${likerUsername}`;
    const myProfileUrl = `https://flip-fm.com/u/${likedUsername}`;

    const avatarHtml = likerAvatarUrl
      ? `<img src="${likerAvatarUrl}" width="80" height="80" style="border-radius:50%;object-fit:cover;display:block;margin:0 auto;" />`
      : `<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#ec4899);margin:0 auto;line-height:80px;font-size:32px;font-weight:900;color:#ffffff;text-transform:uppercase;text-align:center;">${likerUsername[0]}</div>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Flip-FM <noreply@flip-fm.com>",
        to: email,
        subject: `@${likerUsername} liked your crate 🎵`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin:0;padding:0;background:#000000;font-family:Helvetica,Arial,sans-serif;color:#ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
                    <tr>
                      <td style="background:linear-gradient(90deg,#6366f1,#ec4899);height:4px;border-radius:4px 4px 0 0;"></td>
                    </tr>
                    <tr>
                      <td style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.08);border-top:none;border-radius:0 0 24px 24px;padding:48px 40px;">
                        <p style="margin:0 0 40px;font-size:22px;font-weight:900;font-style:italic;letter-spacing:-1px;text-transform:uppercase;color:#ffffff;">FLIP-FM</p>
                        <div style="text-align:center;margin-bottom:20px;">
                          ${avatarHtml}
                        </div>
                        <p style="margin:0 0 4px;font-size:24px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:-1px;color:#ffffff;">@${likerUsername}</p>
                        <p style="margin:0 0 32px;font-size:12px;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:3px;color:#6b7280;">liked your crate ♥</p>
                        <p style="margin:0 0 40px;font-size:15px;color:#6b7280;text-align:center;line-height:1.7;">
                          Hey @${likedUsername}, someone just appreciated your taste in music.<br/>
                          Check out their crate or see who else has liked yours.
                        </p>
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;">
                          <tr>
                            <td style="padding-right:8px;">
                              <a href="${likerProfileUrl}" style="display:block;background:linear-gradient(90deg,#6366f1,#ec4899);color:#ffffff;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-decoration:none;padding:14px 20px;border-radius:100px;text-align:center;">
                                View @${likerUsername}'s Crate →
                              </a>
                            </td>
                            <td style="padding-left:8px;">
                              <a href="${myProfileUrl}" style="display:block;background:transparent;border:1px solid rgba(255,255,255,0.15);color:#ffffff;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-decoration:none;padding:14px 20px;border-radius:100px;text-align:center;">
                                My Crate
                              </a>
                            </td>
                          </tr>
                        </table>
                        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:0 0 24px;" />
                        <p style="margin:0;font-size:11px;color:#374151;text-align:center;line-height:1.7;">
                          You're receiving this because you have an account on Flip-FM.<br/>
                          <a href="https://flip-fm.com/privacy" style="color:#4b5563;text-decoration:underline;">Privacy Policy</a>
                          &nbsp;·&nbsp;
                          <a href="https://flip-fm.com/terms" style="color:#4b5563;text-decoration:underline;">Terms of Service</a>
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

    await supabase
      .from("profiles")
      .update({ last_like_email_sent_at: new Date().toISOString() })
      .eq("id", liked_user_id);

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