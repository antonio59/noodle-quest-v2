import { useState, useCallback, useEffect, useMemo } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

const TILE_SCORES: Record<string, number> = { A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10 };
const TILE_COUNTS: Record<string, number> = { A:9,B:2,C:2,D:4,E:12,F:2,G:3,H:2,I:9,J:1,K:1,L:4,M:2,N:6,O:8,P:2,Q:1,R:6,S:4,T:6,U:4,V:2,W:2,X:1,Y:2,Z:1 };

const VALID_WORDS = new Set([
  'AT','AN','AM','AS','BE','BY','DO','GO','HE','IF','IN','IS','IT','ME','MY','NO','OF','OH','OK','ON','OR','SO','TO','UP','US','WE',
  'ACE','ACT','ADD','AGE','AGO','AID','AIM','AIR','ALL','AND','ANT','ANY','APE','ARC','ARE','ARK','ARM','ART','ASK','ATE',
  'BAD','BAG','BAN','BAR','BAT','BED','BET','BIG','BIT','BOW','BOX','BOY','BUD','BUG','BUN','BUS','BUT','BUY',
  'CAB','CAN','CAP','CAR','CAT','COP','COT','COW','CRY','CUB','CUP','CUR','CUT',
  'DAB','DAD','DAM','DAY','DEN','DEW','DID','DIG','DIM','DIP','DOC','DOG','DOT','DRY','DUB','DUE','DUG','DUN','DUO','DYE',
  'EAR','EAT','EEL','EGG','ELF','ELK','ELM','EMU','END','ERA','EVE','EWE','EYE',
  'FAN','FAR','FAT','FAX','FED','FEW','FIG','FIN','FIR','FIT','FIX','FLY','FOB','FOE','FOG','FOP','FOR','FOX','FRY','FUN','FUR',
  'GAB','GAG','GAP','GAS','GAY','GEL','GEM','GET','GIG','GIN','GNU','GOB','GOD','GOT','GUM','GUN','GUT','GUY','GYM',
  'HAD','HAM','HAS','HAT','HAY','HEN','HER','HEW','HID','HIM','HIP','HIS','HIT','HOB','HOG','HOP','HOT','HOW','HUB','HUE','HUG','HUM','HUT',
  'ICE','ICY','ILL','IMP','INK','INN','ION','IRE','IRK','ITS','IVY',
  'JAB','JAG','JAM','JAR','JAW','JAY','JET','JIG','JOB','JOG','JOT','JOY','JUG','JUT',
  'KEG','KEN','KEY','KID','KIN','KIT',
  'LAB','LAD','LAG','LAP','LAW','LAX','LAY','LEA','LED','LEG','LET','LID','LIE','LIP','LIT','LOG','LOT','LOW','LUG',
  'MAD','MAN','MAP','MAR','MAT','MAW','MAX','MAY','MEN','MET','MID','MIX','MOB','MOM','MOP','MOW','MUD','MUG','MUM',
  'NAB','NAG','NAP','NET','NEW','NIL','NIP','NIT','NOB','NOD','NOR','NOT','NOW','NUB','NUN','NUT',
  'OAK','OAR','OAT','ODD','ODE','OFF','OFT','OIL','OLD','ONE','OPT','ORB','ORE','OUR','OUT','OWE','OWL','OWN',
  'PAD','PAN','PAP','PAT','PAW','PAY','PEA','PEG','PEN','PEP','PER','PET','PEW','PIE','PIG','PIN','PIT','PLY','POD','POP','POT','POW','PRY','PUB','PUG','PUN','PUP','PUS','PUT',
  'RAG','RAM','RAN','RAP','RAT','RAW','RAY','RED','REF','RIB','RID','RIG','RIM','RIP','ROB','ROD','ROE','ROT','ROW','RUB','RUG','RUM','RUN','RUT','RYE',
  'SAC','SAD','SAG','SAP','SAT','SAW','SAY','SEA','SET','SEW','SHE','SHY','SIN','SIP','SIR','SIS','SIT','SIX','SKI','SKY','SLY','SOB','SOD','SON','SOP','SOT','SOW','SOY','SPA','SPY','STY','SUB','SUM','SUN','SUP',
  'TAB','TAD','TAG','TAN','TAP','TAR','TAT','TAX','TEA','TEN','THE','TIE','TIN','TIP','TOE','TON','TOO','TOP','TOT','TOW','TOY','TRY','TUB','TUG','TWO',
  'URN','USE',
  'VAN','VAT','VET','VIA','VIE','VOW',
  'WAD','WAG','WAR','WAS','WAX','WAY','WEB','WED','WET','WHO','WHY','WIG','WIN','WIT','WOE','WOK','WON','WOO','WOW',
  'YAK','YAM','YAP','YAW','YEA','YES','YET','YEW','YIN','YOU','YOW',
  'ZAP','ZEN','ZIP','ZIT','ZOO',
  'ABLE','ALSO','AREA','ARMY','AWAY','BABY','BACK','BALL','BAND','BANK','BASE','BATH','BEAM','BEAR','BEAT','BEEN','BELL','BELT','BEND','BEST','BIRD','BITE','BLOW','BLUE','BOAT','BODY','BOLT','BOMB','BOND','BONE','BOOK','BOOT','BORN','BOSS','BOTH','BOWL','BULK','BURN','BUSH','BUSY',
  'CAFE','CAGE','CAKE','CALL','CALM','CAME','CAMP','CARD','CARE','CART','CASE','CASH','CAST','CAVE','CELL','CHAT','CHIP','CITY','CLAP','CLAY','CLIP','CLUB','CLUE','COAL','COAT','CODE','COIN','COLD','COME','COOK','COOL','COPE','COPY','CORD','CORE','CORN','COST','CREW','CROP','CURE','CURL',
  'DALE','DAME','DAMP','DARE','DARK','DASH','DATA','DATE','DAWN','DEAD','DEAF','DEAL','DEAR','DEBT','DECK','DEED','DEEM','DEEP','DEER','DEMO','DENY','DESK','DIAL','DICE','DIET','DIRT','DISH','DISK','DOCK','DOES','DOLL','DOME','DONE','DOOM','DOOR','DOSE','DOWN','DRAG','DRAW','DREW','DROP','DRUM','DUAL','DULL','DUMB','DUMP','DUNE','DUSK','DUST','DUTY',
  'EACH','EARL','EARN','EASE','EAST','EASY','EDGE','EDIT','ELSE','EMIT','ENVY','EPIC','EVEN','EVER','EVIL','EXAM','EXEC','EXIT','EXPO',
  'FACE','FACT','FADE','FAIL','FAIR','FAKE','FALL','FAME','FANG','FARE','FARM','FAST','FATE','FEAR','FEAT','FEED','FEEL','FELL','FELT','FILE','FILL','FILM','FIND','FINE','FIRE','FIRM','FISH','FIST','FLAG','FLAT','FLIP','FLOW','FOAM','FOLD','FOLK','FOND','FONT','FOOD','FOOL','FOOT','FORD','FORE','FORK','FORM','FORT','FOUL','FOUR','FREE','FROM','FROG','FUEL','FULL','FUND','FURY','FUSE',
]);

