/**
 * 3D Game Objects for Ceiling Pop 3D
 * All game entities represented as Three.js objects
 */

// Base class for all 3D game objects
class GameObject3D {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.rotation = new THREE.Vector3();
        this.scale = new THREE.Vector3(1, 1, 1);
        this.isAlive = true;
        this.age = 0;
        this.maxAge = Infinity;
    }
    
    update(deltaTime) {
        this.age += deltaTime;
        
        // Apply velocity
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Update mesh position and rotation
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.x += this.rotation.x * deltaTime;
            this.mesh.rotation.y += this.rotation.y * deltaTime;
            this.mesh.rotation.z += this.rotation.z * deltaTime;
            this.mesh.scale.copy(this.scale);
        }
        
        // Check for death
        if (this.age >= this.maxAge) {
            this.destroy();
        }
    }
    
    destroy() {
        this.isAlive = false;
        if (this.mesh && this.scene) {
            this.scene.remove(this.mesh);
            
            // Dispose geometry and materials
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(mat => mat.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
        }
    }
    
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        if (this.mesh) this.mesh.position.copy(this.position);
    }
    
    getDistance(other) {
        return this.position.distanceTo(other.position);
    }
}

// 3D Balloon class
class Balloon3D extends GameObject3D {
    constructor(scene, geometryCache) {
        super(scene);
        
        this.radius = MathUtils.random(2, 4);
        this.points = 50;
        this.health = 1;
        this.maxHealth = 1;
        this.type = 'normal';
        this.bobSpeed = MathUtils.random(0.5, 1.5);
        this.bobAmplitude = MathUtils.random(0.2, 0.5);
        this.color = ColorUtils.randomVibrant();
        
        // Determine balloon type
        const typeRoll = Math.random();
        if (window.player && window.player.wave >= 3 && typeRoll < 0.15) {
            this.type = 'armored';
            this.health = 3;
            this.maxHealth = 3;
            this.points = 150;
            this.color = { r: 139, g: 0, b: 139 }; // Dark magenta
            this.radius *= 1.2;
        } else if (typeRoll > 0.85) {
            this.type = 'powerup';
            this.points = 100;
            this.color = { r: 50, g: 255, b: 50 }; // Neon green
        }
        
        this.createMesh(geometryCache);
        this.setupMovement();
    }
    
