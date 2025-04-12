import { Box, Text, VStack, useBreakpointValue } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import React from 'react';

interface BasketProps {
  category: {
    name: string;
  };
  items: string[];
  onClick: () => void;
}

const Basket: React.FC<BasketProps> = ({ category, items, onClick }) => {
  // Responsive values
  const titleSize = useBreakpointValue({ base: "sm", md: "md" });
  const itemSize = useBreakpointValue({ base: "xs", md: "sm" });
  const basketHeight = useBreakpointValue({ base: "80px", md: "90px", lg: "100px" });
  
  return (
    <VStack 
      spacing={1} 
      align="center" 
      className="basket" 
      data-basket-id={category.name}
      position="relative"
    >
      <Text 
        fontSize={titleSize}
        fontWeight="bold"
        color="gray.700"
        textAlign="center"
        mb={1}
        position="absolute"
        top="-25px"
        left="50%"
        transform="translateX(-50%)"
        whiteSpace="nowrap"
        fontFamily="'Comic Neue', sans-serif"
      >
        {category.name}
      </Text>
      
      <Box
        as={motion.div}
        whileHover={{ scale: 1.02 }}
        position="relative"
        width="100%"
        height={basketHeight}
        cursor="pointer"
        onClick={onClick}
        sx={{
          position: 'relative',
          borderRadius: '35% 35% 40% 40% / 30% 30% 70% 70%',
          background: 'linear-gradient(180deg, #E3B778 0%, #D4A76A 100%)',
          overflow: 'visible',
          transform: 'perspective(1000px) rotateX(15deg)',
          transformOrigin: 'bottom',
          boxShadow: `
            inset 0 5px 10px rgba(255,255,255,0.3),
            inset 0 -10px 20px rgba(139, 69, 19, 0.3),
            0 5px 15px rgba(0,0,0,0.1)
          `,
          transition: 'all 0.3s ease',
          
          // Weave pattern
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 5px,
                rgba(139, 69, 19, 0.1) 5px,
                rgba(139, 69, 19, 0.1) 10px
              )
            `,
            borderRadius: 'inherit',
            opacity: 0.5,
          }
        }}
      >
        {/* Items in basket */}
        <VStack 
          spacing={0.5} 
          align="center" 
          justify="center" 
          height="100%" 
          pt={2}
          pb={1}
          px={2}
        >
          {items.map((item, index) => (
            <Text 
              key={index} 
              fontSize={itemSize}
              color="gray.800"
              fontWeight="medium"
              textAlign="center"
              px={2}
              py={0.5}
              bg="rgba(255,255,255,0.8)"
              borderRadius="md"
              maxW="90%"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
              boxShadow="sm"
              fontFamily="'Comic Neue', sans-serif"
            >
              {item}
            </Text>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
};

export default Basket; 