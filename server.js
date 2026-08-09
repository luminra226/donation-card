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
// DONATION THEME
// ======================================================

function getDonationTheme(amount) {

    // 100K - 999K
    if (amount < 1_000_000) {

        return {
            background: "#d02c81",
            line: "#e83d91",
            accent: "#ff4fa3"
        };
    }


    // 1M - 9.99M
    if (amount < 10_000_000) {

        return {
            background: "#ff1010",
            line: "#ff2b2b",
            accent: "#ff1010"
        };
    }


    // 10M - 99.99M
    if (amount < 100_000_000) {

        return {
            background: "#ff0000",
            line: "#ff2424",
            accent: "#ff0000"
        };
    }


    // 100M+
    return {
        background: "#35105c",
        line: "#522079",
        accent: "#a855f7"
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


    // ==================================================
    // RESIZE AVATARS
    // ==================================================

    const donatorPng = await sharp(
        donatorAvatar
    )
        .resize(250, 250)
        .png()
        .toBuffer();


    const raiserPng = await sharp(
        raiserAvatar
    )
        .resize(250, 250)
        .png()
        .toBuffer();


    const donatorBase64 =
        donatorPng.toString("base64");


    const raiserBase64 =
        raiserPng.toString("base64");


    const formattedAmount =
        Number(amount).toLocaleString("en-US");


    const theme =
        getDonationTheme(amount);


    // ==================================================
    // SVG CARD
    // ==================================================

    const svg = `
<svg
    width="2048"
    height="514"
    viewBox="0 0 2048 514"
    xmlns="http://www.w3.org/2000/svg"
>

    <defs>

        <!-- ========================================== -->
        <!-- BACKGROUND -->
        <!-- ========================================== -->

        <linearGradient
            id="background"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
        >

            <stop
                offset="0%"
                stop-color="${theme.background}"
            />

            <stop
                offset="100%"
                stop-color="${theme.background}"
            />

        </linearGradient>


        <!-- ========================================== -->
        <!-- HORIZONTAL LINES -->
        <!-- ========================================== -->

        <pattern
            id="horizontalLines"
            width="2048"
            height="12"
            patternUnits="userSpaceOnUse"
        >

            <rect
                width="2048"
                height="3"
                fill="${theme.line}"
                opacity="0.55"
            />

            <rect
                y="7"
                width="2048"
                height="1"
                fill="#c90000"
                opacity="0.25"
            />

        </pattern>


        <!-- ========================================== -->
        <!-- LEFT AVATAR CLIP -->
        <!-- ========================================== -->

        <clipPath id="leftAvatarClip">

            <circle
                cx="392"
                cy="202"
                r="116"
            />

        </clipPath>


        <!-- ========================================== -->
        <!-- RIGHT AVATAR CLIP -->
        <!-- ========================================== -->

        <clipPath id="rightAvatarClip">

            <circle
                cx="1660"
                cy="202"
                r="116"
            />

        </clipPath>


        <!-- ========================================== -->
        <!-- SOFT GLOW -->
        <!-- ========================================== -->

        <filter
            id="softGlow"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
        >

            <feGaussianBlur
                stdDeviation="10"
            />

        </filter>

    </defs>


    <!-- ================================================= -->
    <!-- BACKGROUND -->
    <!-- ================================================= -->

    <rect
        x="0"
        y="42"
        width="2048"
        height="472"
        fill="url(#background)"
    />


    <!-- ================================================= -->
    <!-- BACKGROUND LINES -->
    <!-- ================================================= -->

    <rect
        x="0"
        y="42"
        width="2048"
        height="472"
        fill="url(#horizontalLines)"
    />


    <!-- ================================================= -->
    <!-- BLACK TOP BORDER -->
    <!-- ================================================= -->

    <rect
        x="0"
        y="0"
        width="2048"
        height="42"
        fill="#000000"
    />


    <!-- ================================================= -->
    <!-- TOP RED EDGE -->
    <!-- ================================================= -->

    <rect
        x="0"
        y="42"
        width="2048"
        height="3"
        fill="#e00000"
    />


    <!-- ================================================= -->
    <!-- LEFT OUTER CIRCLE -->
    <!-- ================================================= -->

    <circle
        cx="392"
        cy="202"
        r="139"
        fill="none"
        stroke="${theme.accent}"
        stroke-width="11"
        opacity="0.18"
        filter="url(#softGlow)"
    />


    <circle
        cx="392"
        cy="202"
        r="132"
        fill="none"
        stroke="${theme.accent}"
        stroke-width="7"
        opacity="0.22"
    />


    <!-- ================================================= -->
    <!-- LEFT AVATAR BACKGROUND -->
    <!-- ================================================= -->

    <circle
        cx="392"
        cy="202"
        r="119"
        fill="${theme.background}"
        stroke="${theme.accent}"
        stroke-width="5"
    />


    <!-- ================================================= -->
    <!-- LEFT AVATAR -->
    <!-- ================================================= -->

    <image
        href="data:image/png;base64,${donatorBase64}"
        x="276"
        y="86"
        width="232"
        height="232"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#leftAvatarClip)"
    />


    <!-- ================================================= -->
    <!-- LEFT AVATAR RING -->
    <!-- ================================================= -->

    <circle
        cx="392"
        cy="202"
        r="117"
        fill="none"
        stroke="${theme.accent}"
        stroke-width="4"
        opacity="0.75"
    />


    <!-- ================================================= -->
    <!-- RIGHT OUTER CIRCLE -->
    <!-- ================================================= -->

    <circle
        cx="1660"
        cy="202"
        r="139"
        fill="none"
        stroke="${theme.accent}"
        stroke-width="11"
        opacity="0.18"
        filter="url(#softGlow)"
    />


    <circle
        cx="1660"
        cy="202"
        r="132"
        fill="none"
        stroke="${theme.accent}"
        stroke-width="7"
        opacity="0.22"
    />


    <!-- ================================================= -->
    <!-- RIGHT AVATAR BACKGROUND -->
    <!-- ================================================= -->

    <circle
        cx="1660"
        cy="202"
        r="119"
        fill="${theme.background}"
        stroke="${theme.accent}"
        stroke-width="5"
    />


    <!-- ================================================= -->
    <!-- RIGHT AVATAR -->
    <!-- ================================================= -->

    <image
        href="data:image/png;base64,${raiserBase64}"
        x="1544"
        y="86"
        width="232"
        height="232"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#rightAvatarClip)"
    />


    <!-- ================================================= -->
    <!-- RIGHT AVATAR RING -->
    <!-- ================================================= -->

    <circle
        cx="1660"
        cy="202"
        r="117"
        fill="none"
        stroke="${theme.accent}"
        stroke-width="4"
        opacity="0.75"
    />


    <!-- ================================================= -->
    <!-- ROBUX ICON -->
    <!-- ================================================= -->

    <g
        transform="translate(555 89)"
        fill="${theme.accent}"
        stroke="#000000"
        stroke-width="8"
        stroke-linejoin="round"
    >

        <!-- Outer token -->

        <polygon
            points="
                64,0
                118,31
                118,94
                64,125
                10,94
                10,31
            "
        />

        <!-- Inner token -->

        <polygon
            points="
                64,16
                98,36
                98,87
                64,107
                30,87
                30,36
            "
            fill="none"
        />

        <!-- Center -->

        <rect
            x="53"
            y="51"
            width="22"
            height="22"
            fill="${theme.accent}"
        />

    </g>


    <!-- ================================================= -->
    <!-- DONATION AMOUNT -->
    <!-- ================================================= -->

    <text
        x="1080"
        y="207"
        text-anchor="middle"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-size="118"
        font-weight="900"
        fill="${theme.accent}"
        stroke="#000000"
        stroke-width="9"
        stroke-linejoin="round"
        paint-order="stroke fill"
    >
        ${escapeXml(formattedAmount)}
    </text>


    <!-- ================================================= -->
    <!-- DONATED TO -->
    <!-- ================================================= -->

    <text
        x="1024"
        y="327"
        text-anchor="middle"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-size="76"
        font-weight="900"
        fill="#ffffff"
        stroke="#000000"
        stroke-width="9"
        stroke-linejoin="round"
        paint-order="stroke fill"
    >
        donated to
    </text>


    <!-- ================================================= -->
    <!-- LEFT USERNAME -->
    <!-- ================================================= -->

    <text
        x="392"
        y="429"
        text-anchor="middle"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-size="53"
        font-weight="900"
        fill="#ffffff"
        stroke="#000000"
        stroke-width="8"
        stroke-linejoin="round"
        paint-order="stroke fill"
    >
        @${escapeXml(donatorName)}
    </text>


    <!-- ================================================= -->
    <!-- RIGHT USERNAME -->
    <!-- ================================================= -->

    <text
        x="1660"
        y="429"
        text-anchor="middle"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-size="53"
        font-weight="900"
        fill="#ffffff"
        stroke="#000000"
        stroke-width="8"
        stroke-linejoin="round"
        paint-order="stroke fill"
    >
        @${escapeXml(raiserName)}
    </text>

</svg>
`;


    // ==================================================
    // RENDER PNG
    // ==================================================

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
                    type: "image/png"
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

    if (amount < 1_000_000) {
        return 0xFF4FA3;
    }

    if (amount < 10_000_000) {
        return 0xFF2020;
    }

    if (amount < 100_000_000) {
        return 0xFF0000;
    }

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
