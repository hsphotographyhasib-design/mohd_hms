'use client';

import { COMPANY } from '@/lib/company';

interface CompanyStampProps {
  size?: number;
  className?: string;
  opacity?: number;
}

export function CompanyStamp({ size = 88, className = '', opacity = 0.8 }: CompanyStampProps) {
  const r = size / 2;
  const textR = r - 6;
  const innerR = r - 11;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={className}
      style={{ opacity }}
    >
      <defs>
        <path
          id={`topArc-${size}`}
          d={`M ${r - textR},${r} A ${textR},${textR} 0 0 1 ${r + textR},${r}`}
        />
        <path
          id={`botArc-${size}`}
          d={`M ${r - innerR + 2},${r} A ${innerR - 2},${innerR - 2} 0 0 0 ${r + innerR - 2},${r}`}
        />
      </defs>
      {/* Outer circle */}
      <circle
        cx={r} cy={r} r={r - 1}
        fill="none"
        stroke="#17a55a"
        strokeWidth="2"
      />
      {/* Inner circle */}
      <circle
        cx={r} cy={r} r={innerR}
        fill="none"
        stroke="#17a55a"
        strokeWidth="1"
      />
      {/* Top arc text */}
      <text
        fontSize={Math.max(6, size * 0.07)}
        fontWeight="700"
        letterSpacing="1.2"
        fill="#17a55a"
        fontFamily="Arial, sans-serif"
      >
        <textPath
          href={`#topArc-${size}`}
          startOffset="50%"
          textAnchor="middle"
        >
          MOHD.HMS ENTERPRISE
        </textPath>
      </text>
      {/* Bottom arc text */}
      <text
        fontSize={Math.max(5.5, size * 0.065)}
        fontWeight="700"
        letterSpacing="2.4"
        fill="#17a55a"
        fontFamily="Arial, sans-serif"
      >
        <textPath
          href={`#botArc-${size}`}
          startOffset="50%"
          textAnchor="middle"
        >
          SDN BHD
        </textPath>
      </text>
      {/* Center logo block */}
      <g transform={`translate(${r},${r})`}>
        <rect
          x={-size * 0.12}
          y={-size * 0.12}
          width={size * 0.24}
          height={size * 0.24}
          rx="6"
          fill="#17a55a"
        />
        <text
          x="0"
          y={size * 0.02}
          fontSize={size * 0.14}
          fontWeight="800"
          fill="#fff"
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
        >
          MH
        </text>
      </g>
      {/* Reg number */}
      <text
        x={r}
        y={r + size * 0.28}
        fontSize={Math.max(5, size * 0.06)}
        fontWeight="700"
        letterSpacing="1.5"
        fill="#17a55a"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
      >
        {COMPANY.regNo}
      </text>
    </svg>
  );
}