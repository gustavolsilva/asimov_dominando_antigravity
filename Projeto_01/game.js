/**
 * Space Impact - Mecânica Completa de Jogo (Nokia 3310 Classic)
 * Resolução Virtual: 84 x 48 (Escala 4x = 336 x 192)
 */

class SpaceImpactGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Resolução virtual clássica do Nokia 3310
    this.virtualWidth = 84;
    this.virtualHeight = 48;
    this.scale = 4; // 84 * 4 = 336, 48 * 4 = 192

    // Estados do Jogo: 'MENU', 'PLAYING', 'PAUSED', 'BOSS_ALERT', 'STAGE_CLEAR', 'GAME_OVER'
    this.state = 'MENU';
    
    // Configurações do Jogador
    this.player = {
      x: 6,
      y: 20,
      width: 14,
      height: 9,
      speed: 1.2,
      lives: 3,
      maxLives: 4,
      weaponLevel: 1, // 1: Tiro simples, 2: Duplo, 3: Laser contínuo
      missiles: 3,
      shieldTime: 0,
      invulnerableTime: 0,
      shootCooldown: 0,
      engineFrame: 0
    };

    // Coleções de entidades
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.pickups = [];
    this.particles = [];
    this.stars = [];

    // Sistema de Pontuação e Fases
    this.score = 0;
    this.hiScore = parseInt(localStorage.getItem('space_impact_hiscore') || '3500', 10);
    this.stage = 1;
    this.stageProgress = 0;
    this.stageLength = 1200; // frames até o chefe
    this.boss = null;
    this.bossAlertTimer = 0;
    this.stageClearTimer = 0;

    // Entradas do teclado
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false,
      missile: false,
      bomb: false
    };

    // Controle de tempo de frames
    this.lastTime = 0;
    this.engineTimer = 0;

    // Temas de LCD disponíveis
    this.themes = [
      { id: 'default', name: 'Verde Clássico' },
      { id: 'theme-cyan', name: 'Azul Neo' },
      { id: 'theme-amber', name: 'Âmbar Retrô' },
      { id: 'theme-bw', name: 'Preto & Branco' },
      { id: 'theme-matrix', name: 'Matrix Hacker' }
    ];
    this.currentThemeIndex = 0;

    this.initStars();
    this.bindEvents();
    this.updateUI();
    this.startLoop();
  }

  // Gera campo de estrelas em movimento parallax no fundo do LCD
  initStars() {
    this.stars = [];
    for (let i = 0; i < 20; i++) {
      this.stars.push({
        x: Math.random() * this.virtualWidth,
        y: Math.random() * this.virtualHeight,
        speed: 0.15 + Math.random() * 0.4
      });
    }
  }

  // Vincula controles de teclado, toques nos botões do Nokia e UI
  bindEvents() {
    // Teclado físico
    window.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });

    window.addEventListener('keyup', (e) => {
      this.handleKeyUp(e);
    });

    // Botões físicos do Nokia no DOM
    const keyMappings = [
      { id: 'btn-up', action: 'up' },
      { id: 'btn-down', action: 'down' },
      { id: 'key-2', action: 'up' },
      { id: 'key-8', action: 'down' },
      { id: 'key-4', action: 'left' },
      { id: 'key-6', action: 'right' },
      { id: 'key-5', action: 'fire' },
      { id: 'key-star', action: 'missile' },
      { id: 'key-hash', action: 'bomb' },
      { id: 'btn-soft-left', action: 'fire' },
      { id: 'btn-c', action: 'pause' }
    ];

    keyMappings.forEach(mapping => {
      const el = document.getElementById(mapping.id);
      if (!el) return;

      const triggerStart = (ev) => {
        ev.preventDefault();
        el.classList.add('active-press');
        if (mapping.action === 'pause') {
          this.togglePause();
          return;
        }
        if (this.state === 'MENU' || this.state === 'GAME_OVER' || this.state === 'STAGE_CLEAR') {
          if (mapping.action === 'fire' || mapping.action === 'up' || mapping.action === 'down') {
            this.startGame();
            return;
          }
        }
        this.keys[mapping.action] = true;
      };

      const triggerEnd = (ev) => {
        ev.preventDefault();
        el.classList.remove('active-press');
        if (mapping.action !== 'pause') {
          this.keys[mapping.action] = false;
        }
      };

      el.addEventListener('mousedown', triggerStart);
      el.addEventListener('mouseup', triggerEnd);
      el.addEventListener('mouseleave', triggerEnd);
      el.addEventListener('touchstart', triggerStart, { passive: false });
      el.addEventListener('touchend', triggerEnd, { passive: false });
    });

    // Botão de alternar tema do LCD
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.cycleTheme();
      });
    }

    // Botão de Áudio ON/OFF
    const audioBtn = document.getElementById('audio-toggle-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const isAudioOn = window.retroAudio.toggleMute();
        const icon = document.getElementById('audio-icon');
        const text = document.getElementById('audio-status');
        if (icon && text) {
          icon.textContent = isAudioOn ? '🔊' : '🔇';
          text.textContent = isAudioOn ? 'ON' : 'MUDO';
        }
      });
    }

    // Botão de Ajuda
    const helpBtn = document.getElementById('help-btn');
    const modalHelp = document.getElementById('modal-help');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const startModalBtn = document.getElementById('btn-start-game');

    if (helpBtn && modalHelp) {
      helpBtn.addEventListener('click', () => {
        modalHelp.classList.remove('hidden');
      });
    }
    if (closeModalBtn && modalHelp) {
      closeModalBtn.addEventListener('click', () => {
        modalHelp.classList.add('hidden');
      });
    }
    if (startModalBtn && modalHelp) {
      startModalBtn.addEventListener('click', () => {
        modalHelp.classList.add('hidden');
        if (this.state === 'MENU' || this.state === 'GAME_OVER') {
          this.startGame();
        }
      });
    }

    // Ações Rápidas na Sidebar
    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.startGame();
      });
    }

    const demoSoundBtn = document.getElementById('btn-demo-sound');
    if (demoSoundBtn) {
      demoSoundBtn.addEventListener('click', () => {
        window.retroAudio.playNokiaTune();
      });
    }
  }

  cycleTheme() {
    this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
    const current = this.themes[this.currentThemeIndex];
    
    // Remove todas as classes de temas anteriores do body
    document.body.classList.remove('theme-cyan', 'theme-amber', 'theme-bw', 'theme-matrix');
    if (current.id !== 'default') {
      document.body.classList.add(current.id);
    }
    const themeName = document.getElementById('theme-name');
    if (themeName) themeName.textContent = current.name;
    window.retroAudio.playTone(800, 0.04, 'square', 0.1);
  }

  handleKeyDown(e) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }

    if (this.state === 'MENU' || this.state === 'GAME_OVER') {
      if (['Space', 'Enter', 'Numpad5', 'Digit5', 'KeyZ', 'KeyX'].includes(e.code)) {
        this.startGame();
        return;
      }
    }

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
      case 'Numpad8':
      case 'Numpad2':
      case 'Digit2':
        this.keys.up = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
      case 'Digit8':
        this.keys.down = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
      case 'Numpad4':
      case 'Digit4':
        this.keys.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
      case 'Numpad6':
      case 'Digit6':
        this.keys.right = true;
        break;
      case 'Space':
      case 'Numpad5':
      case 'Digit5':
      case 'KeyZ':
        this.keys.fire = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyX':
        this.keys.missile = true;
        break;
      case 'KeyB':
      case 'KeyC':
        if (e.code === 'KeyC') {
          this.togglePause();
        } else {
          this.keys.bomb = true;
        }
        break;
      case 'KeyP':
        this.togglePause();
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
      case 'Numpad8':
      case 'Numpad2':
      case 'Digit2':
        this.keys.up = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
      case 'Digit8':
        this.keys.down = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
      case 'Numpad4':
      case 'Digit4':
        this.keys.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
      case 'Numpad6':
      case 'Digit6':
        this.keys.right = false;
        break;
      case 'Space':
      case 'Numpad5':
      case 'Digit5':
      case 'KeyZ':
        this.keys.fire = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyX':
        this.keys.missile = false;
        break;
      case 'KeyB':
        this.keys.bomb = false;
        break;
    }
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      window.retroAudio.playTone(300, 0.08, 'square');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      window.retroAudio.playTone(600, 0.08, 'square');
    }
  }

  startGame() {
    this.state = 'PLAYING';
    this.score = 0;
    this.stage = 1;
    this.stageProgress = 0;
    this.boss = null;
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.pickups = [];
    this.particles = [];

    this.player.x = 6;
    this.player.y = 20;
    this.player.lives = 3;
    this.player.weaponLevel = 1;
    this.player.missiles = 3;
    this.player.shieldTime = 0;
    this.player.invulnerableTime = 60; // 1s invulnerável no início
    this.player.shootCooldown = 0;

    const overlay = document.getElementById('overlay-screen');
    if (overlay) overlay.classList.add('hidden');

    window.retroAudio.playTone(523.25, 0.1, 'square', 0.2);
    setTimeout(() => window.retroAudio.playTone(659.25, 0.15, 'square', 0.2), 120);

    this.updateUI();
  }

  // Loop de Animação e Lógica
  startLoop() {
    const loop = (timestamp) => {
      this.update();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update() {
    // Atualiza estrelas de fundo
    this.stars.forEach(star => {
      star.x -= star.speed;
      if (star.x < 0) {
        star.x = this.virtualWidth;
        star.y = Math.random() * this.virtualHeight;
      }
    });

    if (this.state === 'PAUSED') return;

    if (this.state === 'BOSS_ALERT') {
      this.bossAlertTimer--;
      if (this.bossAlertTimer <= 0) {
        this.spawnBoss();
        this.state = 'PLAYING';
      }
      return;
    }

    if (this.state === 'STAGE_CLEAR') {
      this.stageClearTimer--;
      if (this.stageClearTimer <= 0) {
        this.nextStage();
      }
      return;
    }

    if (this.state !== 'PLAYING') return;

    // Atualiza jogador
    this.updatePlayer();

    // Atualiza projéteis
    this.updateBullets();

    // Spawns e inteligência dos inimigos
    this.updateEnemies();

    // Atualiza itens coletáveis
    this.updatePickups();

    // Atualiza partículas de explosão
    this.updateParticles();

    // Progresso da fase
    if (!this.boss) {
      this.stageProgress++;
      if (this.stageProgress >= this.stageLength) {
        this.triggerBossAlert();
      }
    } else {
      this.updateBoss();
    }
  }

  updatePlayer() {
    const p = this.player;

    // Movimentação
    if (this.keys.up && p.y > 6) p.y -= p.speed;
    if (this.keys.down && p.y < this.virtualHeight - p.height - 1) p.y += p.speed;
    if (this.keys.left && p.x > 1) p.x -= p.speed;
    if (this.keys.right && p.x < this.virtualWidth - p.width - 12) p.x += p.speed;

    // Animação de propulsão
    this.engineTimer++;
    if (this.engineTimer % 6 === 0) {
      p.engineFrame = (p.engineFrame + 1) % 2;
    }

    // Cooldowns
    if (p.shootCooldown > 0) p.shootCooldown--;
    if (p.invulnerableTime > 0) p.invulnerableTime--;
    if (p.shieldTime > 0) p.shieldTime--;

    // Disparos Primários
    if (this.keys.fire && p.shootCooldown <= 0) {
      this.firePrimaryBullet();
      p.shootCooldown = p.weaponLevel === 3 ? 8 : 11;
    }

    // Disparo de Míssil Especial
    if (this.keys.missile && p.missiles > 0) {
      this.fireSpecialMissile();
      this.keys.missile = false;
    }

    // Uso de Bomba de Pulso Cósmico
    if (this.keys.bomb) {
      this.fireCosmicBomb();
      this.keys.bomb = false;
    }
  }

  firePrimaryBullet() {
    const p = this.player;
    window.retroAudio.shoot();

    if (p.weaponLevel === 1) {
      // Tiro único
      this.bullets.push({
        x: p.x + p.width,
        y: p.y + 4,
        type: 'standard',
        vx: 3,
        vy: 0,
        damage: 1,
        width: 3,
        height: 1
      });
    } else if (p.weaponLevel === 2) {
      // Tiro duplo
      this.bullets.push({
        x: p.x + p.width,
        y: p.y + 2,
        type: 'standard',
        vx: 3.2,
        vy: 0,
        damage: 1,
        width: 3,
        height: 1
      });
      this.bullets.push({
        x: p.x + p.width,
        y: p.y + 6,
        type: 'standard',
        vx: 3.2,
        vy: 0,
        damage: 1,
        width: 3,
        height: 1
      });
    } else {
      // Feixe de Laser de Alto Dano
      window.retroAudio.laser();
      this.bullets.push({
        x: p.x + p.width,
        y: p.y + 4,
        type: 'laser',
        vx: 4.5,
        vy: 0,
        damage: 3,
        piercing: true,
        width: 7,
        height: 1
      });
    }
  }

  fireSpecialMissile() {
    const p = this.player;
    p.missiles--;
    window.retroAudio.missile();
    this.updateUI();

    this.bullets.push({
      x: p.x + p.width,
      y: p.y + 3,
      type: 'missile',
      vx: 2.8,
      vy: 0,
      damage: 8,
      piercing: true,
      width: 4,
      height: 3
    });
  }

  fireCosmicBomb() {
    if (this.player.missiles < 2) return;
    this.player.missiles -= 2;
    window.retroAudio.bomb();
    this.updateUI();

    // Elimina todos os projéteis inimigos na tela e causa dano massivo em todos os inimigos
    this.enemyBullets = [];
    this.enemies.forEach(enemy => {
      enemy.hp -= 15;
      this.createExplosion(enemy.x, enemy.y, 'medium');
    });

    if (this.boss) {
      this.boss.hp -= 20;
    }

    // Flash na tela
    this.flashScreen();
  }

  flashScreen() {
    this.screenFlash = 5;
  }

  updateBullets() {
    // Projéteis do jogador
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      // Colisão com inimigos
      let bulletRemoved = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (this.checkCollision(b, enemy)) {
          enemy.hp -= b.damage;
          enemy.hitBlink = 3;
          window.retroAudio.hit();

          if (!b.piercing) {
            this.bullets.splice(i, 1);
            bulletRemoved = true;
          }

          if (enemy.hp <= 0) {
            this.destroyEnemy(enemy, j);
          }
          break;
        }
      }

      // Colisão com o Chefe
      if (!bulletRemoved && this.boss && this.checkCollision(b, this.boss)) {
        this.boss.hp -= b.damage;
        this.boss.hitBlink = 3;
        window.retroAudio.hit();
        if (!b.piercing) {
          this.bullets.splice(i, 1);
          bulletRemoved = true;
        }
        if (this.boss.hp <= 0) {
          this.defeatBoss();
        }
      }

      // Fora da tela
      if (!bulletRemoved && b.x > this.virtualWidth + 10) {
        this.bullets.splice(i, 1);
      }
    }

    // Projéteis inimigos
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      eb.x += eb.vx;
      eb.y += eb.vy;

      // Colisão com o jogador
      if (this.checkCollision(eb, this.player)) {
        this.enemyBullets.splice(i, 1);
        this.damagePlayer();
        continue;
      }

      if (eb.x < -10 || eb.y < -5 || eb.y > this.virtualHeight + 5) {
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  updateEnemies() {
    // Gerador de ondas de inimigos
    if (!this.boss && Math.random() < 0.035) {
      this.spawnEnemy();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.x += e.vx;
      e.y += e.vy;

      if (e.hitBlink > 0) e.hitBlink--;

      // Movimentação senoidal para scouts
      if (e.type === 'scout') {
        e.oscillation = (e.oscillation || 0) + 0.08;
        e.y += Math.sin(e.oscillation) * 0.5;
      }

      // Lógica de tiro do Gunner
      if (e.type === 'gunner') {
        e.shootTimer = (e.shootTimer || 0) + 1;
        if (e.shootTimer % 75 === 0) {
          this.enemyBullets.push({
            x: e.x - 2,
            y: e.y + 4,
            vx: -1.8,
            vy: 0,
            width: 2,
            height: 2,
            type: 'plasma'
          });
          window.retroAudio.playTone(380, 0.05, 'square', 0.1);
        }
      }

      // Colisão com o jogador
      if (this.checkCollision(e, this.player)) {
        this.destroyEnemy(e, i);
        this.damagePlayer();
        continue;
      }

      // Saiu da tela
      if (e.x < -20) {
        this.enemies.splice(i, 1);
      }
    }
  }

  spawnEnemy() {
    const rand = Math.random();
    let type = 'scout';
    let hp = 1;
    let scoreVal = 50;
    let width = 9;
    let height = 7;
    let vx = -0.9 - Math.random() * 0.4;
    let vy = 0;

    if (rand < 0.45) {
      // Scout Fly
      type = 'scout';
      hp = 1;
      scoreVal = 50;
    } else if (rand < 0.75) {
      // Squid
      type = 'squid';
      width = 10;
      height = 8;
      hp = 2;
      scoreVal = 100;
      vx = -0.7;
    } else if (rand < 0.90) {
      // Gunner
      type = 'gunner';
      width = 13;
      height = 9;
      hp = 4;
      scoreVal = 200;
      vx = -0.5;
    } else {
      // Asteroid
      type = 'asteroid';
      width = 10;
      height = 10;
      hp = 6;
      scoreVal = 80;
      vx = -0.6;
    }

    const y = 8 + Math.random() * (this.virtualHeight - height - 12);
    this.enemies.push({
      x: this.virtualWidth + 5,
      y: y,
      type: type,
      width: width,
      height: height,
      hp: hp,
      maxHp: hp,
      vx: vx,
      vy: vy,
      scoreValue: scoreVal,
      hitBlink: 0
    });
  }

  destroyEnemy(enemy, index) {
    this.enemies.splice(index, 1);
    this.score += enemy.scoreValue;
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      localStorage.setItem('space_impact_hiscore', this.hiScore);
    }
    this.updateUI();

    window.retroAudio.explosion();
    this.createExplosion(enemy.x, enemy.y, 'medium');

    // Chance de dropar power-up (15%)
    if (Math.random() < 0.16) {
      this.spawnPickup(enemy.x, enemy.y);
    }
  }

  spawnPickup(x, y) {
    const types = ['life', 'shield', 'laser', 'missile'];
    const pType = types[Math.floor(Math.random() * types.length)];
    this.pickups.push({
      x: x,
      y: y,
      type: pType,
      vx: -0.4,
      width: 8,
      height: 8
    });
  }

  updatePickups() {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.x += p.vx;

      if (this.checkCollision(p, this.player)) {
        this.collectPickup(p);
        this.pickups.splice(i, 1);
        continue;
      }

      if (p.x < -10) {
        this.pickups.splice(i, 1);
      }
    }
  }

  collectPickup(pickup) {
    window.retroAudio.powerup();
    this.score += 150;
    this.updateUI();

    switch (pickup.type) {
      case 'life':
        if (this.player.lives < this.player.maxLives) this.player.lives++;
        break;
      case 'shield':
        this.player.shieldTime = 300; // 5 segundos
        break;
      case 'laser':
        if (this.player.weaponLevel < 3) this.player.weaponLevel++;
        break;
      case 'missile':
        this.player.missiles += 2;
        break;
    }
  }

  damagePlayer() {
    const p = this.player;
    if (p.shieldTime > 0) {
      window.retroAudio.hit();
      return;
    }
    if (p.invulnerableTime > 0) return;

    p.lives--;
    p.invulnerableTime = 60; // 1 segundo invulnerável
    window.retroAudio.hit();
    this.createExplosion(p.x, p.y, 'small');
    this.flashScreen();
    this.updateUI();

    if (p.lives <= 0) {
      this.gameOver();
    }
  }

  // ALERTA E SPAWN DE CHEFÃO
  triggerBossAlert() {
    this.state = 'BOSS_ALERT';
    this.bossAlertTimer = 140;
    window.retroAudio.bossWarning();
  }

  spawnBoss() {
    this.boss = {
      x: this.virtualWidth + 10,
      y: 12,
      targetX: this.virtualWidth - 36,
      width: 32,
      height: 22,
      hp: 60 + this.stage * 20,
      maxHp: 60 + this.stage * 20,
      vy: 0.4,
      attackTimer: 0,
      hitBlink: 0
    };
  }

  updateBoss() {
    const b = this.boss;
    if (!b) return;

    if (b.hitBlink > 0) b.hitBlink--;

    // Entrada suave
    if (b.x > b.targetX) {
      b.x -= 0.5;
      return;
    }

    // Movimentação vertical
    b.y += b.vy;
    if (b.y <= 6 || b.y >= this.virtualHeight - b.height - 2) {
      b.vy = -b.vy;
    }

    // Padrão de Ataque
    b.attackTimer++;
    if (b.attackTimer % 50 === 0) {
      // Disparo em leque (3 projéteis)
      this.enemyBullets.push({ x: b.x - 2, y: b.y + 6, vx: -1.6, vy: -0.4, width: 2, height: 2 });
      this.enemyBullets.push({ x: b.x - 2, y: b.y + 11, vx: -1.8, vy: 0, width: 2, height: 2 });
      this.enemyBullets.push({ x: b.x - 2, y: b.y + 16, vx: -1.6, vy: 0.4, width: 2, height: 2 });
      window.retroAudio.playTone(320, 0.08, 'square', 0.15);
    }

    // Invocação de minas ou scouts pelo chefe (fase de fúria HP < 40%)
    if (b.hp < b.maxHp * 0.4 && b.attackTimer % 110 === 0) {
      this.enemies.push({
        x: b.x,
        y: b.y + 10,
        type: 'squid',
        width: 10,
        height: 8,
        hp: 1,
        vx: -1.2,
        vy: (Math.random() - 0.5) * 0.8,
        scoreValue: 50,
        hitBlink: 0
      });
    }

    // Colisão direta do chefe com jogador
    if (this.checkCollision(b, this.player)) {
      this.damagePlayer();
    }
  }

  defeatBoss() {
    this.score += 2000 * this.stage;
    this.updateUI();
    window.retroAudio.stageVictory();

    // Série de explosões
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        if (this.boss) {
          this.createExplosion(
            this.boss.x + Math.random() * this.boss.width,
            this.boss.y + Math.random() * this.boss.height,
            'medium'
          );
        }
      }, i * 150);
    }

    setTimeout(() => {
      this.boss = null;
      this.state = 'STAGE_CLEAR';
      this.stageClearTimer = 160;
    }, 1300);
  }

  nextStage() {
    this.stage++;
    this.stageProgress = 0;
    this.player.lives = Math.min(this.player.lives + 1, this.player.maxLives);
    this.player.missiles += 2;
    this.state = 'PLAYING';
    this.updateUI();
  }

  gameOver() {
    this.state = 'GAME_OVER';
    window.retroAudio.gameOver();
    const overlay = document.getElementById('overlay-screen');
    const hiScoreVal = document.getElementById('hi-score-val');
    if (hiScoreVal) hiScoreVal.textContent = String(this.hiScore).padStart(5, '0');
    if (overlay) overlay.classList.remove('hidden');
    this.updateUI();
  }

  createExplosion(x, y, size = 'small') {
    this.particles.push({
      x: x,
      y: y,
      frame: 1,
      timer: 0,
      size: size
    });
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.timer++;
      if (p.timer % 4 === 0) {
        p.frame++;
        if (p.frame > 4) {
          this.particles.splice(i, 1);
        }
      }
    }
  }

  checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  // ATUALIZAÇÃO DA INTERFACE DOM
  updateUI() {
    const scoreEl = document.getElementById('ui-score');
    const stageEl = document.getElementById('ui-stage');
    const enemiesEl = document.getElementById('ui-enemies-left');
    const missilesEl = document.getElementById('ui-missiles');
    const hiscoreEl = document.getElementById('ui-hiscore');

    if (scoreEl) scoreEl.textContent = String(this.score).padStart(5, '0');
    if (stageEl) stageEl.textContent = `FASE ${this.stage}`;
    if (hiscoreEl) hiscoreEl.textContent = String(this.hiScore).padStart(5, '0');
    if (missilesEl) missilesEl.textContent = `🚀 x${this.player.missiles}`;

    if (enemiesEl) {
      if (this.boss) {
        const hpPercent = Math.max(0, Math.floor((this.boss.hp / this.boss.maxHp) * 100));
        enemiesEl.textContent = `CHEFE ${hpPercent}%`;
      } else {
        const progPercent = Math.min(100, Math.floor((this.stageProgress / this.stageLength) * 100));
        enemiesEl.textContent = `${progPercent}%`;
      }
    }
  }

  // ===================================================================
  // RENDERIZAÇÃO RETRÔ NO CANVAS
  // ===================================================================
  render() {
    const ctx = this.ctx;
    const s = this.scale;

    // Limpa a tela com a cor de fundo do LCD
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Efeito de Flash na tela
    if (this.screenFlash && this.screenFlash > 0) {
      this.screenFlash--;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    // Cor do pixel LCD
    const pixelColor = getComputedStyle(document.body).getPropertyValue('--lcd-pixel').trim() || '#16240d';
    ctx.fillStyle = pixelColor;

    // 1. Linha de Status Superior (HUD dentro do LCD)
    this.renderHUD(ctx, s, pixelColor);

    // 2. Estrelas no Espaço
    this.stars.forEach(star => {
      ctx.fillRect(Math.floor(star.x * s), Math.floor(star.y * s), s, s);
    });

    // 3. Projéteis
    this.bullets.forEach(b => {
      if (b.type === 'laser') {
        window.drawSprite(ctx, window.SPRITES.bulletLaser, b.x * s, b.y * s, s, pixelColor);
      } else if (b.type === 'missile') {
        window.drawSprite(ctx, window.SPRITES.bulletMissile, b.x * s, b.y * s, s, pixelColor);
      } else {
        window.drawSprite(ctx, window.SPRITES.bulletPlayer, b.x * s, b.y * s, s, pixelColor);
      }
    });

    this.enemyBullets.forEach(eb => {
      window.drawSprite(ctx, window.SPRITES.bulletEnemy, eb.x * s, eb.y * s, s, pixelColor);
    });

    // 4. Inimigos
    this.enemies.forEach(e => {
      if (e.hitBlink > 0 && e.hitBlink % 2 === 0) return; // Efeito de piscar ao levar dano
      const spriteMatrix = window.SPRITES[e.type] || window.SPRITES.scout;
      window.drawSprite(ctx, spriteMatrix, e.x * s, e.y * s, s, pixelColor);
    });

    // 5. Chefão
    if (this.boss) {
      const b = this.boss;
      if (!(b.hitBlink > 0 && b.hitBlink % 2 === 0)) {
        window.drawSprite(ctx, window.SPRITES.boss1, b.x * s, b.y * s, s, pixelColor);
      }
    }

    // 6. Itens / Power-ups
    this.pickups.forEach(p => {
      let icon = window.SPRITES.itemLaser;
      if (p.type === 'life') icon = window.SPRITES.itemLife;
      if (p.type === 'shield') icon = window.SPRITES.itemShield;
      if (p.type === 'missile') icon = window.SPRITES.itemMissile;
      window.drawSprite(ctx, icon, p.x * s, p.y * s, s, pixelColor);
    });

    // 7. Nave do Jogador (com propulsão e escudo)
    if (this.state === 'PLAYING' || this.state === 'BOSS_ALERT' || this.state === 'PAUSED') {
      const p = this.player;
      const shouldDraw = p.invulnerableTime === 0 || Math.floor(p.invulnerableTime / 4) % 2 === 0;

      if (shouldDraw) {
        // Sprite da Nave
        window.drawSprite(ctx, window.SPRITES.player, p.x * s, p.y * s, s, pixelColor);

        // Fogo da propulsão animado
        const flame = p.engineFrame === 0 ? window.SPRITES.engineFlame1 : window.SPRITES.engineFlame2;
        window.drawSprite(ctx, flame, (p.x - 3) * s, p.y * s, s, pixelColor);

        // Escudo protetor
        if (p.shieldTime > 0) {
          window.drawSprite(ctx, window.SPRITES.shieldRing, (p.x + 1) * s, (p.y + 1) * s, s, pixelColor);
        }
      }
    }

    // 8. Partículas / Explosões
    this.particles.forEach(pt => {
      const explosionFrame = window.SPRITES[`explosion${pt.frame}`] || window.SPRITES.explosion1;
      window.drawSprite(ctx, explosionFrame, pt.x * s, pt.y * s, s, pixelColor);
    });

    // 9. Mensagens de Alerta na Tela
    if (this.state === 'BOSS_ALERT') {
      this.renderBossAlert(ctx, s, pixelColor);
    } else if (this.state === 'STAGE_CLEAR') {
      this.renderStageClear(ctx, s, pixelColor);
    } else if (this.state === 'PAUSED') {
      this.renderPausedText(ctx, s, pixelColor);
    }
  }

  renderHUD(ctx, s, color) {
    ctx.fillStyle = color;
    // Barra superior divisória
    ctx.fillRect(0, 5 * s, this.canvas.width, 1 * s);

    // Vidas (mini naves ou corações)
    for (let i = 0; i < this.player.lives; i++) {
      ctx.fillRect((2 + i * 5) * s, 1 * s, 3 * s, 3 * s);
    }

    // Score compacto no canto superior
    ctx.font = `${6 * s / 4}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(String(this.score).padStart(5, '0'), (this.virtualWidth - 2) * s, 4 * s);

    // Barra de vida do Chefe se presente
    if (this.boss) {
      const bossHpWidth = Math.max(0, Math.floor((this.boss.hp / this.boss.maxHp) * 25));
      ctx.fillRect((this.virtualWidth - 28) * s, 1 * s, 26 * s, 3 * s);
      // Fundo vazado
      ctx.clearRect((this.virtualWidth - 27) * s, 2 * s, 24 * s, 1 * s);
      ctx.fillRect((this.virtualWidth - 27) * s, 2 * s, bossHpWidth * s, 1 * s);
    }
  }

  renderBossAlert(ctx, s, color) {
    if (Math.floor(this.bossAlertTimer / 10) % 2 === 0) {
      ctx.fillStyle = color;
      ctx.font = `${7 * s / 4}px 'Press Start 2P', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText("! ALERTA CHEFE !", (this.virtualWidth / 2) * s, 26 * s);
    }
  }

  renderStageClear(ctx, s, color) {
    ctx.fillStyle = color;
    ctx.font = `${7 * s / 4}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText("FASE COMPLETA!", (this.virtualWidth / 2) * s, 24 * s);
    ctx.font = `${5 * s / 4}px 'Press Start 2P', monospace`;
    ctx.fillText("+ BÔNUS 2000 PTS", (this.virtualWidth / 2) * s, 33 * s);
  }

  renderPausedText(ctx, s, color) {
    ctx.fillStyle = color;
    ctx.font = `${7 * s / 4}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText("PAUSADO", (this.virtualWidth / 2) * s, 26 * s);
  }
}

// Inicia o jogo quando o DOM estiver pronto
window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new SpaceImpactGame();
});
