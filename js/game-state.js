/**
 * Game State Management for 3D Ceiling Pop
 * Handles player state, power-ups, and game progression
 */

class PlayerState {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.wave = 1;
        this.missed = 0;
        this.health = 100;
        this.maxHealth = 100;
        this.shields = 100;
        this.maxShields = 100;
        this.isShielded = false;
        
        // New 3D features
        this.depthBonus = 1.0;
        this.totalDepthBonusEarned = 0;
        this.vortexChainCount = 0;
        this.perspectiveAccuracy = 1.0;
        
        // Statistics
        this.stats = {
            balloonsPopped: 0,
            enemiesDestroyed: 0,
            powerUpsCollected: 0,
            totalShotsAccuracy: 0,
            maxCombo: 0,
            currentCombo: 0,
            depthBonusesEarned: 0,
            vortexChainsTriggered: 0
        };
        
        // Game constants
        this.MAX_MISSED = 20;
    }
    
    reset() {
        this.score = 0;
        this.level = 1;
        this.wave = 1;
        this.missed = 0;
        this.health = 100;
        this.shields = 100;
        this.isShielded = false;
        this.depthBonus = 1.0;
        this.totalDepthBonusEarned = 0;
        this.vortexChainCount = 0;
        this.perspectiveAccuracy = 1.0;
        
        // Reset stats but keep some persistent data
        const maxCombo = this.stats.maxCombo;
        this.stats = {
            balloonsPopped: 0,
            enemiesDestroyed: 0,
            powerUpsCollected: 0,
            totalShotsAccuracy: 0,
            maxCombo: maxCombo,
            currentCombo: 0,
            depthBonusesEarned: 0,
            vortexChainsTriggered: 0
        };
        
        this.updateUI();
    }
    
    addScore(points, position = null) {
        let finalPoints = points;
        
        // Apply depth bonus if position provided
        if (position && position.z) {
            const depthMultiplier = MathUtils.getDepthBonus(position.z);
            this.depthBonus = depthMultiplier;
            finalPoints = Math.floor(points * depthMultiplier);
            
            // Track depth bonus earnings
            if (depthMultiplier > 1.5) {
                this.totalDepthBonusEarned += finalPoints - points;
                this.stats.depthBonusesEarned++;
                
                // Play depth bonus sound
                if (window.audioManager) {
                    window.audioManager.play('depthBonus', { multiplier: depthMultiplier });
                }
            }
        }
        
        // Apply combo multiplier
        const comboMultiplier = 1 + (this.stats.currentCombo * 0.1);
        finalPoints = Math.floor(finalPoints * comboMultiplier);
        
        this.score += finalPoints;
        this.stats.currentCombo++;
        this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.currentCombo);
        
        this.updateUI();
        return finalPoints;
    }
    
    breakCombo() {
        this.stats.currentCombo = 0;
    }
    
    setWave(wave) {
        this.wave = wave;
        this.updateUI();
    }
    
    setLevel(level) {
        this.level = level;
        this.updateUI();
    }
    
    addMissed() {
        if (this.isShielded) return false;
        
        this.missed++;
        this.breakCombo();
        
        if (this.missed >= this.MAX_MISSED) {
            return true; // Game over
        }
        
        this.updateUI();
        return false;
    }
    
    takeDamage(amount) {
        if (this.isShielded) return false;
        
        this.health = Math.max(0, this.health - amount);
        this.shields = Math.max(0, this.shields - amount);
        this.breakCombo();
        
        if (this.health <= 0) {
            return true; // Game over
        }
        
        this.updateUI();
        return false;
    }
    
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.shields = Math.min(this.maxShields, this.shields + amount);
        this.updateUI();
    }
    
    // New 3D feature tracking
    addVortexChain() {
        this.vortexChainCount++;
        this.stats.vortexChainsTriggered++;
        
        // Bonus points for chain reactions
        const chainBonus = this.vortexChainCount * 25;
        this.addScore(chainBonus);
        
        return chainBonus;
    }
    
    updatePerspectiveAccuracy(accuracy) {
        this.perspectiveAccuracy = accuracy;
    }
    
    updateUI() {
        // Update score and level info
        const scoreEl = document.getElementById('score');
        const levelEl = document.getElementById('level');
        const waveEl = document.getElementById('wave');
        const missedEl = document.getElementById('missed');
        const shieldsEl = document.getElementById('shields');
        const depthBonusEl = document.getElementById('depth-bonus');
        const healthBarEl = document.getElementById('health-bar');
        
        if (scoreEl) scoreEl.textContent = this.score.toLocaleString();
        if (levelEl) levelEl.textContent = this.level;
        if (waveEl) waveEl.textContent = this.wave;
        if (missedEl) missedEl.textContent = `${this.missed} / ${this.MAX_MISSED}`;
        if (shieldsEl) shieldsEl.textContent = Math.round(this.shields);
        if (depthBonusEl) depthBonusEl.textContent = `x${this.depthBonus.toFixed(1)}`;
        
        // Update health bar
        if (healthBarEl) {
            const healthPercent = (this.health / this.maxHealth) * 100;
            healthBarEl.style.width = `${healthPercent}%`;
            
            // Change color based on health
            if (healthPercent > 60) {
                healthBarEl.style.background = 'linear-gradient(90deg, #00ff00, #00ffff)';
            } else if (healthPercent > 30) {
                healthBarEl.style.background = 'linear-gradient(90deg, #ffff00, #ff6600)';
            } else {
                healthBarEl.style.background = 'linear-gradient(90deg, #ff0000, #ff3300)';
            }
        }
    }
    
    getGameData() {
        return {
            score: this.score,
            level: this.level,
            wave: this.wave,
            stats: { ...this.stats },
            depthBonusEarned: this.totalDepthBonusEarned,
            vortexChains: this.vortexChainCount
        };
    }
}

