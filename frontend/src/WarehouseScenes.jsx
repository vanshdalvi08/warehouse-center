import React from "react";

const blue = "#5476ef",
  pale = "#e6ecff",
  ink = "#28313f",
  line = "#cbd3e1";
function Canvas({ children }) {
  return (
    <svg
      viewBox="0 0 680 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke={ink}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}
function Box({ x, y, w = 90, h = 65, tinted = false }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={tinted ? pale : "#fff"} />
      <path
        d={`M${x + w * 0.5} ${y}v${h * 0.42}`}
        stroke={tinted ? "#b1bfe9" : ink}
      />
      <path d={`M${x + 12} ${y + h - 16}h18m-18 5h12`} stroke={line} />
    </g>
  );
}
function Barcode({ x, y }) {
  return (
    <g stroke={blue}>
      {[0, 4, 7, 13, 17, 20, 26, 30].map((dx, i) => (
        <path
          key={dx}
          d={`M${x + dx} ${y}v24`}
          strokeWidth={i % 3 === 0 ? 2.5 : 1}
        />
      ))}
    </g>
  );
}
export function ReceivingScene() {
  return (
    <Canvas>
      <g stroke={line}>
        <path d="M365 94h231v249H365zM365 176h231M365 258h231M442 94v249M519 94v249" />
        <path d="m365 94 25-20h231v249l-25 20m0-249 25-20m-25 102 25-20m-25 102 25-20" />
        <path d="m606 96 13 59m0-59-13 59m0 24 13 59m0-59-13 59" />
      </g>
      <g stroke="#bcc8df">
        <Box x={375} y={114} w={55} h={58} tinted />
        <Box x={453} y={109} w={55} h={63} />
        <Box x={529} y={125} w={55} h={47} tinted />
        <Box x={377} y={201} w={54} h={52} />
        <Box x={453} y={193} w={55} h={60} tinted />
      </g>
      <path d="M85 373h526" stroke={line} />
      <path
        d="M150 343c-7-57-17-124 5-156 17-25 46-33 77-29 25 3 46 22 54 49l21 96-28 42Z"
        fill="#fff"
      />
      <path
        d="m166 171 30-11 11 95-23 63-30-1c-6-36-16-82-11-111 3-17 10-27 23-35Z"
        fill={blue}
        stroke="none"
      />
      <path d="m238 168 18 10 22 106-24 18-11-69Z" fill={blue} stroke="none" />
      <path d="m205 142-3 22c4 13 23 18 30 3l-5-25" fill="#fff" />
      <path
        d="M201 109c-11-19-4-41 14-44 25-5 48 13 39 38l-12 27-34 1Z"
        fill={ink}
      />
      <path
        d="M204 98c-8-7-16 3-9 12l9 7c3 19 11 29 24 27 16-3 25-22 24-45l-29-13Z"
        fill="#fff"
      />
      <path
        d="M196 89c1-25 13-41 34-39 22 2 32 21 31 43l-33-3Z"
        fill={blue}
        stroke="none"
      />
      <path d="m192 91 83 6" stroke={blue} strokeWidth="3" />
      <path
        d="m153 213 10 71 56 22 53-64 22 20-56 75c-7 9-18 10-30 6l-59-23c-15-7-20-20-21-38l-3-53"
        fill="#fff"
      />
      <path d="m247 290 37-90h89l-39 94Z" fill={ink} />
      <path
        d="m241 304 22-31c4-6 10-8 15-7l22 4c6 1 7 6 1 8l-16-1 18 10c6 4 5 9-1 9l-24-9-8 18c-4 8-13 10-29-1Z"
        fill="#fff"
      />
      <path
        d="m271 199 53-24 21-25c4-5 10-3 8 3l-9 17 28-9c7-2 10 3 4 7l-17 8 17-3c7-1 8 5 1 7l-24 6-16 15-46 24"
        fill="#fff"
      />
      <g className="scene-scan">
        <path d="M329 138h36m-18-17v34" stroke="#b3c3fa" />
        <circle cx="329" cy="138" r="3" fill={blue} stroke="none" />
      </g>
      <Box x={413} y={269} w={110} h={91} />
      <Barcode x={453} y={315} />
      <Box x={530} y={302} w={66} h={58} tinted />
      <path d="M404 365h199v8H404z" fill="#f2f4f8" stroke={line} />
      <path d="M416 373v7m83-7v7m92-7v7" stroke={line} strokeWidth="4" />
      <path d="M91 114h59m-59 10h39" stroke={line} />
      <path d="M465 49h65m-65 9h38" stroke="#d8e0f5" />
    </Canvas>
  );
}
export function StorageScene() {
  return (
    <Canvas>
      <g stroke={line}>
        <path d="M85 145h126v184H85zM85 212h126M85 278h126M148 145v184" />
        <path d="M482 104h130v229H482zM482 179h130M482 254h130M547 104v229" />
      </g>
      <path
        d="M102 156h31v51h-31zM159 168h39v39h-39zM495 116h41v57h-41zM558 132h41v41h-41z"
        fill={pale}
        stroke="#cbd7f6"
      />
      <path
        d="M102 286h31v37h-31zM558 265h41v62h-41z"
        fill="#fff"
        stroke={line}
      />
      <path
        d="M159 300c-2-49 5-114 24-133 24-23 60-25 86 0 23 23 25 69 25 114l-37 29Z"
        fill={blue}
        stroke="none"
      />
      <path d="m211 141-4 19c3 13 21 18 29 5l-3-24" fill="#fff" />
      <path d="M207 105c-15-6-15-22-4-28 13-6 22 1 28 12l-2 21Z" fill={ink} />
      <path
        d="M211 93c-6-5-14 3-9 11l8 7c1 21 12 36 26 31 13-5 19-21 16-43l-25-13Z"
        fill="#fff"
      />
      <path
        d="M205 88c0-24 11-40 32-37 21 2 28 21 27 43Z"
        fill={blue}
        stroke="none"
      />
      <path d="m200 91 75 7" stroke={blue} strokeWidth="3" />
      <path
        d="m190 207-4 45 62 28 29-17 14 16-30 25c-7 5-14 7-24 4l-69-21c-12-4-17-14-17-28l4-45"
        fill="#fff"
      />
      <path
        d="M425 273c-3-59 0-105 24-120 24-16 49-7 65 15l32 101Z"
        fill={blue}
        stroke="none"
      />
      <path d="m461 133-1 20c5 12 23 14 29 1l-7-23" fill="#fff" />
      <path
        d="M463 103c-16-14-13-37 6-42 23-6 41 9 36 29l-10 25-28 9Z"
        fill={ink}
      />
      <path
        d="M463 93c-9-5-16 5-9 14l7 7c1 17 12 31 26 26 14-4 19-21 16-42l-26-12Z"
        fill="#fff"
      />
      <path
        d="M461 83c-4-26 11-43 31-38 16 4 27 21 24 43Z"
        fill={blue}
        stroke="none"
      />
      <path d="m454 85 72 8" stroke={blue} strokeWidth="3" />
      <path
        d="m450 163-43-15-20-49c-2-6-8-6-9 1l4 29-17-22c-4-5-9-2-6 4l13 27-18-14c-5-4-9 0-4 5l24 25 18 25 45 17"
        fill="#fff"
      />
      <path
        d="m508 194-20 51-65 10 2 25 78-2c13-2 20-8 25-21l15-39"
        fill="#fff"
      />
      <g className="scene-parcel">
        <Box x={279} y={218} w={132} h={104} />
        <path d="M328 218h30v35h-30z" fill={pale} stroke="none" />
      </g>
      <path
        d="m264 268 16-12c5-4 13-3 19-1l23 10c5 3 4 7-2 7l-19-4 18 12c5 4 3 9-3 7l-26-11-9 10"
        fill="#fff"
      />
      <path
        d="m430 258-18-5-18 6c-6 2-6 7 1 7h12l-13 9c-5 4-3 8 3 6l26-8 8 7"
        fill="#fff"
      />
      <path d="M200 330h283v16H200z" fill="#fff" />
      {[219, 257, 295, 333, 371, 409, 447, 478].map((x) => (
        <circle key={x} cx={x} cy="338" r="4" fill="#edf1fc" stroke={line} />
      ))}
      <path d="M226 346v28m232-28v28M208 375h269" stroke={line} />
      <path d="M76 381h540" stroke={line} />
      <path d="M319 95h58m-58 10h35M556 65h33" stroke="#d5dff8" />
    </Canvas>
  );
}
export function DispatchScene() {
  return (
    <Canvas>
      <path d="M457 94h155v133H457z" fill={pale} stroke="none" />
      <path
        d="M470 180h45v34m-10-107v45h91m-36 0v62m-90-84h20m-20 68h32m83-91v28"
        stroke="#fff"
        strokeWidth="2.5"
      />
      <g className="scene-pin">
        <path
          d="M540 91c0-17 13-30 30-30s30 13 30 30c0 23-30 51-30 51s-30-28-30-51Z"
          fill={blue}
          stroke="none"
        />
        <circle cx="570" cy="91" r="11" fill="#fff" stroke="none" />
      </g>
      <path
        d="M115 300c-7-56-8-110 17-135 24-25 65-25 89-5 24 20 24 75 21 113l-41 31Z"
        fill="#fff"
      />
      <path
        d="m142 159 22-7 4 137-27 13-27-4c-4-44-9-98 9-123 5-7 11-12 19-16Zm54-1 17 9 18 113-24 13Z"
        fill={blue}
        stroke="none"
      />
      <path d="m165 136-2 20c3 11 22 18 28 3l-5-25" fill="#fff" />
      <path d="M166 100c-16-8-17-25-4-33 14-9 33 0 40 16l-12 27Z" fill={ink} />
      <path
        d="M164 93c-9-5-15 4-9 12l9 8c2 20 10 32 24 29 15-4 20-22 18-44l-28-13Z"
        fill="#fff"
      />
      <path
        d="M157 86c0-25 11-41 32-38 20 2 29 21 28 44Z"
        fill={blue}
        stroke="none"
      />
      <path d="m152 89 78 7" stroke={blue} strokeWidth="3" />
      <path
        d="m129 214 17 60 56 13 29-49 21 14-36 66c-5 9-12 12-24 8l-59-20c-14-5-22-14-25-27l-12-47"
        fill="#fff"
      />
      <path d="m202 273 46-99h84l-43 99Z" fill={ink} />
      <path
        d="m200 288 15-30c4-8 11-8 18-5l18 7c6 3 5 8-1 8l-18-4 19 14c6 4 3 9-3 7l-20-9-9 20"
        fill="#fff"
      />
      <path
        d="m227 187 40 16 29-27c4-4 10-4 14-2l16 8c5 3 4 8-1 7l-14-3-29 35c-6 7-15 9-23 5l-34-15"
        fill="#fff"
      />
      <Box x={307} y={153} w={92} h={105} />
      <Barcode x={338} y={218} />
      <Box x={269} y={278} w={80} h={75} tinted />
      <path d="M385 322h142v-69H385Z" fill={blue} stroke="none" />
      <path d="M529 322v-55h41l36 33v22Z" fill="#fff" />
      <path d="M542 278v24h43l-25-24Z" fill="#f1f4fa" />
      <path d="M377 327h237" stroke={ink} strokeWidth="2" />
      <circle cx="415" cy="331" r="16" fill="#fff" />
      <circle cx="415" cy="331" r="7" stroke={line} />
      <circle cx="580" cy="331" r="16" fill="#fff" />
      <circle cx="580" cy="331" r="7" stroke={line} />
      <path
        className="scene-route"
        d="M400 204h25v31h120"
        stroke={blue}
        strokeDasharray="5 7"
      />
      <path d="M89 370h530" stroke={line} />
      <path d="M397 105h27m-27 9h17" stroke="#d4ddf6" />
    </Canvas>
  );
}
