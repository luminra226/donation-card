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

	// 100,000 - 999,999
	if (amount < 1_000_000) {
		return {
			accent: "#FF007F"
		};
	}

	// 1,000,000 - 9,999,999
	if (amount < 10_000_000) {
		return {
			accent: "#FF007F"
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

    const donatorPng = await sharp(donatorAvatar)
        .resize(200, 200)
        .png()
        .toBuffer();

    const raiserPng = await sharp(raiserAvatar)
        .resize(200, 200)
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
    // CENTER DONATION AMOUNT
    // ==================================================
    //
    // The two avatars are centered at:
    //
    // LEFT  = 280
    // RIGHT = 1120
    //
    // The exact middle is:
    //
    // (280 + 1120) / 2 = 700
    //
    // We calculate the width of the amount group so
    // the icon + amount are ALWAYS centered at 700.
    // ==================================================

    const approximateCharacterWidth = 48;

    const textWidth =
        formattedAmount.length *
        approximateCharacterWidth;

    const iconSize = 76;
    const iconGap = 24;

    const totalAmountWidth =
        iconSize +
        iconGap +
        textWidth;

    const amountStartX =
        700 -
        (totalAmountWidth / 2);

    const iconCenterX =
        amountStartX +
        (iconSize / 2);

    const amountTextCenterX =
        amountStartX +
        iconSize +
        iconGap +
        (textWidth / 2);

    // ==================================================
    // SVG
    // ==================================================

    const svg = `
<svg
    width="1400"
    height="560"
    viewBox="0 0 1400 560"
    xmlns="http://www.w3.org/2000/svg"
>

    <defs>

        <!-- ========================================== -->
        <!-- CIRCULAR AVATAR CLIPS -->
        <!-- ========================================== -->

        <clipPath id="leftAvatarClip">
            <circle
                cx="280"
                cy="220"
                r="100"
            />
        </clipPath>

        <clipPath id="rightAvatarClip">
            <circle
                cx="1120"
                cy="220"
                r="100"
            />
        </clipPath>

        <!-- ========================================== -->
        <!-- BOTTOM GLOW -->
        <!-- Transparent at the bottom -->
        <!-- ========================================== -->

        <linearGradient
            id="bottomGlow"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
        >
            <stop
                offset="0%"
                stop-color="${theme.accent}"
                stop-opacity="0"
            />

            <stop
                offset="45%"
                stop-color="${theme.accent}"
                stop-opacity="0.08"
            />

            <stop
                offset="100%"
                stop-color="${theme.accent}"
                stop-opacity="0"
            />
        </linearGradient>

        <!-- ========================================== -->
        <!-- SOFT AVATAR GLOW -->
        <!-- ========================================== -->

        <filter
            id="avatarGlow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
        >
            <feGaussianBlur
                stdDeviation="5"
                result="blur"
            />

            <feMerge>
                <feMergeNode
                    in="blur"
                />

                <feMergeNode
                    in="SourceGraphic"
                />
            </feMerge>
        </filter>

    </defs>

    <!-- ================================================= -->
    <!-- TRANSPARENT BACKGROUND -->
    <!-- ================================================= -->

    <!--
        NO BACKGROUND RECT HERE.
        The PNG will remain transparent.
    -->

    <!-- ================================================= -->
    <!-- SUBTLE BOTTOM GLOW -->
    <!-- ================================================= -->

    <rect
        x="0"
        y="280"
        width="1400"
        height="280"
        fill="url(#bottomGlow)"
    />

    <!-- ================================================= -->
    <!-- LEFT AVATAR -->
    <!-- ================================================= -->

    <image
        href="data:image/png;base64,${donatorBase64}"
        x="180"
        y="120"
        width="200"
        height="200"
        preserveAspectRatio="xMidYMid meet"
        clip-path="url(#leftAvatarClip)"
    />

    <!-- LEFT AVATAR OUTLINE -->

    <circle
        cx="280"
        cy="220"
        r="106"
        fill="none"
        stroke="${theme.accent}"
        stroke-width="12"
        filter="url(#avatarGlow)"
    />

    <!-- ================================================= -->
    <!-- RIGHT AVATAR -->
    <!-- ================================================= -->

    <image
        href="data:image/png;base64,${raiserBase64}"
        x="1020"
        y="120"
        width="200"
        height="200"
        preserveAspectRatio="xMidYMid meet"
        clip-path="url(#rightAvatarClip)"
    />

    <!-- RIGHT AVATAR OUTLINE -->

    <circle
        cx="1120"
        cy="220"
        r="106"
        fill="none"
        stroke="${theme.accent}"
        stroke-width="12"
        filter="url(#avatarGlow)"
    />

    <!-- ================================================= -->
    <!-- CENTER DONATION AMOUNT -->
    <!-- ALWAYS CENTERED AT X = 700 -->
    <!-- ================================================= -->

    <g>

        <!-- ============================================= -->
        <!-- ROBUX ICON -->
        <!-- ============================================= -->

        <g
            transform="
                translate(
                    ${iconCenterX - 38},
                    162
                )
            "
        >

            <!-- Outer diamond -->
            <path
                d="
                    M38 0
                    L72 18
                    L72 58
                    L38 76
                    L4 58
                    L4 18
                    Z
                "
                fill="${theme.accent}"
            />

            <!-- Inner Roblox-style cutout -->
            <path
                d="
                    M27 18
                    L51 12
                    L59 20
                    L51 58
                    L25 64
                    L17 56
                    Z
                "
                fill="#111214"
            />

            <!-- Inner highlight -->
            <path
                d="
                    M30 27
                    L45 23
                    L49 27
                    L44 49
                    L29 53
                    L25 49
                    Z
                "
                fill="${theme.accent}"
                opacity="0.95"
            />

        </g>

        <!-- ============================================= -->
        <!-- AMOUNT -->
        <!-- ============================================= -->

        <text
            x="${amountTextCenterX}"
            y="224"
            text-anchor="middle"
            font-family="Arial Black, Impact, sans-serif"
            font-size="78"
            font-weight="900"
            fill="${theme.accent}"
        >
            ${escapeXml(formattedAmount)}
        </text>

    </g>

    <!-- ================================================= -->
    <!-- DONATED TO -->
    <!-- ================================================= -->

    <text
        x="700"
        y="310"
        text-anchor="middle"
        font-family="Arial Black, Impact, sans-serif"
        font-size="52"
        font-weight="900"
        fill="#FFFFFF"
    >
        donated to
    </text>

    <!-- ================================================= -->
    <!-- LEFT USERNAME -->
    <!-- ================================================= -->

    <text
        x="280"
        y="385"
        text-anchor="middle"
        font-family="Arial Black, Impact, sans-serif"
        font-size="32"
        font-weight="900"
        fill="#FFFFFF"
    >
        @${escapeXml(donatorUsername)}
    </text>

    <!-- ================================================= -->
    <!-- RIGHT USERNAME -->
    <!-- ================================================= -->

    <text
        x="1120"
        y="385"
        text-anchor="middle"
        font-family="Arial Black, Impact, sans-serif"
        font-size="32"
        font-weight="900"
        fill="#FFFFFF"
    >
        @${escapeXml(raiserUsername)}
    </text>

</svg>
`;

    // ==================================================
    // RENDER PNG WITH TRANSPARENCY
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
				raiserId: RaiserId
			});

		// ==============================================
		// FORMAT DATE
		// ==============================================

		const now = new Date();
		const formattedDate = now.toLocaleString("en-US", {
			month: "numeric",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true
		});

		const theme = getDonationTheme(amount);
		const hexColorInt = parseInt(theme.accent.replace("#", ""), 16);

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
						url: "attachment://donation.png"
					},

					footer: {
						text: `Donated on • ${formattedDate}`
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
