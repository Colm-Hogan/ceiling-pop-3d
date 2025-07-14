/**
 * Input Handler for 3D Ceiling Pop
 * Manages mouse, touch, and keyboard input for 3D interactions
 */

class InputHandler {
    constructor(canvas, sceneManager) {
        this.canvas = canvas;
        this.sceneManager = sceneManager;
        
        // Input state
        this.isPointerDown = false;
        this.pointerStart = null;
        this.pointerCurrent = null;
        this.lastPointerPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        
        // Keyboard state
        this.keysPressed = new Set();
        
        // Touch/mouse gesture detection
        this.gestureState = {
            type: null, // 'tap', 'swipe', 'hold'
            startTime: 0,
            threshold: {
                swipeDistance: 50,
                holdTime: 500,
                tapTime: 200
            }
        };
        
        // 3D interaction state
        this.targeting = {
            isActive: false,
            start3D: null,
            end3D: null,
            targets: []
        };
        
        // Performance optimization
        this.inputQueue = [];
        this.lastProcessTime = 0;
        this.processInterval = 16; // ~60fps
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupPreventDefaults();
        console.log('Input Handler: Initialization complete');
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.handlePointerStart.bind(this), { passive: false });
        this.canvas.addEventListener('mousemove', this.handlePointerMove.bind(this), { passive: true });
        this.canvas.addEventListener('mouseup', this.handlePointerEnd.bind(this), { passive: false });
        this.canvas.addEventListener('mouseleave', this.handlePointerCancel.bind(this));
        
        // Touch events
        this.canvas.addEventListener('touchstart', this.handlePointerStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handlePointerMove.bind(this), { passive: true });
        this.canvas.addEventListener('touchend', this.handlePointerEnd.bind(this), { passive: false });
        this.canvas.addEventListener('touchcancel', this.handlePointerCancel.bind(this));
        
        // Keyboard events
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Window events
        window.addEventListener('blur', this.handleWindowBlur.bind(this));
        window.addEventListener('focus', this.handleWindowFocus.bind(this));
        