    createMesh(geometryCache) {
        // Create balloon geometry
        const geometry = geometryCache.getSphere(this.radius, 16, 12);
        
        // Create material based on type
        let material;
        if (this.type === 'powerup') {
            material = new THREE.MeshPhongMaterial({
                color: ColorUtils.toThreeColor(this.color),
                emissive: new THREE.Color(0.2, 0.6, 0.2),
                shininess: 100,
                transparent: true,
                opacity: 0.9
            });
        } else {
            material = new THREE.MeshPhongMaterial({
                color: ColorUtils.toThreeColor(this.color),
                shininess: 80,
                transparent: true,
                opacity: 0.85
            });
        }
        
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Add glow effect for power-ups
        if (this.type === 'powerup') {
            const glowGeometry = geometryCache.getSphere(this.radius * 1.3, 8, 6);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.3,
                side: THREE.BackSide
            });
            const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
            this.mesh.add(glowMesh);
        }
        
        // Add damage indicators for armored balloons
        if (this.type === 'armored') {
            this.createArmorPlating(geometryCache);
        }
        
        this.scene.add(this.mesh);
    }
    
    createArmorPlating(geometryCache) {
        const plateGeometry = geometryCache.getBox(0.3, 0.3, 0.1);
        const plateMaterial = new THREE.MeshPhongMaterial({
            color: 0x404040,
            metalness: 0.7,
            roughness: 0.3
        });
        
        // Add armor plates around the balloon
        for (let i = 0; i < 6; i++) {
            const plate = new THREE.Mesh(plateGeometry, plateMaterial);
            const angle = (i / 6) * Math.PI * 2;
            plate.position.set(
                Math.cos(angle) * this.radius * 0.8,
                Math.sin(angle) * this.radius * 0.8,
                0
            );
            plate.rotation.z = angle;
            this.mesh.add(plate);
        }
    }
    
    setupMovement() {
        // Random starting position at far depth
        this.setPosition(
            MathUtils.random(-30, 30),
            MathUtils.random(-20, 20),
            -100 // Start far away
        );
        
        // Movement towards camera
        const speed = MathUtils.random(8, 15) + (window.player ? window.player.wave * 1 : 0);
        this.velocity.set(0, 0, speed);
        
        // Add some random drift
        this.velocity.x = MathUtils.random(-2, 2);
        this.velocity.y = MathUtils.random(-1, 1);
        
        // Rotation
        this.rotation.set(
            MathUtils.random(-0.5, 0.5),
            MathUtils.random(-0.5, 0.5),
            MathUtils.random(-0.3, 0.3)
        );
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Bobbing motion
        if (this.mesh) {
            this.mesh.position.y += Math.sin(this.age * this.bobSpeed) * this.bobAmplitude * deltaTime;
        }
        
        // Check if passed the camera (missed)
        if (this.position.z > 20) {
            this.onMissed();
            this.destroy();
        }
        
        // Update material opacity based on depth for depth perception
        if (this.mesh && this.mesh.material) {
            const depthFactor = MathUtils.clamp((this.position.z + 100) / 120, 0.3, 1);
            this.mesh.material.opacity = depthFactor * 0.85;
        }
    }
    
    hit() {
        this.health--;
        
        if (this.health <= 0) {
            this.destroy();
            return true;
        }
        
        // Visual feedback for armored balloons
        if (this.type === 'armored' && this.mesh) {
            // Remove an armor plate
            const armorPlates = this.mesh.children.filter(child => 
                child.material && child.material.color.getHex() === 0x404040
            );
            if (armorPlates.length > 0) {
                this.mesh.remove(armorPlates[0]);
                armorPlates[0].geometry.dispose();
                armorPlates[0].material.dispose();
            }
        }
        
        // Damage effect
        if (this.mesh && this.mesh.material) {
            this.mesh.material.emissive.setHex(0xff0000);
            setTimeout(() => {
                if (this.mesh && this.mesh.material) {
                    this.mesh.material.emissive.setHex(0x000000);
                }
            }, 100);
        }
        
        return false;
    }
    
    destroy() {
        if (!this.isAlive) return;
        
        // Add score with depth bonus
        if (window.player) {
            window.player.addScore(this.points, this.position);
            
            if (this.type === 'normal') {
                window.player.stats.balloonsPopped++;
            }
        }
        
        // Create destruction particles
        this.createDestructionParticles();
        
        // Trigger power-up
        if (this.type === 'powerup' && window.powerUpManager) {
            const powerUpType = window.powerUpManager.getRandomPowerUpType();
            window.powerUpManager.activate(powerUpType);
        }
        
        // Play sound
        if (window.audioManager) {
            window.audioManager.play3D('pop', this.position, { pitch: this.getPitchBySize() });
        }
        
        // Check for vortex chain reaction
        this.checkVortexChain();
        
        super.destroy();
    }
    
    createDestructionParticles() {
        if (!window.sceneManager) return;
        
        const particleCount = this.type === 'powerup' ? 20 : 15;
        for (let i = 0; i < particleCount; i++) {
            window.sceneManager.createParticle({
                position: this.position.clone(),
                color: this.color,
                size: MathUtils.random(0.1, 0.3),
                velocity: new THREE.Vector3(
                    MathUtils.random(-5, 5),
                    MathUtils.random(-5, 5),
                    MathUtils.random(-3, 3)
                ),
                life: MathUtils.random(1, 2)
            });
        }
    }
    
    checkVortexChain() {
        // Check for nearby balloons for chain reaction
        if (window.powerUpManager && window.powerUpManager.isActive('VORTEX_AMPLIFIER')) {
            const chainRadius = 8;
            
            if (window.sceneManager) {
                const nearbyBalloons = window.sceneManager.getBalloons().filter(balloon => 
                    balloon !== this && 
                    balloon.isAlive && 
                    this.getDistance(balloon) < chainRadius
                );
                
                if (nearbyBalloons.length > 0) {
                    // Trigger chain reaction
                    if (window.player) {
                        const chainBonus = window.player.addVortexChain();
                        console.log(`Vortex chain reaction! Bonus: ${chainBonus}`);
                    }
                    
                    // Create vortex effect
                    window.sceneManager.createVortexEffect(this.position, chainRadius);
                    
                    // Play chain sound
                    if (window.audioManager) {
                        window.audioManager.play('vortexChain', { position: this.position });
                    }
                    
                    // Damage nearby balloons
                    nearbyBalloons.forEach(balloon => {
                        setTimeout(() => {
                            if (balloon.isAlive) balloon.hit();
                        }, MathUtils.random(100, 300));
                    });
                }
            }
        }
    }
    
    getPitchBySize() {
        const sizeFactor = this.radius / 4; // Normalize size
        const baseNotes = ['C3', 'D3', 'E3', 'F3', 'G3'];
        return baseNotes[Math.floor(sizeFactor * baseNotes.length)];
    }
    
    onMissed() {
        if (window.player) {
            const gameOver = window.player.addMissed();
            if (gameOver && window.gameController) {
                window.gameController.gameOver();
            }
        }
    }
}

