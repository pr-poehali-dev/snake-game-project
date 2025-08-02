import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface Tree {
  id: string;
  position: THREE.Vector3;
  size: number;
  health: number;
  maxHealth: number;
  mesh?: THREE.Mesh;
}

const TreeChopperGame = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const playerRef = useRef<THREE.Object3D>();
  const treesRef = useRef<Tree[]>([]);
  const animationRef = useRef<number>();
  
  const [gameStarted, setGameStarted] = useState(false);
  const [woodCount, setWoodCount] = useState(0);
  const [treesChopped, setTreesChopped] = useState(0);
  const [currentTool, setCurrentTool] = useState('axe');
  const [isChopping, setIsChopping] = useState(false);

  // Movement controls
  const keysRef = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    space: false
  });

  const mouseRef = useRef({
    x: 0,
    y: 0,
    isLocked: false
  });

  // Initialize 3D scene
  const initScene = useCallback(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 }); // Light green
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Player object (invisible, just for position tracking)
    const player = new THREE.Object3D();
    player.position.copy(camera.position);
    scene.add(player);

    // Store references
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    playerRef.current = player;

    // Generate trees
    generateTrees(scene);

    // Start animation loop
    animate();
  }, []);

  // Generate random trees
  const generateTrees = (scene: THREE.Scene) => {
    const trees: Tree[] = [];
    
    for (let i = 0; i < 50; i++) {
      const x = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 200;
      
      // Don't place trees too close to spawn point
      if (Math.sqrt(x * x + z * z) < 10) continue;
      
      const size = Math.random() * 2 + 1;
      const health = Math.floor(size * 3);
      
      const tree: Tree = {
        id: `tree_${i}`,
        position: new THREE.Vector3(x, 0, z),
        size,
        health,
        maxHealth: health
      };
      
      // Create tree mesh
      const trunkGeometry = new THREE.CylinderGeometry(size * 0.3, size * 0.4, size * 4);
      const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.set(x, size * 2, z);
      trunk.castShadow = true;
      
      const leavesGeometry = new THREE.SphereGeometry(size * 1.5);
      const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // Forest green
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.set(x, size * 4, z);
      leaves.castShadow = true;
      
      const treeGroup = new THREE.Group();
      treeGroup.add(trunk);
      treeGroup.add(leaves);
      treeGroup.userData = { treeId: tree.id };
      
      scene.add(treeGroup);
      tree.mesh = treeGroup;
      trees.push(tree);
    }
    
    treesRef.current = trees;
  };

  // Animation loop
  const animate = () => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !playerRef.current) return;

    // Handle movement
    const speed = 0.3;
    const direction = new THREE.Vector3();
    
    if (keysRef.current.w) direction.z -= speed;
    if (keysRef.current.s) direction.z += speed;
    if (keysRef.current.a) direction.x -= speed;
    if (keysRef.current.d) direction.x += speed;
    
    // Apply camera rotation to movement direction
    direction.applyEuler(cameraRef.current.rotation);
    direction.y = 0; // Don't move up/down
    
    playerRef.current.position.add(direction);
    cameraRef.current.position.copy(playerRef.current.position);

    // Render
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationRef.current = requestAnimationFrame(animate);
  };

  // Handle tree chopping
  const chopTree = () => {
    if (!cameraRef.current || isChopping) return;

    setIsChopping(true);
    
    // Raycast to find tree
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(cameraRef.current.quaternion);
    
    raycaster.set(cameraRef.current.position, direction);
    
    const intersects = raycaster.intersectObjects(sceneRef.current?.children || [], true);
    
    for (const intersect of intersects) {
      const treeId = intersect.object.parent?.userData?.treeId;
      if (treeId && intersect.distance < 8) {
        const tree = treesRef.current.find(t => t.id === treeId);
        if (tree && tree.health > 0) {
          tree.health -= 1;
          
          // Tree chopped animation
          if (tree.mesh) {
            tree.mesh.rotation.z += 0.1;
            
            if (tree.health <= 0) {
              // Tree falls down
              tree.mesh.rotation.z = Math.PI / 2;
              setWoodCount(prev => prev + Math.floor(tree.size * 2));
              setTreesChopped(prev => prev + 1);
              
              // Remove tree after delay
              setTimeout(() => {
                if (tree.mesh && sceneRef.current) {
                  sceneRef.current.remove(tree.mesh);
                }
              }, 2000);
            }
          }
          break;
        }
      }
    }
    
    setTimeout(() => setIsChopping(false), 500);
  };

  // Event handlers
  useEffect(() => {
    if (!gameStarted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          keysRef.current.w = true;
          break;
        case 'KeyA':
          keysRef.current.a = true;
          break;
        case 'KeyS':
          keysRef.current.s = true;
          break;
        case 'KeyD':
          keysRef.current.d = true;
          break;
        case 'Space':
          event.preventDefault();
          chopTree();
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          keysRef.current.w = false;
          break;
        case 'KeyA':
          keysRef.current.a = false;
          break;
        case 'KeyS':
          keysRef.current.s = false;
          break;
        case 'KeyD':
          keysRef.current.d = false;
          break;
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!mouseRef.current.isLocked || !cameraRef.current) return;

      const sensitivity = 0.002;
      mouseRef.current.x -= event.movementX * sensitivity;
      mouseRef.current.y -= event.movementY * sensitivity;
      
      mouseRef.current.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseRef.current.y));
      
      cameraRef.current.rotation.order = 'YXZ';
      cameraRef.current.rotation.y = mouseRef.current.x;
      cameraRef.current.rotation.x = mouseRef.current.y;
    };

    const handleClick = () => {
      if (mountRef.current && !mouseRef.current.isLocked) {
        mountRef.current.requestPointerLock();
      } else {
        chopTree();
      }
    };

    const handlePointerLockChange = () => {
      mouseRef.current.isLocked = document.pointerLockElement === mountRef.current;
    };

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [gameStarted]);

  // Initialize scene when game starts
  useEffect(() => {
    if (gameStarted) {
      initScene();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [gameStarted, initScene]);

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-400 to-green-600 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">🌲 Лесоруб 3D</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <p className="text-lg">Добро пожаловать в виртуальный лес!</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>🎯 Цель: рубите деревья и собирайте древесину</p>
                <p>🎮 Управление: WASD - движение, Пробел - рубить</p>
                <p>🖱️ Мышь: осмотр (после клика в игру)</p>
              </div>
            </div>
            
            <Button onClick={() => setGameStarted(true)} className="w-full" size="lg">
              <Icon name="Play" className="mr-2" size={20} />
              Начать игру
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      {/* Game mount point */}
      <div ref={mountRef} className="w-full h-full" />
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 space-y-2">
        <Card className="bg-black/70 text-white border-green-500">
          <CardContent className="p-3">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Icon name="TreePine" size={16} />
                <span>Древесина: {woodCount}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Icon name="Target" size={16} />
                <span>Срублено: {treesChopped}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {isChopping && (
          <Card className="bg-yellow-500/80 text-black">
            <CardContent className="p-2 text-center">
              <span className="text-sm font-bold">🪓 Рубим!</span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4">
        <Card className="bg-black/70 text-white border-green-500">
          <CardContent className="p-3">
            <div className="text-xs space-y-1">
              <div>WASD - Движение</div>
              <div>Пробел - Рубить дерево</div>
              <div>Мышь - Осмотр</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exit button */}
      <div className="absolute top-4 right-4">
        <Button 
          onClick={() => setGameStarted(false)}
          variant="outline"
          size="sm"
          className="bg-black/70 text-white border-red-500 hover:bg-red-500/20"
        >
          <Icon name="X" size={16} className="mr-1" />
          Выход
        </Button>
      </div>
    </div>
  );
};

export default TreeChopperGame;