class PowerUpManager {
    constructor() {
        this.activePowerUp = null;
        this.endTime = 0;
        this.powerUps = {
            'ENERGY_BEAM': { 
                duration: 12000, 
                name: 'ENERGY BEAM', 
                key: 'A',
                description: 'Swipe to fire devastating beam'
            },
            'MINI_SHIPS': { 
                duration: 18000, 
                name: 'MINI-SHIPS', 
                key: 'L',
                description: 'Auto-firing support drones'
            },
            'SHIELD': { 
                duration: 10000, 
                name: 'SHIELD', 
                key: null,
                description: 'Temporary invulnerability'
            },
            'DEPTH_VISION': {
                duration: 15000,
                name: 'DEPTH VISION',
                key: 'D',
                description: 'Enhanced 3D targeting'
            },
            'VORTEX_AMPLIFIER': {
                duration: 20000,
                name: 'VORTEX AMP',
                key: 'V',
                description: 'Enhanced chain reactions'
            }
        };
        
        // UI elements
        this.timerEl = document.getElementById('powerup-timer');
        this.nameEl = document.getElementById('powerup-name');
        this.barEl = document.getElementById('powerup-bar');
    }
    
    activate(type) {
        if (this.activePowerUp) {
            this.deactivate(); // Deactivate previous power-up
        }
        
        this.activePowerUp = type;
        const powerUp = this.powerUps[type];
        this.endTime = Date.now() + powerUp.duration;
        
        // Update UI
        let displayName = powerUp.name;
        if (powerUp.key) {
            displayName += ` <span class="key-hint">${powerUp.key}</span>`;
        }
        
        if (this.nameEl) this.nameEl.innerHTML = displayName;
        if (this.timerEl) this.timerEl.classList.remove('hidden');
        
        // Activate power-up specific effects
        this.activatePowerUpEffect(type);
        
        // Play activation sound
        if (window.audioManager) {
            window.audioManager.play('powerupActivate');
        }
        
        // Update stats
        if (window.player) {
            window.player.stats.powerUpsCollected++;
        }
        
        console.log(`Power-up activated: ${powerUp.name}`);
    }
    