// 3D Enemy Drone class
class EnemyDrone3D extends GameObject3D {
    constructor(scene, geometryCache) {
        super(scene);
        
        this.width = 3;
        this.height = 2;
        this.depth = 4;
        this.health = 2;
        this.maxHealth = 2;
        this.points = 75;
        this.fireRate = 2000; // Fire every 2 seconds
        this.lastFireTime = 0;
        this.speed = MathUtils.random(6, 12);
        
        this.createMesh(geometryCache);
        this.setupMovement();
    }
    
    createMesh(geometryCache) {
        // Create main body
        const bodyGeometry = geometryCache.getBox(this.width, this.height, this.depth);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0xc0c0c0,
            shininess: 50
        });
        
        this.mesh = new THREE.Group();
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.mesh.add(body);
        
        // Add engine glow
        const engineGeometry = geometryCache.getCylinder(0.3, 0.3, 0.5, 8);
        const engineMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        
        const engine1 = new THREE.Mesh(engineGeometry, engineMaterial);
        engine1.position.set(-0.8, -0.5, -1.5);
        engine1.rotation.x = Math.PI / 2;
        this.mesh.add(engine1);
        
        const engine2 = new THREE.Mesh(engineGeometry, engineMaterial);
        engine2.position.set(0.8, -0.5, -1.5);
        engine2.rotation.x = Math.PI / 2;
        this.mesh.add(engine2);
        
        // Add weapon mount
        const weaponGeometry = geometryCache.getBox(0.2, 0.2, 1);
        const weaponMaterial = new THREE.MeshPhongMaterial({ color: 0x404040 });
        const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        weapon.position.set(0, 0, 1.5);
        this.mesh.add(weapon);
        
        // Add cockpit
        const cockpitGeometry = geometryCache.getSphere(0.6, 8, 6);
        const cockpitMaterial = new THREE.MeshPhongMaterial({
            color: 0x001f3f,
            transparent: true,
            opacity: 0.8
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(0, 0.3, 0.5);
        this.mesh.add(cockpit);
        
        this.scene.add(this.mesh);
    }
    
    setupMovement() {
        // Start position at far depth, random X/Y
        this.setPosition(
            MathUtils.random(-25, 25),
            MathUtils.random(-15, 15),
            -80
        );
        
        // Movement pattern - weaving towards camera
        this.velocity.set(0, 0, this.speed);
        
        // Add lateral movement
        this.lateralDirection = MathUtils.random(-1, 1);
        this.waveSpeed = MathUtils.random(0.5, 1.5);
        
        // Rotation
        this.rotation.set(0, 0, MathUtils.random(-0.2, 0.2));
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Weaving motion
        this.velocity.x = Math.sin(this.age * this.waveSpeed) * this.lateralDirection * 3;
        
        // Engine glow animation
        if (this.mesh) {
            const engines = this.mesh.children.filter(child => 
                child.material && child.material.emissive && 
                child.material.emissive.getHex() === 0xff0000
            );
            engines.forEach(engine => {
                engine.material.emissiveIntensity = 0.3 + Math.sin(this.age * 8) * 0.2;
            });
        }
        
        // Check firing
        this.updateFiring();
        
        // Check if passed camera
        if (this.position.z > 15) {
            this.destroy();
        }
        
        // Update material opacity for depth perception
        if (this.mesh) {
            const depthFactor = MathUtils.clamp((this.position.z + 80) / 95, 0.4, 1);
            this.mesh.children.forEach(child => {
                if (child.material && child.material.opacity !== undefined) {
                    child.material.opacity = depthFactor;
                }
            });
        }
    }
    
    updateFiring() {
        const currentTime = Date.now();
        if (currentTime - this.lastFireTime > this.fireRate) {
            this.fire();
            this.lastFireTime = currentTime;
        }
    }
    
    fire() {
        if (!window.sceneManager) return;
        
        // Create projectile aimed at player area
        const projectile = window.sceneManager.createEnemyProjectile({
            position: this.position.clone(),
            targetPosition: new THREE.Vector3(0, 0, 20), // Aim towards camera
            speed: 15
        });
        
        // Play sound
        if (window.audioManager) {
            window.audioManager.play3D('laser', this.position);
        }
    }
    
    hit() {
        this.health--;
        
        // Visual feedback
        if (this.mesh) {
            this.mesh.children.forEach(child => {
                if (child.material && child.material.emissive) {
                    child.material.emissive.setHex(0xff0000);
                    setTimeout(() => {
                        if (child.material) {
                            child.material.emissive.setHex(0x000000);
                        }
                    }, 150);
                }
            });
        }
        
        if (this.health <= 0) {
            this.destroy();
            return true;
        }
        
        // Play hit sound
        if (window.audioManager) {
            window.audioManager.play3D('enemyHit', this.position);
        }
        
        return false;
    }
    
    destroy() {
        if (!this.isAlive) return;
        
        // Add score
        if (window.player) {
            window.player.addScore(this.points, this.position);
            window.player.stats.enemiesDestroyed++;
        }
        
        // Create explosion particles
        this.createExplosionParticles();
        
        // Play explosion sound
        if (window.audioManager) {
            window.audioManager.play3D('enemyExplosion', this.position);
        }
        
        super.destroy();
    }
    
    createExplosionParticles() {
        if (!window.sceneManager) return;
        
        for (let i = 0; i < 25; i++) {
            window.sceneManager.createParticle({
                position: this.position.clone(),
                color: { r: 255, g: MathUtils.random(100, 200), b: 0 },
                size: MathUtils.random(0.1, 0.4),
                velocity: new THREE.Vector3(
                    MathUtils.random(-8, 8),
                    MathUtils.random(-8, 8),
                    MathUtils.random(-5, 5)
                ),
                life: MathUtils.random(1.5, 3)
            });
        }
    }
}

