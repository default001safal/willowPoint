// The approved Cue mascot: ring, eyes, two stumps. Same geometry as the web app;
// animation states are rendered natively via Animated loops per state.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';

// state: 'idle' | 'listening' | 'thinking' | 'speaking'
export default function CueMark({ size = 34, state = 'idle', color = '#ED1725', animated = false }) {
  const left = useRef(new Animated.Value(0)).current;
  const right = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return undefined;
    left.setValue(0);
    right.setValue(0);
    const lift = (value, toValue, duration, delay = 0) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue, duration: duration / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    let loops = [];
    if (state === 'idle') {
      loops = [lift(left, -2.5, 4250, 0), lift(right, -2.5, 4250, 0)];
    } else if (state === 'listening') {
      loops = [lift(left, -8, 1500, 0), lift(right, -8, 1500, 0)];
    } else if (state === 'thinking') {
      loops = [lift(left, -9, 910, 0), lift(right, -9, 910, 473)];
    } else if (state === 'speaking') {
      loops = [lift(left, -8, 840, 0), lift(right, -8, 840, 420)];
    }
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [animated, state]);

  const translate = (value) => ({
    translateY: value.interpolate({ inputRange: [-10, 0], outputRange: [-10, 0] }),
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 210 210" accessibilityRole="image" accessibilityLabel="Cue">
      <Circle cx="105" cy="124" r="67.75" fill="none" stroke={color} strokeWidth="4.5" />
      <Circle cx="89" cy="101.5" r="5" fill={color} />
      <Circle cx="121" cy="101.5" r="5" fill={color} />
      <G>
        <Animated.G style={{ transform: [translate(left)] }}>
          <Rect x="85.75" y="17" width="13" height="29" rx="6.5" fill={color} />
        </Animated.G>
      </G>
      <G>
        <Animated.G style={{ transform: [translate(right)] }}>
          <Rect x="111.25" y="17" width="13" height="29" rx="6.5" fill={color} />
        </Animated.G>
      </G>
    </Svg>
  );
}
