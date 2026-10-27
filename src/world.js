// src/world.js
// 2D Tile Map Generator & Zone Manager inspired by '바람의 나라 (Kingdom of the Winds)'

export const ZONES = {
  gungnae: {
    id: 'gungnae',
    name: '국내성 남문 & 주막',
    subtitle: '평화 구역 · 체력 회복 · 천명 군단 지휘',
    width: 28,
    height: 20,
    baseTile: 'grass',
    dangerLevel: '안전 (Safe Hub)',
  },
  outskirts: {
    id: 'outskirts',
    name: '국내성 외곽 사냥터',
    subtitle: '초급 사냥터 · 다람쥐 · 초급 백부장 출몰지 (Lv.3~9)',
    width: 34,
    height: 24,
    baseTile: 'grass',
    dangerLevel: '보통 (Lv.3~9)',
  },
  haunted: {
    id: 'haunted',
    name: '흉가 & 도깨비 숲',
    subtitle: '중급 사냥터 · 흉가 망령 · 중급 백부장 출몰지 (Lv.9~16)',
    width: 34,
    height: 24,
    baseTile: 'haunted_grass',
    dangerLevel: '위험 (Lv.9~16)',
  },
  fortress: {
    id: 'fortress',
    name: '혈마성채 심층부',
    subtitle: '최상위 성채 · 전투대장 & 혈마대군주 아크라카의 본거지 (Lv.16~25+)',
    width: 36,
    height: 26,
    baseTile: 'fortress_floor',
    dangerLevel: '극악 (Lv.16~25+)',
  },
};

