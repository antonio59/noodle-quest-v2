import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Check } from 'lucide-react';
import type { GameProps } from '@/types';

// ── Tile data ──────────────────────────────────────────────────────────
const TILE_SCORES: Record<string, number> = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
  N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10,
};
const TILE_COUNTS: Record<string, number> = {
  A:9,B:2,C:2,D:4,E:12,F:2,G:3,H:2,I:9,J:1,K:1,L:4,M:2,
  N:6,O:8,P:2,Q:1,R:6,S:4,T:6,U:4,V:2,W:2,X:1,Y:2,Z:1,
};

// ── Standard 15×15 Scrabble board ──────────────────────────────────────
const SIZE = 15;
const CENTER = 7;

type BonusType = 'TW' | 'DW' | 'TL' | 'DL' | 'ST';

function buildBonusMap(): Map<string, BonusType> {
  const m = new Map<string, BonusType>();
  const set = (r: number, c: number, b: BonusType) => {
    for (const [mr, mc] of [
      [r, c], [r, 14 - c], [14 - r, c], [14 - r, 14 - c],
      [c, r], [c, 14 - r], [14 - c, r], [14 - c, 14 - r],
    ]) {
      m.set(`${mr},${mc}`, b);
    }
  };
  set(0, 0, 'TW');
  set(0, 7, 'TW');
  set(1, 1, 'DW'); set(2, 2, 'DW'); set(3, 3, 'DW'); set(4, 4, 'DW');
  set(1, 5, 'TL'); set(5, 1, 'TL'); set(5, 5, 'TL');
  set(0, 3, 'DL'); set(2, 6, 'DL'); set(3, 0, 'DL'); set(3, 7, 'DL');
  set(6, 2, 'DL'); set(6, 6, 'DL'); set(7, 3, 'DL');
  m.set(`${CENTER},${CENTER}`, 'ST');
  return m;
}

const BONUS_MAP = buildBonusMap();

const BONUS_STYLE: Record<BonusType, { bg: string; text: string; label: string; chip: string }> = {
  TW: { bg: 'bg-red-700/50',    text: 'text-red-200',    label: 'TW', chip: 'bg-red-600 text-red-50' },
  DW: { bg: 'bg-rose-500/35',   text: 'text-rose-200',   label: 'DW', chip: 'bg-rose-500 text-rose-50' },
  TL: { bg: 'bg-blue-600/45',   text: 'text-blue-200',   label: 'TL', chip: 'bg-blue-600 text-blue-50' },
  DL: { bg: 'bg-sky-500/35',    text: 'text-sky-200',    label: 'DL', chip: 'bg-sky-500 text-sky-50' },
  ST: { bg: 'bg-amber-500/35',  text: 'text-amber-200',  label: '★',  chip: 'bg-amber-500 text-amber-50' },
};

// ── SVG board dimensions ──────────────────────────────────────────────
const BCS = 28;   // cell size in SVG user-units
const BLABEL = 13; // space reserved for A–O / 1–15 coordinate labels
const SVG_BOARD = BLABEL + 15 * BCS; // total SVG width & height (= 433)
const COL_LETTERS_BOARD = 'ABCDEFGHIJKLMNO'.split('');
// Solid bonus-square fills (no transparency — much easier to read on a small board)
const BONUS_FILL: Record<BonusType, string> = {
  TW: '#991b1b', // deep red
  DW: '#9f1239', // deep rose
  TL: '#1e3a8a', // deep blue
  DL: '#075985', // ocean blue
  ST: '#78350f', // amber/brown
};

