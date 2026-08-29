import React, { useId } from "react";

export interface MorphTextProps {
  /**
   * Array of words / phrases to cycle through.
   * @default ["CATCH CODE VIOLATIONS", "AUDIT DCR & NBC LAWS", "SECURE FAST SANCTIONS"]
   */
  words?: string[];
  /**
   * Duration (ms) each word is displayed before transitioning.
   * @default 3000
   */
  interval?: number;
  /**
   * Optional subtext rendered beneath the morphing word.
   */
  subtext?: string;
  /**
   * Font size passed as a CSS value.
   */
  fontSize?: string;
  /**
   * Font family. Defaults to `"Space Grotesk", sans-serif`.
   */
  fontFamily?: string;
  /** Extra CSS classes on the root wrapper. */
  className?: string;
  /** Extra CSS classes on the morphing text container. */
  textClassName?: string;
  /** Extra CSS classes on the subtext element. */
  subtextClassName?: string;
}

export function MorphText({
  words = [
    "CATCH CODE VIOLATIONS",
    "AUDIT DCR & NBC LAWS",
    "SECURE FAST SANCTIONS",
    "INSTANT CAD COMPLIANCE"
  ],
  interval = 3200,
  subtext,
  fontSize = "clamp(2.2rem, 6vw, 4.5rem)",
  fontFamily = '"Space Grotesk", sans-serif',
  className = "",
  textClassName = "",
  subtextClassName = "",
}: MorphTextProps) {
  const uid = useId().replace(/:/g, "");
  const filterId = `morph-threshold-${uid}`;

  const totalDuration = (interval / 1000) * words.length;
  const wordDuration = interval / 1000;

  const wordStyles = words.map((_, i) => ({
    animationDelay: `${i * wordDuration}s`,
    animationDuration: `${totalDuration}s`,
  }));

  return (
    <div className={`morph-text-root relative flex flex-col items-center justify-center text-center ${className}`}>
      {/* Hidden Threshold SVG filter */}
      <svg
        aria-hidden="true"
        focusable="false"
        style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
      >
        <defs>
          <filter id={filterId}>
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Morphing word container */}
      <div
        className={`morph-text-container relative select-none w-full flex items-center justify-center ${textClassName}`}
        style={{
          fontSize,
          fontWeight: 800,
          filter: `url(#${filterId})`,
          fontFamily,
          lineHeight: 1.15,
        }}
      >
        <div
          className="morph-word-rotator relative flex items-center justify-center w-full"
          style={{ height: "1.8em" }}
        >
          {words.map((word, i) => {
            const parts = word.split(" ");
            return (
              <span
                key={`${word}-${i}`}
                className="morph-word absolute tracking-tight text-center px-4"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  opacity: 0,
                  whiteSpace: "nowrap",
                  animationName: "morph-word-rotate",
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                  animationFillMode: "both",
                  ...wordStyles[i],
                }}
              >
                {parts.map((part, pIdx) => {
                  const isHighlight = pIdx === parts.length - 1 || part === "DCR" || part === "NBC" || part === "CAD";
                  return (
                    <span key={pIdx} className={isHighlight ? "text-[#f26a3d] drop-shadow-md" : "text-[#f4f0e8]"}>
                      {part}{pIdx < parts.length - 1 ? " " : ""}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </div>
      </div>

      {/* Optional subtext */}
      {subtext && (
        <p
          className={`morph-subtext mt-4 uppercase tracking-[0.2em] text-[#8c999c] font-mono font-semibold ${subtextClassName}`}
          style={{
            fontSize: "0.95rem",
            opacity: 0,
            animation: "morph-fade-up 1s ease-out 0.8s forwards",
            fontFamily,
          }}
        >
          {subtext}
        </p>
      )}

      <style>{`
        @keyframes morph-word-rotate {
          0% {
            opacity: 0;
            filter: blur(20px);
            transform: translate(-50%, -50%) scale(0.8);
          }
          5% {
            opacity: 0.5;
            filter: blur(10px);
          }
          15%, 35% {
            opacity: 1;
            filter: blur(0px);
            transform: translate(-50%, -50%) scale(1);
          }
          45% {
            opacity: 0.5;
            filter: blur(10px);
          }
          50%, 100% {
            opacity: 0;
            filter: blur(20px);
            transform: translate(-50%, -50%) scale(1.25);
          }
        }

        @keyframes morph-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default MorphText;
