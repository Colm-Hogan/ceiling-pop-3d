/**
 * Main Game Controller for 3D Ceiling Pop
 * Manages game loop, initialization, and overall game flow
 */

class GameController {
    constructor() {
        this.gameRunning = false;
        this.isPaused = false;
        this.isInitialized = false;
        
        // Core systems
        this.sceneManager = null;
        this.inputHandler = null;
        this.audioManager = null;
        this.performanceMonitor = null;
        this.gameFlow = null;
        
        // Game objects
        this.player = null;
        this.powerUpManager = null;
        
        // Timing
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        
        // Spawn timing
        this.lastBalloonSpawn = 0;
        this.lastEnemySpawn = 0;
        this.balloonSpawnRate = 1000; // Base spawn rate in ms
        this.enemySpawnRate = 3000;
        
        // UI elements
        this.modal = null;
        this.modalTitle = null;
        this.modalText = null;
        this.startButton = null;
        this.loadingScreen = null;
        
        // Quality and performance
        this.qualitySettings = DeviceUtils.getQualitySettings();
        this.adaptiveQuality = true;
        this.lastPerformanceCheck = 0;
        
        this.init();
    }
    
    async init() {
        try {
            console.log('Game Controller: Starting initialization...');
            
            // Show loading screen
            this.showLoading(true);
            
            // Initialize UI references
            this.initializeUI();
            
            // Initialize core systems
            await this.initializeSystems();
            
            // Setup game objects
            this.initializeGameObjects();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup resize handling
            this.setupResizeHandling();
            
            // Hide loading screen
            this.showLoading(false);
            
            this.isInitialized = true;
            console.log('Game Controller: Initialization complete!');
            
            // Show start modal
            this.showStartModal();
            
        } catch (error) {
            console.error('Game Controller: Initialization failed', error);
            this.showErrorModal(error);
        }
    }
    
    initializeUI() {
        this.modal = document.getElementById('modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalText = document.getElementById('modal-text');
        this.startButton = document.getElementById('start-button');
        this.loadingScreen = document.getElementById('loading');
        
        if (!this.modal || !this.startButton) {
            throw new Error('Required UI elements not found');
        }
    }
    
    async initializeSystems() {
        // Get canvas
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            throw new Error('Game canvas not found');
        }
        
        // Initialize scene manager
        console.log('Game Controller: Initializing Scene Manager...');
        this.sceneManager = new SceneManager(canvas);
        
        // Initialize audio manager
        console.log('Game Controller: Initializing Audio Manager...');
        this.audioManager = new AudioManager();
        
        // Initialize input handler
        console.log('Game Controller: Initializing Input Handler...');
        this.inputHandler = new InputHandler(canvas, this.sceneManager);
        
        // Initialize performance monitor
        this.performanceMonitor = new PerformanceMonitor();
        
        // Make systems globally available
        window.sceneManager = this.sceneManager;
        window.audioManager = this.audioManager;
        window.inputHandler = this.inputHandler;
        window.performanceMonitor = this.performanceMonitor;
        window.gameController = this;
    }
    
    initializeGameObjects() {
        // Initialize player state
        this.player = new PlayerState();
        window.player = this.player;
        
        // Initialize power-up manager
        this.powerUpManager = new PowerUpManager();
        window.powerUpManager = this.powerUpManager;
        
        // Initialize game flow
        this.gameFlow = new GameFlow();
        window.gameFlow = this.gameFlow;
        
        console.log('Game Controller: Game objects initialized');
    }
    
    setupEventListeners() {
        // Start button
        this.startButton.addEventListener('click', () => {
            this.startGame();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this.gameRunning) {
                this.startGame();
            }
        });
        
