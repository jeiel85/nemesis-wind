// src/game.js
// Main 2D Pixel Art RPG Loop + Nemesis System UI Controller

import { PixelSpriteBank } from './sprites.js';
import { RetroAudio } from './audio.js';
import { NemesisEngine, TRIBES } from './nemesis.js';
import { ZONES, buildZoneMap } from './world.js';

const TILE_SIZE = 40;

export class NemesisWindGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.sprites = new PixelSpriteBank();
    this.audio = new RetroAudio();
    this.nemesis = new NemesisEngine();

    this.keys = {};
    this.lastTime = performance.now();
    this.animTick = 0;

    this.player = {
      name: '무휼검객',
      title: '천명(天命)의 방랑자',
      level: 7,
      exp: 0,
      nextExp: 160,
      gold: 500,
      maxHp: 360,
      hp: 360,
      maxMp: 220,
      mp: 220,
      atk: 34,
      x: 13.5,
      y: 12.5,
      dir: 'down',
      speed: 5.2,
      attackCooldown: 0,
      attackAnimTimer: 0,
      skillCooldowns: {
        hellfire: 0,
        shadow: 0,
        nova: 0,
        summon: 0,
        heal: 0,
      },
      equipmentName: '이가닌자의검 +3',
    };

    this.currentZoneId = 'gungnae';
    this.map = null;
    this.grunts = [];
    this.allies = [];
    this.vfx = [];
    this.floatingTexts = [];
    this.activeEncounterCaptain = null;
    this.brokenTargetCaptain = null;
    this.selectedArmyLeaderId = null;

    this.init();
  }

  async init() {
    await this.sprites.loadExternalAssets();
    this.nemesis.initDefaultArmy();
    this.selectedArmyLeaderId = this.nemesis.captains[0]?.id || null;
    this.enterZone('gungnae', 13.5, 12.5);
    this.bindInputs();
    this.bindUI();
    this.updateHUD();
    this.renderArmyModal();
    this.logChat('[안내] 바람의 네메시스: 흉수군단록에 오신 것을 환영합니다!', 'system');
    this.logChat('[안내] 남쪽 포탈로 나가 [국내성 외곽 사냥터]에서 다람쥐와 네메시스 백부장들을 상대하세요.', 'system');
    this.logChat('[팁] 초록색 오라를 띤 [밀정 졸개]를 처치하거나 [E]로 심문하면 백부장의 치명적 약점을 알아낼 수 있습니다!', 'intel');

    requestAnimationFrame((t) => this.loop(t));
  }

  enterZone(zoneId, spawnX = null, spawnY = null) {
    this.currentZoneId = zoneId;
    this.map = buildZoneMap(zoneId);
    this.player.x = spawnX ?? Math.floor(this.map.width / 2) + 0.5;
    this.player.y = spawnY ?? Math.floor(this.map.height / 2) + 0.5;
    this.vfx = [];
    this.allies = [];
    this.spawnZoneEntities(zoneId);

    const zoneBadge = document.getElementById('zoneTitleBadge');
    if (zoneBadge) {
      zoneBadge.textContent = `${this.map.cfg.name} (${this.map.cfg.dangerLevel})`;
    }
    this.logChat(`[지역 이동] '${this.map.cfg.name}'에 진입했습니다. — ${this.map.cfg.subtitle}`, 'system');

    // Chance for a Dead Captain to Cheat Death and ambush the player upon entering a hunting zone!
    if (zoneId !== 'gungnae' && Math.random() < 0.45) {
      const revived = this.nemesis.tryTriggerCheatedDeath(zoneId);
      if (revived) {
        revived.x = Math.min(this.map.width - 3, Math.max(3, this.player.x + 3));
        revived.y = Math.min(this.map.height - 3, Math.max(3, this.player.y + 1));
        this.triggerCaptainBanner(revived, '죽음 극복 (Cheated Death) 기습!');
      }
    }
  }

  spawnZoneEntities(zoneId) {
    this.grunts = [];
    if (zoneId === 'gungnae') return;

    // Position alive Captains/Warchiefs/Overlord belonging to this zone
    const zoneCaptains = this.nemesis.captains.filter((c) => c.alive && c.zone === zoneId);
    const spotOffsets = [
      [8.5, 7.5],
      [24.5, 8.5],
      [16.5, 18.5],
      [26.5, 17.5],
    ];
    zoneCaptains.forEach((cap, i) => {
      const [sx, sy] = spotOffsets[i % spotOffsets.length];
      cap.x = sx;
      cap.y = sy;
      cap.enrageTimer = 0;
    });

    if (zoneId === 'fortress') {
      const warchiefSpots = [
        [9.5, 15.5],
        [17.5, 15.5],
        [25.5, 15.5],
      ];
      this.nemesis.warchiefs.forEach((wc, idx) => {
        if (wc.alive) {
          wc.x = warchiefSpots[idx][0];
          wc.y = warchiefSpots[idx][1];
        }
      });
      if (this.nemesis.overlord && this.nemesis.overlord.alive) {
        this.nemesis.overlord.x = 17.5;
        this.nemesis.overlord.y = 5.5;
      }
    }

    // Spawn Classic Baram Monsters (다람쥐, 토끼, 도깨비 졸개, 밀정 벌레)
    const count = zoneId === 'outskirts' ? 14 : 12;
    for (let i = 0; i < count; i++) {
      const gx = 3 + Math.random() * (this.map.width - 6);
      const gy = 3 + Math.random() * (this.map.height - 6);
      if (this.isTileSolid(gx, gy)) continue;

      let type = 'grunt';
      let name = '흉수 졸개';
      let maxHp = 65;
      let atk = 9;
      let exp = 22;

      if (zoneId === 'outskirts') {
        if (i < 6) {
          type = 'squirrel';
          name = '다람쥐';
          maxHp = 38;
          atk = 5;
          exp = 15;
        } else if (i < 9) {
          type = 'rabbit';
          name = '토끼';
          maxHp = 32;
          atk = 4;
          exp = 12;
        } else if (i < 11) {
          type = 'worm';
          name = '밀정 졸개 (정보원)';
          maxHp = 50;
          atk = 6;
          exp = 25;
        }
      } else {
        if (i < 3) {
          type = 'worm';
          name = '밀정 졸개 (정보원)';
          maxHp = 80;
          atk = 10;
          exp = 35;
        } else {
          type = 'grunt';
          name = zoneId === 'haunted' ? '흉가 망령병' : '혈마 친위병';
          maxHp = zoneId === 'haunted' ? 95 : 135;
          atk = zoneId === 'haunted' ? 14 : 20;
          exp = zoneId === 'haunted' ? 35 : 50;
        }
      }

      this.grunts.push({
        id: `grunt_${Date.now()}_${i}`,
        type,
        name,
        zone: zoneId,
        x: gx,
        y: gy,
        hp: maxHp,
        maxHp,
        atk,
        exp,
        aiTimer: Math.random() * 2,
        vx: 0,
        vy: 0,
        attackCd: 0,
      });
    }
  }

  // Classic 바람의 나라 Easter Egg: "다람쥐를 뿌려라!"
  spawnSquirrelSwarm() {
    for (let i = 0; i < 8; i++) {
      const sx = Math.max(2, Math.min(this.map.width - 3, this.player.x + (Math.random() - 0.5) * 8));
      const sy = Math.max(2, Math.min(this.map.height - 3, this.player.y + (Math.random() - 0.5) * 8));
      this.grunts.push({
        id: `sq_${Date.now()}_${i}`,
        type: 'squirrel',
        name: '폭주 다람쥐',
        zone: this.currentZoneId,
        x: sx,
        y: sy,
        hp: 40,
        maxHp: 40,
        atk: 6,
        exp: 18,
        aiTimer: 0.5,
        vx: 0,
        vy: 0,
        attackCd: 0,
      });
    }
    this.addFloatingText(this.player.x, this.player.y - 1, '다람쥐를 뿌려라!! 🐿️', '#facc15');
    this.logChat('[외침] 넥슨은 다람쥐를 뿌려라!! (주변에 다람쥐 8마리가 출현했습니다!)', 'shout');
  }

  bindInputs() {
    window.addEventListener('keydown', (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        if (e.key === 'Enter') {
          this.handleChatSubmit();
        }
        return;
      }

      const code = e.code;
      this.keys[code] = true;

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        // Only prevent default when canvas or game container is in view
        const rect = this.canvas.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          e.preventDefault();
        }
      }

      if (code === 'Space') this.performBasicAttack();
      if (code === 'Digit1') this.castHellfire();
      if (code === 'Digit2') this.castShadowStrike();
      if (code === 'Digit3') this.castElementalNova();
      if (code === 'Digit4') this.castSummonAlly();
      if (code === 'Digit5') this.castSelfHeal();
      if (code === 'KeyE') this.handleInteractOrDominate();
      if (code === 'KeyN') this.toggleArmyModal();
      if (code === 'KeyT') this.handleAdvanceTime();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  bindUI() {
    document.querySelectorAll('[data-skill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sk = btn.getAttribute('data-skill');
        if (sk === 'melee') this.performBasicAttack();
        if (sk === 'hellfire') this.castHellfire();
        if (sk === 'shadow') this.castShadowStrike();
        if (sk === 'nova') this.castElementalNova();
        if (sk === 'summon') this.castSummonAlly();
        if (sk === 'heal') this.castSelfHeal();
        if (sk === 'interact') this.handleInteractOrDominate();
      });
    });

    document.querySelectorAll('[data-zone-jump]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const z = btn.getAttribute('data-zone-jump');
        this.enterZone(z);
      });
    });

    document.getElementById('btnOpenArmy')?.addEventListener('click', () => this.toggleArmyModal(true));
    document.getElementById('btnCloseArmy')?.addEventListener('click', () => this.toggleArmyModal(false));
    document.getElementById('btnAdvanceTime')?.addEventListener('click', () => this.handleAdvanceTime());
    document.getElementById('btnInterrogateWorm')?.addEventListener('click', () => this.quickInterrogate());
    document.getElementById('btnSquirrelShout')?.addEventListener('click', () => this.spawnSquirrelSwarm());
    document.getElementById('btnMuteAudio')?.addEventListener('click', (e) => {
      const muted = this.audio.toggleMute();
      e.currentTarget.textContent = muted ? '🔇 효과음 켜기' : '🔊 효과음 끄기';
    });

    // Domination Choice Modal buttons
    document.getElementById('btnChoiceDominate')?.addEventListener('click', () => this.resolveBrokenChoice('dominate'));
    document.getElementById('btnChoiceExecute')?.addEventListener('click', () => this.resolveBrokenChoice('execute'));
    document.getElementById('btnChoiceShame')?.addEventListener('click', () => this.resolveBrokenChoice('shame'));
    document.getElementById('btnChoiceClose')?.addEventListener('click', () => {
      document.getElementById('dominationModal')?.classList.add('hidden');
    });

    // Revenge Death Modal close
    document.getElementById('btnRespawnGungnae')?.addEventListener('click', () => {
      document.getElementById('deathRevengeModal')?.classList.add('hidden');
      this.player.hp = this.player.maxHp;
      this.player.mp = this.player.maxMp;
      this.enterZone('gungnae', 13.5, 12.5);
      this.updateHUD();
    });

    // Chat input
    document.getElementById('btnSendChat')?.addEventListener('click', () => this.handleChatSubmit());
  }

  handleChatSubmit() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    this.logChat(`[${this.player.name}] : ${text}`, 'chat');
    if (text.includes('다람쥐')) {
      this.spawnSquirrelSwarm();
    } else if (text.includes('헬파이어')) {
      this.castHellfire();
    } else if (text.includes('군단') || text.includes('네메시스')) {
      this.toggleArmyModal(true);
    }
  }

  isTileSolid(x, y) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (!this.map || ty < 0 || ty >= this.map.height || tx < 0 || tx >= this.map.width) return true;
    return Boolean(this.map.tiles[ty][tx]?.solid);
  }

  getActiveZoneCaptains() {
    if (this.currentZoneId === 'gungnae') return [];
    const caps = this.nemesis.captains.filter((c) => c.alive && c.zone === this.currentZoneId);
    if (this.currentZoneId === 'fortress') {
      const wcs = this.nemesis.warchiefs.filter((w) => w.alive);
      const ov = this.nemesis.overlord && this.nemesis.overlord.alive ? [this.nemesis.overlord] : [];
      return [...caps, ...wcs, ...ov];
    }
    return caps;
  }

  // Find nearest enemy (Grunt or Hostile Captain)
  findNearestHostile(maxRange = 6.5) {
    let best = null;
    let bestDist = maxRange;

    for (const cap of this.getActiveZoneCaptains()) {
      if (cap.dominated) continue;
      const d = Math.hypot(cap.x - this.player.x, cap.y - this.player.y);
      if (d < bestDist) {
        bestDist = d;
        best = { isCaptain: true, ref: cap, dist: d };
      }
    }

    for (const g of this.grunts) {
      if (g.hp <= 0) continue;
      const d = Math.hypot(g.x - this.player.x, g.y - this.player.y);
      if (d < bestDist) {
        bestDist = d;
        best = { isCaptain: false, ref: g, dist: d };
      }
    }

    return best;
  }

  // [Space] 건곤대나이 / 기본 검격
  performBasicAttack() {
    if (this.player.attackCooldown > 0) return;
    this.player.attackCooldown = 0.32;
    this.player.attackAnimTimer = 0.22;
    this.audio.sfxSlash();

    const dirVec = {
      up: [0, -1.2],
      down: [0, 1.2],
      left: [-1.2, 0],
      right: [1.2, 0],
    }[this.player.dir] || [0, 1.2];

    const hitX = this.player.x + dirVec[0];
    const hitY = this.player.y + dirVec[1];
    this.vfx.push({ type: 'slash', x: hitX, y: hitY, timer: 0.2, maxTimer: 0.2 });

    let hitSomething = false;

    // Check Hostile Captains
    for (const cap of this.getActiveZoneCaptains()) {
      if (cap.dominated) continue;
      const d = Math.hypot(cap.x - hitX, cap.y - hitY);
      if (d <= 1.85) {
        hitSomething = true;
        this.damageCaptainWithSkill(cap, 'melee', this.player.atk);
      }
    }

    // Check Grunts
    for (const g of this.grunts) {
      if (g.hp <= 0) continue;
      const d = Math.hypot(g.x - hitX, g.y - hitY);
      if (d <= 1.75) {
        hitSomething = true;
        this.damageGrunt(g, this.player.atk, 'melee');
      }
    }

    if (hitSomething) this.audio.sfxHit();
  }

  // [1] 헬파이어 (Hellfire - Classic 바람의 나라 주술사/검객 필살 화염주!)
  castHellfire() {
    if (this.player.skillCooldowns.hellfire > 0) return;
    if (this.player.mp < 35) {
      this.addFloatingText(this.player.x, this.player.y - 1, '마력이 부족합니다!', '#60a5fa');
      return;
    }

    const target = this.findNearestHostile(7.5);
    if (!target) {
      this.addFloatingText(this.player.x, this.player.y - 1, '사거리 내 대상 없음', '#94a3b8');
      return;
    }

    this.player.mp -= 35;
    this.player.skillCooldowns.hellfire = 2.5;
    this.audio.sfxHellfire();

    const tx = target.ref.x;
    const ty = target.ref.y;
    this.vfx.push({ type: 'hellfire', x: tx, y: ty, timer: 0.65, maxTimer: 0.65 });
    this.logChat(`[시전] "${this.player.name}: 헬파이어를 외웠습니다!!" 🔥`, 'skill');

    const dmg = Math.round(this.player.atk * 2.55);
    if (target.isCaptain) {
      this.damageCaptainWithSkill(target.ref, 'hellfire', dmg);
    } else {
      this.damageGrunt(target.ref, dmg, 'hellfire');
    }
    this.updateHUD();
  }

  // [2] 초혼비무 / 그림자 습격 (Shadow Strike - 순간이동 급습)
  castShadowStrike() {
    if (this.player.skillCooldowns.shadow > 0) return;
    if (this.player.mp < 25) {
      this.addFloatingText(this.player.x, this.player.y - 1, '마력이 부족합니다!', '#60a5fa');
      return;
    }

    const target = this.findNearestHostile(8.5);
    if (!target) {
      this.addFloatingText(this.player.x, this.player.y - 1, '습격할 대상 없음', '#94a3b8');
      return;
    }

    this.player.mp -= 25;
    this.player.skillCooldowns.shadow = 2.0;
    this.audio.sfxShadowStrike();

    this.vfx.push({ type: 'shadow', x: this.player.x, y: this.player.y, timer: 0.35, maxTimer: 0.35 });
    this.player.x = Math.max(2, Math.min(this.map.width - 2, target.ref.x - 0.8));
    this.player.y = Math.max(2, Math.min(this.map.height - 2, target.ref.y));
    this.vfx.push({ type: 'shadow', x: target.ref.x, y: target.ref.y, timer: 0.45, maxTimer: 0.45 });

    const dmg = Math.round(this.player.atk * 1.9);
    if (target.isCaptain) {
      this.damageCaptainWithSkill(target.ref, 'shadow', dmg);
    } else {
      this.damageGrunt(target.ref, dmg, 'shadow');
    }
    this.updateHUD();
  }

  // [3] 삼매진화 / 빙폭풍 (AoE Elemental Blast)
  castElementalNova() {
    if (this.player.skillCooldowns.nova > 0) return;
    if (this.player.mp < 30) {
      this.addFloatingText(this.player.x, this.player.y - 1, '마력이 부족합니다!', '#60a5fa');
      return;
    }

    this.player.mp -= 30;
    this.player.skillCooldowns.nova = 3.0;
    this.audio.sfxFrostNova();
    this.vfx.push({ type: 'nova', x: this.player.x, y: this.player.y, timer: 0.55, maxTimer: 0.55 });
    this.logChat(`[시전] 주변의 적들에게 빙염 폭풍을 방출합니다! ❄️`, 'skill');

    const dmg = Math.round(this.player.atk * 1.8);
    for (const cap of this.getActiveZoneCaptains()) {
      if (cap.dominated) continue;
      if (Math.hypot(cap.x - this.player.x, cap.y - this.player.y) <= 3.8) {
        this.damageCaptainWithSkill(cap, 'nova', dmg);
      }
    }
    for (const g of this.grunts) {
      if (g.hp <= 0) continue;
      if (Math.hypot(g.x - this.player.x, g.y - this.player.y) <= 3.8) {
        this.damageGrunt(g, dmg, 'nova');
      }
    }
    this.updateHUD();
  }

  // [4] 천명 소환: 지배된 경호대장 & 영혼 괴수 소환 (Triggers 'summon' / Beast Fear!)
  castSummonAlly() {
    if (this.player.skillCooldowns.summon > 0) return;
    this.player.skillCooldowns.summon = 5.0;
    this.audio.sfxDominate();

    const bodyguard =
      (this.nemesis.bodyguardId && this.nemesis.getLeaderById(this.nemesis.bodyguardId)) ||
      this.nemesis.captains.find((c) => c.alive && c.dominated);

    const allyName = bodyguard ? `[경호대장] ${bodyguard.fullName}` : '영혼 신수 다람쥐왕';
    this.allies.push({
      name: allyName,
      x: this.player.x + 1.1,
      y: this.player.y + 0.6,
      atk: bodyguard ? bodyguard.atk : Math.round(this.player.atk * 1.1),
      timer: 14,
      attackCd: 0,
    });

    this.addFloatingText(this.player.x, this.player.y - 1.2, `${allyName} 소환!`, '#38bdf8');
    this.logChat(`[천명 소환] '${allyName}'이(가) 전장에 합류하여 적들을 협공합니다!`, 'dominate');

    // Trigger 'summon' weakness/hate on nearby Captains!
    for (const cap of this.getActiveZoneCaptains()) {
      if (cap.dominated) continue;
      if (Math.hypot(cap.x - this.player.x, cap.y - this.player.y) <= 6.5) {
        this.damageCaptainWithSkill(cap, 'summon', Math.round(this.player.atk * 1.2));
      }
    }
  }

  // [5] 공력을운 (Restore HP using MP)
  castSelfHeal() {
    if (this.player.skillCooldowns.heal > 0) return;
    if (this.player.mp < 20) {
      this.addFloatingText(this.player.x, this.player.y - 1, '마력이 부족합니다!', '#60a5fa');
      return;
    }
    this.player.mp -= 20;
    this.player.skillCooldowns.heal = 1.5;
    const healAmt = Math.round(this.player.maxHp * 0.38);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
    this.vfx.push({ type: 'heal', x: this.player.x, y: this.player.y, timer: 0.45, maxTimer: 0.45 });
    this.addFloatingText(this.player.x, this.player.y - 1, `+${healAmt} 공력회복`, '#4ade80');
    this.updateHUD();
  }

  // [E] 상호작용: 주막 회복 / 밀정 심문 / 붕괴(Broken)된 백부장 [낙인·처형·수치] 결단!
  handleInteractOrDominate() {
    // 1. Check if near a Broken Captain!
    for (const cap of this.getActiveZoneCaptains()) {
      if (!cap.dominated && cap.broken && Math.hypot(cap.x - this.player.x, cap.y - this.player.y) <= 3.2) {
        this.openDominationModal(cap);
        return;
      }
    }

    // 2. Check if near an Informant Worm Grunt (밀정 심문)
    for (const g of this.grunts) {
      if (g.hp > 0 && g.type === 'worm' && Math.hypot(g.x - this.player.x, g.y - this.player.y) <= 2.8) {
        g.hp = 0;
        this.quickInterrogate();
        return;
      }
    }

    // 3. Check if near an NPC in Gungnae Hub
    if (this.map?.npcs) {
      for (const npc of this.map.npcs) {
        if (Math.hypot(npc.x - this.player.x, npc.y - this.player.y) <= 2.6) {
          if (npc.action === 'heal') {
            this.player.hp = this.player.maxHp;
            this.player.mp = this.player.maxMp;
            this.audio.sfxLevelUp();
            this.addFloatingText(this.player.x, this.player.y - 1, '주막 국밥: 체력/마력 100% 회복!', '#facc15');
            this.logChat('[왈숙네 주막] 따뜻한 국밥 한 그릇으로 체력과 마력을 모두 회복했습니다!', 'system');
            this.updateHUD();
          } else if (npc.action === 'open_army') {
            this.toggleArmyModal(true);
          }
          return;
        }
      }
    }

    this.addFloatingText(this.player.x, this.player.y - 1, '주변에 제압할 [붕괴] 백부장이나 밀정이 없습니다', '#94a3b8');
  }

  quickInterrogate() {
    const revealed = this.nemesis.interrogateForIntel(this.selectedArmyLeaderId);
    if (revealed) {
      this.audio.sfxDominate();
      this.addFloatingText(this.player.x, this.player.y - 1.2, `밀정 심문: ${revealed.fullName} 약점 파악!`, '#4ade80');
      this.logChat(
        `[밀정 심문] '${revealed.fullName}'의 치명적 약점: [${revealed.weaknesses.map((w) => w.name).join(', ')}]`,
        'intel'
      );
      this.renderArmyModal();
    } else {
      this.logChat('[밀정 심문] 모든 군단 지휘관의 정보가 이미 밝혀졌습니다!', 'intel');
    }
  }

  damageGrunt(grunt, dmg, skillType) {
    grunt.hp -= dmg;
    this.addFloatingText(grunt.x, grunt.y - 0.8, `-${dmg}`, '#f87171');
    if (grunt.hp <= 0) {
      this.grantPlayerRewards(grunt.exp, 15 + Math.floor(Math.random() * 15));
      if (grunt.type === 'worm') {
        this.quickInterrogate();
      }
    }
  }

  damageCaptainWithSkill(captain, skillType, rawDamage) {
    this.activeEncounterCaptain = captain;
    const { damage, events } = this.nemesis.applySkillToCaptain(captain, skillType, rawDamage);

    if (damage > 0) {
      this.addFloatingText(captain.x, captain.y - 1.0, `-${damage}`, skillType === 'hellfire' ? '#fb923c' : '#fef08a');
    } else {
      this.addFloatingText(captain.x, captain.y - 1.0, '면역 / 간파!', '#94a3b8');
    }

    for (const ev of events) {
      this.logChat(ev.text, ev.type);
      if (ev.type === 'broken') {
        this.audio.sfxDominate();
        this.addFloatingText(captain.x, captain.y - 1.5, '의지 붕괴! [E] 제압!', '#4ade80');
      } else if (ev.type === 'enrage') {
        this.audio.sfxNemesisHorn();
        this.addFloatingText(captain.x, captain.y - 1.5, '🔥 격노 폭주!!', '#ef4444');
      }
    }

    this.updateEnemyTargetPanel(captain);
  }

  openDominationModal(captain) {
    this.brokenTargetCaptain = captain;
    const modal = document.getElementById('dominationModal');
    if (!modal) return;

    document.getElementById('domCapName').textContent = `${captain.fullName} (Lv.${captain.level})`;
    document.getElementById('domCapMeta').textContent = `${captain.tribeName} · ${captain.className}${captain.ironWill ? ' · 🛡️ 강철 의지 보유' : ''}`;
    document.getElementById('domCapQuote').textContent = `"${captain.quote}"`;

    const ironWillWarn = document.getElementById('domIronWillNotice');
    if (ironWillWarn) {
      if (captain.ironWill || captain.level > this.player.level + 3) {
        ironWillWarn.classList.remove('hidden');
        ironWillWarn.textContent = captain.ironWill
          ? '⚠️ 이 적은 [강철 의지]를 지녀 바로 지배할 수 없습니다! [수치 부여]로 강철 의지를 파괴하세요!'
          : `⚠️ 적의 레벨(Lv.${captain.level})이 당신(Lv.${this.player.level})보다 너무 높습니다! [수치 부여]로 레벨을 낮추세요!`;
      } else {
        ironWillWarn.classList.add('hidden');
      }
    }

    modal.classList.remove('hidden');
  }

  resolveBrokenChoice(choice) {
    const cap = this.brokenTargetCaptain;
    if (!cap) return;
    const modal = document.getElementById('dominationModal');

    if (choice === 'dominate') {
      const res = this.nemesis.dominateCaptain(cap, this.player.level);
      if (!res.ok) {
        this.audio.sfxShame();
        this.logChat(res.reason, 'enrage');
        alert(res.reason);
        return;
      }
      this.audio.sfxDominate();
      this.logChat(res.message, 'dominate');
      this.addFloatingText(cap.x, cap.y - 1.2, '천명 낙인 완료! (아군화)', '#38bdf8');
      this.grantPlayerRewards(45 + cap.level * 12, 50);
    } else if (choice === 'execute') {
      const res = this.nemesis.executeCaptain(cap, 'execute');
      this.audio.sfxHellfire();
      this.vfx.push({ type: 'hellfire', x: cap.x, y: cap.y, timer: 0.6, maxTimer: 0.6 });
      this.logChat(
        `[처형 집행] '${cap.fullName}' 처단 완료! 전리품 획득: [${res.itemDrop}]`,
        'execute'
      );
      this.player.equipmentName = res.itemDrop;
      this.player.atk += 3;
      this.grantPlayerRewards(res.expReward, res.goldReward);

      if (cap.rank === 'overlord') {
        this.logChat('👑 [혈마성채 정복 달성!] 대군주 아크라카를 쓰러뜨리고 성채의 새로운 주인이 되었습니다!', 'dominate');
      }
    } else if (choice === 'shame') {
      const res = this.nemesis.shameCaptain(cap);
      this.audio.sfxShame();
      this.logChat(res.message, 'shame');
      this.addFloatingText(cap.x, cap.y - 1.2, `수치 부여! (Lv.${cap.level})`, '#e879f9');
      // Teleport shamed captain away so he returns later
      cap.x = 3 + Math.random() * (this.map.width - 6);
      cap.y = 3 + Math.random() * (this.map.height - 6);
    }

    modal?.classList.add('hidden');
    this.brokenTargetCaptain = null;
    this.updateHUD();
    this.updateEnemyTargetPanel(cap.alive ? cap : null);
    this.renderArmyModal();
  }

  grantPlayerRewards(exp, gold) {
    this.player.exp += exp;
    this.player.gold += gold;
    while (this.player.exp >= this.player.nextExp) {
      this.player.exp -= this.player.nextExp;
      this.player.level += 1;
      this.player.nextExp = Math.round(this.player.nextExp * 1.28);
      this.player.maxHp += 42;
      this.player.hp = this.player.maxHp;
      this.player.maxMp += 25;
      this.player.mp = this.player.maxMp;
      this.player.atk += 6;
      this.audio.sfxLevelUp();
      this.addFloatingText(this.player.x, this.player.y - 1.5, `🎉 레벨 업! Lv.${this.player.level}`, '#facc15');
      this.logChat(`[레벨 업!] 경지가 상승하여 Lv.${this.player.level}이(가) 되었습니다! (체력/마력/공격력 상승)`, 'system');
    }
    this.updateHUD();
  }

  // Handle Player Taking Damage -> Bodyguard Savior chance OR Nemesis Revenge Promotion!
  damagePlayer(dmg, attackerEntity) {
    this.player.hp -= dmg;
    this.addFloatingText(this.player.x, this.player.y - 0.9, `-${dmg}`, '#ef4444');

    if (this.player.hp <= 0) {
      // Check for Savior Intervention (구원자 난입: 아군 지배 백부장이 목숨을 구해줌!)
      const savior =
        this.nemesis.bodyguardId &&
        this.nemesis.getLeaderById(this.nemesis.bodyguardId);

      if (savior && savior.alive && savior.dominated && Math.random() < 0.35) {
        this.player.hp = Math.round(this.player.maxHp * 0.5);
        this.audio.sfxDominate();
        this.logChat(
          `⚡ [구원자 난입!] 절체절명의 순간 경호대장 '${savior.fullName}'이(가) 뛰어들어 일격을 막아냈습니다!`,
          'dominate'
        );
        this.addFloatingText(this.player.x, this.player.y - 1.5, `⚡ 구원자 ${savior.name} 난입!`, '#38bdf8');
        if (attackerEntity.isCaptain && attackerEntity.ref) {
          attackerEntity.ref.hp = Math.max(1, attackerEntity.ref.hp - savior.atk * 3);
          attackerEntity.ref.broken = true;
        }
        this.updateHUD();
        return;
      }

      // Trigger Nemesis Promotion & Revenge Modal!
      this.player.hp = 0;
      this.audio.sfxNemesisHorn();
      const outcome = this.nemesis.handlePlayerKilledBy(attackerEntity);
      this.showDeathRevengeModal(outcome);
      this.renderArmyModal();
    }
    this.updateHUD();
  }

  showDeathRevengeModal(outcome) {
    const modal = document.getElementById('deathRevengeModal');
    if (!modal) return;
    document.getElementById('revengeHeadline').textContent = outcome.headline;
    document.getElementById('revengeSubtext').textContent = outcome.subtext;
    document.getElementById('revengeTribeInfo').textContent = `${outcome.captain.tribeName} · ${outcome.captain.className} · 처치 횟수 ${outcome.captain.playerKills}회`;
    modal.classList.remove('hidden');
  }

  triggerCaptainBanner(captain, eventTitle = '네메시스 백부장 조우!') {
    this.audio.sfxNemesisHorn();
    this.activeEncounterCaptain = captain;
    this.updateEnemyTargetPanel(captain);
    this.logChat(`⚔️ [${eventTitle}] ${captain.fullName} (Lv.${captain.level}): "${captain.quote}"`, 'nemesis');
  }

  handleAdvanceTime() {
    const logs = this.nemesis.advanceTime();
    this.audio.sfxNemesisHorn();
    this.spawnZoneEntities(this.currentZoneId);
    this.renderArmyModal();
    if (logs.length === 0) {
      this.logChat('[시간 경과] 군단 내부의 권력 구도가 재편되었습니다.', 'system');
    } else {
      logs.forEach((l) => this.logChat(l, 'nemesis'));
    }
    this.addFloatingText(this.player.x, this.player.y - 1.2, '⏳ 시간 경과: 권력 투쟁 결판!', '#facc15');
  }

  toggleArmyModal(forceState = null) {
    const modal = document.getElementById('armyModal');
    if (!modal) return;
    const isHidden = modal.classList.contains('hidden');
    const shouldShow = forceState !== null ? forceState : isHidden;
    if (shouldShow) {
      this.renderArmyModal();
      modal.classList.remove('hidden');
    } else {
      modal.classList.add('hidden');
    }
  }

  renderArmyModal() {
    const overlordSlot = document.getElementById('armyOverlordSlot');
    const warchiefRow = document.getElementById('armyWarchiefRow');
    const captainGrid = document.getElementById('armyCaptainGrid');
    const strugglesList = document.getElementById('armyStrugglesList');

    if (!overlordSlot || !warchiefRow || !captainGrid) return;

    const createCardHTML = (leader) => {
      const isSelected = leader.id === this.selectedArmyLeaderId;
      const isVendetta = leader.id === this.nemesis.vendettaTargetId;
      const isBodyguard = leader.id === this.nemesis.bodyguardId;
      const tribe = TRIBES[leader.tribeId] || TRIBES.blood;
      const statusBadge = !leader.alive
        ? '<span class="tag tag-dead">☠️ 처단됨</span>'
        : leader.dominated
        ? `<span class="tag tag-dom">✋ 아군 지배${isBodyguard ? ' (경호대장)' : ''}</span>`
        : isVendetta
        ? '<span class="tag tag-vendetta">🩸 복수 대상</span>'
        : `<span class="tag tag-hostile">${tribe.badge} Lv.${leader.level}</span>`;

      return `
        <div class="nemesis-card ${!leader.alive ? 'is-dead' : ''} ${leader.dominated ? 'is-dominated' : ''} ${isSelected ? 'is-selected' : ''}" data-leader-id="${leader.id}">
          <div class="nemesis-card-top">
            <span class="nemesis-rank-label">${leader.rank === 'overlord' ? '👑 대군주' : leader.rank === 'warchief' ? '⚔️ 전투대장' : '🛡️ 백부장'}</span>
            ${statusBadge}
          </div>
          <div class="nemesis-card-name">${leader.fullName}</div>
          <div class="nemesis-card-sub">${leader.tribeName.split(' ')[0]} · ${leader.className.split(' ')[0]}</div>
          <div class="nemesis-card- traits-mini">
            ${
              leader.intelKnown
                ? `<span class="weak-pill">약점: ${leader.weaknesses[0]?.name || '없음'}</span>`
                : `<span class="unknown-pill">❓ 정보 미확인 (밀정 심문 필요)</span>`
            }
          </div>
        </div>
      `;
    };

    if (this.nemesis.overlord) {
      overlordSlot.innerHTML = createCardHTML(this.nemesis.overlord);
    }
    warchiefRow.innerHTML = this.nemesis.warchiefs.map(createCardHTML).join('');
    captainGrid.innerHTML = this.nemesis.captains.map(createCardHTML).join('');

    if (strugglesList) {
      strugglesList.innerHTML =
        this.nemesis.powerStruggles
          .map(
            (ps) => `
          <div class="struggle-item">
            <span class="struggle-badge">${ps.type}</span>
            <span>${ps.desc}</span>
          </div>`
          )
          .join('') || '<div class="struggle-empty">현재 진행 중인 권력 투쟁이 없습니다.</div>';
    }

    document.querySelectorAll('[data-leader-id]').forEach((el) => {
      el.addEventListener('click', () => {
        this.selectedArmyLeaderId = el.getAttribute('data-leader-id');
        this.renderArmyModal();
      });
    });

    this.renderSelectedLeaderInspector();
  }

  renderSelectedLeaderInspector() {
    const box = document.getElementById('leaderInspectorBox');
    if (!box) return;
    const leader = this.nemesis.getLeaderById(this.selectedArmyLeaderId) || this.nemesis.captains[0];
    if (!leader) return;

    const immHTML = leader.intelKnown
      ? leader.immunities.map((i) => `<li class="trait-imm">🛡️ <b>${i.name}</b>: ${i.desc}</li>`).join('') || '<li>없음</li>'
      : '<li>❓ 밀정을 심문하여 면역 정보를 확인하세요</li>';

    const hateHTML = leader.intelKnown
      ? leader.hates.map((h) => `<li class="trait-hate">🔥 <b>${h.name}</b>: ${h.desc}</li>`).join('')
      : '<li>❓ 밀정을 심문하여 격노 조건을 확인하세요</li>';

    const weakHTML = leader.intelKnown
      ? leader.weaknesses.map((w) => `<li class="trait-weak">🎯 <b>${w.name}</b>: ${w.desc}</li>`).join('')
      : '<li>❓ 밀정을 심문하여 치명적 약점을 확인하세요</li>';

    box.innerHTML = `
      <div class="inspector-header">
        <div>
          <div class="inspector-title">${leader.fullName} <span class="lv-chip">Lv.${leader.level}</span></div>
          <div class="inspector-meta">${leader.tribeName} · ${leader.className} · 출몰지: ${ZONES[leader.zone]?.name || '혈마성채'}</div>
        </div>
      </div>
      <blockquote class="inspector-quote">"${leader.quote}"</blockquote>
      <div class="inspector-stats">
        <span>체력: ${leader.hp}/${leader.maxHp}</span>
        <span>공격력: ${leader.atk}</span>
        <span>흉터: ${leader.scars.length ? leader.scars.join(', ') : '없음'}</span>
      </div>
      <div class="inspector-traits">
        <h4>🎯 약점 및 공포 (Weaknesses)</h4>
        <ul>${weakHTML}</ul>
        <h4>🔥 격노 유발 (Enrages)</h4>
        <ul>${hateHTML}</ul>
        <h4>🛡️ 면역 및 특성 (Immunities)</h4>
        <ul>${immHTML}</ul>
      </div>
      <div class="inspector-actions">
        ${
          leader.alive && leader.dominated
            ? `<button id="btnSetBodyguard" class="retro-btn btn-cyan">✋ 경호대장으로 임명 ([4] 소환 시 참전)</button>`
            : ''
        }
        ${
          leader.alive && !leader.intelKnown
            ? `<button id="btnInspectorIntel" class="retro-btn btn-green">🕵️ 밀정 정보 즉시 해독</button>`
            : ''
        }
        ${
          leader.alive
            ? `<button id="btnTrackCaptain" class="retro-btn btn-amber">🧭 출몰 구역으로 즉시 이동</button>`
            : ''
        }
      </div>
    `;

    document.getElementById('btnSetBodyguard')?.addEventListener('click', () => {
      this.nemesis.bodyguardId = leader.id;
      this.logChat(`[경호대장 지정] '${leader.fullName}'을(를) 주군의 경호대장으로 임명했습니다!`, 'dominate');
      this.renderArmyModal();
    });

    document.getElementById('btnInspectorIntel')?.addEventListener('click', () => {
      this.nemesis.interrogateForIntel(leader.id);
      this.renderArmyModal();
    });

    document.getElementById('btnTrackCaptain')?.addEventListener('click', () => {
      this.toggleArmyModal(false);
      this.enterZone(leader.zone);
      this.activeEncounterCaptain = leader;
      this.updateEnemyTargetPanel(leader);
    });
  }

  updateEnemyTargetPanel(captain) {
    const panel = document.getElementById('activeNemesisBanner');
    if (!panel) return;
    if (!captain || !captain.alive) {
      panel.classList.add('hidden');
      return;
    }
    panel.classList.remove('hidden');
    document.getElementById('targetCapName').textContent = `${captain.fullName} (Lv.${captain.level})`;
    document.getElementById('targetCapTribe').textContent = `${captain.tribeName} · ${captain.className}`;
    const hpPct = Math.max(0, Math.min(100, Math.round((captain.hp / captain.maxHp) * 100)));
    document.getElementById('targetCapHpFill').style.width = `${hpPct}%`;
    document.getElementById('targetCapHpText').textContent = `${captain.hp} / ${captain.maxHp}`;

    const tagsEl = document.getElementById('targetCapTraits');
    if (tagsEl) {
      const pills = [];
      if (captain.broken) pills.push('<span class="pill pill-broken">🟢 의지 붕괴 ([E] 제압 가능!)</span>');
      if (captain.enraged) pills.push('<span class="pill pill-enraged">🔥 격노 폭주 중!</span>');
      if (captain.ironWill) pills.push('<span class="pill pill-iron">🛡️ 강철 의지</span>');
      if (captain.intelKnown) {
        captain.weaknesses.forEach((w) => pills.push(`<span class="pill pill-weak">🎯 약점: ${w.name}</span>`));
        captain.immunities.forEach((i) => pills.push(`<span class="pill pill-imm">🚫 ${i.name}</span>`));
      } else {
        pills.push('<span class="pill pill-unknown">❓ 정보 미확인 (밀정 심문 필요)</span>');
      }
      tagsEl.innerHTML = pills.join('');
    }
  }

  updateHUD() {
    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setTxt('hudPlayerName', `${this.player.name} (Lv.${this.player.level})`);
    setTxt('hudPlayerEquip', this.player.equipmentName);
    setTxt('hudHpText', `${this.player.hp} / ${this.player.maxHp}`);
    setTxt('hudMpText', `${this.player.mp} / ${this.player.maxMp}`);
    setTxt('hudExpText', `${this.player.exp} / ${this.player.nextExp}`);
    setTxt('hudGoldText', `${this.player.gold.toLocaleString()} 전`);

    const domCount = this.nemesis.captains.filter((c) => c.alive && c.dominated).length;
    setTxt('hudDomCount', `${domCount} / ${this.nemesis.captains.filter((c) => c.alive).length} 명 지배 중`);

    const hpBar = document.getElementById('hudHpFill');
    if (hpBar) hpBar.style.width = `${Math.max(0, Math.min(100, (this.player.hp / this.player.maxHp) * 100))}%`;
    const mpBar = document.getElementById('hudMpFill');
    if (mpBar) mpBar.style.width = `${Math.max(0, Math.min(100, (this.player.mp / this.player.maxMp) * 100))}%`;
  }

  logChat(text, category = 'system') {
    const box = document.getElementById('retroChatLog');
    if (!box) return;
    const row = document.createElement('div');
    row.className = `chat-line chat-${category}`;
    row.textContent = text;
    box.appendChild(row);
    while (box.children.length > 45) {
      box.removeChild(box.firstChild);
    }
    box.scrollTop = box.scrollHeight;
  }

  addFloatingText(x, y, text, color = '#ffffff') {
    this.floatingTexts.push({ x, y, text, color, timer: 1.15 });
  }

  update(dt) {
    this.animTick += dt;

    // Cooldowns & natural MP regen
    if (this.player.attackCooldown > 0) this.player.attackCooldown = Math.max(0, this.player.attackCooldown - dt);
    if (this.player.attackAnimTimer > 0) this.player.attackAnimTimer = Math.max(0, this.player.attackAnimTimer - dt);
    for (const k of Object.keys(this.player.skillCooldowns)) {
      if (this.player.skillCooldowns[k] > 0) {
        this.player.skillCooldowns[k] = Math.max(0, this.player.skillCooldowns[k] - dt);
      }
    }
    if (this.player.mp < this.player.maxMp) {
      this.player.mp = Math.min(this.player.maxMp, this.player.mp + dt * 4.5);
    }

    // Player Movement
    let dx = 0;
    let dy = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) {
      dy -= 1;
      this.player.dir = 'up';
    }
    if (this.keys['KeyS'] || this.keys['ArrowDown']) {
      dy += 1;
      this.player.dir = 'down';
    }
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
      dx -= 1;
      this.player.dir = 'left';
    }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) {
      dx += 1;
      this.player.dir = 'right';
    }

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      const nx = this.player.x + (dx / len) * this.player.speed * dt;
      const ny = this.player.y + (dy / len) * this.player.speed * dt;
      if (!this.isTileSolid(nx, this.player.y)) this.player.x = nx;
      if (!this.isTileSolid(this.player.x, ny)) this.player.y = ny;

      // Check portals
      for (const p of this.map.portals) {
        if (Math.hypot(this.player.x - p.x, this.player.y - p.y) < 1.15) {
          this.enterZone(p.targetZone);
          return;
        }
      }
    }

    // Update Active Zone Captains AI
    for (const cap of this.getActiveZoneCaptains()) {
      if (cap.enrageTimer > 0) {
        cap.enrageTimer -= dt;
        if (cap.enrageTimer <= 0) cap.enraged = false;
      }

      if (cap.dominated) {
        // Dominated Captains patrol & attack hostile grunts/captains!
        const targetCap = this.getActiveZoneCaptains().find((other) => !other.dominated && other.id !== cap.id);
        if (targetCap) {
          const d = Math.hypot(targetCap.x - cap.x, targetCap.y - cap.y);
          if (d > 1.4 && d < 8) {
            cap.x += ((targetCap.x - cap.x) / d) * 2.2 * dt;
            cap.y += ((targetCap.y - cap.y) / d) * 2.2 * dt;
          }
        }
        continue;
      }

      const distToPlayer = Math.hypot(this.player.x - cap.x, this.player.y - cap.y);
      if (distToPlayer < 6.2) {
        if (this.activeEncounterCaptain !== cap) {
          this.triggerCaptainBanner(cap);
        }
        if (distToPlayer > 1.35) {
          const spd = (cap.broken ? 1.1 : 2.35 * cap.speed) * (cap.enraged ? 1.45 : 1);
          const mx = cap.x + ((this.player.x - cap.x) / distToPlayer) * spd * dt;
          const my = cap.y + ((this.player.y - cap.y) / distToPlayer) * spd * dt;
          if (!this.isTileSolid(mx, cap.y)) cap.x = mx;
          if (!this.isTileSolid(cap.x, my)) cap.y = my;
        } else {
          cap._atkCd = (cap._atkCd || 0) - dt;
          if (cap._atkCd <= 0) {
            cap._atkCd = cap.enraged ? 0.85 : 1.45;
            const dmg = Math.round(cap.atk * (cap.enraged ? 1.4 : 1));
            this.damagePlayer(dmg, { isCaptain: true, id: cap.id, ref: cap, name: cap.fullName });
          }
        }
      }
    }

    // Update Grunts AI
    for (const g of this.grunts) {
      if (g.hp <= 0) continue;
      g.aiTimer -= dt;
      g.attackCd = Math.max(0, g.attackCd - dt);

      const dist = Math.hypot(this.player.x - g.x, this.player.y - g.y);
      if (g.type === 'grunt' && dist < 4.8) {
        if (dist > 1.2) {
          const mx = g.x + ((this.player.x - g.x) / dist) * 2.1 * dt;
          const my = g.y + ((this.player.y - g.y) / dist) * 2.1 * dt;
          if (!this.isTileSolid(mx, g.y)) g.x = mx;
          if (!this.isTileSolid(g.x, my)) g.y = my;
        } else if (g.attackCd <= 0) {
          g.attackCd = 1.6;
          this.damagePlayer(g.atk, { isCaptain: false, type: g.type, name: g.name, zone: g.zone });
        }
      } else {
        if (g.aiTimer <= 0) {
          g.aiTimer = 1.2 + Math.random() * 2;
          const angle = Math.random() * Math.PI * 2;
          g.vx = Math.cos(angle) * 1.1;
          g.vy = Math.sin(angle) * 1.1;
        }
        const mx = g.x + g.vx * dt;
        const my = g.y + g.vy * dt;
        if (!this.isTileSolid(mx, g.y)) g.x = mx;
        if (!this.isTileSolid(g.x, my)) g.y = my;

        // Squirrels fight back if player stands right on them!
        if (g.type === 'squirrel' && dist < 1.1 && g.attackCd <= 0) {
          g.attackCd = 1.9;
          this.damagePlayer(g.atk, { isCaptain: false, type: 'squirrel', name: '분노한 다람쥐', zone: g.zone });
        }
      }
    }

    // Update Summoned Allies
    for (let i = this.allies.length - 1; i >= 0; i--) {
      const a = this.allies[i];
      a.timer -= dt;
      a.attackCd = Math.max(0, a.attackCd - dt);
      if (a.timer <= 0) {
        this.allies.splice(i, 1);
        continue;
      }
      const target = this.findNearestHostile(7.5);
      if (target) {
        const d = Math.hypot(target.ref.x - a.x, target.ref.y - a.y);
        if (d > 1.2) {
          a.x += ((target.ref.x - a.x) / d) * 3.8 * dt;
          a.y += ((target.ref.y - a.y) / d) * 3.8 * dt;
        } else if (a.attackCd <= 0) {
          a.attackCd = 1.1;
          if (target.isCaptain) {
            this.damageCaptainWithSkill(target.ref, 'melee', a.atk);
          } else {
            this.damageGrunt(target.ref, a.atk, 'melee');
          }
        }
      }
    }

    // Update VFX & Floating Texts
    for (let i = this.vfx.length - 1; i >= 0; i--) {
      this.vfx[i].timer -= dt;
      if (this.vfx[i].timer <= 0) this.vfx.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].timer -= dt;
      this.floatingTexts[i].y -= dt * 0.9;
      if (this.floatingTexts[i].timer <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  render() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!this.map) return;

    // Camera centered on Player
    const camX = Math.max(0, Math.min(this.map.width * TILE_SIZE - W, this.player.x * TILE_SIZE - W / 2));
    const camY = Math.max(0, Math.min(this.map.height * TILE_SIZE - H, this.player.y * TILE_SIZE - H / 2));

    ctx.save();
    ctx.translate(-Math.floor(camX), -Math.floor(camY));

    // 1. Draw Tiles
    const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
    const endCol = Math.min(this.map.width - 1, Math.ceil((camX + W) / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
    const endRow = Math.min(this.map.height - 1, Math.ceil((camY + H) / TILE_SIZE));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const tile = this.map.tiles[r][c];
        const img = this.sprites.getTile(tile.type, tile.variant);
        ctx.drawImage(img, c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // 2. Draw Portals
    for (const p of this.map.portals) {
      const px = p.x * TILE_SIZE;
      const py = p.y * TILE_SIZE;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 12px "Pretendard", "Malgun Gothic", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = p.color;
      ctx.fillText(p.label, px, py - 24);
    }

    // 3. Draw Hub NPCs
    for (const npc of this.map.npcs) {
      const nx = npc.x * TILE_SIZE;
      const ny = npc.y * TILE_SIZE;
      ctx.fillStyle = npc.color;
      ctx.fillRect(nx - 12, ny - 12, 24, 24);
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(npc.name, nx, ny - 18);
      ctx.fillStyle = '#fef08a';
      ctx.font = '11px sans-serif';
      ctx.fillText(`[${npc.role}]`, nx, ny - 32);
    }

    const animFrame = Math.floor(this.animTick * 4) % 2;

    // 4. Draw Grunts & Squirrels
    for (const g of this.grunts) {
      if (g.hp <= 0) continue;
      const gx = g.x * TILE_SIZE;
      const gy = g.y * TILE_SIZE;
      const spr = this.sprites.getMonsterSprite(g.type, animFrame);
      ctx.drawImage(spr, gx - 20, gy - 20, 40, 40);

      // HP Bar & Name
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(gx - 18, gy - 27, 36, 5);
      ctx.fillStyle = g.type === 'worm' ? '#4ade80' : '#ef4444';
      ctx.fillRect(gx - 18, gy - 27, 36 * Math.max(0, g.hp / g.maxHp), 5);

      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = g.type === 'worm' ? '#4ade80' : '#e2e8f0';
      ctx.fillText(g.type === 'worm' ? '🕵️ 밀정 졸개 [E]' : g.name, gx, gy - 31);
    }

    // 5. Draw Nemesis Captains / Warchiefs / Overlord
    for (const cap of this.getActiveZoneCaptains()) {
      const cx = cap.x * TILE_SIZE;
      const cy = cap.y * TILE_SIZE;
      const size = cap.rank === 'overlord' ? 56 : cap.rank === 'warchief' ? 50 : 46;
      const spr = this.sprites.getCaptainSprite(cap, animFrame);
      ctx.drawImage(spr, cx - size / 2, cy - size / 2, size, size);

      // Broken / Enraged / Dominated Overhead Status
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px sans-serif';
      if (cap.broken && !cap.dominated) {
        ctx.fillStyle = '#4ade80';
        ctx.fillText('🟢 [의지 붕괴! E키로 낙인/처형/수치]', cx, cy - size / 2 - 24);
      } else if (cap.enraged) {
        ctx.fillStyle = '#ef4444';
        ctx.fillText('🔥 [격노 폭주!!]', cx, cy - size / 2 - 24);
      } else if (cap.dominated) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('✋ [천명 아군 지배]', cx, cy - size / 2 - 24);
      }

      // Captain Nameplate & HP Bar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(cx - 28, cy - size / 2 - 10, 56, 7);
      ctx.fillStyle = cap.dominated ? '#38bdf8' : cap.broken ? '#4ade80' : '#ef4444';
      ctx.fillRect(cx - 28, cy - size / 2 - 10, 56 * Math.max(0, cap.hp / cap.maxHp), 7);

      ctx.fillStyle = cap.dominated ? '#7dd3fc' : '#fef08a';
      ctx.fillText(`${cap.fullName} (Lv.${cap.level})`, cx, cy - size / 2 - 13);
    }

    // 6. Draw Summoned Allies
    for (const a of this.allies) {
      const ax = a.x * TILE_SIZE;
      const ay = a.y * TILE_SIZE;
      const spr = this.sprites.getMonsterSprite('squirrel', animFrame);
      ctx.drawImage(spr, ax - 20, ay - 20, 40, 40);
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(a.name, ax, ay - 24);
    }

    // 7. Draw Player (Goguryeo Wind Warrior)
    const px = this.player.x * TILE_SIZE;
    const py = this.player.y * TILE_SIZE;
    const pSpr = this.sprites.getPlayerSprite(this.player.dir, animFrame, this.player.attackAnimTimer > 0);
    ctx.drawImage(pSpr, px - 22, py - 22, 44, 44);

    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${this.player.name} (Lv.${this.player.level})`, px, py - 26);

    // 8. Draw Classic Baram Spell VFX (헬파이어, 초혼비무, 삼매진화) + Codex CLI effects.png sprite
    for (const fx of this.vfx) {
      const fxX = fx.x * TILE_SIZE;
      const fxY = fx.y * TILE_SIZE;
      const ratio = fx.timer / fx.maxTimer;
      const fxFrame = Math.min(3, Math.floor((1 - ratio) * 4));
      const fxSpr = this.sprites.getEffectSprite(fx.type, fxFrame);

      if (fx.type === 'hellfire') {
        // Dramatic Hellfire Pillar (헬파이어 불기둥 & 벼락!)
        ctx.fillStyle = `rgba(239, 68, 68, ${ratio * 0.75})`;
        ctx.fillRect(fxX - 24, fxY - 140, 48, 155);
        ctx.fillStyle = `rgba(250, 204, 21, ${ratio * 0.9})`;
        ctx.fillRect(fxX - 12, fxY - 140, 24, 155);
        if (fxSpr) ctx.drawImage(fxSpr, fxX - 32, fxY - 32, 64, 64);
      } else if (fx.type === 'shadow') {
        ctx.strokeStyle = `rgba(56, 189, 248, ${ratio})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(fxX, fxY, 32 * (1 - ratio * 0.5), 0, Math.PI * 2);
        ctx.stroke();
        if (fxSpr) ctx.drawImage(fxSpr, fxX - 24, fxY - 24, 48, 48);
      } else if (fx.type === 'nova') {
        ctx.strokeStyle = `rgba(96, 165, 250, ${ratio})`;
        ctx.fillStyle = `rgba(56, 189, 248, ${ratio * 0.3})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(fxX, fxY, 135 * (1 - ratio * 0.6), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (fxSpr) ctx.drawImage(fxSpr, fxX - 36, fxY - 36, 72, 72);
      } else if (fx.type === 'slash') {
        if (fxSpr) ctx.drawImage(fxSpr, fxX - 22, fxY - 22, 44, 44);
        ctx.strokeStyle = `rgba(250, 204, 21, ${ratio})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(fxX, fxY, 22, -0.7, 1.4);
        ctx.stroke();
      } else if (fx.type === 'heal') {
        if (fxSpr) ctx.drawImage(fxSpr, fxX - 22, fxY - 22, 44, 44);
        ctx.strokeStyle = `rgba(74, 222, 128, ${ratio})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(fxX - 20, fxY - 20, 40, 40);
      }
    }

    // 9. Draw Floating Combat Texts
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x * TILE_SIZE, ft.y * TILE_SIZE);
    }

    ctx.restore();
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.nemesisWindGame = new NemesisWindGame();
});
