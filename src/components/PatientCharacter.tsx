import { motion, AnimatePresence } from "framer-motion";

interface PatientCharacterProps {
  completedCount: number;
  totalChallenges: number;
}

/**
 * Animated SVG patient that visually heals as challenges are completed.
 * Ailments (in order of healing):
 *   0 completed → all 4 ailments visible
 *   1 completed → headache gone
 *   2 completed → arm sling gone
 *   3 completed → leg cast gone
 *   4 completed → bandage gone, fully healed + celebration
 */
const PatientCharacter = ({ completedCount, totalChallenges }: PatientCharacterProps) => {
  const showHeadache = completedCount < 1;
  const showArmSling = completedCount < 2;
  const showLegCast = completedCount < 3;
  const showBandage = completedCount < 4;
  const fullyHealed = completedCount >= totalChallenges;

  // Mood based on healing progress
  const mouthPath = fullyHealed
    ? "M 85 135 Q 100 155 115 135" // big smile
    : completedCount >= 2
    ? "M 88 135 Q 100 148 112 135" // small smile
    : completedCount >= 1
    ? "M 88 138 L 112 138" // neutral
    : "M 85 145 Q 100 130 115 145"; // frown

  return (
    <div className="relative flex items-center justify-center py-2">
      {/* Celebration particles */}
      <AnimatePresence>
        {fullyHealed && (
          <>
            {["🎉", "✨", "💚", "⭐"].map((emoji, i) => (
              <motion.span
                key={emoji}
                initial={{ opacity: 0, y: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [-10, -50 - i * 12],
                  x: [0, (i % 2 === 0 ? 1 : -1) * (20 + i * 10)],
                  scale: [0, 1.2, 1, 0.5],
                }}
                transition={{ duration: 1.8, delay: i * 0.15, repeat: Infinity, repeatDelay: 2.5 }}
                className="absolute text-lg"
                style={{ top: "20%", left: "50%" }}
              >
                {emoji}
              </motion.span>
            ))}
          </>
        )}
      </AnimatePresence>

      <motion.svg
        viewBox="0 0 200 220"
        className="h-40 w-40"
        animate={fullyHealed ? { y: [0, -4, 0] } : { y: [0, 2, 0] }}
        transition={{ repeat: Infinity, duration: fullyHealed ? 1.2 : 3, ease: "easeInOut" }}
      >
        {/* Body */}
        <motion.ellipse
          cx="100" cy="185" rx="35" ry="25"
          className="fill-primary/20"
          animate={fullyHealed ? { fill: "hsl(162, 63%, 41%, 0.3)" } : {}}
        />
        <rect x="80" y="145" width="40" height="45" rx="8"
          className="fill-primary/15 stroke-primary/30" strokeWidth="1.5"
        />

        {/* Head */}
        <motion.circle
          cx="100" cy="110" r="35"
          className="stroke-foreground/20"
          strokeWidth="1.5"
          fill="hsl(33, 50%, 88%)"
          animate={fullyHealed ? { scale: [1, 1.02, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />

        {/* Eyes */}
        <motion.circle
          cx="88" cy="108" r="3.5"
          className="fill-foreground/70"
          animate={fullyHealed
            ? { scaleY: [1, 0.1, 1], cy: [108, 108, 108] }
            : showHeadache
            ? { cy: [108, 109, 108] }
            : {}
          }
          transition={{ repeat: Infinity, duration: fullyHealed ? 2.5 : 4, ease: "easeInOut" }}
        />
        <motion.circle
          cx="112" cy="108" r="3.5"
          className="fill-foreground/70"
          animate={fullyHealed
            ? { scaleY: [1, 0.1, 1] }
            : showHeadache
            ? { cy: [108, 109, 108] }
            : {}
          }
          transition={{ repeat: Infinity, duration: fullyHealed ? 2.5 : 4, ease: "easeInOut" }}
        />

        {/* Eyebrows — worried when hurt, happy when healed */}
        {showHeadache ? (
          <>
            <line x1="82" y1="97" x2="93" y2="100" className="stroke-foreground/40" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="107" y1="100" x2="118" y2="97" className="stroke-foreground/40" strokeWidth="1.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <line x1="82" y1="100" x2="93" y2="98" className="stroke-foreground/30" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="107" y1="98" x2="118" y2="100" className="stroke-foreground/30" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )}

        {/* Mouth */}
        <motion.path
          d={mouthPath}
          fill="none"
          className="stroke-foreground/50"
          strokeWidth="2"
          strokeLinecap="round"
          initial={false}
          animate={{ d: mouthPath }}
          transition={{ duration: 0.5 }}
        />

        {/* Blush when healing */}
        {completedCount >= 2 && (
          <>
            <circle cx="78" cy="125" r="6" fill="hsl(0, 70%, 80%)" opacity="0.3" />
            <circle cx="122" cy="125" r="6" fill="hsl(0, 70%, 80%)" opacity="0.3" />
          </>
        )}

        {/* Arms */}
        <line x1="80" y1="155" x2="55" y2="175" className="stroke-foreground/20" strokeWidth="3" strokeLinecap="round" />
        <line x1="120" y1="155" x2="145" y2="175" className="stroke-foreground/20" strokeWidth="3" strokeLinecap="round" />

        {/* Legs */}
        <line x1="90" y1="188" x2="80" y2="215" className="stroke-foreground/20" strokeWidth="3" strokeLinecap="round" />
        <line x1="110" y1="188" x2="120" y2="215" className="stroke-foreground/20" strokeWidth="3" strokeLinecap="round" />

        {/* ===== AILMENTS ===== */}

        {/* 1. Headache — spinning stars */}
        <AnimatePresence>
          {showHeadache && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.5, y: -10 }}
              transition={{ duration: 0.5 }}
            >
              <motion.text
                x="70" y="82" fontSize="14"
                animate={{ rotate: [0, 20, -20, 0], y: [0, -2, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{ transformOrigin: "70px 82px" }}
              >💫</motion.text>
              <motion.text
                x="118" y="78" fontSize="12"
                animate={{ rotate: [0, -15, 15, 0], y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, delay: 0.3 }}
                style={{ transformOrigin: "118px 78px" }}
              >⭐</motion.text>
              <motion.text
                x="95" y="70" fontSize="10"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              >😵</motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* 2. Arm sling */}
        <AnimatePresence>
          {showArmSling && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.5 }}
            >
              {/* Sling triangle */}
              <path
                d="M 60 150 L 55 175 L 80 170 Z"
                fill="hsl(200, 20%, 90%)"
                stroke="hsl(200, 15%, 75%)"
                strokeWidth="1"
              />
              {/* Sling strap */}
              <path
                d="M 68 148 Q 85 135 100 145"
                fill="none"
                stroke="hsl(200, 15%, 70%)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <motion.text
                x="48" y="168" fontSize="10"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ transformOrigin: "48px 168px" }}
              >🤕</motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* 3. Leg cast */}
        <AnimatePresence>
          {showLegCast && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.5 }}
            >
              <rect x="112" y="198" width="18" height="20" rx="3"
                fill="hsl(0, 0%, 95%)" stroke="hsl(0, 0%, 80%)" strokeWidth="1.5"
              />
              {/* Cross mark on cast */}
              <line x1="117" y1="204" x2="125" y2="212" stroke="hsl(0, 60%, 65%)" strokeWidth="1" />
              <line x1="125" y1="204" x2="117" y2="212" stroke="hsl(0, 60%, 65%)" strokeWidth="1" />
            </motion.g>
          )}
        </AnimatePresence>

        {/* 4. Bandage on torso */}
        <AnimatePresence>
          {showBandage && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.4 }}
            >
              <rect x="88" y="155" width="24" height="14" rx="2"
                fill="hsl(40, 80%, 92%)" stroke="hsl(40, 50%, 75%)" strokeWidth="1"
              />
              {/* Bandage cross */}
              <line x1="95" y1="158" x2="107" y2="166" stroke="hsl(0, 55%, 60%)" strokeWidth="1.2" />
              <line x1="107" y1="158" x2="95" y2="166" stroke="hsl(0, 55%, 60%)" strokeWidth="1.2" />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Healed sparkle on body when fully healed */}
        {fullyHealed && (
          <motion.text
            x="130" y="155" fontSize="16"
            animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >✨</motion.text>
        )}
      </motion.svg>

      {/* Status label */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        key={completedCount}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          fullyHealed
            ? "bg-primary/15 text-primary"
            : completedCount >= 2
            ? "bg-accent/15 text-accent-foreground"
            : "bg-destructive/10 text-destructive"
        }`}>
          {fullyHealed
            ? "Fully Healed! 🎉"
            : completedCount >= 2
            ? "Recovering..."
            : completedCount >= 1
            ? "Needs Care"
            : "Critical Condition"}
        </span>
      </motion.div>
    </div>
  );
};

export default PatientCharacter;
