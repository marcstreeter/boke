import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import * as THREE from "three";
import type { Mesh, ShaderMaterial, Texture, Vector2 } from "three";
import { GrainOverlay, type GrainOverlayProps } from "./GrainOverlay";

// Optimized vertex shader with pre-calculated values
const vertexShader = `
  uniform float uTime;
  uniform float uRotationSpeed;
  uniform float uLayerOffset;
  varying vec2 vUv;
  varying float vRotationAngle;

  void main() {
    vUv = uv;

    // Pre-calculate rotation angle for fragment shader
    vRotationAngle = uTime * uRotationSpeed + uLayerOffset;
    float cos_angle = cos(vRotationAngle);
    float sin_angle = sin(vRotationAngle);

    // Apply rotation to vertex position
    vec3 rotatedPosition = vec3(
      position.x * cos_angle - position.y * sin_angle,
      position.x * sin_angle + position.y * cos_angle,
      position.z
    );

    gl_Position = projectionMatrix * modelViewMatrix * vec4(rotatedPosition, 1.0);
  }
`;

// Optimized fragment shader with reduced complexity
const fragmentShader = `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform vec2 uTwistCenter;
  uniform float uTwistRadius;
  uniform float uTwistStrength;
  uniform float uLayerOffset;
  uniform vec3 uTint;
  uniform float uOpacity;
  uniform float uBlurAmount;
  uniform vec2 uResolution;
  uniform float uLayerIndex;

  varying vec2 vUv;
  varying float vRotationAngle;

  // Optimized twist function using pre-calculated values
  vec2 twist(vec2 uv, vec2 center, float radius, float strength) {
    vec2 offset = uv - center;
    float dist2 = dot(offset, offset); // Squared distance (faster)
    float radius2 = radius * radius;

    if (dist2 < radius2) {
      float ratio = 1.0 - dist2 / radius2; // Using squared values
      float angle = strength * ratio;

      float c = cos(angle);
      float s = sin(angle);
      offset = vec2(offset.x * c - offset.y * s, offset.x * s + offset.y * c);
    }

    return center + offset;
  }

  // Optimized box blur - single pass with weighted samples
  vec3 fastBlur(sampler2D tex, vec2 uv, float amount) {
    vec2 texelSize = 1.0 / uResolution;
    vec3 result = texture2D(tex, uv).rgb * 0.25; // Center weight

    // 4-tap box blur (much faster than 9-tap)
    result += texture2D(tex, uv + vec2(-texelSize.x, 0.0) * amount).rgb * 0.1875;
    result += texture2D(tex, uv + vec2(texelSize.x, 0.0) * amount).rgb * 0.1875;
    result += texture2D(tex, uv + vec2(0.0, -texelSize.y) * amount).rgb * 0.1875;
    result += texture2D(tex, uv + vec2(0.0, texelSize.y) * amount).rgb * 0.1875;

    return result;
  }

  void main() {
    // Optimized twist center calculation
    float timeOffset = uTime * 0.5 + uLayerOffset;
    vec2 twistCenter = uTwistCenter + vec2(sin(timeOffset), cos(timeOffset * 0.6)) * 0.1;

    // Dynamic strength with simpler calculation
    float dynamicStrength = uTwistStrength * (1.0 + sin(uTime * 0.8 + uLayerOffset) * 0.3);

    // Apply twist
    vec2 twistedUv = twist(vUv, twistCenter, uTwistRadius, dynamicStrength);

    // Sample texture with optional blur
    vec3 color;
    if (uBlurAmount > 0.0 && uLayerIndex < 3.0) {
      color = fastBlur(uTexture, twistedUv, uBlurAmount * (uLayerIndex + 1.0) * 0.5);
    } else {
      color = texture2D(uTexture, twistedUv).rgb;
    }

    // Simplified color grading
    float gradient = twistedUv.x + twistedUv.y * 0.5;
    vec3 tintedColor = mix(color, color * uTint, gradient * 0.5);

    // Simple warm/cool shift
    float colorShift = sin(uTime * 0.3 + uLayerOffset) * 0.5 + 0.5;
    tintedColor *= mix(vec3(0.9, 1.0, 1.1), vec3(1.1, 1.0, 0.9), colorShift);

    // Get alpha from texture
    float alpha = texture2D(uTexture, twistedUv).a * uOpacity;

    gl_FragColor = vec4(tintedColor, alpha);
  }
`;

