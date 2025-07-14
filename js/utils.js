/**
 * Utility functions and object pooling for performance optimization
 */

// Math utilities
const MathUtils = {
    random: (min, max) => Math.random() * (max - min) + min,
    
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    
    lerp: (start, end, factor) => start + (end - start) * factor,
    
    distance3D: (pos1, pos2) => {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },
    
    // Convert 2D screen coordinates to 3D world coordinates
    screenToWorld: (x, y, camera, distance = 50) => {
        const vector = new THREE.Vector3();
        vector.set(
            (x / window.innerWidth) * 2 - 1,
            -(y / window.innerHeight) * 2 + 1,
            0.5
        );
        vector.unproject(camera);
        
        const dir = vector.sub(camera.position).normalize();
        const targetDistance = distance;
        return camera.position.clone().add(dir.multiplyScalar(targetDistance));
    },
    
    // Calculate depth bonus multiplier based on Z position
    getDepthBonus: (z, maxDepth = 200) => {
        const normalizedDepth = Math.abs(z) / maxDepth;
        return 1 + Math.min(normalizedDepth * 2, 3); // Max 4x multiplier
    }
};

// Color utilities
const ColorUtils = {
    // Generate random vibrant color (now more saturated)
    randomVibrant: () => {
        // Pick a random hue, full saturation, high lightness
        const h = Math.random();
        const s = 0.95;
        const l = 0.55 + Math.random() * 0.25; // 0.55-0.8 for brightness
        // Convert HSL to RGB
        const rgb = hslToRgb(h, s, l);
        return { r: rgb[0] * 255, g: rgb[1] * 255, b: rgb[2] * 255 };
    },
    
    // Convert color object to hex
    toHex: (color) => {
        const r = Math.floor(color.r).toString(16).padStart(2, '0');
        const g = Math.floor(color.g).toString(16).padStart(2, '0');
        const b = Math.floor(color.b).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    },
    
    // Convert color object to Three.js Color
    toThreeColor: (color) => new THREE.Color(color.r / 255, color.g / 255, color.b / 255),
    
    // Interpolate between two colors
    lerp: (color1, color2, factor) => ({
        r: MathUtils.lerp(color1.r, color2.r, factor),
        g: MathUtils.lerp(color1.g, color2.g, factor),
        b: MathUtils.lerp(color1.b, color2.b, factor)
    })
};

// HSL to RGB helper
function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [r, g, b];
}

// Object Pool for performance optimization
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 50) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];
        
        // Pre-populate the pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }
    
    acquire() {
        let obj;
        if (this.pool.length > 0) {
            obj = this.pool.pop();
        } else {
            obj = this.createFn();
        }
        
        this.active.push(obj);
        return obj;
    }
    
    release(obj) {
        const index = this.active.indexOf(obj);
        if (index !== -1) {
            this.active.splice(index, 1);
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }
    
    releaseAll() {
        while (this.active.length > 0) {
            this.release(this.active[0]);
        }
    }
    
    getActiveCount() {
        return this.active.length;
    }
    
    getPoolCount() {
        return this.pool.length;
    }
}

// Performance monitor
class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.lastTime = 0;
        this.fps = 60;
        this.fpsCounter = 0;
        this.fpsUpdateInterval = 30; // Update FPS display every 30 frames
        
        this.metrics = {
            drawCalls: 0,
            triangles: 0,
            activeObjects: 0,
            pooledObjects: 0
        };
    }
    
    update(currentTime) {
        this.frameCount++;
        
        if (this.frameCount % this.fpsUpdateInterval === 0) {
            const deltaTime = currentTime - this.lastTime;
            this.fps = Math.round((this.fpsUpdateInterval * 1000) / deltaTime);
            this.lastTime = currentTime;
            
            // Update FPS display
            const fpsElement = document.getElementById('fps');
            if (fpsElement) {
                fpsElement.textContent = this.fps;
                
                // Change color based on performance
                if (this.fps >= 55) {
                    fpsElement.style.color = '#00ff00';
                } else if (this.fps >= 30) {
                    fpsElement.style.color = '#ffff00';
                } else {
                    fpsElement.style.color = '#ff0000';
                }
            }
        }
    }
    
    updateMetrics(metrics) {
        Object.assign(this.metrics, metrics);
    }
    
    getAverageFrameTime() {
        return 1000 / this.fps;
    }
}

// Device detection utilities
const DeviceUtils = {
    isMobile: () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    isHighDPI: () => {
        return window.devicePixelRatio > 1;
    },
    
    getTouchSupport: () => {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },
    
    getMemoryInfo: () => {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                total: Math.round(performance.memory.totalJSHeapSize / 1048576),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
            };
        }
        return null;
    },
    
    // Get recommended quality settings based on device
    getQualitySettings: () => {
        const isMobile = DeviceUtils.isMobile();
        const isHighDPI = DeviceUtils.isHighDPI();
        
        if (isMobile) {
            return {
                particleCount: 15,
                starCount: 100,
                shadowsEnabled: false,
                antialiasing: false,
                maxParticles: 200,
                renderScale: isHighDPI ? 0.8 : 1.0
            };
        } else {
            return {
                particleCount: 30,
                starCount: 200,
                shadowsEnabled: true,
                antialiasing: true,
                maxParticles: 500,
                renderScale: 1.0
            };
        }
    }
};

// Geometry cache for reusing common shapes
class GeometryCache {
    constructor() {
        this.cache = new Map();
    }
    
    getSphere(radius = 1, widthSegments = 16, heightSegments = 12) {
        const key = `sphere_${radius}_${widthSegments}_${heightSegments}`;
        if (!this.cache.has(key)) {
            this.cache.set(key, new THREE.SphereGeometry(radius, widthSegments, heightSegments));
        }
        return this.cache.get(key);
    }
    
    getBox(width = 1, height = 1, depth = 1) {
        const key = `box_${width}_${height}_${depth}`;
        if (!this.cache.has(key)) {
            this.cache.set(key, new THREE.BoxGeometry(width, height, depth));
        }
        return this.cache.get(key);
    }
    
    getCylinder(radiusTop = 1, radiusBottom = 1, height = 1, radialSegments = 12) {
        const key = `cylinder_${radiusTop}_${radiusBottom}_${height}_${radialSegments}`;
        if (!this.cache.has(key)) {
            this.cache.set(key, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments));
        }
        return this.cache.get(key);
    }
    
    getPlane(width = 1, height = 1) {
        const key = `plane_${width}_${height}`;
        if (!this.cache.has(key)) {
            this.cache.set(key, new THREE.PlaneGeometry(width, height));
        }
        return this.cache.get(key);
    }
    
    dispose() {
        this.cache.forEach(geometry => geometry.dispose());
        this.cache.clear();
    }
}

// Animation utilities
const AnimationUtils = {
    easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeIn: (t) => t * t,
    easeOut: (t) => t * (2 - t),
    bounce: (t) => {
        if (t < 1/2.75) {
            return 7.5625 * t * t;
        } else if (t < 2/2.75) {
            return 7.5625 * (t -= 1.5/2.75) * t + 0.75;
        } else if (t < 2.5/2.75) {
            return 7.5625 * (t -= 2.25/2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625/2.75) * t + 0.984375;
        }
    }
};

// Export utilities globally
window.MathUtils = MathUtils;
window.ColorUtils = ColorUtils;
window.ObjectPool = ObjectPool;
window.PerformanceMonitor = PerformanceMonitor;
window.DeviceUtils = DeviceUtils;
window.GeometryCache = GeometryCache;
window.AnimationUtils = AnimationUtils;