import React, { useId } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import type { MoodId, ReactionType, TreeGrowthStage } from '@/lib/praybor/domain';

type ArtworkProps = {
  size?: number;
};

type OnboardingKind = 'welcome' | 'board' | 'groups' | 'grow' | 'recap';
type FoldSide = 'left' | 'right';

const moodColors: Record<MoodId, string> = {
  joy: '#FFD84D',
  excitement: '#FF9846',
  gratitude: '#9DD96F',
  ordinary: '#25D987',
  surprised: '#22B8C7',
  uncomfortable: '#C95CF0',
  exhausted: '#9D7BFF',
  afraid: '#18C6A0',
  sad: '#6F73F6',
  angry: '#FF4B4B',
};

export function MoodFace({ mood, size = 58 }: ArtworkProps & { mood: MoodId }) {
  const fill = moodColors[mood];
  const expression = getMoodExpression(mood);

  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <G>
        <Circle cx="34" cy="32" r="24" fill={fill} />
        <Circle cx="62" cy="32" r="24" fill={fill} />
        <Circle cx="32" cy="60" r="24" fill={fill} />
        <Circle cx="64" cy="60" r="24" fill={fill} />
        <Circle cx="48" cy="48" r="25" fill={fill} />
      </G>
      <Path d={expression.leftEye} stroke="#2a1c13" strokeWidth="6" strokeLinecap="round" fill="none" />
      <Path d={expression.rightEye} stroke="#2a1c13" strokeWidth="6" strokeLinecap="round" fill="none" />
      <Path d={expression.mouth} stroke="#2a1c13" strokeWidth="6" strokeLinecap="round" fill="none" />
      {mood === 'sad' ? <Circle cx="31" cy="58" r="5" fill="#BFE5FF" /> : null}
      {mood === 'exhausted' ? (
        <Path d="M30 63 C40 72 56 72 66 63" stroke="#BFE5FF" strokeWidth="5" strokeLinecap="round" fill="none" />
      ) : null}
    </Svg>
  );
}

export function PostItCornerFold({
  color,
  height,
  side = 'right',
  size = 62,
  width,
}: {
  color: string;
  height?: number;
  side?: FoldSide;
  size?: number;
  width?: number;
}) {
  const id = useStableSvgId('postit-fold');
  const resolvedWidth = width ?? size;
  const resolvedHeight = height ?? size;
  const foldShade = getPostItFoldShade(color);
  const flap = side === 'right' ? 'M12 100 L100 48 L100 100 Z' : 'M88 100 L0 48 L0 100 Z';
  const crease = side === 'right' ? 'M16 97 L97 50' : 'M84 97 L3 50';
  const creaseShadow = side === 'right' ? 'M9 100 L100 43' : 'M91 100 L0 43';
  const cornerWeight = side === 'right'
    ? 'M72 100 H100 V78 L87 87 Z'
    : 'M28 100 H0 V78 L13 87 Z';
  const faceHighlight = side === 'right'
    ? 'M36 96 L94 61'
    : 'M64 96 L6 61';

  return (
    <Svg width={resolvedWidth} height={resolvedHeight} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`${id}-paper`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.24" />
          <Stop offset="0.48" stopColor={color} stopOpacity="0.96" />
          <Stop offset="1" stopColor={foldShade} stopOpacity="0.34" />
        </LinearGradient>
        <LinearGradient id={`${id}-crease`} x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor={foldShade} stopOpacity="0.46" />
          <Stop offset="0.64" stopColor={foldShade} stopOpacity="0.16" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.2" />
        </LinearGradient>
      </Defs>
      <Path d={creaseShadow} stroke={foldShade} strokeOpacity="0.28" strokeWidth="8" strokeLinecap="square" />
      <Path d={flap} fill={`url(#${id}-paper)`} />
      <Path d={cornerWeight} fill={foldShade} opacity="0.2" />
      <Path d={crease} stroke={`url(#${id}-crease)`} strokeWidth="3" strokeLinecap="square" />
      <Path d={faceHighlight} stroke="#FFFFFF" strokeOpacity="0.13" strokeWidth="2" strokeLinecap="square" />
    </Svg>
  );
}