        // Visibility change (for pause/resume)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.gameRunning) {
                this.pause();
            }
        });
        
        console.log('Game Controller: Event listeners setup complete');
    }
    
    setupResizeHandling() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.sceneManager) {
                    this.sceneManager.handleResize();
                }
                console.log('Game Controller: Window resized');
            }, 100);
        });
    }
    
    showLoading(show) {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = show ? 'flex' : 'none';
        }
    }
    
    showStartModal() {
        if (this.modal) {
            this.modalTitle.textContent = 'CEILING POP 3D';
            this.modalText.innerHTML = 'Experience the ultimate 3D space defense.<br>Tap/Click to destroy targets coming from deep space!';
            this.startButton.textContent = 'START GAME';
            this.modal.style.display = 'flex';
        }
    }
    
    showErrorModal(error) {
        if (this.modal) {
            this.modalTitle.textContent = 'ERROR';
            this.modalText.innerHTML = `Failed to initialize game:<br><code>${error.message}</code>`;
            this.startButton.textContent = 'RETRY';
            this.startButton.onclick = () => window.location.reload();
            this.modal.style.display = 'flex';
        }
    }
    
    async startGame() {
        if (!this.isInitialized) {
            console.warn('Game Controller: Cannot start - not initialized');
            return;
        }
        
        try {
            console.log('Game Controller: Starting game...');
            
            // Initialize audio (requires user interaction)
            await this.audioManager.init();
            
            // Reset game state
            this.resetGame();
            
            // Start systems
            this.gameRunning = true;
            this.isPaused = false;
            this.gameFlow.start();
            
            // Hide modal
            this.modal.style.display = 'none';
            
            // Start ambient music
            this.audioManager.startAmbient();
            
            // Start game loop
            this.lastFrameTime = performance.now();
            this.gameLoop();
            
            console.log('Game Controller: Game started successfully!');
            
        } catch (error) {
            console.error('Game Controller: Failed to start game', error);
            this.showErrorModal(error);
        }
    }
    
    resetGame() {
        // Reset player and game state
        this.player.reset();
        this.powerUpManager.deactivate();
        
        // Clear all game objects
        this.sceneManager.balloons = [];
        this.sceneManager.enemies = [];
        this.sceneManager.projectiles = [];
        this.sceneManager.particles = [];
        this.sceneManager.miniShips = [];
        
        // Reset spawn timers
        this.lastBalloonSpawn = 0;
        this.lastEnemySpawn = 0;
        
        console.log('Game Controller: Game state reset');
    }
    
    pause() {
        if (!this.gameRunning) return;
        
        this.isPaused = true;
        this.audioManager.stopAmbient();
        
        // Show pause modal
        this.modalTitle.textContent = 'PAUSED';
        this.modalText.innerHTML = 'Game paused.<br>Press ESCAPE or click to resume.';
        this.startButton.textContent = 'RESUME';
        this.startButton.onclick = () => this.resume();
        this.modal.style.display = 'flex';
        
        console.log('Game Controller: Game paused');
    }
    
    resume() {
        if (!this.gameRunning || !this.isPaused) return;
        
        this.isPaused = false;
        this.modal.style.display = 'none';
        this.audioManager.startAmbient();
        
        // Reset frame timing to prevent time jumps
        this.lastFrameTime = performance.now();
        
        console.log('Game Controller: Game resumed');
    }
    
    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        this.isPaused = false;
        this.gameFlow.stop();
        this.audioManager.stopAmbient();
        
        // Stop all mini-ships
        this.sceneManager.removeMiniShips();
        
        // Show game over modal
        const gameData = this.player.getGameData();
        this.modalTitle.textContent = 'GAME OVER';
        this.modalText.innerHTML = `
            <div class="game-over-stats">
                <div class="final-score">FINAL SCORE: <span class="score-value">${gameData.score.toLocaleString()}</span></div>
                <div class="wave-reached">REACHED: Level ${gameData.level}, Wave ${gameData.wave}</div>
                <div class="stats-grid">
                    <div>Balloons: ${gameData.stats.balloonsPopped}</div>
                    <div>Enemies: ${gameData.stats.enemiesDestroyed}</div>
                    <div>Max Combo: ${gameData.stats.maxCombo}</div>
                    <div>Depth Bonus: ${gameData.depthBonusEarned.toLocaleString()}</div>
                    <div>Vortex Chains: ${gameData.vortexChains}</div>
                    <div>Power-ups: ${gameData.stats.powerUpsCollected}</div>
                </div>
            </div>
        `;
        
        this.startButton.textContent = 'PLAY AGAIN';
        this.startButton.onclick = () => this.startGame();
        this.modal.style.display = 'flex';
        
        // Add game over styles if not exists
        if (!document.querySelector('#game-over-style')) {
            const style = document.createElement('style');
            style.id = 'game-over-style';
            style.textContent = `
                .game-over-stats { text-align: left; }
                .final-score { text-align: center; margin-bottom: 1rem; font-size: 1.2em; }
                .score-value { color: #00ffff; font-weight: bold; }
                .wave-reached { text-align: center; margin-bottom: 1rem; color: #ccc; }
                .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.9em; }
                .stats-grid > div { background: rgba(0,0,0,0.3); padding: 0.3rem; border-radius: 0.3rem; }
            `;
            document.head.appendChild(style);
        }
        
        console.log('Game Controller: Game over', gameData);
    }
    
    levelComplete() {
        this.isPaused = true;
        
        // Show level complete modal
        this.modalTitle.textContent = `LEVEL ${this.player.level} COMPLETE!`;
        this.modalText.innerHTML = `
            <div class="level-complete">
                <div>Excellent work, Commander!</div>
                <div class="level-stats">
                    <div>Score: ${this.player.score.toLocaleString()}</div>
                    <div>Bonus Earned: ${this.player.totalDepthBonusEarned.toLocaleString()}</div>
                </div>
            </div>
        `;
        this.startButton.textContent = `CONTINUE TO LEVEL ${this.player.level + 1}`;
        this.startButton.onclick = () => {
            this.player.setLevel(this.player.level + 1);
            this.player.setWave(1);
            this.modal.style.display = 'none';
            this.resume();
        };
        this.modal.style.display = 'flex';
        
        // Play level complete sound
        this.audioManager.play('levelComplete');
        
        console.log(`Game Controller: Level ${this.player.level} completed`);
    }
    
    // Main game loop
    gameLoop() {
        if (!this.gameRunning) return;
        
        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;
        
        // Cap delta time to prevent large jumps
        this.deltaTime = Math.min(this.deltaTime, 1/30); // Max 30fps minimum
        
        // Update performance monitor
        this.performanceMonitor.update(currentTime);
        
        // Update game if not paused
        if (!this.isPaused) {
            this.updateGame();
        }
        
        // Render scene
        this.sceneManager.render();
        
        // Check performance and adjust quality if needed
        this.checkPerformance();
        
        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updateGame() {
        // Update core systems
        this.gameFlow.update();
        this.powerUpManager.update();
        this.inputHandler.update(this.deltaTime);
        
        // Update scene
        this.sceneManager.update(this.deltaTime);
        
        // Handle spawning
        this.handleSpawning();
        
        // Check game conditions
        this.checkGameConditions();
    }
    
    handleSpawning() {
        const currentTime = Date.now();
        
        // Spawn balloons
        const balloonRate = this.calculateBalloonSpawnRate();
        if (currentTime - this.lastBalloonSpawn > balloonRate) {
            this.sceneManager.spawnBalloon();
            this.lastBalloonSpawn = currentTime;
        }
        
        // Spawn enemies (starting from wave 2)
        if (this.player.wave >= 2) {
            const enemyRate = this.calculateEnemySpawnRate();
            if (currentTime - this.lastEnemySpawn > enemyRate) {
                this.sceneManager.spawnEnemy();
                this.lastEnemySpawn = currentTime;
            }
        }
    }
    
    calculateBalloonSpawnRate() {
        // Increase spawn rate with level and wave
        const baseRate = this.balloonSpawnRate;
        const levelMultiplier = Math.max(0.5, 1 - (this.player.level - 1) * 0.1);
        const waveMultiplier = Math.max(0.3, 1 - (this.player.wave - 1) * 0.05);
        
        return baseRate * levelMultiplier * waveMultiplier;
    }
    
    calculateEnemySpawnRate() {
        // Increase enemy spawn rate with level and wave
        const baseRate = this.enemySpawnRate;
        const levelMultiplier = Math.max(0.4, 1 - (this.player.level - 1) * 0.15);
        const waveMultiplier = Math.max(0.5, 1 - (this.player.wave - 1) * 0.1);
        
        return baseRate * levelMultiplier * waveMultiplier;
    }
    
    checkGameConditions() {
        // Check for level completion (boss waves)
        if (this.gameFlow.isBossWave() && this.sceneManager.enemies.length === 0) {
            // All enemies defeated in boss wave
            this.levelComplete();
        }
        
        // Check for automatic wave progression
        if (!this.gameFlow.isBossWave() && this.gameFlow.getWaveProgress() >= 1) {
            this.gameFlow.advanceWave();
        }
    }
    
    checkPerformance() {
        const currentTime = Date.now();
        if (currentTime - this.lastPerformanceCheck < 5000) return; // Check every 5 seconds
        
        const fps = this.performanceMonitor.fps;
        
        if (this.adaptiveQuality) {
            if (fps < 30 && this.qualitySettings.particleCount > 10) {
                // Reduce quality
                this.qualitySettings.particleCount = Math.max(10, this.qualitySettings.particleCount - 5);
                console.log('Game Controller: Reduced particle count for performance');
            } else if (fps > 55 && this.qualitySettings.particleCount < 30) {
                // Increase quality
                this.qualitySettings.particleCount = Math.min(30, this.qualitySettings.particleCount + 2);
                console.log('Game Controller: Increased particle count');
            }
        }
        
        // Update performance metrics
        this.performanceMonitor.updateMetrics({
            activeObjects: this.sceneManager.balloons.length + 
                           this.sceneManager.enemies.length + 
                           this.sceneManager.projectiles.length,
            pooledObjects: this.sceneManager.particles.length
        });
        
        this.lastPerformanceCheck = currentTime;
    }
    
    // Debug methods
    toggleDebugMode() {
        const fpsCounter = document.getElementById('fps-counter');
        if (fpsCounter) {
            fpsCounter.style.display = fpsCounter.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    logGameState() {
        console.log('=== GAME STATE DEBUG ===');
        console.log('Game Running:', this.gameRunning);
        console.log('Is Paused:', this.isPaused);
        console.log('Player:', this.player.getGameData());
        console.log('Active Objects:', {
            balloons: this.sceneManager.balloons.length,
            enemies: this.sceneManager.enemies.length,
            projectiles: this.sceneManager.projectiles.length,
            particles: this.sceneManager.particles.length
        });
        console.log('Performance:', {
            fps: this.performanceMonitor.fps,
            frameTime: this.performanceMonitor.getAverageFrameTime()
        });
        console.log('========================');
    }
    
    // Cleanup
    dispose() {
        console.log('Game Controller: Disposing...');
        
        this.gameRunning = false;
        
        // Dispose core systems
        if (this.sceneManager) this.sceneManager.dispose();
        if (this.inputHandler) this.inputHandler.dispose();
        if (this.audioManager) this.audioManager.dispose();
        
        // Clear global references
        window.sceneManager = null;
        window.audioManager = null;
        window.inputHandler = null;
        window.performanceMonitor = null;
        window.gameController = null;
        window.player = null;
        window.powerUpManager = null;
        window.gameFlow = null;
        
        console.log('Game Controller: Disposal complete');
    }
}

// Auto-start when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    
    // Create global game controller
    window.gameController = new GameController();
    
    // Add debug keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F3') {
            e.preventDefault();
            window.gameController.toggleDebugMode();
        }
        if (e.key === 'F4') {
            e.preventDefault();
            window.gameController.logGameState();
        }
    });
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.gameController) {
        window.gameController.dispose();
    }
});

// Handle page visibility for better mobile experience
document.addEventListener('visibilitychange', () => {
    if (window.gameController && document.hidden) {
        window.gameController.pause();
    }
});

// Export for global access
window.GameController = GameController;