        // Context menu prevention
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }
    
    setupPreventDefaults() {
        // Prevent scroll, zoom, and other default mobile behaviors
        const preventDefaults = ['touchstart', 'touchmove', 'touchend'];
        
        preventDefaults.forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                if (e.target === this.canvas || this.canvas.contains(e.target)) {
                    e.preventDefault();
                }
            }, { passive: false });
        });
        
        // Prevent pull-to-refresh
        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overscrollBehavior = 'none';
    }
    
    // Unified pointer event handling
    handlePointerStart(e) {
        e.preventDefault();
        
        const pointer = this.getPointerPosition(e);
        this.isPointerDown = true;
        this.pointerStart = pointer;
        this.pointerCurrent = pointer;
        this.lastPointerPosition = pointer;
        
        // Initialize gesture detection
        this.gestureState.type = null;
        this.gestureState.startTime = Date.now();
        
        // Start 3D targeting
        this.targeting.isActive = true;
        this.targeting.start3D = this.sceneManager.screenToWorld(pointer.x, pointer.y, -30);
        
        // Play UI feedback sound
        if (window.audioManager) {
            window.audioManager.play('tap');
        }
        
        // Queue input for processing
        this.queueInput('pointerStart', pointer);
        
        console.log('Input: Pointer start at', pointer);
    }
    
    handlePointerMove(e) {
        if (!this.isPointerDown) {
            // Update cursor position for targeting reticle
            const pointer = this.getPointerPosition(e);
            this.lastPointerPosition = pointer;
            this.updateTargetingReticle(pointer);
            return;
        }
        
        const pointer = this.getPointerPosition(e);
        this.pointerCurrent = pointer;
        this.lastPointerPosition = pointer;
        
        // Update 3D targeting
        if (this.targeting.isActive) {
            this.targeting.end3D = this.sceneManager.screenToWorld(pointer.x, pointer.y, -30);
            this.updateBeamPreview();
        }
        
        // Queue input for processing
        this.queueInput('pointerMove', pointer);
    }
    
    handlePointerEnd(e) {
        e.preventDefault();
        
        if (!this.isPointerDown) return;
        
        const pointer = this.getPointerPosition(e);
        const currentTime = Date.now();
        const duration = currentTime - this.gestureState.startTime;
        const distance = this.calculateDistance(this.pointerStart, pointer);
        
        // Determine gesture type
        const gestureType = this.determineGesture(distance, duration);
        
        // Handle the gesture
        this.handleGesture(gestureType, this.pointerStart, pointer);
        
        // Reset state
        this.isPointerDown = false;
        this.pointerStart = null;
        this.pointerCurrent = null;
        this.targeting.isActive = false;
        this.targeting.start3D = null;
        this.targeting.end3D = null;
        
        // Queue input for processing
        this.queueInput('pointerEnd', pointer, { gestureType, distance, duration });
        
        console.log(`Input: Gesture ${gestureType} completed`);
    }
    
    handlePointerCancel(e) {
        this.isPointerDown = false;
        this.pointerStart = null;
        this.pointerCurrent = null;
        this.targeting.isActive = false;
    }
    
    getPointerPosition(e) {
        let clientX, clientY;
        
        if (e.touches && e.touches.length > 0) {
            // Touch event
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            // Touch end event
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            // Mouse event
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return { x: clientX, y: clientY };
    }
    
    calculateDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    determineGesture(distance, duration) {
        const { swipeDistance, holdTime, tapTime } = this.gestureState.threshold;
        
        if (duration > holdTime) {
            return 'hold';
        } else if (distance > swipeDistance) {
            return 'swipe';
        } else if (duration < tapTime) {
            return 'tap';
        } else {
            return 'tap'; // Default to tap for medium duration, short distance
        }
    }
    
    handleGesture(gestureType, startPos, endPos) {
        switch (gestureType) {
            case 'tap':
                this.handleTap(startPos);
                break;
            case 'swipe':
                this.handleSwipe(startPos, endPos);
                break;
            case 'hold':
                this.handleHold(startPos);
                break;
        }
    }
    
    handleTap(position) {
        // Fire a projectile toward the tap/click (sceneManager.handleTap now does this)
        const hit = this.sceneManager.handleTap(position.x, position.y);
        this.createTapRipple(position);
        // Feedback for stats (optional, can be kept)
        if (window.player) {
            if (hit) {
                window.player.updatePerspectiveAccuracy(1.0);
            } else {
                window.player.updatePerspectiveAccuracy(0.8);
                window.player.breakCombo();
            }
        }
        console.log('Input: Tap handled', hit ? '(HIT)' : '(MISS)');
    }
    
    handleSwipe(startPos, endPos) {
        // Check if energy beam power-up is active
        if (window.powerUpManager && window.powerUpManager.isActive('ENERGY_BEAM')) {
            this.sceneManager.fireEnergyBeam(startPos, endPos);
            console.log('Input: Energy beam fired via swipe');
            return;
        }
        
        // Alternative: Create projectile trail
        this.createProjectileTrail(startPos, endPos);
        console.log('Input: Swipe gesture completed');
    }
    
    handleHold(position) {
        // Hold gesture could trigger special abilities or charging effects
        this.triggerHoldEffect(position);
        console.log('Input: Hold gesture completed');
    }
    
    createTapRipple(position) {
        // Create visual feedback for tap
        const ripple = document.createElement('div');
        ripple.className = 'tap-ripple';
        ripple.style.cssText = `
            position: fixed;
            left: ${position.x - 20}px;
            top: ${position.y - 20}px;
            width: 40px;
            height: 40px;
            border: 2px solid #00ffff;
            border-radius: 50%;
            pointer-events: none;
            z-index: 100;
            animation: ripple-expand 0.6s ease-out forwards;
        `;
        
        // Add ripple animation if not exists
        if (!document.querySelector('#ripple-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-style';
            style.textContent = `
                @keyframes ripple-expand {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(2); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(ripple);
        
        // Remove after animation
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }
    
    createProjectileTrail(startPos, endPos) {
        // Create multiple projectiles along the swipe path
        const projectileCount = 5;
        const target3D = this.sceneManager.screenToWorld(endPos.x, endPos.y, -50);
        
        for (let i = 0; i < projectileCount; i++) {
            setTimeout(() => {
                this.sceneManager.createPlayerProjectile({
                    targetPosition: target3D.clone()
                });
            }, i * 50);
        }
    }
    
    triggerHoldEffect(position) {
        // Create expanding energy effect
        const worldPos = this.sceneManager.screenToWorld(position.x, position.y, -20);
        
        // Create particle burst
        for (let i = 0; i < 20; i++) {
            this.sceneManager.createParticle({
                position: worldPos.clone(),
                color: { r: 255, g: 255, b: 0 },
                size: MathUtils.random(0.1, 0.3),
                velocity: new THREE.Vector3(
                    MathUtils.random(-3, 3),
                    MathUtils.random(-3, 3),
                    MathUtils.random(-2, 2)
                ),
                life: 2
            });
        }
    }
    
    updateTargetingReticle(position) {
        // Update targeting reticle position
        const reticle = document.getElementById('targeting-reticle');
        if (reticle) {
            reticle.style.left = `${position.x - 30}px`;
            reticle.style.top = `${position.y - 30}px`;
        }
    }
    
    updateBeamPreview() {
        // Show beam preview for energy beam power-up
        if (!window.powerUpManager || !window.powerUpManager.isActive('ENERGY_BEAM')) return;
        
        // This would draw a preview line in the UI
        // For simplicity, we'll just update the targeting reticle color
        const reticle = document.getElementById('targeting-reticle');
        if (reticle && this.targeting.isActive) {
            reticle.style.borderColor = '#ff00ff';
            reticle.style.boxShadow = '0 0 20px #ff00ff';
        }
    }
    
    // Keyboard handling
    handleKeyDown(e) {
        const key = e.key.toUpperCase();
        this.keysPressed.add(key);
        
        // Handle power-up activation
        if (window.powerUpManager && window.powerUpManager.handleKeyPress(key)) {
            e.preventDefault();
            return;
        }
        
        // Handle game controls
        switch (key) {
            case 'ESCAPE':
                e.preventDefault();
                this.handleEscape();
                break;
            case ' ': // Spacebar
                e.preventDefault();
                this.handleSpaceBar();
                break;
            case 'R':
                e.preventDefault();
                this.handleRestart();
                break;
            case 'M':
                e.preventDefault();
                this.handleMute();
                break;
        }
        
        console.log(`Input: Key pressed - ${key}`);
    }
    
    handleKeyUp(e) {
        const key = e.key.toUpperCase();
        this.keysPressed.delete(key);
        
        // Reset targeting reticle color when energy beam key released
        if (key === 'A') {
            const reticle = document.getElementById('targeting-reticle');
            if (reticle) {
                reticle.style.borderColor = '#00ffff';
                reticle.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
            }
        }
    }
    
    handleEscape() {
        if (window.gameController) {
            window.gameController.togglePause();
        }
    }
    
    handleSpaceBar() {
        // Trigger active power-up or special action
        if (window.powerUpManager && window.powerUpManager.activePowerUp) {
            window.powerUpManager.triggerActivePowerUp();
        }
    }
    
    handleRestart() {
        if (window.gameController && !window.gameController.gameRunning) {
            window.gameController.startGame();
        }
    }
    
    handleMute() {
        if (window.audioManager) {
            window.audioManager.toggleMute();
        }
    }
    
    handleWindowBlur() {
        // Pause game when window loses focus
        if (window.gameController && window.gameController.gameRunning) {
            window.gameController.pause();
        }
        
        // Clear all input state
        this.keysPressed.clear();
        this.isPointerDown = false;
        this.pointerStart = null;
        this.pointerCurrent = null;
    }
    
    handleWindowFocus() {
        // Game will be resumed manually by user
        console.log('Input: Window regained focus');
    }
    
    // Input queue processing for performance
    queueInput(type, data, extra = {}) {
        this.inputQueue.push({
            type,
            data,
            extra,
            timestamp: Date.now()
        });
    }
    
    processInputQueue() {
        const currentTime = Date.now();
        if (currentTime - this.lastProcessTime < this.processInterval) return;
        
        // Process queued inputs
        while (this.inputQueue.length > 0) {
            const input = this.inputQueue.shift();
            this.processQueuedInput(input);
        }
        
        this.lastProcessTime = currentTime;
    }
    
    processQueuedInput(input) {
        // Additional processing for queued inputs if needed
        switch (input.type) {
            case 'pointerStart':
                // Could trigger predictive targeting here
                break;
            case 'pointerMove':
                // Could update trajectory predictions
                break;
            case 'pointerEnd':
                // Could analyze gesture patterns for learning
                break;
        }
    }
    
    // Utility methods
    isKeyPressed(key) {
        return this.keysPressed.has(key.toUpperCase());
    }
    
    getLastPointerPosition() {
        return this.lastPointerPosition;
    }
    
    isPointerActive() {
        return this.isPointerDown;
    }
    
    getTargetingState() {
        return this.targeting;
    }
    
    // Update method for continuous input processing
    update(deltaTime) {
        this.processInputQueue();
        
        // Update continuous input effects
        if (this.isKeyPressed('A') && window.powerUpManager && window.powerUpManager.isActive('ENERGY_BEAM')) {
            // Continuous energy beam charging effect
            this.updateEnergyBeamCharging();
        }
        
        if (this.isKeyPressed('L') && window.powerUpManager && window.powerUpManager.isActive('MINI_SHIPS')) {
            // Continuous mini-ship firing
            window.powerUpManager.triggerActivePowerUp();
        }
    }
    
    updateEnergyBeamCharging() {
        // Visual charging effect for energy beam
        const reticle = document.getElementById('targeting-reticle');
        if (reticle) {
            const chargeIntensity = (Date.now() % 1000) / 1000;
            const glowSize = 15 + chargeIntensity * 10;
            reticle.style.boxShadow = `0 0 ${glowSize}px #ff00ff`;
        }
    }
    
    // Device-specific optimizations
    setupDeviceOptimizations() {
        if (DeviceUtils.isMobile()) {
            // Reduce input processing frequency on mobile
            this.processInterval = 32; // ~30fps instead of 60fps
            
            // Adjust gesture thresholds for mobile
            this.gestureState.threshold.swipeDistance = 30; // Smaller swipe threshold
            this.gestureState.threshold.holdTime = 300; // Shorter hold time
        }
        
        if (DeviceUtils.getTouchSupport()) {
            // Add touch-specific optimizations
            this.canvas.style.touchAction = 'none';
        }
    }
    
    // Cleanup
    dispose() {
        // Remove all event listeners
        this.canvas.removeEventListener('mousedown', this.handlePointerStart);
        this.canvas.removeEventListener('mousemove', this.handlePointerMove);
        this.canvas.removeEventListener('mouseup', this.handlePointerEnd);
        this.canvas.removeEventListener('mouseleave', this.handlePointerCancel);
        
        this.canvas.removeEventListener('touchstart', this.handlePointerStart);
        this.canvas.removeEventListener('touchmove', this.handlePointerMove);
        this.canvas.removeEventListener('touchend', this.handlePointerEnd);
        this.canvas.removeEventListener('touchcancel', this.handlePointerCancel);
        
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('blur', this.handleWindowBlur);
        window.removeEventListener('focus', this.handleWindowFocus);
        
        // Clear state
        this.keysPressed.clear();
        this.inputQueue = [];
        
        console.log('Input Handler: Disposed');
    }
}

// Export globally
window.InputHandler = InputHandler;