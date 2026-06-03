import Box from '@/src/components/shared/Box';
import Text from '@/src/components/shared/Text';
import { SECURE_KEYS } from '@/src/store/wallet';
import { Image as ExpoImage } from 'expo-image';
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
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse } from 'react-native-svg';

// expo-image renders with SDWebImage/Glide — keeps glyph quality crisp under
// scale + rotate transforms vs. RN's stock Image which sampling-artifacts.
const AnimatedExpoImage = Animated.createAnimatedComponent(ExpoImage);

// ---------------------------------------------------------------------------
// Geometry — the two glyph PNGs (g.png 254x202, c.png 176x202) are animated
// into place, then we cross-fade to the canonical combined logo (336x180) so
// the resting mark is always pixel-perfect.
// ---------------------------------------------------------------------------
const GH = 50.46; // glyph render height
const G_W = Math.round((GH * 254) / 202); // 88
const C_W = Math.round((GH * 176) / 202); // 61
const LOGO_W = Math.round((GH * 336) / 180); // 131

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

// Switched layout — C sits on the left, flipped-G sits on the right.
const C_LEFT = Math.round(CENTER_X - LOGO_W / 2); // 44 (was G's slot)
const G_LEFT = Math.round(CENTER_X + LOGO_W / 2 - G_W); // 88 (was C's slot, adjusted for G's wider width)

const SLOT_TOP = CLIP_H - SLOT_H / 2; // ellipse straddles the slot line at y = CLIP_H
const SLOT_LEFT = CENTER_X - SLOT_W / 2; // 40

