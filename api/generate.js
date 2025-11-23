import supabase from "../lib/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  const key = Math.random().toString(16).substring(2, 14).toUpperCase();
  const now = Date.now();
  const expires_at = new Date(now + 15 * 3600 * 1000).toISOString();

  const { data: existing } = await supabase
    .from("keys")
    .select("*")
    .eq("ip", ip);

  if (existing && existing.length > 0) {
    const entry = existing[0];
    const created_time = new Date(entry.created_at).getTime();

    if (now - created_time < 15 * 3600 * 1000) {
      return res.json({
        message: `You already have a valid key: ${entry.key}`,
        expires_in:
          ((15 * 3600 * 1000 - (now - created_time)) / 3600000).toFixed(1) +
          "h left"
      });
    }
  }

  await supabase.from("keys").insert({
    key,
    ip,
    device_id: null,
    device_name: null,
    expires_at
  });

  res.json({
    message: key,
    expires_at
  });
}