import fs from "fs";

export default async function handler(req, res) {
    res.setHeader("Content-Type", "application/json");

    const file = "/tmp/key.json";

    // Create storage file if not exists
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify([]));
    }

    let data = JSON.parse(fs.readFileSync(file, "utf8") || "[]");

    // Get user IP from Vercel headers
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";

    // Generate random key
    const key = (Math.random().toString(16).substring(2, 14)).toUpperCase();
    const now = Date.now();

    // Remove expired entries (15 hours old)
    data = data.filter(entry =>
        now - new Date(entry.created_at).getTime() < 15 * 3600 * 1000
    );

    // Check if same IP already has active key
    for (const entry of data) {
        const created = new Date(entry.created_at).getTime();
        if (entry.ip === ip && now - created < 15 * 3600 * 1000) {
            return res.json({
                message: `You already have a valid key: ${entry.key}`,
                expires_in: `${(
                    (15 * 3600 * 1000 - (now - created)) /
                    3600000
                ).toFixed(1)}h left`
            });
        }
    }

    const newEntry = {
        key,
        ip,
        device_id: null,
        device_name: null,
        created_at: new Date().toISOString(),
        expires_at: new Date(now + 15 * 3600 * 1000).toISOString()
    };

    data.push(newEntry);

    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    res.json({
        message: `Your generated key: ${key} (valid for 15 hours)`,
        expires_at: newEntry.expires_at
    });
}