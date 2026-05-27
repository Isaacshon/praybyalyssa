import { Text, TextInput, type TextStyle } from 'react-native';

import { Fonts, TextColors } from '@/constants/theme';

type ComponentWithDefaultProps = {
  defaultProps?: {
    style?: TextStyle | TextStyle[];
    placeholderTextColor?: string;
  };
};

const defaultTextStyle: TextStyle = {
  color: TextColors.primary,
  fontFamily: Fonts.sans,
};

function mergeDefaultStyle(component: ComponentWithDefaultProps) {
  const currentDefaults = component.defaultProps ?? {};
  const currentStyle = currentDefaults.style;

  component.defaultProps = {
    ...currentDefaults,
    style: currentStyle
      ? [defaultTextStyle, ...(Array.isArray(currentStyle) ? currentStyle : [currentStyle])]
      : defaultTextStyle,
  };
}

export function applyDefaultTextStyle() {
  mergeDefaultStyle(Text as unknown as ComponentWithDefaultProps);
  mergeDefaultStyle(TextInput as unknown as ComponentWithDefaultProps);

  const textInputDefaults = TextInput as unknown as ComponentWithDefaultProps;
  textInputDefaults.defaultProps = {
    ...textInputDefaults.defaultProps,
    placeholderTextColor: TextColors.tertiary,
  };
}
