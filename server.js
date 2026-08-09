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

    // ==========================================
    // AVATARS
    // ==========================================

    const donatorPng = await sharp(donatorAvatar)
        .resize(280, 280)
        .png()
        .toBuffer();

    const raiserPng = await sharp(raiserAvatar)
        .resize(280, 280)
        .png()
        .toBuffer();

    const donatorBase64 =
        donatorPng.toString("base64");

    const raiserBase64 =
        raiserPng.toString("base64");

    const formattedAmount =
        Number(amount).toLocaleString("en-US");


    // ==========================================
    // EXACT REFERENCE SIZE
    // ==========================================

    const WIDTH = 2048;
    const HEIGHT = 514;


    // ==========================================
    // SVG
    // ==========================================

    const svg = `
<svg
    width="${WIDTH}"
    height="${HEIGHT}"
    viewBox="0 0 ${WIDTH} ${HEIGHT}"
    xmlns="http://www.w3.org/2000/svg"
>

    <defs>

        <!-- ================================= -->
        <!-- BACKGROUND -->
        <!-- ================================= -->

        <linearGradient
            id="redBackground"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
        >
            <stop offset="0%" stop-color="#ff0000"/>
            <stop offset="48%" stop-color="#fc0505"/>
            <stop offset="100%" stop-color="#fc0505"/>
        </linearGradient>


        <!-- ================================= -->
        <!-- HORIZONTAL BACKGROUND LINES -->
        <!-- ================================= -->

        <pattern
            id="backgroundLines"
            width="2048"
            height="10"
            patternUnits="userSpaceOnUse"
        >
            <rect
                width="2048"
                height="2"
                fill="#ff1717"
                opacity="0.45"
            />

            <rect
                y="5"
                width="2048"
                height="1"
                fill="#c90000"
                opacity="0.28"
            />
        </pattern>


        <!-- ================================= -->
        <!-- AVATAR CLIPS -->
        <!-- ================================= -->

        <clipPath id="leftAvatarClip">
            <circle
                cx="392"
                cy="202"
                r="116"
            />
        </clipPath>

        <clipPath id="rightAvatarClip">
            <circle
                cx="1660"
                cy="202"
                r="116"
            />
        </clipPath>


        <!-- ================================= -->
        <!-- SOFT CIRCLE GLOW -->
        <!-- ================================= -->

        <filter
            id="circleGlow"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
        >
            <feGaussianBlur
                stdDeviation="9"
            />
        </filter>

    </defs>


    <!-- ====================================== -->
    <!-- RED BACKGROUND -->
    <!-- ====================================== -->

    <rect
        x="0"
        y="42"
        width="2048"
        height="472"
        fill="url(#redBackground)"
    />

    <rect
        x="0"
        y="42"
        width="2048"
        height="472"
        fill="url(#backgroundLines)"
    />


    <!-- ====================================== -->
    <!-- BLACK TOP BORDER -->
    <!-- ====================================== -->

    <rect
        x="0"
        y="0"
        width="2048"
        height="42"
        fill="#000000"
    />


    <!-- ====================================== -->
    <!-- SUBTLE RED LINE BELOW BORDER -->
    <!-- ====================================== -->

    <rect
        x="0"
        y="42"
        width="2048"
        height="3"
        fill="#e00000"
    />


    <!-- ====================================== -->
    <!-- LEFT CIRCLE OUTER BORDER -->
    <!-- ====================================== -->

    <circle
        cx="392"
        cy="202"
        r="138"
        fill="none"
        stroke="#ff1010"
        stroke-width="10"
        opacity="0.35"
    />

    <circle
        cx="392"
        cy="202"
        r="120"
        fill="#ff0000"
        stroke="#ff1010"
        stroke-width="5"
    />


    <!-- ====================================== -->
    <!-- LEFT AVATAR -->
    <!-- ====================================== -->

    <image
        href="data:image/png;base64,${donatorBase64}"
        x="276"
        y="86"
        width="232"
        height="232"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#leftAvatarClip)"
    />


    <!-- ====================================== -->
    <!-- LEFT INNER CIRCLE -->
    <!-- ====================================== -->

    <circle
        cx="392"
        cy="202"
        r="117"
        fill="none"
        stroke="#ff1010"
        stroke-width="4"
        opacity="0.8"
    />


    <!-- ====================================== -->
    <!-- RIGHT CIRCLE OUTER BORDER -->
    <!-- ====================================== -->

    <circle
        cx="1660"
        cy="202"
        r="138"
        fill="none"
        stroke="#ff1010"
        stroke-width="10"
        opacity="0.35"
    />

    <circle
        cx="1660"
        cy="202"
        r="120"
        fill="#ff0000"
        stroke="#ff1010"
        stroke-width="5"
    />


    <!-- ====================================== -->
    <!-- RIGHT AVATAR -->
    <!-- ====================================== -->

    <image
        href="data:image/png;base64,${raiserBase64}"
        x="1544"
        y="86"
        width="232"
        height="232"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#rightAvatarClip)"
    />


    <!-- ====================================== -->
    <!-- RIGHT INNER CIRCLE -->
    <!-- ====================================== -->

    <circle
        cx="1660"
        cy="202"
        r="117"
        fill="none"
        stroke="#ff1010"
        stroke-width="4"
        opacity="0.8"
    />


    <!-- ====================================== -->
    <!-- DONATION AMOUNT -->
    <!-- ====================================== -->

    <text
        x="1024"
        y="205"
        text-anchor="middle"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-size="118"
        font-weight="900"
        fill="#ff0000"
        stroke="#000000"
        stroke-width="8"
        stroke-linejoin="round"
        paint-order="stroke fill"
    >
        ${escapeXml(formattedAmount)}
    </text>


    <!-- ====================================== -->
    <!-- ROBUX ICON -->
    <!-- ====================================== -->

    <g
        transform="translate(560 90)"
        fill="#ff0000"
        stroke="#000000"
        stroke-width="8"
        stroke-linejoin="round"
    >

        <polygon
            points="
                45,0
                92,27
                92,82
                45,109
                0,82
                0,27
            "
        />

        <polygon
            points="
                45,15
                76,33
                76,73
                45,91
                15,73
                15,33
            fill="none"
        />

        <rect
            x="35"
            y="44"
            width="20"
            height="20"
            fill="#ff0000"
        />

    </g>


    <!-- ====================================== -->
    <!-- DONATED TO -->
    <!-- ====================================== -->

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


    <!-- ====================================== -->
    <!-- LEFT USERNAME -->
    <!-- ====================================== -->

    <text
        x="392"
        y="429"
        text-anchor="middle"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-size="54"
        font-weight="900"
        fill="#ffffff"
        stroke="#000000"
        stroke-width="8"
        stroke-linejoin="round"
        paint-order="stroke fill"
    >
        @${escapeXml(donatorName)}
    </text>


    <!-- ====================================== -->
    <!-- RIGHT USERNAME -->
    <!-- ====================================== -->

    <text
        x="1660"
        y="429"
        text-anchor="middle"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-size="54"
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


    // ==========================================
    // RENDER PNG
    // ==========================================

    return await sharp(
        Buffer.from(svg)
    )
        .png()
        .toBuffer();
}
