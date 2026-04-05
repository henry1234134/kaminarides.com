document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    const counterElement = document.getElementById('object-counter');
    
    // Core Three.js Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfafafa); // Matches the --bg-color
    scene.fog = new THREE.FogExp2(0xfafafa, 0.02);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 25;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group to hold all our random shapes so we can rotate the entire group easily
    const shapesGroup = new THREE.Group();
    scene.add(shapesGroup);

    // Geometries & Materials library
    const geometries = [
        new THREE.IcosahedronGeometry(1.5, 0),
        new THREE.OctahedronGeometry(1.5, 0),
        new THREE.TetrahedronGeometry(1.5, 0),
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.TorusGeometry(1.2, 0.4, 8, 20)
    ];

    // Minimalist monochrome materials
    const materials = [
        new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true, transparent: true, opacity: 0.8 }),
        new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true, transparent: true, opacity: 0.4 }),
        new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true })
    ];

    // Lights for the Phong material
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    let objects = [];

    // Helper: Random float between min and max
    const rand = (min, max) => Math.random() * (max - min) + min;

    // Function to spawn N random shapes
    function spawnShapes(count) {
        for (let i = 0; i < count; i++) {
            const geo = geometries[Math.floor(Math.random() * geometries.length)];
            const mat = materials[Math.floor(Math.random() * materials.length)];
            
            const mesh = new THREE.Mesh(geo, mat);
            
            // Random position inside a spherical boundary
            const radius = rand(5, 30);
            const theta = rand(0, Math.PI * 2);
            const phi = Math.acos(rand(-1, 1));
            
            mesh.position.set(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
            );

            // Random initial rotation
            mesh.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));

            // Custom properties for animation (drift and rotation speed)
            mesh.userData = {
                rotSpeedX: rand(-0.01, 0.01),
                rotSpeedY: rand(-0.01, 0.01),
                rotSpeedZ: rand(-0.01, 0.01),
                driftX: rand(-0.02, 0.02),
                driftY: rand(-0.02, 0.02),
                driftZ: rand(-0.02, 0.02)
            };

            // Scale animation: pop in
            mesh.scale.set(0, 0, 0);
            gsap.to(mesh.scale, {
                x: 1, y: 1, z: 1,
                duration: rand(1, 2),
                ease: "elastic.out(1, 0.3)"
            });

            shapesGroup.add(mesh);
            objects.push(mesh);
        }
        updateCounter();
    }

    function updateCounter() {
        if(counterElement) counterElement.innerText = objects.length;
    }

    // Spawn initial cluster
    spawnShapes(30);

    // Interaction Variables
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    // Mouse Movement for parallax perspective
    document.addEventListener('mousemove', (event) => {
        // Normalized coordinates -1 to +1
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    // Keyboard Controls
    document.addEventListener('keydown', (event) => {
        const panSpeed = 0.5;
        
        if (event.code === 'Space') {
            event.preventDefault(); // Prevent scrolling
            spawnShapes(10); // Spawn 10 more
        }
        
        // Arrow keys rotate the entire group
        switch (event.code) {
            case 'ArrowUp':
                targetRotationX -= panSpeed;
                break;
            case 'ArrowDown':
                targetRotationX += panSpeed;
                break;
            case 'ArrowLeft':
                targetRotationY -= panSpeed;
                break;
            case 'ArrowRight':
                targetRotationY += panSpeed;
                break;
        }
    });

    // Handle Window Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        // Smoothly interpolate group rotation towards target rotation
        shapesGroup.rotation.x += (targetRotationX - shapesGroup.rotation.x) * 0.05;
        shapesGroup.rotation.y += (targetRotationY - shapesGroup.rotation.y) * 0.05;
        
        // Very slow constant auto-rotation of the group if no input
        targetRotationY += 0.001;
        targetRotationX += 0.0005;

        // Subtle camera parallax based on mouse
        camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
        camera.position.y += (mouseY * 5 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);

        // Animate individual objects
        objects.forEach(obj => {
            // Self rotation
            obj.rotation.x += obj.userData.rotSpeedX;
            obj.rotation.y += obj.userData.rotSpeedY;
            obj.rotation.z += obj.userData.rotSpeedZ;

            // Slow drift
            obj.position.x += obj.userData.driftX;
            obj.position.y += obj.userData.driftY;
            obj.position.z += obj.userData.driftZ;

            // Simple soft boundary box constraint
            const bounds = 35;
            if(Math.abs(obj.position.x) > bounds) obj.userData.driftX *= -1;
            if(Math.abs(obj.position.y) > bounds) obj.userData.driftY *= -1;
            if(Math.abs(obj.position.z) > bounds) obj.userData.driftZ *= -1;
        });

        renderer.render(scene, camera);
    }

    animate();
});
