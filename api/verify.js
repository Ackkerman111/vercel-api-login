import supabase from "../lib/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  let body = "";
  await new Promise(resolve => {
    req.on("data", chunk => (body += chunk));
    req.on("end", resolve);
  });

  const input = JSON.parse(body || "{}");
  if (!input.user_key) {
    return res.json({ status: false, reason: "Invalid JSON input." });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  const now = Date.now();

  const device_id = input.device_id || "";
  const device_name = input.device_name || "";

  const { data } = await supabase
    .from("keys")
    .select("*")
    .eq("key", input.user_key)
    .eq("ip", ip);

  if (!data || data.length === 0) {
    return res.json({ status: false, reason: "Invalid key or IP mismatch." });
  }

  const entry = data[0];
  const created = new Date(entry.created_at).getTime();
  const expires = created + 15 * 3600 * 1000;

  if (now > expires) {
    return res.json({
      status: false,
      reason: "Key expired. Please generate a new one."
    });
  }

  if (!entry.device_id) {
    await supabase
      .from("keys")
      .update({
        device_id,
        device_name,
        bound_at: new Date().toISOString()
      })
      .eq("id", entry.id);

    return res.json({
      status: true,
      message: `Device bound successfully.`
    });
  }

  if (entry.device_id === device_id) {
    return res.json({
      status: true,
      message: "Login verified."
    });
  }

  return res.json({
    status: false,
    reason: "Key already bound to another device."
  });
}