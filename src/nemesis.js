// src/nemesis.js
// Complete Middle-earth: Shadow of Mordor / Shadow of War Nemesis System Engine
// Set in the dark fantasy Goguryeo/Joseon world of '바람의 나라' (Kingdom of the Winds)

export const TRIBES = {
  blood: {
    id: 'blood',
    name: '혈마족 (Blood Tribe)',
    color: '#ef4444',
    badge: '🩸',
    desc: '피의 저주와 암살검을 다루는 잔혹한 자객 부족',
    bonusTrait: '출혈 검술 (공격 시 추가 피해)',
  },
  fire: {
    id: 'fire',
    name: '화염깨비족 (Fire Dokkaebi)',
    color: '#f97316',
    badge: '🔥',
    desc: '도깨비불과 화약 철퇴로 전장을 불태우는 광전사 부족',
    bonusTrait: '화염 폭발 (주변 화염 피해)',
  },
  necro: {
    id: 'necro',
    name: '해골망령족 (Bone Necro)',
    color: '#a855f7',
    badge: '💀',
    desc: '흉가와 인형굴의 사령술로 죽음을 되살리는 강령술 부족',
    bonusTrait: '사령 저주 (피격 시 마력 흡수)',
  },
  beast: {
    id: 'beast',
    name: '야수사냥족 (Beast Feral)',
    color: '#84cc16',
    badge: '🐗',
    desc: '흉포한 괴수와 다람쥐 무리를 길들여 사냥하는 야수 부족',
    bonusTrait: '괴수 조련 (졸개 소환 강화)',
  },
  iron: {
    id: 'iron',
    name: '기계장인족 (Iron Machine)',
    color: '#38bdf8',
    badge: '⚙️',
    desc: '강철 중갑과 방패로 무장해 정면 돌파를 불허하는 중장갑 부족',
    bonusTrait: '강철 방벽 (받는 물리 피해 감소)',
  },
};

export const CLASSES = [
  { id: 'berserker', name: '광전사 (Berserker)', hpMul: 1.2, atkMul: 1.35, speed: 1.15 },
  { id: 'assassin', name: '암살자 (Assassin)', hpMul: 0.95, atkMul: 1.45, speed: 1.35 },
  { id: 'tank', name: '수호자 (Tank)', hpMul: 1.55, atkMul: 1.0, speed: 0.85 },
  { id: 'commander', name: '지휘관 (Commander)', hpMul: 1.25, atkMul: 1.15, speed: 1.0 },
  { id: 'trickster', name: '교란자 (Trickster)', hpMul: 1.05, atkMul: 1.2, speed: 1.25 },
];

export const BASE_NAMES = [
  '아크골', '그로그', '모즈', '타르크', '우르학', '바르구', '카르카', '드라크',
  '마골', '즈라크', '적귀', '흑치', '혈아', '독안', '광마', '철귀', '야차', '수라'
];

export const TITLES = [
  '도살자', '해골수집가', '뼈파괴자', '그림자추적자', '심장약탈자', '무자비한 자',
  '피비린내', '다람쥐 학살자', '주막 약탈꾼', '국내성 파괴자', '철벽의', '밤의 공포'
];

export const IMMUNITY_POOL = [
  { id: 'imm_fire', name: '화염 면역', desc: '헬파이어 및 화염 술법 피해를 받지 않음', blocks: 'hellfire' },
  { id: 'imm_shadow', name: '그림자 습격 면역', desc: '초혼비무(순간이동 습격)에 면역 및 반격', blocks: 'shadow' },
  { id: 'imm_frost', name: '빙결/삼매 면역', desc: '빙폭풍 및 범위 기절 술법에 면역', blocks: 'nova' },
  { id: 'imm_ranged', name: '철벽 방어', desc: '기본 평타 피해를 40% 경감', blocks: 'melee_reduce' },
];

export const HATE_POOL = [
  { id: 'hate_fire', name: '화염 격노', desc: '화염 공격을 받으면 즉시 [격노] 상태 돌입', trigger: 'hellfire' },
  { id: 'hate_shadow', name: '기습 격노', desc: '초혼비무 피격 시 [격노] 상태 돌입', trigger: 'shadow' },
  { id: 'hate_beasts', name: '야수/소환 격노', desc: '소환수나 다람쥐 군단 등장 시 [격노]', trigger: 'summon' },
  { id: 'hate_wounds', name: '치명상 격노', desc: '체력이 50% 이하로 떨어지면 [격노]', trigger: 'low_hp' },
  { id: 'hate_betrayal', name: '배신자의 광기', desc: '전투 시작 시 일정 확률로 즉시 [격노]', trigger: 'combat_start' },
];

