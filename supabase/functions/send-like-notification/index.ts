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
    const { liked_user_id } = await req.json();

    if (!liked_user_id) {
      return new Response(JSON.stringify({ error: "Missing liked_user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(liked_user_id);
    if (authError || !authUser?.user?.email) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = authUser.user.email;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", liked_user_id)
      .single();

    const username = profile?.username || "there";
    const profileUrl = `https://flip-fm.com/u/${username}`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Flip-FM <noreply@flip-fm.com>",
        to: email,
        subject: "Someone liked your crate 🎵",
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
                        <p style="margin:0 0 32px;font-size:22px;font-weight:900;font-style:italic;letter-spacing:-1px;text-transform:uppercase;color:#ffffff;">
                          FLIP-FM
                        </p>
                        <div style="text-align:center;margin-bottom:32px;">
                          <div style="display:inline-block;background:linear-gradient(135deg,#ec4899,#6366f1);border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">
                            ♥
                          </div>
                        </div>
                        <h1 style="margin:0 0 12px;font-size:32px;font-weight:900;text-transform:uppercase;letter-spacing:-1px;text-align:center;color:#ffffff;">
                          Someone liked<br/>your crate!
                        </h1>
                        <p style="margin:0 0 40px;font-size:15px;color:#6b7280;text-align:center;line-height:1.6;">
                          Hey @${username}, someone on Flip-FM just liked your crate.<br/>
                          Head over to see your latest likes.
                        </p>
                        <div style="text-align:center;margin-bottom:40px;">
                          <a href="${profileUrl}"
                            style="display:inline-block;background:linear-gradient(90deg,#6366f1,#ec4899);color:#ffffff;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-decoration:none;padding:16px 40px;border-radius:100px;">
                            View My Crate →
                          </a>
                        </div>
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