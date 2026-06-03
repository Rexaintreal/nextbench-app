// Fix lucide-react-native type declarations
// The published types reference SVGSVGElement (web) but the runtime uses react-native-svg
// This augmentation adds the missing `color` and `fill` props to the icon types

import type { SvgProps } from "react-native-svg";

declare module "lucide-react-native" {
  import type { FC } from "react";

  interface LucideProps extends SvgProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
    fill?: string;
  }

  type LucideIcon = FC<LucideProps>;

  // Re-export all icons as LucideIcon type
  export const Home: LucideIcon;
  export const Search: LucideIcon;
  export const Plus: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const User: LucideIcon;
  export const Settings: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const MapPin: LucideIcon;
  export const Grid: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const Send: LucideIcon;
  export const Image: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const Heart: LucideIcon;
  export const Share2: LucideIcon;
  export const Tag: LucideIcon;
  export const ArrowUp: LucideIcon;
  export const Flame: LucideIcon;
  export const MessageCircle: LucideIcon;
  export const Bookmark: LucideIcon;
  export const X: LucideIcon;
  export const Upload: LucideIcon;
  export const PlusCircle: LucideIcon;
  export const Clock: LucideIcon;
  export const Package: LucideIcon;
  export const Star: LucideIcon;
  export const MoreVertical: LucideIcon;
}
