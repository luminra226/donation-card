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
        `&format=Png` +
        `&isCircular=true`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Roblox thumbnail API returned ${response.status}`
        );
    }

    const json = await response.json();

    if (
        !json.data ||
        !json.data[0] ||
        !json.data[0].imageUrl
    ) {
        throw new Error("Roblox avatar not found");
    }

    const imageResponse = await fetch(
        json.data[0].imageUrl
    );

    if (!imageResponse.ok) {
        throw new Error(
            `Avatar image returned ${imageResponse.status}`
        );
    }

    return Buffer.from(
        await imageResponse.arrayBuffer()
    );
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
// GET DONATION COLORS
// ======================================================

function getDonationTheme(amount) {

    // 100K+
    if (amount < 1000000) {

        return {
            name: "Pink",

            background1: "#4b102e",
            background2: "#180711",

            primary1: "#ff4fa3",
            primary2: "#ff8bc4",

            border: "#ff4fa3",
            glow: "#ff4fa3"
        };
    }


    // 1M+
    if (amount < 10000000) {

        return {
            name: "Red",

            background1: "#4b1010",
            background2: "#180707",

            primary1: "#ff2020",
            primary2: "#ff5a5a",

            border: "#ff2424",
            glow: "#ff2020"
        };
    }


    // 10M+
    if (amount < 100000000) {

        return {
            name: "Deep Red",

            background1: "#5c0808",
            background2: "#160202",

            primary1: "#ff0000",
            primary2: "#ff3838",

            border: "#ff1010",
            glow: "#ff0000"
        };
    }


    // 100M+
    return {

        name: "Purple",

        background1: "#35105c",
        background2: "#10051c",

        primary1: "#a855f7",
        primary2: "#d084ff",

        border: "#a855f7",
        glow: "#a855f7"
    };
}


// ======================================================
// CREATE DONATION CARD
// ======================================================

async function createDonationCard({
    donatorName,
    raiserName,
    amount,
    donatorId,
    raiserId
}) {

    const [
        donatorAvatar,
        raiserAvatar
    ] = await Promise.all([

        getRobloxAvatar(donatorId),

        getRobloxAvatar(raiserId)

    ]);


    // Resize avatars

    const donatorPng = await sharp(
        donatorAvatar
    )
        .resize(210, 210)
        .png()
        .toBuffer();


    const raiserPng = await sharp(
        raiserAvatar
    )
        .resize(210, 210)
        .png()
        .toBuffer();


    const donatorBase64 =
        donatorPng.toString("base64");


    const raiserBase64 =
        raiserPng.toString("base64");


    const formattedAmount =
        Number(amount).toLocaleString("en-US");


    // Get theme

    const theme =
        getDonationTheme(amount);


    // ==================================================
    // SVG CARD
    // ==================================================

    const svg = `
<svg
    width="1000"
    height="360"
    viewBox="0 0 1000 360"
    xmlns="http://www.w3.org/2000/svg"
