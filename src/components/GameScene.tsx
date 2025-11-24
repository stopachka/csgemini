'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Sky, Stars, Grid, Stats } from '@react-three/drei';
import * as THREE from 'three';
import { db } from '@/lib/db';

// --- Constants ---
const MAP_SIZE = 50;
const PLAYER_SPEED = 5;
const PLAYER_HEIGHT = 1.6;

// --- Utils ---
// Simple PRNG for map generation
function seededRandom(seed: number) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// --- Sound Utils ---
const SoundUtils = {
  ctx: null as AudioContext | null,
  init: () => {
    if (!SoundUtils.ctx) {
      SoundUtils.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  },
  playShoot: () => {
    if (!SoundUtils.ctx) SoundUtils.init();
    const ctx = SoundUtils.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Pew pew sound
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  },
  playHit: () => {
      if (!SoundUtils.ctx) SoundUtils.init();
      const ctx = SoundUtils.ctx!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Hit sound (short noise/crunch)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.05);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
  },
  playDeath: () => {
      if (!SoundUtils.ctx) SoundUtils.init();
      const ctx = SoundUtils.ctx!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Falling/dying sound
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(10, ctx.currentTime + 0.5);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
  }
};

// --- Components ---

const Weapon = React.forwardRef((_, ref) => {
    const { camera } = useThree();
    const groupRef = useRef<THREE.Group>(null);
    // Store recoil state in a ref to avoid re-renders on every frame
    const recoilState = useRef({
        active: false,
        distance: 0,
    });

    React.useImperativeHandle(ref, () => ({
        fire: () => {
            SoundUtils.playShoot();
            recoilState.current.active = true;
            recoilState.current.distance = 0.2; // Kick back distance
        }
    }));

    useFrame((state, delta) => {
        if (groupRef.current) {
            // 1. Sync with Camera
            groupRef.current.position.copy(camera.position);
            groupRef.current.rotation.copy(camera.rotation);
            
            // 2. Decay recoil
            recoilState.current.distance = THREE.MathUtils.lerp(recoilState.current.distance, 0, delta * 10);
            
            // 3. Apply Offset (Right, Down, Forward) relative to camera orientation
            // Translate methods work in local space, which now matches camera space
            groupRef.current.translateX(0.3);
            groupRef.current.translateY(-0.25);
            groupRef.current.translateZ(-0.5 + recoilState.current.distance);

            // 4. Apply Recoil Rotation
            groupRef.current.rotateX(recoilState.current.distance * 0.5);
        }
    });

    return (
        <group ref={groupRef}>
            {/* Gun Body */}
            <mesh renderOrder={999}>
                 <boxGeometry args={[0.1, 0.15, 0.4]} />
                 <meshBasicMaterial color="cyan" depthTest={false} depthWrite={false} />
            </mesh>
            {/* Handle/Grip Hint */}
            <mesh position={[0, -0.1, 0.1]} rotation={[0.2, 0, 0]} renderOrder={999}>
                 <boxGeometry args={[0.08, 0.15, 0.1]} />
                 <meshBasicMaterial color="hotpink" depthTest={false} depthWrite={false} />
            </mesh>
             {/* Barrel Tip */}
             <mesh position={[0, 0.02, -0.2]} renderOrder={999}>
                 <boxGeometry args={[0.05, 0.05, 0.05]} />
                 <meshBasicMaterial color="black" depthTest={false} depthWrite={false} />
            </mesh>
        </group>
    );
});
Weapon.displayName = 'Weapon';

const Floor = () => {
  return (
    <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <planeGeometry args={[MAP_SIZE * 2, MAP_SIZE * 2]} />
            <meshStandardMaterial color="#111" />
        </mesh>
        <Grid 
            position={[0, 0, 0]} 
            args={[MAP_SIZE * 2, MAP_SIZE * 2]} 
            cellColor="white" 
            sectionColor="gray" 
            infiniteGrid 
            fadeDistance={50}
        />
    </group>
  );
};