    activatePowerUpEffect(type) {
        switch (type) {
            case 'MINI_SHIPS':
                // Mini-ships will be created by the scene manager
                if (window.sceneManager) {
                    window.sceneManager.spawnMiniShips(3);
                }
                break;
                
            case 'SHIELD':
                if (window.player) {
                    window.player.isShielded = true;
                    // Visual shield effect handled by scene manager
                    if (window.sceneManager) {
                        window.sceneManager.activateShieldEffect();
                    }
                }
                break;
                
            case 'DEPTH_VISION':
                // Enhanced depth perception effect
                if (window.sceneManager) {
                    window.sceneManager.activateDepthVision();
                }
                break;
                
            case 'VORTEX_AMPLIFIER':
                // Increase chain reaction potential
                if (window.sceneManager) {
                    window.sceneManager.activateVortexAmplifier();
                }
                break;
        }
    }
    
    deactivate() {
        if (!this.activePowerUp) return;
        
        const type = this.activePowerUp;
        
        // Deactivate power-up specific effects
        this.deactivatePowerUpEffect(type);
        
        this.activePowerUp = null;
        
        // Update UI
        if (this.timerEl) this.timerEl.classList.add('hidden');
        
        console.log(`Power-up deactivated: ${this.powerUps[type].name}`);
    }
    
    deactivatePowerUpEffect(type) {
        switch (type) {
            case 'MINI_SHIPS':
                if (window.sceneManager) {
                    window.sceneManager.removeMiniShips();
                }
                break;
                
            case 'SHIELD':
                if (window.player) {
                    window.player.isShielded = false;
                    if (window.sceneManager) {
                        window.sceneManager.deactivateShieldEffect();
                    }
                }
                break;
                
            case 'DEPTH_VISION':
                if (window.sceneManager) {
                    window.sceneManager.deactivateDepthVision();
                }
                break;
                
            case 'VORTEX_AMPLIFIER':
                if (window.sceneManager) {
                    window.sceneManager.deactivateVortexAmplifier();
                }
                break;
        }
    }
    
    update() {
        if (!this.activePowerUp) return;
        
        const timeLeft = this.endTime - Date.now();
        if (timeLeft <= 0) {
            this.deactivate();
            return;
        }
        
        // Update progress bar
        const powerUp = this.powerUps[this.activePowerUp];
        const percentage = (timeLeft / powerUp.duration) * 100;
        
        if (this.barEl) {
            this.barEl.style.width = `${percentage}%`;
            
            // Change color based on remaining time
            if (percentage > 50) {
                this.barEl.style.background = 'linear-gradient(90deg, #00ff00, #00ffff)';
            } else if (percentage > 25) {
                this.barEl.style.background = 'linear-gradient(90deg, #ffff00, #ff6600)';
            } else {
                this.barEl.style.background = 'linear-gradient(90deg, #ff0000, #ff3300)';
            }
        }
    }
    
    handleKeyPress(key) {
        if (!this.activePowerUp) return false;
        
        const powerUp = this.powerUps[this.activePowerUp];
        if (powerUp.key && key.toUpperCase() === powerUp.key) {
            this.triggerActivePowerUp();
            return true;
        }
        
        return false;
    }
    
    triggerActivePowerUp() {
        if (!this.activePowerUp) return;
        
        switch (this.activePowerUp) {
            case 'ENERGY_BEAM':
                // Trigger energy beam from current mouse/touch position
                if (window.inputHandler && window.sceneManager) {
                    const startPos = { x: window.innerWidth / 2, y: window.innerHeight };
                    const endPos = window.inputHandler.getLastPointerPosition();
                    window.sceneManager.fireEnergyBeam(startPos, endPos);
                }
                break;
                
            case 'MINI_SHIPS':
                // Trigger mini-ship volley
                if (window.sceneManager) {
                    window.sceneManager.triggerMiniShipVolley();
                }
                break;
                
            case 'DEPTH_VISION':
                // Trigger depth scan
                if (window.sceneManager) {
                    window.sceneManager.triggerDepthScan();
                }
                break;
                
            case 'VORTEX_AMPLIFIER':
                // Trigger vortex blast
                if (window.sceneManager) {
                    window.sceneManager.triggerVortexBlast();
                }
                break;
        }
    }
    
    isActive(type = null) {
        if (type) {
            return this.activePowerUp === type;
        }
        return this.activePowerUp !== null;
    }
    
