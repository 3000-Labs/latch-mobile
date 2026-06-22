import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

interface TabBarIconProps {
  width?: number;
  color: string;
}

export function TabBarHistoryIcon({ width = 24, color }: TabBarIconProps) {
  return (
    <Svg width={width} height={width} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12.0003"
        cy="12.0003"
        r="9.00375"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15.4554 13.1515L12 12.0001V5.99756"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default TabBarHistoryIcon;
