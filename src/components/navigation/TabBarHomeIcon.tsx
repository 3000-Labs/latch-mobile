import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface TabBarIconProps {
  width?: number;
  color: string;
}

export function TabBarHomeIcon({ width = 24, color }: TabBarIconProps) {
  return (
    <Svg width={width} height={width} viewBox="0 0 24 24" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.842 8.29876L13.842 3.63176C12.759 2.78876 11.242 2.78876 10.158 3.63176L4.158 8.29876C3.427 8.86676 3 9.74076 3 10.6668V17.9998C3 19.6568 4.343 20.9998 6 20.9998H18C19.657 20.9998 21 19.6568 21 17.9998V10.6668C21 9.74076 20.573 8.86676 19.842 8.29876Z"
        stroke={color}
        strokeWidth="1.5"
      />
      <Path
        d="M16 14.2378C13.79 16.4478 10.208 16.4478 8 14.2378"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default TabBarHomeIcon;
