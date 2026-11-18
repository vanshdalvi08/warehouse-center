import React from "react";

// Decorative vector scene: all operational UI remains in the foreground.
export function WarehouseBackdrop() {
  return (
    <div className="warehouse-backdrop" aria-hidden="true">
      <svg
        viewBox="0 0 1600 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <linearGradient
            id="warehouse-floor"
            x1="800"
            y1="470"
            x2="800"
            y2="1000"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#f3f5f5" />
            <stop offset="1" stopColor="#e8ecec" />
          </linearGradient>
          <radialGradient
            id="warehouse-quiet"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(800 470) scale(510 540)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".18" stopColor="#f7f8f8" stopOpacity=".95" />
            <stop offset=".7" stopColor="#f7f8f8" stopOpacity=".7" />
            <stop offset="1" stopColor="#f7f8f8" stopOpacity="0" />
          </radialGradient>
          <g id="warehouse-box" strokeLinejoin="round" strokeWidth="1.2">
            <path d="M0 17 31 0 62 17 31 35Z" fill="#ebe4d9" stroke="#cfc8bc" />
            <path d="M0 17 31 35V69L0 51Z" fill="#dfd6c7" stroke="#cfc8bc" />
            <path d="M31 35 62 17V51L31 69Z" fill="#d4cbbb" stroke="#c5bcae" />
            <path d="m15 9 31 17v16l-9 5V31L7 14" fill="#eee9df" opacity=".7" />
            <path d="m7 38 12 7m-12-1 12 7" stroke="#b3aa9b" />
          </g>
          <g id="warehouse-rack" strokeLinejoin="round">
            <path
              d="m0 95 66-38h410v438l-66 38H0Z"
              fill="#edf0ef"
              opacity=".8"
            />
            <path
              d="m0 95 66-38h410M0 235l66-38h410M0 375l66-38h410M0 515l66-38h410"
              stroke="#cbd3d3"
              strokeWidth="2"
            />
            <path
              d="M66 57v420m205-420v420m205-420v420"
              stroke="#c3cecf"
              strokeWidth="4"
            />
            <path
              d="m73 69 191 395M264 69 73 464m205-395 191 395M469 69 278 464"
              stroke="#d1d9d9"
              strokeWidth="1.5"
            />
            <g opacity=".92">
              <use
                href="#warehouse-box"
                transform="translate(19 162) scale(1.05)"
              />
              <use
                href="#warehouse-box"
                transform="translate(87 122) scale(1.05)"
              />
              <use
                href="#warehouse-box"
                transform="translate(109 162) scale(1.05)"
              />
              <use
                href="#warehouse-box"
                transform="translate(236 165) scale(1)"
              />
              <use
                href="#warehouse-box"
                transform="translate(308 123) scale(1)"
              />
              <use
                href="#warehouse-box"
                transform="translate(326 166) scale(1)"
              />
              <use
                href="#warehouse-box"
                transform="translate(24 306) scale(.98)"
              />
              <use
                href="#warehouse-box"
                transform="translate(93 266) scale(.98)"
              />
              <use
                href="#warehouse-box"
                transform="translate(109 305) scale(.98)"
              />
              <use
                href="#warehouse-box"
                transform="translate(235 302) scale(1.05)"
              />
              <use
                href="#warehouse-box"
                transform="translate(308 261) scale(1.05)"
              />
              <use
                href="#warehouse-box"
                transform="translate(329 303) scale(1.05)"
              />
              <use
                href="#warehouse-box"
                transform="translate(29 444) scale(1)"
              />
              <use
                href="#warehouse-box"
                transform="translate(111 442) scale(1)"
              />
              <use
                href="#warehouse-box"
                transform="translate(243 446) scale(.94)"
              />
              <use
                href="#warehouse-box"
                transform="translate(313 405) scale(.94)"
              />
              <use
                href="#warehouse-box"
                transform="translate(329 446) scale(.94)"
              />
            </g>
            <path
              d="M0 95v438m205-438v438m205-438v438"
              stroke="#aebec2"
              strokeWidth="6"
            />
            <path
              d="M0 95h410M0 235h410M0 375h410M0 515h410"
              stroke="#bbc8cb"
              strokeWidth="7"
            />
            <path
              d="m410 95 66-38m-66 178 66-38m-66 178 66-38m-66 178 66-38"
              stroke="#aebdc1"
              strokeWidth="4"
            />
            <path
              d="M-10 533h20m185 0h20m185 0h20"
              stroke="#b2bec1"
              strokeWidth="4"
            />
            <g fill="#e8eded" stroke="#c7d0d2">
              <rect x="6" y="237" width="30" height="10" rx="1" />
              <rect x="211" y="377" width="30" height="10" rx="1" />
            </g>
          </g>
        </defs>

        <path fill="#f3f5f5" d="M0 0h1600v1000H0z" />
        <path fill="url(#warehouse-floor)" d="M0 585 800 438l800 147v415H0Z" />

        {/* Roof trusses and aisle lines establish space without a busy texture. */}
        <g stroke="#dce3e3" strokeWidth="1.3">
          <path d="M-70 168 800 305l870-137M-70 36l870 203L1670 36" />
          <path d="M135 0v171m247-171v210m837-210v210m247-210v171M0 277l800 88 800-88" />
          <path d="M0 632 800 438l800 194M0 788l800-350 800 350M0 983l800-545 800 545" />
          <path d="m800 438-392 562m392-562 392 562M0 858h1600M0 686h1600" />
        </g>
        <g opacity=".68">
          <use href="#warehouse-rack" transform="translate(-65 115)" />
          <use href="#warehouse-rack" transform="translate(1185 115)" />
          <use
            href="#warehouse-rack"
            transform="translate(354 236) scale(.49)"
            opacity=".55"
          />
          <use
            href="#warehouse-rack"
            transform="translate(1010 236) scale(.49)"
            opacity=".55"
          />
        </g>

        {/* A loaded forklift at the near end of the receiving aisle. */}
        <g
          transform="translate(150 720)"
          stroke="#aebbbe"
          strokeLinejoin="round"
          opacity=".72"
        >
          <ellipse
            cx="111"
            cy="121"
            rx="127"
            ry="15"
            fill="#d9e0e0"
            stroke="none"
            opacity=".55"
          />
          <path d="m-3 52 46-16 74 19v55L40 123-3 103Z" fill="#cbd5d7" />
          <path d="m43 36 74 19-43 19L-3 52Z" fill="#dde4e4" />
          <path
            d="M43 74v49m31-49v49M44 36V-37h65v89M44-37 24-29v69m20-77 21 9h63l-19-9m19 9v80"
            strokeWidth="3"
          />
          <path d="m83 43 15-15m-7 18 14-14" strokeWidth="2" />
          <path
            d="m116 111 40-13V-14m7 111V-18m-7 116 69 18m-62-19 69 18"
            strokeWidth="4"
          />
          <path d="m146-14 25-8v126l-25 8Z" fill="#b6c3c7" />
          <ellipse
            cx="19"
            cy="107"
            rx="15"
            ry="20"
            fill="#96a7ad"
            stroke="none"
          />
          <ellipse
            cx="91"
            cy="112"
            rx="15"
            ry="20"
            fill="#96a7ad"
            stroke="none"
          />
          <ellipse
            cx="19"
            cy="107"
            rx="7"
            ry="10"
            fill="#dce3e4"
            stroke="none"
          />
          <ellipse
            cx="91"
            cy="112"
            rx="7"
            ry="10"
            fill="#dce3e4"
            stroke="none"
          />
          <circle cx="78" cy="0" r="10" fill="#a6b6bc" stroke="none" />
          <path
            d="m73 12-5 28 23 8m-16-30 16 12 15-5"
            stroke="#a6b6bc"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <use href="#warehouse-box" transform="translate(170 33) scale(.95)" />
          <use href="#warehouse-box" transform="translate(195 17) scale(.95)" />
        </g>

        {/* Packing bench and an operator checking a carton. */}
        <g
          transform="translate(1295 730)"
          opacity=".65"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <ellipse
            cx="29"
            cy="117"
            rx="119"
            ry="13"
            fill="#d9e0e0"
            opacity=".6"
          />
          <path
            d="m-15 44 82-24 83 26-82 28Z"
            fill="#d4dedf"
            stroke="#b8c6ca"
          />
          <path
            d="M-15 44v67m83-37v45m82-73v60"
            stroke="#b2c1c6"
            strokeWidth="5"
          />
          <use href="#warehouse-box" transform="translate(28 -2) scale(.66)" />
          <circle cx="-48" cy="3" r="10" fill="#acb9bf" />
          <path
            d="m-49 19 5 37-9 49m10-49 13 45m-15-77 18 21 32-4"
            stroke="#b4c2c7"
            strokeWidth="11"
          />
          <path d="m1 38 10-4 2 13-10 3Z" fill="#94a8b0" />
          <path d="m-67 109 18 1m16-6 16 2" stroke="#9cabb1" strokeWidth="5" />
        </g>
        <path
          d="M682 1000 756 617m162 383-74-383"
          stroke="#d2dbdc"
          strokeWidth="2"
          strokeDasharray="13 22"
        />
        <path fill="url(#warehouse-quiet)" d="M0 0h1600v1000H0z" />
        <path fill="#f8f9fa" fillOpacity=".22" d="M0 0h1600v1000H0z" />
      </svg>
    </div>
  );
}