function buildTilePool(): string[] {
  const pool: string[] = [];
  for (const [letter, count] of Object.entries(TILE_COUNTS)) {
    for (let i = 0; i < count; i++) pool.push(letter);
  }
  return pool.sort(() => Math.random() - 0.5);
}

const GRID_SIZE = 10;
const BONUS_CELLS: Record<string, string> = {
  '0,0': 'TW', '0,9': 'TW', '9,0': 'TW', '9,9': 'TW',
  '1,1': 'DL', '1,8': 'DL', '8,1': 'DL', '8,8': 'DL',
  '2,2': 'DW', '2,7': 'DW', '7,2': 'DW', '7,7': 'DW',
  '3,3': 'DL', '3,6': 'DL', '6,3': 'DL', '6,6': 'DL',
  '4,4': 'TL', '4,5': 'TL', '5,4': 'TL', '5,5': 'TL',
};

function ScrabbleGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const [board, setBoard] = useState<(string | null)[][]>(
    () => Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
  );
  const [rack, setRack] = useState<string[]>([]);
  const [pool, setPool] = useState<string[]>(() => buildTilePool());
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [placedCells, setPlacedCells] = useState<Set<string>>(new Set());
  const [totalScore, setTotalScore] = useState(0);
  const [turn, setTurn] = useState(0);
  const [message, setMessage] = useState('');
  const maxTurns = 10;
  const targetScore = stage * 30;

  const drawTiles = useCallback((currentRack: string[], currentPool: string[]): { rack: string[]; pool: string[] } => {
    const newRack = [...currentRack];
    const newPool = [...currentPool];
    while (newRack.length < 7 && newPool.length > 0) {
      newRack.push(newPool.shift()!);
    }
    return { rack: newRack, pool: newPool };
  }, []);

  useEffect(() => {
    const { rack: r, pool: p } = drawTiles([], buildTilePool());
    setRack(r);
    setPool(p);
    onMessage('Place tiles to form words!');
  }, []);

  const handleRackClick = (idx: number) => {
    setSelectedTile(prev => prev === idx ? null : idx);
  };

  const handleBoardClick = (r: number, c: number) => {
    if (selectedTile === null) {
      if (board[r][c] && placedCells.has(`${r},${c}`)) {
        const letter = board[r][c];
        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = null;
        setBoard(newBoard);
        setRack(prev => [...prev, letter!]);
        const newPlaced = new Set(placedCells);
        newPlaced.delete(`${r},${c}`);
        setPlacedCells(newPlaced);
      }
      return;
    }
    if (board[r][c]) return;
    const letter = rack[selectedTile];
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = letter;
    setBoard(newBoard);
    const newRack = rack.filter((_, i) => i !== selectedTile);
    setRack(newRack);
    setSelectedTile(null);
    const newPlaced = new Set(placedCells);
    newPlaced.add(`${r},${c}`);
    setPlacedCells(newPlaced);
  };

  const isValidPlacement = (): { valid: boolean; word: string; cells: number[][]; score: number } => {
    const cells = Array.from(placedCells).map(k => k.split(',').map(Number));
    if (cells.length < 2) return { valid: false, word: '', cells: [], score: 0 };

    const rows = cells.map(c => c[0]);
    const cols = cells.map(c => c[1]);
    const allSameRow = rows.every(r => r === rows[0]);
    const allSameCol = cols.every(c => c === cols[0]);
    if (!allSameRow && !allSameCol) return { valid: false, word: '', cells: [], score: 0 };

    const sorted = allSameRow
      ? cells.sort((a, b) => a[1] - b[1])
      : cells.sort((a, b) => a[0] - b[0]);

    for (let i = 1; i < sorted.length; i++) {
      if (allSameRow && sorted[i][1] !== sorted[i-1][1] + 1) return { valid: false, word: '', cells: [], score: 0 };
      if (!allSameRow && sorted[i][0] !== sorted[i-1][0] + 1) return { valid: false, word: '', cells: [], score: 0 };
    }

    let startR = sorted[0][0], startC = sorted[0][1];
    while (startR > 0 && board[startR - 1]?.[startC] && (placedCells.has(`${startR-1},${startC}`) || !placedCells.has(`${startR-1},${startC}`))) {
      if (!placedCells.has(`${startR-1},${startC}`) && board[startR-1]?.[startC]) { startR--; break; }
      if (placedCells.has(`${startR-1},${startC}`)) startR--;
      else break;
    }
    while (startC > 0 && board[startR]?.[startC - 1] && (placedCells.has(`${startR},${startC-1}`) || !placedCells.has(`${startR},${startC-1}`))) {
      if (!placedCells.has(`${startR},${startC-1}`) && board[startR]?.[startC-1]) { startC--; break; }
      if (placedCells.has(`${startR},${startC-1}`)) startC--;
      else break;
    }

    const wordCells: number[][] = [];
    let wr = startR, wc = startC;
    if (allSameRow) {
      while (wc < GRID_SIZE && board[wr][wc]) { wordCells.push([wr, wc]); wc++; }
    } else {
      while (wr < GRID_SIZE && board[wr][wc]) { wordCells.push([wr, wc]); wr++; }
    }

    const word = wordCells.map(([r, c]) => board[r][c]).join('');
    if (word.length < 2) return { valid: false, word: '', cells: [], score: 0 };

    const hasNew = wordCells.some(([r, c]) => placedCells.has(`${r},${c}`));
    if (!hasNew) return { valid: false, word: '', cells: [], score: 0 };

    let wordMultiplier = 1;
    let letterScore = 0;
    for (const [r, c] of wordCells) {
      const bonus = BONUS_CELLS[`${r},${c}`];
      const ls = TILE_SCORES[board[r][c]!] || 0;
      if (bonus === 'DL' && placedCells.has(`${r},${c}`)) letterScore += ls * 2;
      else if (bonus === 'TL' && placedCells.has(`${r},${c}`)) letterScore += ls * 3;
      else letterScore += ls;
      if (bonus === 'DW' && placedCells.has(`${r},${c}`)) wordMultiplier *= 2;
      if (bonus === 'TW' && placedCells.has(`${r},${c}`)) wordMultiplier *= 3;
    }

    return { valid: true, word, cells: wordCells, score: letterScore * wordMultiplier };
  };

  const handleSubmit = () => {
    const result = isValidPlacement();
    if (!result.valid) {
      setMessage('Invalid placement. Use 2+ tiles in a row or column.');
      return;
    }
    if (!VALID_WORDS.has(result.word.toUpperCase())) {
      setMessage(`"${result.word}" is not a valid word.`);
      return;
    }
    const newScore = totalScore + result.score;
    setTotalScore(newScore);
    onScore(result.score);
    setPlacedCells(new Set());
    setMessage(`"${result.word}" scored ${result.score} points!`);
    onMessage(`+${result.score} points!`);

    const newTurn = turn + 1;
    setTurn(newTurn);
    const { rack: newRack, pool: newPool } = drawTiles(rack, pool);
    setRack(newRack);
    setPool(newPool);
    onProgress(newTurn / maxTurns);

    if (newTurn >= maxTurns) {
      const stars = newScore >= targetScore ? 3 : newScore >= targetScore * 0.6 ? 2 : 1;
      setTimeout(() => onEnd({ score: newScore, stars, summary: `Scored ${newScore} points in Scrabble!` }), 1000);
    }
  };

  const handleClear = () => {
    const newBoard = board.map(row => row.map(cell => placedCells.has(`${board.indexOf(row)},${row.indexOf(cell)}`) ? null : cell));
    const letters: string[] = [];
    for (const key of placedCells) {
      const [r, c] = key.split(',').map(Number);
      if (board[r][c]) letters.push(board[r][c]!);
    }
    setBoard(board.map((row, r) => row.map((cell, c) => placedCells.has(`${r},${c}`) ? null : cell)));
    setRack([...rack, ...letters]);
    setPlacedCells(new Set());
  };

  const bonusColor = (r: number, c: number): string => {
    const b = BONUS_CELLS[`${r},${c}`];
    if (!b) return 'bg-card';
    if (b === 'TW') return 'bg-red-500/30';
    if (b === 'DW') return 'bg-pink-500/30';
    if (b === 'TL') return 'bg-blue-500/30';
    if (b === 'DL') return 'bg-cyan-500/30';
    return 'bg-card';
  };

  return (
    <div className="h-full flex flex-col items-center p-2 overflow-hidden">
      <div className="flex gap-3 mb-2 text-sm items-center">
        <span className="bg-card rounded-lg px-2 py-1 text-accent text-xs font-bold">{totalScore} pts</span>
        <span className="bg-card rounded-lg px-2 py-1 text-text-muted text-xs">Turn {turn}/{maxTurns}</span>
        <span className="bg-card rounded-lg px-2 py-1 text-text-muted text-xs">Target: {targetScore}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex justify-center mb-3">
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gap: 1, maxWidth: `${GRID_SIZE * 32}px` }}>
            {board.map((row, r) => row.map((cell, c) => (
              <button key={`${r}-${c}`} onClick={() => handleBoardClick(r, c)}
                className={`w-7 h-7 sm:w-8 sm:h-8 text-xs font-bold flex items-center justify-center rounded-sm transition-colors ${
                  cell ? 'bg-amber-100 text-amber-900' : bonusColor(r, c)
                } ${placedCells.has(`${r},${c}`) ? 'ring-1 ring-accent' : ''}`}>
                {cell || (BONUS_CELLS[`${r},${c}`] ? <span className="text-[6px] text-text-muted">{BONUS_CELLS[`${r},${c}`]}</span> : '')}
              </button>
            )))}
          </div>
        </div>

        {message && <div className="text-center text-xs mb-2 text-accent">{message}</div>}

        <div className="flex justify-center gap-2 mb-3">
          <button onClick={handleSubmit} disabled={placedCells.size === 0}
            className="bg-accent text-bg font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-30">Submit</button>
          <button onClick={handleClear} disabled={placedCells.size === 0}
            className="bg-card text-text font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-30">Clear</button>
        </div>

        <div className="flex justify-center flex-wrap gap-1 mb-2">
          {rack.map((tile, i) => (
            <button key={i} onClick={() => handleRackClick(i)}
              className={`w-9 h-10 rounded-lg font-bold text-sm flex items-center justify-center transition-all ${
                selectedTile === i ? 'bg-accent text-bg ring-2 ring-accent scale-110' : 'bg-amber-200 text-amber-900'
              }`}>
              <span>{tile}</span>
              <span className="text-[8px] absolute -bottom-0.5 -right-0.5">{TILE_SCORES[tile]}</span>
            </button>
          ))}
        </div>

        <div className="text-center text-xs text-text-muted">{pool.length} tiles remaining</div>
      </div>
    </div>
  );
}

registerGame('scrabble', {
  name: 'Scrabble',
  emoji: '🔤',
  description: 'Build words on the board for maximum points!',
  category: 'board',
  stages: 10,
  component: ScrabbleGame,
  aiDifficulty: 'medium',
});

export default ScrabbleGame;