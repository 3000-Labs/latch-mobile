import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { SECURE_KEYS } from '@/src/store/wallet';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect } from 'react';
import { AccessibilityInfo, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  Extrapolate,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse } from 'react-native-svg';

// ---------------------------------------------------------------------------
// Geometry — the two glyph PNGs (g.png 254x202, c.png 176x202) are animated
// into place, then we cross-fade to the canonical combined logo (336x180) so
// the resting mark is always pixel-perfect.
// ---------------------------------------------------------------------------
const GH = 50.46; // glyph render height
const G_W = Math.round((GH * 254) / 202); // 88
const C_W = Math.round((GH * 176) / 202); // 61
const LOGO_W = Math.round((GH * 336) / 180); // 131
const LOGO_H = GH;

const SLOT_W = Math.round(239 * 0.97); // 232 — 3% narrower than the original reference
const SLOT_H = 57; // ~4.7:1 ratio matches the reference ellipse
const SLOT_FILL = '#1E1E1E';

const GLYPH_ABOVE_ELLIPSE = 90; // resting glyph TOP sits this far above the ellipse TOP edge

const STAGE_W = 220;
// Clip extends from stage top down to the slot line (the ellipse's vertical center),
// sized so the resting glyph has a 30px buffer between its top and the stage top.
const CLIP_H = GLYPH_ABOVE_ELLIPSE + SLOT_H + 70; // 212
const STAGE_H = CLIP_H + SLOT_H; // 242 — room for the lower half of the ellipse + buffer

const CENTER_X = STAGE_W / 2; // 110
const REST_TOP = CLIP_H - SLOT_H / 2 - GLYPH_ABOVE_ELLIPSE; // 30 — glyph rest top inside the clip

const G_LEFT = Math.round(CENTER_X - LOGO_W / 2); // 44
const C_LEFT = Math.round(CENTER_X + LOGO_W / 2 - C_W); // 115
const LOGO_LEFT = Math.round(CENTER_X - LOGO_W / 2); // 44

const SLOT_TOP = CLIP_H - SLOT_H / 2; // ellipse straddles the slot line at y = CLIP_H
const SLOT_LEFT = CENTER_X - SLOT_W / 2; // 40

const EMERGE_DY = CLIP_H - REST_TOP + 20; // start with the glyph top safely below the slot line
const EMERGE_OVERSHOOT = GH * 1.35; // letters overshoot 1.35× their height above rest before settling
const G_APART_TX = -4; // resting "G  C" offsets before they latch
const C_APART_TX = 16;

const GLOW = 230;

// Anchor everything to the device's vertical center, then drop the whole composition
// (ellipse + glyphs + wordmark) down by 3% of the screen height as one unit.
const SCREEN_H = Dimensions.get('window').height;
const STAGE_OFFSET_Y = SCREEN_H * 0.03;
const STAGE_TOP_Y = SCREEN_H / 2 - CLIP_H + STAGE_OFFSET_Y;
const WORDMARK_TOP_Y = SCREEN_H / 2.3 + STAGE_OFFSET_Y;

// ---------------------------------------------------------------------------

const AnimatedLetter = ({
  opacity,
  children,
}: {
  opacity: SharedValue<number>;
  children: React.ReactNode;
}) => {
  const letterStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: interpolate(opacity.value, [0, 1], [15, 0], Extrapolate.CLAMP) }],
  }));

  return (
    <Animated.View style={letterStyle}>
      <Text variant="displayItalic" color="textWhite">
        {children}
      </Text>
    </Animated.View>
  );
};