// 3D Projectile class
class Projectile3D extends GameObject3D {
    constructor(scene, geometryCache, owner = 'player') {
        super(scene);
        
        this.owner = owner;
        this.speed = owner === 'player' ? 30 : 20;
        this.damage = owner === 'player' ? 1 : 10;
        this.size = owner === 'player' ? 0.2 : 0.3;
        this.maxAge = 3; // Auto-destroy after 3 seconds
        
        this.createMesh(geometryCache);
    }
    
    createMesh(geometryCache) {
        const geometry = geometryCache.getSphere(this.size, 6, 4);
        const color = this.owner === 'player' ? 0x00ffff : 0xff3300;
        
        const material = new THREE.MeshBasicMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.7
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
        
        // Add trail effect
        this.createTrail();
    }
    
    createTrail() {
        const trailGeometry = new THREE.SphereGeometry(this.size * 0.5, 4, 3);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: this.owner === 'player' ? 0x00ffff : 0xff3300,
            transparent: true,
            opacity: 0.3
        });
        
        this.trailMesh = new THREE.Mesh(trailGeometry, trailMaterial);
        this.mesh.add(this.trailMesh);
        this.trailMesh.position.z = -this.size * 2;
    }
    
    setDirection(direction) {
        this.velocity.copy(direction.normalize().multiplyScalar(this.speed));
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Trail animation
        if (this.trailMesh) {
            this.trailMesh.material.opacity = 0.3 * (1 - this.age / this.maxAge);
        }
        
        // Glow animation
        if (this.mesh && this.mesh.material) {
            this.mesh.material.emissiveIntensity = 0.7 + Math.sin(this.age * 20) * 0.3;
        }
        
        // Check bounds
        if (Math.abs(this.position.x) > 50 || 
            Math.abs(this.position.y) > 40 || 
            this.position.z > 25 || 
            this.position.z < -120) {
            this.destroy();
        }
    }
}

