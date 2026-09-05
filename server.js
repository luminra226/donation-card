const express = require("express");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const axios = require("axios");
const FormData = require("form-data");

const app = express();

app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 10000;

// Discord webhook is stored in Render Environment Variables
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// ============================================================
// ROBLOX AVATAR
// ============================================================

async function getRobloxAvatarUrl(userId) {
    try {
        const url =
            `https://thumbnails.roblox.com/v1/users/avatar-headshot` +
            `?userIds=${encodeURIComponent(userId)}` +
            `&size=150x150` +
            `&format=Png` +
            `&isCircular=false`;

        const res = await axios.get(url);

        if (
            !res.data ||
            !res.data.data ||
            !res.data.data[0] ||
            !res.data.data[0].imageUrl
        ) {
            throw new Error("Roblox avatar not found");
        }

        return res.data.data[0].imageUrl;

    } catch (error) {
        console.error(
            "[AVATAR] Failed to get avatar:",
            error.message
        );

        return null;
    }
}

// ============================================================
// DONATION COLORS
// ============================================================

function getColorHex(amount) {

    if (amount >= 1000000) {
        return "#00ffff";
    }

    if (amount >= 100000) {
        return "#ff007f";
    }

    if (amount >= 10000) {
        return "#ffaa00";
    }

    if (amount >= 1000) {
        return "#aa00ff";
    }

    return "#ff007f";
}

// ============================================================
// TEXT
// ============================================================

function drawVectorText(
    ctx,
    text,
    x,
    y,
    size,
    color,
    align = "center"
) {

    ctx.save();

    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    ctx.font = `bold ${size}px sans-serif`;

    ctx.textAlign = align;
    ctx.textBaseline = "middle";

    ctx.fillText(text, x, y);

    ctx.restore();
}

// ============================================================
// CLEAN USERNAME
// ============================================================

function cleanUsername(name) {
    return String(name || "Unknown").replace(/^@+/, "");
}

// ============================================================
// DRAW AVATAR
// ============================================================

async function drawAvatar(
    ctx,
    url,
    x,
    y,
    radius,
    themeColor
) {

    if (!url) {
        return;
    }

    try {

        const response = await axios.get(
            url,
            {
                responseType: "arraybuffer",
                timeout: 10000
            }
        );

        const img = await loadImage(
            Buffer.from(response.data)
        );

        // Outline
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 5;

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            radius + 3,
            0,
            Math.PI * 2
        );

        ctx.stroke();

        // Circular avatar
        ctx.save();

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            radius,
            0,
            Math.PI * 2
        );

        ctx.clip();

        ctx.drawImage(
            img,
            x - radius,
            y - radius,
            radius * 2,
            radius * 2
        );

        ctx.restore();

    } catch (error) {

        console.error(
            "[AVATAR] Image load error:",
            error.message
        );
    }
}

// ============================================================
// USERNAME BADGE
// ============================================================

function drawUsernameBadge(
    ctx,
    username,
    x,
    y
) {

    const userText =
        `@${cleanUsername(username)}`;

    const badgeWidth =
        (userText.length * 9) + 20;

    ctx.fillStyle =
        "rgba(0, 0, 0, 0.7)";

    ctx.beginPath();

    ctx.roundRect(
        x - (badgeWidth / 2),
        y - 12,
        badgeWidth,
        24,
        6
    );

    ctx.fill();

    drawVectorText(
        ctx,
        userText,
        x,
        y,
        14,
        "#FFFFFF",
        "center"
    );
}

// ============================================================
// CREATE DONATION IMAGE
// ============================================================

async function createDonationImage({
    donatorId,
    donatorUser,
    raiserId,
    raiserUser,
    amount
}) {

    const themeColor =
        getColorHex(amount);

    const donatorAvatarUrl =
        await getRobloxAvatarUrl(donatorId);

    const raiserAvatarUrl =
        await getRobloxAvatarUrl(raiserId);

    // Canvas
    const canvas =
        createCanvas(700, 280);

    const ctx =
        canvas.getContext("2d");

    // ========================================================
    // BACKGROUND
    // ========================================================

    ctx.fillStyle = "#111214";

    ctx.beginPath();

    ctx.roundRect(
        0,
        0,
        700,
        280,
        16
    );

    ctx.fill();

    // ========================================================
    // BOTTOM COLOR FADE
    // ========================================================

    const gradient =
        ctx.createLinearGradient(
            0,
            140,
            0,
            280
        );

    gradient.addColorStop(
        0,
        "rgba(0, 0, 0, 0)"
    );

    gradient.addColorStop(
        1,
        `${themeColor}40`
    );

    ctx.fillStyle = gradient;

    ctx.beginPath();

    ctx.roundRect(
        0,
        140,
        700,
        140,
        [0, 0, 16, 16]
    );

    ctx.fill();

    // ========================================================
    // AVATARS
    // ========================================================

    await drawAvatar(
        ctx,
        donatorAvatarUrl,
        140,
        105,
        50,
        themeColor
    );

    await drawAvatar(
        ctx,
        raiserAvatarUrl,
        560,
        105,
        50,
        themeColor
    );

    // ========================================================
    // AMOUNT
    // ========================================================

    const formattedAmount =
        Number(amount).toLocaleString("en-US");

    const totalWidth =
        (formattedAmount.length * 20) + 40;

    const startX =
        350 - (totalWidth / 2);

    // Robux circle
    const iconCenterX =
        startX + 14;

    const iconCenterY =
        95;

    ctx.fillStyle =
        themeColor;

    ctx.beginPath();

    ctx.arc(
        iconCenterX,
        iconCenterY,
        15,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Inner square
    ctx.fillStyle =
        "#111214";

    ctx.beginPath();

    ctx.roundRect(
        iconCenterX - 5,
        iconCenterY - 5,
        10,
        10,
        2
    );

    ctx.fill();

    // Amount
    drawVectorText(
        ctx,
        formattedAmount,
        startX + 40,
        95,
        34,
        themeColor,
        "left"
    );

    // ========================================================
    // DONATED TO
    // ========================================================

    drawVectorText(
        ctx,
        "donated to",
        350,
        142,
        22,
        "#FFFFFF",
        "center"
    );

    // ========================================================
    // USERNAME BADGES
    // ========================================================

    drawUsernameBadge(
        ctx,
        donatorUser,
        140,
        185
    );

    drawUsernameBadge(
        ctx,
        raiserUser,
        560,
        185
    );

    return canvas.toBuffer("image/png");
}

// ============================================================
// HOME / HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {

    res.status(200).send(
        "Roblox Donation API is online."
    );

});