const MapObstacles = ({ mapId }: { mapId: string }) => {
    const obstacles = useMemo(() => {
        // Create a simple numeric hash from mapId string
        let seed = 0;
        for (let i = 0; i < mapId.length; i++) {
            seed += mapId.charCodeAt(i);
        }
        
        const generated = [];
        const count = 20; // Number of blocks
        
        for (let i = 0; i < count; i++) {
            // Generate random pos
            const x = (seededRandom(seed + i) - 0.5) * MAP_SIZE;
            const z = (seededRandom(seed + i + 100) - 0.5) * MAP_SIZE;
            
            // Generate random size
            const w = 1 + seededRandom(seed + i + 200) * 4; // Width 1-5
            const h = 1 + seededRandom(seed + i + 300) * 3; // Height 1-4
            const d = 1 + seededRandom(seed + i + 400) * 4; // Depth 1-5
            
            generated.push({ position: [x, h/2, z], size: [w, h, d] });
        }
        return generated;
    }, [mapId]);

    return (
        <>
            {obstacles.map((obs, idx) => (
                <mesh key={idx} position={obs.position as any}>
                    <boxGeometry args={obs.size as any} />
                    <meshStandardMaterial color="#555" />
                </mesh>
            ))}
        </>
    );
};

// Remote Player Component (Visuals only)
const RemotePlayer = ({
  id,
  position,
  rotation,
  color,
  name,
  state,
  hp
}: {
  id: string;
  position: [number, number, number];
  rotation: number;
  color: string;
  name: string;
  state: string;
  hp: number;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Ensure hp is valid
  const health = hp ?? 100;
  
  useFrame((_, delta) => {
     if (groupRef.current) {
         if (state === 'dying') {
              // Fall back animation - FAST for "right away" feel but kept for polish
              // Or we can skip it if user wants instant
              // User said "disappear right away" - let's make it very fast fade out
         } else {
             groupRef.current.rotation.x = 0;
         }
     } 
  });
  
  if (state === 'dead') return null;
  if (health <= 0) return null; // Instant vanish on death

  return (
    // Important: We attach userData here so raycaster can identify the peer!
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]} userData={{ type: 'player', peerId: id }}>
      {/* HP Bar */}
      <group position={[0, 1.2, 0]}>
         {/* Background */}
         <mesh position={[0, 0, -0.01]}>
             <planeGeometry args={[1, 0.1]} />
             <meshBasicMaterial color="black" />
         </mesh>
         {/* Foreground */}
         <mesh position={[0, 0, 0]} scale={[health / 100, 1, 1]} position-x={-0.5 + (health/100)/2}>
             <planeGeometry args={[1, 0.1]} />
             <meshBasicMaterial color={health > 50 ? "green" : "red"} />
         </mesh>
      </group>

      {/* Head */}
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[0.25, 0.25, 0.25]} />
        <meshStandardMaterial color="#ffdbac" /> 
      </mesh>
      
      {/* Body */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.4, 0.6, 0.2]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Right Arm (with Gun) */}
      <group position={[0.3, 0.3, 0.1]}>
        <mesh>
             <boxGeometry args={[0.15, 0.5, 0.15]} />
             <meshStandardMaterial color={color} />
        </mesh>
        {/* Gun */}
        <mesh position={[0, -0.15, 0.2]}>
             <boxGeometry args={[0.1, 0.1, 0.4]} />
             <meshStandardMaterial color="#333" />
        </mesh>
      </group>

      {/* Left Arm */}
      <mesh position={[-0.3, 0.3, 0]}>
        <boxGeometry args={[0.15, 0.5, 0.15]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Right Leg */}
      <mesh position={[0.1, -0.45, 0]}>
        <boxGeometry args={[0.15, 0.7, 0.15]} />
        <meshStandardMaterial color="#555" /> 
      </mesh>

      {/* Left Leg */}
      <mesh position={[-0.1, -0.45, 0]}>
        <boxGeometry args={[0.15, 0.7, 0.15]} />
        <meshStandardMaterial color="#555" /> 
      </mesh>
    </group>
  );
};

