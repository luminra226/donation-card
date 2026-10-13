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
// accent   = ring / amount / icon colour
// gradient = optional background fade from the bottom
//            (bottom = colour at the very bottom edge,
//             start  = where the fade begins, 0 = top, 1 = bottom)

function getDonationTheme(amount) {

    // 100,000 - 999,999  (magenta, flat, no gradient)
    if (amount < 1_000_000) {
        return {
            accent: "#FF00F7",
            gradient: null
        };
    }

    // 1,000,000 - 9,999,999  (hot pink, short soft gradient)
    // Values measured from the reference screenshot.
    if (amount < 10_000_000) {
        return {
            accent: "#FF0088",
            gradient: {
                bottom: "#42092A",
                start: 0.75
            }
        };
    }

    // 10,000,000 - 99,999,999  (red, long strong gradient)
    // Values measured from the reference screenshot.
    if (amount < 100_000_000) {
        return {
            accent: "#FF0000",
            gradient: {
                bottom: "#9B0806",
                start: 0.20
            }
        };
    }

    // 100,000,000+  (cyan, same style as the red tier)
    return {
        accent: "#00FFFF",
        gradient: {
            bottom: "#069B9B",
            start: 0.20
        }
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
    // LAYOUT
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

    // Robux icon box (pointy-top hexagon). Measured from the
    // reference: it is the same height as the digits (slightly
    // taller), starts level with the top of the digits and sits
    // right next to the number.
    const iconW = 92;
    const iconH = 98;
    const iconGap = 15;

    const amountFontSize = 112;
    const amountBaselineY = 188;

    // Digit height of the font (~0.716 of the font size for Arial-like fonts)
    const digitHeight = Math.round(amountFontSize * 0.716);
    const digitTopY = amountBaselineY - digitHeight;

    // Icon top is level with the top of the digits (2px higher, like the reference)
    const iconY = digitTopY - 2;

    // Measure the REAL width of the rendered amount text (works with
    // whatever font the server ends up using) instead of guessing.
    const amountInk =
        await measureInk(
            formattedAmount,
            amountFontSize
        );

    const totalAmountWidth =
        iconW +
        iconGap +
        amountInk.width;

    const amountGroupCenterX =
        WIDTH / 2;

    // Left edge of the whole [icon + number] group, centered on the card
    const amountStartX =
        amountGroupCenterX -
        (totalAmountWidth / 2);

    const iconX =
        amountStartX;

    // Left edge of the first digit's ink
    const amountInkX =
        amountStartX +
        iconW +
        iconGap;

    // text-anchor="start" origin, corrected for the glyph's left bearing
    const amountX =
        amountInkX -
        amountInk.inkLeft;

    // ==================================================
    // ROBUX ICON GEOMETRY
    // ==================================================
    // Layers (like the reference): thin outer hexagon ring,
    // small dark gap, solid inner hexagon, square hole in the middle.

    const hex = (cx, cy, w, h) => [
        [cx, cy - h / 2],
        [cx + w / 2, cy - h / 4],
        [cx + w / 2, cy + h / 4],
        [cx, cy + h / 2],
        [cx - w / 2, cy + h / 4],
        [cx - w / 2, cy - h / 4]
    ].map(p => p.join(",")).join(" ");

    const iconCx = iconW / 2;
    const iconCy = iconH / 2;

    const ringStroke = 9;
    const innerStroke = 9;

    const iconRingPoints =
        hex(
            iconCx,
            iconCy,
            iconW - ringStroke,
            iconH - ringStroke
        );

    const iconInnerPoints =
        hex(iconCx, iconCy, 56, 60);

    const holeW = 22;
    const holeH = 26;

    // ==================================================
    // BACKGROUND GRADIENT (optional)
    // ==================================================

    const gradientDefs = theme.gradient
        ? `
        <linearGradient
            id="bgGradient"
            x1="0" y1="0"
            x2="0" y2="1"
        >
            <stop
                offset="${theme.gradient.start}"
                stop-color="${theme.gradient.bottom}"
                stop-opacity="0"
            />
            <stop
                offset="1"
                stop-color="${theme.gradient.bottom}"
                stop-opacity="1"
            />
        </linearGradient>`
        : "";

    const gradientRect = theme.gradient
        ? `
    <rect
        x="0"
        y="0"
        width="${WIDTH}"
        height="${HEIGHT}"
        fill="url(#bgGradient)"
    />`
        : "";

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

        <clipPath id="leftAvatarClip">
            <circle
                cx="${leftAvatarX}"
                cy="${avatarY}"
                r="${avatarRadius}"
            />
        </clipPath>

        <clipPath id="rightAvatarClip">
            <circle
                cx="${rightAvatarX}"
                cy="${avatarY}"
                r="${avatarRadius}"
            />
        </clipPath>
        ${gradientDefs}

    </defs>

    <!-- BACKGROUND GRADIENT -->
    ${gradientRect}

    <!-- LEFT AVATAR -->

    <image
        href="data:image/png;base64,${donatorBase64}"
        x="${leftAvatarX - avatarRadius}"
        y="${avatarY - avatarRadius}"
        width="${avatarSize}"
        height="${avatarSize}"
        preserveAspectRatio="xMidYMid meet"
        clip-path="url(#leftAvatarClip)"
    />

    <circle
        cx="${leftAvatarX}"
        cy="${avatarY}"
        r="${avatarRadius - 3}"
        fill="none"
        stroke="${theme.accent}"
        stroke-width="7"
    />

    <!-- RIGHT AVATAR -->

    <image
        href="data:image/png;base64,${raiserBase64}"
        x="${rightAvatarX - avatarRadius}"
        y="${avatarY - avatarRadius}"
        width="${avatarSize}"
        height="${avatarSize}"
        preserveAspectRatio="xMidYMid meet"
        clip-path="url(#rightAvatarClip)"
    />

    <circle
        cx="${rightAvatarX}"
        cy="${avatarY}"
        r="${avatarRadius - 3}"
        fill="none"
        stroke="${theme.accent}"
        stroke-width="7"
    />

    <!-- CENTER AMOUNT -->

    <g>

        <!-- ROBUX ICON -->

        <g
            transform="
                translate(
                    ${iconX},
                    95
                )
                scale(1.26)
            "
        >

            <path
                d="
                    M38 0
                    L68 17
                    Q75 21 75 28
                    L75 48
                    Q75 55 68 59
                    L38 76
                    L8 59
                    Q1 55 1 48
                    L1 28
                    Q1 21 8 17
                    Z
                "
                fill="${theme.accent}"
                stroke="#000000"
                stroke-width="5"
                stroke-linejoin="round"
            />

            <path
                d="
                    M38 15
                    L58 27
                    L58 49
                    L38 61
                    L18 49
                    L18 27
                    Z
                "
                fill="none"
                stroke="#000000"
                stroke-width="4"
                stroke-linejoin="round"
            />

            <rect
                x="31"
                y="31"
                width="14"
                height="14"
                fill="#000000"
            />

        </g>

        <!-- AMOUNT -->

        <text
            x="${amountX}"
            y="184"
            text-anchor="middle"
            font-family="Arial Black, Arial, Helvetica, sans-serif"
            font-size="${amountFontSize}"
            font-weight="900"
            fill="${theme.accent}"
        >
            ${escapeXml(formattedAmount)}
        </text>

    </g>

    <!-- DONATED TO -->

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

    <!-- LEFT USERNAME -->

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

    <!-- RIGHT USERNAME -->

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

        // VALIDATION

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

        // 100K MINIMUM

        if (amount < 100000) {
            return res.json({
                success: true,
                ignored: true
            });
        }

        // WEBHOOK CHECK

        if (!DISCORD_WEBHOOK_URL) {

            console.error(
                "DISCORD_WEBHOOK_URL is missing"
            );

            return res.status(500).json({
                success: false,
                error: "Webhook not configured"
            });
        }

        // CREATE CARD

        const card =
            await createDonationCard({
                donatorName: DonatorName,
                raiserName: RaiserName,
                amount: amount,
                donatorId: donatorId,
                raiserId: raiserId
            });

        // FORMAT DATE

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

        // DISCORD WEBHOOK

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
