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
        `&isCircular=false`;

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
// REMOVE EXTRA @
// ======================================================

function cleanUsername(name) {
    return String(name).replace(/^@+/, "");
}

// ======================================================
// DONATION THEME
// ======================================================

function getDonationTheme(amount) {

    // 100,000 - 9,999,999
    if (amount < 10_000_000) {
        return {
            accent: "#FF00C8"
        };
    }

    // 10,000,000 - 99,999,999
    if (amount < 100_000_000) {
        return {
            accent: "#FFAA00"
        };
    }

    // 100,000,000+
    return {
        accent: "#00FFFF"
    };
}

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

    const donatorPng = await sharp(donatorAvatar)
        .resize(250, 250)
        .png()
        .toBuffer();

    const raiserPng = await sharp(raiserAvatar)
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
        getDonationTheme(Number(amount));

    const donatorUsername =
        cleanUsername(donatorName);

    const raiserUsername =
        cleanUsername(raiserName);

    // ==================================================
    // EXACT REFERENCE LAYOUT
    // ==================================================

    const WIDTH = 1872;
    const HEIGHT = 470;

    // Avatar centers
    const leftAvatarX = 354;
    const rightAvatarX = 1516;
    const avatarY = 188;

    const avatarSize = 250;
    const avatarRadius = 125;

    // ==================================================
    // AMOUNT GROUP
    // ==================================================

    // Reference:
    // icon is immediately to the left of the number
    // and the entire group is centered.

    const iconSize = 96;
    const iconGap = 22;

    const amountFontSize = 112;

    // Approximate width of Arial Black digits.
    const amountTextWidth =
        formattedAmount.length * 72;

    const totalAmountWidth =
        iconSize +
        iconGap +
        amountTextWidth;

    const amountGroupCenterX =
        WIDTH / 2;

    const amountStartX =
        amountGroupCenterX -
        (totalAmountWidth / 2);

    const iconX =
        amountStartX;

    const amountX =
        amountStartX +
        iconSize +
        iconGap +
        (amountTextWidth / 2);

    // ==================================================
    // SVG
    // ==================================================

    const svg = `
<svg
    width="${WIDTH}"
    height="${HEIGHT}"
    viewBox="0 0 ${WIDTH} ${HEIGHT}"
    xmlns="http://www.w3.org/2000/svg"
>

    <defs>

        <!-- ========================================== -->
        <!-- LEFT AVATAR -->
        <!-- ========================================== -->

        <clipPath id="leftAvatarClip">
            <circle
                cx="${leftAvatarX}"
                cy="${avatarY}"
                r="${avatarRadius}"
            />
        </clipPath>

        <!-- ========================================== -->
        <!-- RIGHT AVATAR -->
        <!-- ========================================== -->

        <clipPath id="rightAvatarClip">
            <circle
                cx="${rightAvatarX}"
                cy="${avatarY}"
                r="${avatarRadius}"
            />
        </clipPath>

    </defs>


    <!-- ================================================= -->
    <!-- LEFT AVATAR -->
    <!-- ================================================= -->

    <image
        href="data:image/png;base64,${donatorBase64}"
        x="${leftAvatarX - avatarRadius}"
        y="${avatarY - avatarRadius}"
        width="${avatarSize}"
        height="${avatarSize}"
        preserveAspectRatio="xMidYMid meet"
        clip-path="url(#leftAvatarClip)"
    />

    <!-- Pink ring -->

    <circle
        cx="${leftAvatarX}"
        cy="${avatarY}"
        r="${avatarRadius - 3}"
        fill="none"
        stroke="${theme.accent}"
        stroke-width="7"
    />


    <!-- ================================================= -->
    <!-- RIGHT AVATAR -->
    <!-- ================================================= -->

    <image
        href="data:image/png;base64,${raiserBase64}"
        x="${rightAvatarX - avatarRadius}"
        y="${avatarY - avatarRadius}"
        width="${avatarSize}"
        height="${avatarSize}"
        preserveAspectRatio="xMidYMid meet"
        clip-path="url(#rightAvatarClip)"
    />

    <!-- Pink ring -->

    <circle
        cx="${rightAvatarX}"
        cy="${avatarY}"
        r="${avatarRadius - 3}"
        fill="none"
        stroke="${theme.accent}"
        stroke-width="7"
    />

<!-- ================================================= -->
<!-- CENTER ROBUX + AMOUNT -->
<!-- ================================================= -->

<g>

    <!-- ROBUX ICON -->

    <g
        transform="
            translate(${iconX}, 95)
        "
    >

        <!-- Outer pink Robux shape -->

        <path
            d="
                M48 0
                L86 22
                Q96 28 96 38
                L96 58
                Q96 68 86 74
                L48 96
                L10 74
                Q0 68 0 58
                L0 38
                Q0 28 10 22
                Z
            "
            fill="${theme.accent}"
            stroke="#000000"
            stroke-width="6"
            stroke-linejoin="round"
        />

        <!-- Inner black outline -->

        <path
            d="
                M48 19
                L75 35
                L75 61
                L48 77
                L21 61
                L21 35
                Z
            "
            fill="none"
            stroke="#000000"
            stroke-width="5"
            stroke-linejoin="round"
        />

        <!-- Center square -->

        <rect
            x="39"
            y="39"
            width="18"
            height="18"
            rx="1"
            fill="#000000"
        />

    </g>


    <!-- ================================================= -->
    <!-- AMOUNT -->
    <!-- ================================================= -->

    <text
        x="${amountX}"
        y="184"
        text-anchor="middle"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-size="${amountFontSize}"
        font-weight="900"
        fill="${theme.accent}"

        <!-- BLACK TEXT STROKE -->
        stroke="#000000"
        stroke-width="5"
        stroke-linejoin="round"
        paint-order="stroke fill"
    >
        ${escapeXml(formattedAmount)}
    </text>

</g>


    <!-- ================================================= -->
    <!-- DONATED TO -->
    <!-- ================================================= -->

    <text
        x="${WIDTH / 2}"
        y="295"
        text-anchor="middle"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-size="78"
        font-weight="900"
        fill="#FFFFFF"
    >
        donated to
    </text>


    <!-- ================================================= -->
    <!-- LEFT USERNAME -->
    <!-- ================================================= -->

    <text
        x="${leftAvatarX}"
        y="383"
        text-anchor="middle"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-size="47"
        font-weight="900"
        fill="#FFFFFF"
    >
        @${escapeXml(donatorUsername)}
    </text>


    <!-- ================================================= -->
    <!-- RIGHT USERNAME -->
    <!-- ================================================= -->

    <text
        x="${rightAvatarX}"
        y="383"
        text-anchor="middle"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-size="47"
        font-weight="900"
        fill="#FFFFFF"
    >
        @${escapeXml(raiserUsername)}
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
                error: "Missing donation data"
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
                error: "Invalid donation data"
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
                error: "Webhook not configured"
            });
        }

        // ==============================================
        // CREATE CARD
        // ==============================================

        const card =
            await createDonationCard({
                donatorName: DonatorName,
                raiserName: RaiserName,
                amount: amount,
                donatorId: donatorId,
                raiserId: raiserId
            });

        // ==============================================
        // FORMAT DATE
        // ==============================================

        const now = new Date();

        const formattedDate =
            now.toLocaleString("en-US", {
                month: "numeric",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            });

        const theme =
            getDonationTheme(amount);

        const hexColorInt =
            parseInt(
                theme.accent.replace("#", ""),
                16
            );

        // ==============================================
        // DISCORD WEBHOOK
        // ==============================================

        const form =
            new FormData();

        const discordPayload = {

            content:
                `\`@${cleanUsername(DonatorName)}\` donated **<:robux:123456789> ${amount.toLocaleString()} Robux** ` +
                `to \`@${cleanUsername(RaiserName)}\``,

            embeds: [
                {
                    color: hexColorInt,

                    image: {
                        url:
                            "attachment://donation.png"
                    },

                    footer: {
                        text:
                            `Donated on • ${formattedDate}`
                    }
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

        const discordResponse =
            await fetch(
                DISCORD_WEBHOOK_URL,
                {
                    method: "POST",
                    body: form
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
