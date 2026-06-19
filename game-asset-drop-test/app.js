(function() {
    // Canvas & Setup
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Game Constants
    const GRAVITY = 0.45;
    const FRICTION = 0.82;
    const WALK_ACCEL = 0.6;
    const MAX_WALK_SPEED = 3.5;
    const JUMP_FORCE = -9.2;
    const MIN_JUMP_FORCE = -3.5; // for short hops

    // Global Collections
    let solids = [];
    let backgroundScenery = [];
    let particles = [];
    let enemies = [];
    let player = null;

    // Keys State
    const keys = {
        ArrowLeft: false,
        ArrowRight: false,
        Space: false,
        KeyR: false
    };

    // Asset Images Object (stores HTMLImageElement instances if uploaded)
    const customAssets = {
        player: null,
        goomba: null,
        ground: null,
        brick: null,
        question: null,
        question_used: null,
        hill: null,
        bush: null,
        cloud: null,
        title_sign: null
    };

    // Animation configuration metadata for each asset type
    const assetAnimConfig = {
        player: { isAnimated: false, frames: 4, fps: 8 },
        goomba: { isAnimated: false, frames: 2, fps: 6 },
        ground: { isAnimated: false, frames: 3, fps: 6 },
        brick: { isAnimated: false, frames: 3, fps: 6 },
        question: { isAnimated: false, frames: 4, fps: 8 },
        question_used: { isAnimated: false, frames: 1, fps: 1 },
        hill: { isAnimated: false, frames: 1, fps: 1 },
        bush: { isAnimated: false, frames: 1, fps: 1 },
        cloud: { isAnimated: false, frames: 1, fps: 1 },
        title_sign: { isAnimated: false, frames: 1, fps: 1 }
    };

    // Default Fallback Colors (if no image uploaded)
    const placeholderColors = {
        player: '#ff4757',
        goomba: '#a4b0be',
        ground: '#c56cf0',
        brick: '#ff9f43',
        question: '#ffd2df',
        question_used: '#54a0ff',
        hill: '#10ac84',
        bush: '#1dd1a1',
        cloud: '#ffffff',
        title_sign: '#ff6b6b'
    };

    // ==========================================
    // ENTITY CLASSES & IMPLEMENTATION
    // ==========================================

    class Entity {
        constructor(x, y, width, height, type) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.type = type;
            this.bounceY = 0;
            this.bounceSpeed = 0;
            this.animTimer = Math.random() * 10; // offset animation starting times so blocks don't sync completely
        }

        get bounds() {
            return {
                left: this.x,
                right: this.x + this.width,
                top: this.y + this.bounceY,
                bottom: this.y + this.height + this.bounceY
            };
        }

        update() {
            // Apply bounce animations for blocks
            if (this.bounceY !== 0 || this.bounceSpeed !== 0) {
                this.bounceY += this.bounceSpeed;
                this.bounceSpeed += 0.5; // gravity pull for block bounce
                if (this.bounceY >= 0) {
                    this.bounceY = 0;
                    this.bounceSpeed = 0;
                }
            }

            // Increment animation timer
            const cfg = assetAnimConfig[this.type];
            if (cfg && cfg.isAnimated) {
                this.animTimer += cfg.fps / 60;
            }
        }

        draw() {
            const img = customAssets[this.type];
            const startY = this.y + this.bounceY;

            if (img) {
                const cfg = assetAnimConfig[this.type];
                if (cfg && cfg.isAnimated && cfg.frames > 1) {
                    const frameIndex = Math.floor(this.animTimer) % cfg.frames;
                    const frameWidth = img.naturalWidth / cfg.frames;
                    const frameHeight = img.naturalHeight;
                    ctx.drawImage(
                        img,
                        frameIndex * frameWidth, 0, frameWidth, frameHeight,
                        this.x, startY, this.width, this.height
                    );
                } else {
                    ctx.drawImage(img, this.x, startY, this.width, this.height);
                }
            } else {
                this.drawPlaceholder(this.x, startY);
            }
        }

        drawPlaceholder(x, y) {
            // Default flat colored drawing fallback
            ctx.fillStyle = placeholderColors[this.type];
            ctx.fillRect(x, y, this.width, this.height);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, this.width, this.height);
        }
    }

    // Special Renderers for Placeholders to make it look Retro-Premium!
    class DecorativeScenery extends Entity {
        drawPlaceholder(x, y) {
            ctx.save();
            const color = placeholderColors[this.type];
            ctx.fillStyle = color;

            if (this.type === 'cloud') {
                // Draw a puffy retro cloud
                ctx.beginPath();
                ctx.arc(x + 20, y + 25, 15, 0, Math.PI * 2);
                ctx.arc(x + 40, y + 15, 20, 0, Math.PI * 2);
                ctx.arc(x + 65, y + 15, 18, 0, Math.PI * 2);
                ctx.arc(x + 80, y + 25, 14, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
                
                // Cloud bottom flat line
                ctx.fillRect(x + 15, y + 22, 70, 15);
                ctx.fillStyle = '#ebf2fa'; // Shadow highlight on bottom
                ctx.fillRect(x + 20, y + 32, 60, 4);
            } 
            else if (this.type === 'hill') {
                // Draw a triangular pixel-style hill
                ctx.beginPath();
                ctx.moveTo(x, y + this.height);
                ctx.lineTo(x + this.width / 2, y);
                ctx.lineTo(x + this.width, y + this.height);
                ctx.closePath();
                ctx.fill();

                // Draw black lines/stripes to match NES Mario cover style
                ctx.strokeStyle = '#075f45';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw eyes on the hill (classic Nintendo easter egg)
                ctx.fillStyle = '#000';
                const eyeX = x + this.width / 2;
                const eyeY = y + this.height * 0.4;
                ctx.fillRect(eyeX - 5, eyeY, 3, 8);
                ctx.fillRect(eyeX + 2, eyeY, 3, 8);
            } 
            else if (this.type === 'bush') {
                // Draw circular rounded bushes
                ctx.beginPath();
                ctx.arc(x + 15, y + this.height - 10, 15, 0, Math.PI * 2);
                ctx.arc(x + this.width / 2, y + 10, 18, 0, Math.PI * 2);
                ctx.arc(x + this.width - 15, y + this.height - 10, 15, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();

                ctx.fillRect(x + 10, y + this.height - 15, this.width - 20, 15);

                // Shadows inside bush
                ctx.fillStyle = '#10ac84';
                ctx.beginPath();
                ctx.arc(x + this.width / 2, y + 15, 12, 0, Math.PI * 2);
                ctx.fill();
            } 
            else if (this.type === 'title_sign') {
                // Retro Super Warrior Bros signboard
                ctx.fillStyle = '#cf6a3c'; // Dark wood color
                ctx.fillRect(x, y, this.width, this.height);
                
                // Border
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 4;
                ctx.strokeRect(x, y, this.width, this.height);
                
                // Rivets in corners
                ctx.fillStyle = '#000000';
                ctx.fillRect(x + 8, y + 8, 6, 6);
                ctx.fillRect(x + this.width - 14, y + 8, 6, 6);
                ctx.fillRect(x + 8, y + this.height - 14, 6, 6);
                ctx.fillRect(x + this.width - 14, y + this.height - 14, 6, 6);

                // Title Text
                ctx.fillStyle = '#ffffff';
                ctx.font = '22px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('SUPER', x + this.width / 2, y + 50);
                ctx.font = '24px "Press Start 2P", monospace';
                ctx.fillText('WARRIOR BROS.', x + this.width / 2, y + 100);
            }
            ctx.restore();
        }
    }

    class SolidBlock extends Entity {
        constructor(x, y, width, height, type) {
            super(x, y, width, height, type);
            this.isUsed = false; // specific to question blocks
        }

        draw() {
            const currentType = (this.type === 'question' && this.isUsed) ? 'question_used' : this.type;
            const img = customAssets[currentType];
            const startY = this.y + this.bounceY;

            if (img) {
                const cfg = assetAnimConfig[currentType];
                if (cfg && cfg.isAnimated && cfg.frames > 1) {
                    const frameIndex = Math.floor(this.animTimer) % cfg.frames;
                    const frameWidth = img.naturalWidth / cfg.frames;
                    const frameHeight = img.naturalHeight;
                    ctx.drawImage(
                        img,
                        frameIndex * frameWidth, 0, frameWidth, frameHeight,
                        this.x, startY, this.width, this.height
                    );
                } else {
                    ctx.drawImage(img, this.x, startY, this.width, this.height);
                }
            } else {
                this.drawPlaceholder(this.x, startY, currentType);
            }
        }

        drawPlaceholder(x, y, renderType) {
            ctx.save();
            if (renderType === 'ground') {
                // Pixelated orange ground blocks
                ctx.fillStyle = placeholderColors.ground;
                ctx.fillRect(x, y, this.width, this.height);

                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, this.width, this.height);

                // Draw diagonal rock cracks
                ctx.fillStyle = '#7a3e9c';
                ctx.fillRect(x + 4, y + 4, 12, 12);
                ctx.fillRect(x + 24, y + 20, 10, 10);
            } 
            else if (renderType === 'brick') {
                // Brick blocks with individual bricks drawn
                ctx.fillStyle = placeholderColors.brick;
                ctx.fillRect(x, y, this.width, this.height);

                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, this.width, this.height);

                // Brick lines
                ctx.beginPath();
                ctx.moveTo(x, y + 13);
                ctx.lineTo(x + this.width, y + 13);
                ctx.moveTo(x, y + 26);
                ctx.lineTo(x + this.width, y + 26);

                // Vertical joints
                ctx.moveTo(x + 13, y);
                ctx.lineTo(x + 13, y + 13);
                ctx.moveTo(x + 27, y + 13);
                ctx.lineTo(x + 27, y + 26);
                ctx.moveTo(x + 13, y + 26);
                ctx.lineTo(x + 13, y + this.height);
                
                ctx.stroke();
            } 
            else if (renderType === 'question') {
                // Golden yellow question box
                ctx.fillStyle = '#f9ca24';
                ctx.fillRect(x, y, this.width, this.height);

                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, this.width, this.height);

                // Highlight corners
                ctx.fillStyle = '#000';
                ctx.fillRect(x + 3, y + 3, 3, 3);
                ctx.fillRect(x + this.width - 6, y + 3, 3, 3);
                ctx.fillRect(x + 3, y + this.height - 6, 3, 3);
                ctx.fillRect(x + this.width - 6, y + this.height - 6, 3, 3);

                // Question Mark "?"
                ctx.font = '22px "Press Start 2P", monospace';
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', x + this.width / 2, y + this.height / 2);
            } 
            else if (renderType === 'question_used') {
                // Deactivated, plain brown/solid block
                ctx.fillStyle = placeholderColors.question_used;
                ctx.fillRect(x, y, this.width, this.height);

                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, this.width, this.height);

                // Corner bolts
                ctx.fillStyle = '#222';
                ctx.fillRect(x + 4, y + 4, 3, 3);
                ctx.fillRect(x + this.width - 7, y + 4, 3, 3);
                ctx.fillRect(x + 4, y + this.height - 7, 3, 3);
                ctx.fillRect(x + this.width - 7, y + this.height - 7, 3, 3);
            }
            ctx.restore();
        }

        onHit() {
            if (this.type === 'question' && !this.isUsed) {
                // Bounce block
                this.bounceY = 0;
                this.bounceSpeed = -4; // Trigger lift
                this.isUsed = true;
                
                // Spawn a gold coin jumping up
                spawnCoin(this.x + this.width / 2, this.y);
            } 
            else if (this.type === 'brick') {
                // Bounce brick block
                this.bounceY = 0;
                this.bounceSpeed = -2;

                // Spawn brick bits
                spawnDebris(this.x + this.width / 2, this.y + this.height / 2);
            }
        }
    }

    class Player {
        constructor(x, y) {
            this.startX = x;
            this.startY = y;
            this.x = x;
            this.y = y;
            this.width = 30;
            this.height = 42;
            this.vx = 0;
            this.vy = 0;
            this.grounded = false;
            this.isJumping = false;
            this.direction = 1; // 1 = right, -1 = left
            this.type = 'player';
            this.isDead = false;
            this.deathTimer = 0;
            this.animTimer = 0;
        }

        get bounds() {
            return {
                left: this.x,
                right: this.x + this.width,
                top: this.y,
                bottom: this.y + this.height
            };
        }

        reset() {
            this.x = this.startX;
            this.y = this.startY;
            this.vx = 0;
            this.vy = 0;
            this.grounded = false;
            this.isJumping = false;
            this.isDead = false;
            this.deathTimer = 0;
            this.animTimer = 0;
        }

        die() {
            if (this.isDead) return;
            this.isDead = true;
            this.vy = -7.5; // fly upwards in classic death spin
            this.deathTimer = 120; // 2 seconds spin out
        }

        update() {
            if (this.isDead) {
                this.y += this.vy;
                this.vy += 0.35; // gravity pulls dead Mario down
                this.deathTimer--;
                if (this.deathTimer <= 0) {
                    this.reset();
                }
                return;
            }

            // Accumulate animation frame cycles (using grounded state from previous frame)
            const cfg = assetAnimConfig[this.type];
            if (cfg && cfg.isAnimated) {
                if (!this.grounded) {
                    // Display jump frame if frames are available
                    if (cfg.frames >= 3) {
                        this.animTimer = 2; // Fixed jump frame
                    } else {
                        // For 2 frames, let it cycle or stay on 0
                        this.animTimer = 0;
                    }
                } else if (this.vx !== 0) {
                    // Increment frame at a constant rate based on the configured FPS
                    this.animTimer += cfg.fps / 60;
                } else {
                    // Force standing frame on idle
                    this.animTimer = 0;
                }
            }

            // Keyboard input walk acceleration
            if (keys.ArrowLeft) {
                this.vx -= WALK_ACCEL;
                this.direction = -1;
            } else if (keys.ArrowRight) {
                this.vx += WALK_ACCEL;
                this.direction = 1;
            } else {
                // Friction
                this.vx *= FRICTION;
                if (Math.abs(this.vx) < 0.05) this.vx = 0;
            }

            // Limit horizontal velocity
            if (this.vx > MAX_WALK_SPEED) this.vx = MAX_WALK_SPEED;
            if (this.vx < -MAX_WALK_SPEED) this.vx = -MAX_WALK_SPEED;

            // Apply Gravity
            this.vy += GRAVITY;

            // Update Positions
            this.x += this.vx;
            this.y += this.vy;

            // Screen Boundaries
            if (this.x < 0) {
                this.x = 0;
                this.vx = 0;
            }
            if (this.x + this.width > canvas.width) {
                this.x = canvas.width - this.width;
                this.vx = 0;
            }

            // Reset grounded state (collisons will re-evaluate)
            this.grounded = false;
        }

        draw() {
            const img = customAssets[this.type];
            ctx.save();

            // Flip horizontally if facing left
            if (this.direction === -1) {
                ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
                ctx.scale(-1, 1);
                ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));
            }

            if (img) {
                const cfg = assetAnimConfig[this.type];
                if (cfg && cfg.isAnimated && cfg.frames > 1) {
                    const frameIndex = Math.floor(this.animTimer) % cfg.frames;
                    const frameWidth = img.naturalWidth / cfg.frames;
                    const frameHeight = img.naturalHeight;
                    ctx.drawImage(
                        img,
                        frameIndex * frameWidth, 0, frameWidth, frameHeight,
                        this.x, this.y, this.width, this.height
                    );
                } else {
                    ctx.drawImage(img, this.x, this.y, this.width, this.height);
                }
            } else {
                this.drawPlaceholder(this.x, this.y);
            }

            ctx.restore();
        }

        drawPlaceholder(x, y) {
            ctx.save();
            // Puffy cap & overalls classic red box player shape
            ctx.fillStyle = placeholderColors.player;
            
            // Cap (red)
            ctx.fillRect(x + 4, y, 22, 8);
            ctx.fillRect(x + 8, y + 4, 18, 4);

            // Face/skin block
            ctx.fillStyle = '#ffddaa';
            ctx.fillRect(x + 6, y + 8, 18, 10);
            // Mustache (black)
            ctx.fillStyle = '#000000';
            ctx.fillRect(x + 16, y + 12, 8, 3);
            
            // Overalls (blue & red shirts)
            ctx.fillStyle = '#0000ff';
            ctx.fillRect(x + 6, y + 18, 18, 18); // overalls body
            ctx.fillStyle = placeholderColors.player;
            ctx.fillRect(x + 2, y + 18, 4, 12); // left sleeve
            ctx.fillRect(x + 24, y + 18, 4, 12); // right sleeve

            // Shoes (brown)
            ctx.fillStyle = '#6f4e37';
            ctx.fillRect(x + 4, y + 36, 10, 6);
            ctx.fillRect(x + 16, y + 36, 10, 6);
            
            ctx.restore();
        }
    }

    class Goomba {
        constructor(x, y) {
            this.startX = x;
            this.startY = y;
            this.x = x;
            this.y = y;
            this.width = 32;
            this.height = 32;
            this.vx = -1.0; // Slow walking pace
            this.vy = 0;
            this.grounded = false;
            this.alive = true;
            this.squishTimer = 0;
            this.type = 'goomba';
            this.animTimer = Math.random() * 10;
        }

        get bounds() {
            return {
                left: this.x,
                right: this.x + this.width,
                top: this.y,
                bottom: this.y + this.height
            };
        }

        reset() {
            this.x = this.startX;
            this.y = this.startY;
            this.vx = -1.0;
            this.vy = 0;
            this.grounded = false;
            this.alive = true;
            this.squishTimer = 0;
            this.animTimer = Math.random() * 10;
        }

        update() {
            if (!this.alive) {
                if (this.squishTimer > 0) {
                    this.squishTimer--;
                }
                return;
            }

            // Gravity
            this.vy += GRAVITY;

            // Apply horizontal speed
            this.x += this.vx;
            this.y += this.vy;

            // Bounce off canvas walls
            if (this.x <= 0) {
                this.x = 0;
                this.vx = -this.vx;
            }
            if (this.x + this.width >= canvas.width) {
                this.x = canvas.width - this.width;
                this.vx = -this.vx;
            }

            this.grounded = false;

            // Goomba walks continually: advance frames
            const cfg = assetAnimConfig[this.type];
            if (cfg && cfg.isAnimated) {
                this.animTimer += cfg.fps / 60;
            }
        }

        draw() {
            if (!this.alive && this.squishTimer <= 0) return;

            const img = customAssets[this.type];
            ctx.save();

            if (!this.alive && this.squishTimer > 0) {
                // Flatten squished goomba
                ctx.translate(this.x, this.y + this.height - 8);
                ctx.scale(1, 0.25);
                ctx.translate(-this.x, -(this.y + this.height - 8));
            }

            if (img) {
                const cfg = assetAnimConfig[this.type];
                if (this.alive && cfg && cfg.isAnimated && cfg.frames > 1) {
                    const frameIndex = Math.floor(this.animTimer) % cfg.frames;
                    const frameWidth = img.naturalWidth / cfg.frames;
                    const frameHeight = img.naturalHeight;
                    ctx.drawImage(
                        img,
                        frameIndex * frameWidth, 0, frameWidth, frameHeight,
                        this.x, this.y, this.width, this.height
                    );
                } else {
                    ctx.drawImage(img, this.x, this.y, this.width, this.height);
                }
            } else {
                this.drawPlaceholder(this.x, this.y);
            }

            ctx.restore();
        }

        drawPlaceholder(x, y) {
            ctx.save();
            ctx.fillStyle = placeholderColors.goomba;
            
            // Goomba dome head
            ctx.beginPath();
            ctx.arc(x + 16, y + 16, 16, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(x, y + 14, 32, 10);

            // Stem body
            ctx.fillStyle = '#ffddaa';
            ctx.fillRect(x + 6, y + 24, 20, 6);

            // Eyes
            ctx.fillStyle = '#000';
            ctx.fillRect(x + 8, y + 10, 4, 6);
            ctx.fillRect(x + 20, y + 10, 4, 6);
            
            // Brows
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 5, y + 8);
            ctx.lineTo(x + 13, y + 11);
            ctx.moveTo(x + 27, y + 8);
            ctx.lineTo(x + 19, y + 11);
            ctx.stroke();

            // Feet
            ctx.fillStyle = '#1e272e';
            ctx.fillRect(x + 3, y + 29, 9, 3);
            ctx.fillRect(x + 20, y + 29, 9, 3);

            ctx.restore();
        }
    }

    // ==========================================
    // PARTICLES SYSTEM
    // ==========================================

    class Particle {
        constructor(x, y, vx, vy, color, duration, type = 'shard') {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.color = color;
            this.maxDuration = duration;
            this.duration = duration;
            this.type = type; // 'shard' or 'coin'
            this.spinAngle = 0;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            
            if (this.type === 'coin') {
                this.vy += 0.45;
                this.spinAngle += 0.25;
            } else {
                this.vy += 0.2;
                this.vx *= 0.98;
            }

            this.duration--;
        }

        draw() {
            ctx.save();
            let alpha = this.duration / this.maxDuration;
            ctx.globalAlpha = alpha;

            if (this.type === 'coin') {
                ctx.translate(this.x, this.y);
                ctx.scale(Math.abs(Math.sin(this.spinAngle)), 1); // spin visual effect
                ctx.fillStyle = '#ffd32a';
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffa502';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            } else {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x - 4, this.y - 4, 8, 8);
            }
            ctx.restore();
        }
    }

    function spawnCoin(x, y) {
        particles.push(new Particle(x, y - 8, 0, -6.5, '#ffd32a', 32, 'coin'));
    }

    // Debris particle helper
    function spawnDebris(x, y) {
        particles.push(new Particle(x, y, -2.5, -4, '#ff9f43', 25));
        particles.push(new Particle(x, y, 2.5, -4, '#ff9f43', 25));
        particles.push(new Particle(x, y, -1.5, -6, '#ff7f50', 30));
        particles.push(new Particle(x, y, 1.5, -6, '#ff7f50', 30));
    }


    // ==========================================
    // SCENE INITIALIZATION & BUILDERS
    // ==========================================

    function initScene() {
        solids = [];
        backgroundScenery = [];
        enemies = [];
        particles = [];

        // 1. Clouds
        backgroundScenery.push(new DecorativeScenery(40, 45, 110, 45, 'cloud'));
        backgroundScenery.push(new DecorativeScenery(150, 190, 80, 40, 'cloud'));
        backgroundScenery.push(new DecorativeScenery(700, 30, 100, 45, 'cloud'));

        // 2. Hills / Mountains
        backgroundScenery.push(new DecorativeScenery(-20, 200, 160, 120, 'hill'));
        backgroundScenery.push(new DecorativeScenery(410, 256, 128, 64, 'hill'));
        backgroundScenery.push(new DecorativeScenery(590, 224, 128, 96, 'hill'));
        backgroundScenery.push(new DecorativeScenery(900, 256, 96, 64, 'hill'));

        // 3. Bushes
        backgroundScenery.push(new DecorativeScenery(330, 296, 96, 24, 'bush'));
        backgroundScenery.push(new DecorativeScenery(725, 296, 64, 24, 'bush'));

        // 4. Title Sign
        backgroundScenery.push(new DecorativeScenery(245, 25, 310, 130, 'title_sign'));

        // 5. Ground Floor Blocks
        for (let col = 0; col < 20; col++) {
            let xPos = col * 40;
            solids.push(new SolidBlock(xPos, 320, 40, 40, 'ground'));
            solids.push(new SolidBlock(xPos, 360, 40, 40, 'ground'));
        }

        // 6. Question Blocks
        solids.push(new SolidBlock(350, 200, 40, 40, 'question'));
        solids.push(new SolidBlock(675, 80, 40, 40, 'question'));

        // 7. Brick Blocks on the Right (at y = 200)
        solids.push(new SolidBlock(608, 200, 40, 40, 'brick'));
        solids.push(new SolidBlock(648, 200, 40, 40, 'question'));
        solids.push(new SolidBlock(688, 200, 40, 40, 'brick'));
        solids.push(new SolidBlock(728, 200, 40, 40, 'question'));
        solids.push(new SolidBlock(768, 200, 40, 40, 'brick'));

        // 8. Goomba Enemy
        enemies.push(new Goomba(620, 320 - 32));

        // 9. Player (Mario)
        if (!player) {
            player = new Player(250, 320 - 42);
        } else {
            player.reset();
        }
    }


    // ==========================================
    // PHYSICS & COLLISION RESOLUTION ENGINE
    // ==========================================

    function checkAABBCollision(rect1, rect2) {
        return rect1.left < rect2.right &&
               rect1.right > rect2.left &&
               rect1.top < rect2.bottom &&
               rect1.bottom > rect2.top;
    }

    function resolveCollisions() {
        if (player.isDead) return;

        // --- Player to Solid Block Collisions ---
        let playerBounds = player.bounds;

        for (let solid of solids) {
            let solidBounds = solid.bounds;

            if (checkAABBCollision(playerBounds, solidBounds)) {
                let overlapX = Math.min(playerBounds.right - solidBounds.left, solidBounds.right - playerBounds.left);
                let overlapY = Math.min(playerBounds.bottom - solidBounds.top, solidBounds.bottom - playerBounds.top);

                if (overlapX < overlapY) {
                    if (playerBounds.left + player.width / 2 < solidBounds.left + solid.width / 2) {
                        player.x -= overlapX;
                        player.vx = 0;
                    } else {
                        player.x += overlapX;
                        player.vx = 0;
                    }
                } else {
                    if (playerBounds.top + player.height / 2 < solidBounds.top + solid.height / 2) {
                        player.y -= overlapY;
                        player.vy = 0;
                        player.grounded = true;
                        player.isJumping = false;
                    } else {
                        player.y += overlapY;
                        player.vy = 0.5;
                        solid.onHit();
                    }
                }
                playerBounds = player.bounds;
            }
        }

        // --- Goomba to Solid Block Collisions ---
        for (let enemy of enemies) {
            if (!enemy.alive) continue;

            let enemyBounds = enemy.bounds;

            for (let solid of solids) {
                let solidBounds = solid.bounds;

                if (checkAABBCollision(enemyBounds, solidBounds)) {
                    let overlapX = Math.min(enemyBounds.right - solidBounds.left, solidBounds.right - enemyBounds.left);
                    let overlapY = Math.min(enemyBounds.bottom - solidBounds.top, solidBounds.bottom - enemyBounds.top);

                    if (overlapX < overlapY) {
                        if (enemyBounds.left + enemy.width / 2 < solidBounds.left + solid.width / 2) {
                            enemy.x -= overlapX;
                        } else {
                            enemy.x += overlapX;
                        }
                        enemy.vx = -enemy.vx;
                    } else {
                        if (enemyBounds.top + enemy.height / 2 < solidBounds.top + solid.height / 2) {
                            enemy.y -= overlapY;
                            enemy.vy = 0;
                            enemy.grounded = true;
                        }
                    }
                    enemyBounds = enemy.bounds;
                }
            }
        }

        // --- Player to Goomba Collisions ---
        for (let enemy of enemies) {
            if (!enemy.alive) continue;

            if (checkAABBCollision(player.bounds, enemy.bounds)) {
                let isSquishing = (player.y + player.height - player.vy) <= (enemy.y + 12);
                
                if (isSquishing && player.vy > 0) {
                    enemy.alive = false;
                    enemy.squishTimer = 40;
                    player.vy = -5.5;
                    player.isJumping = true;
                    player.grounded = false;
                } else {
                    player.die();
                }
            }
        }
    }


    // ==========================================
    // KEYBOARD INPUT EVENT HANDLERS
    // ==========================================

    window.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            keys.ArrowLeft = true;
        }
        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            keys.ArrowRight = true;
        }
        if (e.code === 'Space') {
            keys.Space = true;
            if (player && player.grounded && !player.isDead) {
                player.vy = JUMP_FORCE;
                player.grounded = false;
                player.isJumping = true;
            }
            e.preventDefault();
        }
        if (e.code === 'KeyR') {
            resetAllPositions();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            keys.ArrowLeft = false;
        }
        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            keys.ArrowRight = false;
        }
        if (e.code === 'Space') {
            keys.Space = false;
            if (player && player.vy < MIN_JUMP_FORCE && player.isJumping) {
                player.vy = MIN_JUMP_FORCE;
            }
        }
    });

    function resetAllPositions() {
        if (player) player.reset();
        for (let enemy of enemies) {
            enemy.reset();
        }
        for (let solid of solids) {
            solid.isUsed = false;
            solid.bounceY = 0;
            solid.bounceSpeed = 0;
        }
        particles = [];
    }


    // ==========================================
    // LOCAL ASSET FILE INJECTION SYSTEM
    // ==========================================

    function setupAssetInjectors() {
        const cards = document.querySelectorAll('.asset-card');

        cards.forEach(card => {
            const assetType = card.getAttribute('data-asset');
            const fileInput = card.querySelector('.file-input');
            const previewArea = card.querySelector('.card-preview-area');
            const colorSwatch = card.querySelector('.color-swatch');
            const imgPreview = card.querySelector('.img-preview');
            const badge = card.querySelector('.badge');
            const resetBtn = card.querySelector('.btn-reset');
            
            // Animation settings controls
            const animPanel = card.querySelector('.anim-settings-panel');
            const animToggle = card.querySelector('.anim-toggle');
            const animInputsRow = card.querySelector('.anim-inputs-row');
            const framesInput = card.querySelector('.anim-frames');
            const fpsInput = card.querySelector('.anim-fps');

            // Listen to file selection
            fileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const fileUrl = URL.createObjectURL(file);
                const customImg = new Image();

                customImg.onload = () => {
                    if (customAssets[assetType]) {
                        URL.revokeObjectURL(customAssets[assetType].src);
                    }

                    customAssets[assetType] = customImg;

                    // Update UI preview
                    colorSwatch.classList.add('hidden');
                    imgPreview.src = fileUrl;
                    imgPreview.classList.remove('hidden');

                    badge.textContent = 'Custom';
                    badge.classList.remove('badge-placeholder');
                    badge.classList.add('badge-custom');
                    card.classList.add('has-custom');
                    resetBtn.classList.remove('hidden');

                    // Show the animation configuration panel
                    animPanel.classList.remove('hidden');
                };

                customImg.src = fileUrl;
            });

            // Listen to animation checkbox toggle
            animToggle.addEventListener('change', () => {
                const isChecked = animToggle.checked;
                assetAnimConfig[assetType].isAnimated = isChecked;
                
                if (isChecked) {
                    animInputsRow.classList.remove('hidden');
                } else {
                    animInputsRow.classList.add('hidden');
                }
            });

            // Listen to Frames changes
            framesInput.addEventListener('input', () => {
                let val = parseInt(framesInput.value, 10);
                if (isNaN(val) || val < 1) val = 1;
                assetAnimConfig[assetType].frames = val;
            });

            // Listen to FPS changes
            fpsInput.addEventListener('input', () => {
                let val = parseInt(fpsInput.value, 10);
                if (isNaN(val) || val < 1) val = 1;
                assetAnimConfig[assetType].fps = val;
            });

            // Listen to reset
            resetBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                fileInput.value = '';

                if (customAssets[assetType]) {
                    URL.revokeObjectURL(customAssets[assetType].src);
                    customAssets[assetType] = null;
                }

                imgPreview.classList.add('hidden');
                imgPreview.src = '';
                colorSwatch.classList.remove('hidden');

                badge.textContent = 'Placeholder';
                badge.classList.remove('badge-custom');
                badge.classList.add('badge-placeholder');
                card.classList.remove('has-custom');
                resetBtn.classList.add('hidden');

                // Reset and hide the animation panel
                animPanel.classList.add('hidden');
                animToggle.checked = false;
                animInputsRow.classList.add('hidden');
                
                // Revert values to defaults
                assetAnimConfig[assetType].isAnimated = false;
                if (assetType === 'player') {
                    framesInput.value = 4;
                    fpsInput.value = 8;
                    assetAnimConfig.player.frames = 4;
                    assetAnimConfig.player.fps = 8;
                } else if (assetType === 'goomba') {
                    framesInput.value = 2;
                    fpsInput.value = 6;
                    assetAnimConfig.goomba.frames = 2;
                    assetAnimConfig.goomba.fps = 6;
                } else {
                    framesInput.value = 4;
                    fpsInput.value = 8;
                    assetAnimConfig[assetType].frames = 4;
                    assetAnimConfig[assetType].fps = 8;
                }
            });
        });
    }


    // ==========================================
    // CORE LOOP & DRAW STAGE
    // ==========================================

    function update() {
        // 1. Update Player
        player.update();

        // 2. Update Solids (for block hit animation bounces)
        for (let solid of solids) {
            solid.update();
        }

        // 3. Update Enemies
        for (let enemy of enemies) {
            enemy.update();
        }

        // 4. Update Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].duration <= 0) {
                particles.splice(i, 1);
            }
        }

        // 5. Physics Collision Checks
        resolveCollisions();
    }

    function draw() {
        // Clean Canvas with Sky Blue color
        ctx.fillStyle = '#5c94fc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Background Scenery
        for (let item of backgroundScenery) {
            item.draw();
        }

        // 2. Draw Solids
        for (let solid of solids) {
            solid.draw();
        }

        // 3. Draw Particles
        for (let part of particles) {
            part.draw();
        }

        // 4. Draw Enemies
        for (let enemy of enemies) {
            enemy.draw();
        }

        // 5. Draw Player
        player.draw();
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    // Initialize the Game
    initScene();
    setupAssetInjectors();
    requestAnimationFrame(loop);

})();
