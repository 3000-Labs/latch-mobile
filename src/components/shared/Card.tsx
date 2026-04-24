import { createVariant, createRestyleComponent, VariantProps } from '@shopify/restyle';
import { Theme } from '../../theme/theme';
import Box, { BoxProps } from './Box';

const variant = createVariant<Theme, 'cardVariants'>({
  themeKey: 'cardVariants',
});

const Card = createRestyleComponent<VariantProps<Theme, 'cardVariants'> & BoxProps, Theme>([variant], Box);

export default Card;