    getRandomPowerUpType() {
        const types = Object.keys(this.powerUps);
        return types[Math.floor(Math.random() * types.length)];
    }
    
    getRemainingTime() {
        if (!this.activePowerUp) return 0;
        return Math.max(0, this.endTime - Date.now());
    }
    
    getRemainingPercent() {
        if (!this.activePowerUp) return 0;
        const powerUp = this.powerUps[this.activePowerUp];
        const timeLeft = this.getRemainingTime();
        return (timeLeft / powerUp.duration) * 100;
    }
}

class GameFlow {
    constructor() {
        this.gameRunning = false;
        this.isPaused = false;
        this.frameCount = 0;
        this.waveStartTime = 0;
        this.waveEnemiesSpawned = 0;
        this.waveEnemiesRequired = 10;
        
        // Wave configuration
        this.waveConfig = {
            balloonsPerWave: 50,
            enemiesPerWave: 10,
            waveDuration: 30000, // 30 seconds
            bossWaveInterval: 5 // Boss every 5 waves
        };
    }
    
    start() {
        this.gameRunning = true;
        this.isPaused = false;
        this.frameCount = 0;
        this.waveStartTime = Date.now();
        this.waveEnemiesSpawned = 0;
        
        console.log('Game Flow: Game started');
    }
    
    pause() {
        this.isPaused = true;
        console.log('Game Flow: Game paused');
    }
    
    resume() {
        this.isPaused = false;
        console.log('Game Flow: Game resumed');
    }
    
    stop() {
        this.gameRunning = false;
        this.isPaused = false;
        console.log('Game Flow: Game stopped');
    }
    
    update() {
        if (!this.gameRunning || this.isPaused) return;
        
        this.frameCount++;
        
        // Check for wave progression
        this.checkWaveProgression();
        
        // Check for level progression
        this.checkLevelProgression();
    }
    
    checkWaveProgression() {
        const waveTime = Date.now() - this.waveStartTime;
        
        // Advance wave every 30 seconds or when enough enemies defeated
        if (waveTime > this.waveConfig.waveDuration || this.shouldAdvanceWave()) {
            this.advanceWave();
        }
    }
    
    shouldAdvanceWave() {
        // Check if enough enemies have been defeated
        if (window.player) {
            const enemiesKilled = window.player.stats.enemiesDestroyed;
            return enemiesKilled >= this.waveEnemiesRequired;
        }
        return false;
    }
    
    advanceWave() {
        if (window.player) {
            window.player.setWave(window.player.wave + 1);
        }
        
        this.waveStartTime = Date.now();
        this.waveEnemiesSpawned = 0;
        this.waveEnemiesRequired += 2; // Increase difficulty
        
        console.log(`Game Flow: Advanced to wave ${window.player ? window.player.wave : '?'}`);
    }
    
    checkLevelProgression() {
        if (!window.player) return;
        
        // Boss wave every 5 waves
        if (window.player.wave > 0 && window.player.wave % this.waveConfig.bossWaveInterval === 0) {
            this.triggerBossWave();
        }
    }
    
    triggerBossWave() {
        console.log('Game Flow: Boss wave triggered!');
        
        if (window.sceneManager) {
            window.sceneManager.spawnBoss();
        }
        
        if (window.audioManager) {
            window.audioManager.play('bossAppear');
        }
    }
    
    completeLevel() {
        if (!window.player) return;
        
        window.player.setLevel(window.player.level + 1);
        window.player.setWave(1);
        
        this.waveStartTime = Date.now();
        this.waveEnemiesSpawned = 0;
        
        console.log(`Game Flow: Level ${window.player.level} completed!`);
        
        if (window.audioManager) {
            window.audioManager.play('levelComplete');
        }
    }
    
    getWaveProgress() {
        const waveTime = Date.now() - this.waveStartTime;
        return Math.min(1, waveTime / this.waveConfig.waveDuration);
    }
    
    isBossWave() {
        return window.player && window.player.wave % this.waveConfig.bossWaveInterval === 0;
    }
}

// Export globally
window.PlayerState = PlayerState;
window.PowerUpManager = PowerUpManager;
window.GameFlow = GameFlow;