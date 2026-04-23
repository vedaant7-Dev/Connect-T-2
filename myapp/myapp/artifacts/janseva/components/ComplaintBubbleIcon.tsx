import React from "react";
import Svg, { Path, Rect, Circle } from "react-native-svg";

interface Props {
  color?: string;
  size?: number;
}

export default function ComplaintBubbleIcon({ color = "#94A3B8", size = 22 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Speech bubble body */}
      <Path
        d="M12 2C6.477 2 2 6.254 2 11.5c0 2.7 1.17 5.132 3.05 6.857L4 22l4.43-1.71C9.5 20.74 10.72 21 12 21c5.523 0 10-4.254 10-9.5S17.523 2 12 2z"
        fill={color}
      />
      {/* Exclamation mark shaft */}
      <Rect x="11" y="7" width="2" height="6" rx="1" fill="white" />
      {/* Exclamation mark dot */}
      <Circle cx="12" cy="16" r="1.1" fill="white" />
    </Svg>
  );
}