// Optimized post-processing shaders
const postVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Separable gaussian blur for better performance
const separableBlurFragmentShader = `
  uniform sampler2D tDiffuse;
  uniform vec2 uDirection;
  uniform float uBlurSize;
  uniform vec2 uResolution;
  varying vec2 vUv;

  void main() {
    vec2 texelSize = 1.0 / uResolution;
    vec3 result = vec3(0.0);

    // 7-tap gaussian kernel (reduced from 9x9)
    float weights[4];
    weights[0] = 0.383103;
    weights[1] = 0.241843;
    weights[2] = 0.060626;
    weights[3] = 0.00598;

    result += texture2D(tDiffuse, vUv).rgb * weights[0];

    for (int i = 1; i < 4; i++) {
      vec2 offset = float(i) * texelSize * uDirection * uBlurSize;
      result += texture2D(tDiffuse, vUv + offset).rgb * weights[i];
      result += texture2D(tDiffuse, vUv - offset).rgb * weights[i];
    }

    gl_FragColor = vec4(result, 1.0);
  }
`;

// Simplified bokeh blur
const simpleBokehFragmentShader = `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uBlurRadius;
  varying vec2 vUv;

  const float GOLDEN_ANGLE = 2.39996323;

  void main() {
    vec2 texelSize = 1.0 / uResolution;
    vec3 color = texture2D(tDiffuse, vUv).rgb;

    if (uBlurRadius <= 0.0) {
      gl_FragColor = vec4(color, 1.0);
      return;
    }

    // Simplified bokeh with fewer samples
    float radius = uBlurRadius * 0.01;

    for (float i = 1.0; i < 16.0; i++) {
      float r = sqrt(i / 16.0) * radius;
      float theta = i * GOLDEN_ANGLE;
      vec2 offset = vec2(cos(theta), sin(theta)) * r;
      color += texture2D(tDiffuse, vUv + offset).rgb;
    }

    gl_FragColor = vec4(color / 16.0, 1.0);
  }
`;

interface TwistedLayerProps {
  texture: Texture;
  layerIndex: number;
  totalLayers: number;
  resolution: Vector2;
  blurAmount: number;
}

function TwistedLayer({
  texture,
  layerIndex,
  totalLayers,
  resolution,
  blurAmount,
}: TwistedLayerProps): React.JSX.Element {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  // Optimized uniforms with fewer properties
  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
      uTwistCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uTwistRadius: { value: 1.2 },
      uTwistStrength: { value: 2.5 },
      uLayerOffset: { value: layerIndex * Math.PI * 0.5 },
      uTint: { value: new THREE.Vector3(1.2, 1.2, 1.2) },
      uOpacity: { value: 0.8 },
      uRotationSpeed: { value: (layerIndex + 1) * 0.05 },
      uResolution: { value: resolution },
      uBlurAmount: { value: blurAmount },
      uLayerIndex: { value: layerIndex },
    }),
    [layerIndex, texture, resolution, blurAmount],
  );

  // Update critical uniforms
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTexture.value = texture;
      materialRef.current.uniforms.uResolution.value = resolution;
      materialRef.current.uniforms.uBlurAmount.value = blurAmount;
    }
  }, [texture, resolution, blurAmount]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }

    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      const isBackground = layerIndex === totalLayers - 1;

      if (isBackground) {
        // Simple scale animation for background
        const breathe = 1.0 + Math.sin(time * 0.1) * 0.02;
        meshRef.current.scale.setScalar(15 * breathe);
        meshRef.current.position.set(0, 0, -layerIndex * 0.02);
      } else {
        // Optimized movement for layers
        const speed = (layerIndex + 1) * 0.03;
        const radius = (layerIndex + 1) * 2;

        meshRef.current.position.x = Math.cos(time * speed) * radius;
        meshRef.current.position.y = Math.sin(time * speed) * radius * 0.6;
        meshRef.current.position.z = -layerIndex * 0.02;

        const scale = layerIndex * 2 + 5;
        meshRef.current.scale.setScalar(scale);
        meshRef.current.rotation.z = time * speed * 0.2;
      }
    }
  });

  const isBackground = layerIndex === totalLayers - 1;
  const geometry = isBackground ? [1, 1, 16, 16] : [1, 1, 8, 8]; // Reduced subdivisions

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={geometry} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        side={THREE.DoubleSide}
        depthWrite={false} // Optimization for transparent objects
      />
    </mesh>
  );
}

