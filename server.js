const express = require("express");
const sharp = require("sharp");

const app = express();

app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 10000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;


// Get Roblox avatar
async function getRobloxAvatar(userId) {
    const url =
        `https://thumbnails.roblox.com/v1/users/avatar-headshot` +
        `?userIds=${encodeURIComponent(userId)}` +
        `&size=420x420` +
        `&format=Png` +
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


// Escape text for SVG
function escapeXml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}


// Create the donation image
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

    const donatorPng = await sharp(donatorAvatar)
        .resize(210, 210)
        .png()
        .toBuffer();

    const raiserPng = await sharp(raiserAvatar)
        .resize(210, 210)
        .png()
        .toBuffer();

    const donatorBase64 = donatorPng.toString("base64");
    const raiserBase64 = raiserPng.toString("base64");

    const formattedAmount = Number(amount).toLocaleString("en-US");

    const svg = `
<svg
    width="1000"
    height="360"
    viewBox="0 0 1000 360"
    xmlns="http://www.w3.org/2000/svg"
>

    <defs>

        <linearGradient id="background"
            x1="0" y1="0"
            x2="1" y2="1">

            <stop offset="0%" stop-color="#4b1010"/>
            <stop offset="100%" stop-color="#180707"/>

        </linearGradient>

        <linearGradient id="red"
            x1="0" y1="0"
            x2="1" y2="0">

            <stop offset="0%" stop-color="#ff2020"/>
            <stop offset="100%" stop-color="#ff5a5a"/>

        </linearGradient>

        <filter id="shadow">
            <feDropShadow
                dx="0"
                dy="5"
                stdDeviation="8"
                flood-opacity="0.5"
            />
        </filter>

        <clipPath id="donatorClip">
            <circle cx="145" cy="155" r="82"/>
        </clipPath>

        <clipPath id="raiserClip">
            <circle cx="855" cy="155" r="82"/>
        </clipPath>

    </defs>


    <!-- Background -->

    <rect
        width="1000"
        height="360"
        rx="18"
        fill="url(#background)"
    />


    <!-- Border -->

    <rect
        x="4"
        y="4"
        width="992"
        height="352"
        rx="16"
        fill="none"
        stroke="#ff2424"
        stroke-width="5"
    />


    <!-- Donator -->

    <circle
        cx="145"
        cy="155"
        r="91"
        fill="#111111"
        stroke="#ff2525"
        stroke-width="6"
        filter="url(#shadow)"
    />

    <image
        href="data:image/png;base64,${donatorBase64}"
        x="63"
        y="73"
        width="164"
        height="164"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#donatorClip)"
    />


    <!-- Raiser -->

    <circle
        cx="855"
        cy="155"
        r="91"
        fill="#111111"
        stroke="#ff2525"
        stroke-width="6"
        filter="url(#shadow)"
    />

    <image
        href="data:image/png;base64,${raiserBase64}"
        x="773"
        y="73"
        width="164"
        height="164"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#raiserClip)"
    />


    <!-- Amount -->

    <text
        x="500"
        y="130"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="52"
        font-weight="900"
        fill="url(#red)"
    >
        ${escapeXml(formattedAmount)} Robux
    </text>


    <!-- Donated -->

    <text
        x="500"
        y="182"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="34"
        font-weight="800"
        fill="white"
    >
        donated to
    </text>


    <!-- Names -->

    <text
        x="145"
        y="275"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="24"
        font-weight="700"
        fill="white"
    >
        ${escapeXml(donatorName)}
    </text>

    <text
        x="855"
        y="275"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="24"
        font-weight="700"
        fill="white"
    >
        ${escapeXml(raiserName)}
    </text>


    <text
        x="500"
        y="325"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="18"
        fill="#cccccc"
    >
        Roblox Donation
    </text>

</svg>
`;

    return await sharp(Buffer.from(svg))
        .png()
        .toBuffer();
}


// Homepage
app.get("/", (req, res) => {
    res.send("Roblox Donation Card API is online.");
});


// Donation endpoint
app.post("/donation", async (req, res) => {

    try {

        const {
            DonatorName,
            RaiserName,
            Amount,
            DonatorId,
            RaiserId
        } = req.body;


        if (
            !DonatorName ||
            !RaiserName ||
            !Amount ||
            !DonatorId ||
            !RaiserId
        ) {
            return res.status(400).json({
                success: false,
                error: "Missing donation data"
            });
        }


        const amount = Number(Amount);
        const donatorId = Number(DonatorId);
        const raiserId = Number(RaiserId);


        if (
            !Number.isFinite(amount) ||
            !Number.isInteger(donatorId) ||
            !Number.isInteger(raiserId)
        ) {
            return res.status(400).json({
                success: false,
                error: "Invalid donation data"
            });
        }


        // Only log donations of 100,000+
        if (amount < 100000) {
            return res.json({
                success: true,
                ignored: true
            });
        }


        if (!DISCORD_WEBHOOK_URL) {
            console.error("DISCORD_WEBHOOK_URL is missing");

            return res.status(500).json({
                success: false,
                error: "Webhook not configured"
            });
        }


        // Generate donation card

        const card = await createDonationCard({
            donatorName: DonatorName,
            raiserName: RaiserName,
            amount: amount,
            donatorId: donatorId,
            raiserId: raiserId
        });


        // Create Discord webhook request

        const form = new FormData();

        const discordPayload = {

            username: "Donation Logs",

            content:
                `💸 **${DonatorName}** donated ` +
                `**💰 ${amount.toLocaleString()} Robux** ` +
                `to **${RaiserName}**`,

            embeds: [
                {
                    color: 16711680,

                    image: {
                        url: "attachment://donation.png"
                    },

                    footer: {
                        text: "Donated on"
                    },

                    timestamp: new Date().toISOString()
                }
            ],

            allowed_mentions: {
                parse: []
            }
        };


        form.append(
            "payload_json",
            JSON.stringify(discordPayload)
        );


        form.append(
            "files[0]",
            new Blob(
                [card],
                {
                    type: "image/png"
                }
            ),
            "donation.png"
        );


        const discordResponse = await fetch(
            DISCORD_WEBHOOK_URL,
            {
                method: "POST",
                body: form
            }
        );


        if (!discordResponse.ok) {

            const error = await discordResponse.text();

            console.error(
                "Discord error:",
                error
            );

            return res.status(502).json({
                success: false,
                error: "Discord webhook failed"
            });
        }


        console.log(
            `${DonatorName} donated ` +
            `${amount.toLocaleString()} ` +
            `to ${RaiserName}`
        );


        return res.json({
            success: true
        });


    } catch (error) {

        console.error(
            "Donation error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
});


app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
