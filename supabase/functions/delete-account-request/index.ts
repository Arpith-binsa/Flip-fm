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
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, bio")
      .eq("id", user_id)
      .single();

    // Get user's email
    const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
    const email = authUser?.user?.email || "unknown";
    const username = profile?.username || "unknown";
    const requestTime = new Date().toUTCString();

    // Send email to support
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Flip-FM <noreply@flip-fm.com>",
        to: "support.flipf.m@gmail.com",
        subject: `Account Deletion Request — @${username}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8" /></head>
          <body style="margin:0;padding:0;background:#0a0a0a;font-family:Helvetica,Arial,sans-serif;color:#ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;">
                    <tr>
                      <td style="background:#ef4444;height:3px;border-radius:3px 3px 0 0;"></td>
                    </tr>
                    <tr>
                      <td style="background:#111111;border:1px solid rgba(255,255,255,0.08);border-top:none;border-radius:0 0 16px 16px;padding:44px 36px;">
                        <p style="margin:0 0 32px;font-size:20px;font-weight:900;font-style:italic;letter-spacing:-1px;text-transform:uppercase;color:#ffffff;">FLIP-FM</p>
                        <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:-1px;color:#ef4444;">
                          Account Deletion Request
                        </h1>
                        <p style="margin:0 0 32px;font-size:12px;color:#555555;text-transform:uppercase;letter-spacing:2px;">Action required within 24 hours</p>
                        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 28px;" />
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                          <tr>
                            <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                              <span style="font-size:11px;color:#555555;text-transform:uppercase;letter-spacing:1px;">Username</span><br/>
                              <span style="font-size:16px;font-weight:900;color:#ffffff;">@${username}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                              <span style="font-size:11px;color:#555555;text-transform:uppercase;letter-spacing:1px;">Email</span><br/>
                              <span style="font-size:16px;font-weight:700;color:#ffffff;">${email}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                              <span style="font-size:11px;color:#555555;text-transform:uppercase;letter-spacing:1px;">User ID</span><br/>
                              <span style="font-size:12px;font-weight:700;color:#888888;">${user_id}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 0;">
                              <span style="font-size:11px;color:#555555;text-transform:uppercase;letter-spacing:1px;">Requested At</span><br/>
                              <span style="font-size:14px;font-weight:700;color:#ffffff;">${requestTime}</span>
                            </td>
                          </tr>
                        </table>
                        <p style="margin:0 0 24px;font-size:13px;color:#888888;line-height:1.7;">
                          To delete this account, go to <strong style="color:#ffffff;">Supabase Dashboard → Authentication → Users</strong>, 
                          find the user by email and delete them. This will cascade and remove their profile and vibes automatically.
                        </p>
                        <p style="margin:0 0 24px;font-size:13px;color:#888888;line-height:1.7;">
                          Alternatively, reach out to the user at <a href="mailto:${email}" style="color:#ffffff;">${email}</a> before deleting if you want to understand why they're leaving.
                        </p>
                        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:0 0 20px;" />
                        <p style="margin:0;font-size:10px;color:#333333;text-align:center;">
                          Flip-FM Admin Notification — Do not reply to this email
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