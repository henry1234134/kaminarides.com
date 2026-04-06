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
    
    document.addEventListener('mousemove', (e) => {
        isMouseActive = true;
        cursorDot.style.left = e.clientX + 'px';
        cursorDot.style.top = e.clientY + 'px';
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
    let p_heavy = 0.025; 
    let p_anti = 0.08; 
    function clampProb(val) { return Math.max(0.001, Math.min(0.3, val)); }

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
    let proximityOsc, proximityGain;
    
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            
            proximityOsc = audioCtx.createOscillator();
            proximityGain = audioCtx.createGain();
            proximityOsc.type = 'sine';
            proximityOsc.frequency.value = 40; // Deep ocean sub rumble
            proximityGain.gain.value = 0;
            
            proximityOsc.connect(proximityGain);
            proximityGain.connect(audioCtx.destination);
            proximityOsc.start();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
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
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (isSingularity ? 3.0 : 0.8));
        
        osc.start();
        osc.stop(audioCtx.currentTime + (isSingularity ? 3.0 : 0.8));
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

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 1.2);
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
        
        gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
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
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 4);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 4);
    }

    function playCompanionChime(isMini = false) {
        if (!audioCtx) return;
        const numBeeps = isMini ? Math.floor(rand(1, 3)) : Math.floor(rand(4, 7));
        for (let i = 0; i < numBeeps; i++) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            const startStr = audioCtx.currentTime + (i * 0.12);
            osc.type = Math.random() > 0.4 ? 'sine' : 'square';
            const f1 = rand(600, 2000);
            const f2 = rand(400, 2500);
            
            osc.frequency.setValueAtTime(f1, startStr);
            osc.frequency.exponentialRampToValueAtTime(f2, startStr + 0.08); // swooping bleep
            
            gain.gain.setValueAtTime(0, startStr);
            gain.gain.linearRampToValueAtTime(osc.type === 'square' ? 0.04 : 0.1, startStr + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startStr + 0.1);
            
            osc.start(startStr);
            osc.stop(startStr + 0.12);
        }
    }

    // Core Three.js Setup
    const scene = new THREE.Scene();
    const fogColor = new THREE.Color(0xfafafa);
    scene.background = fogColor; 
    
    const FOG_FAR = 800;
    scene.fog = new THREE.Fog(fogColor, 150, FOG_FAR);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2500);
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
                "u_gravityPoints": { value: [
                    new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(),
                    new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
                ] },
                "u_numPoints": { value: 0 }
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
                varying vec2 vUv;

                void main() {
                    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
                    vec2 uv = vUv;
                    vec2 warp = vec2(0.0);
                    
                    for(int i = 0; i < 10; i++) {
                        if (i >= u_numPoints) break;
                        vec2 pos = u_gravityPoints[i].xy;
                        float mass = u_gravityPoints[i].z;
                        
                        vec2 dir = (uv - pos) * aspect;
                        float dist = length(dir);
                        
                        if (dist > 0.001 && dist < 0.5) {
                            // Visibly intensified gravitational lensing to explicitly warp space around heavy clusters
                            float str = (mass * 0.005) / (dist * dist + 0.05);
                            vec2 safeDir = dir / dist; // NaN safe
                            warp -= safeDir * str * 0.008 * clamp(1.0 - (dist * 2.0), 0.0, 1.0);
                        }
                    }
                    
                    // Clamp UVs to prevent extreme edge tearing
                    vec2 finalUv = clamp(uv + warp, 0.001, 0.999);
                    gl_FragColor = texture2D(tDiffuse, finalUv);
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
    for(let i=0; i<40; i++) trailPoints.push(new THREE.Vector3(0,-0.5,0));
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
    const G = 0.015; // Increased global gravity for stronger orbits
    
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
        
        const compLight = new THREE.PointLight(0xffffff, 15.0, 30);
        companion.add(compLight);
        
        const coreGeo = new THREE.IcosahedronGeometry(0.81, 1);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent:true, opacity:0.3 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        companion.add(core);

        companion.position.set(0, 0, -20);
        
        for(let i=0; i<30; i++) companionTrail.push(companion.position.clone());
        const trailMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.6 });
        const trailGeo = new THREE.BufferGeometry().setFromPoints(companionTrail);
        companionTrailLine = new THREE.Line(trailGeo, trailMat);
        scene.add(companionTrailLine);

        companion.userData = {
            velocity: new THREE.Vector3(), rotSpeed: new THREE.Vector3(0.02, 0.03, 0.01),
            radius: 1.0, mass: 8.0, 
            isCompanion: true, isMonument: false, isSingularity: false, isWhiteHole: false, isComet: false,
            interacted: false, life: -1
        };
        
        scene.add(companion);
        objects.push(companion); 
    }
    
    let yaw = 0; let pitch = 0;
    const rand = (min, max) => Math.random() * (max - min) + min;

    // Disposes all data absolutely cleanly to prevent WebGL memory leaks
    function disposeShape(mesh) {
        scene.remove(mesh);
        const idx = objects.indexOf(mesh);
        if (idx > -1) objects.splice(idx, 1);
        
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material && !materials.includes(mesh.material)) mesh.material.dispose();
        
        mesh.children.forEach(c => {
            if(c.geometry) c.geometry.dispose();
            if(c.material) c.material.dispose();
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
            } else if (roll > (1.0 - (p_heavy/2))) {
                isRare = true;
                mat = new THREE.MeshPhongMaterial({ color: getRandomPastel(), flatShading: true });
            } else if (roll > (1.0 - p_anti)) {
                isAntiGravity = true;
                if (Math.random() > 0.7) geoPool = complexGeometries;
                mat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.5 });
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
        
        let mass = isMonument ? s * 3 : s;
        mass *= rand(0.5, 1.5); 
        
        if (isAntiGravity || isBloomDot) mass = -mass * 5;
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
                if(child.isMesh && child.material) {
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
            
            const eventPos = camera.position.clone()
                .addScaledVector(forwardVector, rand(300, 500)) // Spawn deep in the expanded mist
                .addScaledVector(sideOffset, polarity * rand(35, 75)) // scale lateral offset to match
                .add(new THREE.Vector3(0, rand(-15, 15), 0));
            mesh.position.copy(eventPos);
        } else {
            const dist = initialSpawn ? rand(10, FOG_FAR * 1.05) : FOG_FAR * 1.05 + rand(0, 10);
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
            isRare: isRare, isMonument: isMonument, isAntiGravity: isAntiGravity,
            isSingularity: isSingularity, isWhiteHole: isWhiteHole, isBloomDot: isBloomDot,
            isComet: isComet, isLonely: isLonely, interacted: false,
            life: (isSingularity || isWhiteHole) ? 1200 : -1 // 20 sec lifespan
        };

        if (isMonument || isSingularity || isWhiteHole) mesh.userData.velocity.set(0,0,0);
        return mesh;
    }

    function getRandomPastel() {
        const hue = Math.floor(Math.random() * 360);
        return new THREE.Color(`hsl(${hue}, 80%, 75%)`);
    }

    function setTargetObjectCount() {
        let target = 0;
        if (trafficPhase === "empty") target = 8;
        else if (trafficPhase === "medium") target = 35;
        else target = 70;
        
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
    
    document.addEventListener('contextmenu', e => { 
        e.preventDefault(); 
        isAnchored = true; 
        initAudio(); // Ensure Engine wakes on Right-Click directly
        cursorDot.classList.add('active', 'anchored'); 
    });
    document.addEventListener('mouseup', e => { if(e.button === 2) { isAnchored = false; cursorDot.classList.remove('active', 'anchored'); }});

    const onTouchDown = (e) => {
        if(e.button === 2) return;
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

        yaw -= deltaX * 0.005; pitch -= deltaY * 0.005;
        pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, pitch));
        previousMousePosition = { x, y };
    };

    const onTouchUp = (e) => { 
        if(e.button === 2) return;
        isDragging = false; 
        cursorDot.classList.remove('active');
        if (maxDragDist < 5) onInteract(e);
    };

    document.addEventListener('mousedown', onTouchDown); document.addEventListener('mousemove', onTouchMove); document.addEventListener('mouseup', onTouchUp);
    document.addEventListener('touchstart', onTouchDown, {passive: true}); document.addEventListener('touchmove', onTouchMove, {passive: true}); document.addEventListener('touchend', onTouchUp);

    function createShockwave(position, blastRadius, forceStr) {
        const ringGeo = new THREE.RingGeometry(0.1, 1, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(position); ring.lookAt(camera.position); scene.add(ring);

        gsap.to(ring.scale, { x: blastRadius*1.5, y: blastRadius*1.5, duration: 1.5, ease: 'power2.out' });
        gsap.to(ringMat, { opacity: 0, duration: 1.5, onComplete: () => { scene.remove(ring); ringGeo.dispose(); ringMat.dispose(); } });

        objects.forEach(obj => {
            // Anti-gravity shapes drift smoothly instead of getting blasted out chaotically by shockwaves
            if (obj.userData.isMonument || obj.userData.isAntiGravity) return;
            const dist = obj.position.distanceTo(position);
            if (dist < blastRadius) {
                const pushDir = obj.position.clone().sub(position).normalize();
                const pushForce = forceStr * Math.pow(1 - dist/blastRadius, 2);
                obj.userData.velocity.addScaledVector(pushDir, pushForce);
            }
        });
    }



    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();

    function onInteract(e) {
        const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX; const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        pointer.x = (clientX / window.innerWidth) * 2 - 1; pointer.y = -(clientY / window.innerHeight) * 2 + 1;

        camera.rotation.set(0,0,0, 'YXZ');
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

                gsap.to(compCore.rotation, {
                    x: compCore.rotation.x + Math.PI*4, y: compCore.rotation.y + Math.PI*4, 
                    duration: 1.0, ease: "power2.out"
                });

                createShockwave(compCore.position, 60, 0.6);
                
                for(let i=0; i<4; i++) {
                    const dot = spawnObject(false, compCore.position, 'bloom');
                    dot.userData.velocity.set(rand(-0.4,0.4), rand(-0.4,0.4), rand(-0.4,0.4));
                    gsap.to(dot.scale, { x: 0, y: 0, z: 0, duration: 4, delay: rand(0.5, 2), onComplete: () => disposeShape(dot) });
                }
                return;
            }

            // Systemic Evolution: clicking objects biases world to anti-gravity
            p_anti = clampProb(p_anti + 0.005); 

            playTone(hitObj.userData.radius, hitObj.userData.isRare, hitObj.userData.isSingularity);

            if (hitObj.userData.isRare) {
                rareCount++; if(rareCounterElement) { rareCounterElement.innerText = rareCount; hudContainer.classList.remove('hud-hidden'); resetHudTimer(); }
                // Pastel Bloom splits out
                for(let i=0; i<12; i++) {
                    const dot = spawnObject(false, hitObj.position, 'bloom');
                    dot.userData.velocity.set(rand(-0.3,0.3), rand(-0.3,0.3), rand(-0.3,0.3));
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
            
            gsap.to(hitObj.rotation, {
                x: hitObj.rotation.x + Math.PI*2, 
                y: hitObj.rotation.y + Math.PI*2, 
                duration: 0.3, ease: "power2.out"
            });

            gsap.to(hitObj.scale, {
                x: 0, y: 0, z: 0,
                duration: 0.3, ease: 'power2.in',
                onComplete: () => {
                    disposeShape(hitObj);
                    spawnObject(false); 
                }
            });
        }
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
        if(customPass) customPass.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    });

    const flightSpeed = 0.08; 
    const forwardVector = new THREE.Vector3(); const diff = new THREE.Vector3(); const screenPos = new THREE.Vector3();
    let frameCount = 0; 
    
    function animate() {
        requestAnimationFrame(animate);
        timeSinceLastClick += 1/60; 
        frameCount++;

        // Mood Cycling
        moodTimer++;
        if (mood === "calm" && moodTimer > nextCalmDuration) {
            mood = "spooky";
            moodTimer = 0;
            nextSpookyDuration = rand(300, 800);
        } else if (mood === "spooky") {
            if (moodTimer % 200 === 0) { 
                for(let i=0; i<3; i++) spawnObject(false);
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

        camera.rotation.set(0,0,0, 'YXZ');
        camera.rotateY(yaw); camera.rotateX(pitch);

        camera.getWorldDirection(forwardVector);
        
        if (!isAnchored) {
            camera.position.addScaledVector(forwardVector, flightSpeed);
        }

        if (frameCount % 3 === 0 && !isAnchored) {
            trailPoints.push(camera.position.clone().add(new THREE.Vector3(0,-1,0)));
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
            const rightVector = new THREE.Vector3().crossVectors(forwardVector, new THREE.Vector3(0,1,0)).normalize();
            
            // Organic Idle Chirping
            if (frameCount % 300 === 0 && Math.random() < 0.4) {
                playCompanionChime(true);
            }

            if (companion.userData.attention && companion.userData.attention > 0) {
                companion.userData.attention--;
                companion.userData.targetObject = null;
            }

            // AI Decision Matrix: Scan for playthings
            if (!companion.userData.attention && (!companion.userData.targetObject || companion.userData.targetObject.userData.dead)) {
                companion.userData.targetObject = null;
                if (!isAnchored && frameCount % 90 === 0 && Math.random() < 0.6) {
                    let nearby = objects.filter(o => 
                        o !== companion && !o.userData.isSingularity && !o.userData.isMonument && 
                        o.position.distanceToSquared(companion.position) < 3000
                    );
                    if (nearby.length > 0) {
                        companion.userData.targetObject = nearby[Math.floor(Math.random() * nearby.length)];
                    }
                }
            }

            let hoverTarget;
            // Curiosity Overrides
            if (companion.userData.attention && companion.userData.attention > 0) {
                hoverTarget = camera.position.clone()
                    .addScaledVector(forwardVector, 6) 
                    .addScaledVector(rightVector, Math.sin(compTime * 2.0) * 2)
                    .add(new THREE.Vector3(0, Math.cos(compTime * 1.5) * 1, 0));
            } else if (isAnchored) {
                companion.userData.targetObject = null; 
                hoverTarget = camera.position.clone()
                    .addScaledVector(forwardVector, 12) 
                    .addScaledVector(rightVector, Math.sin(compTime * 1.2) * 5)
                    .add(new THREE.Vector3(0, Math.cos(compTime * 0.9) * 2, 0)); 
                if (frameCount % 80 === 0 && Math.random() < 0.4) playCompanionChime(true); 
            } else if (companion.userData.targetObject) { // Intercept & Interact Phase
                hoverTarget = companion.userData.targetObject.position.clone();
                if (companion.position.distanceToSquared(hoverTarget) < 25) {
                    // Interaction Execution
                    playCompanionChime(true);
                    createShockwave(companion.position, 25, 0.4);
                    
                    const toy = companion.userData.targetObject;
                    toy.userData.velocity.add(new THREE.Vector3(rand(-1,1),rand(-1,1),rand(-1,1)).normalize().multiplyScalar(0.8));
                    toy.userData.rotSpeed.set(rand(-0.2,0.2),rand(-0.2,0.2),rand(-0.2,0.2));
                    
                    if (toy.material && toy.material.color && toy.material !== materials) {
                         gsap.to(toy.material.color, { r: 1.5, g: 1.5, b: 1.5, duration: 0.1, yoyo: true, repeat: 1 });
                    }
                    companion.userData.targetObject = null; // Resume hovering
                }
            } else {
                // Default Formation Phase
                hoverTarget = camera.position.clone()
                    .addScaledVector(forwardVector, 25) 
                    .addScaledVector(rightVector, Math.sin(compTime * 0.4) * 12)
                    .add(new THREE.Vector3(0, Math.cos(compTime * 0.9) * 8, 0)); 
            }

            const steerDir = new THREE.Vector3().subVectors(hoverTarget, companion.position);
            const sqD = steerDir.lengthSq();
            steerDir.normalize();
            
            const speedThrust = companion.userData.targetObject ? 0.04 : 0.015;
            companion.userData.velocity.addScaledVector(steerDir, speedThrust + (sqD * 0.0001));
            companion.userData.velocity.multiplyScalar(0.92); // High friction curve

            if (frameCount % 2 === 0) {
                companionTrail.push(companion.position.clone());
                companionTrail.shift();
                companionTrailLine.geometry.setFromPoints(companionTrail);
            }
            
            if (frameCount % 600 === 0) {
                const tempColor = getRandomPastel();
                gsap.to(companion.material.emissive, {
                    r: tempColor.r * 0.3, g: tempColor.g * 0.3, b: tempColor.b * 0.3, duration: 4
                });
            }
        }

        let closestHeavyDist = Infinity;
        let numPoints = 0;
        let uGravityArray = customPass ? customPass.uniforms.u_gravityPoints.value : null;

        for (let i = objects.length - 1; i >= 0; i--) {
            const objA = objects[i];
            if (objA.userData.interacted) continue;

            const posA = objA.position;
            const velA = objA.userData.velocity;

            if (objA.userData.isSingularity || objA.userData.isWhiteHole) velA.set(0, 0, 0);

            if (isAnchored) {
                const distToCamSq = posA.distanceToSquared(camera.position);
                if (distToCamSq > 10 && distToCamSq < FOG_FAR*FOG_FAR) {
                    velA.addScaledVector(posA.clone().sub(camera.position).normalize(), -0.02 / Math.sqrt(distToCamSq));
                }
            }

            // Audio Proximity Check (Ocean Rumble)
            if (Math.abs(objA.userData.mass) > 10 || objA.userData.isSingularity) {
                const d = posA.distanceTo(camera.position);
                if (d < closestHeavyDist) closestHeavyDist = d;
            }

            // EXCLUSIVE Light Warping (Only singularities warp light!)
            if (objA.userData.isSingularity) {
                screenPos.copy(posA);
                screenPos.project(camera);
                if (screenPos.z < 1 && numPoints < 10 && uGravityArray) { 
                    uGravityArray[numPoints].set( (screenPos.x * 0.5 + 0.5), (screenPos.y * 0.5 + 0.5), 60 );
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
                    const popDir = new THREE.Vector3(rand(-1,1),rand(-1,1),rand(-1,1)).normalize();
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
            
            // Cosmic Event Collapse
            if (objA.userData.life > 0) {
                objA.userData.life--;
                if (objA.userData.life < 100) {
                    objA.scale.multiplyScalar(0.95);
                    if (objA.userData.life === 1) objA.userData.dead = true;
                }
            }

            for (let j = i - 1; j >= 0; j--) {
                const objB = objects[j];
                if (objB.userData.interacted) continue;

                diff.subVectors(objB.position, posA);
                const distSq = diff.lengthSq();
                const rSum = objA.userData.radius + objB.userData.radius;
                
                // Exert Gravity
                if (distSq > Math.max(1, rSum*rSum)) {
                    // Soften orbital gravity pulling (Comets ignore gravitational drag largely)
                    const force = G / (distSq + (rSum*rSum * 0.5)); 
                    diff.normalize();
                    if (!objA.userData.isMonument && !objA.userData.isComet) velA.addScaledVector(diff, force * objB.userData.mass);
                    if (!objB.userData.isMonument && !objB.userData.isComet) objB.userData.velocity.addScaledVector(diff, -force * objA.userData.mass);
                } else if (distSq < rSum * rSum && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    diff.normalize();
                    const overlap = rSum - dist;
                    
                    // Very soft overlap smoothing engine replacing strict violent wedges
                    if (!objA.userData.isSingularity && !objA.userData.isWhiteHole && !objA.userData.isMonument) {
                         posA.addScaledVector(diff, -overlap * 0.4);
                    }
                    if (!objB.userData.isSingularity && !objB.userData.isWhiteHole && !objB.userData.isMonument) {
                         objB.position.addScaledVector(diff, overlap * 0.4);
                    }

                    if (objA.userData.isSingularity && !objB.userData.isSingularity && !objB.userData.isMonument && !objB.userData.isCompanion) {
                        playDevourSound(); objB.userData.dead = true; continue;
                    } else if (objB.userData.isSingularity && !objA.userData.isSingularity && !objA.userData.isMonument && !objA.userData.isCompanion) {
                        playDevourSound(); objA.userData.dead = true; continue;
                    }

                    // Velvet smooth velocity sliding over ricochet bouncing
                    let bounce = 0.05;
                    let totalMass = Math.abs(objA.userData.mass) + Math.abs(objB.userData.mass);
                    let massRatioA = Math.abs(objB.userData.mass) / totalMass;
                    let massRatioB = Math.abs(objA.userData.mass) / totalMass;
                    
                    if (!objA.userData.isMonument) velA.addScaledVector(diff, -bounce * massRatioA);
                    if (!objB.userData.isMonument) objB.userData.velocity.addScaledVector(diff, bounce * massRatioB);

                // Systemic Evolution: Collisions cause more heavy shapes
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
                if(!objA.userData.isLonely && !objA.userData.isBloomDot && !objA.userData.isCompanion) {
                    objA.userData.dead = true; objA.userData.respawn = true;
                } else if(objA.userData.isLonely || objA.userData.isBloomDot) {
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

        // Ocean sub rumble proximity logic
        if (proximityGain && audioCtx.state === 'running') {
            if (isAnchored) {
                proximityOsc.frequency.setTargetAtTime(55, audioCtx.currentTime, 0.1); // Slightly higher pitch for standard speaker presence
                proximityGain.gain.setTargetAtTime(0.35, audioCtx.currentTime, 0.1); 
            } else if (closestHeavyDist < 60) {
                const vol = 1.0 - (closestHeavyDist / 60);
                proximityOsc.frequency.setTargetAtTime(40 + (vol * 15), audioCtx.currentTime, 0.5);
                proximityGain.gain.setTargetAtTime(vol * 0.25, audioCtx.currentTime, 0.5);
            } else {
                proximityGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
            }
        }
    }
    animate();
});
