// src/particles.js

class Particle {
    constructor(x, y, char, atomicNum, color) {
        this.x = x;
        this.y = y;
        this.z = Math.random() * 2 - 1; // 3D depth (-1 to 1)
        
        // Base dimensions
        this.baseSize = 12; 
        this.size = this.baseSize;
        this.char = char;
        this.atomicNum = atomicNum;
        this.color = color;
        
        // Initial momentum biases upwards
        this.velocity = {
            x: (Math.random() - 0.5) * 0.5,
            y: Math.random() * -1 - 0.5, 
            z: (Math.random() - 0.5) * 0.05
        };
        this.target = { x: 0, y: 0, z: 0 };
        this.boxSize = this.size * 2.8; 
        this.radius = this.boxSize / 2; // For smooth collision physics
    }

    updateMobile(bounds) {
        // Minimal logic for mobile without heavy physics
        this.y -= 0.15; 
        if (this.y < -50) {
            this.y = bounds.height + 50;
            this.x = Math.random() * bounds.width;
        }
    }

    updateFlow(particles, index, mouse, gravityIntensity, bounds) {
        // Natural upward drift (Anti-Gravity effect)
        this.velocity.y += gravityIntensity;
        
        // Elegantly sway left/right
        this.velocity.x += Math.sin(Date.now() * 0.001 + this.atomicNum) * 0.015;

        // Soft Damping
        this.velocity.x *= 0.96;
        this.velocity.y *= 0.98;
        this.velocity.z *= 0.98;

        // Speed Limits for elegance 
        if (this.velocity.x > 1.5) this.velocity.x = 1.5;
        if (this.velocity.x < -1.5) this.velocity.x = -1.5;
        if (this.velocity.y < -2.5) this.velocity.y = -2.5;
        
        // Gently bounce depth (Z)
        if (this.z > 1) { this.z = 1; this.velocity.z *= -1; }
        if (this.z < -1) { this.z = -1; this.velocity.z *= -1; }

        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.z += this.velocity.z;

        // Screen wrap perfectly coordinated with bounds
        if (this.y < -50) {
            this.y = bounds.height + 50;
            this.x = Math.random() * bounds.width;
            this.velocity.y = Math.random() * -1 - 0.5;
        }
        if (this.x < -50) this.x = bounds.width + 50;
        if (this.x > bounds.width + 50) this.x = -50;

        // Optimized Soft Collision detection
        for (let j = index + 1; j < particles.length; j++) {
            let p2 = particles[j];
            let dx = this.x - p2.x;
            let dy = this.y - p2.y;
            let distSq = dx * dx + dy * dy;
            let minDist = this.radius + p2.radius + 8; // Extra padding for organized spacing

            if (distSq < minDist * minDist) {
                let distance = Math.sqrt(distSq);
                // Gentle push mathematically
                let force = (minDist - distance) * 0.015;
                let ax = dx * force;
                let ay = dy * force;
                
                this.velocity.x += ax;
                this.velocity.y += ay;
                p2.velocity.x -= ax;
                p2.velocity.y -= ay;
            }
        }

        this.applyMouse(mouse);
    }

    updateSphere(mouse) {
        // Smooth and fluid Lerp integration for the globe morphing
        this.x += (this.target.x - this.x) * 0.06;
        this.y += (this.target.y - this.y) * 0.06;
        this.z += (this.target.z - this.z) * 0.06;

        this.applyMouse(mouse);
    }

    applyMouse(mouse) {
        if (mouse.x !== null && mouse.y !== null) {
            let dx = this.x - mouse.x;
            let dy = this.y - mouse.y;
            let distSq = dx * dx + dy * dy;
            let mouseRadius = 200; // Large, smooth interaction field
            
            if (distSq < mouseRadius * mouseRadius) {
                let distance = Math.sqrt(distSq) || 1;
                let forceDirectionX = dx / distance;
                let forceDirectionY = dy / distance;
                let force = (mouseRadius - distance) / mouseRadius; 
                
                // Repel softly
                this.velocity.x += forceDirectionX * force * 0.5;
                this.velocity.y += forceDirectionY * force * 0.5;
                
                // Active displacement
                this.x += forceDirectionX * force * 2;
                this.y += forceDirectionY * force * 2;
            }
        }
    }

