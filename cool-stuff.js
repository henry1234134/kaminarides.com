document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    document.body.classList.add('cool-stuff-body');
    const container = document.getElementById('canvas-container');
    const hudContainer = document.getElementById('controls-overlay');
    const rareCounterElement = document.getElementById('rare-counter');

    // Custom Cursor
    const cursorDot = document.createElement('div');
    cursorDot.className = 'custom-cursor';
    document.body.appendChild(cursorDot);

    let isMouseActive = false;
    let timeSinceLastClick = 0;
    let spawnedLonely = false;
    let rareCount = 0;

    // Globally register engine vector arrays exactly here natively before any instantiation calls
    const forwardVector = new THREE.Vector3();
    const diff = new THREE.Vector3();
    const screenPos = new THREE.Vector3();
    let frameCount = 0;

    let lastMousePos = { x: 0, y: 0 };
    let mouseShakeDist = 0;
    setInterval(() => { mouseShakeDist *= 0.9; }, 100);

    document.addEventListener('mousemove', (e) => {
        isMouseActive = true;
        cursorDot.style.left = e.clientX + 'px';
        cursorDot.style.top = e.clientY + 'px';

        let dx = e.clientX - lastMousePos.x;
        let dy = e.clientY - lastMousePos.y;
        mouseShakeDist += Math.sqrt(dx * dx + dy * dy);
        lastMousePos.x = e.clientX; lastMousePos.y = e.clientY;

        if (mouseShakeDist > 4000 && typeof companion !== 'undefined' && companion && !companion.userData.isAngry) {
            triggerChaoticScream();
            mouseShakeDist = 0;
        } else if (mouseShakeDist > 1500 && Math.random() < 0.2 && typeof companion !== 'undefined' && companion && !companion.userData.isAngry && (!companion.userData.attention || companion.userData.attention < 1)) {
            triggerJoy();
            mouseShakeDist = 0;
        }

        hudContainer.classList.remove('hud-hidden');
        cursorDot.classList.remove('idle');
        resetHudTimer();
    });

    let hudTimer;
    function resetHudTimer() {
        clearTimeout(hudTimer);
        hudTimer = setTimeout(() => {
            hudContainer.classList.add('hud-hidden');
            cursorDot.classList.add('idle');
            isMouseActive = false;
        }, 3000);
    }
    resetHudTimer();

    // Systemic Twists
    let p_heavy = 0.018;
    let p_anti = 0.20;  // Reduced - less clutter, more breathing room
    function clampProb(val) { return Math.max(0.001, Math.min(0.8, val)); }

    // Mood System
    let mood = "calm";
    let moodTimer = 0;
    let nextCalmDuration = 1000;
    let nextSpookyDuration = 400;

    // Traffic System
    let trafficPhase = "medium"; // "empty", "medium", "high"
    let trafficTimer = 0;
    const EMPTY_DUR = 600;   // 10 sec
    const MEDIUM_DUR = 900;  // 15 sec
    const HIGH_DUR = 450;    // 7.5 sec

    // AUDIO ENGINE (Web Audio API)
    let audioCtx;
    let proximityOsc, proximityGain, proximityPanner;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            proximityOsc = audioCtx.createOscillator();

            // Bass drone for right‑click recall (always running)
            bassOsc = audioCtx.createOscillator();
            bassGain = audioCtx.createGain();
            bassOsc.type = 'sine';
            bassOsc.frequency.value = 60;
            bassGain.gain.value = 0.0001; // Avoid exponential ramp from exact 0 mathematically
            bassOsc.connect(bassGain);
            bassGain.connect(audioCtx.destination);
            bassOsc.start();

            proximityGain = audioCtx.createGain();
            proximityPanner = audioCtx.createPanner();

            proximityPanner.panningModel = 'HRTF';
            proximityPanner.distanceModel = 'inverse';
            proximityPanner.refDistance = 5;
            proximityPanner.maxDistance = FOG_FAR;
            proximityPanner.rolloffFactor = 1;

            proximityOsc.type = 'sine';
            proximityOsc.frequency.value = 40; // Deep ocean sub rumble
            proximityGain.gain.value = 0;

            proximityOsc.connect(proximityGain);
            proximityGain.connect(proximityPanner);
            proximityPanner.connect(audioCtx.destination);
            proximityOsc.start();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();

        // Startup Chirp on initial user interaction context unlock
        if (typeof companion !== 'undefined' && companion && !companion.userData.startChirpPlayed) {
            companion.userData.startChirpPlayed = true;
            setTimeout(() => { playCompanionChime(true); showEmote('✨'); }, 400); // 400ms delay to feel organic
        }
    }
    document.addEventListener('mousedown', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    function playTone(size, isRare, isSingularity) {
        if (!audioCtx) return;
        timeSinceLastClick = 0;

        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gainNode = audioCtx.createGain();
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // Deep muffled thud
        let freq = 200 / (size + 1);
        if (freq < 30) freq = 30; // sub bass limit

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, audioCtx.currentTime);

        const stopTime = audioCtx.currentTime + (isSingularity ? 3.0 : 0.8);

        if (isRare) {
            // Detuned chord for pastel (filtered smoothly)
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            const osc2 = audioCtx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 1.2, audioCtx.currentTime);
            osc2.connect(filter); // Route through lowpass properly!
            osc2.start();
            osc2.stop(audioCtx.currentTime + 1.5);
        } else {
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        }

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(isSingularity ? 0.8 : 0.3, audioCtx.currentTime + 0.05);
        // Smoothed release to prevent audio popping
        gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime - 0.05);
        gainNode.gain.linearRampToValueAtTime(0, stopTime);

        osc.start();
        osc.stop(stopTime);
    }

    function playWhiteHoleSpit() {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gainNode = audioCtx.createGain();
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.type = 'sine'; // Smooth ocean sub pulse
        osc.frequency.setValueAtTime(60, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 1.2);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, audioCtx.currentTime);

        const stopTime = audioCtx.currentTime + 1.2;
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime - 0.05);
        gainNode.gain.linearRampToValueAtTime(0, stopTime);

        osc.start();
        osc.stop(stopTime);
    }

    function playDevourSound() {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(40, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.5);

        const stopTime = audioCtx.currentTime + 0.5;
        gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime - 0.05);
        gainNode.gain.linearRampToValueAtTime(0, stopTime);

        osc.start();
        osc.stop(stopTime);
    }

    function playDeepGong() {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 4);

        const stopTime = audioCtx.currentTime + 4;
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime - 0.05);
        gainNode.gain.linearRampToValueAtTime(0, stopTime);

        osc.start();
        osc.stop(stopTime);
    }

    function playCompanionChime(isHappy = false) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        let subFreq = proximityOsc ? proximityOsc.frequency.value : 40;
        const harmonics = [4, 6, 8, 10, 12, 16]; // Pure mathematical ratio intervals mathematically
        let baseFreq = subFreq * harmonics[Math.floor(Math.random() * harmonics.length)];

        osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);

        if (isHappy) osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, audioCtx.currentTime + 0.3);
        else osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, audioCtx.currentTime + 0.3);

        const stopTime = audioCtx.currentTime + 0.3;
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, stopTime - 0.05);
        gain.gain.linearRampToValueAtTime(0, stopTime);

        osc.start();
        osc.stop(stopTime);
    }

    function playWeeeeChime() {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1400, audioCtx.currentTime + 0.4);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 1.2);

        const stopTime = audioCtx.currentTime + 1.5;
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, stopTime - 0.05);
        gain.gain.linearRampToValueAtTime(0, stopTime);

        osc.start();
        osc.stop(stopTime);
    }

    function playFranticScream() {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
        for (let i = 1; i < 8; i++) {
            osc.frequency.linearRampToValueAtTime(rand(1200, 2400), audioCtx.currentTime + (i * 0.1));
        }
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.9);

        const stopTime = audioCtx.currentTime + 1.0;
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, stopTime - 0.05);
        gain.gain.linearRampToValueAtTime(0, stopTime);

        osc.start();
        osc.stop(stopTime);
    }

    function playAngryChime() {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.4);

        const stopTime = audioCtx.currentTime + 0.5;
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, stopTime - 0.05);
        gain.gain.linearRampToValueAtTime(0, stopTime);

        osc.start();
        osc.stop(stopTime);
    }

    let harmonizing = false;
    let harmContext = 0;
    let harmTimeoutId = null;

    function playMelodyLoop() {
        if (!harmonizing || !audioCtx) return;

        // Main melody note
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        // Detuned second oscillator for warmth/richness
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);

        // Generative sci-fi wind-chime Lydian sequence
        const notes = [440.00, 493.88, 554.37, 622.25, 659.25, 739.99, 830.61]; // A Lydian
        const randomNote = notes[Math.floor(Math.random() * notes.length)] * (Math.random() > 0.8 ? 2 : 1);

        osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(randomNote, audioCtx.currentTime);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(randomNote * 1.004, audioCtx.currentTime); // +7 cents detune

        const stopTime = audioCtx.currentTime + 1.4;

        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.22, audioCtx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, stopTime - 0.05);
        gain.gain.linearRampToValueAtTime(0, stopTime);

        gain2.gain.setValueAtTime(0, audioCtx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.0001, stopTime - 0.05);
        gain2.gain.linearRampToValueAtTime(0, stopTime);

        osc.start(); osc.stop(stopTime);
        osc2.start(); osc2.stop(stopTime);

        harmContext++;
        harmTimeoutId = setTimeout(playMelodyLoop, rand(150, 500));
    }

    let bassOsc = null;
    let bassGain = null;

    function startHarmonics() {
        if (!audioCtx) initAudio();
        if (!audioCtx || !bassGain) return;
        audioCtx.resume();
        // Fade in smoothly – exponential ramp avoids clicks. Set initial non-zero value.
        bassGain.gain.setValueAtTime(bassGain.gain.value || 0.0001, audioCtx.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.3);
    }

    function stopHarmonics() {
        if (!audioCtx || !bassGain) return;
        // Fade out over 1 second, then stay at 0
        bassGain.gain.setValueAtTime(bassGain.gain.value || 0.25, audioCtx.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.0);
    }

    // Core Three.js Setup
    const scene = new THREE.Scene();
    const fogColor = new THREE.Color(0xfafafa);
    scene.background = fogColor;

    let FOG_FAR = 500;
    scene.fog = new THREE.Fog(fogColor, 100, FOG_FAR);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1500);
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // POST-PROCESSING 
    let composer, customPass;
    if (window.THREE && THREE.EffectComposer) {
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(scene, camera));

        const LensShader = {
            uniforms: {
                "tDiffuse": { value: null },
                "u_resolution": { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                "u_gravityPoints": {
                    value: [
                        new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(),
                        new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
                    ]
                },
                "u_numPoints": { value: 0 },
                "u_anchored": { value: 0.0 } // Used to smoothly trigger the chromatic vignette
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 u_resolution;
                uniform vec3 u_gravityPoints[10];
                uniform int u_numPoints;
                uniform float u_anchored;
                varying vec2 vUv;

                void main() {
                    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
                    vec2 uv = vUv;
                    vec2 warpR = vec2(0.0); vec2 warpG = vec2(0.0); vec2 warpB = vec2(0.0);
                    
                    for(int i = 0; i < 10; i++) {
                        if (i >= u_numPoints) break;
                        vec2 pos = u_gravityPoints[i].xy;
                        float mass = u_gravityPoints[i].z;
                        
                        vec2 dir = (uv - pos) * aspect;
                        float dist = length(dir);
                        
                        if (dist > 0.001 && dist < 0.5) {
                            float str = (mass * 0.005) / (dist * dist + 0.05);
                            vec2 safeDir = dir / dist; // NaN safe
                            float wBase = str * 0.008 * clamp(1.0 - (dist * 2.0), 0.0, 1.0);
                            warpR -= safeDir * wBase * 1.08;
                            warpG -= safeDir * wBase * 1.00;
                            warpB -= safeDir * wBase * 0.92;
                        }
                    }

                    // Dynamic Chromatic Aberration & Edge Blur mapping
                    vec2 centered = uv - 0.5;
                    float distCenter = length(centered);
                    float aberration = u_anchored * distCenter * 0.05;
                    
                    warpR += (centered * aberration);
                    warpB -= (centered * aberration);
                    
                    vec2 finalUvR = clamp(uv + warpR, 0.001, 0.999);
                    vec2 finalUvG = clamp(uv + warpG, 0.001, 0.999);
                    vec2 finalUvB = clamp(uv + warpB, 0.001, 0.999);
                    
                    // Smooth Vignette
                    float vigBase = 1.0 - smoothstep(0.4, 1.2, distCenter);
                    float vignette = mix(1.0, vigBase, u_anchored * 0.85); // Darken edges when right-clicking
                    
                    gl_FragColor = vec4(
                        texture2D(tDiffuse, finalUvR).r * vignette,
                        texture2D(tDiffuse, finalUvG).g * vignette,
                        texture2D(tDiffuse, finalUvB).b * vignette,
                        1.0
                    );
                }
            `
        };

        customPass = new THREE.ShaderPass(LensShader);
        customPass.renderToScreen = true;
        composer.addPass(customPass);
    }

    // Camera Trail
    const trailMaterial = new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.3 });
    const trailPoints = [];
    for (let i = 0; i < 40; i++) trailPoints.push(new THREE.Vector3(0, -0.5, 0));
    const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
    const cameraTrail = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(cameraTrail);

    // Geometries
    const standardGeometries = [
        new THREE.IcosahedronGeometry(1, 0),
        new THREE.OctahedronGeometry(1, 0),
        new THREE.TetrahedronGeometry(1, 0),
        new THREE.BoxGeometry(1.5, 1.5, 1.5)
    ];

    const complexGeometries = [
        new THREE.TorusGeometry(1, 0.4, 8, 20),
        new THREE.TorusKnotGeometry(1, 0.3, 32, 8),
        new THREE.CylinderGeometry(1, 1, 3, 16),
        new THREE.ConeGeometry(1.2, 3, 16)
    ];

    const materials = [];
    for (let i = 0; i < 20; i++) {
        const shade = Math.floor(Math.random() * (140 - 20) + 20); // From 20 (near black) to 140 (mid grey)
        materials.push(new THREE.MeshPhongMaterial({ color: `rgb(${shade},${shade},${shade})`, flatShading: true, shininess: Math.random() * 30 }));
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dLight.position.set(1, 1, 1);
    scene.add(dLight);


    let objects = [];
    const G = 0.05; // Increased global gravity for stronger orbits

    // Guardian Companion Base
    let companion = null;
    let companionTrail = [];
    let companionTrailLine = null;
    let compTime = 0;

    function spawnCompanion() {
        if (companion) return; // Enforce singleton
        const initColor = getRandomPastel();
        const compGeo = new THREE.IcosahedronGeometry(0.8, 1);
        const compMat = new THREE.MeshPhongMaterial({
            color: 0x111111, emissive: initColor, flatShading: true
        });
        companion = new THREE.Mesh(compGeo, compMat);

        // Orbital rings – visible only when companion is calm, vanish during combat
        const orbitalRings = [];
        const ringAngles = [0, Math.PI / 3, Math.PI * 2 / 3]; // 3 rings at different tilts
        for (let ri = 0; ri < 3; ri++) {
            const rGeo = new THREE.RingGeometry(2.2, 2.4, 48);
            const rMat = new THREE.MeshBasicMaterial({
                color: 0xaaaaaa, transparent: true, opacity: 0.0,
                side: THREE.DoubleSide, depthWrite: false
            });
            const ring = new THREE.Mesh(rGeo, rMat);
            ring.rotation.x = ringAngles[ri];
            ring.rotation.z = ringAngles[(ri + 1) % 3];
            companion.add(ring);
            orbitalRings.push(ring);
        }
        companion.userData.orbitalRings = orbitalRings;

        // Remove old flock system (replaced by rings)
        companion.userData.flockSystem = true;

        const compLight = new THREE.PointLight(0xffffff, 3.0, 20);
        companion.add(compLight);

        const coreGeo = new THREE.IcosahedronGeometry(0.81, 1);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.3 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        companion.add(core);

        companion.position.set(0, 0, -20);

        for (let i = 0; i < 15; i++) companionTrail.push(companion.position.clone());
        const trailMat = new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.35 });
        const trailGeo = new THREE.BufferGeometry().setFromPoints(companionTrail);
        companionTrailLine = new THREE.Line(trailGeo, trailMat);
        scene.add(companionTrailLine);

        companion.userData = {
            velocity: new THREE.Vector3(), rotSpeed: new THREE.Vector3(0.02, 0.03, 0.01),
            radius: 1.0, mass: 8.0,
            isCompanion: true, isMonument: false, isSingularity: false, isWhiteHole: false, isComet: false,
            interacted: false, life: -1, isAngry: false, initColor: initColor
        };

        scene.add(companion);
        objects.push(companion);

        // Greeting fly-in: companion spawns far away and glides forward
        companion.position.set(0, 0, -200);
        companion.scale.set(0.01, 0.01, 0.01);
        gsap.to(companion.position, { z: -20, duration: 3.0, ease: 'power2.out' });
        gsap.to(companion.scale, {
            x: 1, y: 1, z: 1, duration: 2.0, ease: 'back.out(1.4)',
            onComplete: () => {
                if (audioCtx) { playCompanionChime(true); showEmote('✨'); }
            }
        });
        gsap.to(companion.rotation, { y: Math.PI * 4, duration: 2.5, ease: 'power2.out' });

        // Mood dot UI – injected via JS so we don't touch the HTML file
        const moodDot = document.createElement('div');
        moodDot.id = 'mood-dot';
        Object.assign(moodDot.style, {
            position: 'fixed', bottom: '18px', left: '18px',
            width: '10px', height: '10px', borderRadius: '50%',
            background: `#${initColor.getHexString()}`,
            opacity: '0.7', transition: 'background 1s ease, opacity 0.5s ease',
            pointerEvents: 'none', zIndex: '100'
        });
        document.body.appendChild(moodDot);
        companion.userData.moodDot = moodDot;
    } // end spawnCompanion

    function triggerJoy() {
        if (!companion || companion.userData.isAngry) return;
        playWeeeeChime();
        showEmote('✨');
        companion.userData.attention = 120;
        gsap.to(companion.rotation, {
            z: companion.rotation.z + Math.PI * 8,
            y: companion.rotation.y + Math.PI * 4,
            duration: 1.5, ease: "power2.out"
        });
    }

    function triggerChaoticScream() {
        if (!companion || companion.userData.isAngry) return;
        playFranticScream();
        showEmote('🌀');
        companion.userData.attention = 160;
        gsap.to(companion.rotation, {
            x: companion.rotation.x + Math.PI * 12,
            y: companion.rotation.y + Math.PI * 16,
            z: companion.rotation.z + Math.PI * 12,
            duration: 1.0, ease: "elastic.out(1, 0.3)"
        });

        // Spawn frantic particles
        for (let k = 0; k < 3; k++) {
            const d = spawnObject(false, companion.position, 'bloom');
            d.userData.velocity.set(rand(-2, 2), rand(-2, 2), rand(-2, 2)).normalize().multiplyScalar(0.8);
            gsap.to(d.scale, { x: 0, y: 0, z: 0, duration: 1.0, onComplete: () => disposeShape(d) });
        }
    }

    function showEmote(emoji) {
        const el = document.getElementById('companion-emote');
        if (!el) return;
        el.innerText = emoji;
        el.style.opacity = '1';
        gsap.killTweensOf(el);
        gsap.to(el, { opacity: 0, delay: 2, duration: 1 });
    }

    let yaw = 0; let pitch = 0;
    const rand = (min, max) => Math.random() * (max - min) + min;

    // Disposes all data absolutely cleanly to prevent WebGL memory leaks
    function disposeShape(mesh) {
        scene.remove(mesh);
        const idx = objects.indexOf(mesh);
        if (idx > -1) objects.splice(idx, 1);

        const isShared = standardGeometries.includes(mesh.geometry) || complexGeometries.includes(mesh.geometry);
        if (mesh.geometry && !isShared) mesh.geometry.dispose();
        if (mesh.material && !materials.includes(mesh.material)) mesh.material.dispose();

        mesh.children.forEach(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
            mesh.remove(c);
        });
    }

    // Live spawning using systemic twist likelihood variables
    function spawnObject(initialSpawn = false, forcePos = null, isSpecific = null) {
        let isRare = false; let isMonument = false; let isAntiGravity = false; let isSingularity = false; let isBloomDot = false; let isComet = false; let isLonely = false; let isWhiteHole = false;

        let geoPool = standardGeometries;
        let mat;

        if (isSpecific === 'lonely') {
            isLonely = true;
            geoPool = [new THREE.TorusKnotGeometry(2, 0.5, 64, 16)];
            mat = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true });
        } else if (isSpecific === 'bloom') {
            isBloomDot = true;
            geoPool = [new THREE.SphereGeometry(0.2, 8, 8)];
            mat = new THREE.MeshBasicMaterial({ color: getRandomPastel() });
        } else if (isSpecific === 'spit') {
            geoPool = standardGeometries;
            mat = materials[Math.floor(Math.random() * materials.length)];
        } else if (isSpecific === 'blackhole') {
            isSingularity = true;
            geoPool = [new THREE.SphereGeometry(1, 32, 32)];
            mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        } else if (isSpecific === 'whitehole') {
            isWhiteHole = true;
            geoPool = [new THREE.SphereGeometry(1, 32, 32)];
            mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        } else {
            const roll = Math.random();
            if (roll > 0.98) {
                isComet = true;
                geoPool = [new THREE.TetrahedronGeometry(1, 0)];
                mat = new THREE.MeshBasicMaterial({ color: 0x111111 });
            } else if (roll > (1.0 - (p_heavy / 2))) {
                isRare = true;
                mat = new THREE.MeshPhongMaterial({ color: getRandomPastel(), flatShading: true });
            } else if (roll > (1.0 - p_anti)) {
                isAntiGravity = true;
                if (Math.random() > 0.7) geoPool = complexGeometries;
                // Subtle translucent grey - fits monochrome aesthetic
                mat = new THREE.MeshPhongMaterial({ color: 0xd8d8d8, transparent: true, opacity: 0.45, shininess: 10, flatShading: true });
            } else {
                mat = materials[Math.floor(Math.random() * materials.length)];
                if (Math.random() > 0.7) geoPool = complexGeometries;
            }
        }

        const geo = geoPool[Math.floor(Math.random() * geoPool.length)];
        const mesh = new THREE.Mesh(geo, mat);

        scene.add(mesh);
        objects.push(mesh);

        let s = rand(0.3, 3);
        if (isBloomDot) s = rand(0.3, 0.8);
        if (isSingularity) s = rand(4, 8);
        if (isWhiteHole) s = rand(4, 8);
        if (isLonely) s = 4;

        // Systemic Monument chance
        if (Math.random() < p_heavy && !isSingularity && !isRare && !isSpecific) {
            isMonument = true;
            s = rand(8, 20);
        }

        mesh.scale.set(s, s, s);

        // Wireframe overlays only on rare/singularity/whitehole for minimal aesthetic
        if (Math.random() < 0.15 && (isRare || isSingularity) && !isBloomDot) {
            const wireMat = new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: true, transparent: true, opacity: 0.08 });
            const wireMesh = new THREE.Mesh(geo, wireMat);
            wireMesh.scale.setScalar(1.01);
            mesh.add(wireMesh);
        }

        let mass = isMonument ? s * 3 : s;
        mass *= rand(0.5, 1.5);

        // Gravity Personality System – gives each shape its own gravitational character
        let gravityPersonality = 'drifter'; // default
        if (!isMonument && !isSingularity && !isWhiteHole && !isComet && !isBloomDot && !isAntiGravity) {
            const gRoll = Math.random();
            if (gRoll < 0.40) { gravityPersonality = 'drifter'; mass = rand(0.05, 0.4); }
            else if (gRoll < 0.70) { gravityPersonality = 'attractor'; mass = rand(2, 8); }
            else if (gRoll < 0.90) { gravityPersonality = 'repulsor'; mass = -rand(0.5, 3); }
            else { gravityPersonality = 'massive'; mass = rand(10, 22); }
        }
        if (isAntiGravity || isBloomDot) mass = -Math.abs(mass) * 2; // Anti-grav: mild repulsion
        if (isComet) mass = s * 2;
        if (isLonely) mass = s * 0.5;

        if (isWhiteHole) mass = -s * 20; // Massive physical repulsion field
        if (isSingularity) mass = 0; // Pure light warp, completely physically neutral

        // Visual Identity Upgrades (Black Holes and White Holes)
        let accDisk = null;
        if (isSingularity || isWhiteHole) {
            const accretionGeo = new THREE.RingGeometry(1.2, 2.5, 64);
            const diskColor = isSingularity ? 0xdddddd : 0x111111;
            const accretionMat = new THREE.MeshBasicMaterial({ color: diskColor, transparent: true, opacity: isSingularity ? 0.04 : 0.08, side: THREE.DoubleSide });
            accDisk = new THREE.Mesh(accretionGeo, accretionMat);
            accDisk.rotation.x = Math.PI / 2 + rand(-0.2, 0.2);
            accDisk.rotation.y = rand(-0.2, 0.2);
            mesh.add(accDisk);

            // Give the White Hole a dark structural wireframe core so it doesn't melt into the white fog
            if (isWhiteHole) {
                const shellGeo = new THREE.IcosahedronGeometry(1.05, 1);
                const shellMat = new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true, transparent: true, opacity: 0.25 });
                const shell = new THREE.Mesh(shellGeo, shellMat);
                mesh.add(shell);
            }
        }

        if (!initialSpawn && isSpecific !== 'spit') {
            // Universal fade-in so absolutely nothing pops mathematically
            mesh.traverse(child => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) return;
                    child.material = child.material.clone();
                    let targetOpacity = child.material.opacity !== undefined && child.material.opacity !== null ? child.material.opacity : 1.0;
                    if (targetOpacity === 0) targetOpacity = 1.0;
                    if (isAntiGravity && child === mesh) targetOpacity = 0.8;
                    const cMat = child.material;
                    cMat.transparent = true;
                    cMat.opacity = 0;
                    gsap.to(cMat, { opacity: targetOpacity, duration: 4, ease: "power2.inOut" });
                }
            });
        }

        // Visual Gravity Bubbles have been removed based on feedback

        if (forcePos) {
            mesh.position.copy(forcePos);
        } else if (isLonely && !initialSpawn) {
            // Spawn behind the camera, slightly offset to avoid clipping directly through
            camera.getWorldDirection(forwardVector);
            const sideOffset = (Math.random() > 0.5 ? 1 : -1) * rand(4, 8);
            const rightVector = new THREE.Vector3().crossVectors(forwardVector, new THREE.Vector3(0, 1, 0)).normalize();

            const behindPos = camera.position.clone()
                .addScaledVector(forwardVector, -40)
                .addScaledVector(rightVector, sideOffset)
                .add(new THREE.Vector3(0, rand(-4, 4), 0));

            mesh.position.copy(behindPos);
        } else if ((isSingularity || isWhiteHole) && !initialSpawn) {
            // Force cosmic events to spawn on the side rails of the camera path so they frame the view gracefully
            camera.getWorldDirection(forwardVector);
            const sideOffset = new THREE.Vector3().crossVectors(forwardVector, new THREE.Vector3(0, 1, 0)).normalize();
            const polarity = Math.random() > 0.5 ? 1 : -1;

            const spawnDistBase = scene.fog.far * 0.7; // Base spawn organically on current fog depth
            const eventPos = camera.position.clone()
                .addScaledVector(forwardVector, rand(spawnDistBase * 0.6, spawnDistBase)) // Scale into mist
                .addScaledVector(sideOffset, polarity * rand(25, 50)) // scale lateral offset to match
                .add(new THREE.Vector3(0, rand(-15, 15), 0));
            mesh.position.copy(eventPos);
        } else {
            const dist = initialSpawn ? rand(10, FOG_FAR * 0.9) : (FOG_FAR * rand(0.6, 0.9));
            const theta = rand(0, Math.PI * 2);
            const phi = Math.acos(rand(-1, 1));

            mesh.position.set(
                camera.position.x + dist * Math.sin(phi) * Math.cos(theta),
                camera.position.y + dist * Math.cos(phi),
                camera.position.z + dist * Math.sin(phi) * Math.sin(theta)
            );
        }

        mesh.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));

        // Vastly randomize Vector bands for organic drift speeds
        const initSpeedSq = isComet ? rand(0.1, 0.3) : rand(0.001, 0.03);
        let randVel = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(initSpeedSq);

        if (isLonely) {
            // Give lonely shape a steady velocity to overtake the camera's flightSpeed (0.08)
            camera.getWorldDirection(forwardVector);
            randVel = forwardVector.clone().multiplyScalar(0.14);
        }

        const randRot = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(0.001, 0.02));

        mesh.userData = {
            velocity: randVel,
            rotSpeed: randRot,
            radius: s, mass: mass, accDisk: accDisk,
            gravityPersonality: gravityPersonality,
            wanderSeed: Math.random() * 1000, // unique per-shape for autonomous drift
            isRare: isRare, isMonument: isMonument, isAntiGravity: isAntiGravity,
            isSingularity: isSingularity, isWhiteHole: isWhiteHole, isBloomDot: isBloomDot,
            isComet: isComet, isLonely: isLonely, interacted: false,
            life: (isSingularity || isWhiteHole) ? 1200 : -1 // 20 sec lifespan
        };

        if (isMonument || isSingularity || isWhiteHole) mesh.userData.velocity.set(0, 0, 0);
        return mesh;
    }

    function getRandomPastel() {
        const hue = Math.floor(Math.random() * 360);
        return new THREE.Color(`hsl(${hue}, 80%, 90%)`);
    }

    function setTargetObjectCount() {
        let target = 0;
        if (trafficPhase === "empty") target = 6;
        else if (trafficPhase === "medium") target = 22;
        else target = 40;

        while (objects.length < target) spawnObject(false);
        spawnCompanion(); // Guarantees existence
    }
    setTargetObjectCount();

    function spawnMonumentEvent() {
        const monument = spawnObject(false);
        monument.userData.isMonument = true;
        monument.scale.setScalar(12);
        monument.userData.radius = 12;
        monument.userData.mass = 40;
    }

    // Controls
    let isDragging = false; let maxDragDist = 0; let previousMousePosition = { x: 0, y: 0 };
    let isAnchored = false;
    let clickFrenzy = 0;
    let frenzyTimer = null;

    document.addEventListener('contextmenu', e => {
        e.preventDefault();
        initAudio(); // Always ensure audio context is running on right-click
        isAnchored = true;

        // Dynamically shift shader into chromatic vignette mode
        if (customPass) {
            gsap.to(customPass.uniforms.u_anchored, { value: 1.0, duration: 1.0, ease: "power2.out" });
        }

        if (typeof companion !== 'undefined' && companion && !companion.userData.isAngry) {
            startHarmonics();
            showEmote('🎵');
        }
        cursorDot.classList.add('active', 'anchored');
    });

    document.addEventListener('mouseup', e => {
        if (e.button === 2) {
            isAnchored = false;
            stopHarmonics();
            cursorDot.classList.remove('active', 'anchored');

            // Release chromatic vignette smoothly
            if (customPass) {
                gsap.to(customPass.uniforms.u_anchored, { value: 0.0, duration: 1.2, ease: "power2.inOut" });
            }
        }
    });

    const onTouchDown = (e) => {
        if (e.button === 2) return;
        isDragging = true; maxDragDist = 0;
        const x = e.touches ? e.touches[0].clientX : e.clientX; const y = e.touches ? e.touches[0].clientY : e.clientY;
        previousMousePosition = { x, y };
        cursorDot.classList.add('active');
    };

    const onTouchMove = (e) => {
        if (!isDragging) return;

        const x = e.touches ? e.touches[0].clientX : e.clientX; const y = e.touches ? e.touches[0].clientY : e.clientY;
        const deltaX = x - previousMousePosition.x; const deltaY = y - previousMousePosition.y;
        maxDragDist += Math.abs(deltaX) + Math.abs(deltaY);

        // Tractor Beam: Y-drag maps mathematically to Push/Pull velocities universally across non-monument eco-objects
        if (Math.abs(deltaY) > 2) {
            const pullStr = deltaY * 0.005;
            for (let i = 0; i < objects.length; i++) {
                const obj = objects[i];
                if (obj.userData.isSingularity || obj.userData.isWhiteHole || obj.userData.isCompanion || obj.userData.isMonument) continue;
                let dir = camera.position.clone().sub(obj.position).normalize();
                obj.userData.velocity.addScaledVector(dir, pullStr);
            }
            // Tractor beam whoosh sound – throttled to once per 300ms
            const now = Date.now();
            if (audioCtx && (!window._lastTractorSound || now - window._lastTractorSound > 300)) {
                window._lastTractorSound = now;
                const bufLen = audioCtx.sampleRate * 0.12;
                const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
                const data = buf.getChannelData(0);
                for (let n = 0; n < bufLen; n++) data[n] = (Math.random() * 2 - 1) * (1 - n / bufLen);
                const src = audioCtx.createBufferSource();
                src.buffer = buf;
                const filt = audioCtx.createBiquadFilter();
                filt.type = 'bandpass'; filt.frequency.value = 300; filt.Q.value = 2;
                const whooshGain = audioCtx.createGain();
                whooshGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
                whooshGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.12);
                src.connect(filt); filt.connect(whooshGain); whooshGain.connect(audioCtx.destination);
                src.start();
            }
        }

        yaw -= deltaX * 0.005; pitch -= deltaY * 0.005;
        pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
        previousMousePosition = { x, y };
    };

    const onTouchUp = (e) => {
        if (e.button === 2) return;
        isDragging = false;
        cursorDot.classList.remove('active');
        if (maxDragDist < 5) onInteract(e);
    };

    document.addEventListener('mousedown', onTouchDown); document.addEventListener('mousemove', onTouchMove); document.addEventListener('mouseup', onTouchUp);
    document.addEventListener('touchstart', onTouchDown, { passive: true }); document.addEventListener('touchmove', onTouchMove, { passive: true }); document.addEventListener('touchend', onTouchUp);

    function createShockwave(position, blastRadius, forceStr) {
        const ringGeo = new THREE.RingGeometry(0.1, 1, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(position); ring.lookAt(camera.position); scene.add(ring);

        gsap.to(ring.scale, { x: blastRadius * 1.5, y: blastRadius * 1.5, duration: 1.5, ease: 'power2.out' });
        gsap.to(ringMat, { opacity: 0, duration: 1.5, onComplete: () => { scene.remove(ring); ringGeo.dispose(); ringMat.dispose(); } });

        objects.forEach(obj => {
            // Anti-gravity shapes drift smoothly instead of getting blasted out chaotically by shockwaves
            if (obj.userData.isMonument || obj.userData.isAntiGravity) return;
            const dist = obj.position.distanceTo(position);
            if (dist < blastRadius) {
                const pushDir = obj.position.clone().sub(position).normalize();
                const pushForce = forceStr * Math.pow(1 - dist / blastRadius, 2);
                obj.userData.velocity.addScaledVector(pushDir, pushForce);
            }
        });
    }

    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();

    function onInteract(e) {
        // Frenzy System
        clickFrenzy++;
        clearTimeout(frenzyTimer);
        frenzyTimer = setTimeout(() => { clickFrenzy = 0; }, 1500);

        if (clickFrenzy >= 5 && companion && !companion.userData.isAngry) {
            companion.userData.danceTimer = 900; // 15 seconds spin-lock protocol execution!
            showEmote('💃'); playCompanionChime(true);
            clickFrenzy = 0;
        } else if (clickFrenzy >= 2 && companion && !companion.userData.isAngry && (!companion.userData.rampage || companion.userData.rampage <= 0) && (!companion.userData.preRampage || companion.userData.preRampage <= 0) && (!companion.userData.danceTimer || companion.userData.danceTimer <= 0)) {
            companion.userData.preRampage = 60; // 1 second narrative "Check up" lock before hunting
            companion.userData.attention = 100;
            showEmote('💥');
            clickFrenzy = 0;
        }

        const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX; const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        pointer.x = (clientX / window.innerWidth) * 2 - 1; pointer.y = -(clientY / window.innerHeight) * 2 + 1;

        camera.rotation.set(0, 0, 0, 'YXZ');
        camera.rotateY(yaw); camera.rotateX(pitch);
        camera.updateMatrixWorld();

        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(objects);

        if (intersects.length > 0) {
            const hitObj = intersects[0].object;
            if (hitObj.userData.interacted) return;
            hitObj.userData.interacted = true;

            // Companion Interaction Path
            if (hitObj.userData.isCompanion || (hitObj.parent && hitObj.parent.userData.isCompanion)) {
                const compCore = hitObj.userData.isCompanion ? hitObj : hitObj.parent;
                playCompanionChime();
                compCore.userData.interacted = false;
                compCore.userData.attention = 120; // Lock intense curiosity logic
                showEmote('❤️');

                gsap.to(compCore.rotation, {
                    x: compCore.rotation.x + Math.PI,  // was 4*PI
                    y: compCore.rotation.y + Math.PI,  // was 4*PI
                    duration: 0.5,  // faster, less lingering
                    ease: "power2.out"
                });

                createShockwave(compCore.position, 60, 0.6);

                for (let i = 0; i < 4; i++) {
                    const dot = spawnObject(false, compCore.position, 'bloom');
                    dot.userData.velocity.set(rand(-0.4, 0.4), rand(-0.4, 0.4), rand(-0.4, 0.4));
                    gsap.to(dot.scale, { x: 0, y: 0, z: 0, duration: 4, delay: rand(0.5, 2), onComplete: () => disposeShape(dot) });
                }
                return;
            }

            // Companion Attack Assist (Rare)!
            if (!hitObj.userData.isCompanion && !hitObj.userData.isSingularity && !hitObj.userData.isWhiteHole && companion && Math.random() < 0.1) {
                const assistTarg = hitObj;
                assistTarg.userData.interacted = true;

                companion.userData.attention = 100;
                if (!companion.userData.rampage) companion.userData.targetObject = assistTarg;
                companion.userData.isAssisting = true;
                showEmote('⚡️');
                return;
            }

            // Systemic Evolution: clicking objects biases world to anti-gravity
            p_anti = clampProb(p_anti + 0.005);

            playTone(hitObj.userData.radius, hitObj.userData.isRare, hitObj.userData.isSingularity);

            if (hitObj.userData.isRare) {
                rareCount++; if (rareCounterElement) { rareCounterElement.innerText = rareCount; hudContainer.classList.remove('hud-hidden'); resetHudTimer(); }

                // Task 17: Monument Evolution milestone
                if (rareCount % 10 === 0) {
                    spawnMonumentEvent();
                    showEmote('⭐'); playWeeeeChime();
                    createShockwave(hitObj.position, 150, 2.0);
                }

                // Pastel Bloom splits out
                for (let i = 0; i < 12; i++) {
                    const dot = spawnObject(false, hitObj.position, 'bloom');
                    dot.userData.velocity.set(rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.3, 0.3));
                    gsap.to(dot.scale, { x: 0, y: 0, z: 0, duration: 4, delay: rand(0.5, 2), onComplete: () => disposeShape(dot) });
                }
            }

            if (hitObj.userData.isSingularity) {
                createShockwave(hitObj.position, 80, 1.5);
            } else if (!hitObj.userData.isRare) {
                createShockwave(hitObj.position, hitObj.userData.radius * 8, 0.4);
            }

            const oldPos = hitObj.position.clone();
            const rad = hitObj.userData.radius;

            // Prevent double animation
            if (hitObj.userData._animating) return;
            hitObj.userData._animating = true;

            // Play the click sound (already done earlier)
            playTone(hitObj.userData.radius, hitObj.userData.isRare, hitObj.userData.isSingularity);

            // For rare objects: spawn bloom particles (already done earlier)
            // For black/white holes: optional quick implosion ring (optional, but keep it simple)
            if (hitObj.userData.isSingularity || hitObj.userData.isWhiteHole) {
                const implosionRing = new THREE.Mesh(
                    new THREE.RingGeometry(0.5, 1.2, 16),
                    new THREE.MeshBasicMaterial({ color: hitObj.userData.isSingularity ? 0x111111 : 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
                );
                implosionRing.position.copy(hitObj.position);
                implosionRing.lookAt(camera.position);
                scene.add(implosionRing);
                gsap.to(implosionRing.scale, { x: 2.5, y: 2.5, duration: 0.2 });
                gsap.to(implosionRing.material, { opacity: 0, duration: 0.2, onComplete: () => scene.remove(implosionRing) });
            }

            // Immediate removal – no scale tween, no flash, no rotation
            disposeShape(hitObj);
            spawnObject(false);

        }
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
        if (customPass) customPass.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    });

    const flightSpeed = 0.08;

    function animate() {
        requestAnimationFrame(animate);
        timeSinceLastClick += 1 / 60;
        frameCount++;

        // Procedural Day/Night Cycle – 4-stop pastel palette over 600s
        // cycleOffset=0.25 → starts at noon (brightest) not dawn
        const cycleOffset = 0.25;
        const cycleProgress = ((frameCount % 36000) / 36000 + cycleOffset) % 1;
        // 4 stops: morning(0) → noon(0.25) → dusk(0.5) → night(0.75) → morning(1)
        const morningColor = new THREE.Color(0xfffaf5); // barely warm white (hint of cream)
        const noonColor = new THREE.Color(0xffffff); // pure white
        const duskColor = new THREE.Color(0xf5faff); // barely cool white (hint of ice)
        const nightColor = new THREE.Color(0xeeeff5); // very light grey‑blue, still bright

        let skyColor;
        if (cycleProgress < 0.25) {
            skyColor = morningColor.clone().lerp(noonColor, cycleProgress / 0.25);
        } else if (cycleProgress < 0.5) {
            skyColor = noonColor.clone().lerp(duskColor, (cycleProgress - 0.25) / 0.25);
        } else if (cycleProgress < 0.75) {
            skyColor = duskColor.clone().lerp(nightColor, (cycleProgress - 0.5) / 0.25);
        } else {
            skyColor = nightColor.clone().lerp(morningColor, (cycleProgress - 0.75) / 0.25);
        }

        // Smooth ambient intensity: bright at noon, dim at night
        const nightness = cycleProgress > 0.5 ? (cycleProgress - 0.5) / 0.5 : 0;
        const brightest = cycleProgress < 0.5 ? 1.0 - (Math.abs(cycleProgress - 0.25) / 0.25) * 0.3 : 1.0 - nightness * 0.6;

        scene.fog.color.copy(skyColor);
        scene.background.copy(skyColor);
        ambientLight.color.copy(skyColor);
        ambientLight.intensity = Math.max(0.4, brightest);

        // Mood Cycling
        moodTimer++;
        if (mood === "calm" && moodTimer > nextCalmDuration) {
            mood = "spooky";
            moodTimer = 0;
            nextSpookyDuration = rand(300, 800);
        } else if (mood === "spooky") {
            if (moodTimer % 200 === 0) {
                for (let i = 0; i < 3; i++) spawnObject(false);
            }
            if (moodTimer > nextSpookyDuration) {
                mood = "calm";
                moodTimer = 0;
                nextCalmDuration = rand(800, 1600);
            }
        }

        // Traffic Cycling
        trafficTimer++;
        if (trafficPhase === "empty" && trafficTimer > EMPTY_DUR) {
            trafficPhase = "medium";
            trafficTimer = 0;
            setTargetObjectCount();
        } else if (trafficPhase === "medium" && trafficTimer > MEDIUM_DUR) {
            trafficPhase = "high";
            trafficTimer = 0;
            setTargetObjectCount();
        } else if (trafficPhase === "high" && trafficTimer > HIGH_DUR) {
            trafficPhase = "empty";
            trafficTimer = 0;
        }

        if (Math.random() < 0.0003) spawnMonumentEvent();
        if (Math.random() < 0.0005) { // Return Cosmic events to extreme rarity
            // Enforce Highlander Rule: Only ONE event can exist on the map at any time (Zero clumping)
            if (!objects.some(o => o.userData.isSingularity || o.userData.isWhiteHole)) {
                spawnObject(false, null, Math.random() > 0.5 ? 'blackhole' : 'whitehole');
            }
        }

        camera.rotation.set(0, 0, 0, 'YXZ');
        camera.rotateY(yaw); camera.rotateX(pitch);

        camera.getWorldDirection(forwardVector);

        if (!isAnchored) {
            camera.position.addScaledVector(forwardVector, flightSpeed);
        }

        if (frameCount % 3 === 0 && !isAnchored) {
            trailPoints.push(camera.position.clone().add(new THREE.Vector3(0, -1, 0)));
            trailPoints.shift();
            cameraTrail.geometry.setFromPoints(trailPoints);
        }

        if (timeSinceLastClick > 20 && !spawnedLonely) {
            spawnedLonely = true;
            spawnObject(false, null, 'lonely');
        } else if (timeSinceLastClick < 2) {
            spawnedLonely = false;
        }

        // Guardian Companion AI Steering Motor
        if (companion) {
            compTime += 0.02;
            const rightVector = new THREE.Vector3().crossVectors(forwardVector, new THREE.Vector3(0, 1, 0)).normalize();

            // Emotion & Color System Matrix
            const isScary = objects.some(o => o.userData.isSingularity);
            if (isScary !== companion.userData.isAngry) {
                companion.userData.isAngry = isScary;
                if (isScary) { showEmote('😠'); playAngryChime(); }
            }

            let cTarg = companion.userData.initColor; // Calm pastel base
            if (companion.userData.rampage > 0) {
                cTarg = (frameCount % 12 < 6) ? { r: 1.5, g: 0.0, b: 0.0 } : { r: 2.0, g: 2.0, b: 2.0 }; // Strobe Red/White Fury
            } else if (companion.userData.isAngry) {
                cTarg = { r: 0.9, g: 0.0, b: 0.0 }; // Deep Red Panic
            } else if (companion.userData.attention > 0 && clickFrenzy < 5) {
                cTarg = { r: 1.2, g: 0.8, b: 0.1 }; // Playful Bright Yellow/Orange
            }
            gsap.to(companion.material.emissive, { r: cTarg.r, g: cTarg.g, b: cTarg.b, duration: 0.3 });

            // Orbital rings – slow rotation, mood-reactive opacity
            const rings = companion.userData.orbitalRings;
            if (rings) {
                const isRampaging = companion.userData.rampage > 0;
                const isAngryNow = companion.userData.isAngry;
                const targetRingOpacity = (isRampaging || isAngryNow) ? 0.0 : 0.13;
                for (let ri = 0; ri < rings.length; ri++) {
                    const r = rings[ri];
                    // Slowly drift opacity toward target
                    r.material.opacity += (targetRingOpacity - r.material.opacity) * 0.03;
                    r.material.visible = r.material.opacity > 0.005;
                    // Each ring rotates at a slightly different speed/axis
                    r.rotation.x += 0.002 * (ri + 1);
                    r.rotation.y += 0.003 * (ri % 2 === 0 ? 1 : -1);
                }
                // Update mood dot
                if (companion.userData.moodDot) {
                    const dotColor = isRampaging ? '#cc3300'
                        : isAngryNow ? '#882200'
                            : companion.userData.attention > 0 ? '#c8b88a'
                                : '#aaaaaa';
                    companion.userData.moodDot.style.background = dotColor;
                }
            }

            // UI Holographic Emote Sync
            const emoteEl = document.getElementById('companion-emote');
            if (emoteEl && emoteEl.style.opacity > 0) {
                const wPos = companion.position.clone();
                wPos.y += 2.0;
                wPos.project(camera);
                if (wPos.z < 1) {
                    emoteEl.style.left = ((wPos.x * 0.5 + 0.5) * window.innerWidth) + 'px';
                    emoteEl.style.top = ((wPos.y * -0.5 + 0.5) * window.innerHeight) + 'px';
                }
            }

            // Organic Idle Chirping
            if (frameCount % 400 === 0 && Math.random() < 0.4) {
                if (companion.userData.isAngry) { playAngryChime(); if (Math.random() < 0.3) showEmote('😠'); }
                else { playCompanionChime(true); if (Math.random() < 0.3) showEmote('🎵'); }
            }

            // Pre-Rampage Narrative phase
            if (companion.userData.preRampage && companion.userData.preRampage > 0) {
                companion.userData.preRampage--;
                if (companion.userData.preRampage <= 0) {
                    companion.userData.rampage = 1; // Pure boolean trigger lock
                    companion.userData.rampageTargets = Math.floor(Math.random() * 5) + 3; // Kills exactly 3 to 7 shapes procedurally! 
                    playCompanionChime(true);
                }
            }

            // Rampage & Interaction Timers
            if (companion.userData.rampage && companion.userData.rampage > 0) {
                companion.userData.isAssisting = true; // Act purely hostile
                if (companion.userData.rampageTargets <= 0 && (!companion.userData.targetObject || companion.userData.targetObject.userData.dead)) {
                    companion.userData.rampage = 0; // Terminate Rampage gracefully automatically
                    companion.userData.isAssisting = false;
                }
            }

            if (companion.userData.attention && companion.userData.attention > 0 && (!companion.userData.isAssisting || companion.userData.rampage > 0) && !companion.userData.preRampage) {
                companion.userData.attention--;
                if (!companion.userData.rampage) companion.userData.targetObject = null;
            }

            // AI Decision Matrix: Scan for playthings
            const clearTarget = () => {
                companion.userData.targetObject = null;
                if (companion.userData.rampage > 0) companion.userData.checkUp = 180; // 3s Narrative fly-back pause
                companion.userData.targetTimer = 0;
            };

            if (!companion.userData.targetObject || companion.userData.targetObject.userData.dead) {
                const scanFreq = companion.userData.rampage > 0 ? 10 : 90; // Scan aggressively while in rampage

                if (!isAnchored && !companion.userData.isAngry && frameCount % scanFreq === 0 && !companion.userData.preRampage && (!companion.userData.checkUp || companion.userData.checkUp <= 0)) {
                    if (!companion.userData.rampage) {
                        companion.userData.targetObject = null;
                        companion.userData.isAssisting = false;
                        companion.userData.activeMove = null;
                    }

                    let nearby = objects.filter(o => {
                        if (o === companion || o.userData.isSingularity || o.userData.isWhiteHole || o.userData.isMonument || o.userData.dead) return false;
                        let dir = o.position.clone().sub(camera.position).normalize();
                        return dir.dot(forwardVector) > 0.4; // Exclusively hunts objects strictly visually in front of camera
                    });

                    if (!companion.userData.rampage) {
                        nearby = nearby.filter(o => o.position.distanceToSquared(camera.position) < 2500); // Tighter ambient bounds near player
                    } else {
                        nearby = nearby.filter(o => o.position.distanceToSquared(companion.position) < 900); // Lethal precision targeting bounds in rampage
                    }
                    if (nearby.length > 0) {
                        companion.userData.targetObject = nearby[Math.floor(Math.random() * nearby.length)];
                        companion.userData.isAssisting = true; // Unlock all 5 combat powers casually!
                        if (companion.userData.rampage > 0) companion.userData.rampageTargets--;

                        const moves = ['repulse', 'absorb', 'stun', 'combo', 'destroy'];
                        companion.userData.activeMove = moves[Math.floor(Math.random() * moves.length)];
                        if (companion.userData.activeMove === 'combo') companion.userData.comboHits = 0;
                    }
                }
            } else {
                // Drop unbreakable targets organically without locking up natively
                companion.userData.targetTimer = (companion.userData.targetTimer || 0) + 1;
                if (companion.userData.targetTimer > 400) clearTarget();
            }

            let hoverTarget;
            // Curiosity / Pre-Rampage Overrides
            if (companion.userData.danceTimer && companion.userData.danceTimer > 0) {
                companion.userData.danceTimer--;
                companion.rotation.x += 0.2; companion.rotation.y += 0.3; companion.rotation.z += 0.1;
                hoverTarget = camera.position.clone()
                    .addScaledVector(forwardVector, 10)
                    .add(new THREE.Vector3(Math.sin(compTime * 5) * 5, Math.cos(compTime * 5) * 5, 0));

                if (companion.userData.danceTimer % 10 === 0 && companion.userData.orbitalRings) {
                    const c = getRandomPastel();
                    companion.userData.orbitalRings.forEach(ring => ring.material.color.set(c));
                    companion.material.emissive.set(c);
                }
            } else if (companion.userData.checkUp && companion.userData.checkUp > 0) {
                companion.userData.checkUp--;
                hoverTarget = camera.position.clone()
                    .addScaledVector(forwardVector, 6)
                    .addScaledVector(rightVector, Math.sin(compTime * 2.0) * 2)
                    .add(new THREE.Vector3(0, Math.cos(compTime * 1.5) * 1, 0));
                if (companion.userData.checkUp === 1) playCompanionChime(true);
            } else if (companion.userData.attention && companion.userData.attention > 0 && (!companion.userData.isAssisting || companion.userData.activeMove === 'absorb' || companion.userData.preRampage > 0)) {
                hoverTarget = companion.userData.targetObject ? companion.userData.targetObject.position.clone() : camera.position.clone()
                    .addScaledVector(forwardVector, 6)
                    .addScaledVector(rightVector, Math.sin(compTime * 2.0) * 2)
                    .add(new THREE.Vector3(0, Math.cos(compTime * 1.5) * 1, 0));
            } else if (isAnchored || companion.userData.isAngry) {
                if (!companion.userData.isAssisting && !companion.userData.rampage) companion.userData.targetObject = null;
                hoverTarget = camera.position.clone()
                    .addScaledVector(forwardVector, 12)
                    .addScaledVector(rightVector, Math.sin(compTime * 1.2) * 5)
                    .add(new THREE.Vector3(0, Math.cos(compTime * 0.9) * 2, 0));
                if (!companion.userData.isAngry && frameCount % 60 === 0 && Math.random() < 0.4) playCompanionChime(true); // Occasional supplementary chime
            } else if (companion.userData.targetObject) { // Intercept & Interact Phase
                hoverTarget = companion.userData.targetObject.position.clone();
                // Dynamic HitBox: Expand detection bounds dynamically scaling with physical speed to prevent lightspeed overshoot!
                if (companion.position.distanceToSquared(hoverTarget) < (144 + companion.userData.velocity.lengthSq())) {
                    // Tactical Interaction Execution
                    if (companion.userData.isAssisting || companion.userData.rampage > 0) {
                        const move = companion.userData.activeMove;
                        const toy = companion.userData.targetObject;

                        if (move === 'absorb') {
                            if (!toy.userData.combatLock) {
                                toy.userData.combatLock = true;
                                showEmote('🕳️'); playCompanionChime(true);
                                gsap.to(toy.scale, {
                                    x: 0.1, y: 0.1, z: 0.1, duration: 1.2, onComplete: () => {
                                        toy.userData.dead = true;
                                        clearTarget();
                                    }
                                });
                            }
                        } else if (move === 'stun') {
                            if (!toy.userData.combatLock) {
                                toy.userData.combatLock = true;
                                showEmote('⚡'); playCompanionChime();
                                toy.userData.velocity.set(0, 0, 0);
                                toy.userData.rotSpeed.set(0, 0, 0);
                                toy.userData.mass = 0.001;
                                if (toy.material && toy.material.color) gsap.to(toy.material.color, { r: 0, g: 1, b: 1, duration: 0.5, yoyo: true, repeat: 3 });
                                setTimeout(() => { clearTarget(); }, 500); // Leave shape alive natively but paralyzed!
                            }
                        } else if (move === 'repulse') {
                            if (!toy.userData.combatLock) {
                                toy.userData.combatLock = true;
                                showEmote('💨'); createShockwave(companion.position, 25, 0.3);
                                let pushDir = toy.position.clone().sub(companion.position).normalize();
                                toy.userData.velocity.addScaledVector(pushDir, 2.5);
                                setTimeout(() => { clearTarget(); }, 100);
                            }
                        } else if (move === 'combo') {
                            if (!companion.userData.comboDelay || companion.userData.comboDelay <= 0) {
                                companion.userData.comboHits++;
                                companion.userData.comboDelay = 15; // Mandatory 1/4th second dramatic freeze-frame pause between rapid bounces
                                showEmote('🥊'); playCompanionChime(true);

                                let bounceDir = companion.position.clone().sub(toy.position).normalize();
                                companion.userData.velocity.addScaledVector(bounceDir, 1.5);
                                toy.userData.velocity.addScaledVector(bounceDir, -0.3);

                                if (companion.userData.comboHits >= 3) {
                                    createShockwave(companion.position, 50, 0.6);
                                    for (let k = 0; k < 6; k++) {
                                        const d = spawnObject(false, companion.position, 'bloom');
                                        d.userData.velocity.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(0.7);
                                    }
                                    toy.userData.dead = true; clearTarget(); playDevourSound();
                                }
                            } else {
                                companion.userData.comboDelay--;
                                companion.userData.velocity.multiplyScalar(0.5); // Air-freeze tension
                            }
                        } else { // Standard Destroy
                            createShockwave(companion.position, 50, 0.6);
                            for (let k = 0; k < 6; k++) {
                                const d = spawnObject(false, companion.position, 'bloom');
                                d.userData.velocity.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(0.5);
                            }
                            toy.userData.dead = true; clearTarget();
                            playDevourSound(); showEmote('💥');
                        }
                    } else {
                        // Ambient playful pokes
                        playCompanionChime(true);
                        createShockwave(companion.position, 25, 0.4);
                        if (Math.random() < 0.3) showEmote('🌀');

                        const toy = companion.userData.targetObject;
                        toy.userData.velocity.add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(0.8));
                        toy.userData.rotSpeed.set(rand(-0.2, 0.2), rand(-0.2, 0.2), rand(-0.2, 0.2));

                        if (toy.material && toy.material.color && toy.material !== materials) {
                            gsap.to(toy.material.color, { r: 1.5, g: 1.5, b: 1.5, duration: 0.1, yoyo: true, repeat: 1 });
                        }
                        companion.userData.targetObject = null;
                    }
                    if (!companion.userData.rampage && !companion.userData.targetObject) companion.userData.isAssisting = false;
                }
            } else {
                // ─── AUTONOMOUS WANDER MODE ───
                // Pick a new world-space wander target periodically (every 8-15 seconds)
                if (!companion.userData.wanderTarget ||
                    (!companion.userData.attention && frameCount % Math.floor(rand(480, 900)) === 0)) {
                    // Explore: drift 80-150 units from current position in any direction
                    // Explore: stay in front of camera
                    const wanderDist = rand(40, 100);  // closer than before
                    const angleYaw = rand(-Math.PI / 3, Math.PI / 3);  // ±60° horizontally
                    const anglePitch = rand(-Math.PI / 6, Math.PI / 6);  // ±30° vertically
                    const worldDir = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(anglePitch, angleYaw, 0));
                    worldDir.applyQuaternion(camera.quaternion);
                    companion.userData.wanderTarget = camera.position.clone().add(worldDir.multiplyScalar(wanderDist));
                }
                // Occasionally come back to say hi
                if (!companion.userData.checkUp && frameCount % 900 === 0 && Math.random() < 0.4) {
                    companion.userData.checkUp = 120;
                }

                if (companion.userData.attention > 0) {
                    // Attentive: gentle figure‑8 in front of camera
                    const side = Math.sin(compTime * 0.4) * 4;
                    const up = Math.cos(compTime * 0.6) * 2;
                    hoverTarget = camera.position.clone()
                        .addScaledVector(forwardVector, 12)
                        .addScaledVector(rightVector, side)
                        .add(new THREE.Vector3(0, up, 0));
                } else {
                    // Pure exploration: drift to wander target
                    hoverTarget = companion.userData.wanderTarget;
                }

                // Organic twirls when bored (very rare)
                if (frameCount % 900 === 0 && Math.random() < 0.2 && !isAnchored) {
                    triggerJoy();
                }
            }

            // Speed & thrust per mode
            const isInCombat = !!companion.userData.targetObject;
            const isAttentive = companion.userData.attention > 0;
            const speedThrust = isInCombat ? 0.06 : isAttentive ? 0.008 : 0.004;
            const maxSpeed = isInCombat ? 0.55 : isAttentive ? 0.22 : 0.12;
            const frictionMod = isInCombat ? 0.90 : 0.94;

            const steerDir = new THREE.Vector3().subVectors(hoverTarget, companion.position);
            const sqD = steerDir.lengthSq();
            steerDir.normalize();

            companion.userData.velocity.addScaledVector(steerDir, speedThrust + sqD * (isInCombat ? 0.0002 : 0.00005));
            companion.userData.velocity.multiplyScalar(frictionMod);
            // Clamp speed to mode maximum
            const spd = companion.userData.velocity.length();
            if (spd > maxSpeed) companion.userData.velocity.multiplyScalar(maxSpeed / spd);

            // Trail: only visible when moving with some speed
            if (frameCount % 2 === 0) {
                companionTrail.push(companion.position.clone());
                companionTrail.shift();
                companionTrailLine.geometry.setFromPoints(companionTrail);
            }
            const trailSpeed = companion.userData.velocity.length();
            companionTrailLine.material.opacity = Math.min(0.35, trailSpeed * 2.5);

            // The Breathing Void: dynamically shift the scale of space organically over long periods
            const targetFog = 450 + (Math.sin(frameCount * 0.0015) * 150) + (Math.sin(frameCount * 0.0004) * 200);
            const minFog = 280;   // never closer than 280 units
            const clampedTarget = Math.max(minFog, targetFog);
            scene.fog.far += (clampedTarget - scene.fog.far) * 0.01;

            if (frameCount % 60 === 0) {
                const tempColor = getRandomPastel();
                gsap.to(companion.material.emissive, {
                    r: tempColor.r * 0.3, g: tempColor.g * 0.3, b: tempColor.b * 0.3, duration: 4
                });
            }
        }

        let closestHeavyDist = Infinity;
        let heaviestPos = new THREE.Vector3();
        let numPoints = 0;
        let uGravityArray = customPass ? customPass.uniforms.u_gravityPoints.value : null;

        // Ecosystem Current: a slowly rotating global force field
        const currentAngle = frameCount * 0.0003;
        const currentDir = new THREE.Vector3(Math.cos(currentAngle), Math.sin(currentAngle * 0.4), Math.sin(currentAngle));

        // Anti-gravity schooling: compute centroid every 30 frames
        let antiGravCentroid = null;
        if (frameCount % 30 === 0) {
            let agCount = 0; let agX = 0; let agY = 0; let agZ = 0;
            for (let k = 0; k < objects.length; k++) {
                const o = objects[k];
                if (o.userData.isAntiGravity && !o.userData.dead) {
                    agX += o.position.x; agY += o.position.y; agZ += o.position.z;
                    agCount++;
                }
            }
            if (agCount > 1) antiGravCentroid = new THREE.Vector3(agX / agCount, agY / agCount, agZ / agCount);
        }
        // Store centroid persistently across frames
        if (antiGravCentroid) companion && (companion.userData._agCentroid = antiGravCentroid);
        const agCentroid = companion && companion.userData._agCentroid;

        for (let i = objects.length - 1; i >= 0; i--) {
            const objA = objects[i];
            if (objA.userData.interacted || objA.userData.dead) continue;

            const posA = objA.position;
            const velA = objA.userData.velocity;

            if (objA.userData.isSingularity || objA.userData.isWhiteHole) velA.set(0, 0, 0);

            // Per-shape autonomous breath – unique sinusoidal drift from wanderSeed
            if (!objA.userData.isMonument && !objA.userData.isSingularity && !objA.userData.isWhiteHole && !objA.userData.isCompanion) {
                const ws = objA.userData.wanderSeed || 0;
                // Very gentle sinusoidal force, unique per shape, creates life-like drift
                velA.x += Math.sin(frameCount * 0.007 + ws) * 0.00035;
                velA.y += Math.cos(frameCount * 0.009 + ws * 1.3) * 0.00025;
                velA.z += Math.sin(frameCount * 0.006 + ws * 0.7) * 0.00030;
                // Ecosystem current (very faint)
                velA.addScaledVector(currentDir, 0.00012);
            }

            // Anti-gravity schooling cohesion (monochrome – no emissive added)
            if (objA.userData.isAntiGravity && !objA.userData.dead) {
                if (agCentroid) {
                    const toCenter = new THREE.Vector3().subVectors(agCentroid, posA);
                    const schoolDist = toCenter.length();
                    if (schoolDist > 2 && schoolDist < 50) {
                        velA.addScaledVector(toCenter.normalize(), 0.0008);
                    }
                }
            }

            if (isAnchored) {
                const distToCamSq = posA.distanceToSquared(camera.position);
                if (distToCamSq > 10 && distToCamSq < FOG_FAR * FOG_FAR) {
                    velA.addScaledVector(posA.clone().sub(camera.position).normalize(), -0.02 / Math.sqrt(distToCamSq));
                }
            }

            // Audio Proximity Check (Ocean Rumble)
            if (Math.abs(objA.userData.mass) > 10 || objA.userData.isSingularity) {
                const d = posA.distanceTo(camera.position);
                if (d < closestHeavyDist) {
                    closestHeavyDist = d;
                    heaviestPos.copy(posA);
                }
            }

            // EXCLUSIVE Light Warping (Only singularities warp light!)
            if (objA.userData.isSingularity) {
                screenPos.copy(posA);
                screenPos.project(camera);
                if (screenPos.z < 1 && numPoints < 10 && uGravityArray) {
                    uGravityArray[numPoints].set((screenPos.x * 0.5 + 0.5), (screenPos.y * 0.5 + 0.5), 60);
                    numPoints++;
                }
            }

            // Accretion Disk Rotation
            if ((objA.userData.isSingularity || objA.userData.isWhiteHole) && objA.userData.accDisk) {
                objA.userData.accDisk.rotation.z += (objA.userData.isWhiteHole ? -0.04 : 0.02);
            }

            // White Hole spitting & violent continuous fan repulsion
            if (objA.userData.isWhiteHole) {
                if (frameCount % 45 === 0) {
                    const popDir = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
                    const edgePos = objA.position.clone().addScaledVector(popDir, objA.userData.radius + 1.0);
                    const spitObj = spawnObject(false, edgePos, 'spit');
                    spitObj.userData.velocity.copy(popDir.multiplyScalar(0.2));
                }

                // Active severe repulsion engine blasting objects outwards
                for (let k = 0; k < objects.length; k++) {
                    const vTarg = objects[k];
                    if (vTarg === objA || vTarg.userData.isSingularity || vTarg.userData.isMonument) continue;
                    let wDif = new THREE.Vector3().subVectors(vTarg.position, objA.position);
                    let wDistSq = wDif.lengthSq();
                    if (wDistSq < 4000 && wDistSq > 0.1) { // Massive blast radius area
                        vTarg.userData.velocity.addScaledVector(wDif.normalize(), 0.08); // Brutal hard push overriding gravity entirely
                    }
                }
            }

            // Extreme Vacuum Horizon for Black Holes (so they still devour physically despite having 0 mass)
            if (objA.userData.isSingularity) {
                for (let k = 0; k < objects.length; k++) {
                    const vTarg = objects[k];
                    if (vTarg === objA || vTarg.userData.isSingularity || vTarg.userData.isMonument) continue;
                    let wDif = new THREE.Vector3().subVectors(objA.position, vTarg.position); // towards hole
                    let wDistSq = wDif.lengthSq();
                    if (wDistSq < 4000 && wDistSq > 0.1) {
                        vTarg.userData.velocity.addScaledVector(wDif.normalize(), 0.06); // Extreme absolute sucking trajectory
                    }
                }
            }

            // Morphology & Evolutions
            if (objA.userData.isLonely) {
                objA.userData.lonelyFrames = (objA.userData.lonelyFrames || 0) + 1;
                if (objA.userData.lonelyFrames >= 3000) {
                    createShockwave(objA.position, 120, 2.0);
                    objA.userData.isLonely = false;
                    objA.userData.isSingularity = true;
                    objA.userData.life = 1200;
                    objA.scale.set(6, 6, 6);
                    objA.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
                }
                const glow = Math.sin(frameCount * 0.05) * 0.5 + 0.5;
                if (objA.material && objA.material.emissive) objA.material.emissive.setRGB(glow, glow, glow);
            }

            if (objA.userData.isComet && frameCount % 3 === 0) {
                const trailDot = spawnObject(false, objA.position, 'bloom');
                trailDot.scale.set(0.1, 0.1, 0.1);
                trailDot.userData.velocity.copy(objA.userData.velocity.clone().multiplyScalar(0.01));
                gsap.to(trailDot.scale, { x: 0, y: 0, z: 0, duration: 1.0, onComplete: () => disposeShape(trailDot) });
            }

            // Cosmic Event Collapse
            if (objA.userData.life > 0) {
                objA.userData.life--;
                if (objA.userData.life < 100) {
                    objA.scale.multiplyScalar(0.95);
                    if (objA.userData.life === 1) objA.userData.dead = true;
                }
            }

            // Compute effective mass based on gravity personality
            function getEffectiveMass(obj) {
                let m = obj.userData.mass;
                if (obj.userData.gravityPersonality === 'attractor') m *= 2.5;
                else if (obj.userData.gravityPersonality === 'repulsor') m = -Math.abs(m) * 1.8;
                else if (obj.userData.gravityPersonality === 'drifter') m *= 0.2;
                else if (obj.userData.gravityPersonality === 'massive') m *= 2.0;
                return m;
            }

            for (let j = i - 1; j >= 0; j--) {
                const objB = objects[j];
                if (objB.userData.interacted || objB.userData.dead) continue;

                diff.subVectors(objB.position, posA);
                const distSq = diff.lengthSq();
                const rSum = objA.userData.radius + objB.userData.radius;

                // Exert Gravity (only when objects are not overlapping)
                if (distSq > Math.max(1, rSum * rSum)) {
                    const force = G / (distSq + (rSum * rSum * 0.5));
                    diff.normalize();
                    const effMassA = getEffectiveMass(objA);
                    const effMassB = getEffectiveMass(objB);
                    if (!objA.userData.isMonument && !objA.userData.isComet)
                        velA.addScaledVector(diff, force * effMassB);
                    if (!objB.userData.isMonument && !objB.userData.isComet)
                        objB.userData.velocity.addScaledVector(diff, -force * effMassA);
                }
                else if (distSq < rSum * rSum && distSq > 0) {
                    // Collision / overlap handling (keep your existing code here)
                    const dist = Math.sqrt(distSq);
                    diff.normalize();
                    const overlap = rSum - dist;

                    // position correction
                    if (!objA.userData.isSingularity && !objA.userData.isWhiteHole && !objA.userData.isMonument)
                        posA.addScaledVector(diff, -overlap * 0.4);
                    if (!objB.userData.isSingularity && !objB.userData.isWhiteHole && !objB.userData.isMonument)
                        objB.position.addScaledVector(diff, overlap * 0.4);

                    // devouring by black holes
                    if (objA.userData.isSingularity && !objB.userData.isSingularity && !objB.userData.isMonument && !objB.userData.isCompanion) {
                        playDevourSound(); objB.userData.dead = true; continue;
                    } else if (objB.userData.isSingularity && !objA.userData.isSingularity && !objA.userData.isMonument && !objA.userData.isCompanion) {
                        playDevourSound(); objA.userData.dead = true; continue;
                    }

                    // bounce and slip forces (keep your existing code)
                    let bounce = 0.05;
                    let totalMass = Math.abs(objA.userData.mass) + Math.abs(objB.userData.mass);
                    let massRatioA = Math.abs(objB.userData.mass) / totalMass;
                    let massRatioB = Math.abs(objA.userData.mass) / totalMass;

                    if (!objA.userData.isMonument) velA.addScaledVector(diff, -bounce * massRatioA);
                    if (!objB.userData.isMonument) objB.userData.velocity.addScaledVector(diff, bounce * massRatioB);

                    const up = new THREE.Vector3(0, 1, 0);
                    const slipDir = new THREE.Vector3().crossVectors(diff, up).normalize();
                    const slipStr = overlap * 0.03 * (Math.random() > 0.5 ? 1 : -1);
                    if (!objA.userData.isMonument) velA.addScaledVector(slipDir, slipStr);
                    if (!objB.userData.isMonument) objB.userData.velocity.addScaledVector(slipDir, -slipStr);

                    p_heavy = clampProb(p_heavy + 0.0001);
                }

            }

            if (!objA.userData.isMonument) {
                velA.multiplyScalar(objA.userData.isComet ? 0.999 : 0.995);
                posA.add(velA);
            }

            objA.rotation.x += objA.userData.rotSpeed.x; objA.rotation.y += objA.userData.rotSpeed.y; objA.rotation.z += objA.userData.rotSpeed.z;

            // Proper bounds culling safety checks removing array splice loops
            if (posA.distanceToSquared(camera.position) > FOG_FAR * FOG_FAR * 1.5) {
                if (!objA.userData.isLonely && !objA.userData.isBloomDot && !objA.userData.isCompanion) {
                    objA.userData.dead = true; objA.userData.respawn = true;
                } else if (objA.userData.isLonely || objA.userData.isBloomDot) {
                    objA.userData.dead = true;
                }
            }
        }

        // Clean up devours from the physics iterations carefully to avoid array skips
        for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i].userData.dead) {
                // If it wasn't an event collapsing naturally, we replace the consumed standard geometry
                if (objects[i].userData.life === -1 || objects[i].userData.respawn) spawnObject(false);
                disposeShape(objects[i]);
            }
        }

        if (customPass) {
            customPass.uniforms.u_numPoints.value = numPoints;
            composer.render();
        } else {
            renderer.render(scene, camera);
        }

        // Spatial Audio Engine Listener Tracking
        if (audioCtx) {
            const listener = audioCtx.listener;
            if (listener.positionX) {
                listener.positionX.value = camera.position.x;
                listener.positionY.value = camera.position.y;
                listener.positionZ.value = camera.position.z;
                listener.forwardX.value = forwardVector.x;
                listener.forwardY.value = forwardVector.y;
                listener.forwardZ.value = forwardVector.z;
            } else if (listener.setPosition) {
                listener.setPosition(camera.position.x, camera.position.y, camera.position.z);
                listener.setOrientation(forwardVector.x, forwardVector.y, forwardVector.z, 0, 1, 0);
            }
        }

        // Ocean sub rumble proximity logic
        if (proximityGain && audioCtx.state === 'running') {
            if (isAnchored) {
                proximityOsc.frequency.linearRampToValueAtTime(55, audioCtx.currentTime + 0.1);
                proximityGain.gain.linearRampToValueAtTime(0.45, audioCtx.currentTime + 0.1);
            } else if (closestHeavyDist < 60) {
                const vol = 1.0 - (closestHeavyDist / 60);
                proximityOsc.frequency.linearRampToValueAtTime(40 + (vol * 15), audioCtx.currentTime + 0.5);
                proximityGain.gain.linearRampToValueAtTime(vol * 0.6, audioCtx.currentTime + 0.5);

                if (proximityPanner) {
                    if (proximityPanner.positionX) {
                        proximityPanner.positionX.setTargetAtTime(heaviestPos.x, audioCtx.currentTime, 0.1);
                        proximityPanner.positionY.setTargetAtTime(heaviestPos.y, audioCtx.currentTime, 0.1);
                        proximityPanner.positionZ.setTargetAtTime(heaviestPos.z, audioCtx.currentTime, 0.1);
                    } else if (proximityPanner.setPosition) {
                        proximityPanner.setPosition(heaviestPos.x, heaviestPos.y, heaviestPos.z);
                    }
                }
            } else {
                proximityGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
            }
        }
    }
    animate();
});