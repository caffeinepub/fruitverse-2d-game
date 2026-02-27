import { useEffect, useRef } from 'react';

interface FruitAnimationProps {
  theme: 'tropical' | 'berry' | 'citrus';
}

export default function FruitAnimation({ theme }: FruitAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const fruits: Array<{
      x: number;
      y: number;
      size: number;
      speed: number;
      rotation: number;
      rotationSpeed: number;
      image: HTMLImageElement;
    }> = [];

    // Load fruit images based on theme
    const fruitImages: HTMLImageElement[] = [];
    const imagePaths = {
      tropical: ['/assets/generated/pineapple-float.dim_64x64.png', '/assets/generated/orange-spin.dim_64x64.png'],
      berry: ['/assets/generated/strawberry-bounce.dim_64x64.png', '/assets/generated/blueberry-sway.dim_64x64.png'],
      citrus: ['/assets/generated/lemon-glow.dim_64x64.png', '/assets/generated/orange-spin.dim_64x64.png'],
    };

    let imagesLoaded = 0;
    const totalImages = imagePaths[theme].length;

    imagePaths[theme].forEach((path) => {
      const img = new Image();
      img.src = path;
      img.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
          initFruits();
        }
      };
      fruitImages.push(img);
    });

    function initFruits() {
      const canvasElement = canvasRef.current;
      if (!canvasElement) return;

      for (let i = 0; i < 8; i++) {
        fruits.push({
          x: Math.random() * canvasElement.width,
          y: Math.random() * canvasElement.height,
          size: 40 + Math.random() * 40,
          speed: 0.3 + Math.random() * 0.5,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          image: fruitImages[Math.floor(Math.random() * fruitImages.length)],
        });
      }
    }

    let animationFrameId: number;

    function animate() {
      const canvasElement = canvasRef.current;
      const context = ctx;
      if (!canvasElement || !context) return;

      context.clearRect(0, 0, canvasElement.width, canvasElement.height);

      fruits.forEach((fruit) => {
        context.save();
        context.translate(fruit.x, fruit.y);
        context.rotate(fruit.rotation);
        context.globalAlpha = 0.6;
        context.drawImage(fruit.image, -fruit.size / 2, -fruit.size / 2, fruit.size, fruit.size);
        context.restore();

        fruit.y += fruit.speed;
        fruit.rotation += fruit.rotationSpeed;

        if (fruit.y > canvasElement.height + fruit.size) {
          fruit.y = -fruit.size;
          fruit.x = Math.random() * canvasElement.width;
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    const handleResize = () => {
      const canvasElement = canvasRef.current;
      if (!canvasElement) return;
      canvasElement.width = window.innerWidth;
      canvasElement.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    if (imagesLoaded === totalImages) {
      animate();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.3 }}
    />
  );
}
