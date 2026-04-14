import { useState, useCallback, useEffect } from 'react';
import type { GameProps } from '@/types';

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

const GRID_SIZE = 11;
// Standard Scrabble-style bonus layout for 11x11 board
const BONUS_CELLS: Record<string, string> = {
  // Triple Word
  '0,0': 'TW', '0,5': 'TW', '0,10': 'TW',
  '5,0': 'TW', '5,10': 'TW',
  '10,0': 'TW', '10,5': 'TW', '10,10': 'TW',
  // Double Word
  '1,1': 'DW', '1,9': 'DW', '2,2': 'DW', '2,8': 'DW',
  '3,3': 'DW', '3,7': 'DW', '4,4': 'DW', '4,6': 'DW',
  '6,4': 'DW', '6,6': 'DW', '7,3': 'DW', '7,7': 'DW',
  '8,2': 'DW', '8,8': 'DW', '9,1': 'DW', '9,9': 'DW',
  // Triple Letter
  '1,5': 'TL', '5,1': 'TL', '5,9': 'TL', '9,5': 'TL',
  // Double Letter
  '0,3': 'DL', '0,7': 'DL', '3,0': 'DL', '3,10': 'DL',
  '7,0': 'DL', '7,10': 'DL', '10,3': 'DL', '10,7': 'DL',
  '2,5': 'DL', '5,2': 'DL', '5,8': 'DL', '8,5': 'DL',
  // Center star
  '5,5': 'ST',
};

const BONUS_BG: Record<string, string> = {
  TW: 'bg-red-500/30 text-red-300',
  DW: 'bg-pink-400/25 text-pink-300',
  TL: 'bg-blue-500/30 text-blue-300',
  DL: 'bg-cyan-400/25 text-cyan-300',
  ST: 'bg-amber-400/25 text-amber-300',
};