export const WEAKNESS_POOL = [
  { id: 'weak_fire', name: '화염 공포 (치명적 약점)', desc: '헬파이어 피격 시 막대한 피해와 함께 즉시 [붕괴]!', trigger: 'hellfire', fatal: true },
  { id: 'weak_shadow', name: '초혼비무 취약', desc: '그림자 습격(초혼비무)에 2.5배 피해 및 현기증', trigger: 'shadow', fatal: false },
  { id: 'weak_nova', name: '빙결/폭풍 취약', desc: '삼매진화/빙폭풍에 2.2배 피해 및 방어력 붕괴', trigger: 'nova', fatal: false },
  { id: 'weak_beasts', name: '야수/다람쥐 공포 (치명적)', desc: '소환 스킬 사용 시 공포에 질려 즉시 [붕괴]!', trigger: 'summon', fatal: true },
  { id: 'weak_melee', name: '건곤대나이 취약', desc: '근접 연속 베기에 추가 피해 및 경직', trigger: 'melee', fatal: false },
];

export const TAUNTS = {
  intro: [
    '크하하! 고구려의 애송이 검객이 내 앞을 가로막는구나!',
    '네놈의 목을 베어 대군주님께 바치고 전투대장으로 승진하겠다!',
    '국내성 주막에 네놈 시체를 걸어두마! 덤벼라!',
    '바람의 검객? 오늘 네놈의 숨통을 끊어주지!',
  ],
  revenge_player_died: [
    '지난번에 내 손에 죽어놓고 또 기어왔느냐?! 하하하!',
    '내 칼날에 쓰러졌던 패배자 놈이 아직도 정신을 못 차렸군!',
    '네놈 덕분에 내가 승진했다! 보답으로 한 번 더 죽여주마!',
  ],
  cheated_death_fire: [
    '날 불태워 죽였다고 생각했나?! 지옥불 속에서 네놈만 생각하며 기어 올라왔다!',
    '이 화상 자국을 봐라, 검객이여! 네놈의 헬파이어 따위로 날 죽일 순 없다!',
  ],
  cheated_death_normal: [
    '죽음조차 나를 거두지 못했다! 네놈에게 복수하기 위해 되살아났다!',
    '내 시체를 확인하지 않은 것이 네놈 인생 최대의 실수다!',
  ],
  shamed_return: [
    '네놈이 내 얼굴에 남긴 치욕의 낙인... 피로 씻어내겠다!',
    '그날의 굴욕을 잊지 않았다! 반드시 네놈을 갈기갈기 찢어놓으마!',
  ],
  deranged: [
    '다람쥐... 다람쥐가 날 쳐다봐! 우하하하! 다람쥐를 뿌려라!!',
    '아파... 달콤해... 머릿속에서 종소리가 울려! 크히히히!',
    '도토리... 내 도토리 어딨어?! 끼에에엑!!',
  ],
  betrayal: [
    '네놈의 푸른 낙인 아래 종노릇하는 것도 오늘로 끝이다! 죽어라!',
    '나약한 주인은 필요 없다! 이제 내가 이 구역의 지배자다!',
  ],
  dominated_call: [
    '밝은 주인님이 부르신다! 내 목숨을 바쳐 적을 베겠다!',
    '천명의 낙인을 받들어 주군을 수호하겠습니다!',
  ],
};

let nextCaptainUid = 100;

export class NemesisEngine {
  constructor() {
    this.captains = []; // 8 Captain slots (index 0..7)
    this.warchiefs = []; // 3 Warchief slots (index 0..2)
    this.overlord = null; // 1 Overlord slot
    this.powerStruggles = []; // Active duels, feasts, ambushes
    this.graveyard = []; // Recently killed Captains who might Cheat Death!
    this.historyLog = []; // Chronicle of Nemesis events
    this.bodyguardId = null; // Currently assigned Dominated Bodyguard Captain ID
    this.vendettaTargetId = null; // Who killed the player last
  }