// 3D Mini Ship class
class MiniShip3D extends GameObject3D {
    constructor(scene, geometryCache, index) {
        super(scene);
        
        this.index = index;
        this.orbitRadius = 8;
        this.orbitSpeed = 1;
        this.angle = (2 * Math.PI / 3) * index;
        this.size = 1;
        this.fireRate = 800; // Fire every 0.8 seconds
        this.lastFireTime = 0;
        this.centerPoint = new THREE.Vector3(0, 0, 10);
        
        this.createMesh(geometryCache);
    }
    
    createMesh(geometryCache) {
        this.mesh = new THREE.Group();
        
        // Main body
        const bodyGeometry = geometryCache.getBox(this.size, this.size * 0.6, this.size * 1.5);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x003333,
            shininess: 100
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.mesh.add(body);
        
        // Wings
        const wingGeometry = geometryCache.getBox(this.size * 2, this.size * 0.2, this.size * 0.8);
        const wingMaterial = new THREE.MeshPhongMaterial({ color: 0x0099cc });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        wings.position.z = -this.size * 0.3;
        this.mesh.add(wings);
        
        // Engine glow
        const engineGeometry = geometryCache.getCylinder(0.1, 0.1, 0.3, 6);
        const engineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.8
        });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.z = -this.size * 0.8;
        engine.rotation.x = Math.PI / 2;
        this.mesh.add(engine);
        
        this.scene.add(this.mesh);
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Update orbit position
        this.angle += this.orbitSpeed * deltaTime;
        
        // Get mouse/touch position as center point
        if (window.inputHandler) {
            const pointerPos = window.inputHandler.getLastPointerPosition();
            if (pointerPos && window.sceneManager) {
                this.centerPoint = window.sceneManager.screenToWorld(pointerPos.x, pointerPos.y, 10);
            }
        }
        
        // Calculate orbit position
        this.position.set(
            this.centerPoint.x + Math.cos(this.angle) * this.orbitRadius,
            this.centerPoint.y + Math.sin(this.angle) * this.orbitRadius,
            this.centerPoint.z
        );
        
        // Face forward
        if (this.mesh) {
            this.mesh.lookAt(
                this.position.x,
                this.position.y,
                this.position.z - 10
            );
        }
        
        // Auto-fire
        this.updateFiring();
        
        // Engine glow animation
        if (this.mesh) {
            const engine = this.mesh.children.find(child => 
                child.material && child.material.emissive && 
                child.material.emissive.getHex() === 0x00ffff
            );
            if (engine) {
                engine.material.emissiveIntensity = 0.6 + Math.sin(this.age * 15) * 0.2;
            }
        }
    }
    
    updateFiring() {
        const currentTime = Date.now();
        if (currentTime - this.lastFireTime > this.fireRate) {
            this.fire();
            this.lastFireTime = currentTime;
        }
    }
    
    fire() {
        if (!window.sceneManager) return;
        
        // Find nearest target
        const targets = [
            ...window.sceneManager.getBalloons(),
            ...window.sceneManager.getEnemies()
        ].filter(target => target.isAlive && target.position.z < this.position.z);
        
        if (targets.length === 0) return;
        
        // Target closest enemy, or closest balloon
        targets.sort((a, b) => {
            const aPriority = a instanceof EnemyDrone3D ? 0 : 1;
            const bPriority = b instanceof EnemyDrone3D ? 0 : 1;
            if (aPriority !== bPriority) return aPriority - bPriority;
            return this.getDistance(a) - this.getDistance(b);
        });
        
        const target = targets[0];
        
        // Create projectile
        const projectile = window.sceneManager.createPlayerProjectile({
            position: this.position.clone(),
            targetPosition: target.position.clone(),
            speed: 25
        });
        
        // Play sound
        if (window.audioManager) {
            window.audioManager.play('miniLaser');
        }
    }
    
    triggerVolley() {
        // Fire multiple shots rapidly
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.fire();
            }, i * 100);
        }
    }
}

