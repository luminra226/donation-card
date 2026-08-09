const express = require("express");
const sharp = require("sharp");

const app = express();

app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 10000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;


// ======================================================
// GET ROBLOX AVATAR
// ======================================================

async function getRobloxAvatar(userId) {
    const url =
        `https://thumbnails.roblox.com/v1/users/avatar-headshot` +
        `?userIds=${encodeURIComponent(userId)}` +
        `&size=420x420` +
        `&format=PNG` +
        `&isCircular=true`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Roblox thumbnail API returned ${response.status}`);
    }

    const json = await response.json();

    if (!json.data || !json.data[0] || !json.data[0].imageUrl) {
        throw new Error("Roblox avatar not found");
    }

    const imageResponse = await fetch(json.data[0].imageUrl);

    if (!imageResponse.ok) {
        throw new Error(`Avatar image returned ${imageResponse.status}`);
    }

    return Buffer.from(await imageResponse.arrayBuffer());
}


// ======================================================
// ESCAPE SVG TEXT
// ======================================================

function escapeXml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}


// ======================================================
// GET DONATION COLORS — YOUR EXACT THRESHOLDS
// ======================================================

function getDonationTheme(amount) {
    // 100K – 999,999 → PINK
    if (amount < 1_000_000) {
        return {
            name: "Pink",
            bgTop: "#5c1538",
            bgBottom: "#1a0510",
            accent: "#ff4fa3",
            accentLight: "#ff94c9",
            border: "#ff4fa3",
            robuxFill: "#ff4fa3"
        };
    }

    // 1M – 9,999,999 → RED
    if (amount < 10_000_000) {
        return {
            name: "Red",
            bgTop: "#610f0f",
            bgBottom: "#1f0404",
            accent: "#ff2020",
            accentLight: "#ff6060",
            border: "#ff2424",
            robuxFill: "#ff2020"
        };
    }

    // 10M – 99,999,999 → DEEP RED
    if (amount < 100_000_000) {
        return {
            name: "Deep Red",
            bgTop: "#6b0000",
            bgBottom: "#1a0000",
            accent: "#ff0000",
            accentLight: "#ff4242",
            border: "#ff0f0f",
            robuxFill: "#ff0000"
        };
    }

    // 100M+ → PURPLE
    return {
        name: "Purple",
        bgTop: "#4a1575",
        bgBottom: "#17072b",
        accent: "#a855f7",
        accentLight: "#d496ff",
        border: "#a855f7",
        robuxFill: "#a855f7"
    };
}


// ======================================================
// DISCORD EMBED COLOR
// ======================================================

function getDiscordColor(amount) {
    if (amount < 1_000_000) return 0xFF4FA3;
    if (amount < 10_000_000) return 0xFF2020;
    if (amount < 100_000_000) return 0xFF0000;
    return 0xA855F7;
}


// ======================================================
// CREATE DONATION CARD — MATCHES YOUR IMAGE EXACTLY
// ======================================================

async function createDonationCard({
    donatorName,
    raiserName,
    amount,
    donatorId,
    raiserId
}) {
    const [donatorAvatar, raiserAvatar] = await Promise.all([
        getRobloxAvatar(donatorId),
        getRobloxAvatar(raiserId)
    ]);

    // Resize avatars
    const donatorPng = await sharp(donatorAvatar)
        .resize(220, 220)
        .png()
        .toBuffer();

    const raiserPng = await sharp(raiserAvatar)
        .resize(220, 220)
        .png()
        .toBuffer();

    const donatorBase64 = donatorPng.toString("base64");
    const raiserBase64 = raiserPng.toString("base64");

    const formattedAmount = Number(amount).toLocaleString("en-US");
    const theme = getDonationTheme(amount);


    // ==================================================
    // SVG — MATCHES YOUR IMAGE LAYOUT & STYLING
    // ==================================================

    const svg = `
<svg
    width="1200"
    height="400"
    viewBox="0 0 1200 400"
    xmlns="http://www.w3.org/2000/svg"
>
    <defs>
        <!-- Background gradient -->
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${theme.bgTop}" />
            <stop offset="100%" stop-color="${theme.bgBottom}" />
        </linearGradient>

        <!-- Text stroke filter -->
        <filter id="textStroke" x="-20%" y="-20%" width="140%" height="140%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="stroke" />
            <feColorMatrix in="stroke" type="matrix"
                values="0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 1 0" result="blackStroke" />
            <feBlend in="SourceGraphic" in2="blackStroke" mode="normal" />
        </filter>

        <!-- Avatar circular clip -->
        <clipPath id="clipLeft">
            <circle cx="200" cy="130" r="95" />
        </clipPath>
        <clipPath id="clipRight">
            <circle cx="1000" cy="130" r="95" />
        </clipPath>
    </defs>

    <!-- Background -->
    <rect width="1200" height="400" fill="url(#bg)" />

    <!-- ============================================= -->
    <!-- LEFT AVATAR WITH RED CIRCLE BORDER -->
    <!-- ============================================= -->
    <circle cx="200" cy="130" r="105" fill="none" stroke="${theme.border}" stroke-width="6" />
    <circle cx="200" cy="130" r="97" fill="#111" stroke="${theme.border}" stroke-width="2" />
    <image
        href="data:image/png;base64,${donatorBase64}"
        x="105" y="35" width="190" height="190"
        clip-path="url(#clipLeft)"
        preserveAspectRatio="xMidYMid slice"
    />

    <!-- Left username -->
    <text x="200" y="275" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="bold"
        fill="#ffffff" filter="url(#textStroke)">
        ${escapeXml(donatorName)}
    </text>

    <!-- ============================================= -->
    <!-- RIGHT AVATAR WITH RED CIRCLE BORDER -->
    <!-- ============================================= -->
    <circle cx="1000" cy="130" r="105" fill="none" stroke="${theme.border}" stroke-width="6" />
    <circle cx="1000" cy="130" r="97" fill="#111" stroke="${theme.border}" stroke-width="2" />
    <image
        href="data:image/png;base64,${raiserBase64}"
        x="905" y="35" width="190" height="190"
        clip-path="url(#clipRight)"
        preserveAspectRatio="xMidYMid slice"
    />

    <!-- Right username -->
    <text x="1000" y="275" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="bold"
        fill="#ffffff" filter="url(#textStroke)">
        ${escapeXml(raiserName)}
    </text>

    <!-- ============================================= -->
    <!-- ROBUX HEXAGON ICON + AMOUNT (CENTER) -->
    <!-- ============================================= -->
    <g transform="translate(410, 85)">
        <!-- Hexagon -->
        <polygon
            points="30,0 90,0 120,52 90,104 30,104 0,52"
            fill="${theme.robuxFill}"
            stroke="#000" stroke-width="2"
        />
        <!-- R inside hexagon -->
        <text x="60" y="70" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif" font-size="60" font-weight="900"
            fill="#000">R</text>
    </g>

    <!-- Amount number -->
    <text x="660" y="145" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="92" font-weight="900"
        fill="${theme.accent}" filter="url(#textStroke)">
        ${escapeXml(formattedAmount)}
    </text>

    <!-- "donated to" -->
    <text x="600" y="230" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="bold"
        fill="#ffffff" filter="url(#textStroke)">
        donated to
    </text>

</svg>`;

    return await Sharp(Buffer.from(svg)).png().toBuffer();
}


// ======================================================
// HOMEPAGE
// ======================================================

app.get("/", (req, res) => {
    res.send("Roblox Donation Card API is online.");
});


// ======================================================
// DONATION ENDPOINT
// ======================================================

app.post("/donation", async (req, res) => {
    try {
        const { DonatorName, RaiserName, Amount, DonatorId, RaiserId } = req.body;

        if (!DonatorName || !RaiserName || !Amount || !DonatorId || !RaiserId) {
            return res.status(400).json({ success: false, error: "Missing donation data" });
        }

        const amount = Number(Amount);
        const donatorId = Number(DonatorId);
        const raiserId = Number(RaiserId);

        if (!Number.isFinite(amount) || !Number.isInteger(donatorId) || !Number.isInteger(raiserId)) {
            return res.status(400).json({ success: false, error: "Invalid donation data" });
        }

        // Minimum 100K
        if (amount < 100_000) {
            return res.json({ success: true, ignored: true });
        }

        if (!DISCORD_WEBHOOK_URL) {
            console.error("DISCORD_WEBHOOK_URL is missing");
            return res.status(500).json({ success: false, error: "Webhook not configured" });
        }

        const card = await createDonationCard({
            donatorName: DonatorName,
            raiserName: RaiserName,
            amount,
            donatorId,
            raiserId
        });

        const form = new FormData();
        const discordPayload = {
            username: "Donation Logs",
            content: `💸 **${DonatorName}** donated **${amount.toLocaleString()} Robux** to **${RaiserName}**`,
            embeds: [{
                color: getDiscordColor(amount),
                image: { url: "attachment://donation.png" },
                footer: { text: "Roblox Donation" },
                timestamp: new Date().toISOString()
            }],
            allowed_mentions: { parse: [] }
        };

        form.append("payload_json", JSON.stringify(discordPayload));
        form.append("files[0]", new Blob([card], { type: "image/png" }), "donation.png");

        const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
            method: "POST",
            body: form
        });

        if (!discordResponse.ok) {
            const error = await discordResponse.text();
            console.error("Discord error:", error);
            return res.status(502).json({ success: false, error: "Discord webhook failed" });
        }

        console.log(`${DonatorName} donated ${amount.toLocaleString()} to ${RaiserName}`);
        return res.json({ success: true });

    } catch (error) {
        console.error("Donation error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
});


// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