const Player = ({
  publishPresence,
  myColor,
  hp,
  state,
  onShot
}: {
  publishPresence: (data: any) => void;
  myColor: string;
  hp: number;
  state: string;
  onShot: (targetId: string) => void;
}) => {
  const { camera, scene } = useThree();
  const [moveForward, setMoveForward] = useState(false);
  const [moveBackward, setMoveBackward] = useState(false);
  const [moveLeft, setMoveLeft] = useState(false);
  const [moveRight, setMoveRight] = useState(false);
  
  const weaponRef = useRef<{ fire: () => void }>(null);
  const lastPublishTime = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const prevState = useRef(state);

  // Respawn Logic: Reset position when transitioning to 'alive'
  useEffect(() => {
      if (prevState.current !== 'alive' && state === 'alive') {
           // Generate random spawn
           const x = (Math.random() - 0.5) * MAP_SIZE;
           const z = (Math.random() - 0.5) * MAP_SIZE;
           camera.position.set(x, PLAYER_HEIGHT, z);
      }
      prevState.current = state;
  }, [state, camera]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Disable movement if dead
      if (state !== 'alive') {
          setMoveForward(false);
          setMoveBackward(false);
          setMoveLeft(false);
          setMoveRight(false);
          return;
      }

      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          setMoveForward(true);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          setMoveLeft(true);
          break;
        case 'ArrowDown':
        case 'KeyS':
          setMoveBackward(true);
          break;
        case 'ArrowRight':
        case 'KeyD':
          setMoveRight(true);
          break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          setMoveForward(false);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          setMoveLeft(false);
          break;
        case 'ArrowDown':
        case 'KeyS':
          setMoveBackward(false);
          break;
        case 'ArrowRight':
        case 'KeyD':
          setMoveRight(false);
          break;
      }
    };

    const onMouseDown = () => {
        if (state !== 'alive') return;

        weaponRef.current?.fire();
        
        // Raycast for hits
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        // Helper to find root
        const findPlayerRoot = (obj: THREE.Object3D | null): THREE.Object3D | null => {
             if (!obj) return null;
             if (obj.userData && obj.userData.type === 'player') return obj;
             return findPlayerRoot(obj.parent);
        };

        for (const intersect of intersects) {
            const root = findPlayerRoot(intersect.object);
            if (root && root.userData.peerId) {
                console.log("Shot player:", root.userData.peerId);
                onShot(root.userData.peerId);
                break; // Hit first thing
            }
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [camera, scene, raycaster, onShot, state]);

  useFrame((r3fState, delta) => {
    // Disable movement logic if dead
    if (state !== 'alive') {
        return;
    }

    const speed = PLAYER_SPEED * delta;
    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3(
      0,
      0,
      Number(moveBackward) - Number(moveForward)
    );
    const sideVector = new THREE.Vector3(
      Number(moveLeft) - Number(moveRight),
      0,
      0
    );

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(speed)
      .applyEuler(camera.rotation);

    camera.position.x += direction.x;
    camera.position.z += direction.z;
    camera.position.y = PLAYER_HEIGHT;

    // Publish Presence (Throttle to ~20-30ms to avoid saturating websocket)
    const now = r3fState.clock.elapsedTime;
    if (now - lastPublishTime.current > 0.05) { // 20 updates per second
        lastPublishTime.current = now;
        
        // Extract Y rotation from camera quaternion
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(camera.quaternion);

        publishPresence({
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
            rotation: euler.y, // Only need Y rotation for body facing
            color: myColor,
            name: 'Player',
            hp: hp,
            state: state,
        });
    }
  });

  return (
      <>
        <PointerLockControls />
        <Weapon ref={weaponRef} />
      </>
  );
};

// --- Main Game Component ---

