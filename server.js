const express = require("express");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const axios = require("axios");
const FormData = require("form-data");

const app = express();

app.use(express.json({ limit: "1mb" }));

// Render provides PORT automatically
const PORT = process.env.PORT || 10000;

// Discord webhook stored securely in Render Environment Variables
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// ============================================================
// GET ROBLOX HEADSHOT
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

        return res.data.data[0].imageUrl;

    } catch (e) {

        console.error(
            "[ROBLOX AVATAR ERROR]",
            e.message
        );

        return "https://tr.rbxcdn.com/30day-avatar-headshot";
    }
}

// ============================================================
// COLOR TIERS
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
// VECTOR TEXT
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

    ctx.font =
        `bold ${size}px sans-serif, Arial, Helvetica`;

    ctx.textAlign = align;
    ctx.textBaseline = "middle";

    ctx.fillText(text, x, y);

    ctx.restore();
}

// ============================================================
// DONATION ENDPOINT
// ============================================================

app.post("/donation", async (req, res) => {

    try {

        // ====================================================
        // SUPPORT YOUR EXISTING ROBLOX PAYLOAD
        // ====================================================

        const {
            donatorId,
            donatorUser,
            raiserId,
            raiserUser,
            amount
        } = req.body;

        // ====================================================
        // VALIDATION
        // ====================================================

        if (
            donatorId === undefined ||
            raiserId === undefined ||
            !donatorUser ||
            !raiserUser ||
            amount === undefined
        ) {

            console.log(
                "[DONATION] Missing donation data:",
                req.body
            );

            return res.status(400).json({
                success: false,
                error: "Missing donation data"
            });
        }

        const numDonatorId =
            Number(donatorId);

        const numRaiserId =
            Number(raiserId);

        const numAmount =
            Number(amount);

        if (
            !Number.isInteger(numDonatorId) ||
            !Number.isInteger(numRaiserId) ||
            !Number.isFinite(numAmount) ||
            numAmount <= 0
        ) {

            return res.status(400).json({
                success: false,
                error: "Invalid donation data"
            });
        }

        // ====================================================
        // CHECK DISCORD WEBHOOK
        // ====================================================

        if (!DISCORD_WEBHOOK_URL) {

            console.error(
                "[DONATION] DISCORD_WEBHOOK_URL is missing!"
            );

            return res.status(500).json({
                success: false,
                error:
                    "DISCORD_WEBHOOK_URL is not configured"
            });
        }

        // ====================================================
        // COLOR
        // ====================================================

        const themeColor =
            getColorHex(numAmount);

        const hexColorInt =
            parseInt(
                themeColor.replace("#", ""),
                16
            );

        // ====================================================
        // GET ROBLOX AVATARS
        // ====================================================

        const donatorAvatarUrl =
            await getRobloxAvatarUrl(
                numDonatorId
            );

        const raiserAvatarUrl =
            await getRobloxAvatarUrl(
                numRaiserId
            );

        // ====================================================
        // CANVAS SETUP
        // ====================================================

        const canvas =
            createCanvas(700, 280);

        const ctx =
            canvas.getContext("2d");

        // ====================================================
        // MAIN BACKGROUND CARD
        // ====================================================

        ctx.fillStyle =
            "#111214";

        ctx.beginPath();

        ctx.roundRect(
            0,
            0,
            700,
            280,
            16
        );

        ctx.fill();

        // ====================================================
        // BOTTOM COLOR FADE
        // ====================================================

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

        ctx.fillStyle =
            gradient;

        ctx.beginPath();

        ctx.roundRect(
            0,
            140,
            700,
            140,
            [0, 0, 16, 16]
        );

        ctx.fill();

        // ====================================================
        // DRAW AVATAR
        // ====================================================

        const drawAvatar =
            async (
                url,
                x,
                y,
                radius
            ) => {

                try {

                    const response =
                        await axios.get(
                            url,
                            {
                                responseType:
                                    "arraybuffer"
                            }
                        );

                    const img =
                        await loadImage(
                            Buffer.from(
                                response.data
                            )
                        );

                    // Avatar outline
                    ctx.strokeStyle =
                        themeColor;

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

                    // Circular clipping
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

                } catch (e) {

                    console.error(
                        "[AVATAR LOAD ERROR]",
                        e.message
                    );
                }
            };

        // ====================================================
        // DRAW BOTH AVATARS
        // ====================================================

        await drawAvatar(
            donatorAvatarUrl,
            140,
            105,
            50
        );

        await drawAvatar(
            raiserAvatarUrl,
            560,
            105,
            50
        );

        // ====================================================
        // CENTER SECTION
        // ====================================================

        const formattedAmount =
            numAmount.toLocaleString();

        // Approximate width
        const totalWidth =
            (formattedAmount.length * 20) + 40;

        const startX =
            350 - (totalWidth / 2);

        // ====================================================
        // ROBUX ICON
        // ====================================================

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

        // Inner icon
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

        // ====================================================
        // DONATION AMOUNT
        // ====================================================

        drawVectorText(
            ctx,
            formattedAmount,
            startX + 40,
            95,
            34,
            themeColor,
            "left"
        );

        // ====================================================
        // DONATED TO
        // ====================================================

        drawVectorText(
            ctx,
            "donated to",
            350,
            142,
            22,
            "#FFFFFF",
            "center"
        );

        // ====================================================
        // USERNAME BADGES
        // ====================================================

        const drawUsernameBadge =
            (username, x, y) => {

                const userText =
                    `@${username}`;

                const badgeWidth =
                    (userText.length * 9) + 20;

                // Badge
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

                // Username
                drawVectorText(
                    ctx,
                    userText,
                    x,
                    y,
                    14,
                    "#FFFFFF",
                    "center"
                );
            };

        drawUsernameBadge(
            donatorUser || "Unknown",
            140,
            185
        );

        drawUsernameBadge(
            raiserUser || "Unknown",
            560,
            185
        );

        // ====================================================
        // CREATE PNG
        // ====================================================

        const imageBuffer =
            canvas.toBuffer("image/png");

        // ====================================================
        // DATE STAMP
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
        // DISCORD WEBHOOK
        // ====================================================

        const form =
            new FormData();

        form.append(
            "files[0]",
            imageBuffer,
            {
                filename:
                    "donation.png",

                contentType:
                    "image/png"
            }
        );

        form.append(
            "payload_json",
            JSON.stringify({

                content:
                    `\`@${donatorUser}\` donated ` +
                    `**${formattedAmount} Robux** ` +
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

                ]

            })
        );

        // ====================================================
        // SEND TO DISCORD
        // ====================================================

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

        // ====================================================
        // SUCCESS
        // ====================================================

        console.log(
            `[DONATION] ${donatorUser} donated ` +
            `${formattedAmount} Robux to ` +
            `${raiserUser}`
        );

        return res.status(200).json({
            success: true
        });

    } catch (error) {

        console.error(
            "[DONATION ERROR]",
            error?.response?.data ||
            error.message
        );

        return res.status(500).json({
            success: false,
            error:
                error?.response?.data ||
                error.message
        });
    }
});

// ============================================================
// HOME / HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {

    res.status(200).send(
        "Roblox Donation API is online."
    );

});

// ============================================================
// START RENDER SERVER
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