>

    <defs>

        <!-- Background gradient -->

        <linearGradient
            id="background"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
        >

            <stop
                offset="0%"
                stop-color="${theme.background1}"
            />

            <stop
                offset="100%"
                stop-color="${theme.background2}"
            />

        </linearGradient>


        <!-- Main accent gradient -->

        <linearGradient
            id="accent"
            x1="0"
            y1="0"
            x2="1"
            y2="0"
        >

            <stop
                offset="0%"
                stop-color="${theme.primary1}"
            />

            <stop
                offset="100%"
                stop-color="${theme.primary2}"
            />

        </linearGradient>


        <!-- Soft glow -->

        <filter
            id="glow"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
        >

            <feGaussianBlur
                stdDeviation="10"
                result="blur"
            />

        </filter>


        <!-- Avatar shadow -->

        <filter
            id="shadow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
        >

            <feDropShadow
                dx="0"
                dy="6"
                stdDeviation="8"
                flood-opacity="0.55"
            />

        </filter>


        <!-- Avatar clipping -->

        <clipPath id="donatorClip">

            <circle
                cx="145"
                cy="155"
                r="78"
            />

        </clipPath>


        <clipPath id="raiserClip">

            <circle
                cx="855"
                cy="155"
                r="78"
            />

        </clipPath>

    </defs>


    <!-- ============================================= -->
    <!-- BACKGROUND -->
    <!-- ============================================= -->

    <rect
        width="1000"
        height="360"
        rx="22"
        fill="url(#background)"
    />


    <!-- ============================================= -->
    <!-- OUTER GLOW -->
    <!-- ============================================= -->

    <rect
        x="5"
        y="5"
        width="990"
        height="350"
        rx="18"
        fill="none"
        stroke="${theme.glow}"
        stroke-width="12"
        opacity="0.15"
        filter="url(#glow)"
    />


    <!-- ============================================= -->
    <!-- BORDER -->
    <!-- ============================================= -->

    <rect
        x="5"
        y="5"
        width="990"
        height="350"
        rx="18"
        fill="none"
        stroke="${theme.border}"
        stroke-width="4"
        opacity="0.95"
    />


    <!-- ============================================= -->
    <!-- LEFT AVATAR OUTER CIRCLE -->
    <!-- ============================================= -->

    <circle
        cx="145"
        cy="155"
        r="91"
        fill="#090909"
        stroke="${theme.primary1}"
        stroke-width="5"
        filter="url(#shadow)"
    />


    <!-- Left avatar -->

    <image
        href="data:image/png;base64,${donatorBase64}"
        x="67"
        y="77"
        width="156"
        height="156"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#donatorClip)"
    />


    <!-- Left avatar inner ring -->

    <circle
        cx="145"
        cy="155"
        r="80"
        fill="none"
        stroke="${theme.primary2}"
        stroke-width="3"
        opacity="0.9"
    />


    <!-- ============================================= -->
    <!-- RIGHT AVATAR OUTER CIRCLE -->
    <!-- ============================================= -->

    <circle
        cx="855"
        cy="155"
        r="91"
        fill="#090909"
        stroke="${theme.primary1}"
        stroke-width="5"
        filter="url(#shadow)"
    />


    <!-- Right avatar -->

    <image
        href="data:image/png;base64,${raiserBase64}"
        x="777"
        y="77"
        width="156"
        height="156"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#raiserClip)"
    />


    <!-- Right avatar inner ring -->

    <circle
        cx="855"
        cy="155"
        r="80"
        fill="none"
        stroke="${theme.primary2}"
        stroke-width="3"
        opacity="0.9"
    />


    <!-- ============================================= -->
    <!-- DONATION AMOUNT -->
    <!-- ============================================= -->

    <text
        x="500"
        y="125"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="48"
        font-weight="900"
        fill="url(#accent)"
    >
        💰 ${escapeXml(formattedAmount)}
    </text>


    <!-- ROBUX -->

    <text
        x="500"
        y="157"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="20"
        font-weight="700"
        fill="#ffffff"
        opacity="0.85"
    >
        ROBUX
    </text>


    <!-- ============================================= -->
    <!-- DONATED TO -->
    <!-- ============================================= -->

    <text
        x="500"
        y="204"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="30"
        font-weight="800"
        fill="#ffffff"
    >
        donated to
    </text>


    <!-- ============================================= -->
    <!-- DONATOR NAME -->
    <!-- ============================================= -->

    <text
        x="145"
        y="270"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="22"
        font-weight="800"
        fill="#ffffff"
    >
        ${escapeXml(donatorName)}
    </text>


    <!-- ============================================= -->
    <!-- RAISER NAME -->
    <!-- ============================================= -->

    <text
        x="855"
        y="270"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="22"
        font-weight="800"
        fill="#ffffff"
    >
        ${escapeXml(raiserName)}
    </text>


    <!-- ============================================= -->
    <!-- BOTTOM LABEL -->
    <!-- ============================================= -->

    <text
        x="500"
        y="323"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="17"
        font-weight="600"
        fill="#ffffff"
        opacity="0.65"
    >
        ${escapeXml(theme.name)} Donation
    </text>


