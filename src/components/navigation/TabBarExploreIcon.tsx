import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

interface TabBarIconProps {
  width?: number;
  color: string;
}

export function TabBarExploreIcon({ width = 24, color }: TabBarIconProps) {
  return (
    <Svg width={width} height={width} viewBox="0 0 24 24" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.89863 15.5084L9.0391 9.82399C9.11855 9.42799 9.42833 9.11861 9.82443 9.03966L15.5088 7.90319C15.6727 7.87057 15.842 7.92192 15.9602 8.04007C16.0783 8.15822 16.1297 8.32756 16.097 8.49143L14.9606 14.1758C14.8813 14.5715 14.572 14.8808 14.1762 14.9601L8.49187 16.1016C8.3262 16.1368 8.15397 16.0858 8.03421 15.966C7.91445 15.8463 7.86343 15.674 7.89863 15.5084Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx="12.0003"
        cy="12.0003"
        r="9.00375"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default TabBarExploreIcon;