const EMERGE_DY = CLIP_H - REST_TOP + 20; // start with the glyph top safely below the slot line
const EMERGE_OVERSHOOT = GH * 1.35; // letters overshoot 1.35× their height above rest before settling
// "C  G" pre-merge offsets — C shifts left, G shifts right (signs flipped now
// that the letters have swapped sides).
const C_APART_TX = -16;
const G_APART_TX = 10;

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

  // Emerge (rise out of the slot) + horizontal merge + descent. No flips —
  // C stays in its natural orientation throughout.
  const gTy = useSharedValue(EMERGE_DY);
  const cTy = useSharedValue(EMERGE_DY);
  const gTx = useSharedValue(G_APART_TX);
  const cTx = useSharedValue(C_APART_TX);
  const mergedScale = useSharedValue(1); // grows by 20% during the merge for a clearly visible enlargement
  const descentY = useSharedValue(0); // single Y that descends the merged unit so both glyphs move in lockstep

  const slotOpacity = useSharedValue(1);
  const slotScale = useSharedValue(0); // starts closed; opens to 1 as the first phase, then shrinks back at close time
  const glyphsOpacity = useSharedValue(1);

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
        router.replace({ pathname: '/(auth)/biometric', params: { mode: 'unlock' } });
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
      mergedScale.value = 1;
      descentY.value = 0;
      slotOpacity.value = 0;
      slotScale.value = 0;
      glyphsOpacity.value = 1;
      lOpacity.value = 1;
      aOpacity.value = 1;
      tOpacity.value = 1;
      cwOpacity.value = 1;
      hOpacity.value = 1;
    };

    const runAnimation = () => {
      // Phase timing (absolute ms from start):
      //   Slot opens:     0    → 480
      //   G & C rise:     720  → 1220   (fast 500ms rise, ease-out for smooth landing)
      //   Slot closes:    870  → 1270   (eases shut around the peak)
      //   Hold apart:     1220 → 1700   (short pause at top before merging)
      //   Merge (slide):  1700 → 2600   (gTx, cTx → 0; synced with enlargement)
      //   Hold merged:    2600 → 4220   (longer pause at top after merging)
      //                                  → total time at top = 3s (incl. merge)
      //   Descend:        4220 → 5220   (1s)
      //   Wordmark:       5400 → 5900   (all five letters fade in together)

      // 1. Slot opens first — scale 0 → 1 — then eases shut as the letters
      //    finish their rise (close ends just past peak).
      slotScale.value = withSequence(
        withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }),
        withDelay(390, withTiming(0, { duration: 400, easing: Easing.inOut(Easing.cubic) })),
      );

      // 2. G & C rise together to peak in 500ms — Easing.out(cubic) keeps the
      //    motion fast off the line and lands smoothly at the apex.
      gTy.value = withDelay(
        720,
        withTiming(-EMERGE_OVERSHOOT, { duration: 500, easing: Easing.out(Easing.cubic) }),
      );
      cTy.value = withDelay(
        720,
        withTiming(-EMERGE_OVERSHOOT, { duration: 500, easing: Easing.out(Easing.cubic) }),
      );

      // 3. Merge: both slide horizontally to the latched position shortly
      //    after the rise. The slide and the enlargement share the same
      //    900ms quad-in-out curve so they read as one smooth motion.
      gTx.value = withDelay(
        1700,
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      );
      cTx.value = withDelay(
        1700,
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      );

      // mergedScale chains its own arc on one shared value:
      //   1700 → 2600  : grow to 1.2× — clearly visible 20% enlargement, slow
      //                  900ms quad-in-out ramp so it stays smooth.
      //   2600 → 4220  : hold at 1.2× through the merged-hold phase
      //   4220 → 5220  : shrink back to 1.0× as the unit descends
      mergedScale.value = withDelay(
        1700,
        withSequence(
          withTiming(1.2, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withDelay(
            1620,
            // Match the enlargement's gentle quad curve so the shrink reads
            // as one continuous, smooth motion — no perceptible curve change.
            withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
          ),
        ),
      );

      // 4. Descend — single shared value translates the merged wrapper down
      //    in 1s so both glyphs move together at identical speed and level.
      descentY.value = withDelay(
        4220,
        withTiming(EMERGE_OVERSHOOT, { duration: 1000, easing: Easing.inOut(Easing.cubic) }),
      );

      // 5. Wordmark — "Latch" reveals as one (all five letters together).
      const WORDMARK_DELAY = 5400;
      const WORDMARK_DUR = 500;
      lOpacity.value = withDelay(WORDMARK_DELAY, withTiming(1, { duration: WORDMARK_DUR }));
      aOpacity.value = withDelay(WORDMARK_DELAY, withTiming(1, { duration: WORDMARK_DUR }));
      tOpacity.value = withDelay(WORDMARK_DELAY, withTiming(1, { duration: WORDMARK_DUR }));
      cwOpacity.value = withDelay(WORDMARK_DELAY, withTiming(1, { duration: WORDMARK_DUR }));
      hOpacity.value = withDelay(WORDMARK_DELAY, withTiming(1, { duration: WORDMARK_DUR }));
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (reduced) {
          snapToFinal();
          timer = setTimeout(checkUserStatusAndNavigate, 1000);
        } else {
          runAnimation();
          timer = setTimeout(checkUserStatusAndNavigate, 6650);
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
    // scaleX -1 flips the G horizontally — applied last in the array so the
    // mirror is around the G's own center, leaving translate values intact.
    transform: [{ translateX: gTx.value }, { translateY: gTy.value }, { scaleX: -1 }],
  }));
  const cStyle = useAnimatedStyle(() => ({
    opacity: glyphsOpacity.value,
    transform: [{ translateX: cTx.value }, { translateY: cTy.value }],
  }));
  const mergedWrapperStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: descentY.value }, { scale: mergedScale.value }],
  }));
  const slotStyle = useAnimatedStyle(() => ({
    opacity: slotOpacity.value,
    transform: [{ scale: slotScale.value }],
  }));

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
            <Animated.View style={[StyleSheet.absoluteFill, mergedWrapperStyle]}>
              <AnimatedExpoImage
                source={require('@/src/assets/splashscreen/c.png')}
                style={[
                  { position: 'absolute', left: C_LEFT, top: REST_TOP, width: C_W, height: GH },
                  cStyle,
                ]}
                contentFit="contain"
                cachePolicy="memory"
              />
              <AnimatedExpoImage
                source={require('@/src/assets/splashscreen/g.png')}
                style={[
                  { position: 'absolute', left: G_LEFT, top: REST_TOP, width: G_W, height: GH },
                  gStyle,
                ]}
                contentFit="contain"
                cachePolicy="memory"
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