    draw(ctx, isLowPerformance, isMobile) {
        // High-end Perspective Scaling
        const perspective = 500;
        const scale = perspective / (perspective - (this.z * 180)); 
        
        // Depth-based transparency mapping for UI compliance, much fainter on mobile
        let alpha = Math.max(0.05, Math.min(0.5, (this.z + 1.8) / 3)); 
        if (isMobile) alpha *= 0.3; // Faint on mobile

        ctx.globalAlpha = alpha; 
        
        const currentBoxSize = this.boxSize * scale; 
        const halfBox = currentBoxSize / 2;
        const cornerRadius = 8 * scale; // Smooth rounded tiles

        ctx.strokeStyle = this.color;
        
        // Disable Expensive Glow Effects for performance unless Z is close and device is high-end
        if (!isLowPerformance && !isMobile && this.z > 0.8) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8 * scale;
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.fillStyle = this.color; 
        ctx.lineWidth = 1.5 * scale;

        // Path logic for High-End Rounded Rectangles
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(this.x - halfBox, this.y - halfBox, currentBoxSize, currentBoxSize, cornerRadius);
        } else {
            // Fallback for older browsers
            ctx.rect(this.x - halfBox, this.y - halfBox, currentBoxSize, currentBoxSize);
        }

        // Draw Translucent Glass Backdrop
        ctx.globalAlpha = alpha * 0.08; 
        ctx.fill();

        // Outline Core 
        ctx.globalAlpha = alpha * 0.8;
        ctx.stroke();

        ctx.shadowBlur = 0; // Disable glow for crisp text rendering

        // Typography Setups
        ctx.fillStyle = this.color;

        // Atomic Number Design
        ctx.globalAlpha = alpha * 0.9;
        ctx.font = `600 ${Math.max(5, currentBoxSize * 0.22)}px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(this.atomicNum, this.x - halfBox + 5 * scale, this.y - halfBox + 4 * scale);

        // Core Element Symbol Design
        ctx.globalAlpha = alpha;
        ctx.font = `800 ${Math.max(12, currentBoxSize * 0.45)}px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.char, this.x, this.y + currentBoxSize * 0.08);

        ctx.globalAlpha = 1; // Unify scope
    }
}

