import React, { useEffect, useRef } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { motion, useAnimation } from 'framer-motion';

interface MoleProps {
  word: string;
  isCorrect: boolean;
  isActive: boolean;
  onHit: (isCorrect: boolean) => void;
  position: { x: number; y: number };
}

const Mole: React.FC<MoleProps> = ({
  word,
  isCorrect,
  isActive,
  onHit,
  position
}) => {
  const controls = useAnimation();
  const isAnimating = useRef(false);

  useEffect(() => {
    if (isActive && !isAnimating.current) {
      isAnimating.current = true;
      controls.start({
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 500,
          damping: 30
        }
      }).then(() => {
        isAnimating.current = false;
      });
    } else if (!isActive && !isAnimating.current) {
      isAnimating.current = true;
      controls.start({
        y: '100%',
        transition: {
          type: 'spring',
          stiffness: 500,
          damping: 30
        }
      }).then(() => {
        isAnimating.current = false;
      });
    }
  }, [isActive, controls]);

  const handleClick = () => {
    if (isActive && !isAnimating.current) {
      onHit(isCorrect);
      controls.start({
        y: '100%',
        transition: {
          type: 'spring',
          stiffness: 500,
          damping: 30
        }
      });
    }
  };

  return (
    <Box
      position="absolute"
      left={position.x}
      top={position.y}
      width="100px"
      height="100px"
      cursor="pointer"
      onClick={handleClick}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={controls}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
      >
        <Box
          position="absolute"
          bottom={0}
          width="100%"
          height="100%"
          borderRadius="50%"
          bg="brown.400"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          boxShadow="lg"
          _hover={{
            transform: 'scale(1.05)',
            transition: 'transform 0.2s'
          }}
        >
          <Box
            position="absolute"
            top="20%"
            width="80%"
            height="40%"
            borderRadius="50%"
            bg="brown.300"
          />
          <Box
            position="absolute"
            top="15%"
            left="25%"
            width="15px"
            height="15px"
            borderRadius="50%"
            bg="black"
          />
          <Box
            position="absolute"
            top="15%"
            right="25%"
            width="15px"
            height="15px"
            borderRadius="50%"
            bg="black"
          />
          <Text
            position="absolute"
            top="60%"
            fontSize="sm"
            fontWeight="bold"
            color="white"
            textShadow="1px 1px 2px rgba(0,0,0,0.6)"
          >
            {word}
          </Text>
        </Box>
      </motion.div>
    </Box>
  );
};

export default Mole; 