// ── Word list ─────────────────────────────────────────────────────────
// Embedded fallback list + full SOWPODS dictionary loaded at runtime.
const VALID_WORDS = new Set([
  // 2-letter
  'AA','AB','AD','AE','AG','AH','AI','AL','AM','AN','AR','AS','AT','AW','AX','AY',
  'BA','BE','BI','BO','BY','DA','DE','DO','ED','EF','EH','EL','EM','EN','ER','ES','ET','EW','EX',
  'FA','FE','GO','HA','HE','HI','HM','HO','ID','IF','IN','IS','IT','JO','KA','KI',
  'LA','LI','LO','MA','ME','MI','MM','MO','MU','MY','NA','NE','NO','NU','OD','OE','OF','OH','OI','OK','OM','ON','OP','OR','OS','OU','OW','OX','OY',
  'PA','PE','PI','PO','QI','RE','SH','SI','SO','TA','TI','TO','UH','UM','UN','UP','US','UT',
  'WE','WO','XI','XU','YA','YE','YO','ZA',
  // 3-letter
  'ACE','ACT','ADD','ADO','ADS','AFT','AGE','AGO','AID','AIM','AIR','AIT','ALA','ALE','ALL','ALP','ALS','ALT','AMA','AMI','AMP','AMU','AND','ANE','ANI','ANT','ANY','APE','APO','APP','APT','ARC','ARE','ARF','ARK','ARM','ARS','ART','ASH','ASK','ASP','ATE','ATT','AUK','AVA','AVE','AVO','AWA','AWE','AWL','AWN','AXE','AYE','AYS','AZO',
  'BAA','BAD','BAG','BAH','BAM','BAN','BAP','BAR','BAS','BAT','BAY','BED','BEE','BEG','BEL','BEN','BES','BET','BEY','BIB','BID','BIG','BIN','BIS','BIT','BIZ','BOA','BOB','BOD','BOG','BOP','BOS','BOT','BOW','BOX','BOY','BRA','BRO','BRR','BUB','BUD','BUG','BUM','BUN','BUP','BUR','BUS','BUT','BUY','BYE','BYS',
  'CAB','CAD','CAM','CAN','CAP','CAR','CAT','CAW','CEE','CEL','CEP','CHI','CIG','CIS','COB','COD','COG','COL','CON','COO','COP','COR','COS','COT','COW','COX','COY','COZ','CRU','CRY','CUB','CUD','CUE','CUM','CUP','CUR','CUT','CWM',
  'DAB','DAD','DAG','DAH','DAK','DAL','DAM','DAP','DAW','DAY','DEB','DEE','DEL','DEN','DEV','DEW','DEX','DEY','DIB','DID','DIE','DIF','DIG','DIM','DIN','DIP','DIS','DIT','DOC','DOE','DOG','DOL','DOM','DON','DOP','DOR','DOS','DOT','DOW','DRY','DUB','DUD','DUE','DUG','DUH','DUI','DUN','DUO','DUP','DYE',
  'EAR','EAT','EAU','EEL','EEW','EGG','EGO','EKE','ELD','ELF','ELK','ELL','ELM','ELS','EME','EMS','EMU','END','ENG','ENS','EON','ERA','ERE','ERG','ERN','ERR','ERS','ESS','ETA','ETH','EVE','EWE','EYE',
  'FAB','FAD','FAG','FAN','FAR','FAS','FAT','FAX','FAY','FED','FEE','FEH','FEM','FEN','FER','FES','FET','FEU','FEW','FEY','FEZ','FIB','FID','FIE','FIG','FIN','FIR','FIS','FIT','FIX','FIZ','FLU','FLY','FOB','FOE','FOG','FOH','FON','FOP','FOR','FOU','FOW','FOX','FOY','FRO','FRY','FUB','FUD','FUG','FUN','FUR',
  'GAB','GAD','GAE','GAG','GAL','GAM','GAN','GAP','GAR','GAS','GAT','GAY','GED','GEE','GEL','GEM','GET','GEY','GHI','GIB','GID','GIE','GIG','GIN','GIP','GIT','GNU','GOA','GOB','GOD','GOO','GOR','GOS','GOT','GOX','GUL','GUM','GUN','GUP','GUS','GUT','GUV','GUY','GYM','GYP',
  'HAD','HAE','HAG','HAH','HAJ','HAM','HAO','HAP','HAS','HAT','HAW','HAY','HEH','HEN','HEP','HER','HES','HET','HEW','HEX','HEY','HIC','HID','HIE','HIM','HIN','HIP','HIS','HIT','HMM','HOB','HOD','HOE','HOG','HOP','HOT','HOW','HOY','HUB','HUE','HUG','HUH','HUM','HUN','HUP','HUT',
  'ICE','ICH','ICK','ICY','IDS','IFF','IFS','IGG','ILL','IMP','INK','INN','INS','ION','IRE','IRK','ISM','ITS','IVY',
  'JAB','JAG','JAM','JAR','JAW','JAY','JEE','JET','JIB','JIG','JIN','JOB','JOE','JOG','JOT','JOW','JOY','JUG','JUN','JUS','JUT',
  'KAB','KAE','KAF','KAS','KAT','KAY','KEA','KED','KEG','KEN','KEP','KEX','KEY','KHI','KID','KIF','KIN','KIP','KIR','KIS','KIT','KOA','KOB','KOI','KOP','KOR','KOS','KUE',
  'LAB','LAC','LAD','LAG','LAM','LAP','LAR','LAS','LAT','LAV','LAW','LAX','LAY','LEA','LED','LEE','LEG','LEI','LEK','LES','LET','LEU','LEV','LEX','LEY','LIB','LID','LIE','LIN','LIP','LIS','LIT','LOG','LOO','LOP','LOT','LOW','LUG','LUV','LUX','LYE',
  'MAC','MAD','MAE','MAG','MAN','MAP','MAR','MAS','MAT','MAW','MAX','MAY','MED','MEL','MEM','MEN','MET','MEW','MHO','MIB','MIC','MID','MIG','MIL','MIM','MIR','MIS','MIX','MOA','MOB','MOC','MOD','MOG','MOL','MOM','MON','MOO','MOP','MOR','MOS','MOT','MOW','MUD','MUG','MUM','MUN','MUS','MUT','MYC',
  'NAB','NAE','NAG','NAH','NAM','NAN','NAP','NAW','NAY','NEE','NET','NEW','NIB','NIL','NIM','NIP','NIT','NIX','NOB','NOD','NOG','NOM','NOO','NOR','NOS','NOT','NOW','NUB','NUN','NUS','NUT',
  'OAF','OAK','OAR','OAT','OBE','OBI','OCA','ODD','ODE','ODS','OES','OFF','OFT','OHM','OHO','OHS','OIK','OIL','OKA','OKE','OLD','OLE','OMS','ONE','ONO','ONS','OOH','OOT','OPE','OPS','OPT','ORA','ORB','ORC','ORE','ORS','ORT','OSE','OUD','OUR','OUT','OVA','OWE','OWL','OWN','OXO','OXY',
  'PAC','PAD','PAH','PAL','PAM','PAN','PAP','PAR','PAS','PAT','PAW','PAX','PAY','PEA','PEC','PED','PEE','PEG','PEH','PEN','PEP','PER','PES','PET','PEW','PHI','PHO','PIA','PIC','PIE','PIG','PIN','PIP','PIS','PIT','PIU','PIX','PLY','POD','POH','POI','POL','POM','POP','POT','POW','POX','PRO','PRY','PSI','PUB','PUD','PUG','PUL','PUN','PUP','PUR','PUS','PUT','PYA','PYE','PYX',
  'QAT','QIS','QUA',
  'RAD','RAG','RAH','RAI','RAJ','RAM','RAN','RAP','RAS','RAT','RAW','RAX','RAY','REB','REC','RED','REE','REF','REG','REI','REM','REP','RES','RET','REV','REX','RHO','RIA','RIB','RID','RIF','RIG','RIM','RIN','RIP','ROB','ROC','ROD','ROE','ROM','ROT','ROW','RUB','RUE','RUG','RUM','RUN','RUT','RYA','RYE',
  'SAB','SAC','SAD','SAE','SAG','SAL','SAP','SAT','SAU','SAW','SAX','SAY','SEA','SEC','SEE','SEG','SEI','SEL','SEN','SER','SET','SEW','SHA','SHE','SHH','SHY','SIB','SIC','SIM','SIN','SIP','SIR','SIS','SIT','SIX','SKA','SKI','SKY','SLY','SOB','SOD','SOL','SOM','SON','SOP','SOS','SOT','SOU','SOW','SOX','SOY','SPA','SPY','STY','SUB','SUM','SUN','SUP','SUQ',
  'TAB','TAD','TAE','TAG','TAJ','TAM','TAN','TAO','TAP','TAR','TAS','TAT','TAU','TAV','TAW','TAX','TEA','TED','TEE','TEG','TEN','TET','TEW','THE','THO','THY','TIC','TIE','TIN','TIP','TIS','TIT','TOD','TOE','TOG','TOM','TON','TOO','TOP','TOR','TOT','TOW','TOY','TSK','TUB','TUG','TUI','TUN','TUP','TUT','TUX','TWA','TWO',
  'UDO','UGH','UKE','ULE','ULU','UMM','UMP','UNI','UNS','UPO','UPS','URB','URD','URN','URP','URS','USE','UTA','UTE','UTS',
  'VAC','VAN','VAR','VAS','VAT','VAU','VAV','VAW','VEE','VEG','VET','VEX','VIA','VID','VIE','VIG','VIM','VIS','VOW','VOX',
  'WAB','WAD','WAE','WAG','WAN','WAP','WAR','WAS','WAT','WAW','WAX','WAY','WEB','WED','WEE','WEN','WET','WHA','WHO','WHY','WIG','WIN','WIS','WIT','WIZ','WOE','WOG','WOK','WON','WOO','WOP','WOS','WOT','WOW',
  'XIS',
  'YAH','YAK','YAM','YAP','YAR','YAW','YAY','YEA','YEH','YEN','YEP','YES','YET','YEW','YID','YIN','YIP','YOB','YOD','YOK','YOM','YON','YOU','YOW','YUK','YUM','YUP',
  'ZAG','ZAP','ZAX','ZED','ZEE','ZEK','ZEN','ZEP','ZIG','ZIN','ZIP','ZIT','ZOA','ZOO',
  // 4-letter
  'ABLE','ACHE','ACID','ACRE','AGED','AIDE','ALSO','ARCH','AREA','ARMY','AVID','AWAY',
  'BABY','BACK','BAKE','BALD','BALE','BALL','BAND','BANE','BANG','BANK','BARE','BARK','BARN','BASE','BASH','BATH','BEAD','BEAK','BEAM','BEAN','BEAR','BEAT','BEEN','BEER','BELL','BELT','BEND','BENT','BEST','BIAS','BIKE','BILL','BIND','BIRD','BITE','BLEW','BLIP','BLOB','BLOC','BLOG','BLOT','BLOW','BLUE','BLUR','BOAR','BOAT','BODY','BOLD','BOLT','BOMB','BOND','BONE','BOOK','BOOM','BOOT','BORE','BORN','BOSS','BOTH','BOUT','BOWL','BRAG','BRAN','BRED','BREW','BULK','BULL','BUMP','BURN','BURP','BURY','BUSH','BUST','BUSY','BUZZ',
  'CAFE','CAGE','CAKE','CALF','CALL','CALM','CAME','CAMP','CANE','CAPE','CARD','CARE','CARP','CART','CASE','CASH','CAST','CAVE','CELL','CHAR','CHAT','CHEF','CHEW','CHIN','CHIP','CHOP','CITE','CITY','CLAD','CLAM','CLAP','CLAW','CLAY','CLIP','CLOD','CLOG','CLOT','CLUB','CLUE','COAL','COAT','CODE','COIL','COIN','COLD','COLT','COMB','COME','CONE','COOK','COOL','COPE','COPY','CORD','CORE','CORK','CORN','COST','COSY','COUP','COVE','COZY','CRAB','CRAM','CREW','CROP','CROW','CRUD','CUBE','CULT','CURB','CURE','CURL','CUTE',
  'DALE','DAME','DAMP','DARE','DARK','DARN','DART','DASH','DATA','DATE','DAWN','DEAD','DEAF','DEAL','DEAR','DEBT','DECK','DEED','DEEM','DEEP','DEER','DEMO','DENT','DENY','DESK','DIAL','DICE','DIET','DIME','DINE','DIRE','DIRT','DISC','DISH','DISK','DOCK','DOES','DOLE','DOLL','DOME','DONE','DOOM','DOOR','DOSE','DOVE','DOWN','DOZE','DRAB','DRAG','DRAW','DREW','DRIP','DROP','DRUM','DUAL','DUCK','DUEL','DUFF','DUKE','DULL','DUMB','DUMP','DUNE','DUNG','DUNK','DUSK','DUST','DUTY',
  'EACH','EARL','EARN','EASE','EAST','EASY','EDGE','EDIT','ELSE','EMIT','EPIC','EVEN','EVER','EVIL','EXAM','EXIT',
  'FACE','FACT','FADE','FAIL','FAIR','FAKE','FALL','FAME','FANG','FARE','FARM','FAST','FATE','FAWN','FEAR','FEAT','FEED','FEEL','FELL','FELT','FEND','FERN','FEST','FILE','FILL','FILM','FIND','FINE','FIRE','FIRM','FISH','FIST','FLAG','FLAK','FLAP','FLAT','FLAW','FLEA','FLED','FLEW','FLIP','FLIT','FLOG','FLOP','FLOW','FLUE','FLUX','FOAM','FOCI','FOIL','FOLD','FOLK','FOND','FONT','FOOD','FOOL','FOOT','FORD','FORE','FORK','FORM','FORT','FOUL','FOUR','FOWL','FREE','FRET','FROM','FROG','FUEL','FULL','FUME','FUND','FUNK','FURY','FUSE','FUSS','FUZZ',
  'GAIT','GALE','GALL','GAME','GANG','GAPE','GARB','GASH','GASP','GATE','GAVE','GAWK','GAZE','GEAR','GERM','GIFT','GILD','GILL','GILT','GIST','GIVE','GLAD','GLEE','GLEN','GLIB','GLOB','GLOM','GLOW','GLUE','GLUM','GLUT','GNAT','GNAW','GOAT','GOES','GOLD','GOLF','GONE','GOOD','GORE','GORY','GOWN','GRAB','GRAM','GRAY','GREW','GRID','GRIM','GRIN','GRIP','GRIT','GROW','GRUB','GULF','GULL','GULP','GURU','GUSH','GUST',
  'HACK','HAIL','HAIR','HALE','HALF','HALL','HALT','HAND','HANG','HARD','HARE','HARM','HARP','HASH','HASP','HATE','HAUL','HAVE','HAWK','HAZE','HAZY','HEAD','HEAL','HEAP','HEAR','HEAT','HEED','HEEL','HELD','HELL','HELM','HELP','HEMP','HERD','HERE','HERO','HIGH','HIKE','HILL','HILT','HIND','HINT','HIRE','HISS','HIVE','HOAX','HOLD','HOLE','HOLY','HOME','HONE','HOOD','HOOK','HOOP','HOPE','HORN','HOSE','HOST','HOUR','HOWL','HUFF','HUGE','HULL','HUMP','HUNG','HUNK','HUNT','HURL','HURT','HUSH','HYMN',
  'ICON','IDEA','IDLE','INCH','INTO','IRON','ISLE','ITEM',
  'JACK','JADE','JAIL','JAMB','JAPE','JAZZ','JEAN','JEER','JERK','JEST','JILT','JINX','JIVE','JOCK','JOIN','JOKE','JOLT','JOSH','JOWL','JUDO','JUMP','JUNE','JUNK','JURY','JUST','JUTE',
  'KALE','KEEN','KEEP','KELP','KEPT','KICK','KILL','KILT','KIND','KING','KISS','KITE','KNEE','KNEW','KNIT','KNOB','KNOT','KNOW',
  'LACE','LACK','LACY','LAID','LAIN','LAIR','LAKE','LAME','LAMP','LAND','LANE','LARD','LARK','LASH','LASS','LAST','LATE','LAUD','LAWN','LAZY','LEAD','LEAF','LEAK','LEAN','LEAP','LEER','LEFT','LEND','LENS','LENT','LESS','LICK','LIEU','LIFE','LIFT','LIKE','LIMB','LIME','LIMP','LINE','LINK','LINT','LION','LIST','LIVE','LOAD','LOAF','LOAM','LOAN','LOBE','LOCK','LODE','LOFT','LOGO','LONE','LONG','LOOK','LOOM','LOOP','LOOT','LORD','LORE','LOSE','LOSS','LOST','LOUD','LOVE','LUCK','LULL','LUMP','LURE','LURK','LUSH','LUST',
  'MACE','MADE','MAIL','MAIN','MAKE','MALE','MALL','MALT','MANE','MANY','MARE','MARK','MARS','MASH','MASK','MASS','MAST','MATE','MAZE','MEAD','MEAL','MEAN','MEAT','MEEK','MEET','MELD','MELT','MEMO','MEND','MENU','MERE','MESH','MESS','MICE','MILD','MILE','MILK','MILL','MIME','MIND','MINE','MINT','MIRE','MISS','MIST','MITE','MOAT','MOCK','MODE','MOLD','MOLE','MOLT','MONK','MOOD','MOON','MOOR','MOOT','MORE','MORN','MOSS','MOST','MOTH','MOVE','MUCH','MUCK','MUFF','MULE','MULL','MURK','MUSE','MUSH','MUSK','MUST','MUTE','MUTT',
  'NAIL','NAME','NAPE','NAVY','NEAR','NEAT','NECK','NEED','NEST','NEWS','NEXT','NICE','NICK','NINE','NODE','NONE','NOOK','NOON','NORM','NOSE','NOTE','NOUN','NUDE','NULL','NUMB',
  'OATH','OBEY','ODOR','OINK','OKAY','OMEN','OMIT','ONCE','ONLY','ONTO','OOZE','OPEN','OPUS','ORAL','OVEN','OVER','OWED',
  'PACE','PACK','PACT','PAGE','PAID','PAIL','PAIN','PAIR','PALE','PALM','PANE','PANG','PANT','PARE','PARK','PART','PASS','PAST','PATH','PAVE','PAWN','PEAK','PEAL','PEAR','PEAT','PECK','PEEK','PEEL','PEER','PELT','PEND','PERK','PEST','PICK','PIER','PIKE','PILE','PILL','PINE','PINK','PINT','PIPE','PLAN','PLAY','PLEA','PLOD','PLOT','PLOW','PLOY','PLUG','PLUM','PLUS','POCK','POET','POKE','POLE','POLL','POLO','POMP','POND','PONY','POOL','POOR','POPE','PORE','PORK','PORT','POSE','POST','POUR','POUT','PRAY','PREP','PREY','PRIG','PRIM','PROD','PROP','PROW','PUCK','PUFF','PULL','PULP','PUMP','PUNK','PURE','PUSH','PUTT',
  'QUAD','QUAY','QUIT','QUIZ',
  'RACE','RACK','RAFT','RAGE','RAID','RAIL','RAIN','RAKE','RAMP','RANG','RANK','RANT','RARE','RASH','RASP','RATE','RAVE','RAZE','READ','REAL','REAM','REAP','REAR','REED','REEF','REEL','REIN','RELY','REND','RENT','REST','RICE','RICH','RIDE','RIFT','RILE','RILL','RIND','RING','RIOT','RISE','RISK','RITE','ROAD','ROAM','ROAR','ROBE','ROCK','RODE','ROLE','ROLL','ROOF','ROOM','ROOT','ROPE','ROSE','ROSY','ROTE','ROUT','ROVE','RUDE','RUIN','RULE','RUMP','RUNE','RUNG','RUNT','RUSE','RUSH','RUST',
  'SACK','SAFE','SAGA','SAGE','SAID','SAIL','SAKE','SALE','SALT','SAME','SAND','SANE','SANG','SANK','SASH','SAVE','SCAB','SCAM','SCAN','SCAR','SEAL','SEAM','SEAR','SEAT','SECT','SEED','SEEK','SEEM','SEEN','SELF','SELL','SEMI','SEND','SENT','SEPT','SHED','SHIN','SHIP','SHOD','SHOE','SHOO','SHOP','SHOT','SHOW','SHUT','SICK','SIDE','SIFT','SIGH','SIGN','SILK','SILL','SILT','SING','SINK','SIRE','SITE','SIZE','SKIT','SLAB','SLAG','SLAP','SLAT','SLAW','SLAY','SLED','SLEW','SLID','SLIM','SLIT','SLOB','SLOP','SLOT','SLOW','SLUG','SLUM','SLUR','SMOG','SNAP','SNAG','SNIP','SNOB','SNOT','SNOW','SNUB','SNUG','SOAK','SOAP','SOAR','SOCK','SODA','SOFA','SOFT','SOIL','SOLD','SOLE','SOLO','SOME','SONG','SOON','SOOT','SORE','SORT','SOUL','SOUP','SOUR','SPAN','SPAR','SPEC','SPED','SPIN','SPIT','SPOT','SPRY','SPUD','SPUN','SPUR','STAB','STAG','STAR','STAY','STEM','STEP','STEW','STIR','STOP','STUB','STUD','STUN','SUCK','SUIT','SULK','SUMP','SUNG','SUNK','SURE','SURF','SWAB','SWAM','SWAN','SWAP','SWAY','SWIM',
  'TACK','TACT','TAIL','TAKE','TALE','TALK','TALL','TAME','TANG','TANK','TAPE','TARN','TART','TASK','TAXI','TEAK','TEAL','TEAM','TEAR','TEEM','TELL','TEMP','TEND','TENT','TERM','TERN','TEST','TEXT','THAN','THAT','THAW','THEM','THEN','THEY','THIN','THIS','THUD','THUG','THUS','TICK','TIDE','TIDY','TIED','TIER','TIFF','TILE','TILL','TILT','TIME','TINE','TINY','TIRE','TOAD','TOED','TOIL','TOLD','TOLL','TOMB','TOME','TONE','TOOK','TOOL','TORE','TORN','TORT','TOSS','TOUR','TOWN','TRAP','TRAY','TREE','TREK','TRIM','TRIO','TRIP','TROD','TROT','TRUE','TSAR','TUBA','TUBE','TUCK','TUFT','TUNA','TUNE','TURF','TURN','TUSK','TUTU','TWIG','TWIN','TYPE',
  'UGLY','UNDO','UNIT','UNTO','UPON','URGE','USED','USER',
  'VAIN','VALE','VANE','VARY','VASE','VAST','VEAL','VEER','VEIL','VEIN','VENT','VERB','VERY','VEST','VETO','VICE','VIEW','VILE','VINE','VOID','VOLE','VOLT','VOTE',
  'WADE','WAGE','WAIL','WAIT','WAKE','WALK','WALL','WAND','WANT','WARD','WARM','WARN','WARP','WART','WARY','WASH','WASP','WAVE','WAVY','WAXY','WEAK','WEAN','WEAR','WEED','WEEK','WEEP','WELD','WELL','WELT','WENT','WEPT','WERE','WEST','WHAT','WHEN','WHIM','WHIP','WHOM','WICK','WIDE','WIFE','WILD','WILL','WILT','WILY','WIMP','WIND','WINE','WING','WINK','WIPE','WIRE','WISE','WISH','WISP','WITH','WOKE','WOLF','WOMB','WOOD','WOOL','WORD','WORE','WORK','WORM','WORN','WOVE','WRAP','WREN','WRIT',
  'YANK','YARD','YARN','YAWN','YEAR','YELL','YOGA','YOKE','YOUR',
  'ZEAL','ZERO','ZEST','ZINC','ZING','ZONE','ZOOM',
  // 5-letter (common)
  'ABOUT','ABOVE','ABUSE','ADMIT','ADOPT','AFTER','AGAIN','AGENT','AGREE','AHEAD','ALARM','ALIEN','ALIGN','ALIVE','ALLOW','ALONE','ALONG','ALTER','AMONG','ANGEL','ANGER','ANGLE','ANGRY','APART','APPLE','APPLY','ARENA','ARGUE','ARISE','ASIDE','ASSET',
  'BASIC','BATCH','BEACH','BEGIN','BEING','BELOW','BENCH','BLACK','BLADE','BLAME','BLAND','BLANK','BLAST','BLAZE','BLEED','BLEND','BLESS','BLIND','BLINK','BLOCK','BLOOD','BLOWN','BOARD','BOAST','BONUS','BOOTH','BOUND','BRAIN','BRAND','BRAVE','BREAD','BREAK','BREED','BRICK','BRIDE','BRIEF','BRING','BROAD','BROKE','BROWN','BRUSH','BUILD','BURST','BUYER',
  'CABIN','CANDY','CARRY','CATCH','CAUSE','CHAIN','CHAIR','CHALK','CHAMP','CHAOS','CHARM','CHART','CHASE','CHEAP','CHEAT','CHECK','CHEEK','CHEER','CHESS','CHEST','CHIEF','CHILD','CHINA','CHUNK','CIVIC','CIVIL','CLAIM','CLASH','CLASS','CLEAN','CLEAR','CLERK','CLICK','CLIMB','CLING','CLOCK','CLONE','CLOSE','CLOTH','CLOUD','COACH','COAST','COLOR','COMET','CORAL','COUNT','COURT','COVER','CRACK','CRAFT','CRANE','CRASH','CRAZY','CREAM','CRIME','CROSS','CROWD','CROWN','CRUEL','CRUSH','CURVE','CYCLE',
  'DAILY','DANCE','DEBUT','DELAY','DELTA','DEPTH','DOING','DOUBT','DOUGH','DOZEN','DRAFT','DRAIN','DRAMA','DRANK','DRAWN','DREAM','DRESS','DRIED','DRIFT','DRILL','DRINK','DRIVE','DROWN','DYING',
  'EAGER','EARLY','EARTH','EIGHT','ELDER','ELECT','ELITE','EMPTY','ENEMY','ENJOY','ENTER','EQUAL','ERROR','EVENT','EVERY','EXACT','EXIST','EXTRA',
  'FAINT','FAITH','FALSE','FANCY','FAULT','FEAST','FENCE','FEWER','FIBER','FIELD','FIFTH','FIFTY','FIGHT','FINAL','FLAME','FLASH','FLESH','FLOAT','FLOOD','FLOOR','FLOUR','FLUID','FLUTE','FOCUS','FORCE','FORGE','FORTH','FORUM','FOUND','FRAME','FRANK','FRAUD','FRESH','FRONT','FROST','FRUIT','FULLY',
  'GIANT','GIVEN','GLARE','GLASS','GLOBE','GLOOM','GLORY','GLOVE','GOING','GRACE','GRADE','GRAIN','GRAND','GRANT','GRAPE','GRAPH','GRASP','GRASS','GRAVE','GREAT','GREEN','GREET','GRIEF','GRILL','GRIND','GROAN','GROOM','GROUP','GROVE','GROWN','GUARD','GUESS','GUEST','GUIDE','GUILD','GUILT',
  'HAPPY','HARSH','HEART','HEAVY','HENCE','HOBBY','HONOR','HORSE','HOTEL','HOUSE','HUMAN','HUMOR',
  'IMAGE','IMPLY','INDEX','INNER','INPUT','ISSUE','IVORY',
  'JELLY','JEWEL','JOINT','JOKER','JUICE','JUICY',
  'KNIFE','KNOCK','KNOWN',
  'LABEL','LABOR','LARGE','LASER','LATER','LAUGH','LAYER','LEARN','LEASE','LEAVE','LEGAL','LEMON','LEVEL','LIGHT','LIMIT','LINEN','LIVER','LOCAL','LODGE','LOGIC','LOOSE','LOVER','LOWER','LOYAL','LUCKY','LUNAR','LUNCH',
  'MAGIC','MAJOR','MANOR','MAPLE','MARCH','MASON','MATCH','MAYOR','MEDIA','MERCY','MERGE','MERIT','METAL','METER','MIGHT','MINOR','MINUS','MODEL','MONEY','MONTH','MORAL','MOTOR','MOUNT','MOUSE','MOUTH','MOVED','MOVIE','MUSIC',
  'NAIVE','NERVE','NEVER','NIGHT','NOBLE','NOISE','NORTH','NOTED','NOVEL','NURSE',
  'OCEAN','OFFER','OFTEN','OLIVE','ONSET','OPERA','ORDER','OTHER','OUTER','OWNER',
  'PAINT','PANEL','PANIC','PARTY','PASTA','PATCH','PAUSE','PEACE','PEACH','PEARL','PENNY','PHASE','PHONE','PHOTO','PIANO','PIECE','PILOT','PITCH','PIXEL','PLACE','PLAIN','PLANE','PLANT','PLATE','PLAZA','PLEAD','PLUMB','PLUME','PLUMP','POINT','POLAR','POUND','POWER','PRESS','PRICE','PRIDE','PRIME','PRINT','PRIOR','PRIZE','PROBE','PROOF','PROUD','PROVE','PROXY','PULSE','PUNCH','PUPIL','PURSE','QUEEN','QUEST','QUEUE','QUICK','QUIET','QUITE','QUOTE',
  'RADAR','RADIO','RAISE','RALLY','RANCH','RANGE','RAPID','RATIO','REACH','REACT','REALM','REBEL','REIGN','RELAX','REPLY','RIDER','RIDGE','RIFLE','RIGHT','RIGID','RISKY','RIVAL','RIVER','ROBIN','ROBOT','ROCKY','ROMAN','ROUGH','ROUND','ROUTE','ROVER','ROYAL','RULER','RUMOR','RURAL',
  'SAINT','SALAD','SAUCE','SCALE','SCARE','SCENE','SCENT','SCOPE','SCORE','SCOUT','SHADE','SHALL','SHAME','SHAPE','SHARE','SHARK','SHARP','SHEEP','SHEER','SHEET','SHELF','SHELL','SHIFT','SHINE','SHIRT','SHOCK','SHORE','SHORT','SHOUT','SHOWN','SIGHT','SINCE','SIXTY','SIZED','SKILL','SKULL','SLASH','SLATE','SLAVE','SLEEP','SLICE','SLIDE','SLOPE','SMALL','SMART','SMELL','SMILE','SMOKE','SOLAR','SOLID','SOLVE','SORRY','SOUND','SOUTH','SPACE','SPARE','SPARK','SPEAK','SPEED','SPEND','SPENT','SPICE','SPIKE','SPINE','SPLIT','SPOKE','SPORT','SPRAY','SQUAD','STACK','STAFF','STAGE','STAIN','STAKE','STALE','STALL','STAMP','STAND','STARE','START','STATE','STEAK','STEAL','STEAM','STEEL','STEEP','STEER','STICK','STIFF','STILL','STOCK','STOLE','STONE','STOOD','STOOL','STORE','STORM','STORY','STOVE','STRIP','STUCK','STUDY','STUFF','STUMP','STYLE','SUGAR','SUITE','SURGE','SWAMP','SWEEP','SWEET','SWIFT','SWING','SWIRL','SWORD',
  'TABLE','TASTE','TEACH','TEETH','TENSE','THEME','THICK','THIEF','THING','THINK','THIRD','THOSE','THREE','THREW','THROW','THUMB','TIGER','TIGHT','TIMER','TIRED','TITLE','TODAY','TOKEN','TOTAL','TOUCH','TOUGH','TOWEL','TOWER','TOXIC','TRACE','TRACK','TRADE','TRAIL','TRAIN','TRAIT','TRASH','TREAT','TREND','TRIAL','TRIBE','TRICK','TRIED','TROOP','TRUCK','TRULY','TRUMP','TRUNK','TRUST','TRUTH','TULIP','TUMOR','TWICE','TWIST',
  'ULTRA','UNCLE','UNDER','UNION','UNITE','UNITY','UNTIL','UPPER','UPSET','URBAN','USAGE','USUAL','UTTER',
  'VALID','VALUE','VAULT','VERSE','VIDEO','VIGOR','VIRAL','VIRUS','VISIT','VITAL','VIVID','VOCAL','VOICE','VOTER',
  'WASTE','WATCH','WATER','WEARY','WEAVE','WEDGE','WEIGH','WEIRD','WHALE','WHEAT','WHEEL','WHERE','WHICH','WHILE','WHITE','WHOLE','WHOSE','WIDER','WITCH','WOMAN','WOMEN','WORLD','WORRY','WORSE','WORST','WORTH','WOULD','WOUND','WRATH','WRITE','WRONG','WROTE',
  'YACHT','YIELD','YOUNG','YOUTH',
  'ZEBRA',
]);