const BONUS_LABEL: Record<string, string> = {
  TW: '3W', DW: '2W', TL: '3L', DL: '2L', ST: '\u2605',
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
      // Pick up a placed tile
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

    // Check contiguous
    for (let i = 1; i < sorted.length; i++) {
      if (allSameRow && sorted[i][1] !== sorted[i-1][1] + 1) return { valid: false, word: '', cells: [], score: 0 };
      if (!allSameRow && sorted[i][0] !== sorted[i-1][0] + 1) return { valid: false, word: '', cells: [], score: 0 };
    }

    // Expand to include existing tiles
    let startR = sorted[0][0], startC = sorted[0][1];
    if (allSameRow) {
      while (startC > 0 && board[startR][startC - 1]) startC--;
    } else {
      while (startR > 0 && board[startR - 1]?.[startC]) startR--;
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

    // Calculate score with bonuses (only for newly placed tiles)
    let wordMultiplier = 1;
    let letterScore = 0;
    for (const [r, c] of wordCells) {
      const bonus = BONUS_CELLS[`${r},${c}`];
      const ls = TILE_SCORES[board[r][c]!] || 0;
      const isNew = placedCells.has(`${r},${c}`);
      if (isNew && bonus === 'DL') letterScore += ls * 2;
      else if (isNew && bonus === 'TL') letterScore += ls * 3;
      else letterScore += ls;
      if (isNew && bonus === 'DW') wordMultiplier *= 2;
      if (isNew && (bonus === 'TW' || bonus === 'ST')) wordMultiplier *= 3;
    }

    return { valid: true, word, cells: wordCells, score: letterScore * wordMultiplier };
  };

  const handleSubmit = () => {
    const result = isValidPlacement();
    if (!result.valid) {
      setMessage('Place 2+ tiles in a straight line.');
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
    setMessage(`"${result.word}" = ${result.score} pts!`);
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
    const letters: string[] = [];
    for (const key of placedCells) {
      const [r, c] = key.split(',').map(Number);
      if (board[r][c]) letters.push(board[r][c]!);
    }
    setBoard(board.map((row, r) => row.map((cell, c) => placedCells.has(`${r},${c}`) ? null : cell)));
    setRack([...rack, ...letters]);
    setPlacedCells(new Set());
  };

  return (
    <div className="h-full flex flex-col items-center p-1.5 sm:p-2 overflow-hidden">
      {/* Score bar */}
      <div className="flex gap-2 mb-1.5 text-xs items-center flex-wrap justify-center">
        <span className="bg-card rounded-lg px-2 py-0.5 text-accent font-bold">{totalScore} pts</span>
        <span className="bg-card rounded-lg px-2 py-0.5 text-text-muted">Turn {turn}/{maxTurns}</span>
        <span className="bg-card rounded-lg px-2 py-0.5 text-text-muted">Target: {targetScore}</span>
        <span className="bg-card rounded-lg px-2 py-0.5 text-text-dim">{pool.length} left</span>
      </div>

      {/* Board — uses CSS grid that fills available width */}
      <div className="w-full max-w-[360px] aspect-square mb-1.5">
        <div
          className="w-full h-full grid gap-px bg-white/5 rounded-lg overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        >
          {board.map((row, r) => row.map((cell, c) => {
            const bonus = BONUS_CELLS[`${r},${c}`];
            const isPlaced = placedCells.has(`${r},${c}`);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleBoardClick(r, c)}
                className={`relative flex items-center justify-center text-[10px] sm:text-xs font-bold transition-colors aspect-square ${
                  cell
                    ? `bg-amber-100 text-amber-900 ${isPlaced ? 'ring-1 ring-accent' : ''}`
                    : bonus
                      ? BONUS_BG[bonus] || 'bg-card'
                      : 'bg-card'
                }`}
              >
                {cell ? (
                  <>
                    <span className="leading-none">{cell}</span>
                    <span className="absolute bottom-0 right-0.5 text-[6px] text-amber-700/70 leading-none">
                      {TILE_SCORES[cell]}
                    </span>
                  </>
                ) : bonus ? (
                  <span className="text-[7px] sm:text-[8px] font-semibold opacity-60 leading-none">
                    {BONUS_LABEL[bonus]}
                  </span>
                ) : null}
              </button>
            );
          }))}
        </div>
      </div>

      {/* Bonus legend */}
      <div className="flex gap-2 text-[9px] text-text-dim mb-1 flex-wrap justify-center">
        <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/30" /> 3W</span>
        <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded-sm bg-pink-400/25" /> 2W</span>
        <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500/30" /> 3L</span>
        <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-400/25" /> 2L</span>
      </div>

      {message && <div className="text-center text-[11px] mb-1 text-accent">{message}</div>}

      {/* Action buttons */}
      <div className="flex justify-center gap-2 mb-1.5">
        <button onClick={handleSubmit} disabled={placedCells.size === 0}
          className="bg-accent text-bg font-bold px-3 py-1.5 rounded-lg text-xs disabled:opacity-30">Submit Word</button>
        <button onClick={handleClear} disabled={placedCells.size === 0}
          className="bg-card text-text font-semibold px-3 py-1.5 rounded-lg text-xs disabled:opacity-30">Clear</button>
      </div>

      {/* Tile rack */}
      <div className="flex justify-center gap-1 flex-wrap">
        {rack.map((tile, i) => (
          <button key={i} onClick={() => handleRackClick(i)}
            className={`relative w-8 h-9 sm:w-9 sm:h-10 rounded-lg font-bold text-sm flex items-center justify-center transition-all ${
              selectedTile === i ? 'bg-accent text-bg ring-2 ring-accent scale-110' : 'bg-amber-200 text-amber-900'
            }`}>
            <span>{tile}</span>
            <span className="absolute bottom-0 right-0.5 text-[7px] font-normal opacity-60">{TILE_SCORES[tile]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ScrabbleGame;