  initDefaultArmy() {
    this.captains = [];
    this.warchiefs = [];
    this.graveyard = [];
    this.powerStruggles = [];

    const zones = ['outskirts', 'outskirts', 'outskirts', 'haunted', 'haunted', 'haunted', 'fortress', 'fortress'];
    for (let i = 0; i < 8; i++) {
      const cap = this.generateCaptain({
        slotIndex: i,
        rank: 'captain',
        level: 3 + i * 2,
        zone: zones[i],
        intelKnown: i < 2, // First 2 captains have known intel so player can test weaknesses immediately
      });
      this.captains.push(cap);
    }

    for (let i = 0; i < 3; i++) {
      const wc = this.generateCaptain({
        slotIndex: i,
        rank: 'warchief',
        level: 16 + i * 3,
        zone: 'fortress',
        intelKnown: false,
      });
      // Assign a bodyguard reference from captains
      wc.guards = [this.captains[i * 2]?.id].filter(Boolean);
      this.warchiefs.push(wc);
    }

    this.overlord = this.generateCaptain({
      slotIndex: 0,
      rank: 'overlord',
      level: 25,
      zone: 'fortress',
      name: '혈마대군주 아크라카',
      title: '천마성채의 지배자',
      tribeId: 'blood',
      intelKnown: true,
      ironWill: true,
    });

    this.generatePowerStruggles();
    this.addHistory('천명록 개시: 혈마대군주 아크라카의 군단이 국내성 외곽과 흉가를 점령했습니다.');
  }

  addHistory(text, type = 'nemesis') {
    const time = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.historyLog.unshift({ time, text, type });
    if (this.historyLog.length > 40) this.historyLog.pop();
  }

  pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  generateCaptain(opts = {}) {
    const id = `cap_${++nextCaptainUid}`;
    const tribeKeys = Object.keys(TRIBES);
    const tribeId = opts.tribeId || this.pickRandom(tribeKeys);
    const tribe = TRIBES[tribeId];
    const cls = opts.cls || this.pickRandom(CLASSES);
    const baseName = opts.name || this.pickRandom(BASE_NAMES);
    const title = opts.title || this.pickRandom(TITLES);
    const rank = opts.rank || 'captain';
    const level = Math.max(1, opts.level || 5);

    // Roll traits based on level & rank
    const numImmunities = rank === 'overlord' ? 2 : rank === 'warchief' ? 2 : level >= 10 ? 1 : 0;
    const immunities = [];
    const shuffledImm = [...IMMUNITY_POOL].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numImmunities; i++) immunities.push(shuffledImm[i]);

    const hates = [this.pickRandom(HATE_POOL)];
    if (rank !== 'captain' || level >= 12) {
      const secondHate = this.pickRandom(HATE_POOL);
      if (!hates.some((h) => h.id === secondHate.id)) hates.push(secondHate);
    }

    // Ensure weaknesses don't conflict with immunities
    const validWeaknesses = WEAKNESS_POOL.filter(
      (w) => !immunities.some((imm) => imm.blocks === w.trigger)
    );
    const weaknesses = [this.pickRandom(validWeaknesses.length ? validWeaknesses : WEAKNESS_POOL)];

    const baseHp = Math.round((95 + level * 28) * cls.hpMul * (rank === 'overlord' ? 1.8 : rank === 'warchief' ? 1.35 : 1));
    const baseAtk = Math.round((12 + level * 3.5) * cls.atkMul * (rank === 'overlord' ? 1.35 : 1));