// Module-level mutable reference — swapped to full dictionary once loaded.
let ACTIVE_WORD_SET: Set<string> = VALID_WORDS;

function buildTilePool(): string[] {
  const pool: string[] = [];
  for (const [letter, count] of Object.entries(TILE_COUNTS)) {
    for (let i = 0; i < count; i++) pool.push(letter);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

// ── AI move generation ─────────────────────────────────────────────────
type Direction = 'H' | 'V';
type Placement = { word: string; cells: [number, number][]; newCells: { r: number; c: number; letter: string }[]; score: number };

function letterCount(arr: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of arr) m.set(l, (m.get(l) ?? 0) + 1);
  return m;
}

function findAnchors(board: (string | null)[][]): [number, number][] {
  const anchors: [number, number][] = [];
  let any = false;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c]) { any = true; continue; }
      // adjacent to a placed tile?
      if (
        (r > 0 && board[r - 1][c]) ||
        (r < SIZE - 1 && board[r + 1][c]) ||
        (c > 0 && board[r][c - 1]) ||
        (c < SIZE - 1 && board[r][c + 1])
      ) {
        anchors.push([r, c]);
      }
    }
  }
  if (!any) return [[CENTER, CENTER]];
  return anchors;
}

function scorePlacement(
  board: (string | null)[][],
  cells: [number, number][],
  newCellSet: Set<string>,
  newCellLetters?: Map<string, string>,
): number {
  let wordMult = 1;
  let letterTotal = 0;
  for (const [r, c] of cells) {
    const bonus = BONUS_MAP.get(`${r},${c}`);
    const key = `${r},${c}`;
    const letter = newCellLetters?.get(key) ?? board[r][c]!;
    const ls = TILE_SCORES[letter] || 0;
    const isNew = newCellSet.has(key);
    if (isNew && bonus === 'DL') letterTotal += ls * 2;
    else if (isNew && bonus === 'TL') letterTotal += ls * 3;
    else letterTotal += ls;
    if (isNew && bonus === 'DW') wordMult *= 2;
    if (isNew && (bonus === 'TW' || bonus === 'ST')) wordMult *= 3;
  }
  return letterTotal * wordMult;
}