export function initParticles() {
    const canvas = document.createElement('canvas');
    canvas.id = 'antigravity-bg';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw'; // Utilizing vw/vh visually but internal drawing via dpr ensures no bounds overflow issues
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1'; 
    canvas.style.pointerEvents = 'none'; 
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    let particles = [];
    
    // Curated dynamic theme palettes
    const darkColors = ['#00FF41', '#22d3ee', '#818cf8', '#a78bfa'];
    const lightColors = ['#4338ca', '#0891b2', '#64748b', '#0f172a'];
    
    // Ordered Periodic elements mapping exactly to 118 items
    const chars = ['H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe','Cs','Ba','La','Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi','Po','At','Rn','Fr','Ra','Ac','Th','Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm','Md','No','Lr','Rf','Db','Sg','Bh','Hs','Mt','Ds','Rg','Cn','Nh','Fl','Mc','Lv','Ts','Og'];
    
    let isMobile = window.innerWidth < 768; // true mobile size
    let isLowPerformance = window.innerWidth < 1024; // tablets/low end
    let particleCount = isMobile ? 32 : chars.length; // Use only 32 elements on mobile

    let state = 'sphere'; 
    let morphInterval = 14000; // Soft 14-second transition delay
    let lastMorphTime = Date.now();
    let sphereRotationX = 0;
    let sphereRotationY = 0;

    let mouse = { x: null, y: null };
    let logicalBounds = { width: 0, height: 0 };

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

    // Elegant Resizing using High-DPI Resolution scaling (Makes text ultra-crisp!)
    function resize() {
        isLowPerformance = window.innerWidth < 1024;
        isMobile = window.innerWidth <= 768;
        
        // Cap Maximum Device Pixel Ratio. Dpr above 1.5 destroys performance on full-screen canvases.
        const maxDpr = isLowPerformance ? 1 : 1.5;
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
        
        logicalBounds.width = window.innerWidth;
        logicalBounds.height = window.innerHeight;
        
        canvas.width = logicalBounds.width * dpr;
        canvas.height = logicalBounds.height * dpr;
        
        canvas.style.width = logicalBounds.width + 'px';
        canvas.style.height = logicalBounds.height + 'px';
        
        ctx.scale(dpr, dpr);
    }
    function init() {
        particles = [];
        const isDarkTheme = document.documentElement.getAttribute('data-theme') !== 'light';
        const activeColors = isDarkTheme ? darkColors : lightColors;

        const currentParticleCount = isMobile ? 15 : particleCount;

        for (let i = 0; i < currentParticleCount; i++) {
            const x = Math.random() * logicalBounds.width;
            const y = Math.random() * logicalBounds.height;
            const char = chars[i % chars.length]; // Modulo to avoid out of bounds if current is higher than chars
            const atomicNum = (i % chars.length) + 1; 
            
            // Generate organized color pattern to simulate element properties/groups
            const color = activeColors[i % activeColors.length];
            
            particles.push(new Particle(x, y, char, atomicNum, color));
        }
    }

    window.addEventListener('theme-change', init);
    // Re-init on resize to update mobile/desktop counts
    window.addEventListener('resize', () => {
        const wasMobile = isMobile;
        resize();
        if (wasMobile !== isMobile) {
            particleCount = isMobile ? 15 : chars.length;
            init();
        }
    });

    function calculateSphereTargets() {
        // Dynamic Sphere Radius calculation
        const radius = Math.min(logicalBounds.width, logicalBounds.height) * 0.38;
        const centerX = logicalBounds.width / 2;
        const centerY = logicalBounds.height / 2;
        
        sphereRotationX += 0.002;
        sphereRotationY += 0.004;
        
        for (let i = 0; i < particles.length; i++) {
            // Evenly distributes nodes along Golden Ratio spirals
            const index = i + 0.5;
            const phi = Math.acos(1 - 2 * index / particles.length);
            const theta = Math.PI * (1 + Math.sqrt(5)) * index;

            // X, Y, Z vector points
            let x = Math.cos(theta) * Math.sin(phi);
            let y = Math.sin(theta) * Math.sin(phi);
            let z = Math.cos(phi);

            // X Axis Twist
            let tempY = y * Math.cos(sphereRotationX) - z * Math.sin(sphereRotationX);
            let tempZ = y * Math.sin(sphereRotationX) + z * Math.cos(sphereRotationX);
            y = tempY;
            z = tempZ;

            // Y Axis Twist
            let tempX = x * Math.cos(sphereRotationY) - z * Math.sin(sphereRotationY);
            let tempZ2 = x * Math.sin(sphereRotationY) + z * Math.cos(sphereRotationY);
            x = tempX;
            z = tempZ2;

            // Push Target coordinates relative to layout
            particles[i].target.x = centerX + x * radius;
            particles[i].target.y = centerY + y * radius;
            particles[i].target.z = z; 
        }
    }

    function animate() {
        ctx.clearRect(0, 0, logicalBounds.width, logicalBounds.height);

        if (!isMobile) {
            const now = Date.now();
            if (now - lastMorphTime > morphInterval) {
                state = state === 'flow' ? 'sphere' : 'flow';
                lastMorphTime = now;
                
                if (state === 'flow') {
                    // Elegant Scatter Animation out of Globe
                    particles.forEach(p => {
                        let dx = p.x - logicalBounds.width / 2;
                        let dy = p.y - logicalBounds.height / 2;
                        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        
                        p.velocity.x = (dx / dist) * (Math.random() * 4 + 1);
                        p.velocity.y = (dy / dist) * (Math.random() * 4 + 1);
                        p.velocity.z = (Math.random() - 0.5) * 3;
                    });
                }
            }

            if (state === 'sphere') {
                calculateSphereTargets();
                particles.forEach(p => p.updateSphere(mouse));
            } else {
                particles.forEach((p, index) => p.updateFlow(particles, index, mouse, -0.015, logicalBounds));
            }
        } else {
            // Ultra-lightweight mobile update
            particles.forEach(p => {
                p.y -= 0.3;
                if (p.y < -50) p.y = logicalBounds.height + 50;
            });
        }

        // Apply true visual depth-sorting to ensure objects coming "Forward" obscure things "Behind" them natively
        // Do NOT sort the main 'particles' array in-place, because their index is used mathematically for sphere positioning!
        const sortedParticles = [...particles].sort((a, b) => a.z - b.z);

        sortedParticles.forEach(p => p.draw(ctx, isLowPerformance, isMobile));

        requestAnimationFrame(animate);
    }

    resize();
    init();
    animate();
}
