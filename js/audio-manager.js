/**
 * 3D Audio Manager with Tone.js
 * Handles all game sound effects with spatial audio support
 */
class AudioManager {
    constructor() {
        this.isInitialized = false;
        this.isMuted = false;
        this.masterVolume = 0.7;
        this.sfxVolume = 0.8;
        this.musicVolume = 0.4;
        
        // Audio sources
        this.synths = {};
        this.effects = {};
        this.sequences = {};
        
        // 3D Audio context
        this.listener = null;
        this.spatialSounds = new Map();
        
        // Quality settings based on device
        this.audioQuality = DeviceUtils.isMobile() ? 'low' : 'high';
        
        // Audio settings
        this.settings = {
            low: {
                maxVoices: 8,
                reverbDecay: 1.5,
                delayTime: 0.1
            },
            high: {
                maxVoices: 16,
                reverbDecay: 3.0,
                delayTime: 0.2
            }
        };
    }
    
    async init() {
        if (this.isInitialized) return;
        
        try {
            // Start Tone.js audio context
            await Tone.start();
            console.log('Audio Manager: Tone.js started');
            
            // Create master effects chain
            this.createMasterChain();
            
            // Create synths for different sound types
            this.createSynths();
            
            // Create ambient music
            this.createAmbientMusic();
            
            this.isInitialized = true;
            console.log('Audio Manager: Initialization complete');
            
        } catch (error) {
            console.error('Audio Manager: Initialization failed', error);
        }
    }
    
    createMasterChain() {
        const quality = this.settings[this.audioQuality];
        
        // Master reverb for space ambiance
        this.effects.reverb = new Tone.Reverb({
            decay: quality.reverbDecay,
            wet: 0.3,
            preDelay: 0.1
        }).toDestination();
        
        // Master compressor
        this.effects.compressor = new Tone.Compressor({
            threshold: -20,
            ratio: 3,
            attack: 0.003,
            release: 0.1
        }).connect(this.effects.reverb);
        
        // Master filter for depth effect
        this.effects.masterFilter = new Tone.Filter({
            frequency: 20000,
            type: 'lowpass',
            rolloff: -12
        }).connect(this.effects.compressor);
        
        // Master volume
        this.effects.masterVolume = new Tone.Volume(
            Tone.gainToDb(this.masterVolume)
        ).connect(this.effects.masterFilter);
    }
    