// Validate cross-words formed perpendicular to a horizontal/vertical placement.
// Returns total bonus score from all valid cross-words, or -1 if any invalid.
function validateAndScoreCrossWords(
  board: (string | null)[][],
  newCells: { r: number; c: number; letter: string }[],
  mainDir: Direction,
): number {
  let crossScore = 0;
  for (const { r, c, letter } of newCells) {
    // Cross direction is perpendicular to mainDir
    const isVert = mainDir === 'H';
    let sr = r, sc = c;
    if (isVert) {
      while (sr > 0 && board[sr - 1][c]) sr--;
    } else {
      while (sc > 0 && board[r][sc - 1]) sc--;
    }
    const wordCells: [number, number][] = [];
    let wr = sr, wc = sc;
    if (isVert) {
      while (wr < SIZE && (board[wr][c] || (wr === r && letter))) { wordCells.push([wr, c]); wr++; }
    } else {
      while (wc < SIZE && (board[r][wc] || (wc === c && letter))) { wordCells.push([r, wc]); wc++; }
    }
    if (wordCells.length < 2) continue; // single letter, no cross-word
    // Build the word
    const word = wordCells.map(([rr, cc]) => (rr === r && cc === c) ? letter : board[rr][cc]!).join('');
    if (!ACTIVE_WORD_SET.has(word)) return -1;
    // Score the cross-word with bonuses for the new letter only
    let wm = 1;
    let lt = 0;
    for (const [rr, cc] of wordCells) {
      const isThisCellNew = (rr === r && cc === c);
      const ls = TILE_SCORES[isThisCellNew ? letter : board[rr][cc]!] || 0;
      const bonus = BONUS_MAP.get(`${rr},${cc}`);
      if (isThisCellNew && bonus === 'DL') lt += ls * 2;
      else if (isThisCellNew && bonus === 'TL') lt += ls * 3;
      else lt += ls;
      if (isThisCellNew && bonus === 'DW') wm *= 2;
      if (isThisCellNew && (bonus === 'TW' || bonus === 'ST')) wm *= 3;
    }
    crossScore += lt * wm;
  }
  return crossScore;
}

