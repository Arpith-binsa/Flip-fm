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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all unsent notifications
    const { data: notifications, error } = await supabase
      .from("like_notifications")
      .select(`
        id,
        liked_id,
        liker_id,
        profiles!like_notifications_liker_id_fkey(username, avatar_url)
      `)
      .eq("sent", false);

    if (error || !notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group notifications by recipient
    const grouped: Record<string, any[]> = {};
    for (const n of notifications) {
      if (!grouped[n.liked_id]) grouped[n.liked_id] = [];
      grouped[n.liked_id].push(n);
    }

    let emailsSent = 0;

    for (const [liked_id, likes] of Object.entries(grouped)) {
      // Get recipient email
      const { data: authUser } = await supabase.auth.admin.getUserById(liked_id);
      if (!authUser?.user?.email) continue;

      const email = authUser.user.email;

      // Get recipient profile
      const { data: likedProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", liked_id)
        .single();

      const likedUsername = likedProfile?.username || "there";
      const myProfileUrl = `https://flip-fm.com/u/${likedUsername}`;
      const likeCount = likes.length;

      let subject = "";
      let bodyHtml = "";

      if (likeCount === 1) {
        // Single like — show who liked
        const liker = likes[0].profiles;
        const likerUsername = liker?.username || "Someone";
        const likerAvatarUrl = liker?.avatar_url || null;
        const likerProfileUrl = `https://flip-fm.com/u/${likerUsername}`;

        const avatarHtml = likerAvatarUrl
          ? `<img src="${likerAvatarUrl}" width="72" height="72" style="border-radius:50%;object-fit:cover;display:block;margin:0 auto;border:2px solid rgba(255,255,255,0.1);" />`
          : `<div style="width:72px;height:72px;border-radius:50%;background:#1a1a1a;border:2px solid rgba(255,255,255,0.1);margin:0 auto;line-height:72px;font-size:28px;font-weight:900;color:#ffffff;text-transform:uppercase;text-align:center;">${likerUsername[0]}</div>`;

        subject = `@${likerUsername} liked your crate`;
        bodyHtml = `
          <div style="text-align:center;margin-bottom:28px;"><span style="font-size:40px;">❤️</span></div>
          <div style="text-align:center;margin-bottom:16px;">${avatarHtml}</div>
          <p style="margin:0 0 6px;font-size:22px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:-1px;color:#ffffff;">@${likerUsername}</p>
          <p style="margin:0 0 28px;font-size:11px;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:3px;color:#555555;">liked your crate</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 28px;" />
          <p style="margin:0 0 36px;font-size:14px;color:#888888;text-align:center;line-height:1.7;">
            Hey @${likedUsername} — someone just appreciated your taste in music.<br/>Check out their crate or head back to yours.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
            <tr>
              <td style="padding-right:6px;">
                <a href="${likerProfileUrl}" style="display:block;background:#ffffff;color:#000000;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-decoration:none;padding:14px 16px;border-radius:100px;text-align:center;">
                  @${likerUsername}'s Crate →
                </a>
              </td>
              <td style="padding-left:6px;">
                <a href="${myProfileUrl}" style="display:block;background:transparent;border:1px solid rgba(255,255,255,0.2);color:#ffffff;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-decoration:none;padding:14px 16px;border-radius:100px;text-align:center;">
                  My Crate
                </a>
              </td>
            </tr>
          </table>
        `;
      } else {
        // Multiple likes — digest
        subject = `You got ${likeCount} likes on Flip-FM today`;

        const likerRows = likes.map(n => {
          const liker = n.profiles;
          const likerUsername = liker?.username || "Someone";
          const likerAvatarUrl = liker?.avatar_url || null;
          const likerProfileUrl = `https://flip-fm.com/u/${likerUsername}`;
          const avatarImg = likerAvatarUrl
            ? `<img src="${likerAvatarUrl}" width="36" height="36" style="border-radius:50%;object-fit:cover;display:block;border:1px solid rgba(255,255,255,0.1);" />`
            : `<div style="width:36px;height:36px;border-radius:50%;background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);line-height:36px;font-size:14px;font-weight:900;color:#ffffff;text-transform:uppercase;text-align:center;">${likerUsername[0]}</div>`;

          return `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:12px;">${avatarImg}</td>
                    <td>
                      <a href="${likerProfileUrl}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;">@${likerUsername}</a>
                    </td>
                    <td style="text-align:right;padding-left:20px;">
                      <a href="${likerProfileUrl}" style="color:#888888;text-decoration:none;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">View Crate →</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;
        }).join("");

        bodyHtml = `
          <div style="text-align:center;margin-bottom:24px;"><span style="font-size:40px;">❤️</span></div>
          <p style="margin:0 0 6px;font-size:32px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:-1px;color:#ffffff;">${likeCount} Likes</p>
          <p style="margin:0 0 32px;font-size:11px;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:3px;color:#555555;">today on Flip-FM</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 24px;" />
          <p style="margin:0 0 20px;font-size:13px;color:#888888;line-height:1.6;">
            Hey @${likedUsername} — here's everyone who liked your crate today:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            ${likerRows}
          </table>
          <a href="${myProfileUrl}" style="display:block;background:#ffffff;color:#000000;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-decoration:none;padding:14px 16px;border-radius:100px;text-align:center;margin-bottom:36px;">
            View My Crate →
          </a>
        `;
      }

      // Send the email
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Flip-FM <noreply@flip-fm.com>",
          to: email,
          subject,
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
            <body style="margin:0;padding:0;background:#0a0a0a;font-family:Helvetica,Arial,sans-serif;color:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
                <tr>
                  <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;">
                      <tr><td style="background:#ffffff;height:3px;border-radius:3px 3px 0 0;"></td></tr>
                      <tr>
                        <td style="background:#111111;border:1px solid rgba(255,255,255,0.08);border-top:none;border-radius:0 0 16px 16px;padding:44px 36px;">
                          <p style="margin:0 0 36px;font-size:20px;font-weight:900;font-style:italic;letter-spacing:-1px;text-transform:uppercase;color:#ffffff;">FLIP-FM</p>
                          ${bodyHtml}
                          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:0 0 20px;" />
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

      if (resendRes.ok) {
        emailsSent++;
      }
    }

    // Mark all as sent
    const ids = notifications.map(n => n.id);
    await supabase
      .from("like_notifications")
      .update({ sent: true })
      .in("id", ids);

    return new Response(JSON.stringify({ success: true, sent: emailsSent }), {
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