</svg>
`;


    return await sharp(
        Buffer.from(svg)
    )
        .png()
        .toBuffer();
}


// ======================================================
// HOMEPAGE
// ======================================================

app.get("/", (req, res) => {

    res.send(
        "Roblox Donation Card API is online."
    );

});


// ======================================================
// DONATION ENDPOINT
// ======================================================

app.post("/donation", async (req, res) => {

    try {

        const {
            DonatorName,
            RaiserName,
            Amount,
            DonatorId,
            RaiserId
        } = req.body;


        // ==============================================
        // VALIDATION
        // ==============================================

        if (
            !DonatorName ||
            !RaiserName ||
            !Amount ||
            !DonatorId ||
            !RaiserId
        ) {

            return res.status(400).json({

                success: false,

                error:
                    "Missing donation data"

            });

        }


        const amount =
            Number(Amount);


        const donatorId =
            Number(DonatorId);


        const raiserId =
            Number(RaiserId);


        if (
            !Number.isFinite(amount) ||
            !Number.isInteger(donatorId) ||
            !Number.isInteger(raiserId)
        ) {

            return res.status(400).json({

                success: false,

                error:
                    "Invalid donation data"

            });

        }


        // ==============================================
        // 100K MINIMUM
        // ==============================================

        if (amount < 100000) {

            return res.json({

                success: true,

                ignored: true

            });

        }


        // ==============================================
        // WEBHOOK CHECK
        // ==============================================

        if (!DISCORD_WEBHOOK_URL) {

            console.error(
                "DISCORD_WEBHOOK_URL is missing"
            );

            return res.status(500).json({

                success: false,

                error:
                    "Webhook not configured"

            });

        }


        // ==============================================
        // CREATE CARD
        // ==============================================

        const card =
            await createDonationCard({

                donatorName:
                    DonatorName,

                raiserName:
                    RaiserName,

                amount:
                    amount,

                donatorId:
                    donatorId,

                raiserId:
                    raiserId

            });


        // ==============================================
        // DISCORD WEBHOOK
        // ==============================================

        const form =
            new FormData();


        const discordPayload = {

            username:
                "Donation Logs",


            content:
                `💸 **${DonatorName}** donated ` +
                `**💰 ${amount.toLocaleString()} Robux** ` +
                `to **${RaiserName}**`,


            embeds: [

                {

                    color:
                        getDiscordColor(amount),


                    image: {

                        url:
                            "attachment://donation.png"

                    },


                    footer: {

                        text:
                            "Roblox Donation"

                    },


                    timestamp:
                        new Date().toISOString()

                }

            ],


            allowed_mentions: {

                parse: []

            }

        };


        form.append(

            "payload_json",

            JSON.stringify(
                discordPayload
            )

        );


        form.append(

            "files[0]",

            new Blob(

                [card],

                {

                    type:
                        "image/png"

                }

            ),

            "donation.png"

        );


        const discordResponse =
            await fetch(

                DISCORD_WEBHOOK_URL,

                {

                    method:
                        "POST",

                    body:
                        form

                }

            );


        if (!discordResponse.ok) {

            const error =
                await discordResponse.text();


            console.error(

                "Discord error:",

                error

            );


            return res.status(502).json({

                success:
                    false,

                error:
                    "Discord webhook failed"

            });

        }


        console.log(

            `${DonatorName} donated ` +

            `${amount.toLocaleString()} ` +

            `to ${RaiserName}`

        );


        return res.json({

            success:
                true

        });


    } catch (error) {

        console.error(

            "Donation error:",

            error

        );


        return res.status(500).json({

            success:
                false,

            error:
                "Internal server error"

        });

    }

});


// ======================================================
// DISCORD EMBED COLOR
// ======================================================

function getDiscordColor(amount) {

    if (amount < 1000000) {

        // Pink
        return 0xFF4FA3;

    }


    if (amount < 10000000) {

        // Red
        return 0xFF2020;

    }


    if (amount < 100000000) {

        // Deep red
        return 0xFF0000;

    }


    // Purple
    return 0xA855F7;

}


// ======================================================
// START SERVER
// ======================================================

app.listen(

    PORT,

    "0.0.0.0",

    () => {

        console.log(

            `Server running on port ${PORT}`

        );

    }

);