// 3D Particle system
class Particle3D extends GameObject3D {
    constructor(scene, geometryCache, options = {}) {
        super(scene);
        
        this.size = options.size || MathUtils.random(0.05, 0.2);
        this.color = options.color || ColorUtils.randomVibrant();
        this.life = options.life || MathUtils.random(1, 3);
        this.maxAge = this.life;
        this.gravity = options.gravity || -2;
        this.fadeRate = 1 / this.life;
        
        if (options.position) this.position.copy(options.position);
        if (options.velocity) this.velocity.copy(options.velocity);
        
        this.createMesh(geometryCache);
    }
    
    createMesh(geometryCache) {
        const geometry = geometryCache.getSphere(this.size, 4, 3);
        const material = new THREE.MeshBasicMaterial({
            color: ColorUtils.toThreeColor(this.color),
            transparent: true,
            opacity: 1
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Apply gravity
        this.velocity.y += this.gravity * deltaTime;
        
        // Fade out over time
        const opacity = 1 - (this.age / this.maxAge);
        if (this.mesh && this.mesh.material) {
            this.mesh.material.opacity = opacity;
        }
        
        // Shrink over time
        const scale = opacity;
        this.scale.setScalar(scale);
    }
}

// 3D Star field
class Star3D extends GameObject3D {
    constructor(scene, geometryCache) {
        super(scene);
        
        this.size = MathUtils.random(0.02, 0.08);
        this.twinkleSpeed = MathUtils.random(0.5, 2);
        this.brightness = MathUtils.random(0.3, 1);
        
        this.createMesh(geometryCache);
        this.setupPosition();
    }
    
    createMesh(geometryCache) {
        const geometry = geometryCache.getSphere(this.size, 4, 3);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: this.brightness
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
    }
    
    setupPosition() {
        // Position in far background
        this.setPosition(
            MathUtils.random(-100, 100),
            MathUtils.random(-60, 60),
            MathUtils.random(-200, -50)
        );
        
        // Slow movement towards camera
        this.velocity.set(0, 0, MathUtils.random(0.5, 2));
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Twinkling effect
        if (this.mesh && this.mesh.material) {
            const twinkle = this.brightness * (0.7 + 0.3 * Math.sin(this.age * this.twinkleSpeed));
            this.mesh.material.opacity = twinkle;
        }
        
        // Reset position when it passes the camera
        if (this.position.z > 20) {
            this.position.z = -200;
            this.position.x = MathUtils.random(-100, 100);
            this.position.y = MathUtils.random(-60, 60);
        }
    }
}

// Export classes globally
window.GameObject3D = GameObject3D;
window.Balloon3D = Balloon3D;
window.EnemyDrone3D = EnemyDrone3D;
window.Projectile3D = Projectile3D;
window.MiniShip3D = MiniShip3D;
window.Particle3D = Particle3D;
window.Star3D = Star3D;