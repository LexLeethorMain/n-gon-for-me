// Practice Dummy Mod for n-gon
// Load by pasting in the console: (function(){const s=document.createElement('script');s.src='js/practice_dummy.js';document.head.appendChild(s);})();

(() => {
    if (typeof spawn === 'undefined' || typeof mob === 'undefined' || typeof Matter === 'undefined') {
        console.error("Practice Dummy: missing core game objects.");
        return;
    }

    const safeNumber = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);

    spawn.practiceDummy = function(x, y) {
        try {
            const size = 80;
            const vertices = Matter.Vertices.fromPath('0 0 40 0 40 40 0 40');

            mob[mob.length] = Matter.Bodies.fromVertices(x, y, vertices, {
                friction: 0.9,
                frictionAir: 0.01,
                restitution: 0,
                density: 0.002,
                collisionFilter: {
                    category: cat.mob,
                    mask: cat.player | cat.map | cat.body | cat.bullet | cat.mob
                }
            });

            const me = mob.length - 1;
            const mobj = mob[me];

            Matter.Body.setMass(mobj, 100);
            mobj.classType = "mob";
            mobj.isInvincible = true;
            mobj.memory = 1000;
            mobj.isStunImmune = true;
            mobj.isKnockBackImmune = true;
            mobj.isSlowImmune = true;
            mobj.alive = true;
            mobj.isSlowed = false;
            mobj.isStunned = false;
            mobj.isBadTarget = false;
            mobj.isMobBullet = false;
            mobj.isVertexMode = false;
            mobj.isDropPowerUp = false;
            mobj.showHealthBar = false;
            mobj.isShielded = false;
            mobj.seePlayer = { yes: false, recall: 0 };
            mobj.isAttacking = false;
            mobj.isStatic = true;
            mobj.frictionStatic = Infinity;
            mobj.isBoss = false;
            mobj.isUnblockable = true;
            mobj.damageReduction = 1;
            mobj.locatePlayer = function() { };
            mobj.foundPlayer = function() { };
            mobj.damageScale = function() { return 1; };
            mobj.status = [];
            mobj.shield = false;
            mobj.radius = 40;
            Matter.Body.setStatic(mobj, true);

            // Unkillable health
            mobj.health = 1;
            mobj.maxHealth = 1;
            mobj.fill = "#444";
            mobj.stroke = "#fff";

            // Damage tracking
            mobj.totalDamage = 0;
            mobj.lastDamageTime = 0;
            mobj.damageTexts = [];
            mobj.damageHistory = [];
            mobj.dpsWindowCycles = 8 * 60;

            const resetHealth = (self) => {
                self.health = 1;
                self.alive = true;
            };

            // Override damage to track but not die
            mobj.damage = function(dmg) {
                try {
                    const val = safeNumber(dmg, 0);
                    if (val > 0) {
                        this.totalDamage += val;
                        this.lastDamageTime = simulation.cycle;
                        this.damageHistory.push({ cycle: simulation.cycle, dmg: val });
                        this.damageTexts.push({
                            value: val.toFixed(2),
                            x: this.position.x + (Math.random() - 0.5) * 60,
                            y: this.position.y - 40,
                            life: 60,
                            vy: -2
                        });
                        this.fill = "#f00";
                        const that = this;
                        setTimeout(() => { if (that && that.alive) that.fill = "#444"; }, 100);
                    }
                    resetHealth(this);
                } catch (e) {
                    console.error("Practice Dummy damage error:", e);
                    resetHealth(this);
                }
            };

            mobj.beforeDmg = function() {
                resetHealth(this);
            };

            mobj.onEnd = function() {
                resetHealth(this);
            };

            mobj.onDamage = function(amount) {
                try {
                    const val = safeNumber(amount, 0);
                    if (val > 0) {
                        this.totalDamage += val;
                        this.lastDamageTime = simulation.cycle;
                        this.damageHistory.push({ cycle: simulation.cycle, dmg: val });
                    }
                    resetHealth(this);
                } catch (e) {
                    console.error("Practice Dummy onDamage error:", e);
                    resetHealth(this);
                }
            };

            mobj.death = function() {
                resetHealth(this);
            };

            mobj.do = function() {
                try {
                    Matter.Body.setVelocity(this, { x: 0, y: 0 });
                    Matter.Body.setAngularVelocity(this, 0);
                    resetHealth(this);

                    if (typeof ctx !== 'undefined') {
                        // Floating damage text
                        for (let i = this.damageTexts.length - 1; i >= 0; i--) {
                            const txt = this.damageTexts[i];
                            txt.life--;
                            txt.y += txt.vy;
                            txt.vy += 0.1;
                            if (txt.life <= 0) {
                                this.damageTexts.splice(i, 1);
                            } else {
                                const alpha = Math.min(1, txt.life / 15);
                                ctx.save();
                                ctx.globalAlpha = alpha;
                                ctx.fillStyle = "#fff";
                                ctx.strokeStyle = "#000";
                                ctx.lineWidth = 3;
                                ctx.font = "bold 20px Arial";
                                ctx.textAlign = "center";
                                ctx.strokeText(txt.value, txt.x, txt.y);
                                ctx.fillText(txt.value, txt.x, txt.y);
                                ctx.restore();
                            }
                        }

                        // Total damage
                        ctx.save();
                        ctx.fillStyle = "#fff";
                        ctx.strokeStyle = "#000";
                        ctx.lineWidth = 4;
                        ctx.font = "bold 32px Arial";
                        ctx.textAlign = "center";
                        const text = "Total: " + this.totalDamage.toFixed(1);
                        ctx.strokeText(text, this.position.x, this.position.y - 60);
                        ctx.fillText(text, this.position.x, this.position.y - 60);

                        if (simulation.cycle - this.lastDamageTime < 300) {
                            const cutoff = simulation.cycle - this.dpsWindowCycles;
                            while (this.damageHistory.length && this.damageHistory[0].cycle < cutoff) {
                                this.damageHistory.shift();
                            }
                            let windowDamage = 0;
                            for (let i = 0; i < this.damageHistory.length; i++) {
                                windowDamage += this.damageHistory[i].dmg;
                            }
                            const windowSeconds = this.dpsWindowCycles / 60;
                            const dps = windowSeconds > 0 ? (windowDamage / windowSeconds).toFixed(1) : "0.0";
                            ctx.font = "bold 20px Arial";
                            ctx.strokeText("DPS: " + dps, this.position.x, this.position.y + 70);
                            ctx.fillText("DPS: " + dps, this.position.x, this.position.y + 70);
                        }

                        ctx.font = "bold 16px Arial";
                        ctx.fillStyle = "#aaa";
                        ctx.strokeText("PRACTICE DUMMY", this.position.x, this.position.y + 50);
                        ctx.fillText("PRACTICE DUMMY", this.position.x, this.position.y + 50);
                        ctx.restore();
                    }
                } catch (e) {
                    console.error("Practice Dummy do() error:", e);
                }
            };

            mobj.spawnTime = simulation.cycle;
            mobj.replace = function() { };
            mobj.leaveBody = false;

            Composite.add(engine.world, mobj);
            window.__practiceDummy = mobj;
            console.log("Practice Dummy spawned at", x, y);
            return mobj;
        } catch (e) {
            console.error("Practice Dummy spawn error:", e);
            return null;
        }
    };

    // Spawn one at mouse position immediately
    if (typeof simulation !== 'undefined') {
        const target = simulation.mouseInGame || simulation.mouse;
        spawn.practiceDummy(target.x, target.y);
    }

    window.__practiceDummy = mob[mob.length - 1];

    // Key 0 to teleport
    window.__dummyKeyListener = function(e) {
        if (e.key === '0' && window.__practiceDummy && window.__practiceDummy.alive) {
            try {
                const target = simulation.mouseInGame || simulation.mouse;
                Matter.Body.setPosition(window.__practiceDummy, {
                    x: target.x,
                    y: target.y
                });
                Matter.Body.setVelocity(window.__practiceDummy, { x: 0, y: 0 });
            } catch (err) {
                console.error("Failed to teleport dummy:", err);
            }
        }
    };

    if (window.__dummyKeyListenerRegistered) {
        document.removeEventListener('keydown', window.__dummyKeyListener);
    }
    document.addEventListener('keydown', window.__dummyKeyListener);
    window.__dummyKeyListenerRegistered = true;

    console.log("Practice Dummy Mod loaded. Use spawn.practiceDummy(x, y).");
})();