export default function GameScene({ mapId }: { mapId: string }) {
  // InstantDB Room Connection
  // Cast to any to bypass TS check for useTopic which might be missing in strict schema inference
  // Use mapId as the room slug
  const room = db.room("game", mapId) as any;
  const { peers, publishPresence } = room.usePresence();

  // Local State for me
  const [myHp, setMyHp] = useState(100);
  const [myState, setMyState] = useState<'alive' | 'dying' | 'dead'>('alive');
  
  // Generate a random session ID for this tab
  const sessionId = useMemo(() => Math.random().toString(36).substr(2, 9), []);

  // State to track processed shots to avoid double damage
  // Map<PeerId, LastShotId>
  const processedShots = useRef<Record<string, number>>({});

  // Generate a random color for this session
  const myColor = useMemo(() => {
      const colors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f1c40f', '#e67e22'];
      return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  // Publish Shot Data via Presence
  const handleShot = React.useCallback((targetId: string) => {
      latestShotRef.current = {
          id: Math.random(),
          targetId: targetId,
          time: Date.now()
      };
  }, []);

  const latestShotRef = useRef<{ id: number, targetId: string, time: number } | null>(null);

  // Check for hits on ME - Using useEffect since we are outside Canvas
  useEffect(() => {
      if (myState !== 'alive') return;

      // Iterate peers to see if anyone shot ME
      Object.values(peers).forEach((peer: any) => {
          if (peer.shotTarget === sessionId && peer.shotId) {
              // Check if we already processed this shot
              const shooterSessionId = peer.id;
              
              if (processedShots.current[shooterSessionId] !== peer.shotId) {
                  // New shot!
                  console.log(`Hit by ${shooterSessionId}`);
                  processedShots.current[shooterSessionId] = peer.shotId;
                  SoundUtils.playHit();
                  
                  setMyHp(prev => {
                      const newHp = prev - 50; // Fixed damage
                      return newHp < 0 ? 0 : newHp;
                  });
              }
          }
      });
  }, [peers, myState, sessionId]);
  
  // Handle Death Logic
  useEffect(() => {
      if (myHp <= 0 && myState === 'alive') {
          // Skip dying, go straight to dead to "disappear right away"
          setMyState('dead');
          SoundUtils.playDeath();
          
          // Respawn timer (shorter now, or just wait for respawn delay)
          setTimeout(() => {
              setMyHp(100);
              setMyState('alive');
          }, 2000); 
      }
  }, [myHp, myState]);

  // Wrap publishPresence for Player to inject shot data
  const publishPresenceWrapper = (data: any) => {
      const shotData = latestShotRef.current;
      
      const extra = shotData ? {
          shotId: shotData.id,
          shotTarget: shotData.targetId,
      } : {};

      publishPresence({ 
          ...data, 
          id: sessionId,
          ...extra
      });
  };

  const validPeers = Object.values(peers).filter((p: any) => p.x !== undefined && p.y !== undefined);

  return (
    <div className="w-full h-full relative bg-black">
        {/* UI Overlay */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full z-10 pointer-events-none mix-blend-difference" />
        <div className="absolute top-4 left-4 text-white z-10 font-mono">
            <h1 className="text-xl font-bold">CS: Gemini Multiplayer</h1>
            <p>WASD to Move. Click to Shoot.</p>
            <p>HP: {myHp} | State: {myState}</p>
            <p>Players Online: {validPeers.length + 1}</p>
        </div>
        
        {/* Dead Screen Overlay */}
        {myState !== 'alive' && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 z-20">
                <h1 className="text-5xl font-bold text-white">YOU DIED</h1>
            </div>
        )}

      <Canvas shadows camera={{ fov: 75 }}>
        <Sky sunPosition={[100, 20, 100]} />
        <Stars />
        <Stats />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} castShadow />
        
        <Floor />
        <MapObstacles mapId={mapId} />
        
        <Player 
            publishPresence={publishPresenceWrapper} 
            myColor={myColor} 
            hp={myHp}
            state={myState}
            onShot={handleShot}
        />
        
        {validPeers.map((peer: any) => (
             <RemotePlayer 
                key={peer.id || Math.random()} 
                id={peer.id}
                position={[peer.x, peer.y - (PLAYER_HEIGHT / 2), peer.z]}
                rotation={peer.rotation || 0}
                color={peer.color || 'white'}
                name={peer.name || 'Guest'}
                state={peer.state || 'alive'}
                hp={peer.hp ?? 100}
             />
        ))}
      </Canvas>
    </div>
  );
}