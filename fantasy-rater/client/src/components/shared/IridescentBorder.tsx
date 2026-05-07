import type { ReactNode, CSSProperties } from 'react';

interface Props {
  children: ReactNode;
  block?: boolean;
  innerStyle?: CSSProperties;
  className?: string;
}

export function IridescentBorder({ children, block = false, innerStyle, className = '' }: Props) {
  const wrapperClass = block ? `iridescent-wrapper-block ${className}` : `iridescent-wrapper ${className}`;
  const innerClass   = block ? 'iridescent-inner-block' : 'iridescent-inner';
  return (
    <div className={wrapperClass}>
      <div className={innerClass} style={innerStyle}>
        {children}
      </div>
    </div>
  );
}