const SplashAnimation = () => {
  const router = useRouter();

  // Emerge (rise out of the slot) + horizontal latch + flip.
  const gTy = useSharedValue(EMERGE_DY);
  const cTy = useSharedValue(EMERGE_DY);
  const gTx = useSharedValue(G_APART_TX);
  const cTx = useSharedValue(C_APART_TX);
  const cScaleX = useSharedValue(1); // C emerges in original orientation, flips to -1 as it latches
  const mergedScaleX = useSharedValue(1); // after merge, the whole G+C unit flips horizontally
  const mergedScale = useSharedValue(1); // merged unit eases up to 1.1× while it flips
  const descentY = useSharedValue(0); // single Y that descends the merged unit so both glyphs move in lockstep

  const slotOpacity = useSharedValue(1);
  const slotScale = useSharedValue(1);
  const glyphsOpacity = useSharedValue(1);
  const logoOpacity = useSharedValue(0); // canonical combined logo (cross-faded in)
  const logoScale = useSharedValue(1); // settle squash
  const glowOpacity = useSharedValue(0);

  // Wordmark — one shared value per letter ("Latch").
  const lOpacity = useSharedValue(0);
  const aOpacity = useSharedValue(0);
  const tOpacity = useSharedValue(0);
  const cwOpacity = useSharedValue(0);
  const hOpacity = useSharedValue(0);

  const checkUserStatusAndNavigate = useCallback(async () => {
    try {
      // SECURE_KEYS.SMART_ACCOUNT is written by deploy-account.tsx for BOTH
      // the passkey path and the Ed25519 (import-phrase) path.
      // Its presence is the single source of truth that a wallet exists on this device.
      const smartAccountAddress = await SecureStore.getItemAsync(SECURE_KEYS.SMART_ACCOUNT);
      if (smartAccountAddress) {
        // router.replace({ pathname: '/(auth)/biometric', params: { mode: 'unlock' } });
        return;
      }

      // No deployed wallet yet — show onboarding.
      router.replace('/onboarding');
    } catch {
      router.replace('/onboarding');
    }
  }, [router]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const snapToFinal = () => {
      gTy.value = 0;
      cTy.value = 0;
      gTx.value = 0;
      cTx.value = 0;
      cScaleX.value = -1;
      mergedScaleX.value = -1;
      mergedScale.value = 1.1;
      descentY.value = 0;
      slotOpacity.value = 0;
      slotScale.value = 0;
      glyphsOpacity.value = 1;
      logoOpacity.value = 0;
      glowOpacity.value = 1;
      lOpacity.value = 1;
      aOpacity.value = 1;
      tOpacity.value = 1;
      cwOpacity.value = 1;
      hOpacity.value = 1;
    };

    const runAnimation = () => {
      // Phase timing (absolute ms from start):
      //   G rises:        200 → 800     (timing to -EMERGE_OVERSHOOT)
      //   C rises:        620 → 1220    (timing to -EMERGE_OVERSHOOT)
      //   Slot closes:    700 → 1320
      //   Latch (slide):  1300 → 1800   (both glyphs held at peak)
      //   Merged flip:    1850 → 2400   (both glyphs held at peak)
      //   Descend:        2450 → 2950   (both glyphs ease down to rest)
      //   Wordmark:       3100 → ~3880

      // 1. Letters rise to their peak and stay there. Reanimated holds the
      //    final value of a timing, so no explicit hold is needed.
      gTy.value = withDelay(200, withTiming(-EMERGE_OVERSHOOT, { duration: 600 }));
      cTy.value = withDelay(620, withTiming(-EMERGE_OVERSHOOT, { duration: 600 }));

      // 2. Slot eases shut as letters rise.
      slotScale.value = withDelay(
        700,
        withTiming(0, { duration: 620, easing: Easing.inOut(Easing.cubic) }),
      );

      // 3. Latch at the top: C flips and both slide horizontally together.
      gTx.value = withDelay(1300, withTiming(0, { duration: 500 }));
      cTx.value = withDelay(1300, withTiming(0, { duration: 500 }));
      cScaleX.value = withDelay(1300, withTiming(-1, { duration: 500 }));

      // 4. Glow bloom while the merged G+C flips horizontally as one unit and
      //    smoothly scales up to 1.1×.
      glowOpacity.value = withDelay(1750, withTiming(1, { duration: 450 }));
      mergedScaleX.value = withDelay(1850, withTiming(-1, { duration: 550 }));
      mergedScale.value = withDelay(
        1850,
        withTiming(1.1, { duration: 550, easing: Easing.inOut(Easing.cubic) }),
      );
      logoScale.value = withDelay(
        1850,
        withSequence(
          withTiming(1.06, { duration: 160 }),
          withSpring(1, { damping: 10, stiffness: 110, mass: 1.1 }),
        ),
      );

      // 5. Descent — a single shared value translates the merged wrapper down so
      //    both glyphs move together at identical speed and level (2450 → 2950).
      descentY.value = withDelay(
        2450,
        withTiming(EMERGE_OVERSHOOT, { duration: 500, easing: Easing.inOut(Easing.cubic) }),
      );

      // 6. Wordmark reveals left-to-right after the descent settles.
      lOpacity.value = withDelay(3100, withTiming(1, { duration: 420 }));
      aOpacity.value = withDelay(3190, withTiming(1, { duration: 420 }));
      tOpacity.value = withDelay(3280, withTiming(1, { duration: 420 }));
      cwOpacity.value = withDelay(3370, withTiming(1, { duration: 420 }));
      hOpacity.value = withDelay(3460, withTiming(1, { duration: 420 }));
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (reduced) {
          snapToFinal();
          timer = setTimeout(checkUserStatusAndNavigate, 1000);
        } else {
          runAnimation();
          timer = setTimeout(checkUserStatusAndNavigate, 4700);
        }
      })
      .catch(() => {
        runAnimation();
        timer = setTimeout(checkUserStatusAndNavigate, 4200);
      });

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gStyle = useAnimatedStyle(() => ({
    opacity: glyphsOpacity.value,
    transform: [{ translateX: gTx.value }, { translateY: gTy.value }],
  }));
  const cStyle = useAnimatedStyle(() => ({
    opacity: glyphsOpacity.value,
    transform: [{ translateX: cTx.value }, { translateY: cTy.value }, { scaleX: cScaleX.value }],
  }));
  const comboStyle = useAnimatedStyle(() => ({ opacity: logoOpacity.value }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: logoScale.value }] }));
  const mergedFlipStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: mergedScaleX.value },
      { scale: mergedScale.value },
      { translateY: descentY.value },
    ],
  }));
  const slotStyle = useAnimatedStyle(() => ({
    // opacity: 1,
    opacity: slotOpacity.value,
    transform: [{ scale: slotScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <LinearGradient
        colors={['rgba(50, 60, 14, 0.74)', '#121212']}
        locations={[0, 0.2772]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Stage — absolutely positioned so the ellipse center lands at the screen's vertical center */}
      <Box position="absolute" left={0} right={0} alignItems="center" style={{ top: STAGE_TOP_Y }}>
        <Box width={STAGE_W} height={STAGE_H}>
          {/* Gold glow bloom behind the mark */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: CENTER_X - GLOW / 2,
                top: REST_TOP + GH / 2 - GLOW / 2,
              },
              glowStyle,
            ]}
          >
            {/* <Svg width={GLOW} height={GLOW}>
              <Defs>
                <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={GOLD} stopOpacity={0.5} />
                  <Stop offset="55%" stopColor={GOLD} stopOpacity={0.12} />
                  <Stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect width={GLOW} height={GLOW} fill="url(#glow)" />
            </Svg> */}
          </Animated.View>

          {/* Decorative slot the letters rise out of — true ellipse via SVG */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: SLOT_LEFT,
                top: SLOT_TOP,
                width: SLOT_W,
                height: SLOT_H,
              },
              slotStyle,
            ]}
          >
            <Svg width={SLOT_W} height={SLOT_H}>
              <Ellipse
                cx={SLOT_W / 2}
                cy={SLOT_H / 2}
                rx={SLOT_W / 2}
                ry={SLOT_H / 2}
                fill={SLOT_FILL}
              />
            </Svg>
          </Animated.View>

          {/* Clip region: its bottom edge is the slot line, so anything below is hidden */}
          <Box width={STAGE_W} height={CLIP_H} overflow="hidden">
            <Animated.View style={[StyleSheet.absoluteFill, markStyle]}>
              <Animated.View style={[StyleSheet.absoluteFill, mergedFlipStyle]}>
                <Animated.Image
                  source={require('@/src/assets/splashscreen/g.png')}
                  style={[
                    { position: 'absolute', left: G_LEFT, top: REST_TOP, width: G_W, height: GH },
                    gStyle,
                  ]}
                  resizeMode="contain"
                />
                <Animated.Image
                  source={require('@/src/assets/splashscreen/c.png')}
                  style={[
                    { position: 'absolute', left: C_LEFT, top: REST_TOP, width: C_W, height: GH },
                    cStyle,
                  ]}
                  resizeMode="contain"
                />
              </Animated.View>
              <Animated.Image
                source={require('@/src/assets/images/logoLoading.png')}
                style={[
                  {
                    position: 'absolute',
                    left: LOGO_LEFT,
                    top: REST_TOP,
                    width: LOGO_W,
                    height: LOGO_H,
                  },
                  comboStyle,
                ]}
                resizeMode="contain"
              />
            </Animated.View>
          </Box>
        </Box>
      </Box>

      {/* Wordmark — absolutely positioned a fixed offset below the ellipse */}
      <Box
        position="absolute"
        left={0}
        right={0}
        alignItems="center"
        style={{ top: WORDMARK_TOP_Y }}
      >
        <Box flexDirection="row">
          <AnimatedLetter opacity={lOpacity}>L</AnimatedLetter>
          <AnimatedLetter opacity={aOpacity}>a</AnimatedLetter>
          <AnimatedLetter opacity={tOpacity}>t</AnimatedLetter>
          <AnimatedLetter opacity={cwOpacity}>c</AnimatedLetter>
          <AnimatedLetter opacity={hOpacity}>h</AnimatedLetter>
        </Box>
      </Box>
    </Box>
  );
};

export default SplashAnimation;