function generateAiMoves(
  board: (string | null)[][],
  rack: string[],
  isFirstMove: boolean,
): Placement[] {
  const anchors = findAnchors(board);
  const rackCount = letterCount(rack);
  const moves: Placement[] = [];

  // Filter words to those whose letters could plausibly be formed from rack + board letters.
  // For first move, must be formable from rack alone.
  const candidates: string[] = [];
  for (const word of ACTIVE_WORD_SET) {
    if (word.length < 2 || word.length > 7 + 7) continue;
    if (isFirstMove) {
      // Must be ≤ rack.length and use only rack letters
      if (word.length > rack.length) continue;
      const need = letterCount(word.split(''));
      let ok = true;
      for (const [l, n] of need) {
        if ((rackCount.get(l) ?? 0) < n) { ok = false; break; }
      }
      if (ok) candidates.push(word);
    } else {
      // Word uses up to (rack.length) new tiles. Quick filter: check that letters not in
      // board that the word needs ≤ rack capacity. Skip exact filter (slow); validate later.
      candidates.push(word);
    }
  }

  for (const word of candidates) {
    for (const anchor of anchors) {
      for (const dir of ['H', 'V'] as Direction[]) {
        for (let offset = 0; offset < word.length; offset++) {
          const startR = dir === 'V' ? anchor[0] - offset : anchor[0];
          const startC = dir === 'H' ? anchor[1] - offset : anchor[1];
          const endR = dir === 'V' ? startR + word.length - 1 : startR;
          const endC = dir === 'H' ? startC + word.length - 1 : startC;
          if (startR < 0 || startC < 0 || endR >= SIZE || endC >= SIZE) continue;

          // Cell BEFORE start must be empty (or off-board) — otherwise word extends backward
          const beforeR = dir === 'V' ? startR - 1 : startR;
          const beforeC = dir === 'H' ? startC - 1 : startC;
          if (beforeR >= 0 && beforeC >= 0 && beforeR < SIZE && beforeC < SIZE && board[beforeR][beforeC]) continue;

          // Cell AFTER end must be empty (or off-board)
          const afterR = dir === 'V' ? endR + 1 : endR;
          const afterC = dir === 'H' ? endC + 1 : endC;
          if (afterR >= 0 && afterC >= 0 && afterR < SIZE && afterC < SIZE && board[afterR][afterC]) continue;

          // Walk the placement
          const cells: [number, number][] = [];
          const newCells: { r: number; c: number; letter: string }[] = [];
          const needed = new Map<string, number>();
          let usesAnchor = false;
          let conflicts = false;
          let touchesBoard = false;
          for (let i = 0; i < word.length; i++) {
            const r = dir === 'V' ? startR + i : startR;
            const c = dir === 'H' ? startC + i : startC;
            cells.push([r, c]);
            const existing = board[r][c];
            if (existing) {
              if (existing !== word[i]) { conflicts = true; break; }
              touchesBoard = true;
            } else {
              newCells.push({ r, c, letter: word[i] });
              needed.set(word[i], (needed.get(word[i]) ?? 0) + 1);
            }
            if (r === anchor[0] && c === anchor[1]) usesAnchor = true;
          }
          if (conflicts || !usesAnchor) continue;
          if (newCells.length === 0) continue; // no new tiles → not a play
          if (!isFirstMove && !touchesBoard) continue; // must touch existing
          if (isFirstMove && !cells.some(([r, c]) => r === CENTER && c === CENTER)) continue;

          // Rack supply check
          let rackOk = true;
          for (const [l, n] of needed) {
            if ((rackCount.get(l) ?? 0) < n) { rackOk = false; break; }
          }
          if (!rackOk) continue;

          // Validate cross-words
          const crossBonus = validateAndScoreCrossWords(board, newCells, dir);
          if (crossBonus < 0) continue;

          // Score main word
          const newCellSet = new Set(newCells.map(nc => `${nc.r},${nc.c}`));
          const newCellMap = new Map(newCells.map(nc => [`${nc.r},${nc.c}`, nc.letter]));
          const mainScore = scorePlacement(board, cells, newCellSet, newCellMap);
          const all7Bonus = newCells.length === 7 ? 50 : 0;
          const total = mainScore + crossBonus + all7Bonus;

          moves.push({ word, cells, newCells, score: total });
        }
      }
    }
  }
  return moves;
}

function pickAiMove(moves: Placement[], difficulty: 'easy' | 'medium' | 'hard'): Placement | null {
  if (moves.length === 0) return null;
  const sorted = [...moves].sort((a, b) => b.score - a.score);
  if (difficulty === 'hard') return sorted[0];
  if (difficulty === 'medium') {
    // pick from top half
    const top = Math.max(1, Math.floor(sorted.length / 2));
    return sorted[Math.floor(Math.random() * top)];
  }
  // easy: pick from bottom-third
  const start = Math.floor(sorted.length * 2 / 3);
  return sorted[start + Math.floor(Math.random() * (sorted.length - start))];
}

// ── Score breakdown helper ─────────────────────────────────────────────
interface ScoreBreakdown {
  word: string;
  mainWordScore: number;
  crossWordsScore: number;
  bingoBonus: number;
  total: number;
  details: string[];
}

function buildScoreBreakdown(
  board: (string | null)[][],
  wordCells: [number, number][],
  newCellSet: Set<string>,
  crossScore: number,
  all7Bonus: number,
): ScoreBreakdown {
  const word = wordCells.map(([r, c]) => board[r][c]).join('');
  let wordMult = 1;
  let letterTotal = 0;
  const details: string[] = [];

  for (const [r, c] of wordCells) {
    const bonus = BONUS_MAP.get(`${r},${c}`);
    const letter = board[r][c]!;
    const ls = TILE_SCORES[letter] || 0;
    const isNew = newCellSet.has(`${r},${c}`);
    let pts = ls;
    if (isNew && bonus === 'DL') { pts = ls * 2; details.push(`${letter} on DL = ${pts}`); }
    else if (isNew && bonus === 'TL') { pts = ls * 3; details.push(`${letter} on TL = ${pts}`); }
    else if (isNew && bonus === 'DW') { wordMult *= 2; details.push(`${letter} on DW`); }
    else if (isNew && (bonus === 'TW' || bonus === 'ST')) { wordMult *= 3; details.push(`${letter} on ${bonus === 'ST' ? '★' : 'TW'}`); }
    letterTotal += pts;
  }
  const mainScore = letterTotal * wordMult;
  if (wordMult > 1) details.push(`×${wordMult} word multiplier`);

  return {
    word,
    mainWordScore: mainScore,
    crossWordsScore: crossScore,
    bingoBonus: all7Bonus,
    total: mainScore + crossScore + all7Bonus,
    details,
  };
}

