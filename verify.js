import fs from "fs";

export default async function handler(req, res) {
    res.setHeader("Content-Type", "application/json");

    const file = "/tmp/key.json";

    if (!fs.existsSync(file)) {
        return res.json({ status: false, reason: "No key storage found." });
    }

    const data = JSON.parse(fs.readFileSync(file, "utf8") || "[]");

    // Read JSON body
    let body = "";
    await new Promise(resolve => {
        req.on("data", chunk => body += chunk);
        req.on("end", resolve);
    });

    const input = JSON.parse(body || "{}");

    if (!input.user_key) {
        return res.json({ status: false, reason: "Invalid JSON input." });
    }

    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
    const now = Date.now();
    const user_key = input.user_key;
    const device_id = input.device_id || "";
    const device_name = input.device_name || "";

    for (let entry of data) {
        if (entry.key === user_key && entry.ip === ip) {

            const created = new Date(entry.created_at).getTime();
            const expires = created + 15 * 3600 * 1000;

            // Expired key
            if (now > expires) {
                return res.json({
                    status: false,
                    reason: "Key expired. Please generate a new one."
                });
            }

            // First-time device binding
            if (!entry.device_id) {
                entry.device_id = device_id;
                entry.device_name = device_name;
                entry.bound_at = new Date().toISOString();

                fs.writeFileSync(file, JSON.stringify(data, null, 2));

                return res.json({
                    status: true,
                    message: `Device bound successfully. Key valid until ${new Date(expires).toISOString()}`
                });
            }

            // Same device = login OK
            if (entry.device_id === device_id) {
                return res.json({
                    status: true,
                    message: "Login verified. Key still valid."
                });
            }

            // Wrong device
            return res.json({
                status: false,
                reason: "Key already bound to another device."
            });
        }
    }

    return res.json({ status: false, reason: "Invalid key or IP mismatch." });
}