// ============================================================
// DONATION
// ============================================================

app.post("/donation", async (req, res) => {

    console.log(
        "[DONATION] Request received"
    );

    try {

        // ====================================================
        // ACCEPT BOTH PAYLOAD FORMATS
        // ====================================================

        const body = req.body || {};

        const donatorId =
            Number(
                body.DonatorId ??
                body.donatorId
            );

        const raiserId =
            Number(
                body.RaiserId ??
                body.raiserId
            );

        const donatorUser =
            cleanUsername(
                body.DonatorName ??
                body.donatorUser
            );

        const raiserUser =
            cleanUsername(
                body.RaiserName ??
                body.raiserUser
            );

        const amount =
            Number(
                body.Amount ??
                body.amount
            );

        // ====================================================
        // VALIDATION
        // ====================================================

        if (
            !Number.isInteger(donatorId) ||
            !Number.isInteger(raiserId) ||
            !donatorUser ||
            !raiserUser ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            console.log(
                "[DONATION] Invalid request:",
                body
            );

            return res.status(400).json({
                success: false,
                error: "Invalid donation data"
            });

        }

        // ====================================================
        // WEBHOOK CHECK
        // ====================================================

        if (!DISCORD_WEBHOOK_URL) {

            console.error(
                "[DONATION] DISCORD_WEBHOOK_URL is missing"
            );

            return res.status(500).json({
                success: false,
                error: "Discord webhook is not configured"
            });

        }

        // ====================================================
        // OPTIONAL 100K FILTER
        // ====================================================

        if (amount < 100000) {

            console.log(
                `[DONATION] Ignored ${amount} Robux donation`
            );

            return res.json({
                success: true,
                ignored: true
            });

        }

        // ====================================================
        // CREATE IMAGE
        // ====================================================

        const imageBuffer =
            await createDonationImage({
                donatorId,
                donatorUser,
                raiserId,
                raiserUser,
                amount
            });

        // ====================================================
        // DATE
        // ====================================================

        const now =
            new Date();

        const formattedDate =
            now.toLocaleString(
                "en-US",
                {
                    month: "numeric",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true
                }
            );

        // ====================================================
        // DISCORD COLOR
        // ====================================================

        const themeColor =
            getColorHex(amount);

        const hexColorInt =
            parseInt(
                themeColor.replace("#", ""),
                16
            );

        // ====================================================
        // DISCORD FORM
        // ====================================================

        const form =
            new FormData();

        form.append(
            "files[0]",
            imageBuffer,
            {
                filename: "donation.png",
                contentType: "image/png"
            }
        );

        form.append(
            "payload_json",
            JSON.stringify({

                username:
                    "Donation Logs",

                content:
                    `\`@${donatorUser}\` donated ` +
                    `**${amount.toLocaleString("en-US")} Robux** ` +
                    `to \`@${raiserUser}\``,

                embeds: [

                    {
                        image: {
                            url:
                                "attachment://donation.png"
                        },

                        color:
                            hexColorInt,

                        footer: {
                            text:
                                `Donated on • ${formattedDate}`
                        }
                    }

                ],

                allowed_mentions: {
                    parse: []
                }

            })
        );

        // ====================================================
        // SEND TO DISCORD
        // ====================================================

        const discordResponse =
            await axios.post(
                DISCORD_WEBHOOK_URL,
                form,
                {
                    headers:
                        form.getHeaders(),

                    timeout:
                        15000
                }
            );

        console.log(
            `[DONATION] ${donatorUser} donated ` +
            `${amount.toLocaleString()} Robux ` +
            `to ${raiserUser}`
        );

        return res.status(200).json({
            success: true
        });

    } catch (error) {

        console.error(
            "[DONATION] ERROR:",
            error?.response?.data ||
            error.message
        );

        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });

    }

});

// ============================================================
// START SERVER
// ============================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Roblox Donation API running on port ${PORT}`
        );

    }
);