// ── Component ──────────────────────────────────────────────────────────
// Seat 0 = local human. Seats 1..N-1 = AI opponents (until online relay is wired).
function ScrabbleGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty = 'medium', numPlayers, multiplayerState, onMultiplayerMove }: GameProps) {
  const isOnline = !!multiplayerState;
  const isHost = isOnline && multiplayerState.playerNumber === 1;
  const mySeat = isOnline ? (multiplayerState.playerNumber - 1) : 0;
  // Clamp to 2..4; default 2. In online mode, seats = roster size (min 2).
  const SEATS = isOnline
    ? Math.max(2, Math.min(4, multiplayerState?.players?.length || 2))
    : Math.max(2, Math.min(4, numPlayers ?? 2));

  const [board, setBoard] = useState<(string | null)[][]>(
    () => Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  );
  // One rack per seat. Seat 0 is the human's.
  const [racks, setRacks] = useState<string[][]>(() => Array.from({ length: SEATS }, () => [] as string[]));
  const [pool, setPool] = useState<string[]>([]);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [placedCells, setPlacedCells] = useState<Map<string, true>>(new Map());
  const [lockedCells, setLockedCells] = useState<Set<string>>(new Set());
  // One score per seat.
  const [scores, setScores] = useState<number[]>(() => Array.from({ length: SEATS }, () => 0));
  const [round, setRound] = useState(0); // completed full rounds
  const [currentSeat, setCurrentSeat] = useState(0);
  const [aiThinking, setAiThinking] = useState(false);
  const [started, setStarted] = useState(false);
  const [lastWord, setLastWord] = useState('');
  const [isFirstMove, setIsFirstMove] = useState(true);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [dictLoaded, setDictLoaded] = useState(false);
  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Load full SOWPODS dictionary
  useEffect(() => {
    fetch('/scrabble-dictionary.txt')
      .then(r => r.text())
      .then(text => {
        const words = text.split('\n')
          .map(w => w.trim().toUpperCase())
          .filter(w => w.length >= 2 && w.length <= 15 && /^[A-Z]+$/.test(w));
        ACTIVE_WORD_SET = new Set(words);
        setDictLoaded(true);
      })
      .catch(() => {
        // Keep embedded fallback
        setDictLoaded(true);
      });
  }, []);

  const maxRounds = 6 + stage * 6; // each seat plays maxRounds turns
  const targetScore = stage * 30;
  const isHumanTurn = currentSeat === (isOnline ? mySeat : 0);
  const playerRack = racks[isOnline ? mySeat : 0] ?? [];
  const playerScore = scores[isOnline ? mySeat : 0] ?? 0;

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      if (!endedRef.current) fn();
    }, ms);
    timeoutsRef.current.push(id);
  }, []);

  useEffect(() => {
    endedRef.current = false;
    return () => {
      endedRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  // Initial deal — one rack per seat. Offline only; online host seeds via effect below.
  useEffect(() => {
    if (isOnline) return;
    const fresh = buildTilePool();
    const dealt: string[][] = [];
    for (let i = 0; i < SEATS; i++) dealt.push(fresh.splice(0, 7));
    setRacks(dealt);
    setPool(fresh);
    onMessage(
      SEATS > 2
        ? `Your turn — ${SEATS - 1} AI opponents (target ${targetScore})`
        : `Your turn — place tiles to make a word (target ${targetScore})`,
    );
  // intentionally only on mount

  }, []);

  // Online: host seeds initial state once.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!isOnline || !onMultiplayerMove || !isHost || seededRef.current) return;
    const bs = multiplayerState?.boardState as { racks?: unknown } | null | undefined;
    if (bs && bs.racks) return;
    seededRef.current = true;
    const fresh = buildTilePool();
    const dealt: string[][] = [];
    for (let i = 0; i < SEATS; i++) dealt.push(fresh.splice(0, 7));
    const emptyBoard = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    const emptyScores = Array.from({ length: SEATS }, () => 0);
    onMultiplayerMove({
      boardState: {
        board: emptyBoard,
        racks: dealt,
        pool: fresh,
        scores: emptyScores,
        currentSeat: 0,
        isFirstMove: true,
        lastWord: '',
      },
    });
  }, [isOnline, onMultiplayerMove, isHost, multiplayerState, SEATS]);

  // Online: reconcile from server boardState.
  useEffect(() => {
    if (!isOnline || !multiplayerState) return;
    const bs = multiplayerState.boardState as {
      board?: (string | null)[][];
      racks?: string[][];
      pool?: string[];
      scores?: number[];
      currentSeat?: number;
      isFirstMove?: boolean;
      lastWord?: string;
    } | null | undefined;
    if (!bs || !bs.racks) return;
    if (bs.board) setBoard(bs.board);
    if (bs.racks) setRacks(bs.racks);
    if (bs.pool) setPool(bs.pool);
    if (bs.scores) setScores(bs.scores);
    if (typeof bs.currentSeat === 'number') setCurrentSeat(bs.currentSeat);
    if (typeof bs.isFirstMove === 'boolean') setIsFirstMove(bs.isFirstMove);
    if (typeof bs.lastWord === 'string') setLastWord(bs.lastWord);
    // Lock any occupied cells
    if (bs.board) {
      const locked = new Set<string>();
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
        if (bs.board[r][c]) locked.add(`${r},${c}`);
      }
      setLockedCells(locked);
    }
    // Winner check
    if (multiplayerState.winner && !endedRef.current) {
      endedRef.current = true;
      const iWon = multiplayerState.winner === multiplayerState.playerNumber;
      const myScore = (bs.scores && bs.scores[mySeat]) || 0;
      onEnd({ score: myScore, stars: iWon ? 3 : 1, summary: iWon ? `You won Scrabble with ${myScore} pts!` : 'Opponent won Scrabble.' });
    }
  }, [isOnline, multiplayerState, mySeat, onEnd]);

  const placedKeys = useMemo(() => new Set(placedCells.keys()), [placedCells]);

  const drawUpTo7 = useCallback((rack: string[], src: string[]): { rack: string[]; pool: string[] } => {
    const r = [...rack];
    const p = [...src];
    while (r.length < 7 && p.length > 0) r.push(p.shift()!);
    return { rack: r, pool: p };
  }, []);

  const finishGame = useCallback((finalScores: number[]) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const mine = finalScores[0] ?? 0;
    const best = Math.max(...finalScores);
    const winners = finalScores.reduce<number[]>((acc, s, i) => (s === best ? [...acc, i] : acc), []);
    const iWon = winners.includes(0);
    const tied = iWon && winners.length > 1;

    let stars = 1;
    if (iWon && !tied) stars = mine >= targetScore ? 3 : 2;
    else if (tied) stars = 2;

    const opponentScores = finalScores.slice(1);
    const summary = iWon && !tied
      ? `You won with ${mine} vs ${opponentScores.join(', ')}!`
      : tied
        ? `Tied at ${mine}!`
        : `You scored ${mine} · best was ${best}.`;
    schedule(() => onEnd({ score: mine, stars, summary }), 800);
  }, [targetScore, onEnd, schedule]);

  const handleRackClick = (idx: number) => {
    if (!isHumanTurn) return;
    setSelectedTile(prev => prev === idx ? null : idx);
  };

  const handleBoardClick = (r: number, c: number) => {
    if (!isHumanTurn) return;
    const key = `${r},${c}`;
    if (lockedCells.has(key)) return;

    if (selectedTile === null) {
      // Pick up a placed tile (this turn only)
      if (board[r][c] && placedKeys.has(key)) {
        const letter = board[r][c]!;
        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = null;
        setBoard(newBoard);
        setRacks(prev => prev.map((rack, i) => (i === 0 ? [...rack, letter] : rack)));
        const newPlaced = new Map(placedCells);
        newPlaced.delete(key);
        setPlacedCells(newPlaced);
      }
      return;
    }
    if (board[r][c]) return;

    const letter = playerRack[selectedTile];
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = letter;
    setBoard(newBoard);
    setRacks(prev => prev.map((rack, i) => (i === 0 ? rack.filter((_, j) => j !== selectedTile) : rack)));
    setSelectedTile(null);
    const newPlaced = new Map(placedCells);
    newPlaced.set(key, true);
    setPlacedCells(newPlaced);
  };

  // Validate the player's current placement and return the main word + score (or invalid)
  const findPlayerPlay = (): { valid: boolean; word: string; cells: [number, number][]; score: number; reason?: string; breakdown?: ScoreBreakdown } => {
    const cells = Array.from(placedKeys).map(k => k.split(',').map(Number) as [number, number]);
    if (cells.length === 0) return { valid: false, word: '', cells: [], score: 0, reason: 'Place at least one tile' };

    const rows = cells.map(c => c[0]);
    const cols = cells.map(c => c[1]);
    const sameRow = rows.every(r => r === rows[0]);
    const sameCol = cols.every(c => c === cols[0]);
    if (!sameRow && !sameCol) return { valid: false, word: '', cells: [], score: 0, reason: 'Tiles must be in a straight line' };

    let dir: Direction;
    let wordCells: [number, number][];
    let word: string;

    if (cells.length === 1) {
      const [r, c] = cells[0];

      // Horizontal word through this cell
      let hsc = c;
      while (hsc > 0 && board[r][hsc - 1]) hsc--;
      const hCells: [number, number][] = [];
      let hwc = hsc;
      while (hwc < SIZE && board[r][hwc]) { hCells.push([r, hwc]); hwc++; }

      // Vertical word through this cell
      let vsr = r;
      while (vsr > 0 && board[vsr - 1][c]) vsr--;
      const vCells: [number, number][] = [];
      let vwr = vsr;
      while (vwr < SIZE && board[vwr][c]) { vCells.push([vwr, c]); vwr++; }

      if (hCells.length < 2 && vCells.length < 2) {
        return { valid: false, word: '', cells: [], score: 0, reason: 'Word must be at least 2 letters' };
      }

      if (hCells.length >= vCells.length) {
        dir = 'H';
        wordCells = hCells;
      } else {
        dir = 'V';
        wordCells = vCells;
      }
      word = wordCells.map(([rr, cc]) => board[rr][cc]).join('');
    } else {
      dir = sameRow ? 'H' : 'V';
      const sorted = sameRow
        ? [...cells].sort((a, b) => a[1] - b[1])
        : [...cells].sort((a, b) => a[0] - b[0]);

      // Contiguous (allowing existing tiles in between)
      if (sameRow) {
        for (let c = sorted[0][1]; c <= sorted[sorted.length - 1][1]; c++) {
          if (!board[sorted[0][0]][c]) return { valid: false, word: '', cells: [], score: 0, reason: 'Tiles must form one word' };
        }
      } else {
        for (let r = sorted[0][0]; r <= sorted[sorted.length - 1][0]; r++) {
          if (!board[r][sorted[0][1]]) return { valid: false, word: '', cells: [], score: 0, reason: 'Tiles must form one word' };
        }
      }

      // Expand to include existing tiles flanking the placement
      let sr = sorted[0][0], sc = sorted[0][1];
      if (sameRow) while (sc > 0 && board[sr][sc - 1]) sc--;
      else while (sr > 0 && board[sr - 1][sc]) sr--;

      wordCells = [];
      let wr = sr, wc = sc;
      if (sameRow) while (wc < SIZE && board[wr][wc]) { wordCells.push([wr, wc]); wc++; }
      else while (wr < SIZE && board[wr][wc]) { wordCells.push([wr, wc]); wr++; }

      word = wordCells.map(([r, c]) => board[r][c]).join('');
    }
    if (word.length < 2) return { valid: false, word: '', cells: [], score: 0, reason: 'Word must be at least 2 letters' };
    if (!VALID_WORDS.has(word)) return { valid: false, word, cells: wordCells, score: 0, reason: `"${word}" is not in the dictionary` };

    // First move must touch center
    if (isFirstMove && !wordCells.some(([r, c]) => r === CENTER && c === CENTER)) {
      return { valid: false, word, cells: wordCells, score: 0, reason: 'First word must cross the center star' };
    }
    // Subsequent moves: at least one new tile must be adjacent to a previously-locked tile
    if (!isFirstMove) {
      const touches = cells.some(([r, c]) =>
        (r > 0 && lockedCells.has(`${r - 1},${c}`)) ||
        (r < SIZE - 1 && lockedCells.has(`${r + 1},${c}`)) ||
        (c > 0 && lockedCells.has(`${r},${c - 1}`)) ||
        (c < SIZE - 1 && lockedCells.has(`${r},${c + 1}`))
      );
      if (!touches) return { valid: false, word, cells: wordCells, score: 0, reason: 'New tiles must connect to existing words' };
    }

    // Validate cross-words formed by new tiles
    const newCellsArr = cells.map(([r, c]) => ({ r, c, letter: board[r][c]! }));
    const crossBonus = validateAndScoreCrossWords(board, newCellsArr, dir);
    if (crossBonus < 0) return { valid: false, word, cells: wordCells, score: 0, reason: 'Invalid cross-word formed' };

    const newCellSet = new Set(cells.map(([r, c]) => `${r},${c}`));
    const mainScore = scorePlacement(board, wordCells, newCellSet);
    const all7Bonus = cells.length === 7 ? 50 : 0;
    const breakdown = buildScoreBreakdown(board, wordCells, newCellSet, crossBonus, all7Bonus);
    return { valid: true, word, cells: wordCells, score: mainScore + crossBonus + all7Bonus, breakdown };
  };

  /** Advance to the next seat. Increments the round counter each time we
   *  wrap back to seat 0. Ends the game once everyone has finished maxRounds. */
  const advanceSeat = useCallback((finalScores: number[]) => {
    const next = (currentSeat + 1) % SEATS;
    const nextRound = next === 0 ? round + 1 : round;
    setCurrentSeat(next);
    if (next === 0) setRound(nextRound);
    onProgress(Math.min((nextRound + next / SEATS) / maxRounds, 1));
    if (nextRound >= maxRounds && next === 0) {
      finishGame(finalScores);
    }
  }, [currentSeat, round, SEATS, maxRounds, onProgress, finishGame]);

  const handleSubmit = () => {
    if (!isHumanTurn) return;
    const result = findPlayerPlay();
    if (!result.valid) {
      setScoreBreakdown(null);
      return;
    }
    const seat = isOnline ? mySeat : 0;
    const newScores = scores.map((s, i) => (i === seat ? s + result.score : s));
    setScores(newScores);
    onScore(result.score);
    setLastWord(`You played "${result.word}" for ${result.score}`);
    setScoreBreakdown(result.breakdown ?? null);
    onMessage(`+${result.score} for "${result.word}"!`);

    const newLocked = new Set(lockedCells);
    for (const k of placedKeys) newLocked.add(k);
    setLockedCells(newLocked);
    setPlacedCells(new Map());
    setIsFirstMove(false);

    const { rack: newRack, pool: newPool } = drawUpTo7(playerRack, pool);
    const newRacks = racks.map((rack, i) => (i === seat ? newRack : rack));
    setRacks(newRacks);
    setPool(newPool);

    if (isOnline && onMultiplayerMove && multiplayerState) {
      const nextSeat = (seat + 1) % SEATS;
      // Endgame: if my score >= targetScore, declare winner
      const myNewScore = newScores[seat] ?? 0;
      const iWon = myNewScore >= targetScore && stage >= 0; // simple target check
      onMultiplayerMove({
        boardState: {
          board,
          racks: newRacks,
          pool: newPool,
          scores: newScores,
          currentSeat: nextSeat,
          isFirstMove: false,
          lastWord: `P${multiplayerState.playerNumber} played "${result.word}" for ${result.score}`,
        },
        winner: iWon ? multiplayerState.playerNumber : undefined,
      });
      if (iWon && !endedRef.current) {
        endedRef.current = true;
        onEnd({ score: myNewScore, stars: 3, summary: `You won Scrabble with ${myNewScore} pts!` });
      }
      return;
    }

    advanceSeat(newScores);
  };

  // AI turn — runs whenever currentSeat points at a non-human seat.
  useEffect(() => {
    if (isOnline) return; // Online: opponents drive their own turns
    if (isHumanTurn || endedRef.current) return;
    const seat = currentSeat;
    setAiThinking(true);
    setScoreBreakdown(null);
    onMessage(`AI ${seat} is thinking...`);

    schedule(() => {
      const seatRack = racks[seat] ?? [];
      const moves = generateAiMoves(board, seatRack, isFirstMove);
      const move = pickAiMove(moves, aiDifficulty);
      setAiThinking(false);

      if (!move) {
        onMessage(`AI ${seat} passes this turn`);
        setLastWord(`AI ${seat} passed`);
        setScoreBreakdown(null);
        advanceSeat(scores);
        return;
      }

      const newBoard = board.map(row => [...row]);
      const newLocked = new Set(lockedCells);
      const usedLetters: string[] = [];
      for (const nc of move.newCells) {
        newBoard[nc.r][nc.c] = nc.letter;
        newLocked.add(`${nc.r},${nc.c}`);
        usedLetters.push(nc.letter);
      }
      const depleted = [...seatRack];
      for (const l of usedLetters) {
        const idx = depleted.indexOf(l);
        if (idx >= 0) depleted.splice(idx, 1);
      }
      const { rack: refilled, pool: newPool } = drawUpTo7(depleted, pool);
      const newScores = scores.map((s, i) => (i === seat ? s + move.score : s));

      // Build breakdown for AI move too
      const aiNewCellSet = new Set(move.newCells.map(nc => `${nc.r},${nc.c}`));
      const aiCross = move.score - scorePlacement(board, move.cells, aiNewCellSet, new Map(move.newCells.map(nc => [`${nc.r},${nc.c}`, nc.letter]))) - (move.newCells.length === 7 ? 50 : 0);
      const aiBreakdown = buildScoreBreakdown(newBoard, move.cells, aiNewCellSet, aiCross, move.newCells.length === 7 ? 50 : 0);

      setBoard(newBoard);
      setLockedCells(newLocked);
      setRacks(prev => prev.map((rack, i) => (i === seat ? refilled : rack)));
      setPool(newPool);
      setScores(newScores);
      setLastWord(`AI ${seat} played "${move.word}" for ${move.score}`);
      setScoreBreakdown(aiBreakdown);
      onMessage(`AI ${seat} played "${move.word}" for ${move.score}`);
      setIsFirstMove(false);

      advanceSeat(newScores);
    }, 700);

  }, [currentSeat]);

  const handleClear = () => {
    if (!isHumanTurn) return;
    const letters: string[] = [];
    const newBoard = board.map(row => [...row]);
    for (const key of placedKeys) {
      const [r, c] = key.split(',').map(Number);
      if (newBoard[r][c]) {
        letters.push(newBoard[r][c]!);
        newBoard[r][c] = null;
      }
    }
    setBoard(newBoard);
    setRacks(prev => prev.map((rack, i) => (i === 0 ? [...rack, ...letters] : rack)));
    setPlacedCells(new Map());
    setSelectedTile(null);
    setScoreBreakdown(null);
  };

  const handleShuffle = () => {
    if (!isHumanTurn) return;
    const shuffled = [...playerRack];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setRacks(prev => prev.map((rack, i) => (i === 0 ? shuffled : rack)));
  };

  const handlePass = () => {
    if (!isHumanTurn) return;
    handleClear();
    onMessage('You passed your turn');
    setLastWord('You passed');
    setScoreBreakdown(null);
    if (isOnline && onMultiplayerMove) {
      const seat = mySeat;
      const nextSeat = (seat + 1) % SEATS;
      onMultiplayerMove({
        boardState: {
          board,
          racks,
          pool,
          scores,
          currentSeat: nextSeat,
          isFirstMove,
          lastWord: 'Opponent passed',
        },
      });
      return;
    }
    advanceSeat(scores);
  };

  // Live preview of current placement score
  let livePreview: { valid: false; reason?: string } | { valid: true; score: number; word: string; breakdown?: ScoreBreakdown } | null = null;
  if (placedKeys.size > 0) {
    const result = findPlayerPlay();
    if (!result.valid) livePreview = { valid: false, reason: result.reason };
    else livePreview = { valid: true, score: result.score, word: result.word, breakdown: result.breakdown };
  }

  if (!started && !isOnline) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-4 overflow-y-auto">
        <div className="text-5xl">🅰️</div>
        <h2 className="text-2xl font-bold">Scrabble</h2>
        <p className="text-text-muted text-sm text-center max-w-xs">
          Build words on the board using letter tiles. First to reach{' '}
          <span className="text-accent font-bold">{targetScore} pts</span> wins!
        </p>
        <div className="w-full max-w-xs bg-card rounded-2xl p-4 flex flex-col gap-2 ring-1 ring-white/10">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wide">How to play</span>
          <div className="flex flex-col gap-1.5 text-xs text-text-muted">
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold text-base leading-none mt-0.5">★</span>
              <span>First word must cross the <span className="text-text font-semibold">center star</span></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">🔗</span>
              <span>Every word after must <span className="text-text font-semibold">connect</span> to an existing tile</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">🎯</span>
              <span>Use all 7 tiles in one move for a <span className="text-text font-semibold">+50 Bingo bonus!</span></span>
            </div>
          </div>
          <div className="border-t border-white/10 pt-2 mt-1">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1.5">Bonus squares</span>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {[
                { label: 'TW', color: 'bg-red-700', desc: 'Triple Word' },
                { label: 'DW', color: 'bg-rose-500', desc: 'Double Word' },
                { label: 'TL', color: 'bg-blue-600', desc: 'Triple Letter' },
                { label: 'DL', color: 'bg-sky-500', desc: 'Double Letter' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-1.5">
                  <span className={`${b.color} text-white font-bold rounded px-1 py-0.5 text-[9px] min-w-[22px] text-center`}>{b.label}</span>
                  <span className="text-text-muted">{b.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => setStarted(true)}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95 transition-all"
        >
          Start Game
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center px-2 pt-1 pb-2 gap-1 overflow-hidden">
      {/* ── Top HUD ── */}
      <div className="w-full flex-shrink-0 flex flex-col gap-1">
        {/* Scores row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {scores.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold ${
                  i === 0
                    ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
                    : i === currentSeat
                      ? 'bg-danger/20 text-danger ring-1 ring-danger/40'
                      : 'bg-card text-text-muted'
                }`}
              >
                <span className="text-[10px] opacity-70">{i === 0 ? 'You' : `AI ${i}`}</span>
                <span className="text-sm">{s}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-muted">
            <span className="bg-card rounded-md px-1.5 py-0.5">
              Round <span className="text-text font-bold">{Math.min(round + 1, maxRounds)}</span>/{maxRounds}
            </span>
            <span className="bg-card rounded-md px-1.5 py-0.5">
              Bag: <span className="text-text font-bold">{pool.length}</span>
            </span>
          </div>
        </div>

        {/* Score progress bars — race to targetScore */}
        <div className="flex flex-col gap-0.5">
          {scores.map((s, i) => {
            const pct = Math.min(s / targetScore, 1);
            return (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-[9px] text-text-muted w-6 text-right shrink-0">{i === 0 ? 'You' : `AI`}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-accent' : 'bg-red-400'}`}
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-text-muted w-8 shrink-0">{Math.round(pct * 100)}%</span>
              </div>
            );
          })}
        </div>

        {/* Turn indicator + last move */}
        <div className="flex items-center justify-between gap-2">
          <div className={`flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-semibold ${
            isHumanTurn
              ? 'bg-accent/20 text-accent'
              : 'bg-card text-text-muted'
          }`}>
            {isHumanTurn ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                Your turn
              </>
            ) : (
              <>
                <span className="animate-pulse">🤖</span>
                AI {currentSeat} is thinking...
              </>
            )}
          </div>
          {lastWord && (
            <span className="text-[10px] text-text-muted truncate max-w-[50%]">
              {lastWord}
            </span>
          )}
        </div>
      </div>

      {/* ── SVG Board ── */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex items-center justify-center p-1">
        <svg
          viewBox={`0 0 ${SVG_BOARD} ${SVG_BOARD}`}
          style={{ maxWidth: '100%', maxHeight: '100%' }}
          className="rounded-lg"
        >
          {/* Outer background */}
          <rect width={SVG_BOARD} height={SVG_BOARD} fill="#0a0818" rx={4} />

          {/* Column labels A–O */}
          {COL_LETTERS_BOARD.map((l, c) => (
            <text
              key={`cl-${c}`}
              x={BLABEL + c * BCS + BCS / 2}
              y={BLABEL / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#818cf8"
              fontSize={7}
              fontWeight="bold"
              fontFamily="system-ui"
            >{l}</text>
          ))}

          {/* Row labels 1–15 */}
          {Array.from({ length: 15 }, (_, r) => (
            <text
              key={`rl-${r}`}
              x={BLABEL / 2}
              y={BLABEL + r * BCS + BCS / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#818cf8"
              fontSize={7}
              fontWeight="bold"
              fontFamily="system-ui"
            >{r + 1}</text>
          ))}

          {/* Board cells */}
          {board.map((row, r) => row.map((_cell, c) => {
            const key = `${r},${c}`;
            const cell = board[r][c];
            const bonus = BONUS_MAP.get(key);
            const isPlaced = placedKeys.has(key);
            const isLocked = !isPlaced && !!cell;
            const x = BLABEL + c * BCS;
            const y = BLABEL + r * BCS;

            const cellFill = cell
              ? isPlaced ? '#f59e0b' : '#c8a97e'
              : bonus
                ? BONUS_FILL[bonus]
                : '#1e1a4a';

            return (
              <g
                key={key}
                onClick={() => isHumanTurn && handleBoardClick(r, c)}
                style={{ cursor: isHumanTurn ? 'pointer' : 'default' }}
              >
                {/* Cell background */}
                <rect
                  x={x + 0.5}
                  y={y + 0.5}
                  width={BCS - 1}
                  height={BCS - 1}
                  rx={1.5}
                  fill={cellFill}
                />

                {/* Bonus label when empty */}
                {!cell && bonus && (
                  <text
                    x={x + BCS / 2}
                    y={y + BCS / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="rgba(255,255,255,0.92)"
                    fontSize={bonus === 'ST' ? 12 : 5.5}
                    fontWeight="bold"
                    fontFamily="system-ui"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {bonus === 'ST' ? '★' : bonus}
                  </text>
                )}

                {/* Tile rendering */}
                {cell && (
                  <>
                    {/* Shadow layer */}
                    <rect
                      x={x + 2}
                      y={y + 2.5}
                      width={BCS - 3}
                      height={BCS - 3}
                      rx={2}
                      fill={isPlaced ? '#b45309' : '#8a6640'}
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* Tile face */}
                    <rect
                      x={x + 1.5}
                      y={y + 1.5}
                      width={BCS - 3}
                      height={BCS - 3.5}
                      rx={2}
                      fill={isPlaced ? '#fbbf24' : '#dfc09a'}
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* Letter */}
                    <text
                      x={x + BCS / 2 - 0.5}
                      y={y + BCS / 2 - 0.5}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isLocked ? '#3b2204' : '#1a1100'}
                      fontSize={BCS * 0.46}
                      fontWeight="900"
                      fontFamily="system-ui"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >{cell}</text>
                    {/* Score subscript */}
                    <text
                      x={x + BCS - 3}
                      y={y + BCS - 2.5}
                      textAnchor="end"
                      dominantBaseline="auto"
                      fill={isLocked ? '#5c3d1a' : '#3b2800'}
                      fontSize={BCS * 0.22}
                      fontWeight="bold"
                      fontFamily="system-ui"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >{TILE_SCORES[cell]}</text>
                    {/* Placed-this-turn accent ring */}
                    {isPlaced && (
                      <rect
                        x={x + 0.5}
                        y={y + 0.5}
                        width={BCS - 1}
                        height={BCS - 1}
                        rx={1.5}
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth={1.5}
                        style={{ pointerEvents: 'none' }}
                      />
                    )}
                  </>
                )}
              </g>
            );
          }))}

          {/* Grid lines */}
          {Array.from({ length: 16 }, (_, i) => (
            <line
              key={`vl${i}`}
              x1={BLABEL + i * BCS} y1={BLABEL}
              x2={BLABEL + i * BCS} y2={BLABEL + 15 * BCS}
              stroke="rgba(0,0,0,0.4)" strokeWidth={0.5}
              style={{ pointerEvents: 'none' }}
            />
          ))}
          {Array.from({ length: 16 }, (_, i) => (
            <line
              key={`hl${i}`}
              x1={BLABEL} y1={BLABEL + i * BCS}
              x2={BLABEL + 15 * BCS} y2={BLABEL + i * BCS}
              stroke="rgba(0,0,0,0.4)" strokeWidth={0.5}
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {/* Board border */}
          <rect
            x={BLABEL} y={BLABEL}
            width={15 * BCS} height={15 * BCS}
            fill="none" stroke="#4338ca" strokeWidth={1.5}
            style={{ pointerEvents: 'none' }}
          />
        </svg>
      </div>

      {/* ── Score preview / breakdown ── */}
      {livePreview && (
        <div className="flex-shrink-0 w-full">
          {livePreview.valid === true ? (
            <div className="flex items-center justify-between bg-accent/10 rounded-lg px-3 py-1 ring-1 ring-accent/30">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-accent">
                  {livePreview.word}
                </span>
                <span className="text-[10px] text-text-muted">
                  = {livePreview.score} pts
                </span>
              </div>
              {livePreview.breakdown && livePreview.breakdown.details.length > 0 && (
                <span className="text-[9px] text-text-muted truncate max-w-[50%]">
                  {livePreview.breakdown.details.join(' · ')}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center bg-danger/10 rounded-lg px-3 py-1 ring-1 ring-danger/20">
              <span className="text-[10px] text-danger">{livePreview.reason}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Last move breakdown (when not placing tiles) ── */}
      {placedKeys.size === 0 && scoreBreakdown && (
        <div className="flex-shrink-0 w-full bg-card/50 rounded-lg px-3 py-1 ring-1 ring-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-text-muted">
              <span className="font-bold text-text">{scoreBreakdown.word}</span>
              {' = '}
              {scoreBreakdown.mainWordScore > 0 && `${scoreBreakdown.mainWordScore}`}
              {scoreBreakdown.crossWordsScore > 0 && ` + ${scoreBreakdown.crossWordsScore} cross`}
              {scoreBreakdown.bingoBonus > 0 && ` + ${scoreBreakdown.bingoBonus} bingo`}
              {' = '}
              <span className="font-bold text-accent">{scoreBreakdown.total}</span>
            </span>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center justify-center gap-2 flex-shrink-0 flex-wrap">
        {aiThinking ? (
          <span className="text-text-muted text-xs animate-pulse">🤖 AI thinking...</span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={placedKeys.size < 1 || !isHumanTurn}
              className="bg-accent text-bg font-bold px-5 py-2 rounded-xl text-sm shadow-lg hover:shadow-xl disabled:opacity-30 disabled:shadow-none active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Check size={16} strokeWidth={3} />
              Submit
            </button>
            <button
              onClick={handleClear}
              disabled={placedKeys.size === 0 || !isHumanTurn}
              className="bg-card text-text font-semibold px-3 py-1.5 rounded-lg text-xs border border-text-muted/20 disabled:opacity-30 active:scale-95 transition-all hover:bg-card-hover"
            >
              Clear
            </button>
            <button
              onClick={handleShuffle}
              disabled={playerRack.length === 0 || !isHumanTurn}
              className="bg-card text-text-muted font-semibold px-3 py-1.5 rounded-lg text-xs disabled:opacity-30 active:scale-95 transition-all hover:bg-card-hover"
            >
              Shuffle
            </button>
            <button
              onClick={handlePass}
              disabled={!isHumanTurn}
              className="bg-transparent text-text-muted font-semibold px-3 py-1.5 rounded-lg text-xs border border-danger/30 hover:bg-danger/10 disabled:opacity-30 active:scale-95 transition-all"
            >
              Pass
            </button>
          </div>
        )}
      </div>

      {/* ── Tile rack ── */}
      <div className="flex justify-center gap-1.5 flex-shrink-0 pt-1">
        {playerRack.map((tile, i) => {
          const pts = TILE_SCORES[tile];
          return (
            <button
              key={`${tile}-${i}`}
              onClick={() => handleRackClick(i)}
              disabled={!isHumanTurn}
              className={`relative w-10 h-11 rounded-lg font-bold text-base flex flex-col items-center justify-center transition-all shadow-sm ${
                selectedTile === i
                  ? 'bg-accent text-bg ring-2 ring-accent scale-110 -translate-y-1 shadow-lg'
                  : 'bg-amber-200 text-amber-900 hover:bg-amber-300 hover:scale-105 hover:-translate-y-0.5 active:scale-95'
              } ${!isHumanTurn ? 'opacity-60' : ''}`}
            >
              <span className="leading-none">{tile}</span>
              <span className={`text-[9px] leading-none mt-0.5 font-bold ${
                selectedTile === i ? 'text-bg/80' : 'text-amber-700'
              }`}>
                {pts}
              </span>
            </button>
          );
        })}
        {playerRack.length === 0 && (
          <span className="text-text-muted text-[10px] py-2">No tiles</span>
        )}
      </div>
    </div>
  );
}

export default ScrabbleGame;
