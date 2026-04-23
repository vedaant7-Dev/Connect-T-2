import React from "react";
import Svg, { Path, G } from "react-native-svg";

interface Props {
  size?: number;
  green?: string;
}

export default function ConnectTLogoSvg({ size = 180, green = "#4ADE80" }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 520 520">
      {/* White C — thick annular arc, gap on the right ~90° */}
      <Path
        d="M 413 87
           A 230 230 0 1 0 413 433
           L 349 369
           A 140 140 0 1 1 349 151
           Z"
        fill="white"
      />
      {/* Bottom swoosh tail of C */}
      <Path
        d="M 413 433
           Q 390 480 340 490
           Q 310 492 300 488
           Q 330 478 345 460
           Q 370 435 349 369
           Z"
        fill="white"
        opacity={0.85}
      />
      {/* Green T */}
      <G>
        {/* Crossbar */}
        <Path
          d="M 322 118
             Q 312 118 312 128 V 182
             Q 312 192 322 192
             H 370 V 432
             Q 370 444 381 444
             H 424
             Q 435 444 435 432
             V 192 H 476
             Q 486 192 486 182
             V 128
             Q 486 118 476 118
             Z"
          fill={green}
        />
        {/* T top-left diagonal swoosh (mirrors the C tail style) */}
        <Path
          d="M 322 118
             Q 300 108 295 90
             Q 310 95 322 118
             Z"
          fill={green}
          opacity={0.7}
        />
      </G>
    </Svg>
  );
}