    createSynths() {
        const quality = this.settings[this.audioQuality];
        
        // Tap/Click sound - crisp and immediate
        this.synths.tap = new Tone.Synth({
            oscillator: { type: 'fmsine' },
            envelope: { 
                attack: 0.01, 
                decay: 0.1, 
                sustain: 0.1, 
                release: 0.2 
            }
        }).connect(this.effects.masterVolume);
        
        // Balloon pop - satisfying pop with harmonics
        this.synths.pop = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 10,
            envelope: { 
                attack: 0.001, 
                decay: 0.4, 
                sustain: 0.01, 
                release: 1.4 
            }
        }).connect(this.effects.masterVolume);
        
        // Laser/Energy beam - sci-fi laser sound
        this.synths.laser = new Tone.NoiseSynth({
            noise: { type: 'pink' },
            envelope: { 
                attack: 0.005, 
                decay: 0.2, 
                sustain: 0.1, 
                release: 0.2 
            },
            filter: {
                frequency: 8000,
                type: 'highpass'
            }
        }).connect(this.effects.masterVolume);
        
        // Enemy hit - metallic impact
        this.synths.enemyHit = new Tone.MetalSynth({
            frequency: 50,
            envelope: { 
                attack: 0.001, 
                decay: 0.1, 
                release: 0.05 
            },
            harmonicity: 5.1,
            modulationIndex: 32,
            resonance: 4000,
            octaves: 1.5
        }).connect(this.effects.masterVolume);
        
        // Enemy explosion - dramatic boom
        this.synths.enemyExplosion = new Tone.NoiseSynth({
            noise: { type: 'brown' },
            envelope: { 
                attack: 0.01, 
                decay: 0.5, 
                sustain: 0, 
                release: 0.4 
            }
        }).connect(this.effects.masterVolume);
        
        // Mini-ship lasers - higher pitched rapid fire
        this.synths.miniLaser = new Tone.PolySynth(Tone.Synth, {
            maxPolyphony: quality.maxVoices,
            oscillator: { type: 'triangle' },
            envelope: { 
                attack: 0.005, 
                decay: 0.05, 
                sustain: 0, 
                release: 0.1 
            }
        }).connect(this.effects.masterVolume);
        
        // Power-up activation - ascending musical phrase
        this.synths.powerupActivate = new Tone.PolySynth(Tone.Synth, {
            maxPolyphony: 4,
            oscillator: { type: 'sine' },
            envelope: { 
                attack: 0.1, 
                decay: 0.2, 
                sustain: 0.3, 
                release: 0.5 
            }
        }).connect(this.effects.masterVolume);
        
        // Level complete - triumphant fanfare
        this.synths.levelComplete = new Tone.PolySynth(Tone.Synth, {
            maxPolyphony: 4,
            oscillator: { type: 'square' },
            envelope: { 
                attack: 0.1, 
                decay: 0.3, 
                sustain: 0.2, 
                release: 0.8 
            }
        }).connect(this.effects.masterVolume);
        
        // Boss appearance - ominous low rumble
        this.synths.bossAppear = new Tone.MembraneSynth({
            pitchDecay: 0.2,
            octaves: 2,
            envelope: { 
                attack: 0.1, 
                decay: 0.8, 
                sustain: 0.2, 
                release: 1 
            }
        }).connect(this.effects.masterVolume);
        
        // Depth bonus sound - ascending chime
        this.synths.depthBonus = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { 
                attack: 0.01, 
                decay: 0.3, 
                sustain: 0, 
                release: 0.5 
            }
        }).connect(this.effects.masterVolume);
        
        // Vortex chain reaction - swirling effect
        this.synths.vortexChain = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { 
                attack: 0.1, 
                decay: 0.6, 
                sustain: 0, 
                release: 0.4 
            }
        }).connect(this.effects.masterVolume);
    }
    
    createAmbientMusic() {
        // Ambient space music loop
        this.synths.ambient = new Tone.PolySynth(Tone.Synth, {
            maxPolyphony: 3,
            oscillator: { type: 'sine' },
            envelope: { 
                attack: 2, 
                decay: 1, 
                sustain: 0.5, 
                release: 3 
            }
        });
        
        // Connect ambient to separate volume control
        this.effects.ambientVolume = new Tone.Volume(
            Tone.gainToDb(this.musicVolume)
        ).connect(this.effects.reverb);
        
        this.synths.ambient.connect(this.effects.ambientVolume);
        
        // Create ambient sequence
        this.sequences.ambient = new Tone.Loop((time) => {
            const notes = ['C2', 'G2', 'C3', 'E3', 'G3'];
            const randomNote = notes[Math.floor(Math.random() * notes.length)];
            this.synths.ambient.triggerAttackRelease(randomNote, '4n', time, 0.1);
        }, '2n');
    }
    
    // Main play method
    play(soundType, options = {}) {
        if (!this.isInitialized || this.isMuted) return;
        
        const now = Tone.now();
        
        try {
            switch(soundType) {
                case 'tap':
                    this.synths.tap.triggerAttackRelease('C2', '32n', now);
                    break;
                    
                case 'pop':
                    const popPitch = options.pitch || 'C3';
                    this.synths.pop.triggerAttackRelease(popPitch, '8n', now);
                    break;
                    
                case 'laser':
                    this.synths.laser.triggerAttackRelease('8n', now);
                    break;
                    
                case 'enemyHit':
                    this.synths.enemyHit.triggerAttackRelease('C4', '16n', now);
                    break;
                    
                case 'enemyExplosion':
                    this.synths.enemyExplosion.triggerAttackRelease('2n', now);
                    break;
                    
                case 'miniLaser':
                    this.synths.miniLaser.triggerAttackRelease('C6', '32n', now);
                    break;
                    
                case 'powerupActivate':
                    this.playPowerupSequence();
                    break;
                    
                case 'levelComplete':
                    this.playLevelCompleteSequence();
                    break;
                    
                case 'bossAppear':
                    this.synths.bossAppear.triggerAttackRelease('C1', '1n', now);
                    break;
                    
                case 'depthBonus':
                    const bonusMultiplier = options.multiplier || 1;
                    const bonusPitch = `C${Math.min(7, 4 + Math.floor(bonusMultiplier))}`;
                    this.synths.depthBonus.triggerAttackRelease(bonusPitch, '16n', now);
                    break;
                    
                case 'vortexChain':
                    this.playVortexChainSequence(options.position);
                    break;
            }
        } catch (error) {
            console.warn('Audio Manager: Sound playback failed', error);
        }
    }
    
    // Play power-up activation sequence
    playPowerupSequence() {
        const now = Tone.now();
        const notes = ['C4', 'E4', 'G4', 'C5'];
        notes.forEach((note, index) => {
            this.synths.powerupActivate.triggerAttackRelease(
                note, '16n', now + index * 0.1
            );
        });
    }
    
    // Play level complete fanfare
    playLevelCompleteSequence() {
        const now = Tone.now();
        const sequence = [
            { note: 'C5', time: 0 },
            { note: 'G5', time: 0.2 },
            { note: 'C6', time: 0.4 },
            { note: 'E6', time: 0.6 }
        ];
        
        sequence.forEach(({ note, time }) => {
            this.synths.levelComplete.triggerAttackRelease(
                note, '8n', now + time
            );
        });
    }
    
    // Play vortex chain reaction sequence
    playVortexChainSequence(position = { x: 0, y: 0, z: 0 }) {
        const now = Tone.now();
        const baseFreq = 440 + (position.z * 2); // Vary by depth
        
        for (let i = 0; i < 5; i++) {
            const freq = baseFreq * (1 + i * 0.2);
            const time = now + i * 0.1;
            this.synths.vortexChain.triggerAttackRelease(freq, '16n', time);
        }
    }
    
    // Spatial audio (placeholder for future 3D audio implementation)
    play3D(soundType, position, options = {}) {
        // For now, just adjust volume based on distance
        const distance = MathUtils.distance3D(position, { x: 0, y: 0, z: 0 });
        const maxDistance = 100;
        const volume = Math.max(0.1, 1 - (distance / maxDistance));
        
        // Temporarily adjust master volume
        const originalVolume = this.masterVolume;
        this.setMasterVolume(this.masterVolume * volume);
        
        this.play(soundType, options);
        
        // Restore volume after a short delay
        setTimeout(() => {
            this.setMasterVolume(originalVolume);
        }, 100);
    }
    
    // Start ambient music
    startAmbient() {
        if (this.sequences.ambient && this.sequences.ambient.state !== 'started') {
            this.sequences.ambient.start();
        }
    }
    
    // Stop ambient music
    stopAmbient() {
        if (this.sequences.ambient && this.sequences.ambient.state === 'started') {
            this.sequences.ambient.stop();
        }
    }
    
    // Volume controls
    setMasterVolume(volume) {
        this.masterVolume = MathUtils.clamp(volume, 0, 1);
        if (this.effects.masterVolume) {
            this.effects.masterVolume.volume.value = Tone.gainToDb(this.masterVolume);
        }
    }
    
    setSFXVolume(volume) {
        this.sfxVolume = MathUtils.clamp(volume, 0, 1);
        // Apply to individual synths if needed
    }
    
    setMusicVolume(volume) {
        this.musicVolume = MathUtils.clamp(volume, 0, 1);
        if (this.effects.ambientVolume) {
            this.effects.ambientVolume.volume.value = Tone.gainToDb(this.musicVolume);
        }
    }
    
    // Mute controls
    mute() {
        this.isMuted = true;
        if (this.effects.masterVolume) {
            this.effects.masterVolume.mute = true;
        }
        this.stopAmbient();
    }
    
    unmute() {
        this.isMuted = false;
        if (this.effects.masterVolume) {
            this.effects.masterVolume.mute = false;
        }
        this.startAmbient();
    }
    
    toggleMute() {
        if (this.isMuted) {
            this.unmute();
        } else {
            this.mute();
        }
    }
    
    // Cleanup
    dispose() {
        this.stopAmbient();
        
        // Dispose all synths
        Object.values(this.synths).forEach(synth => {
            if (synth.dispose) synth.dispose();
        });
        
        // Dispose all effects
        Object.values(this.effects).forEach(effect => {
            if (effect.dispose) effect.dispose();
        });
        
        // Dispose sequences
        Object.values(this.sequences).forEach(sequence => {
            if (sequence.dispose) sequence.dispose();
        });
        
        this.isInitialized = false;
    }
}

// Export globally
window.AudioManager = AudioManager;