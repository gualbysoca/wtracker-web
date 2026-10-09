export const LogoIcon = ({ size = 24, color = 'currentColor', strokeWidth = 2 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <text
        x="12"
        y="13.5"
        fontSize="10"
        fontWeight="800"
        fontFamily="sans-serif"
        textAnchor="middle"
        fill={color}
        stroke="none"
      >
        W
      </text>
    </svg>
  );
};
