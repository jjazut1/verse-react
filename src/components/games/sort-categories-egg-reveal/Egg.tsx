import { Box, Text, useBreakpointValue } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { playSound } from '../../../utils/soundUtils';

interface EggProps {
  onClick: () => void;
  item: string;
  category: string;
  cracked: boolean;
  onWordClick: (item: string, category: string, e: React.MouseEvent) => void;
}

const CRACK_SOUND_URL = 'https://github.com/jjazut1/sound-hosting/raw/refs/heads/main/break.mp3';

const generatePastelColor = () => {
  // Pastel color combinations (hue, saturation, lightness)
  const colors = [
    { h: 25, s: 70, l: 85 },  // Peach
    { h: 180, s: 50, l: 85 }, // Light Blue
    { h: 280, s: 50, l: 85 }, // Lavender
    { h: 330, s: 60, l: 85 }, // Pink
    { h: 130, s: 50, l: 85 }, // Mint
    { h: 45, s: 70, l: 85 },  // Light Yellow
    { h: 0, s: 60, l: 85 },   // Light Red
    { h: 200, s: 50, l: 85 }, // Baby Blue
  ];
  
  const color = colors[Math.floor(Math.random() * colors.length)];
  const pastelBase = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
  const pastelLighter = `hsl(${color.h}, ${color.s}%, ${color.l + 10}%)`;
  const pastelDarker = `hsl(${color.h}, ${color.s}%, ${color.l - 10}%)`;
  
  return { base: pastelBase, lighter: pastelLighter, darker: pastelDarker };
};

const Egg: React.FC<EggProps> = ({ onClick, item, category, cracked, onWordClick }) => {
  const [showCracks, setShowCracks] = useState(false);
  const [pastelColor] = useState(generatePastelColor());
  const [isWordPickedUp, setIsWordPickedUp] = useState(false);
  
  // Responsive values
  const eggWidth = useBreakpointValue({ base: "45px", md: "55px", lg: "65px" });
  const eggHeight = useBreakpointValue({ base: "60px", md: "73px", lg: "86px" });
  const fontSize = useBreakpointValue({ base: "xs", md: "sm", lg: "md" });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let audio: HTMLAudioElement | null = null;

    if (cracked) {
      // Play sound only when first cracked
      audio = new Audio(CRACK_SOUND_URL);
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Audio play failed:', err));
      
      setShowCracks(true);
      
      // Hide cracks after 1.5 seconds
      timeoutId = setTimeout(() => {
        setShowCracks(false);
      }, 1500);
    }

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [cracked]); // Only depend on cracked prop

  // Generate random crack paths
  const crackPaths = Array(3).fill(null).map(() => {
    const startX = 40 + Math.random() * 20;
    const startY = 30 + Math.random() * 40;
    let path = `M ${startX} ${startY}`;
    
    const segments = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < segments; i++) {
      const length = 10 + Math.random() * 20;
      const angle = Math.random() * 360;
      const rad = angle * Math.PI / 180;
      const endX = startX + length * Math.cos(rad);
      const endY = startY + length * Math.sin(rad);
      path += ` L ${endX} ${endY}`;
    }
    return path;
  });

  return (
    <Box
      as={motion.div}
      whileHover={!cracked ? { scale: 1.05 } : undefined}
      position="relative"
      width={eggWidth}
      height={eggHeight}
      cursor={!cracked ? "pointer" : "default"}
      onClick={() => !cracked && onClick()}
      sx={{
        background: `linear-gradient(135deg, 
          ${pastelColor.lighter} 0%, 
          ${pastelColor.base} 50%, 
          ${pastelColor.darker} 100%
        )`,
        borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
        transform: 'rotate(-5deg)',
        boxShadow: `
          inset -4px -4px 8px rgba(0,0,0,0.1),
          inset 4px 4px 8px rgba(255,255,255,0.8),
          2px 4px 8px rgba(0,0,0,0.1)
        `,
        transition: 'all 0.3s ease',
        opacity: isWordPickedUp ? 0.5 : 1,
        filter: isWordPickedUp ? 'grayscale(50%)' : 'none',
      }}
    >
      {/* Highlight effect */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        borderRadius="inherit"
        sx={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 60%)',
          pointerEvents: 'none'
        }}
      />

      {/* Modified Word display */}
      {cracked && !isWordPickedUp && (
        <Box
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%) rotate(5deg)"
          textAlign="center"
          zIndex="2"
          onClick={(e) => {
            e.stopPropagation();
            setIsWordPickedUp(true);
            onWordClick(item, category, e);
          }}
          cursor="pointer"
          sx={{
            opacity: 0,
            animation: 'fadeIn 0.1s ease forwards',
            '@keyframes fadeIn': {
              '0%': { opacity: 0 },
              '100%': { opacity: 1 }
            },
            '&:hover': {
              transform: 'translate(-50%, -50%) rotate(5deg) scale(1.1)',
            }
          }}
        >
          <Text
            fontSize={fontSize}
            color="gray.700"
            letterSpacing="0.5px"
            fontWeight="medium"
            px={2}
            py={1}
            borderRadius="md"
            fontFamily="'Comic Neue', sans-serif"
          >
            {item}
          </Text>
        </Box>
      )}

      {/* Cracks with AnimatePresence */}
      <AnimatePresence>
        {showCracks && (
          <Box
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ transition: 'opacity 0.3s ease-out' }}
            position="absolute"
            top="0"
            left="0"
            width="100%"
            height="100%"
            pointerEvents="none"
            zIndex="1"
          >
            <svg width="100%" height="100%" style={{ position: 'absolute' }}>
              {crackPaths.map((path, index) => (
                <React.Fragment key={index}>
                  <path
                    d={path}
                    stroke="rgba(70, 40, 0, 0.3)"
                    strokeWidth="1.5"
                    fill="none"
                    style={{
                      filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))'
                    }}
                  />
                </React.Fragment>
              ))}
            </svg>
          </Box>
        )}
      </AnimatePresence>

      {/* Subtle speckles */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        opacity="0.05"
        borderRadius="inherit"
        sx={{
          background: `
            radial-gradient(circle at 70% 20%, #666 1px, transparent 1px),
            radial-gradient(circle at 30% 50%, #666 1px, transparent 1px),
            radial-gradient(circle at 60% 80%, #666 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%',
          pointerEvents: 'none'
        }}
      />
    </Box>
  );
};

export default Egg; 