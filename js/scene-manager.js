/**
 * Scene Manager for 3D Ceiling Pop
 * Manages Three.js scene, camera, lighting, and all 3D objects
 */

class SceneManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.geometryCache = new GeometryCache();
        
        // Game objects
        this.balloons = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.stars = [];
        this.miniShips = [];
        this.effects = [];
        
        // Object pools for performance
        this.particlePool = null;
        this.projectilePool = null;
        
        // Lighting
        this.ambientLight = null;
        this.directionalLight = null;
        this.pointLights = [];
        
        // Effects
        this.shieldEffect = null;
        this.depthVisionEffect = null;
        this.vortexAmplifierActive = false;
        
        // Quality settings
        this.qualitySettings = DeviceUtils.getQualitySettings();
        
        // Performance tracking
        this.lastCleanupTime = 0;
        this.cleanupInterval = 5000; // Cleanup every 5 seconds
        
        this.init();
    }
    
    init() {
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupLighting();
        this.setupObjectPools();
        this.createStarField();
        this.setupPostProcessing();
        
        console.log('Scene Manager: Initialization complete');
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: this.qualitySettings.antialiasing,
            alpha: false,
            powerPreference: "high-performance"
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * this.qualitySettings.renderScale);
        
        // Enable shadows if supported
        if (this.qualitySettings.shadowsEnabled) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        
        // Set background color
        this.renderer.setClearColor(0x000000, 1);
        
        // Enable tone mapping for better visuals
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        
        // Add fog for depth perception
        this.scene.fog = new THREE.Fog(0x000000, 50, 200);
        
        // Add background (space nebula effect)
        this.createSpaceBackground();
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75, // FOV
            window.innerWidth / window.innerHeight,
            0.1, // Near plane
            1000 // Far plane
        );
        
        // Position camera for the "looking into depth" perspective
        this.camera.position.set(0, 0, 20);
        this.camera.lookAt(0, 0, 0);
        
        // Add subtle camera movement for immersion
        this.cameraBasePosition = this.camera.position.clone();
        this.cameraShake = { x: 0, y: 0, intensity: 0 };
    }
    
    setupLighting() {
        // Ambient light for overall visibility
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(this.ambientLight);
        
        // Main directional light from camera direction
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(0, 0, 1);
        this.directionalLight.target.position.set(0, 0, 0);
        
        if (this.qualitySettings.shadowsEnabled) {
            this.directionalLight.castShadow = true;
            this.directionalLight.shadow.mapSize.width = 1024;
            this.directionalLight.shadow.mapSize.height = 1024;
            this.directionalLight.shadow.camera.near = 0.5;
            this.directionalLight.shadow.camera.far = 100;
        }
        
        this.scene.add(this.directionalLight);
        this.scene.add(this.directionalLight.target);
        
        // Add colored point lights for atmosphere
        this.createAtmosphericLights();
    }
    
    createAtmosphericLights() {
        const lightColors = [0x00ffff, 0xff0080, 0x8000ff];
        const lightPositions = [
            { x: -30, y: 20, z: -20 },
            { x: 30, y: -20, z: -40 },
            { x: 0, y: 30, z: -60 }
        ];
        
        for (let i = 0; i < lightColors.length; i++) {
            const light = new THREE.PointLight(lightColors[i], 0.3, 80);
            light.position.set(
                lightPositions[i].x,
                lightPositions[i].y,
                lightPositions[i].z
            );
            this.pointLights.push(light);
            this.scene.add(light);
        }
    }
    
    setupObjectPools() {
        // Particle pool
        this.particlePool = new ObjectPool(
            () => new Particle3D(this.scene, this.geometryCache),
            (particle) => {
                particle.isAlive = true;
                particle.age = 0;
                if (particle.mesh) {
                    particle.mesh.visible = true;
                }
            },
            this.qualitySettings.maxParticles / 4
        );
        
        // Projectile pool
        this.projectilePool = new ObjectPool(
            () => new Projectile3D(this.scene, this.geometryCache),
            (projectile) => {
                projectile.isAlive = true;
                projectile.age = 0;
                if (projectile.mesh) {
                    projectile.mesh.visible = true;
                }
            },
            50
        );
    }
    
    createStarField() {
        const starCount = this.qualitySettings.starCount;
        
        for (let i = 0; i < starCount; i++) {
            const star = new Star3D(this.scene, this.geometryCache);
            this.stars.push(star);
        }
        
        console.log(`Scene Manager: Created ${starCount} stars`);
    }
    
    createSpaceBackground() {
        // Create a large sphere with space texture for background
        const backgroundGeometry = new THREE.SphereGeometry(500, 32, 16);
        
        // Create a simple star field texture using canvas
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Fill with black
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 512, 512);
        
        // Add stars
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 2;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add nebula-like effects
        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        gradient.addColorStop(0, 'rgba(100, 0, 200, 0.3)');
        gradient.addColorStop(0.5, 'rgba(0, 100, 200, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        const texture = new THREE.CanvasTexture(canvas);
        const backgroundMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide
        });
        
        const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        this.scene.add(backgroundMesh);
    }
    
    setupPostProcessing() {
        // Add bloom effect for enhanced visuals
        // This is a simplified version - in a full implementation, you'd use EffectComposer
        this.renderer.outputEncoding = THREE.sRGBEncoding;
    }
    
    // Game object creation methods
    spawnBalloon() {
        const balloon = new Balloon3D(this.scene, this.geometryCache);
        this.balloons.push(balloon);
        return balloon;
    }
    
    spawnEnemy() {
        const enemy = new EnemyDrone3D(this.scene, this.geometryCache);
        this.enemies.push(enemy);
        return enemy;
    }
    
    spawnMiniShips(count = 3) {
        // Remove existing mini ships
        this.removeMiniShips();
        
        for (let i = 0; i < count; i++) {
            const miniShip = new MiniShip3D(this.scene, this.geometryCache, i);
            this.miniShips.push(miniShip);
        }
        
        console.log(`Scene Manager: Spawned ${count} mini ships`);
    }
    
    removeMiniShips() {
        this.miniShips.forEach(ship => ship.destroy());
        this.miniShips = [];
    }
    
    createParticle(options) {
        let particle = this.particlePool.acquire();
        
        // Reset particle properties
        particle.size = options.size || MathUtils.random(0.05, 0.2);
        particle.color = options.color || ColorUtils.randomVibrant();
        particle.life = options.life || MathUtils.random(1, 3);
        particle.maxAge = particle.life;
        
        if (options.position) particle.position.copy(options.position);
        if (options.velocity) particle.velocity.copy(options.velocity);
        
        // Update mesh properties
        if (particle.mesh) {
            particle.mesh.material.color = ColorUtils.toThreeColor(particle.color);
            particle.mesh.scale.setScalar(particle.size / 0.1); // Normalize scale
            particle.mesh.visible = true;
        }
        
        this.particles.push(particle);
        return particle;
    }
    
    createPlayerProjectile(options) {
        const projectile = this.projectilePool.acquire();
        projectile.owner = 'player';
        
        // Set starting position (from player/camera area)
        const startPos = new THREE.Vector3(0, 0, 15); // Player position
        projectile.setPosition(startPos.x, startPos.y, startPos.z);
        
        if (options.targetPosition) {
            // Calculate direction FROM player TO target (not the other way around)
            const direction = options.targetPosition.clone().sub(startPos).normalize();
            projectile.setDirection(direction);
        }
        
        this.projectiles.push(projectile);
        return projectile;
    }
    
    createEnemyProjectile(options) {
        const projectile = new Projectile3D(this.scene, this.geometryCache, 'enemy');
        
        if (options.position) projectile.setPosition(options.position.x, options.position.y, options.position.z);
        
        if (options.targetPosition) {
            const direction = options.targetPosition.clone().sub(projectile.position).normalize();
            projectile.setDirection(direction);
        }
        
        this.projectiles.push(projectile);
        return projectile;
    }
    
    // Power-up effect methods
    activateShieldEffect() {
        if (this.shieldEffect) return;
        
        const shieldGeometry = new THREE.SphereGeometry(25, 32, 16);
        const shieldMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        
        this.shieldEffect = new THREE.Mesh(shieldGeometry, shieldMaterial);
        this.shieldEffect.position.set(0, 0, 15);
        this.scene.add(this.shieldEffect);
        
        console.log('Scene Manager: Shield effect activated');
    }
    
    deactivateShieldEffect() {
        if (this.shieldEffect) {
            this.scene.remove(this.shieldEffect);
            this.shieldEffect.geometry.dispose();
            this.shieldEffect.material.dispose();
            this.shieldEffect = null;
        }
    }
    
    activateDepthVision() {
        // Enhance depth perception with visual indicators
        this.depthVisionEffect = true;
        
        // Add depth grid lines
        this.createDepthGrid();
        
        console.log('Scene Manager: Depth vision activated');
    }
    
    deactivateDepthVision() {
        this.depthVisionEffect = false;
        
        // Remove depth grid
        this.removeDepthGrid();
    }
    
    createDepthGrid() {
        if (this.depthGrid) return;
        
        const gridGeometry = new THREE.PlaneGeometry(100, 80, 10, 8);
        const gridMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.1,
            wireframe: true
        });
        
        this.depthGrid = new THREE.Mesh(gridGeometry, gridMaterial);
        this.depthGrid.position.set(0, 0, -50);
        this.scene.add(this.depthGrid);
    }
    
    removeDepthGrid() {
        if (this.depthGrid) {
            this.scene.remove(this.depthGrid);
            this.depthGrid.geometry.dispose();
            this.depthGrid.material.dispose();
            this.depthGrid = null;
        }
    }
    
    activateVortexAmplifier() {
        this.vortexAmplifierActive = true;
        console.log('Scene Manager: Vortex amplifier activated');
    }
    
    deactivateVortexAmplifier() {
        this.vortexAmplifierActive = false;
    }
    
    // Special effects
    fireEnergyBeam(startPos, endPos) {
        if (!window.powerUpManager || !window.powerUpManager.isActive('ENERGY_BEAM')) return;
        
        const start3D = this.screenToWorld(startPos.x, startPos.y, 15);
        const end3D = this.screenToWorld(endPos.x, endPos.y, -50);
        
        // Create beam geometry
        const points = [start3D, end3D];
        const beamGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const beamMaterial = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            linewidth: 10
        });
        
        const beam = new THREE.Line(beamGeometry, beamMaterial);
        this.scene.add(beam);
        
        // Remove beam after short duration
        setTimeout(() => {
            this.scene.remove(beam);
            beamGeometry.dispose();
            beamMaterial.dispose();
        }, 200);
        
        // Beam collision detection
        this.checkBeamCollisions(start3D, end3D);
        
        // Play sound
        if (window.audioManager) {
            window.audioManager.play('laser');
        }
        
        console.log('Scene Manager: Energy beam fired');
    }
    
    checkBeamCollisions(start, end) {
        const direction = end.clone().sub(start).normalize();
        const distance = start.distanceTo(end);
        
        // Check collisions with balloons and enemies
        const targets = [...this.balloons, ...this.enemies];
        let hits = 0;
        const maxHits = 5;
        
        targets.forEach(target => {
            if (!target.isAlive || hits >= maxHits) return;
            
            // Simple ray-sphere intersection
            const toTarget = target.position.clone().sub(start);
            const projectionLength = toTarget.dot(direction);
            
            if (projectionLength < 0 || projectionLength > distance) return;
            
            const projection = start.clone().add(direction.clone().multiplyScalar(projectionLength));
            const distanceToRay = target.position.distanceTo(projection);
            
            const hitRadius = target.radius || 2;
            if (distanceToRay <= hitRadius) {
                target.destroy();
                hits++;
                
                // Create impact particles
                for (let i = 0; i < 10; i++) {
                    this.createParticle({
                        position: target.position.clone(),
                        color: { r: 0, g: 255, b: 255 },
                        size: MathUtils.random(0.1, 0.3),
                        velocity: new THREE.Vector3(
                            MathUtils.random(-5, 5),
                            MathUtils.random(-5, 5),
                            MathUtils.random(-3, 3)
                        ),
                        life: 1
                    });
                }
            }
        });
    }
    
    triggerMiniShipVolley() {
        this.miniShips.forEach((ship, index) => {
            setTimeout(() => {
                ship.triggerVolley();
            }, index * 100);
        });
    }
    
    triggerDepthScan() {
        // Create expanding depth scan effect
        const scanGeometry = new THREE.RingGeometry(1, 30, 32);
        const scanMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const scan = new THREE.Mesh(scanGeometry, scanMaterial);
        scan.position.set(0, 0, 0);
        this.scene.add(scan);
        
        // Animate scan
        let scanRadius = 1;
        const scanAnimation = () => {
            scanRadius += 2;
            scan.scale.setScalar(scanRadius);
            scan.material.opacity = Math.max(0, 0.6 - scanRadius * 0.02);
            
            if (scanRadius < 50) {
                requestAnimationFrame(scanAnimation);
            } else {
                this.scene.remove(scan);
                scanGeometry.dispose();
                scanMaterial.dispose();
            }
        };
        
        scanAnimation();
        
        // Highlight targets in depth
        this.highlightTargetsByDepth();
    }
    
    highlightTargetsByDepth() {
        const targets = [...this.balloons, ...this.enemies];
        
        targets.forEach(target => {
            if (!target.mesh || !target.isAlive) return;
            
            const originalMaterial = target.mesh.material;
            
            // Temporarily highlight based on depth
            const depthFactor = Math.abs(target.position.z) / 100;
            const highlightColor = depthFactor > 0.5 ? 0xff0000 : 0x00ff00;
            
            if (originalMaterial.emissive) {
                originalMaterial.emissive.setHex(highlightColor);
                setTimeout(() => {
                    if (originalMaterial.emissive) {
                        originalMaterial.emissive.setHex(0x000000);
                    }
                }, 1000);
            }
        });
    }
    
    triggerVortexBlast() {
        // Create a massive vortex effect at cursor position
        if (!window.inputHandler) return;
        
        const pointerPos = window.inputHandler.getLastPointerPosition();
        const worldPos = this.screenToWorld(pointerPos.x, pointerPos.y, -20);
        
        this.createVortexEffect(worldPos, 15);
        
        // Find and chain-destroy nearby targets
        const targets = [...this.balloons, ...this.enemies];
        const chainRadius = 15;
        
        targets.forEach(target => {
            if (!target.isAlive) return;
            
            const distance = worldPos.distanceTo(target.position);
            if (distance <= chainRadius) {
                setTimeout(() => {
                    if (target.isAlive) target.destroy();
                }, MathUtils.random(100, 500));
            }
        });
    }
    
    createVortexEffect(position, radius) {
        // Create swirling particle effect
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const distance = MathUtils.random(radius * 0.2, radius);
            
            this.createParticle({
                position: new THREE.Vector3(
                    position.x + Math.cos(angle) * distance,
                    position.y + Math.sin(angle) * distance,
                    position.z
                ),
                color: { r: 255, g: 0, b: 255 },
                size: MathUtils.random(0.2, 0.5),
                velocity: new THREE.Vector3(
                    -Math.cos(angle) * 5,
                    -Math.sin(angle) * 5,
                    MathUtils.random(-2, 2)
                ),
                life: 2
            });
        }
        
        // Play vortex sound
        if (window.audioManager) {
            window.audioManager.play('vortexChain', { position: position });
        }
    }
    
    spawnBoss() {
        // Create a larger, more powerful enemy
        const boss = new EnemyDrone3D(this.scene, this.geometryCache);
        boss.width *= 2;
        boss.height *= 2;
        boss.depth *= 2;
        boss.health = 10;
        boss.points = 500;
        boss.speed *= 0.7; // Slower but more menacing
        
        // Recreate mesh with larger size
        boss.destroy();
        boss.createMesh(this.geometryCache);
        boss.setupMovement();
        
        this.enemies.push(boss);
        console.log('Scene Manager: Boss spawned!');
    }
    
    // Utility methods
    screenToWorld(screenX, screenY, depth = 0) {
        return MathUtils.screenToWorld(screenX, screenY, this.camera, depth);
    }
    
    worldToScreen(worldPos) {
        const vector = worldPos.clone();
        vector.project(this.camera);
        
        return {
            x: (vector.x + 1) * window.innerWidth / 2,
            y: (-vector.y + 1) * window.innerHeight / 2
        };
    }
    
    // Update method
    update(deltaTime) {
        // Update camera effects
        this.updateCamera(deltaTime);
        
        // Update all game objects
        this.updateGameObjects(deltaTime);
        
        // Handle collisions
        this.handleCollisions();
        
        // Cleanup dead objects
        this.cleanup();
        
        // Update effects
        this.updateEffects(deltaTime);
    }
    
    updateCamera(deltaTime) {
        // Apply camera shake
        if (this.cameraShake.intensity > 0) {
            this.camera.position.x = this.cameraBasePosition.x + 
                (Math.random() - 0.5) * this.cameraShake.intensity;
            this.camera.position.y = this.cameraBasePosition.y + 
                (Math.random() - 0.5) * this.cameraShake.intensity;
            
            this.cameraShake.intensity *= 0.95; // Decay shake
        }
        
        // Subtle breathing effect
        const breathe = Math.sin(Date.now() * 0.001) * 0.1;
        this.camera.position.z = this.cameraBasePosition.z + breathe;
    }
    
    updateGameObjects(deltaTime) {
        // Update all object arrays
        [this.balloons, this.enemies, this.projectiles, this.particles, this.stars, this.miniShips]
            .forEach(array => {
                array.forEach(obj => obj.update(deltaTime));
            });
    }
    
    handleCollisions() {
        // Player projectiles vs targets
        this.projectiles.filter(p => p.owner === 'player').forEach(projectile => {
            if (!projectile.isAlive) return;
            
            // Check against enemies first (higher priority)
            this.enemies.forEach(enemy => {
                if (!enemy.isAlive) return;
                
                const distance = projectile.getDistance(enemy);
                const hitRadius = Math.max(enemy.width, enemy.height) / 2 + 1;
                
                if (distance <= hitRadius) {
                    if (enemy.hit()) {
                        this.removeObject(this.enemies, enemy);
                    }
                    this.removeObject(this.projectiles, projectile);
                    projectile.destroy();
                }
            });
            
            // Check against balloons
            if (projectile.isAlive) {
                this.balloons.forEach(balloon => {
                    if (!balloon.isAlive) return;
                    
                    const distance = projectile.getDistance(balloon);
                    const hitRadius = balloon.radius + 0.5;
                    
                    if (distance <= hitRadius) {
                        if (balloon.hit()) {
                            this.removeObject(this.balloons, balloon);
                        }
                        this.removeObject(this.projectiles, projectile);
                        projectile.destroy();
                    }
                });
            }
        });
        
        // Enemy projectiles vs player area
        this.projectiles.filter(p => p.owner === 'enemy').forEach(projectile => {
            if (projectile.position.z > 15) {
                // Projectile reached player area
                if (window.player) {
                    const gameOver = window.player.takeDamage(projectile.damage);
                    if (gameOver && window.gameController) {
                        window.gameController.gameOver();
                    }
                }
                this.removeObject(this.projectiles, projectile);
                projectile.destroy();
                
                // Add screen shake
                this.addCameraShake(0.5);
            }
        });
    }
    
    cleanup() {
        const currentTime = Date.now();
        if (currentTime - this.lastCleanupTime < this.cleanupInterval) return;
        
        // Remove dead objects
        this.balloons = this.balloons.filter(obj => obj.isAlive);
        this.enemies = this.enemies.filter(obj => obj.isAlive);
        this.projectiles = this.projectiles.filter(obj => obj.isAlive);
        this.miniShips = this.miniShips.filter(obj => obj.isAlive);
        
        // Return dead particles to pool
        this.particles = this.particles.filter(particle => {
            if (!particle.isAlive) {
                if (particle.mesh) particle.mesh.visible = false;
                this.particlePool.release(particle);
                return false;
            }
            return true;
        });
        
        this.lastCleanupTime = currentTime;
    }
    
    updateEffects(deltaTime) {
        // Shield effect animation
        if (this.shieldEffect) {
            this.shieldEffect.rotation.y += deltaTime * 0.5;
            const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 0.2;
            this.shieldEffect.material.opacity = pulse;
        }
        
        // Depth grid animation
        if (this.depthGrid) {
            this.depthGrid.material.opacity = 0.1 + Math.sin(Date.now() * 0.003) * 0.05;
        }
        
        // Atmospheric light animation
        this.pointLights.forEach((light, index) => {
            const time = Date.now() * 0.001 + index * 2;
            light.intensity = 0.2 + Math.sin(time) * 0.1;
        });
    }
    
    addCameraShake(intensity) {
        this.cameraShake.intensity = Math.max(this.cameraShake.intensity, intensity);
    }
    
    removeObject(array, object) {
        const index = array.indexOf(object);
        if (index !== -1) {
            array.splice(index, 1);
        }
    }
    
    // Getters for game objects
    getBalloons() { return this.balloons; }
    getEnemies() { return this.enemies; }
    getProjectiles() { return this.projectiles; }
    getParticles() { return this.particles; }
    getMiniShips() { return this.miniShips; }
    
    // Handle tap/click in 3D space
    handleTap(screenX, screenY) {
        const worldPos = this.screenToWorld(screenX, screenY, -30);
        
        // Find closest target to tap position
        const targets = [...this.balloons, ...this.enemies];
        let closestTarget = null;
        let closestDistance = Infinity;
        const maxTapDistance = 5;
        
        targets.forEach(target => {
            if (!target.isAlive) return;
            
            const distance = worldPos.distanceTo(target.position);
            if (distance < closestDistance && distance <= maxTapDistance) {
                closestDistance = distance;
                closestTarget = target;
            }
        });
        
        if (closestTarget) {
            // Direct hit
            if (closestTarget.hit()) {
                this.removeObject(
                    closestTarget instanceof Balloon3D ? this.balloons : this.enemies,
                    closestTarget
                );
            }
            
            // Add camera shake for impact
            this.addCameraShake(0.2);
            
            return true;
        }
        
        return false;
    }
    
    // Handle window resize
    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // Render the scene
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    // Dispose of all resources
    dispose() {
        // Dispose all game objects
        [...this.balloons, ...this.enemies, ...this.projectiles, ...this.particles, ...this.stars, ...this.miniShips]
            .forEach(obj => obj.destroy());
        
        // Dispose object pools
        if (this.particlePool) this.particlePool.releaseAll();
        if (this.projectilePool) this.projectilePool.releaseAll();
        
        // Dispose geometry cache
        this.geometryCache.dispose();
        
        // Dispose effects
        this.deactivateShieldEffect();
        this.deactivateDepthVision();
        
        // Dispose renderer
        this.renderer.dispose();
        
        console.log('Scene Manager: Disposed all resources');
    }
}

// Export globally
window.SceneManager = SceneManager;