export function buildZoneMap(zoneId) {
  const cfg = ZONES[zoneId] || ZONES.gungnae;
  const W = cfg.width;
  const H = cfg.height;
  const tiles = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => ({ type: cfg.baseTile, solid: false, variant: Math.floor(Math.random() * 4) }))
  );

  const npcs = [];
  const portals = [];

  // Border walls/trees
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
        tiles[y][x] = {
          type: zoneId === 'fortress' ? 'wall' : 'tree',
          solid: true,
          variant: 0,
        };
      }
    }
  }

  if (zoneId === 'gungnae') {
    // Stone road down the center and across
    for (let y = 2; y < H - 2; y++) {
      for (let x = 11; x <= 16; x++) {
        tiles[y][x] = { type: 'stone_floor', solid: false, variant: (x + y) % 2 };
      }
    }
    for (let x = 3; x < W - 3; x++) {
      for (let y = 9; y <= 11; y++) {
        tiles[y][x] = { type: 'dirt', solid: false, variant: (x + y) % 2 };
      }
    }

    // Fortress North Wall & Gate
    for (let x = 4; x < W - 4; x++) {
      if (x < 12 || x > 15) {
        tiles[4][x] = { type: 'wall', solid: true, variant: 0 };
      }
    }

    // 왈숙네 주막 (Tavern)
    tiles[6][7] = { type: 'tavern', solid: true, variant: 0 };
    tiles[6][8] = { type: 'tavern', solid: true, variant: 0 };
    npcs.push({
      id: 'npc_walsuk',
      name: '주모 왈숙네',
      role: '체력/마력 회복 & 시간 경과',
      x: 7.5,
      y: 7.6,
      color: '#facc15',
      dialog: '어서오시게 검객님! 국밥 한 그릇 먹고 체력을 채우시겠나? ([E] 상호작용 시 체력/마력 100% 회복)',
      action: 'heal',
    });

    // 천명단 (Shrine of Domination)
    tiles[6][19] = { type: 'shrine', solid: true, variant: 0 };
    npcs.push({
      id: 'npc_shrine',
      name: '천명 군단 석단',
      role: '네메시스 군단 계급도 열람',
      x: 19.5,
      y: 7.6,
      color: '#38bdf8',
      dialog: '푸른 영혼의 빛이 일렁이는 천명단입니다. ([E] 또는 [N] 키로 군단 계급도 열기)',
      action: 'open_army',
    });

    // Portals to hunting zones
    portals.push(
      { x: 13.5, y: 17.5, targetZone: 'outskirts', label: '▼ 국내성 외곽 사냥터 (Lv.3~9)', color: '#4ade80' },
      { x: 24.5, y: 10.0, targetZone: 'haunted', label: '▶ 흉가 & 도깨비 숲 (Lv.9~16)', color: '#a855f7' },
      { x: 13.5, y: 2.2, targetZone: 'fortress', label: '▲ 혈마성채 공성문 (Lv.16~25+)', color: '#ef4444' }
    );
  } else if (zoneId === 'outskirts') {
    // Dirt trails & scattered pine trees + pond
    for (let x = 2; x < W - 2; x++) {
      tiles[12][x] = { type: 'dirt', solid: false, variant: 0 };
      tiles[13][x] = { type: 'dirt', solid: false, variant: 1 };
    }
    for (let y = 2; y < H - 2; y++) {
      tiles[y][16] = { type: 'dirt', solid: false, variant: 0 };
    }
    const treeCoords = [
      [5, 5], [6, 5], [10, 4], [22, 5], [26, 7], [8, 17], [12, 19], [23, 18], [28, 16]
    ];
    for (const [tx, ty] of treeCoords) {
      if (tiles[ty]?.[tx]) tiles[ty][tx] = { type: 'tree', solid: true, variant: 0 };
    }
    // Small water pond
    for (let y = 6; y <= 8; y++) {
      for (let x = 19; x <= 21; x++) {
        tiles[y][x] = { type: 'water', solid: true, variant: 0 };
      }
    }

    portals.push(
      { x: 16.5, y: 2.2, targetZone: 'gungnae', label: '▲ 국내성 남문 귀환', color: '#38bdf8' },
      { x: 31.5, y: 12.5, targetZone: 'haunted', label: '▶ 흉가 & 도깨비 숲 이동', color: '#a855f7' }
    );
  } else if (zoneId === 'haunted') {
    // Haunted ruins walls & dark paths
    for (let x = 2; x < W - 2; x++) {
      tiles[12][x] = { type: 'stone_floor', solid: false, variant: 0 };
    }
    const wallCoords = [
      [8, 6], [9, 6], [10, 6], [8, 7], [22, 6], [23, 6], [24, 6], [24, 7],
      [11, 17], [12, 17], [21, 17], [22, 17]
    ];
    for (const [wx, wy] of wallCoords) {
      if (tiles[wy]?.[wx]) tiles[wy][wx] = { type: 'wall', solid: true, variant: 0 };
    }

    portals.push(
      { x: 2.5, y: 12.5, targetZone: 'outskirts', label: '◀ 국내성 외곽 사냥터', color: '#4ade80' },
      { x: 31.5, y: 12.5, targetZone: 'fortress', label: '▶ 혈마성채 진입', color: '#ef4444' }
    );
  } else if (zoneId === 'fortress') {
    // Blood Demon Fortress: Lava rivers, stone bridges, Overlord dais
    for (let x = 2; x < W - 2; x++) {
      if (x < 15 || x > 20) {
        tiles[10][x] = { type: 'lava', solid: true, variant: 0 };
        tiles[11][x] = { type: 'lava', solid: true, variant: 0 };
      } else {
        tiles[10][x] = { type: 'stone_floor', solid: false, variant: 0 };
        tiles[11][x] = { type: 'stone_floor', solid: false, variant: 0 };
      }
    }
    for (let y = 3; y < H - 3; y++) {
      tiles[y][17] = { type: 'stone_floor', solid: false, variant: 0 };
      tiles[y][18] = { type: 'stone_floor', solid: false, variant: 0 };
    }
    portals.push(
      { x: 17.5, y: 23.5, targetZone: 'gungnae', label: '▼ 국내성 남문 귀환', color: '#38bdf8' }
    );
  }

  return { cfg, width: W, height: H, tiles, npcs, portals };
}
