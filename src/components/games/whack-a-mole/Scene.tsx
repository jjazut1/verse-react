import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Box } from '@chakra-ui/react';
import * as THREE from 'three';
import { WhackAMoleConfig } from '../../../types/game';

interface SceneProps {
  gameActive: boolean;
  onMoleHit: (word: string, isCorrect: boolean) => void;
  config: WhackAMoleConfig;
}

// Add particle system for confetti
class Confetti {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  scene: THREE.Scene;
  lifespan: number;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    const geometry = new THREE.PlaneGeometry(0.2, 0.2); // Slightly larger confetti
    
    // Red, white, and blue colors only
    const colors = [
      new THREE.Color(0xFF0000), // Red
      new THREE.Color(0xFFFFFF), // White
      new THREE.Color(0x0000FF)  // Blue
    ];
    
    const material = new THREE.MeshBasicMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    
    // More energetic initial velocity but constrained to a halo pattern around the hit point
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 0.2;
    
    this.velocity = new THREE.Vector3(
      Math.cos(angle) * speed,    // Circular outward pattern
      Math.sin(angle) * speed,    // Circular outward pattern
      (Math.random() - 0.5) * 0.2 // Slight random Z movement
    );
    
    this.rotationSpeed = new THREE.Vector3(
      Math.random() * 0.4,
      Math.random() * 0.4,
      Math.random() * 0.4
    );

    // Shorter lifespan for quicker disappearance (1.0 = normal, lower = shorter)
    this.lifespan = 0.6;
    
    this.scene = scene;
    scene.add(this.mesh);
  }

  update(deltaTime: number) {
    this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    this.mesh.rotation.x += this.rotationSpeed.x * deltaTime;
    this.mesh.rotation.y += this.rotationSpeed.y * deltaTime;
    this.mesh.rotation.z += this.rotationSpeed.z * deltaTime;
    
    // Faster falling
    this.velocity.y -= 0.4 * deltaTime;
    
    // Faster deceleration
    this.velocity.multiplyScalar(0.95);
    
    // Fade out faster
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.opacity -= 0.05;
    }
    
    // Decrease lifespan
    this.lifespan -= deltaTime;
    
    // Remove when lifespan is over or when it falls below the ground
    if (this.lifespan <= 0 || this.mesh.position.y < -2) {
      this.scene.remove(this.mesh);
      return true;
    }
    
    return false;
  }
}

// Add Cloud class - using spheres as requested
class Cloud {
  mesh: THREE.Group;
  speed: number;
  scene: THREE.Scene;
  
  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    console.log("Creating cloud at position:", position);
    
    // Create a group for the cloud
    const cloudGroup = new THREE.Group();
    
    // Create spheres with subtle color variations between white and light gray
    const getCloudColor = () => {
      // Create a random light color between white and very light gray
      const brightness = 0.92 + Math.random() * 0.08; // Values between 0.92 and 1.0
      return new THREE.Color(brightness, brightness, brightness);
    };
    
    // Choose randomly between different cloud designs
    const cloudDesignType = Math.floor(Math.random() * 4); // 0-3 designs
    
    if (cloudDesignType === 0) {
      // Original design: face with two ears
      this.createFaceAndEars(cloudGroup, getCloudColor);
    } else if (cloudDesignType === 1) {
      // Fluffy cumulus design: multiple overlapping spheres without face
      this.createCumulusCloud(cloudGroup, getCloudColor);
    } else if (cloudDesignType === 2) {
      // Long stretched cloud
      this.createStretchedCloud(cloudGroup, getCloudColor);
    } else {
      // Simple round puffy cloud
      this.createPuffyCloud(cloudGroup, getCloudColor);
    }
    
    // Set cloud group position
    this.mesh = cloudGroup;
    this.mesh.position.copy(position);
    
    // Scale the entire cloud - reduced by 50%
    const scale = 0.75 + Math.random() * 0.5; // Range: 0.75-1.25 (down from 1.5-2.5)
    this.mesh.scale.set(scale, scale, scale);
    
    // Set cloud speed - slower movement
    this.speed = 0.003 + Math.random() * 0.004; // Reduced from 0.01-0.02 to 0.003-0.007
    this.scene = scene;
    
    scene.add(this.mesh);
    console.log("Added cloud to scene at", this.mesh.position);
  }
  
  // Original design with face and ears
  createFaceAndEars(cloudGroup: THREE.Group, getCloudColor: () => THREE.Color) {
    const sphereGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const mainMaterial = new THREE.MeshBasicMaterial({ color: getCloudColor() });
    const mainSphere = new THREE.Mesh(sphereGeometry, mainMaterial);
    
    // Scale down the main sphere slightly
    mainSphere.scale.set(0.9, 0.9, 0.9);
    cloudGroup.add(mainSphere);
    
    // Add additional spheres as ears
    const positions = [
      { x: -1, y: 0.3, z: 0 },
      { x: 1, y: 0.3, z: 0 },
      { x: 0, y: 0.5, z: 0 }
    ];
    
    positions.forEach(pos => {
      // Each sphere gets its own slight color variation
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: getCloudColor() });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(pos.x, pos.y, pos.z);
      // Make additional spheres smaller
      sphere.scale.set(0.6, 0.4, 0.6);
      cloudGroup.add(sphere);
    });
  }
  
  // Fluffy cumulus cloud with many overlapping spheres
  createCumulusCloud(cloudGroup: THREE.Group, getCloudColor: () => THREE.Color) {
    const sphereGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    
    // Create a base of 5-7 overlapping spheres
    const numSpheres = 5 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numSpheres; i++) {
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: getCloudColor() });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      
      // Position spheres in a roughly horizontal line with some variation
      const xOffset = -1.5 + (i * (3 / numSpheres));
      const yOffset = Math.random() * 0.4 - 0.2;
      const zOffset = Math.random() * 0.4 - 0.2;
      
      sphere.position.set(xOffset, yOffset, zOffset);
      
      // Randomize scale slightly
      const scale = 0.7 + Math.random() * 0.6;
      sphere.scale.set(scale, scale * 0.8, scale);
      
      cloudGroup.add(sphere);
    }
    
    // Add a few top spheres for height
    const topSpheres = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < topSpheres; i++) {
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: getCloudColor() });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      
      // Position on top of the base, offset horizontally
      const xOffset = -0.8 + Math.random() * 1.6;
      const yOffset = 0.4 + Math.random() * 0.3;
      const zOffset = Math.random() * 0.3 - 0.15;
      
      sphere.position.set(xOffset, yOffset, zOffset);
      
      // Make top spheres smaller
      const scale = 0.5 + Math.random() * 0.4;
      sphere.scale.set(scale, scale, scale);
      
      cloudGroup.add(sphere);
    }
  }
  
  // Long stretched cloud
  createStretchedCloud(cloudGroup: THREE.Group, getCloudColor: () => THREE.Color) {
    const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    
    // Create a line of spheres for elongated shape
    const length = 4 + Math.random() * 2; // Cloud length
    const numSpheres = 6 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numSpheres; i++) {
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: getCloudColor() });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      
      // Position along a line with slight vertical variation
      const t = i / (numSpheres - 1); // 0 to 1 parameter
      const xOffset = -length/2 + t * length;
      const yOffset = Math.sin(t * Math.PI) * 0.2; // Slight arch in the middle
      const zOffset = Math.random() * 0.3 - 0.15;
      
      sphere.position.set(xOffset, yOffset, zOffset);
      
      // Vary the size slightly, with middle spheres larger
      const heightFactor = 0.7 + Math.sin(t * Math.PI) * 0.5;
      const scale = (0.7 + Math.random() * 0.3) * heightFactor;
      sphere.scale.set(scale, scale * 0.8, scale);
      
      cloudGroup.add(sphere);
    }
  }
  
  // Simple puffy cloud - just a few large spheres
  createPuffyCloud(cloudGroup: THREE.Group, getCloudColor: () => THREE.Color) {
    const sphereGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const mainMaterial = new THREE.MeshBasicMaterial({ color: getCloudColor() });
    const mainSphere = new THREE.Mesh(sphereGeometry, mainMaterial);
    cloudGroup.add(mainSphere);
    
    // Add 2-3 additional spheres in various positions
    const numSpheres = 2 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < numSpheres; i++) {
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: getCloudColor() });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      
      // Random position around the center
      const angle = Math.random() * Math.PI * 2;
      const distance = 0.6 + Math.random() * 0.4;
      const xOffset = Math.cos(angle) * distance;
      const yOffset = (Math.random() * 0.6) - 0.3;
      const zOffset = Math.sin(angle) * distance * 0.5;
      
      sphere.position.set(xOffset, yOffset, zOffset);
      
      // Random scale
      const scale = 0.6 + Math.random() * 0.4;
      sphere.scale.set(scale, scale, scale);
      
      cloudGroup.add(sphere);
    }
  }
  
  update() {
    // Move cloud horizontally - at slow speed
    this.mesh.position.x += this.speed;
    
    // If cloud moves out of view, reset to the left
    if (this.mesh.position.x > 15) {
      this.mesh.position.x = -15;
      console.log("Cloud reset to position:", this.mesh.position);
    }
  }
}