interface PostProcessingOptimizedProps {
  blurRadius: number;
}

function PostProcessingOptimized({ blurRadius }: PostProcessingOptimizedProps): null {
  const { gl, size, scene, camera } = useThree();

  // Reduce render target count
  const horizontalBlurTarget = useFBO(size.width, size.height);
  const verticalBlurTarget = useFBO(size.width, size.height);

  // Create separable blur materials
  const horizontalBlurMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: postVertexShader,
        fragmentShader: separableBlurFragmentShader,
        uniforms: {
          tDiffuse: { value: null },
          uDirection: { value: new THREE.Vector2(1, 0) },
          uBlurSize: { value: blurRadius },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
        },
      }),
    [size.width, size.height, blurRadius],
  );

  const verticalBlurMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: postVertexShader,
        fragmentShader: separableBlurFragmentShader,
        uniforms: {
          tDiffuse: { value: null },
          uDirection: { value: new THREE.Vector2(0, 1) },
          uBlurSize: { value: blurRadius },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
        },
      }),
    [size.width, size.height, blurRadius],
  );

  const bokehMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: postVertexShader,
        fragmentShader: simpleBokehFragmentShader,
        uniforms: {
          tDiffuse: { value: null },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
          uBlurRadius: { value: blurRadius },
        },
      }),
    [size.width, size.height, blurRadius],
  );

  const postScene = useMemo(() => new THREE.Scene(), []);
  const postCamera = useMemo(
    () => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    [],
  );
  const postQuad = useMemo(() => new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), []);

  useFrame(() => {
    if (blurRadius <= 0) return;

    // Update uniforms
    horizontalBlurMaterial.uniforms.uBlurSize.value = blurRadius * 0.5;
    verticalBlurMaterial.uniforms.uBlurSize.value = blurRadius * 0.5;
    bokehMaterial.uniforms.uBlurRadius.value = blurRadius;

    // Horizontal blur pass
    gl.setRenderTarget(horizontalBlurTarget);
    gl.clear();
    postQuad.material = horizontalBlurMaterial;
    horizontalBlurMaterial.uniforms.tDiffuse.value = null;
    gl.render(scene, camera);

    // Vertical blur pass
    gl.setRenderTarget(verticalBlurTarget);
    gl.clear();
    postQuad.material = verticalBlurMaterial;
    verticalBlurMaterial.uniforms.tDiffuse.value = horizontalBlurTarget.texture;
    postScene.clear();
    postScene.add(postQuad);
    gl.render(postScene, postCamera);

    // Final bokeh pass to screen
    gl.setRenderTarget(null);
    postQuad.material = bokehMaterial;
    bokehMaterial.uniforms.tDiffuse.value = verticalBlurTarget.texture;
    postScene.clear();
    postScene.add(postQuad);
    gl.render(postScene, postCamera);
  }, 1);

  return null;
}

interface SceneProps {
  imageUrl?: string;
  fallbackTexture: Texture;
  blurAmount: number;
  postBlurRadius: number;
  onTextureLoad?: () => void;
}

function Scene({
  imageUrl,
  fallbackTexture,
  blurAmount,
  postBlurRadius,
  onTextureLoad,
}: SceneProps): React.JSX.Element {
  const { size } = useThree();
  const [loadedTexture, setLoadedTexture] = useState<Texture>(fallbackTexture);

  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size],
  );

  // Texture loading
  useEffect(() => {
    if (!imageUrl) {
      setLoadedTexture(fallbackTexture);
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";

    loader.load(
      imageUrl,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;

        setLoadedTexture(texture);
        onTextureLoad?.();
      },
      undefined,
      (error) => {
        console.warn("Failed to load texture:", error);
        setLoadedTexture(fallbackTexture);
      },
    );
  }, [imageUrl, fallbackTexture, onTextureLoad]);

  const numLayers = 4; // Reduced from 5 for better performance

  return (
    <>
      <ambientLight intensity={0.1} />
      {Array.from({ length: numLayers }, (_, i) => (
        <TwistedLayer
          key={i}
          texture={loadedTexture}
          layerIndex={i}
          totalLayers={numLayers}
          resolution={resolution}
          blurAmount={blurAmount}
        />
      ))}
      <PostProcessingOptimized blurRadius={postBlurRadius} />
    </>
  );
}