    return {
      id,
      slotIndex: opts.slotIndex ?? 0,
      name: baseName,
      title,
      fullName: `${title} ${baseName}`,
      rank, // 'captain' | 'warchief' | 'overlord'
      level,
      tribeId,
      tribeName: tribe.name,
      classId: cls.id,
      className: cls.name,
      zone: opts.zone || 'outskirts',
      maxHp: baseHp,
      hp: baseHp,
      atk: baseAtk,
      speed: cls.speed,
      immunities,
      hates,
      weaknesses,
      intelKnown: Boolean(opts.intelKnown),
      dominated: Boolean(opts.dominated),
      ironWill: Boolean(opts.ironWill || level >= 15 || rank === 'overlord'),
      deranged: false,
      maniac: false,
      enraged: false,
      enrageTimer: 0,
      broken: false,
      alive: true,
      playerKills: 0,
      timesShamed: 0,
      cheatedDeathCount: 0,
      scars: opts.scars || [],
      skillHitCounters: { hellfire: 0, shadow: 0, nova: 0 },
      adaptedTriggers: [],
      guards: [],
      x: 0,
      y: 0,
      quote: this.pickRandom(TAUNTS.intro),
    };
  }

  getAllActiveLeaders() {
    return [
      ...this.captains.filter((c) => c.alive),
      ...this.warchiefs.filter((w) => w.alive),
      ...(this.overlord && this.overlord.alive ? [this.overlord] : []),
    ];
  }

  getLeaderById(id) {
    return (
      this.captains.find((c) => c.id === id) ||
      this.warchiefs.find((w) => w.id === id) ||
      (this.overlord?.id === id ? this.overlord : null)
    );
  }

  // Reveal intel via Worm Interrogation (밀정 심문)
  interrogateForIntel(preferredCaptainId = null) {
    const unknownPool = [
      ...this.captains.filter((c) => c.alive && !c.intelKnown),
      ...this.warchiefs.filter((w) => w.alive && !w.intelKnown),
    ];
    let target = preferredCaptainId ? this.getLeaderById(preferredCaptainId) : null;
    if (!target || target.intelKnown) {
      target = unknownPool[0] || this.captains.find((c) => c.alive);
    }
    if (!target) return null;

    target.intelKnown = true;
    const weakText = target.weaknesses.map((w) => w.name).join(', ');
    const immText = target.immunities.map((i) => i.name).join(', ') || '없음';
    this.addHistory(`[심문 완료] '${target.fullName}'의 정보 입수! (약점: ${weakText} / 면역: ${immText})`, 'intel');
    return target;
  }

  // Handle combat damage & Nemesis trait triggers (Immunity, Adaptation, Enrage, Fear/Broken)
  applySkillToCaptain(captain, skillType, rawDamage) {
    const events = [];
    if (!captain || !captain.alive) return { damage: 0, events };

    // 1. Check Combat Adaptation (적응 시스템: 같은 기술 4회 연속 사용 시 간파)
    if (['hellfire', 'shadow', 'nova'].includes(skillType)) {
      captain.skillHitCounters[skillType] = (captain.skillHitCounters[skillType] || 0) + 1;
      if (
        captain.skillHitCounters[skillType] >= 4 &&
        !captain.adaptedTriggers.includes(skillType) &&
        !captain.weaknesses.some((w) => w.trigger === skillType)
      ) {
        captain.adaptedTriggers.push(skillType);
        events.push({
          type: 'adapt',
          text: `[전투 적응!] ${captain.fullName}: "같은 술법은 내게 두 번 통하지 않는다!"`,
        });
      }
    }

    if (captain.adaptedTriggers.includes(skillType)) {
      events.push({ type: 'immune', text: `[적응 방어!] ${captain.fullName}이(가) 술법을 간파하고 흘려냈습니다!` });
      return { damage: 0, events };
    }

    // 2. Check Immunities (면역)
    const blockedImm = captain.immunities.find((imm) => imm.blocks === skillType);
    if (blockedImm) {
      captain.intelKnown = true;
      events.push({
        type: 'immune',
        text: `[${blockedImm.name}!] ${captain.fullName}에게 해당 공격이 통하지 않습니다!`,
      });
      return { damage: 0, events };
    }

    let finalDamage = rawDamage;
    if (skillType === 'melee' && captain.immunities.some((i) => i.blocks === 'melee_reduce')) {
      finalDamage = Math.round(rawDamage * 0.6);
    }

    // 3. Check Weaknesses & Fears (약점 & 공포)
    const matchedWeak = captain.weaknesses.find((w) => w.trigger === skillType);
    if (matchedWeak) {
      captain.intelKnown = true;
      finalDamage = Math.round(finalDamage * (matchedWeak.fatal ? 2.8 : 2.1));
      events.push({
        type: 'weakness',
        text: `[약점 적중: ${matchedWeak.name}!] 치명적인 피해를 입혔습니다!`,
      });
      if (matchedWeak.fatal && !captain.broken) {
        captain.broken = true;
        captain.enraged = false;
        events.push({
          type: 'broken',
          text: `[공포 붕괴!] ${captain.fullName}이(가) 극심한 공포에 질려 의지가 꺾였습니다! ([E] 키로 제압 가능)`,
        });
      }
    }

    // 4. Check Hates / Enrages (분노 유발)
    const matchedHate = captain.hates.find((h) => h.trigger === skillType);
    if (matchedHate && !captain.broken) {
      captain.enraged = true;
      captain.enrageTimer = 8;
      events.push({
        type: 'enrage',
        text: `[격노 폭발: ${matchedHate.name}!] ${captain.fullName}의 공격속도와 공격력이 폭증합니다!`,
      });
    }

    // Apply HP loss
    captain.hp = Math.max(1, captain.hp - finalDamage); // Keep at 1 HP until player executes or finishes if Broken, or allow direct kill if already broken
    if (captain.hp <= captain.maxHp * 0.5 && !captain.enraged && !captain.broken) {
      if (captain.hates.some((h) => h.trigger === 'low_hp')) {
        captain.enraged = true;
        captain.enrageTimer = 8;
        events.push({
          type: 'enrage',
          text: `[치명상 격노!] ${captain.fullName}이(가) 피를 흘리며 광기에 휩싸입니다!`,
        });
      }
    }

    if (captain.hp <= captain.maxHp * 0.28 && !captain.broken) {
      captain.broken = true;
      captain.enraged = false;
      events.push({
        type: 'broken',
        text: `[의지 붕괴!] ${captain.fullName}이(가) 무릎을 꿇었습니다! 가까이 가서 [E] 키로 [낙인/처형/수치]를 결정하세요!`,
      });
    }

    return { damage: finalDamage, events };
  }

  // Decision 1: Dominate (낙인 / 지배)
  dominateCaptain(captain, playerLevel) {
    if (captain.ironWill) {
      return {
        ok: false,
        reason: `[강철 의지!] '${captain.fullName}'은(는) 강철 의지를 지녀 지배할 수 없습니다! 먼저 [수치 부여]로 의지를 꺾어야 합니다!`,
      };
    }
    if (captain.level > playerLevel + 3) {
      return {
        ok: false,
        reason: `[레벨 부족!] 적의 레벨(Lv.${captain.level})이 당신(Lv.${playerLevel})보다 너무 높아 지배할 수 없습니다! [수치 부여]로 레벨을 낮추세요!`,
      };
    }

    captain.dominated = true;
    captain.broken = false;
    captain.enraged = false;
    captain.hp = captain.maxHp;
    captain.quote = this.pickRandom(TAUNTS.dominated_call);

    if (!this.bodyguardId && captain.rank === 'captain') {
      this.bodyguardId = captain.id;
    }

    this.addHistory(
      `[천명 낙인] '${captain.fullName}' (Lv.${captain.level})의 영혼을 지배하여 아군 수하로 삼았습니다!`,
      'dominate'
    );
    return {
      ok: true,
      message: `'${captain.fullName}'에게 푸른 손의 낙인을 새겼습니다! 이제 당신을 위해 싸웁니다.`,
    };
  }

  // Decision 2: Execute (처형)
  executeCaptain(captain, killMethod = 'melee') {
    captain.alive = false;
    captain.hp = 0;
    captain.broken = false;
    if (this.bodyguardId === captain.id) this.bodyguardId = null;
    if (this.vendettaTargetId === captain.id) this.vendettaTargetId = null;

    // Store in graveyard for potential "Cheated Death" (죽음 극복)
    this.graveyard.push({
      captain: { ...captain },
      killMethod,
      timestamp: Date.now(),
    });

    this.addHistory(
      `[처형 완료] '${captain.fullName}' (Lv.${captain.level})을(를) 처단했습니다!`,
      'execute'
    );
    return {
      ok: true,
      expReward: 70 + captain.level * 28,
      goldReward: 120 + captain.level * 45,
      itemDrop: `${captain.tribeName.split(' ')[0]}의 비전 호패 (공격력 +${3 + Math.floor(captain.level / 3)})`,
    };
  }

  // Decision 3: Shame (수치 부여 - Worse Than Death / Deranged / Maniac!)
  shameCaptain(captain) {
    captain.timesShamed += 1;
    captain.ironWill = false;
    captain.broken = false;
    captain.enraged = false;
    captain.hp = captain.maxHp;
    if (!captain.scars.includes('shamed')) captain.scars.push('shamed');

    const roll = Math.random();
    if (roll < 0.18 && !captain.maniac) {
      // Maniac! (미치광이 각성: 레벨 대폭 상승!)
      captain.maniac = true;
      captain.deranged = true;
      captain.level += 8;
      captain.maxHp = Math.round(captain.maxHp * 1.45);
      captain.hp = captain.maxHp;
      captain.atk = Math.round(captain.atk * 1.35);
      captain.title = '미치광이';
      captain.fullName = `${captain.title} ${captain.name}`;
      captain.quote = this.pickRandom(TAUNTS.deranged);
      this.addHistory(
        `[광기 폭주: 미치광이!] 수치심에 정신이 붕괴된 '${captain.fullName}'이(가) 오히려 Lv.${captain.level} 미치광이로 폭주했습니다!`,
        'shame'
      );
      return {
        outcome: 'maniac',
        message: `[경고: 미치광이 각성!] 수치의 낙인이 정신을 파괴하여 '${captain.fullName}'(Lv.${captain.level})이(가) 광기 어린 괴물로 폭주했습니다!`,
      };
    } else if (roll < 0.42 && !captain.deranged) {
      // Deranged (정신 붕괴: 다람쥐 타령)
      captain.deranged = true;
      captain.level = Math.max(1, captain.level - 6);
      captain.title = '정신나간';
      captain.fullName = `${captain.title} ${captain.name}`;
      captain.quote = this.pickRandom(TAUNTS.deranged);
      this.addHistory(
        `[정신 붕괴] '${captain.fullName}'이(가) 수치의 낙인을 견디지 못하고 이성을 잃었습니다 (Lv.${captain.level}).`,
        'shame'
      );
      return {
        outcome: 'deranged',
        message: `[정신 붕괴!] '${captain.fullName}'이(가) 이성을 잃고 다람쥐만 찾는 폐인이 되었습니다 (Lv.${captain.level}, 강철 의지 제거됨).`,
      };
    } else {
      captain.level = Math.max(1, captain.level - 5);
      captain.maxHp = Math.max(80, Math.round(captain.maxHp * 0.82));
      captain.hp = captain.maxHp;
      captain.quote = this.pickRandom(TAUNTS.shamed_return);
      this.addHistory(
        `[수치 부여] '${captain.fullName}'의 얼굴에 치욕의 낙인을 새겨 추방했습니다 (Lv.${captain.level}, 강철 의지 제거).`,
        'shame'
      );
      return {
        outcome: 'shamed',
        message: `'${captain.fullName}'에게 수치의 낙인을 새겨 Lv.${captain.level}(으)로 강등시키고 [강철 의지]를 박탈했습니다!`,
      };
    }
  }

  // When Player Dies -> Killer Promotes or Levels Up (복수 & 졸개 승진 시스템!)
  handlePlayerKilledBy(killerEntity) {
    // Case A: Killed by an existing Captain/Warchief/Overlord
    if (killerEntity.isCaptain) {
      const cap = this.getLeaderById(killerEntity.id);
      if (cap) {
        cap.playerKills += 1;
        cap.level += 4;
        cap.maxHp = Math.round(cap.maxHp * 1.25);
        cap.hp = cap.maxHp;
        cap.atk = Math.round(cap.atk * 1.18);
        if (cap.playerKills === 1) {
          cap.title = '검객학살자';
          cap.fullName = `${cap.title} ${cap.name}`;
        } else {
          cap.title = '천하무적';
          cap.fullName = `${cap.title} ${cap.name}`;
        }
        cap.quote = this.pickRandom(TAUNTS.revenge_player_died);
        this.vendettaTargetId = cap.id;
        this.addHistory(
          `[복수 대상 지정] '${cap.fullName}'이(가) 당신을 처치하고 Lv.${cap.level}(으)로 승격했습니다!`,
          'vendetta'
        );
        return {
          promoted: false,
          captain: cap,
          headline: `복수 대상 등극: ${cap.fullName} (Lv.${cap.level})`,
          subtext: `"${cap.quote}"`,
        };
      }
    }

    // Case B: Killed by a Grunt (졸개 or 다람쥐!) -> Promote Grunt into a brand new Captain!
    const deadSlotIdx = this.captains.findIndex((c) => !c.alive);
    const targetSlot = deadSlotIdx !== -1 ? deadSlotIdx : Math.floor(Math.random() * this.captains.length);

    const isSquirrel = killerEntity.type === 'squirrel';
    const newName = isSquirrel ? '도토리왕 그로그' : this.pickRandom(BASE_NAMES);
    const newTitle = isSquirrel ? '다람쥐 패왕' : '바람검객 살해자';
    const tribeId = isSquirrel ? 'beast' : this.pickRandom(Object.keys(TRIBES));

    const promotedCap = this.generateCaptain({
      slotIndex: targetSlot,
      rank: 'captain',
      level: 8,
      zone: killerEntity.zone || 'outskirts',
      name: newName,
      title: newTitle,
      tribeId,
      intelKnown: true,
    });
    promotedCap.playerKills = 1;
    promotedCap.quote = isSquirrel
      ? '찍찍!! 감히 국내성 다람쥐를 얕보다니! 이제 내가 백부장이다!'
      : '하하하! 이름 없는 졸개였던 내가 바람의 검객을 죽이고 백부장이 되었다!!';

    this.captains[targetSlot] = promotedCap;
    this.vendettaTargetId = promotedCap.id;
    this.addHistory(
      `[졸개 승진!] 당신을 쓰러뜨린 ${killerEntity.name || '졸개'}이(가) 신임 백부장 '${promotedCap.fullName}'(Lv.${promotedCap.level})으로 승진했습니다!`,
      'vendetta'
    );

    return {
      promoted: true,
      captain: promotedCap,
      headline: `신임 백부장 승진: ${promotedCap.fullName} (Lv.${promotedCap.level})`,
      subtext: `"${promotedCap.quote}"`,
    };
  }

  // Check if a dead Captain cheats death (죽음 극복 & 흉터 복귀!)
  tryTriggerCheatedDeath(zone) {
    if (this.graveyard.length === 0) return null;
    const candidateIdx = this.graveyard.findIndex((g) => g.captain.cheatedDeathCount < 2);
    if (candidateIdx === -1) return null;

    const record = this.graveyard.splice(candidateIdx, 1)[0];
    const deadCap = record.captain;
    const slotIdx = this.captains.findIndex((c) => c.id === deadCap.id || !c.alive);
    if (slotIdx === -1) return null;

    deadCap.alive = true;
    deadCap.cheatedDeathCount += 1;
    deadCap.level += 4;
    deadCap.maxHp = Math.round(deadCap.maxHp * 1.28);
    deadCap.hp = deadCap.maxHp;
    deadCap.broken = false;
    deadCap.enraged = true;
    deadCap.enrageTimer = 10;
    deadCap.zone = zone || deadCap.zone;

    if (record.killMethod === 'hellfire') {
      deadCap.title = '화염에서 돌아온 자';
      if (!deadCap.scars.includes('burn')) deadCap.scars.push('burn');
      if (!deadCap.immunities.some((i) => i.id === 'imm_fire')) {
        deadCap.immunities.push(IMMUNITY_POOL[0]); // Gains Fire Immunity!
      }
      deadCap.quote = this.pickRandom(TAUNTS.cheated_death_fire);
    } else {
      deadCap.title = '죽음을 속인 자';
      if (!deadCap.scars.includes('eyepatch')) deadCap.scars.push('eyepatch');
      if (!deadCap.scars.includes('stitch')) deadCap.scars.push('stitch');
      deadCap.quote = this.pickRandom(TAUNTS.cheated_death_normal);
    }
    deadCap.fullName = `${deadCap.title} ${deadCap.name}`;
    this.captains[slotIdx] = deadCap;

    this.addHistory(
      `[죽음 극복!] 처형당했던 '${deadCap.fullName}'(Lv.${deadCap.level})이(가) 끔찍한 흉터와 함께 되살아나 기습했습니다!`,
      'cheated_death'
    );
    return deadCap;
  }

  // Generate Power Struggles (권력 투쟁 미션)
  generatePowerStruggles() {
    this.powerStruggles = [];
    const aliveCaptains = this.captains.filter((c) => c.alive);
    if (aliveCaptains.length < 2) return;

    const types = ['결투 (Duel)', '매복 (Ambush)', '처형 집행 (Execution)', '광란의 연회 (Feast)'];
    for (let i = 0; i < Math.min(2, Math.floor(aliveCaptains.length / 2)); i++) {
      const a = aliveCaptains[i * 2];
      const b = aliveCaptains[i * 2 + 1];
      if (!a || !b) continue;
      this.powerStruggles.push({
        id: `ps_${Date.now()}_${i}`,
        type: types[i % types.length],
        attackerId: a.id,
        defenderId: b.id,
        zone: a.zone,
        desc: `${a.fullName}(Lv.${a.level}) ⚔️ ${b.fullName}(Lv.${b.level})`,
      });
    }
  }

  // Advance Time (시간 경과: 권력 투쟁 자동 결판, 신규 백부장 충원, 배신/죽음극복 이벤트)
  advanceTime() {
    const summary = [];

    // 1. Resolve current Power Struggles
    for (const ps of this.powerStruggles) {
      const a = this.getLeaderById(ps.attackerId);
      const b = this.getLeaderById(ps.defenderId);
      if (!a || !b || !a.alive || !b.alive) continue;

      const scoreA = a.level + (a.dominated ? 3 : 0) + Math.random() * 6;
      const scoreB = b.level + (b.dominated ? 3 : 0) + Math.random() * 6;
      const winner = scoreA >= scoreB ? a : b;
      const loser = winner === a ? b : a;

      winner.level += 2;
      winner.maxHp = Math.round(winner.maxHp * 1.12);
      winner.hp = winner.maxHp;

      if (Math.random() < 0.55) {
        loser.alive = false;
        loser.hp = 0;
        const msg = `[권력 투쟁 결판] ${ps.type}: '${winner.fullName}'이(가) '${loser.fullName}'을(를) 처형하고 Lv.${winner.level}(으)로 성장했습니다!`;
        summary.push(msg);
        this.addHistory(msg, 'struggle');
      } else {
        const msg = `[권력 투쟁 결판] ${ps.type}: '${winner.fullName}'이(가) '${loser.fullName}'을(를) 격파하고 Lv.${winner.level}(으)로 승격했습니다!`;
        summary.push(msg);
        this.addHistory(msg, 'struggle');
      }
    }

    // 2. Fill empty Captain slots with new recruits or promotions
    const zones = ['outskirts', 'outskirts', 'outskirts', 'haunted', 'haunted', 'haunted', 'fortress', 'fortress'];
    this.captains.forEach((cap, idx) => {
      if (!cap.alive && Math.random() < 0.65) {
        const replacement = this.generateCaptain({
          slotIndex: idx,
          rank: 'captain',
          level: Math.max(4, cap.level + Math.floor(Math.random() * 3)),
          zone: zones[idx],
        });
        this.captains[idx] = replacement;
        const msg = `[신규 승진] 빈 백부장 자리에 '${replacement.fullName}' (Lv.${replacement.level}, ${replacement.tribeName})이(가) 새로 임명되었습니다.`;
        summary.push(msg);
        this.addHistory(msg, 'promote');
      } else if (cap.alive) {
        cap.hp = cap.maxHp;
        cap.broken = false;
        cap.enraged = false;
      }
    });

    // 3. Check if a Dominated Captain betrays the player (배신 이벤트) if player has >= 4 dominated
    const dominatedCaps = this.captains.filter((c) => c.alive && c.dominated);
    if (dominatedCaps.length >= 4 && Math.random() < 0.35) {
      const traitor = this.pickRandom(dominatedCaps);
      traitor.dominated = false;
      traitor.ironWill = true;
      traitor.level += 3;
      traitor.title = '배신자';
      traitor.fullName = `${traitor.title} ${traitor.name}`;
      traitor.quote = this.pickRandom(TAUNTS.betrayal);
      if (this.bodyguardId === traitor.id) this.bodyguardId = null;
      const msg = `[배신 발생!] 아군이었던 '${traitor.fullName}'(Lv.${traitor.level})이(가) 낙인을 끊고 당신을 배신했습니다!`;
      summary.push(msg);
      this.addHistory(msg, 'betrayal');
    }

    this.generatePowerStruggles();
    return summary;
  }
}