export function getPostItFoldShade(color: string) {
  const rgb = hexToRgb(color);

  if (!rgb) {
    return '#9A522D';
  }

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const shaded = hslToRgb(
    hsl.h,
    clamp(hsl.s + 0.18, 0, 1),
    clamp(hsl.l - 0.28, 0.16, 0.48),
  );

  return rgbToHex(shaded.r, shaded.g, shaded.b);
}

export function getPostItLayerEdgeColor(color: string, opacity = 0.34) {
  const rgb = hexToRgb(getPostItFoldShade(color));

  if (!rgb) {
    return `rgba(154, 82, 45, ${opacity})`;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

export function ReactionIcon({
  type,
  size = 26,
  color = '#2a1c13',
}: ArtworkProps & { type: ReactionType | 'share' | 'review' | 'mission'; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {type === 'love' ? (
        <Path
          d="M24 40 C15 32 8 26 8 17 C8 11 12 7 18 7 C21 7 23 9 24 11 C25 9 28 7 31 7 C37 7 41 11 41 17 C41 26 33 33 24 40 Z"
          fill="#F2475D"
          stroke="#2a1c13"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      ) : null}
      {type === 'prayer' ? (
        <G fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 8 C16 12 15 20 17 28 L11 38" />
          <Path d="M28 8 C32 12 33 20 31 28 L37 38" />
          <Path d="M20 8 L24 23 L28 8" />
          <Path d="M18 28 C20 33 22 36 24 39" />
          <Path d="M30 28 C28 33 26 36 24 39" />
        </G>
      ) : null}
      {type === 'amen' ? (
        <G fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M15 37 V17 C15 13 18 11 21 14 V26" />
          <Path d="M28 37 V14 C28 10 33 10 34 14 V27" />
          <Path d="M21 26 C23 29 25 31 28 32" />
          <Path d="M11 26 C14 33 18 39 24 41 C30 39 34 34 37 27" />
        </G>
      ) : null}
      {type === 'comfort' ? (
        <G fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M8 29 C14 24 20 25 24 31" />
          <Path d="M40 29 C34 24 28 25 24 31" />
          <Path d="M14 34 C19 39 29 39 34 34" />
          <Path d="M17 20 C20 14 28 14 31 20" />
        </G>
      ) : null}
      {type === 'share' ? (
        <G fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M13 37 H35 C38 37 40 35 40 32 V17 C40 14 38 12 35 12 H13 C10 12 8 14 8 17 V32 C8 35 10 37 13 37 Z" />
          <Path d="M15 20 H31" />
          <Path d="M15 27 H25" />
          <Path d="M32 24 L38 18" />
        </G>
      ) : null}
      {type === 'review' ? (
        <G fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M13 9 H35 V39 H13 Z" />
          <Path d="M18 18 H30" />
          <Path d="M18 25 H28" />
          <Path d="M18 32 L22 35 L30 27" />
        </G>
      ) : null}
      {type === 'mission' ? (
        <G fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M24 39 V22" />
          <Path d="M24 25 C16 25 12 20 12 13 C20 13 24 17 24 25 Z" fill="#8BCF6B" stroke={color} />
          <Path d="M24 27 C33 27 37 21 37 14 C29 14 24 19 24 27 Z" fill="#74BD73" stroke={color} />
        </G>
      ) : null}
    </Svg>
  );
}

export function UtilityIcon({
  type,
  size = 24,
  color = '#2a1c13',
}: ArtworkProps & {
  type:
    | 'back'
    | 'sliders'
    | 'plus'
    | 'shuffle'
    | 'close'
    | 'search'
    | 'link'
    | 'share'
    | 'message'
    | 'chevronDown'
    | 'arrowRight'
    | 'check'
    | 'lock'
    | 'draw'
    | 'save'
    | 'siren';
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <G fill="none" stroke={color} strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round">
        {type === 'back' ? <Path d="M29 10 L15 24 L29 38" /> : null}
        {type === 'sliders' ? (
          <>
            <Path d="M10 15 H38" />
            <Circle cx="28" cy="15" r="4" fill="#FFFFFF" />
            <Path d="M10 32 H38" />
            <Circle cx="20" cy="32" r="4" fill="#FFFFFF" />
          </>
        ) : null}
        {type === 'plus' ? (
          <>
            <Path d="M24 12 V36" />
            <Path d="M12 24 H36" />
          </>
        ) : null}
        {type === 'shuffle' ? (
          <>
            <Path d="M10 16 C18 16 19 32 28 32 H36" />
            <Path d="M10 32 C18 32 19 16 28 16 H36" />
            <Path d="M32 12 L38 16 L32 20" />
            <Path d="M32 28 L38 32 L32 36" />
          </>
        ) : null}
        {type === 'close' ? (
          <>
            <Path d="M14 14 L34 34" />
            <Path d="M34 14 L14 34" />
          </>
        ) : null}
        {type === 'search' ? (
          <>
            <Circle cx="21" cy="21" r="10" />
            <Path d="M29 29 L38 38" />
          </>
        ) : null}
        {type === 'link' ? (
          <>
            <Path d="M20 17 L17 17 C11 17 8 20 8 24 C8 28 11 31 17 31 H22" />
            <Path d="M28 17 H31 C37 17 40 20 40 24 C40 28 37 31 31 31 H26" />
            <Path d="M18 24 H30" />
          </>
        ) : null}
        {type === 'share' ? (
          <>
            <Path d="M15 27 V37 H37 V27" />
            <Path d="M26 11 V30" />
            <Path d="M18 19 L26 11 L34 19" />
          </>
        ) : null}
        {type === 'message' ? (
          <>
            <Path d="M12 14 H36 C39 14 41 16 41 19 V29 C41 32 39 34 36 34 H25 L16 40 V34 H12 C9 34 7 32 7 29 V19 C7 16 9 14 12 14 Z" />
            <Path d="M16 22 H32" />
            <Path d="M16 28 H27" />
          </>
        ) : null}
        {type === 'chevronDown' ? <Path d="M14 19 L24 29 L34 19" /> : null}
        {type === 'arrowRight' ? (
          <>
            <Path d="M13 24 H34" />
            <Path d="M25 15 L35 24 L25 33" />
          </>
        ) : null}
        {type === 'check' ? <Path d="M12 25 L21 34 L37 14" /> : null}
        {type === 'lock' ? (
          <>
            <Rect x="13" y="22" width="22" height="17" rx="4" />
            <Path d="M18 22 V17 C18 12 21 9 24 9 C27 9 30 12 30 17 V22" />
            <Path d="M24 29 V33" />
          </>
        ) : null}
        {type === 'draw' ? (
          <>
            <Path d="M13 35 L17 25 L32 10 L38 16 L23 31 Z" />
            <Path d="M29 13 L35 19" />
          </>
        ) : null}
        {type === 'save' ? (
          <>
            <Path d="M12 10 H31 L38 17 V38 H12 Z" />
            <Path d="M18 10 V21 H31" />
            <Path d="M18 38 V28 H32 V38" />
          </>
        ) : null}
        {type === 'siren' ? (
          <>
            <Path d="M15 36 H33" />
            <Path d="M18 34 V24 C18 18 30 18 30 24 V34" />
            <Path d="M14 24 H10" />
            <Path d="M38 24 H34" />
            <Path d="M17 14 L14 10" />
            <Path d="M31 14 L34 10" />
            <Path d="M22 27 H26" />
          </>
        ) : null}
      </G>
    </Svg>
  );
}

export function PrayerCardArt({
  mood,
  variant = 0,
  size = 72,
}: ArtworkProps & { mood: MoodId; variant?: number }) {
  const fill = moodColors[mood];
  const id = useStableSvgId('card-art');

  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Defs>
        <LinearGradient id={`${id}-soft`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={fill} stopOpacity="0.54" />
        </LinearGradient>
      </Defs>
      <Rect x="10" y="12" width="76" height="72" rx="20" fill={`url(#${id}-soft)`} />
      {variant % 3 === 0 ? (
        <G>
          <Rect x="30" y="26" width="34" height="46" rx="10" fill={fill} opacity="0.8" />
          <Path d="M37 39 H58 M37 49 H54" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
          <Path d="M30 69 C45 62 57 64 70 73" stroke="#2a1c13" strokeWidth="4" fill="none" strokeLinecap="round" />
        </G>
      ) : null}
      {variant % 3 === 1 ? (
        <G>
          <Circle cx="37" cy="42" r="17" fill={fill} opacity="0.85" />
          <Circle cx="58" cy="54" r="18" fill="#FFFFFF" opacity="0.75" />
          <Path d="M29 61 C39 50 52 48 65 59" stroke="#2a1c13" strokeWidth="4" fill="none" strokeLinecap="round" />
        </G>
      ) : null}
      {variant % 3 === 2 ? (
        <G>
          <Path d="M28 62 C35 32 61 30 68 62 Z" fill={fill} opacity="0.82" />
          <Path d="M48 68 V35" stroke="#2a1c13" strokeWidth="4" strokeLinecap="round" />
          <Path d="M34 54 C43 47 53 47 62 54" stroke="#FFFFFF" strokeWidth="5" fill="none" strokeLinecap="round" />
        </G>
      ) : null}
      <Circle cx="72" cy="24" r="8" fill="#FFFFFF" opacity="0.9" />
    </Svg>
  );
}

export function OnboardingArt({ kind, size = 210 }: ArtworkProps & { kind: OnboardingKind }) {
  const id = useStableSvgId('onboarding');
  const width = size;
  const height = Math.round(size * 0.92);

  return (
    <Svg width={width} height={height} viewBox="0 0 240 220">
      <Defs>
        <LinearGradient id={`${id}-paper`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#FCEADE" />
        </LinearGradient>
        <LinearGradient id={`${id}-accent`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FCEADE" />
          <Stop offset="1" stopColor="#FF8A5B" />
        </LinearGradient>
      </Defs>
      <Rect x="14" y="20" width="212" height="176" rx="34" fill={`url(#${id}-paper)`} />
      {kind === 'welcome' ? <WelcomeScene accentId={`${id}-accent`} /> : null}
      {kind === 'board' ? <BoardScene accentId={`${id}-accent`} /> : null}
      {kind === 'groups' ? <GroupsScene accentId={`${id}-accent`} /> : null}
      {kind === 'grow' ? <GrowSceneSvg /> : null}
      {kind === 'recap' ? <RecapScene accentId={`${id}-accent`} /> : null}
    </Svg>
  );
}

export function GardenStage({
  stage,
  size = 190,
  species = 'apple',
}: ArtworkProps & { stage: TreeGrowthStage; species?: string }) {
  const id = useStableSvgId('garden');
  const showTree = stage === 'young_tree' || stage === 'fruiting_tree' || stage === 'completed';
  const showFruit = stage === 'fruiting_tree' || stage === 'completed';
  const showLeaves = stage !== 'seed';

  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Defs>
        <LinearGradient id={`${id}-soil`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E7B269" />
          <Stop offset="1" stopColor="#A66B34" />
        </LinearGradient>
        <LinearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#9AD66E" />
          <Stop offset="1" stopColor="#408A45" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="120" cy="180" rx="93" ry="34" fill={`url(#${id}-soil)`} />
      <Ellipse cx="120" cy="172" rx="76" ry="22" fill="#F2C783" opacity="0.58" />
      {stage === 'seed' ? (
        <G>
          <Ellipse cx="120" cy="151" rx="25" ry="31" fill="#A3D553" stroke="#5B9F45" strokeWidth="5" transform="rotate(-22 120 151)" />
          <Path d="M106 148 C118 139 126 139 137 147" stroke="#E6F7A5" strokeWidth="5" strokeLinecap="round" />
          <Circle cx="113" cy="156" r="2.5" fill="#2a1c13" />
          <Circle cx="126" cy="155" r="2.5" fill="#2a1c13" />
        </G>
      ) : null}
      {!showTree && showLeaves ? (
        <G>
          <Path d="M120 174 C119 147 122 126 129 105" stroke="#4C8F45" strokeWidth="9" strokeLinecap="round" />
          <Ellipse cx="103" cy="129" rx="31" ry="17" fill={`url(#${id}-leaf)`} transform="rotate(-23 103 129)" />
          <Ellipse cx="139" cy="121" rx="34" ry="18" fill="#66B95B" transform="rotate(21 139 121)" />
          {stage === 'small_plant' ? (
            <Ellipse cx="121" cy="94" rx="38" ry="26" fill="#8DD368" />
          ) : null}
        </G>
      ) : null}
      {showTree ? (
        <G>
          <Rect x="107" y="102" width="26" height="76" rx="12" fill="#A86F3E" />
          <Ellipse cx="102" cy="102" rx="47" ry="32" fill={`url(#${id}-leaf)`} transform="rotate(-12 102 102)" />
          <Ellipse cx="140" cy="99" rx="48" ry="34" fill="#62B85C" transform="rotate(13 140 99)" />
          <Ellipse cx="121" cy="67" rx="52" ry="38" fill="#85CD62" />
          <Ellipse cx="91" cy="137" rx="25" ry="14" fill="#BDE0A8" opacity="0.7" />
          {showFruit ? <FruitSet species={species} /> : null}
        </G>
      ) : null}
    </Svg>
  );
}

export function FruitToSeedArt({ size = 48 }: ArtworkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx="42" cy="14" r="9" fill="#F3B247" />
      <Path d="M42 25 C41 34 34 37 28 42" stroke="#D38B35" strokeWidth="4" strokeLinecap="round" fill="none" strokeDasharray="5 6" />
      <Ellipse cx="24" cy="48" rx="13" ry="9" fill="#8FD157" stroke="#4E9545" strokeWidth="3" />
      <Path d="M16 47 C24 42 31 43 36 48" stroke="#DDF2A5" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

export function ForestTree({
  species,
  selected = false,
  size = 84,
}: ArtworkProps & { species: string; selected?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 110">
      {selected ? <Circle cx="48" cy="48" r="41" fill="#F4F7DE" /> : null}
      <Ellipse cx="48" cy="94" rx="26" ry="8" fill="#9BC8A2" opacity="0.6" />
      {species === 'cedar' ? (
        <G>
          <Rect x="43" y="62" width="10" height="28" rx="4" fill="#8B5A35" />
          <Path d="M48 12 L24 49 H36 L19 75 H77 L60 49 H72 Z" fill="#3E9A4A" stroke="#2a1c13" strokeWidth="4" strokeLinejoin="round" />
          <Path d="M48 12 L48 75" stroke="#2E6F3B" strokeWidth="4" opacity="0.5" />
        </G>
      ) : species === 'cherry_blossom' ? (
        <G>
          <Rect x="43" y="58" width="12" height="34" rx="5" fill="#8B5A35" />
          <Circle cx="38" cy="43" r="18" fill="#FF9CC6" stroke="#2a1c13" strokeWidth="3" />
          <Circle cx="58" cy="43" r="18" fill="#FF9CC6" stroke="#2a1c13" strokeWidth="3" />
          <Circle cx="49" cy="28" r="18" fill="#FFB7D5" stroke="#2a1c13" strokeWidth="3" />
          <Circle cx="48" cy="46" r="8" fill="#FFE56D" />
        </G>
      ) : (
        <G>
          <Rect x="43" y="56" width="12" height="36" rx="5" fill="#8B5A35" />
          <Path d="M48 13 C68 13 81 27 78 46 C75 65 61 72 45 68 C28 64 19 52 22 36 C25 21 34 13 48 13 Z" fill={species === 'pear' ? '#B9D640' : '#69B956'} stroke="#2a1c13" strokeWidth="4" />
          <Circle cx="58" cy="41" r="4" fill={species === 'pear' ? '#7EA121' : '#F3B247'} />
          <Circle cx="46" cy="35" r="3.5" fill={species === 'pear' ? '#7EA121' : '#F3B247'} />
          <Circle cx="63" cy="52" r="3.5" fill={species === 'pear' ? '#7EA121' : '#F3B247'} />
        </G>
      )}
    </Svg>
  );
}

function FruitSet({ species }: { species: string }) {
  const fill = species === 'pear' ? '#D7D944' : species === 'grape_vine' ? '#8E75D6' : '#F3B247';

  return (
    <G>
      <Circle cx="100" cy="79" r="7" fill={fill} />
      <Circle cx="139" cy="75" r="7" fill={fill} />
      <Circle cx="126" cy="99" r="6" fill={fill} />
    </G>
  );
}

function WelcomeScene({ accentId }: { accentId: string }) {
  return (
    <G>
      <Rect x="128" y="62" width="48" height="88" rx="8" fill={`url(#${accentId})`} />
      <Path d="M72 139 H169" stroke="#2a1c13" strokeWidth="4" strokeLinecap="round" />
      <Circle cx="77" cy="91" r="13" fill="#2a1c13" />
      <Path d="M70 105 C62 119 60 135 64 153" stroke="#2a1c13" strokeWidth="5" strokeLinecap="round" fill="none" />
      <Path d="M83 106 C98 116 110 122 126 123" stroke="#2a1c13" strokeWidth="5" strokeLinecap="round" fill="none" />
      <Path d="M65 153 L49 174" stroke="#2a1c13" strokeWidth="5" strokeLinecap="round" />
      <Path d="M71 153 L91 174" stroke="#2a1c13" strokeWidth="5" strokeLinecap="round" />
      <Path d="M187 132 C185 114 197 105 213 106 C214 123 205 133 187 132 Z" fill="#75BF74" />
      <Path d="M187 132 V165" stroke="#3B743F" strokeWidth="5" strokeLinecap="round" />
    </G>
  );
}

function BoardScene({ accentId }: { accentId: string }) {
  return (
    <G>
      <Rect x="68" y="40" width="74" height="132" rx="18" fill="#FFFFFF" stroke="#2a1c13" strokeWidth="4" />
      <Rect x="79" y="63" width="52" height="30" rx="7" fill="#E7F1DD" />
      <Rect x="79" y="101" width="52" height="44" rx="8" fill={`url(#${accentId})`} opacity="0.85" />
      <Rect x="132" y="78" width="65" height="43" rx="8" fill="#FF8A5B" stroke="#2a1c13" strokeWidth="3" />
      <Path d="M147 94 H181 M147 105 H172" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      <Circle cx="58" cy="139" r="15" fill="#F5D35B" stroke="#2a1c13" strokeWidth="3" />
      <Path d="M52 139 C57 146 64 146 69 139" stroke="#2a1c13" strokeWidth="3" fill="none" strokeLinecap="round" />
    </G>
  );
}

function GroupsScene({ accentId }: { accentId: string }) {
  return (
    <G>
      <Ellipse cx="118" cy="135" rx="72" ry="30" fill="#FFF1EA" />
      <Rect x="62" y="72" width="116" height="57" rx="14" fill="#FFFFFF" stroke="#2a1c13" strokeWidth="4" />
      <Path d="M82 94 H144 M82 108 H128" stroke="#2a1c13" strokeWidth="4" strokeLinecap="round" />
      <Rect x="148" y="84" width="42" height="26" rx="7" fill={`url(#${accentId})`} />
      <Circle cx="84" cy="150" r="17" fill="#71B784" />
      <Circle cx="120" cy="154" r="18" fill="#F2C46D" />
      <Circle cx="157" cy="150" r="17" fill="#8AC5D0" />
    </G>
  );
}

function GrowSceneSvg() {
  return (
    <G>
      <Ellipse cx="120" cy="156" rx="78" ry="26" fill="#D9AB69" />
      <Path d="M120 154 V104" stroke="#4E8F45" strokeWidth="8" strokeLinecap="round" />
      <Ellipse cx="96" cy="115" rx="31" ry="18" fill="#75BF64" transform="rotate(-22 96 115)" />
      <Ellipse cx="142" cy="110" rx="35" ry="20" fill="#61AE59" transform="rotate(21 142 110)" />
      <Ellipse cx="122" cy="77" rx="42" ry="30" fill="#8BD069" />
      <Circle cx="104" cy="76" r="6" fill="#F3B247" />
      <Circle cx="141" cy="91" r="6" fill="#F3B247" />
    </G>
  );
}

function RecapScene({ accentId }: { accentId: string }) {
  return (
    <G>
      <Rect x="54" y="54" width="132" height="98" rx="20" fill="#FFFFFF" stroke="#2a1c13" strokeWidth="4" />
      <Path d="M77 82 H147 M77 103 H127" stroke="#2a1c13" strokeWidth="4" strokeLinecap="round" />
      <Rect x="76" y="121" width="82" height="14" rx="7" fill="#FFE0D2" />
      <Rect x="76" y="121" width="47" height="14" rx="7" fill="#FF8A5B" />
      <Circle cx="171" cy="59" r="16" fill={`url(#${accentId})`} />
      <Path d="M166 56 C171 63 176 63 181 56" stroke="#2a1c13" strokeWidth="3" fill="none" strokeLinecap="round" />
    </G>
  );
}

function getMoodExpression(mood: MoodId) {
  switch (mood) {
    case 'joy':
      return { leftEye: 'M34 39 V39', rightEye: 'M62 39 V39', mouth: 'M32 55 C39 66 57 66 64 55' };
    case 'excitement':
      return { leftEye: 'M31 38 C35 34 39 34 43 38', rightEye: 'M55 38 C59 34 63 34 67 38', mouth: 'M34 56 C41 66 56 66 63 56' };
    case 'gratitude':
      return { leftEye: 'M31 40 C35 44 39 44 43 40', rightEye: 'M55 40 C59 44 63 44 67 40', mouth: 'M36 57 C43 64 54 64 61 57' };
    case 'ordinary':
      return { leftEye: 'M35 40 V40', rightEye: 'M61 40 V40', mouth: 'M37 58 H60' };
    case 'surprised':
      return { leftEye: 'M34 39 V39', rightEye: 'M62 39 V39', mouth: 'M48 56 m-8 0 a8 9 0 1 0 16 0 a8 9 0 1 0 -16 0' };
    case 'uncomfortable':
      return { leftEye: 'M34 40 L40 44', rightEye: 'M62 40 L56 44', mouth: 'M36 62 C43 54 53 54 60 62' };
    case 'exhausted':
      return { leftEye: 'M31 40 H42', rightEye: 'M54 40 H65', mouth: 'M36 59 C44 55 52 63 60 59' };
    case 'afraid':
      return { leftEye: 'M34 41 V41', rightEye: 'M62 41 V41', mouth: 'M36 63 C42 55 55 55 61 63' };
    case 'sad':
      return { leftEye: 'M34 40 V40', rightEye: 'M62 40 V40', mouth: 'M36 63 C43 55 53 55 60 63' };
    case 'angry':
      return { leftEye: 'M31 37 L42 43', rightEye: 'M65 37 L54 43', mouth: 'M37 63 H59' };
  }
}

function useStableSvgId(prefix: string) {
  return `${prefix}-${useId().replace(/:/g, '')}`;
}

function hexToRgb(color: string) {
  const normalized = color.trim().replace(/^#/, '');
  const hex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return undefined;
  }

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  if (max === red) {
    hue = (green - blue) / delta + (green < blue ? 6 : 0);
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  return { h: hue / 6, s: saturation, l: lightness };
}

function hslToRgb(h: number, s: number, l: number) {
  if (s === 0) {
    const value = Math.round(l * 255);
    return { r: value, g: value, b: value };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, h) * 255),
    b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  };
}

function hueToRgb(p: number, q: number, t: number) {
  let value = t;

  if (value < 0) value += 1;
  if (value > 1) value -= 1;
  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;

  return p;
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