interface MeshArtBackgroundOptimizedProps {
  imageUrl?: string;
  imageUrlLight?: string;
  imageUrlDark?: string;
  blurAmount?: number;
  postBlurRadius?: number;
  enableNavigationTransition?: boolean;
  transitionDuration?: number;
  grain?: boolean | GrainOverlayProps;
  quality?: 'low' | 'medium' | 'high';
}

export default function MeshArtBackgroundOptimized({
  imageUrl,
  imageUrlLight = "/canv-light.png",
  imageUrlDark = "/canv-dark.jpg",
  blurAmount = 1.0,
  postBlurRadius = 2,
  enableNavigationTransition = true,
  transitionDuration = 800,
  grain = true,
  quality = 'medium',
}: MeshArtBackgroundOptimizedProps): React.JSX.Element {
  const [isTextureLoaded, setIsTextureLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Quality settings
  const qualitySettings = {
    low: { dpr: 0.5, antialias: false },
    medium: { dpr: 1, antialias: true },
    high: { dpr: window.devicePixelRatio || 1, antialias: true },
  };

  const currentImageUrl = useMemo(() => {
    if (imageUrl) return imageUrl;
    return isDarkMode ? imageUrlDark : imageUrlLight;
  }, [imageUrl, imageUrlLight, imageUrlDark, isDarkMode]);

  // Theme detection
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Navigation transitions
  useEffect(() => {
    if (!enableNavigationTransition || typeof document === "undefined") return;

    const handleBeforeSwap = () => setIsNavigating(true);

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (link && link.href && !link.href.startsWith("#") && !link.target) {
        const currentHost = window.location.host;
        const linkUrl = new URL(link.href, window.location.href);

        if (linkUrl.host === currentHost) {
          e.preventDefault();
          setIsNavigating(true);

          setTimeout(() => {
            window.location.href = link.href;
          }, transitionDuration);
        }
      }
    };

    document.addEventListener("astro:before-swap", handleBeforeSwap);
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("astro:before-swap", handleBeforeSwap);
      document.removeEventListener("click", handleClick);
    };
  }, [enableNavigationTransition, transitionDuration]);

  if (typeof document === "undefined") {
    return <></>;
  }

  // Create optimized fallback texture
  const fallbackTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256; // Reduced size
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Failed to get 2D context");

    // Simple gradient
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "#ff6b9d");
    gradient.addColorStop(0.5, "#c44bff");
    gradient.addColorStop(1, "#1a1a2e");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearFilter; // No mipmaps for small texture
    texture.magFilter = THREE.LinearFilter;

    return texture;
  }, []);

  const grainProps = useMemo(() => {
    if (!grain) return null;
    if (grain === true) {
      return { opacity: 0.08, blendMode: "overlay" as const };
    }
    return grain;
  }, [grain]);

  const { dpr, antialias } = qualitySettings[quality];

  return (
    <div className="absolute inset-0 -z-10 h-screen w-full overflow-hidden dark:bg-black">
      <Canvas
        style={{
          transition: `opacity ${isNavigating ? transitionDuration : 1000}ms ease-in-out`,
          opacity: isTextureLoaded && !isNavigating ? 1 : 0,
        }}
        key={currentImageUrl}
        camera={{ position: [0, 0, 4], fov: 75 }}
        gl={{
          antialias,
          alpha: true,
          powerPreference: "low-power",
          preserveDrawingBuffer: false,
        }}
        dpr={dpr}
        className="absolute inset-0"
      >
        <Scene
          imageUrl={currentImageUrl}
          fallbackTexture={fallbackTexture}
          blurAmount={blurAmount}
          postBlurRadius={postBlurRadius}
          onTextureLoad={() => setIsTextureLoaded(true)}
        />
      </Canvas>

      {grainProps && <GrainOverlay {...grainProps} />}
    </div>
  );
}