const Scene = forwardRef<any, SceneProps>(({ gameActive, onMoleHit, config }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const molesRef = useRef<any[]>([]);
  const animationFrameRef = useRef<number>();
  const confettiRef = useRef<Confetti[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const lastUpdateTime = useRef<number>(Date.now());
  
  // Load the Comic Neue font
  useEffect(() => {
    // Add Comic Neue from Google Fonts
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Comic+Neue:wght@700&display=swap';
    document.head.appendChild(link);
    
    // Preload font by creating an invisible element
    const preloadFont = document.createElement('div');
    preloadFont.style.fontFamily = '"Comic Neue", sans-serif';
    preloadFont.style.position = 'absolute';
    preloadFont.style.visibility = 'hidden';
    preloadFont.innerText = 'Preload Comic Neue Font';
    document.body.appendChild(preloadFont);
    
    // Remove after font is loaded
    return () => {
      document.body.removeChild(preloadFont);
    };
  }, []);

  // Function to get a random word and determine if it should be correct
  const getRandomWord = () => {
    // Get the current category's words (first category is always point-generating)
    const pointGeneratingCategory = config.categories[0];
    const pointGeneratingWords = pointGeneratingCategory.words;
    
    // 70% chance to show a point-generating word
    const shouldShowPointGeneratingWord = Math.random() < 0.7;
    
    if (shouldShowPointGeneratingWord) {
      // Pick a random word from the point-generating category
      const word = pointGeneratingWords[Math.floor(Math.random() * pointGeneratingWords.length)];
      console.log('Selected point-generating word:', word, 'from category:', pointGeneratingCategory.title);
      return { word, isCorrect: true };
    } else {
      // Get words from other categories for incorrect options
      const otherWords = config.categories
        .slice(1)  // Skip the first (point-generating) category
        .flatMap(cat => {
          console.log('Getting words from other category:', cat.title);
          return cat.words;
        });
      
      // Pick a random word from other categories
      const word = otherWords[Math.floor(Math.random() * otherWords.length)];
      console.log('Selected non-point-generating word:', word);
      return { word, isCorrect: false };
    }
  };

  // Update the mole text display to use Comic Neue font and show directly on the mole
  const updateMoleText = (mole: THREE.Group, word: string) => {
    const textPlane = mole.children.find(child => child.userData && child.userData.isTextPlane) as THREE.Mesh;
    
    if (textPlane && textPlane.material instanceof THREE.MeshBasicMaterial) {
      // Create a more legible and high-contrast text
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      // Higher resolution for better text quality
      canvas.width = 1024;
      canvas.height = 1024;
      
      // Clear canvas to transparent
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Load Comic Neue if not already loaded
      if (!document.querySelector('link[href*="Comic+Neue"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Comic+Neue:wght@700&display=swap';
        document.head.appendChild(link);
      }
      
      // Set text properties for better legibility
      const fontSize = Math.min(240, 1000 / word.length); // Adjust size based on word length
      context.font = `bold ${fontSize}px "Comic Neue", "Comic Sans MS", sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      // Enable text smoothing
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      
      // Draw text with black color
      context.fillStyle = '#000000';
      context.fillText(word, canvas.width/2, canvas.height/2);
      
      // Update the texture
      if (textPlane.material.map) textPlane.material.map.dispose();
      
      // Create and apply new texture with better filtering
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearMipmapLinearFilter; // Use mipmapping for better quality at distance
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = rendererRef.current ? rendererRef.current.capabilities.getMaxAnisotropy() : 1;
      texture.needsUpdate = true;
      
      textPlane.material.map = texture;
      textPlane.material.needsUpdate = true;
    }
  };
  
  // Create more expressive and engaging mole
  const createMole = () => {
    const moleGroup = new THREE.Group();
    
    // Create body - use egg shape for more character
    const bodyGeometry = new THREE.SphereGeometry(0.5, 32, 24);
    // Stretch vertically and narrow at the bottom to create egg shape
    bodyGeometry.scale(1, 1.3, 1);
    
    // More natural mole color
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xE6D5AC, // Warm beige
      roughness: 0.8,
      metalness: 0.1,
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    moleGroup.add(body);
    
    // Create physical eyes (in addition to the face texture)
    const createEyes = () => {
      // Eye group
      const eyesGroup = new THREE.Group();
      
      // Create eye whites
      const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 12);
      const eyeWhiteMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        roughness: 0.3,
        metalness: 0.2,
      });
      
      // Left eye
      const leftEye = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
      leftEye.position.set(-0.15, 0.36, 0.4);
      eyesGroup.add(leftEye);
      
      // Right eye
      const rightEye = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
      rightEye.position.set(0.15, 0.36, 0.4);
      eyesGroup.add(rightEye);
      
      // Create pupils
      const pupilGeometry = new THREE.SphereGeometry(0.04, 12, 8);
      const pupilMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0.5,
        metalness: 0.1,
      });
      
      // Left pupil
      const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      leftPupil.position.set(-0.15, 0.36, 0.47);
      eyesGroup.add(leftPupil);
      
      // Right pupil
      const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      rightPupil.position.set(0.15, 0.36, 0.47);
      eyesGroup.add(rightPupil);
      
      return eyesGroup;
    };
    
    // Add eyes to mole
    const eyes = createEyes();
    moleGroup.add(eyes);
    
    // Create random hairstyle
    const createHair = () => {
      const hairGroup = new THREE.Group();
      const hairType = Math.floor(Math.random() * 6); // 0-5 different hairstyles
      
      switch (hairType) {
        case 0: // Mohawk
          const mohawkColor = new THREE.Color(
            Math.random() > 0.7 ? 0xFF5500 : // Orange
            Math.random() > 0.5 ? 0x3D2314 : 0x583A27 // Brown
          );
          
          const mohawkHeight = 0.2 + Math.random() * 0.15;
          const mohawkGeometry = new THREE.BoxGeometry(0.1, mohawkHeight, 0.4);
          const mohawkMaterial = new THREE.MeshStandardMaterial({
            color: mohawkColor,
            roughness: 0.9,
            metalness: 0.1,
          });
          
          const mohawk = new THREE.Mesh(mohawkGeometry, mohawkMaterial);
          mohawk.position.set(0, 0.6, 0.05);
          
          // Distort for more natural look
          const positions = mohawkGeometry.attributes.position;
          for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            // Add random variation to x and z for spiky look
            const newX = x + (Math.random() - 0.5) * 0.05;
            const newZ = z + (Math.random() - 0.5) * 0.05;
            
            positions.setXYZ(i, newX, y, newZ);
          }
          
          mohawkGeometry.computeVertexNormals();
          hairGroup.add(mohawk);
          break;
          
        case 1: // Curly hair
          const curlColor = new THREE.Color(Math.random() > 0.6 ? 0x291709 : 0x583A27);
          const curlCount = 8 + Math.floor(Math.random() * 6); // 8-13 curls
          
          for (let i = 0; i < curlCount; i++) {
            const angle = (i / curlCount) * Math.PI * 2;
            const radius = 0.35 + (Math.random() * 0.1);
            
            const curlGeometry = new THREE.TorusGeometry(0.04, 0.02, 8, 6, Math.PI * 1.5);
            const curlMaterial = new THREE.MeshStandardMaterial({
              color: curlColor,
              roughness: 0.9,
              metalness: 0.1,
            });
            
            const curl = new THREE.Mesh(curlGeometry, curlMaterial);
            curl.position.set(
              Math.cos(angle) * 0.25,
              0.55,
              Math.sin(angle) * 0.25
            );
            
            // Random rotation for variety
            curl.rotation.x = Math.random() * Math.PI;
            curl.rotation.y = Math.random() * Math.PI;
            curl.rotation.z = Math.random() * Math.PI;
            
            hairGroup.add(curl);
          }
          break;
          
        case 2: // Flat top
          const flatTopColor = new THREE.Color(Math.random() > 0.5 ? 0x3D2314 : 0x583A27);
          const flatTopGeometry = new THREE.CylinderGeometry(0.3, 0.35, 0.12, 12);
          const flatTopMaterial = new THREE.MeshStandardMaterial({
            color: flatTopColor,
            roughness: 0.9,
            metalness: 0.1,
          });
          
          const flatTop = new THREE.Mesh(flatTopGeometry, flatTopMaterial);
          flatTop.position.set(0, 0.65, 0);
          hairGroup.add(flatTop);
          
          // Add some small tufts on top for character
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const tuftGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
            const tuft = new THREE.Mesh(tuftGeometry, flatTopMaterial);
            
            tuft.position.set(
              Math.cos(angle) * 0.15,
              0.72,
              Math.sin(angle) * 0.15
            );
            
            // Random rotation for variety
            tuft.rotation.x = Math.random() * Math.PI * 0.2;
            tuft.rotation.y = Math.random() * Math.PI * 0.2;
            tuft.rotation.z = Math.random() * Math.PI * 0.2;
            
            hairGroup.add(tuft);
          }
          break;
          
        case 3: // Pompadour (Elvis style)
          const pompadourColor = new THREE.Color(Math.random() > 0.7 ? 0x191007 : 0x3D2314);
          
          // Main pompadour volume
          const pompadourGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.25, 16, 1, false, 0, Math.PI);
          pompadourGeometry.rotateX(Math.PI / 2);
          pompadourGeometry.rotateY(Math.PI);
          
          const pompadourMaterial = new THREE.MeshStandardMaterial({
            color: pompadourColor,
            roughness: 0.8,
            metalness: 0.1,
          });
          
          const pompadour = new THREE.Mesh(pompadourGeometry, pompadourMaterial);
          pompadour.position.set(0, 0.6, 0.2);
          
          // Add wave detail to pompadour
          const waveCount = 3;
          for (let i = 0; i < waveCount; i++) {
            const waveGeometry = new THREE.TorusGeometry(0.15, 0.05, 8, 12, Math.PI * 0.8);
            const wave = new THREE.Mesh(waveGeometry, pompadourMaterial);
            
            wave.position.set(0, 0.55 + i * 0.08, 0.15 - i * 0.05);
            wave.rotation.x = Math.PI / 2;
            wave.scale.set(1.2, 0.7, 1);
            
            hairGroup.add(wave);
          }
          
          // Sides
          const sideGeometry = new THREE.BoxGeometry(0.5, 0.18, 0.3);
          sideGeometry.translate(0, -0.1, 0); // Move pivot point
          
          const side = new THREE.Mesh(sideGeometry, pompadourMaterial);
          side.position.set(0, 0.5, 0);
          
          hairGroup.add(pompadour);
          hairGroup.add(side);
          break;
          
        case 4: // Bowl cut
          const bowlColor = new THREE.Color(Math.random() > 0.6 ? 0x191007 : 0x3D2314);
          
          // Bowl shape - using half sphere for the top and manually clipping
          const bowlGeometry = new THREE.SphereGeometry(0.35, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
          
          const bowlMaterial = new THREE.MeshStandardMaterial({
            color: bowlColor,
            roughness: 0.9,
            metalness: 0.05,
          });
          
          // Position the half-sphere so it sits at the right height
          const bowl = new THREE.Mesh(bowlGeometry, bowlMaterial);
          bowl.position.set(0, 0.68, 0);
          hairGroup.add(bowl);
          
          // Create rim around the bottom edge of the bowl
          const rimGeometry = new THREE.TorusGeometry(0.35, 0.04, 16, 32, Math.PI * 2);
          const rimMaterial = new THREE.MeshStandardMaterial({
            color: bowlColor,
            roughness: 0.9,
            metalness: 0.05,
          });
          
          const rim = new THREE.Mesh(rimGeometry, rimMaterial);
          rim.rotation.x = Math.PI / 2;
          rim.position.set(0, 0.51, 0);
          hairGroup.add(rim);
          
          // Add some bangs
          for (let i = 0; i < 8; i++) {
            const angle = -Math.PI / 4 + (i / 7) * Math.PI * 1.5;
            const bangLength = 0.1 + Math.random() * 0.08;
            
            const bangGeometry = new THREE.BoxGeometry(0.08, bangLength, 0.04);
            const bang = new THREE.Mesh(bangGeometry, bowlMaterial);
            
            const radius = 0.35;
            bang.position.set(
              Math.cos(angle) * radius * 0.85,
              0.55,
              Math.sin(angle) * radius * 0.85
            );
            
            bang.rotation.x = Math.PI * 0.45;
            bang.rotation.y = -angle;
            
            hairGroup.add(bang);
          }
          break;
          
        case 5: // Afro
          const afroColor = new THREE.Color(Math.random() > 0.5 ? 0x191007 : 0x3D2314);
          
          // Main afro volume - use a spherical shape
          const afroGeometry = new THREE.SphereGeometry(0.35, 32, 32);
          const afroMaterial = new THREE.MeshStandardMaterial({
            color: afroColor,
            roughness: 1.0,
            metalness: 0.0,
          });
          
          const afro = new THREE.Mesh(afroGeometry, afroMaterial);
          afro.position.set(0, 0.68, 0);
          
          // Distort the afro shape for more natural look
          const afroPositions = afroGeometry.attributes.position;
          for (let i = 0; i < afroPositions.count; i++) {
            const x = afroPositions.getX(i);
            const y = afroPositions.getY(i);
            const z = afroPositions.getZ(i);
            
            // Add random variation to create the "curly" appearance
            const distortAmount = 0.06;
            const newX = x + (Math.random() - 0.5) * distortAmount;
            const newY = y + (Math.random() - 0.5) * distortAmount;
            const newZ = z + (Math.random() - 0.5) * distortAmount;
            
            afroPositions.setXYZ(i, newX, newY, newZ);
          }
          afroGeometry.computeVertexNormals();
          
          // Add small curls sticking out
          const curlsCount = 20;
          for (let i = 0; i < curlsCount; i++) {
            // Generate points on sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            const x = Math.sin(phi) * Math.cos(theta);
            const y = Math.cos(phi);
            const z = Math.sin(phi) * Math.sin(theta);
            
            // Create small spheres for the curls
            const curlSize = 0.04 + Math.random() * 0.04;
            const curlGeometry = new THREE.SphereGeometry(curlSize, 8, 8);
            const curl = new THREE.Mesh(curlGeometry, afroMaterial);
            
            // Position on surface of afro
            const radius = 0.35;
            curl.position.set(
              x * radius * 1.1,
              y * radius * 1.1 + 0.68,
              z * radius * 1.1
            );
            
            // Only add if above the midpoint of the head
            if (curl.position.y >= 0.55) {
              hairGroup.add(curl);
            }
          }
          
          hairGroup.add(afro);
          break;
      }
      
      return hairGroup;
    };
    
    // Add random hair to some moles (70% chance)
    if (Math.random() < 0.7) {
      const hair = createHair();
      moleGroup.add(hair);
    }
    
    // Create a texture for facial expressions that can be updated
    const createFaceCanvas = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return canvas;
      
      canvas.width = 256;
      canvas.height = 256;
      
      // Clear to transparent
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      return canvas;
    };
    
    // Create face texture and material
    const faceCanvas = createFaceCanvas();
    const faceTexture = new THREE.CanvasTexture(faceCanvas);
    const faceMaterial = new THREE.MeshBasicMaterial({
      map: faceTexture,
      transparent: true,
      side: THREE.FrontSide,
    });
    
    // Add face plane - positioned slightly in front of the mole
    const faceGeometry = new THREE.PlaneGeometry(0.7, 0.7);
    const facePlane = new THREE.Mesh(faceGeometry, faceMaterial);
    facePlane.position.set(0, 0.2, 0.48); // At eye level, slightly forward
    facePlane.userData.isFacePlane = true;
    moleGroup.add(facePlane);
    
    // Text plane for word display - make it larger to cover more of the mole's body
    const textGeometry = new THREE.PlaneGeometry(0.9, 0.9);
    const textCanvas = document.createElement('canvas');
    const textContext = textCanvas.getContext('2d');
    
    if (textContext) {
      textCanvas.width = 512;
      textCanvas.height = 512;
      textContext.clearRect(0, 0, textCanvas.width, textCanvas.height);
    }
    
    const textTexture = new THREE.CanvasTexture(textCanvas);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: textTexture,
      transparent: true,
    });
    
    const textPlane = new THREE.Mesh(textGeometry, textMaterial);
    textPlane.position.set(0, 0, 0.5); // Position directly on the front surface
    textPlane.userData.isTextPlane = true;
    moleGroup.add(textPlane);
    
    // Function to update the mole's expression
    const updateMoleExpression = (mole: THREE.Group, state: 'neutral' | 'surprised' | 'hit' | 'happy') => {
      const facePlane = mole.children.find(child => child.userData && child.userData.isFacePlane) as THREE.Mesh;
      
      if (facePlane && facePlane.material instanceof THREE.MeshBasicMaterial && facePlane.material.map) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;
        
        canvas.width = 256;
        canvas.height = 256;
        
        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // For most expression types, we'll use the eyes from 3D objects
        // and only draw the mouth on the texture
        
        // Draw different expressions based on state
        switch (state) {
          case 'neutral':
            // Only draw a mouth since we have 3D eyes
            context.strokeStyle = '#000000';
            context.lineWidth = 6;
            context.beginPath();
            context.moveTo(90, 150);
            context.quadraticCurveTo(128, 170, 166, 150);
            context.stroke();
            break;
            
          case 'surprised':
            // Open mouth
            context.fillStyle = '#000000';
            context.beginPath();
            context.arc(128, 160, 25, 0, Math.PI);
            context.fill();
            break;
            
          case 'hit':
            // Frowning mouth
            context.strokeStyle = '#000000';
            context.lineWidth = 6;
            context.beginPath();
            context.moveTo(90, 160);
            context.quadraticCurveTo(128, 140, 166, 160);
            context.stroke();
            break;
            
          case 'happy':
            // Big smile with teeth
            context.fillStyle = '#FFFFFF';
            context.beginPath();
            context.moveTo(85, 150);
            context.quadraticCurveTo(128, 190, 171, 150);
            context.quadraticCurveTo(128, 170, 85, 150);
            context.fill();
            
            // Smile line
            context.strokeStyle = '#000000';
            context.lineWidth = 4;
            context.beginPath();
            context.moveTo(85, 150);
            context.quadraticCurveTo(128, 190, 171, 150);
            context.stroke();
            
            // Teeth lines
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(128, 170);
            context.lineTo(128, 185);
            context.moveTo(108, 167);
            context.lineTo(108, 177);
            context.moveTo(148, 167);
            context.lineTo(148, 177);
            context.stroke();
            break;
        }
        
        // Update texture
        const texture = new THREE.CanvasTexture(canvas);
        facePlane.material.map.dispose();
        facePlane.material.map = texture;
        facePlane.material.needsUpdate = true;
      }
    };
    
    // Store the update expression function in userData
    moleGroup.userData.updateExpression = updateMoleExpression;
    
    // Set initial expression
    if (moleGroup.userData.updateExpression) {
      moleGroup.userData.updateExpression(moleGroup, 'neutral');
    }
    
    // Make the mole group available to raycaster for hit detection
    moleGroup.userData.isMole = true;
    
    // Lean the mole back 5 degrees
    moleGroup.rotation.x = -Math.PI * 5 / 180;
    
    return moleGroup;
  };
  
  // Update the showRandomMole function - this is a stub that won't be used
  const showRandomMole = () => {
    console.log('WARNING: Stub showRandomMole function called outside of game loop - this should not happen');
    
    // Log the call stack to identify where this is being called from
    console.trace('Stack trace for unwanted showRandomMole call:');
  };
  
  // Update the scheduleNextMole function - this is a stub that won't be used
  const scheduleNextMole = () => {
    console.log('WARNING: Stub scheduleNextMole function called outside of game loop - this should not happen');
  };

  // Update handleClick to change expression when hit
  const handleClick = (event: MouseEvent | TouchEvent) => {
    if (!gameActive) return;
    
    // Get mouse/touch position
    const mouse = new THREE.Vector2();
    let clientX, clientY;
    
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update raycaster
    raycasterRef.current.setFromCamera(mouse, cameraRef.current!);
    
    // Check for intersections with moles
    const moleObjects: THREE.Object3D[] = [];
    molesRef.current.forEach((mole: THREE.Object3D) => {
      if (mole.userData.isVisible) {
        mole.traverse((object: THREE.Object3D) => {
          if (object instanceof THREE.Mesh) {
            moleObjects.push(object);
          }
        });
      }
    });
    
    const intersects = raycasterRef.current.intersectObjects(moleObjects);
    
    if (intersects.length > 0) {
      // Find the parent mole of the intersected object
      let hitObject = intersects[0].object;
      let mole = hitObject;
      
      // Traverse up to find the mole group
      while (mole.parent && !mole.userData.isMole) {
        mole = mole.parent;
      }
      
      if (mole.userData.isMole && mole.userData.isVisible && !mole.userData.isHit) {
        // Mark as hit to prevent double hits
        mole.userData.isHit = true;
        
        // Change expression to hit
        if (mole.userData.updateExpression) {
          mole.userData.updateExpression(mole as THREE.Group, 'hit');
        }
        
        // Call onMoleHit callback
        onMoleHit(mole.userData.word, mole.userData.isCorrect);
        
        // Animation and effect for hit
        animateMole(mole as THREE.Group, false);
        createExplosionEffect(mole.position.clone());
        
        // After animation completes
        setTimeout(() => {
          mole.userData.isVisible = false;
          mole.userData.isHit = false;
          
          // Reset expression
          if (mole.userData.updateExpression) {
            mole.userData.updateExpression(mole, 'neutral');
          }
        }, 300);
      }
    }
  };

  // Create scene function
  const createScene = () => {
    if (!containerRef.current) return () => {};

    console.log("Creating scene...");
    
    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera with closer zoom to make moles larger
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 6, 8); // Moved even closer (was 0, 7, 10)
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Create renderer with improved shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x87CEEB, 1); // Light blue sky
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add essential lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(3, 8, 4);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 20;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    // Add very obvious clouds for testing
    cloudsRef.current = []; // Reset clouds array
    console.log("Creating sphere-based clouds...");
    
    // Create clouds at positions matching the example but higher in the sky
    const cloudPositions = [
      new THREE.Vector3(-5, 2, -7),  // Lowered from y=3 to y=2
      new THREE.Vector3(0, 3, -6),   // Lowered from y=4 to y=3
      new THREE.Vector3(5, 2, -7)    // Lowered from y=3 to y=2
    ];
    
    cloudPositions.forEach((position, i) => {
      console.log(`Creating cloud ${i} at ${position.x}, ${position.y}, ${position.z}`);
      const cloud = new Cloud(scene, position);
      cloudsRef.current.push(cloud);
    });
    
    // Add a few extra clouds at even higher positions
    for (let i = 0; i < 2; i++) {
      const position = new THREE.Vector3(
        -10 + Math.random() * 20,  // -10 to 10
        2.5 + Math.random() * 2,   // Lowered from 3.5-6 to 2.5-4.5
        -8 + Math.random() * 3     // Further back: -8 to -5
      );
      console.log(`Creating extra cloud at ${position.x}, ${position.y}, ${position.z}`);
      const cloud = new Cloud(scene, position);
      cloudsRef.current.push(cloud);
    }
    
    console.log(`Created ${cloudsRef.current.length} clouds`);

    // Set up the scene with terrain, holes, and moles
    createEnhancedTerrain(scene);
    setupHolesAndMoles(scene);
    
    // Initialize the raycaster
    raycasterRef.current = new THREE.Raycaster();
    
    // Start rendering
    let lastTime = Date.now();
    function animate() {
      if (!rendererRef.current) return;
      
      // Update time tracking
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      // Update clouds with explicit logging
      if (cloudsRef.current && cloudsRef.current.length > 0) {
        cloudsRef.current.forEach((cloud, i) => {
          if (cloud && cloud.update) {
            cloud.update();
          } else {
            console.error(`Cloud ${i} is invalid:`, cloud);
          }
        });
      } else {
        console.warn("No clouds to update");
      }
      
      // Update confetti
      confettiRef.current.forEach((confetti, index) => {
        confetti.update(deltaTime);
        if (confetti.mesh.position.y < -5) {
          scene.remove(confetti.mesh);
          confettiRef.current.splice(index, 1);
        }
      });
      
      rendererRef.current.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Log camera position periodically for debugging
      if (currentTime - lastUpdateTime.current > 5000) { // Every 5 seconds
        lastUpdateTime.current = currentTime;
        console.log("Camera position:", camera.position);
        console.log("Number of clouds:", cloudsRef.current.length);
        console.log("Scene children:", scene.children.length);
      }
    }
    
    // Start animation
    animate();
    
    // Handle window resize
    function handleResize() {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    }
    
    window.addEventListener('resize', handleResize);
    containerRef.current.addEventListener('mousedown', handleClick);
    containerRef.current.addEventListener('touchstart', handleClick, { passive: true });
    
    // Return cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousedown', handleClick);
        containerRef.current.removeEventListener('touchstart', handleClick);
        if (rendererRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  };

  // Create enhanced terrain with optimized grass
  const createEnhancedTerrain = (scene: THREE.Scene) => {
    // Create circular ground geometry instead of square plane
    const radius = 10; // Radius of the circle
    const segments = 96; // Increased segment count for smoother edge (was 64)
    const groundGeometry = new THREE.CircleGeometry(radius, segments);
    
    // Higher amplitude and lower frequency for more pronounced hills and valleys
    const A = 0.2; // Amplitude for main undulations
    const B = 0.25; // Frequency for main undulations

    // Create edge undulation parameters
    const edgeA = 0.4; // More pronounced amplitude for edges (was 0.2)
    const edgeB = 0.15; // Smoother frequency for edges (lower value = smoother waves)
    
    // Create a UV grid for texture regions
    const positionAttribute = groundGeometry.getAttribute('position');
    const uvAttribute = groundGeometry.getAttribute('uv');
    
    // Create patch data - each patch has:
    // - center coordinates (u,v in UV space, 0-1 range)
    // - radius (in UV space, 0-1 range)
    // - color (hex)
    // - height multiplier (to make some patches higher or lower)
    const patches = [
      { centerU: 0.3, centerV: 0.7, radius: 0.27, color: 0xE57373, heightMult: 1.2 },  // red - increased radius
      { centerU: 0.7, centerV: 0.6, radius: 0.25, color: 0x81C784, heightMult: 0.8 },   // green - increased radius
      { centerU: 0.2, centerV: 0.3, radius: 0.23, color: 0x9575CD, heightMult: 1.4 },   // purple - increased radius
      { centerU: 0.6, centerV: 0.2, radius: 0.28, color: 0x4FC3F7, heightMult: 0.6 },   // blue - increased radius
      { centerU: 0.5, centerV: 0.5, radius: 0.18, color: 0xFFB74D, heightMult: 1.0 }    // orange - increased radius and moved to center
    ];
    
    // Create a noise generator for additional central noise
    const createCentralNoise = (x: number, y: number, normalizedDist: number): number => {
      // Generate some procedural noise based on position
      const noise1 = Math.sin(x * 4.7 + y * 3.2) * Math.cos(y * 2.3 - x * 1.9) * 0.1;
      const noise2 = Math.sin(x * 7.5 + y * 5.7) * Math.cos(y * 4.3 - x * 3.1) * 0.05;
      
      // Inverse distance factor - stronger in center, weaker at edges
      const centerFactor = 1.0 - Math.min(normalizedDist * 2.5, 1.0);
      
      // Apply more noise in the center, less at the edges
      return (noise1 + noise2) * centerFactor;
    };
    
    // Prepare vertex colors to color our patches
    const colorAttribute = new THREE.Float32BufferAttribute(positionAttribute.count * 3, 3);
    const baseColor = new THREE.Color(0x4CAF50); // Base green color for areas outside patches
    
    // Modify vertices for height and store patch colors
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      const u = uvAttribute.getX(i);
      const v = uvAttribute.getY(i);
      
      // Set center vertex to match surrounding terrain height instead of random value
      if (x === 0 && y === 0 && i === 0) {
        // Instead of a random offset, use a calculated height based on nearby vertices
        // Pick a specific height that blends with the terrain - this is key to hiding the center point
        const centerHeight = 0.08; // Slightly positive value to create a small hill
        positionAttribute.setZ(i, centerHeight);
        
        // Special coloring for center to better blend
        colorAttribute.setXYZ(i, baseColor.r, baseColor.g, baseColor.b);
        continue;
      }
      
      // Calculate distance from center for edge detection
      const distFromCenter = Math.sqrt(x*x + y*y);
      const normalizedDist = distFromCenter / radius;
      
      // Default height multiplier and color
      let heightMultiplier = 1.0;
      let vertexColor = new THREE.Color(baseColor);
      
      // Check if this vertex is in any patch
      for (const patch of patches) {
        // Calculate distance from patch center in UV space
        const du = u - patch.centerU;
        const dv = v - patch.centerV;
        const distSq = du*du + dv*dv;
        
        if (distSq < patch.radius * patch.radius) {
          // Inside patch
          const patchColor = new THREE.Color(patch.color);
          
          // Smooth blend at the edges using cubic falloff
          const dist = Math.sqrt(distSq);
          const edgeDist = (patch.radius - dist) / patch.radius;
          const blend = Math.pow(edgeDist, 2.5); // less steep falloff for more visible patches
          
          // Blend color - increase visibility of patch colors by increasing blend factor
          vertexColor.r = baseColor.r * (0.6 - blend * 0.6) + patchColor.r * blend;
          vertexColor.g = baseColor.g * (0.6 - blend * 0.6) + patchColor.g * blend;
          vertexColor.b = baseColor.b * (0.6 - blend * 0.6) + patchColor.b * blend;
          
          // Height multiplier
          heightMultiplier = 1.0 * (1 - blend) + patch.heightMult * blend;
          break; // Stop at the first patch found
        }
      }
      
      // Apply a subtle color variation based on noise to break up uniformity
      // This helps reduce the center point appearance
      const colorNoise = (Math.sin(x * 8.3 + y * 7.1) * 0.03) + (Math.cos(x * 9.8 + y * 6.3) * 0.02);
      vertexColor.r = Math.max(0, Math.min(1, vertexColor.r + colorNoise));
      vertexColor.g = Math.max(0, Math.min(1, vertexColor.g + colorNoise));
      vertexColor.b = Math.max(0, Math.min(1, vertexColor.b + colorNoise * 0.5));
      
      // Store the color
      colorAttribute.setXYZ(i, vertexColor.r, vertexColor.g, vertexColor.b);
      
      // Apply height using noise functions for natural-looking terrain
      // First a smoother base undulation
      const baseZ = A * Math.sin(B * x) + A * Math.cos(B * y);
      
      // Add additional noise-based variation
      const noiseZ = 0.05 * Math.sin(x * 3 + y * 2) * Math.cos(x - y) +
                    0.05 * Math.cos(x * 5) * Math.sin(y * 3);
      
      // Edge-specific undulation - stronger near the edges, fading toward center
      // Create smoother wavelike pattern around the edge with phase based on polar angle
      const polarAngle = Math.atan2(y, x); 
      const edgeWave = Math.sin(polarAngle * 8) * 0.5 + Math.sin(polarAngle * 5) * 0.3 + Math.sin(polarAngle * 3) * 0.2;
      
      // Use a more gradual transition from center to edge
      // Changed from a higher power (2.5) to a more linear equation with a small curve
      // This creates a smoother gradient that affects more of the terrain
      const edgeFactor = normalizedDist * (0.3 + 0.7 * normalizedDist); // More gradual transition
      const edgeZ = edgeA * edgeWave * edgeFactor;
      
      // Apply additional central noise that's stronger in the middle
      const centralNoiseZ = createCentralNoise(x, y, normalizedDist);
      
      // Apply combined height with patch multiplier
      const z = (baseZ + noiseZ + edgeZ + centralNoiseZ) * heightMultiplier;
      positionAttribute.setZ(i, z);
    }
    
    // Add the color attribute to the geometry
    groundGeometry.setAttribute('color', colorAttribute);
    
    // Update normals for proper lighting
    groundGeometry.computeVertexNormals();
    
    // Create multiple canvases for different grass textures
    const textureSize = 256;
    const textures: THREE.Texture[] = [];
    
    // Create base grass texture - completely new implementation to remove all pattern lines
    const createGrassTexture = (color: string, noiseLevel: number = 0.2) => {
      // Higher resolution texture
      const textureSize = 1024;
      const canvas = document.createElement('canvas');
      canvas.width = textureSize;
      canvas.height = textureSize;
      const ctx = canvas.getContext('2d')!;
      
      // First create a noise-based gradient for the base
      // Use a radial gradient to avoid directional patterns
      const gradient = ctx.createRadialGradient(
        textureSize/2, textureSize/2, 0,
        textureSize/2, textureSize/2, textureSize * 0.7
      );
      
      // Deep soil colors
      gradient.addColorStop(0, 'rgb(65, 45, 30)');
      gradient.addColorStop(0.7, 'rgb(60, 40, 25)');
      gradient.addColorStop(1, 'rgb(55, 35, 20)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, textureSize, textureSize);
      
      // Parse the base grass color
      const baseRgb = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(color);
      let baseR = 90, baseG = 160, baseB = 60;
      
      if (baseRgb) {
        baseR = parseInt(baseRgb[1]);
        baseG = parseInt(baseRgb[2]);
        baseB = parseInt(baseRgb[3]);
      }
      
      // Function to generate non-directional noise value at x,y
      const noise = (x: number, y: number, frequency: number) => {
        // Use multiple sine waves at different frequencies and directions
        // This creates noise without directional bias
        return (
          Math.sin(x * 7.13 * frequency + y * 3.79 * frequency) * 
          Math.cos(x * 4.21 * frequency - y * 8.11 * frequency) +
          Math.sin(x * 2.89 * frequency - y * 5.23 * frequency) * 
          Math.cos(x * 9.37 * frequency + y * 1.97 * frequency)
        ) * 0.25 + 0.5;
      };
      
      // Apply a speckled soil texture first
      const soilPixels = 15000;
      for (let i = 0; i < soilPixels; i++) {
        const x = Math.random() * textureSize;
        const y = Math.random() * textureSize;
        const size = 1 + Math.random() * 3;
        
        // Earthy colors
        const r = 60 + Math.floor(Math.random() * 30);
        const g = 40 + Math.floor(Math.random() * 20);
        const b = 20 + Math.floor(Math.random() * 20);
        const alpha = 0.2 + Math.random() * 0.3;
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        
        // Use different shapes for variety
        if (Math.random() > 0.6) {
          ctx.beginPath();
          ctx.arc(x, y, size/2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, size, size * 0.8);
        }
      }
      
      // Apply a grass pattern using noise fields to avoid regular patterns
      // We'll draw more blades in areas where noise value is higher
      const bladeCount = 30000; // Many more blades for denser coverage
      
      // Grass color variations
      const grassColors = [
        [baseR, baseG, baseB],                          // Base color
        [Math.min(255, baseR * 1.3), Math.min(255, baseG * 1.2), Math.min(255, baseB * 0.9)],  // Lighter variant
        [Math.min(255, baseR * 0.9), Math.min(255, baseG * 1.0), Math.min(255, baseB * 0.8)],  // Darker variant but still bright
        [Math.min(255, baseR * 1.25), Math.min(255, baseG * 0.95), Math.min(255, baseB * 0.7)]  // Yellow-green highlight
      ];
      
      for (let i = 0; i < bladeCount; i++) {
        const x = Math.random() * textureSize;
        const y = Math.random() * textureSize;
        
        // Sample noise at this position (normalized 0-1)
        const nx = x / textureSize;
        const ny = y / textureSize;
        
        // Use multiple noise samples at different frequencies
        const noiseVal1 = noise(nx, ny, 1);
        const noiseVal2 = noise(nx, ny, 3);
        const noiseVal3 = noise(nx, ny, 7);
        
        // Combine noise values
        const combinedNoise = (noiseVal1 * 0.5 + noiseVal2 * 0.3 + noiseVal3 * 0.2);
        
        // Skip drawing if noise is below threshold - creates natural clumping
        if (combinedNoise < 0.4) continue;
        
        // Blade parameters controlled by noise
        const length = 3 + Math.random() * 12 * combinedNoise;
        const width = 0.5 + Math.random() * 1.5 * combinedNoise;
        
        // Fully random angle to avoid patterns
        const angle = Math.random() * Math.PI * 2;
        
        // Select color based on noise and random variation
        const colorIdx = Math.floor(Math.random() * grassColors.length);
        const baseColor = grassColors[colorIdx];
        
        // Add some random variation to the color
        const r = Math.max(0, Math.min(255, baseColor[0] * (0.9 + combinedNoise * 0.2)));
        const g = Math.max(0, Math.min(255, baseColor[1] * (0.9 + combinedNoise * 0.2)));
        const b = Math.max(0, Math.min(255, baseColor[2] * (0.9 + combinedNoise * 0.2)));
        
        // Semi-transparent for blending
        const alpha = 0.4 + combinedNoise * 0.6;
        
        ctx.strokeStyle = `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${alpha})`;
        ctx.lineWidth = width;
        
        const bendFactor = Math.random() * 0.5; // How much the grass bends
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        
        // Choose between different blade types based on noise
        const bladeType = noise(nx * 10, ny * 10, 0.5); // Different noise sample for blade type
        
        if (bladeType < 0.3) {
          // Straight blade
          ctx.lineTo(
            x + Math.cos(angle) * length,
            y + Math.sin(angle) * length
          );
        } else if (bladeType < 0.6) {
          // Curved blade
          const controlX = x + Math.cos(angle + bendFactor) * (length * 0.5);
          const controlY = y + Math.sin(angle + bendFactor) * (length * 0.5);
          const endX = x + Math.cos(angle) * length;
          const endY = y + Math.sin(angle) * length;
          
          ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        } else {
          // S-curve blade
          const cp1x = x + Math.cos(angle - bendFactor) * (length * 0.3);
          const cp1y = y + Math.sin(angle - bendFactor) * (length * 0.3);
          const cp2x = x + Math.cos(angle + bendFactor) * (length * 0.6);
          const cp2y = y + Math.sin(angle + bendFactor) * (length * 0.6);
          const endX = x + Math.cos(angle) * length;
          const endY = y + Math.sin(angle) * length;
          
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        }
        
        ctx.stroke();
      }
      
      // Add some small flowers and details
      const detailsCount = 80;
      for (let i = 0; i < detailsCount; i++) {
        const x = Math.random() * textureSize;
        const y = Math.random() * textureSize;
        
        // Use noise to determine if we should place a detail here
        const nx = x / textureSize;
        const ny = y / textureSize;
        const detailNoise = noise(nx * 5, ny * 5, 2);
        
        if (detailNoise < 0.6) continue; // Skip if noise is too low
        
        const size = 2 + Math.random() * 4;
        
        // Flower colors
        const colors = [
          'rgba(255, 255, 180, 0.9)', // Yellow
          'rgba(255, 200, 200, 0.9)', // Pink
          'rgba(200, 200, 255, 0.9)', // Light blue
          'rgba(255, 180, 140, 0.9)', // Orange
          'rgba(220, 180, 255, 0.9)'  // Purple
        ];
        
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        
        // Draw the flower
        ctx.beginPath();
        ctx.arc(x, y, size/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a center
        ctx.fillStyle = 'rgba(255, 220, 100, 0.95)';
        ctx.beginPath();
        ctx.arc(x, y, size/4, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Create texture from canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      
      // Use prime numbers for tiling to avoid obvious repetition
      texture.repeat.set(5, 7);
      
      // Add a slight random rotation to further break up patterns
      texture.rotation = (Math.random() - 0.5) * 0.1;
      
      return texture;
    };
    
    // Create material with the improved texture
    const groundMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: createGrassTexture('rgb(140, 200, 90)', 0.4), // Lighter, more vibrant green
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
      flatShading: false,
      wireframe: false,
    });
    
    // Create mesh
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = -0.05; // Slightly below zero
    ground.receiveShadow = true; // Enable shadows
    
    // Add ground to scene
    scene.add(ground);
    
    // Function to get terrain height at position - update to include new edge effect calculation
    const getTerrainHeightAtPosition = (x: number, z: number): number => {
      // Constants - must match createEnhancedTerrain
      const radius = 10;
      const A = 0.2;
      const B = 0.25;
      const edgeA = 0.4;

      // Base undulation
      const baseHeight = A * Math.sin(B * x) + A * Math.cos(B * z);
      
      // Additional noise-based variation
      const noiseHeight = 0.05 * Math.sin(x * 3 + z * 2) * Math.cos(x - z) +
                        0.05 * Math.cos(x * 5) * Math.sin(z * 3);
      
      // Calculate distance from center and angle for edge effect
      const distFromCenter = Math.sqrt(x*x + z*z);
      const normalizedDist = distFromCenter / radius;
      const polarAngle = Math.atan2(z, x);
      
      // Edge wave effect - same as in vertex processing
      const edgeWave = Math.sin(polarAngle * 8) * 0.5 + Math.sin(polarAngle * 5) * 0.3 + Math.sin(polarAngle * 3) * 0.2;
      
      // Use the same modified edge factor as in the vertex processing
      const edgeFactor = normalizedDist * (0.3 + 0.7 * normalizedDist); // More gradual transition
      const edgeHeight = edgeA * edgeWave * edgeFactor;
      
      // Add central noise - same function as in vertex processing
      const centralNoise = (() => {
        const noise1 = Math.sin(x * 4.7 + z * 3.2) * Math.cos(z * 2.3 - x * 1.9) * 0.1;
        const noise2 = Math.sin(x * 7.5 + z * 5.7) * Math.cos(z * 4.3 - x * 3.1) * 0.05;
        const centerFactor = 1.0 - Math.min(normalizedDist * 2.5, 1.0);
        return (noise1 + noise2) * centerFactor;
      })();
      
      // Find which patch (if any) this position is in
      const u = (x / radius + 1) / 2;  // Convert world X to UV (0-1)
      const v = (z / radius + 1) / 2;  // Convert world Z to UV (0-1)
      
      let heightMultiplier = 1.0;
      
      // Reference the same patches from createEnhancedTerrain
      const patches = [
        { centerU: 0.3, centerV: 0.7, radius: 0.27, color: 0xE57373, heightMult: 1.2 },  // red
        { centerU: 0.7, centerV: 0.6, radius: 0.25, color: 0x81C784, heightMult: 0.8 },   // green
        { centerU: 0.2, centerV: 0.3, radius: 0.23, color: 0x9575CD, heightMult: 1.4 },   // purple
        { centerU: 0.6, centerV: 0.2, radius: 0.28, color: 0x4FC3F7, heightMult: 0.6 },   // blue
        { centerU: 0.5, centerV: 0.5, radius: 0.18, color: 0xFFB74D, heightMult: 1.0 }   // orange
      ];
      
      for (const patch of patches) {
        const du = u - patch.centerU;
        const dv = v - patch.centerV;
        const distSq = du*du + dv*dv;
        
        if (distSq < patch.radius * patch.radius) {
          const dist = Math.sqrt(distSq);
          const edgeDist = (patch.radius - dist) / patch.radius;
          const blend = Math.pow(edgeDist, 3);
          heightMultiplier = 1.0 * (1 - blend) + patch.heightMult * blend;
          break;
        }
      }
      
      return (baseHeight + noiseHeight + edgeHeight + centralNoise) * heightMultiplier;
    };
    
    // Create more realistic rocks that match the reference image 
    const createRock = (): THREE.Object3D => {
      // Create a rock group that will contain all parts
      const rockGroup = new THREE.Group();
      
      // Create a rock shape using a box geometry as a base with more segments for better shape
      const rockGeometry = new THREE.BoxGeometry(1, 0.7, 1, 5, 4, 5);
      
      // Randomize vertices to create a more natural rock shape
      const positionAttribute = rockGeometry.getAttribute('position');
      const vertex = new THREE.Vector3();
      
      // Create arrays to track bottom vertices for the flat base
      const bottomVertices: THREE.Vector3[] = [];
      
      for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);
        
        // Determine if this is a bottom vertex (we want to keep bottom flat)
        const isBottom = vertex.y < -0.3;
        
        if (isBottom) {
          // Keep bottom vertices completely flat - save for flat base creation
          bottomVertices.push(new THREE.Vector3(vertex.x, -0.35, vertex.z));
          
          // Make sure bottom vertices make a flat plane by setting exact Y
          positionAttribute.setY(i, -0.35);
        } else {
          // Less extreme displacement for non-bottom vertices
          const heightFactor = (vertex.y + 0.35) / 1.05; // Normalize height (0-1)
          
          // More displacement higher up on the rock
          const displaceFactor = Math.pow(heightFactor, 1.5) * 0.2;
          
          // Apply varying displacement based on height
          vertex.x += (Math.random() - 0.5) * displaceFactor;
          vertex.y += (Math.random() - 0.5) * displaceFactor * 0.8;
          vertex.z += (Math.random() - 0.5) * displaceFactor;
          
          // Apply the modified position
          positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
      }
      
      // Update normals after modifying geometry
      rockGeometry.computeVertexNormals();
      
      // Create a material with rock-like appearance
      const rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x7D6B53, // Brownish-gray color
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true,
        side: THREE.DoubleSide, // Ensure both sides are rendered
      });
      
      // Create variation in rock color
      const colorVariation = Math.random() * 0.2 - 0.1; // -0.1 to 0.1
      rockMaterial.color.r += colorVariation;
      rockMaterial.color.g += colorVariation;
      rockMaterial.color.b += colorVariation;
      
      // Create and add main rock mesh
      const rockMesh = new THREE.Mesh(rockGeometry, rockMaterial);
      rockGroup.add(rockMesh);
      
      // Create a flat base that extends beyond the rock slightly to ensure no gaps
      const baseGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 12);
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: rockMaterial.color,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true,
      });
      
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = -0.4; // Position at the bottom of the rock
      rockGroup.add(base);
      
      // Add small rock pieces to cover potential seams
      for (let i = 0; i < 4; i++) {
        // Create small irregularly shaped rock
        const smallRockGeom = new THREE.BoxGeometry(
          0.2 + Math.random() * 0.15, 
          0.1 + Math.random() * 0.1, 
          0.2 + Math.random() * 0.15
        );
        
        // Randomize vertices for natural look
        const smallPosAttr = smallRockGeom.getAttribute('position');
        for (let j = 0; j < smallPosAttr.count; j++) {
          const v = new THREE.Vector3().fromBufferAttribute(smallPosAttr, j);
          // Only randomize if not bottom side
          if (v.y > -0.05) {
            v.x += (Math.random() - 0.5) * 0.1;
            v.y += (Math.random() - 0.5) * 0.05;
            v.z += (Math.random() - 0.5) * 0.1;
            smallPosAttr.setXYZ(j, v.x, v.y, v.z);
          }
        }
        smallRockGeom.computeVertexNormals();
        
        // Create slightly different colored material
        const smallColorVar = Math.random() * 0.15 - 0.05;
        const smallMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(rockMaterial.color).offsetHSL(0, 0, smallColorVar),
          roughness: 0.9,
          metalness: 0.1,
          flatShading: true,
        });
        
        const smallRock = new THREE.Mesh(smallRockGeom, smallMaterial);
        
        // Position around edge of main rock to cover seams
        const angle = Math.PI * 2 / 4 * i + (Math.random() - 0.5) * 0.5;
        const radius = 0.4 + Math.random() * 0.15;
        smallRock.position.set(
          Math.cos(angle) * radius,
          -0.3 - Math.random() * 0.1, // Position at or below bottom edge
          Math.sin(angle) * radius
        );
        smallRock.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        rockGroup.add(smallRock);
      }
      
      // Add rock feature on top for more interesting shape
      const createFeature = () => {
        const featureGeom = new THREE.SphereGeometry(0.25, 7, 5);
        // Flatten the feature
        const featurePosAttr = featureGeom.getAttribute('position');
        for (let i = 0; i < featurePosAttr.count; i++) {
          const v = new THREE.Vector3().fromBufferAttribute(featurePosAttr, i);
          v.y *= 0.6; // Flatten vertically
          
          // Add displacement for natural look
          if (v.y > 0) {
            v.x += (Math.random() - 0.5) * 0.2;
            v.z += (Math.random() - 0.5) * 0.2;
          }
          featurePosAttr.setXYZ(i, v.x, v.y, v.z);
        }
        featureGeom.computeVertexNormals();
        
        // Create feature material with slight variation
        const featureColorVar = Math.random() * 0.1 - 0.05;
        const featureMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(rockMaterial.color).offsetHSL(0, 0, featureColorVar),
          roughness: 0.9,
          metalness: 0.1,
          flatShading: true,
        });
        
        return new THREE.Mesh(featureGeom, featureMaterial);
      };
      
      // Add 1-2 features on top for varied appearance
      if (Math.random() > 0.3) {
        const feature = createFeature();
        feature.position.set(
          (Math.random() - 0.5) * 0.3,
          0.1 + Math.random() * 0.1,
          (Math.random() - 0.5) * 0.3
        );
        feature.scale.set(
          0.7 + Math.random() * 0.5,
          0.4 + Math.random() * 0.3,
          0.7 + Math.random() * 0.5
        );
        feature.rotation.y = Math.random() * Math.PI * 2;
        rockGroup.add(feature);
      }
      
      // Make sure all meshes in the group can cast and receive shadows
      rockGroup.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      
      // Add userData so Group acts like a Mesh
      rockGroup.userData.isMesh = true;
      rockGroup.userData.geometry = rockGeometry;
      rockGroup.userData.material = rockMaterial;
      
      return rockGroup;
    };
    
    // Create a cluster of rocks at specified position
    const createRockCluster = (scene: THREE.Scene, angle: number, distance: number, getTerrainHeightAtPosition: (x: number, z: number) => number, scale: number = 1.0) => {
      // Number of rocks in the cluster
      const rockCount = 4 + Math.floor(Math.random() * 3); // 4-6 rocks per cluster for better coverage
      
      // Create a group to hold all rocks in the cluster
      const clusterGroup = new THREE.Group();
      scene.add(clusterGroup);
      
      // Calculate base position
      const clusterX = Math.cos(angle) * distance;
      const clusterZ = Math.sin(angle) * distance;
      const baseTerrainHeight = getTerrainHeightAtPosition(clusterX, clusterZ);
      
      // Create a shared base to hide grass gaps
      const baseRadius = 1.2 * scale;
      const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, 0.2, 8);
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x6D5B43, // Dirt color
        roughness: 1.0,
        metalness: 0.0,
        flatShading: true,
      });
      
      const clusterBase = new THREE.Mesh(baseGeometry, baseMaterial);
      clusterBase.position.set(clusterX, baseTerrainHeight - 0.1, clusterZ);
      clusterGroup.add(clusterBase);
      
      // Create main large rock first
      const mainRock = createRock();
      
      // Position main rock on the base
      mainRock.position.set(clusterX, baseTerrainHeight, clusterZ);
      
      // Make main rock larger than others
      const mainScale = (1.2 + Math.random() * 0.6) * scale;
      mainRock.scale.set(
        mainScale * (1.0 + Math.random() * 0.2),
        mainScale * (0.5 + Math.random() * 0.2), // Flatter for mountain-like appearance
        mainScale * (1.0 + Math.random() * 0.2)
      );
      
      // Random rotation for main rock (but keep Y rotation limited to avoid showing gaps)
      mainRock.rotation.x = Math.random() * Math.PI / 4;
      mainRock.rotation.y = Math.random() * Math.PI * 2;
      mainRock.rotation.z = Math.random() * Math.PI / 4;
      
      // Add the main rock
      clusterGroup.add(mainRock);
      
      // Create flat connecting rock slabs to hide gaps
      const createRockSlab = () => {
        const slabGeometry = new THREE.BoxGeometry(1, 0.15, 1);
        
        // Slightly randomize the vertices for natural look
        const posAttribute = slabGeometry.getAttribute('position');
        for (let i = 0; i < posAttribute.count; i++) {
          // Only displace top vertices, keep bottom flat
          if (posAttribute.getY(i) > 0) {
            posAttribute.setX(i, posAttribute.getX(i) + (Math.random() - 0.5) * 0.1);
            posAttribute.setY(i, posAttribute.getY(i) + (Math.random() - 0.5) * 0.05);
            posAttribute.setZ(i, posAttribute.getZ(i) + (Math.random() - 0.5) * 0.1);
          }
        }
        slabGeometry.computeVertexNormals();
        
        // Create material with slight color variation
        const colorVariation = Math.random() * 0.1 - 0.05;
        const slabMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x7D6B53).offsetHSL(0, 0, colorVariation),
          roughness: 0.9,
          metalness: 0.1,
          flatShading: true,
          side: THREE.DoubleSide,
        });
        
        return new THREE.Mesh(slabGeometry, slabMaterial);
      };
      
      // Add 2-3 rock slabs as connectors between rocks
      const slabCount = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < slabCount; i++) {
        const slab = createRockSlab();
        
        // Position slab at the edge of the cluster
        const slabAngle = Math.random() * Math.PI * 2;
        const slabDistance = baseRadius * 0.7;
        const slabX = clusterX + Math.cos(slabAngle) * slabDistance;
        const slabZ = clusterZ + Math.sin(slabAngle) * slabDistance;
        
        // Get terrain height for the slab
        const slabHeight = getTerrainHeightAtPosition(slabX, slabZ);
        
        // Position slightly below surface with random rotation
        slab.position.set(slabX, slabHeight - 0.05, slabZ);
        slab.rotation.set(
          (Math.random() - 0.5) * 0.2, // Slight tilt
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * 0.2  // Slight tilt
        );
        
        // Random scale
        const slabScale = 0.8 + Math.random() * 0.4;
        slab.scale.set(slabScale, 1, slabScale);
        
        clusterGroup.add(slab);
      }
      
      // Now add smaller rocks around the main one in a more overlapping pattern
      for (let i = 1; i < rockCount; i++) {
        const rock = createRock();
        
        // Calculate position with smaller variation to keep rocks closer together
        // Use polar coordinates to ensure better distribution around the center
        const segmentAngle = (Math.PI * 2 / (rockCount - 1)) * (i - 1);
        const rockAngle = angle + segmentAngle + (Math.random() - 0.5) * 0.4;
        
        // Keep distance variation small to ensure rocks overlap properly
        const distVariation = (Math.random() - 0.3) * 0.7;
        const rockDistance = baseRadius * (0.7 + distVariation);
        
        const x = clusterX + Math.cos(rockAngle) * rockDistance;
        const z = clusterZ + Math.sin(rockAngle) * rockDistance;
        
        // Calculate terrain height at this position
        const terrainHeight = getTerrainHeightAtPosition(x, z);
        
        // Ensure rocks overlap by varying height slightly
        const heightVariation = (Math.random() - 0.3) * 0.15;
        
        // Position rock with intentional vertical overlap
        rock.position.set(x, baseTerrainHeight + heightVariation, z);
        
        // Vary rock sizes - create variety but ensure good coverage
        const baseScale = 0.6 + Math.random() * 0.5;
        rock.scale.set(
          baseScale * (0.9 + Math.random() * 0.3),
          baseScale * (0.4 + Math.random() * 0.2), // Keep flatter for consistency
          baseScale * (0.9 + Math.random() * 0.3)
        );
        
        // Rotate to appear more natural, but limit tilt to avoid showing gaps
        rock.rotation.x = (Math.random() - 0.5) * Math.PI / 4; // Limited tilt
        rock.rotation.y = Math.random() * Math.PI * 2;         // Any rotation around Y
        rock.rotation.z = (Math.random() - 0.5) * Math.PI / 4; // Limited tilt
        
        // Add rock to the cluster group
        clusterGroup.add(rock);
        
        // For some rocks, position them to explicitly overlap with the main rock
        if (i % 2 === 0) {
          // Create a vector pointing from this rock toward the main rock
          const toMainRock = new THREE.Vector3(
            clusterX - x,
            0,
            clusterZ - z
          ).normalize().multiplyScalar(0.3 + Math.random() * 0.4);
          
          // Move rock closer to main rock to ensure overlap
          rock.position.x += toMainRock.x;
          rock.position.z += toMainRock.z;
        }
      }
      
      return clusterGroup;
    };
    
    // Add rock clusters to hide peaks along the terrain edge
    const addRockClustersAlongEdge = (scene: THREE.Scene, getTerrainHeightAtPosition: (x: number, z: number) => number) => {
      // Define peak areas that need to be hidden
      const peakAreas = [
        // Position rocks at exactly 1.25π, 1.45π and 1.65π as requested
        { angle: Math.PI * 1.25, distance: 9.8, scale: 1.0 }, // Right-top (1.25π)
        { angle: Math.PI * 1.45, distance: 9.5, scale: 1.5 }, // Right side (1.45π) - larger and closer
        { angle: Math.PI * 1.65, distance: 9.8, scale: 1.0 }, // Bottom-right (1.65π)
      ];
      
      // Create rocks for each peak area
      peakAreas.forEach(area => {
        createRockCluster(scene, area.angle, area.distance, getTerrainHeightAtPosition, area.scale);
      });
    };
    
    // Add ground to scene
    scene.add(ground);
    
    // Place rocks more strategically on the terrain
    // Reduced by ~40% from 6 to 3 rocks
    for (let i = 0; i < 2; i++) { // Reduced from 3 to 2 rocks
      const rock = createRock();
      
      // Position rocks where they can be seen but don't interfere
      let validPosition = false;
      let pos = new THREE.Vector3();
      let terrainHeight = 0;
      let attempts = 0;
      
      while (!validPosition && attempts < 20) {
        attempts++;
        
        // Modified positioning strategy to ensure better visibility
        // Use predefined positions for more consistent distribution
        const positionStrategies = [
          // Focus on left side positions to avoid bottom right
          { angle: (Math.PI / 4) + (Math.PI / 2) * i, dist: 7 + (i % 2) },  // Left-focused positions
          // Fixed points that avoid bottom right
          { angle: Math.PI / 4 + (Math.PI / 3) * i, dist: 6 },
          // Random angles in the left half of the terrain
          { angle: (Math.random() * Math.PI) + Math.PI/2, dist: 7.5 + Math.random() * 1.5 }
        ];
        
        // Try the predefined strategy first, then fall back to random if it fails
        const strategy = positionStrategies[Math.min(attempts % 3, 2)];
        
        const angle = strategy.angle;
        const distance = strategy.dist;
        
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        // Calculate terrain height at this position
        terrainHeight = getTerrainHeightAtPosition(x, z);
        pos.set(x, 0, z);
        
        // Avoid placing rocks near the mole holes (positioned at specific coordinates)
        const holePositions = [
          { x: -2.5, z: -2 },   // Top left
          { x: 2.5, z: -2 },    // Top right
          { x: -3, z: 1 },      // Bottom left
          { x: 3, z: 1 }        // Bottom right
        ];
        
        // Check distance from all holes
        let tooCloseToHole = false;
        for (const hole of holePositions) {
          const dist = Math.sqrt(Math.pow(x - hole.x, 2) + Math.pow(z - hole.z, 2));
          if (dist < 2.5) {
            tooCloseToHole = true;
            break;
          }
        }
        
        // Also check distance from other rocks to prevent overlap
        if (!tooCloseToHole && i > 0) {
          for (let j = 0; j < i; j++) {
            const otherRock = scene.children.find(child => 
              child.userData && child.userData.isRock && child.userData.rockIndex === j
            );
            
            if (otherRock) {
              const dist = Math.sqrt(
                Math.pow(x - otherRock.position.x, 2) + 
                Math.pow(z - otherRock.position.z, 2)
              );
              
              if (dist < 2.0) {  // Keep rocks separated
                tooCloseToHole = true;  // Reuse this flag to indicate invalid position
                break;
              }
            }
          }
        }
        
        // Make sure the rock isn't at the center
        const distFromCenter = Math.sqrt(x*x + z*z);
        validPosition = !tooCloseToHole && distFromCenter > 3.0;
      }
      
      if (validPosition) {
        // Place the rock ON the terrain, not floating above it
        // Ensure rock sticks out of ground by reducing the y-offset
        rock.position.set(pos.x, terrainHeight - 0.08, pos.z);
        
        // Create more varied, natural rock sizes
        const baseScale = 0.5 + Math.random() * 0.7; // More variation in sizes
        rock.scale.set(
          baseScale * (0.8 + Math.random() * 0.4),
          baseScale * (0.6 + Math.random() * 0.3), // Less flattening
          baseScale * (0.8 + Math.random() * 0.4)
        );
        
        // More natural rotation
        rock.rotation.set(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        );
        
        // Tag the rock for reference by other rock placement code
        rock.userData.isRock = true;
        rock.userData.rockIndex = i;
        
        rock.castShadow = true;
        rock.receiveShadow = true;
        
        // Add debug console log
        console.log(`Rock ${i} placed at (${pos.x.toFixed(2)}, ${terrainHeight.toFixed(2)}, ${pos.z.toFixed(2)})`);
        
        scene.add(rock);
      }
    }
    
    // Add rock clusters along edge
    addRockClustersAlongEdge(scene, getTerrainHeightAtPosition);
  };

  // Improve the setupHolesAndMoles function
  const setupHolesAndMoles = (scene: THREE.Scene) => {
    // Clear existing moles to avoid duplicates
    molesRef.current = [];
    
    const holes = [
      { x: -2.5, z: -2, position: "backLeft" },   // Top left
      { x: 2.5, z: -2, position: "backRight" },    // Top right
      { x: -3, z: 1, position: "frontLeft" },      // Bottom left
      { x: 3, z: 1, position: "frontRight" }        // Bottom right
    ];

    // Create moles first to store angles for matching
    const moleAngles: Record<string, number> = {};

    // First create and position all moles, but calculate angles for back row
    const moles = holes.map(pos => {
      const mole = createMole();
      mole.position.set(pos.x, -1.5, pos.z);
      
      // Calculate angle to face camera
      const cameraPosition = new THREE.Vector3(0, 7, 7);
      const direction = new THREE.Vector3();
      
      // Only calculate angles for back moles
      if (pos.z < 0) {
        direction.subVectors(cameraPosition, new THREE.Vector3(pos.x, 0, pos.z)).normalize();
        const angle = Math.atan2(direction.x, direction.z);
        moleAngles[pos.position] = angle;
      }
      
      return { mole, position: pos };
    });

    console.log(`Creating exactly ${holes.length} holes and moles`);

    // Now create holes and finish setting up all moles
    holes.forEach((pos, index) => {
      // Get the terrain height at this position using the full terrain equation
      const radius = 10; // Must match the value in createEnhancedTerrain
      const A = 0.2;     // Must match terrain amplitude
      const B = 0.25;    // Must match terrain frequency
      const edgeA = 0.4; // Must match edge amplitude
      const edgeB = 0.15; // Must match edge frequency
      
      // Calculate the full height including all factors
      const x = pos.x;
      const z = pos.z;
      
      // Base undulation
      const baseHeight = A * Math.sin(B * x) + A * Math.cos(B * z);
      
      // Additional noise-based variation
      const noiseHeight = 0.05 * Math.sin(x * 3 + z * 2) * Math.cos(x - z) +
                        0.05 * Math.cos(x * 5) * Math.sin(z * 3);
      
      // Calculate distance from center and angle for edge effect
      const distFromCenter = Math.sqrt(x*x + z*z);
      const normalizedDist = distFromCenter / radius;
      const polarAngle = Math.atan2(z, x); // Renamed to avoid conflict
      
      // Edge wave effect
      const edgeWave = Math.sin(polarAngle * 8) * 0.5 + Math.sin(polarAngle * 5) * 0.3 + Math.sin(polarAngle * 3) * 0.2;
      const edgeFactor = Math.pow(normalizedDist, 2.5);
      const edgeHeight = edgeA * edgeWave * edgeFactor;
      
      // Check if in a color patch
      const u = (x / radius + 1) / 2;
      const v = (z / radius + 1) / 2;
      
      let heightMultiplier = 1.0;
      
      // Reference the same patches from createEnhancedTerrain
      const patches = [
        { centerU: 0.3, centerV: 0.7, radius: 0.25, color: 0xE57373, heightMult: 1.2 },  // red
        { centerU: 0.7, centerV: 0.6, radius: 0.2, color: 0x81C784, heightMult: 0.8 },   // green
        { centerU: 0.2, centerV: 0.3, radius: 0.2, color: 0x9575CD, heightMult: 1.4 },   // purple
        { centerU: 0.6, centerV: 0.2, radius: 0.25, color: 0x4FC3F7, heightMult: 0.6 },  // blue
        { centerU: 0.5, centerV: 0.5, radius: 0.15, color: 0xFFB74D, heightMult: 1.0 }   // orange
      ];
      
      for (const patch of patches) {
        const du = u - patch.centerU;
        const dv = v - patch.centerV;
        const distSq = du*du + dv*dv;
        
        if (distSq < patch.radius * patch.radius) {
          const dist = Math.sqrt(distSq);
          const edgeDist = (patch.radius - dist) / patch.radius;
          const blend = Math.pow(edgeDist, 3);
          heightMultiplier = 1.0 * (1 - blend) + patch.heightMult * blend;
          break;
        }
      }
      
      // Calculate final terrain height
      const terrainHeight = (baseHeight + noiseHeight + edgeHeight) * heightMultiplier;

      // Create hole
      const hole = createHole();
      
      // Place the hole exactly on the terrain surface
      // Position the hole slightly below the terrain surface for proper visual integration
      hole.position.set(pos.x, terrainHeight - 0.01, pos.z);
      
      // Adapt the hole to the terrain slope
      // Calculate approximate normal vector at this point for better alignment
      const slopeX = A * B * Math.cos(B * x);
      const slopeZ = -A * B * Math.sin(B * z);
      
      // Use the normal to slightly rotate the hole to match the terrain slope
      if (Math.abs(slopeX) > 0.05 || Math.abs(slopeZ) > 0.05) {
        const normal = new THREE.Vector3(-slopeX, 1, -slopeZ).normalize();
        const slopeAngleX = Math.atan2(normal.z, normal.y);
        const slopeAngleZ = -Math.atan2(normal.x, normal.y);
        
        hole.rotation.x = -Math.PI/2 + slopeAngleX;
        hole.rotation.z = slopeAngleZ;
      }

      scene.add(hole);

      // Retrieve the corresponding mole
      const { mole } = moles[index];
      
      // Apply rotation based on position
      let rotationAngle = 0; // Renamed to avoid conflict
      
      if (pos.position === "frontLeft") {
        // Front left matches back left angle
        rotationAngle = moleAngles["backLeft"] || 0;
      } else if (pos.position === "frontRight") {
        // Front right matches back right angle
        rotationAngle = moleAngles["backRight"] || 0;
      } else {
        // Back moles use their calculated angles
        rotationAngle = moleAngles[pos.position] || 0;
      }
      
      // Apply rotation
      mole.rotation.y = rotationAngle;
      
      mole.visible = false;
      mole.userData.isUp = false;
      mole.userData.isMoving = false;
      
      // Store the adjusted hole position based on terrain height
      // Make mole sit deeper in the hole when down (better hiding)
      const baseY = terrainHeight - 1.3; // Higher base position for better emergence
      mole.userData.holePosition = { x: pos.x, y: baseY, z: pos.z };
      mole.position.y = baseY; // Set initial position
      
      mole.userData.centerRotation = rotationAngle; // Store the rotation angle
      mole.userData.terrainHeight = terrainHeight; // Store terrain height for animations
      
      scene.add(mole);
      molesRef.current.push(mole);
    });
    
    console.log(`Setup complete. Total moles: ${molesRef.current.length}`);
  };

  // Create hole mesh with better depth appearance
  const createHole = () => {
    const holeGroup = new THREE.Group();

    // Create an irregular hole shape instead of a perfect ellipse
    const createIrregularShape = (baseRadius: number, irregularity: number, points: number) => {
      const shape = new THREE.Shape();
      
      // Create points around a circle with random variations
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        // Vary radius between baseRadius ± irregularity
        const radiusVariation = baseRadius + (Math.random() * 2 - 1) * irregularity;
        // Apply a smooth variation using sine waves for more natural look
        const radius = radiusVariation * (1 + 0.1 * Math.sin(angle * 3) + 0.05 * Math.sin(angle * 5));
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.7; // Maintain elliptical shape (narrower in one axis)
        
        if (i === 0) {
          shape.moveTo(x, y);
        } else {
          shape.lineTo(x, y);
        }
      }
      
      shape.closePath();
      return shape;
    };
    
    // Create extrude settings for depth - make it shallower
    const extrudeSettings = {
      steps: 2,
      depth: 0.4, // Reduced from 0.5 for less protrusion
      bevelEnabled: true, 
      bevelThickness: 0.06, // Reduced from 0.1
      bevelSize: 0.06, // Reduced from 0.1
      bevelOffset: 0,
      bevelSegments: 3
    };

    // Create rim - slightly irregular but subtle - position lower
    const rimShape = createIrregularShape(1.3, 0.15, 12);
    const rimGeometry = new THREE.ShapeGeometry(rimShape);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Brown
      roughness: 0.8,
      metalness: 0.1,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.01; // Reduced from 0.03 to be more flush with ground
    rim.receiveShadow = true;
    holeGroup.add(rim);

    // Create a deeper hole with sides using ExtrudeGeometry
    const holeShape = createIrregularShape(1.1, 0.1, 12);
    const holeGeometry = new THREE.ExtrudeGeometry(holeShape, extrudeSettings);
    const holeMaterial = new THREE.MeshStandardMaterial({
      color: 0x3D2314, // Dark brown
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    
    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.rotation.x = Math.PI / 2; // Rotate to point downward
    hole.position.y = 0.015; // Reduced from 0.05 to sit lower in the ground
    hole.receiveShadow = true;
    holeGroup.add(hole);

    // Add a cap at the bottom to ensure no green shows through
    const bottomShape = createIrregularShape(1.2, 0.15, 12);
    const bottomGeometry = new THREE.ShapeGeometry(bottomShape);
    const bottomMaterial = new THREE.MeshStandardMaterial({
      color: 0x1A0A00, // Very dark brown/black
      roughness: 1.0,
      metalness: 0.0,
    });
    
    const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -0.375; // Adjusted for shallower depth
    bottom.receiveShadow = true;
    holeGroup.add(bottom);

    // Add a mid-depth layer for gradient effect
    const midShape = createIrregularShape(1.0, 0.12, 10);
    const midGeometry = new THREE.ShapeGeometry(midShape);
    const midMaterial = new THREE.MeshStandardMaterial({
      color: 0x2A1A0A, // Mid-dark brown
      roughness: 1.0,
      metalness: 0.0,
    });
    
    const mid = new THREE.Mesh(midGeometry, midMaterial);
    mid.rotation.x = -Math.PI / 2;
    mid.position.y = -0.18; // Adjusted for shallower depth
    mid.receiveShadow = true;
    holeGroup.add(mid);

    // Add some soil texture at the rim edges to make it more natural
    const createSoilParticle = () => {
      const size = 0.05 + Math.random() * 0.1;
      
      // Use a smoother geometry instead of sharp-edged box
      let geometry;
      const randomShape = Math.random();
      
      if (randomShape < 0.4) {
        // Flattened sphere for smoother pebbles
        geometry = new THREE.SphereGeometry(size, 8, 6);
        // Flatten it even more
        geometry.scale(1, 0.3, 1);
      } else if (randomShape < 0.7) {
        // Rounded cylinder for dirt clumps
        geometry = new THREE.CylinderGeometry(
          size * 0.8, // top radius
          size, // bottom radius
          size * 0.3, // reduced height for flatter appearance
          8, // radial segments
          1, // height segments
          false // open ended
        );
      } else {
        // Icosahedron for crystalline pebbles
        geometry = new THREE.IcosahedronGeometry(size * 0.7, 0);
        // Flatten it more aggressively
        geometry.scale(1, 0.4, 1);
      }
      
      // Add random deformation to make it more natural
      const positionAttribute = geometry.getAttribute('position');
      const vertex = new THREE.Vector3();
      
      for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);
        // Add small random displacement - less extreme than before
        vertex.x += (Math.random() - 0.5) * 0.02;
        vertex.y += (Math.random() - 0.5) * 0.01;
        vertex.z += (Math.random() - 0.5) * 0.02;
        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
      
      geometry.computeVertexNormals();
      
      // Create more natural soil colors - range from light tan to dark brown
      const soilColors = [
        0x8B4513, // Standard brown
        0x9E6B4A, // Lighter brown
        0x7D5B45, // Medium brown
        0x6D4C35, // Darker brown
        0xAB8162  // Light tan
      ];
      
      const selectedColor = soilColors[Math.floor(Math.random() * soilColors.length)];
      
      // Less color variation for more consistent appearance
      const colorVariation = Math.random() * 0.06 - 0.03; // -0.03 to 0.03
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(selectedColor).offsetHSL(0, 0, colorVariation),
        roughness: 0.9 + Math.random() * 0.1, // High roughness
        metalness: 0.0,
        flatShading: randomShape > 0.7, // Only use flat shading sometimes
      });
      
      return new THREE.Mesh(geometry, material);
    };
    
    // Add soil particles around the hole rim - make them more grounded
    for (let i = 0; i < 20; i++) {
      const particle = createSoilParticle();
      
      // Use a more uniform distribution around the rim
      const angle = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      
      // Vary the radius to create clusters
      let radius;
      if (i % 4 === 0) {
        // Every 4th particle is placed further out
        radius = 1.3 + Math.random() * 0.25;
      } else {
        // Others form the main rim
        radius = 1.2 + Math.random() * 0.2;
      }
      
      // Position particles directly on the ground surface
      particle.position.set(
        Math.cos(angle) * radius,
        0.01 + Math.random() * 0.01, // Keep very close to ground (was 0.04 + random * 0.03)
        Math.sin(angle) * radius * 0.7 // Keep the elliptical shape
      );
      
      // More subtle rotation for natural settling - prefer flat orientations
      particle.rotation.set(
        Math.random() * Math.PI * 0.2, // Minimal X rotation to keep flat
        Math.random() * Math.PI * 2,   // Full Y rotation
        Math.random() * Math.PI * 0.2  // Minimal Z rotation to keep flat
      );
      
      // Add a small random scaling factor for more variety
      const scaleVar = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      particle.scale.multiplyScalar(scaleVar);
      
      particle.castShadow = true;
      particle.receiveShadow = true;
      holeGroup.add(particle);
    }
    
    // Add a few bigger dirt chunks for more visual interest - place directly on ground
    for (let i = 0; i < 5; i++) {
      const chunk = createSoilParticle();
      
      // Position these randomly at key points around the rim
      const angle = (i / 5) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const radius = 1.35 + Math.random() * 0.2;
      
      chunk.position.set(
        Math.cos(angle) * radius,
        0.015 + Math.random() * 0.01, // Keep very close to ground (was 0.05 + random * 0.05)
        Math.sin(angle) * radius * 0.7
      );
      
      // Make these chunks slightly wider but not taller
      const width = 1.3 + Math.random() * 0.4;
      const height = 0.6 + Math.random() * 0.2; // Keep height low
      chunk.scale.set(width, height, width);
      
      // Add a few smaller dirt pieces for more natural look
      for (let j = 0; j < 4; j++) {
        const smallPiece = createSoilParticle();
        smallPiece.position.set(
          Math.cos(angle) * (radius - 0.1),
          0.01 + Math.random() * 0.01, // Keep very close to ground
          Math.sin(angle) * (radius - 0.1)
        );
        smallPiece.scale.set(0.2, 0.2, 0.2);
        smallPiece.rotation.set(
          Math.random() * Math.PI * 0.2, // Minimal X rotation to keep flat
          Math.random() * Math.PI * 2,   // Full Y rotation
          Math.random() * Math.PI * 0.2  // Minimal Z rotation to keep flat
        );
        chunk.add(smallPiece);
      }
      
      holeGroup.add(chunk);
    }

    return holeGroup;
  };

  // Remove the debug timer completely
  useEffect(() => {
    console.log('Scene component mounted. Game active:', gameActive);
    console.log('Config:', config);
    
    // No more debug timer - it's causing confusion with the real game timer
  }, []);
  
  // Fix the game loop to ensure moles appear and detect stuck moles
  useEffect(() => {
    if (!sceneRef.current || !molesRef.current.length) {
      console.log('Scene not ready yet, skipping game loop initialization');
      return () => {};
    }

    console.log('********* GAME STATE CHANGED *********');
    console.log('Game active:', gameActive, 'Moles count:', molesRef.current.length);

    if (!gameActive) {
      console.log('Game not active, hiding moles');
      resetAllMoles(); // Use reset function
      return () => {};
    }

    console.log('********* INITIALIZING GAME LOOP *********');
    console.log('Time:', Date.now());

    // FORCE RESET: Ensure all moles start in correct position
    resetAllMoles();

    // Initialize all moles' counters to 0
    molesRef.current.forEach(mole => {
      // Reset counter for each mole
      mole.userData.molesShownCounter = 0;
      console.log(`Reset mole counter for mole at ${mole.position.x.toFixed(2)}, ${mole.position.z.toFixed(2)}`);
    });

    // Track all timeouts so we can clear them on cleanup
    const timeouts: (NodeJS.Timeout | number)[] = [];
    
    // Create a map to track when each mole went up
    const moleActivationTimes = new Map<THREE.Group, number>();
    
    // Time each mole stays visible (ms)
    const moleDisplayTime = 2000;
    
    // Get speed setting (default to medium if not specified)
    const speed = config.speed || 2;
    
    // Define target mole count ranges based on speed setting
    let targetMoleCount;
    switch (speed) {
      case 1: // Slow: 8-10 moles
        targetMoleCount = 9;
        break;
      case 3: // Fast: 14-16 moles
        targetMoleCount = 15;
        break;
      case 2: // Medium: 11-13 moles
      default:
        targetMoleCount = 12;
        break;
    }
    
    // Track total moles shown
    let molesShown = 0;
    
    // Be very conservative - top of range only if fast speed
    const maxMolesToShow = speed === 3 ? 
      targetMoleCount + Math.floor(Math.random() * 2) : // For fast: full range
      targetMoleCount - Math.floor(Math.random() * 2);  // For medium/slow: lower end of range
    
    console.log(`⭐ STRICT MOLE LIMITER ENABLED ⭐`);
    console.log(`Game Speed: ${speed} (${speed === 1 ? 'Slow' : speed === 2 ? 'Medium' : 'Fast'})`);
    console.log(`Target mole count: ${maxMolesToShow} in ${config.gameTime}s`);
    
    // Calculate base interval between moles with larger minimum
    const baseInterval = Math.max(1500, (config.gameTime * 1000) / maxMolesToShow);
    console.log(`Base interval between moles: ${Math.round(baseInterval)}ms (minimum 1.5s)`);

    // Simple function to show a random mole
    const showRandomMole = () => {
      // First, check if game is still active
      if (!gameActive) {
        console.log(`❌ Game no longer active - not showing mole`);
        return;
      }
      
      // HARD CHECK: Absolutely prevent exceeding mole limit
      if (molesShown >= maxMolesToShow) {
        console.log(`⛔ MAXIMUM REACHED: ${molesShown}/${maxMolesToShow} moles shown - NO MORE WILL APPEAR`);
        return;
      }
      
      // Double-check that we haven't already shown too many moles
      const moleWithTooHighCounter = molesRef.current.find(mole => 
        (mole.userData.molesShownCounter || 0) > maxMolesToShow
      );
      
      if (moleWithTooHighCounter) {
        console.log(`⛔ Error: Mole counter exceeds max - found mole with counter ${moleWithTooHighCounter.userData.molesShownCounter}/${maxMolesToShow}`);
        return;
      }
      
      const availableMoles = molesRef.current.filter(mole => !mole.userData.isUp && !mole.userData.isMoving);
      if (availableMoles.length > 0) {
        // Pick a random mole to pop up
        const randomMole = availableMoles[Math.floor(Math.random() * availableMoles.length)];
        
        // Increment global counter BEFORE showing mole
        molesShown++;
        
        // Also track count on the mole itself for debugging
        randomMole.userData.molesShownCounter = molesShown;
        
        console.log(`🔵 Showing mole #${molesShown}/${maxMolesToShow} at:`, randomMole.position);
        animateMole(randomMole, true);
        
        // Track when this mole went up
        moleActivationTimes.set(randomMole, Date.now());
        
        // Auto-hide the mole after display time
        const hideTimeout = setTimeout(() => {
          if (randomMole.userData.isUp && !randomMole.userData.isMoving) {
            animateMole(randomMole, false);
            moleActivationTimes.delete(randomMole);
          }
        }, moleDisplayTime);
        timeouts.push(hideTimeout);
        
        // Only schedule next mole if we haven't reached the limit
        if (molesShown < maxMolesToShow) {
          console.log(`🟢 Scheduling next mole (${molesShown + 1}/${maxMolesToShow})`);
          scheduleNextMole();
        } else {
          console.log(`🔴 LIMIT REACHED: ${molesShown}/${maxMolesToShow} moles - no more will be scheduled`);
        }
      } else {
        // No available moles - try again shortly but only if we haven't hit the limit
        if (molesShown < maxMolesToShow) {
          console.log(`⚠️ No available moles, retrying in 300ms (${molesShown}/${maxMolesToShow} shown so far)`);
          const retryTimeout = setTimeout(showRandomMole, 300);
          timeouts.push(retryTimeout);
        }
      }
    };
    
    // Function to schedule the next mole with appropriate timing
    const scheduleNextMole = () => {
      // Extra safety check - if we've hit our limit, don't schedule any more moles
      if (molesShown >= maxMolesToShow) {
        console.log(`🛑 LIMIT CHECK: ${molesShown}/${maxMolesToShow} moles shown - not scheduling any more`);
        return;
      }
      
      // Calculate time elapsed and remaining
      const elapsed = molesShown === 0 ? 0 : (molesShown / maxMolesToShow) * config.gameTime * 1000;
      const remaining = Math.max(0, config.gameTime * 1000 - elapsed);
      const molesRemaining = maxMolesToShow - molesShown;
      
      // If game is nearing the end, accelerate mole appearances slightly to ensure we show all planned moles
      let adjustedInterval = molesRemaining > 0 ? remaining / molesRemaining : baseInterval;
      
      // Apply variance based on speed setting (more predictable at higher speeds)
      const varianceFactor = speed === 1 ? 0.25 : speed === 2 ? 0.2 : 0.15;
      const variance = adjustedInterval * varianceFactor;
      
      // Ensure a substantial minimum delay based on speed setting
      const minimumDelay = speed === 1 ? 1800 : speed === 2 ? 1500 : 1200; // Slower speeds have longer minimums
      const nextDelay = Math.max(minimumDelay, adjustedInterval - variance + (Math.random() * variance * 2));
      
      console.log(`⏱️ Next mole (#${molesShown + 1}/${maxMolesToShow}) scheduled in ${Math.round(nextDelay)}ms (min: ${minimumDelay}ms)`);
      
      const nextMoleTimeout = setTimeout(showRandomMole, nextDelay);
      timeouts.push(nextMoleTimeout);
    };

    // Start the game by showing the first mole after a short delay
    console.log('Starting game - first mole will appear in 500ms');
    const firstMoleTimeout = setTimeout(showRandomMole, 500);
    timeouts.push(firstMoleTimeout);
    
    // Set up a safety check for stuck moles
    const stuckMoleDetector = setInterval(() => {
      if (!gameActive) return;
      
      molesRef.current.forEach(mole => {
        if (mole.userData.isUp && !mole.userData.isMoving) {
          const activationTime = moleActivationTimes.get(mole);
          const currentTime = Date.now();
          
          // If a mole has been up for more than display time + buffer, it should have gone down already
          if (!activationTime || (currentTime - activationTime > moleDisplayTime + 500)) {
            console.log('Detected stuck mole, forcing down:', mole.position);
            animateMole(mole, false);
            moleActivationTimes.delete(mole);
          }
        }
      });
    }, 1000);
    timeouts.push(stuckMoleDetector);

    return () => {
      console.log('Cleaning up timeouts');
      timeouts.forEach(timeout => {
        if (typeof timeout === 'number') {
          cancelAnimationFrame(timeout);
        } else {
          clearTimeout(timeout);
        }
      });
      clearInterval(stuckMoleDetector);
    };
  }, [gameActive, config.gameTime, config.speed]);

  // Update animateMole function for improved emerge/retract animation
  const animateMole = (mole: THREE.Group, goingUp: boolean) => {
    console.log('Animating mole:', goingUp ? 'up' : 'down');
    
    // If we're trying to move a mole that's already moving, force-complete its current animation
    if (mole.userData.isMoving) {
      console.log('Mole is already moving, forcing completion of current animation');
      // Force the mole to its target position
      mole.position.y = goingUp ? mole.userData.holePosition.y + 1.8 : mole.userData.holePosition.y;
      mole.userData.isMoving = false;
      mole.userData.isUp = !goingUp; // Set to opposite of current target (what it was before)
      
      // Small delay before attempting the new animation
      setTimeout(() => animateMole(mole, goingUp), 50);
      return;
    }
    
    // Set safety timer to ensure animation always completes
    const safetyTimerId = setTimeout(() => {
      console.log('SAFETY: Animation taking too long, forcing completion');
      mole.position.y = goingUp ? mole.userData.holePosition.y + 1.8 : mole.userData.holePosition.y;
      mole.userData.isMoving = false;
      mole.userData.isUp = goingUp;
      if (!goingUp) {
        mole.visible = false;
        updateMoleText(mole, '');
      }
    }, 300); // Animation should complete in 150ms, so 300ms is a safe timeout
    
    mole.userData.isMoving = true;
    mole.userData.currentSafetyTimer = safetyTimerId;
    
    const startY = mole.position.y;
    // Mole doesn't need to come up as high - better proportioned to hole
    const targetY = goingUp ? mole.userData.holePosition.y + 1.8 : mole.userData.holePosition.y;
    const duration = 150;
    const startTime = Date.now();

    if (goingUp) {
      mole.visible = true;
      // Ensure rotation is maintained when mole pops up
      mole.rotation.y = mole.userData.centerRotation || 0;
      
      const { word, isCorrect } = getRandomWord();
      mole.userData.isCorrectWord = isCorrect;
      mole.userData.word = word;
      updateMoleText(mole, word);
      console.log('Mole word assigned:', word, 'isCorrect:', isCorrect);
    }

    function update() {
      // If animation was canceled or mole was removed, stop updating
      if (!mole.parent) {
        clearTimeout(mole.userData.currentSafetyTimer);
        return;
      }
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Better easing for pop up/down - more natural movement
      const ease = progress < 0.5 
        ? 2 * progress * progress 
        : -1 + (4 - 2 * progress) * progress;
      
      mole.position.y = startY + (targetY - startY) * ease;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        // Animation completed successfully
        clearTimeout(mole.userData.currentSafetyTimer);
        mole.position.y = targetY;
        mole.userData.isMoving = false;
        mole.userData.isUp = goingUp;
        
        if (!goingUp) {
          mole.visible = false;
          updateMoleText(mole, '');
        }
        console.log('Mole animation complete:', goingUp ? 'up' : 'down');
      }
    }

    update();
  };

  // Add a reset function to unstick all moles
  const resetAllMoles = () => {
    console.log('Resetting all moles to default state');
    molesRef.current.forEach(mole => {
      // Clear any pending timeouts
      if (mole.userData.currentSafetyTimer) {
        clearTimeout(mole.userData.currentSafetyTimer);
      }
      
      // Reset to default state
      mole.position.y = mole.userData.holePosition.y;
      mole.visible = false;
      mole.userData.isUp = false;
      mole.userData.isMoving = false;
      updateMoleText(mole, '');
    });
  };

  // Handle click/touch events
  useEffect(() => {
    if (!containerRef.current || !sceneRef.current || !cameraRef.current) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent | TouchEvent) => {
      if (!gameActive) {
        console.log('Game not active, ignoring click');
        return;
      }

      const rect = containerRef.current!.getBoundingClientRect();
      const x = ('touches' in event) ? event.touches[0].clientX : event.clientX;
      const y = ('touches' in event) ? event.touches[0].clientY : event.clientY;

      mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((y - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current!);

      // Include all objects in the mole groups for intersection testing
      const moleObjects: THREE.Object3D[] = [];
      molesRef.current.forEach(mole => {
        if (mole.visible && mole.userData.isUp && !mole.userData.isMoving) {
          mole.traverse((object: THREE.Object3D) => {
            if (object instanceof THREE.Mesh) {
              object.userData.parentMole = mole;
              moleObjects.push(object);
            }
          });
        }
      });

      console.log('Checking intersections with', moleObjects.length, 'objects');
      const intersects = raycaster.intersectObjects(moleObjects, false);
      
      if (intersects.length > 0) {
        console.log('Hit detected');
        const hitObject = intersects[0].object;
        const mole = hitObject.userData.parentMole || hitObject.parent;
        
        if (mole && mole.userData.isUp && !mole.userData.isMoving) {
          console.log('Processing hit on mole, isCorrect:', mole.userData.isCorrectWord);
          onMoleHit(mole.userData.word, mole.userData.isCorrectWord);
          
          if (mole.userData.isCorrectWord) {
            // Create particle explosion effect
            createExplosionEffect(mole.position.clone());
            
            // Add more confetti pieces in a circular pattern
            const confettiCount = 20; // More confetti pieces
            for (let i = 0; i < confettiCount; i++) {
              const angle = (i / confettiCount) * Math.PI * 2;
              const radius = 0.5;
              const position = mole.position.clone().add(
                new THREE.Vector3(
                  Math.cos(angle) * radius,
                  1,
                  Math.sin(angle) * radius
                )
              );
              const confetti = new Confetti(sceneRef.current!, position);
              confettiRef.current.push(confetti);
            }
            
            // Explosion animation
            const startScale = mole.scale.x;
            const duration = 300; // Faster animation
            const startTime = Date.now();
            
            const explode = () => {
              const elapsed = Date.now() - startTime;
              const progress = Math.min(elapsed / duration, 1);
              
              // Elastic easing for more "pop" feeling
              const elastic = (t: number) => {
                const b = 0.3; // More bounce
                const c = 1.2; // Slightly bigger scale
                return Math.pow(2, -10 * t) * Math.sin((t - b / 4) * (2 * Math.PI) / b) * c + 1;
              };
              
              const scale = startScale * (1 + elastic(progress) * 0.2); // Subtle scale change
              mole.scale.set(scale, scale, scale);
              
              if (progress < 1) {
                requestAnimationFrame(explode);
              } else {
                mole.scale.set(startScale, startScale, startScale);
                animateMole(mole, false);
              }
            };
            
            explode();
          } else {
            animateMole(mole, false);
          }
        }
      } else {
        console.log('No hit detected');
      }
    };

    containerRef.current.addEventListener('click', handleClick);
    containerRef.current.addEventListener('touchstart', handleClick);

    return () => {
      containerRef.current?.removeEventListener('click', handleClick);
      containerRef.current?.removeEventListener('touchstart', handleClick);
    };
  }, [gameActive, onMoleHit, config]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    reset: resetAllMoles
  }));

  // Add createExplosionEffect function
  const createExplosionEffect = (position: THREE.Vector3) => {
    if (!sceneRef.current) return;
    
    const numParticles = 20; // Reduced particle count
    const particles: { 
      mesh: THREE.Mesh, 
      velocity: THREE.Vector3, 
      life: number, 
      maxLife: number 
    }[] = [];
    
    // Red, white, and blue colors
    const colors = [
      new THREE.Color(0xFF0000), // Red
      new THREE.Color(0xFFFFFF), // White
      new THREE.Color(0x0000FF)  // Blue
    ];

    for (let i = 0; i < numParticles; i++) {
      const size = 0.05 + Math.random() * 0.1;
      const geometry = new THREE.PlaneGeometry(size, size);
      const material = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      
      // Faster initial velocity for more explosive effect
      const speed = 0.4 + Math.random() * 0.3;
      const angle = Math.random() * Math.PI * 2;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed * Math.random(),
        Math.sin(angle) * speed * Math.random(),
        (Math.random() - 0.5) * 0.2
      );

      // Shorter max life for quicker disappearance
      const maxLife = 0.5 + Math.random() * 0.3; // Between 0.5 and 0.8 seconds
      
      particles.push({
        mesh,
        velocity,
        life: maxLife,
        maxLife
      });

      sceneRef.current.add(mesh);
    }

    // Separate animation loop for explosion particles
    const animateParticles = () => {
      let needsToAnimate = false;

      particles.forEach(particle => {
        if (particle.life > 0) {
          particle.life -= 0.02; // Faster life reduction
          
          // Faster movement
          particle.mesh.position.x += particle.velocity.x * 0.1;
          particle.mesh.position.y += particle.velocity.y * 0.1;
          particle.mesh.position.z += particle.velocity.z * 0.1;
          
          // Apply gravity and drag
          particle.velocity.y -= 0.01;
          particle.velocity.multiplyScalar(0.95);
          
          // Fade out based on life
          if (particle.mesh.material instanceof THREE.Material) {
            particle.mesh.material.opacity = (particle.life / particle.maxLife) * 0.9;
          }
          
          needsToAnimate = true;
        } else if (particle.mesh.parent) {
          sceneRef.current?.remove(particle.mesh);
        }
      });

      if (needsToAnimate) {
        requestAnimationFrame(animateParticles);
      }
    };

    animateParticles();
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    console.log("Initializing scene...");
    const cleanup = createScene();
    
    // Log for debugging
    console.log("Scene initialized, clouds added:", cloudsRef.current.length);
    
    // Handle scene reference for external access
    if (ref && typeof ref !== 'function') {
      // Expose methods for parent component
      ref.current = {
        resetMoles: resetAllMoles
      };
    }
    
    return cleanup;
  }, []);
  
  // Control moles based on game state
  useEffect(() => {
    // Start showing moles when gameActive is true
    let moleInterval: NodeJS.Timeout | null = null;
    
    if (gameActive) {
      moleInterval = setInterval(() => {
        showRandomMole();
      }, 1000); // Show a new mole every second
    }
    
    // Clean up on unmount
    return () => {
      if (moleInterval) {
        clearInterval(moleInterval);
      }
    };
  }, [gameActive]); // Re-initialize when gameActive changes

  return (
    <Box
      ref={containerRef}
      position="relative"
      width="100%"
      height="100%"
      overflow="hidden"
      sx={{
        '& canvas': {
          display: 'block',
          width: '100% !important',
          height: '100% !important'
        }
      }}
    />
  );
});

export default Scene; 