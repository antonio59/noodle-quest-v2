import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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

const BONUS_STYLE: Record<BonusType, { bg: string; text: string; label: string }> = {
  TW: { bg: 'bg-red-600/40',    text: 'text-red-200',    label: 'TW' },
  DW: { bg: 'bg-rose-400/30',   text: 'text-rose-200',   label: 'DW' },
  TL: { bg: 'bg-blue-500/40',   text: 'text-blue-200',   label: 'TL' },
  DL: { bg: 'bg-sky-400/30',    text: 'text-sky-200',    label: 'DL' },
  ST: { bg: 'bg-amber-500/30',  text: 'text-amber-200',  label: '★' },
};

// ── Word list (kept inline; large set trimmed for AI feasibility) ─────
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
): number {
  let wordMult = 1;
  let letterTotal = 0;
  for (const [r, c] of cells) {
    const bonus = BONUS_MAP.get(`${r},${c}`);
    const ls = TILE_SCORES[board[r][c]!] || 0;
    const isNew = newCellSet.has(`${r},${c}`);
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
    if (!VALID_WORDS.has(word)) return -1;
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
  for (const word of VALID_WORDS) {
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
          const mainScore = scorePlacement(board, cells, newCellSet);
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

// ── Component ──────────────────────────────────────────────────────────
function ScrabbleGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty = 'medium' }: GameProps) {
  const [board, setBoard] = useState<(string | null)[][]>(
    () => Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  );
  const [playerRack, setPlayerRack] = useState<string[]>([]);
  const [aiRack, setAiRack] = useState<string[]>([]);
  const [pool, setPool] = useState<string[]>([]);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [placedCells, setPlacedCells] = useState<Map<string, true>>(new Map());
  const [lockedCells, setLockedCells] = useState<Set<string>>(new Set());
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [turn, setTurn] = useState(0); // counts player turns
  const [currentPlayer, setCurrentPlayer] = useState<'player' | 'ai'>('player');
  const [aiThinking, setAiThinking] = useState(false);
  const [lastWord, setLastWord] = useState('');
  const [isFirstMove, setIsFirstMove] = useState(true);
  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const maxTurns = 8; // each player plays maxTurns
  const targetScore = stage * 30;

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      if (!endedRef.current) fn();
    }, ms);
    timeoutsRef.current.push(id);
  }, []);

  useEffect(() => {
    return () => {
      endedRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  // Initial deal
  useEffect(() => {
    const fresh = buildTilePool();
    const pRack = fresh.splice(0, 7);
    const aRack = fresh.splice(0, 7);
    setPlayerRack(pRack);
    setAiRack(aRack);
    setPool(fresh);
    onMessage(`Your turn — place tiles to make a word (target ${targetScore})`);
  // intentionally only on mount
   
  }, []);

  const placedKeys = useMemo(() => new Set(placedCells.keys()), [placedCells]);

  const drawUpTo7 = useCallback((rack: string[], src: string[]): { rack: string[]; pool: string[] } => {
    const r = [...rack];
    const p = [...src];
    while (r.length < 7 && p.length > 0) r.push(p.shift()!);
    return { rack: r, pool: p };
  }, []);

  const finishGame = useCallback((finalPlayerScore: number, finalAiScore: number) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const margin = finalPlayerScore - finalAiScore;
    let stars = 1;
    if (margin > 0) stars = finalPlayerScore >= targetScore ? 3 : 2;
    else if (margin === 0) stars = 2;
    const summary = margin > 0
      ? `You won ${finalPlayerScore}–${finalAiScore}!`
      : margin === 0
        ? `Tied at ${finalPlayerScore}!`
        : `AI won ${finalAiScore}–${finalPlayerScore}.`;
    schedule(() => onEnd({ score: finalPlayerScore, stars, summary }), 800);
  }, [targetScore, onEnd, schedule]);

  const handleRackClick = (idx: number) => {
    if (currentPlayer !== 'player') return;
    setSelectedTile(prev => prev === idx ? null : idx);
  };

  const handleBoardClick = (r: number, c: number) => {
    if (currentPlayer !== 'player') return;
    const key = `${r},${c}`;
    if (lockedCells.has(key)) return;

    if (selectedTile === null) {
      // Pick up a placed tile (this turn only)
      if (board[r][c] && placedKeys.has(key)) {
        const letter = board[r][c]!;
        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = null;
        setBoard(newBoard);
        setPlayerRack(prev => [...prev, letter]);
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
    setPlayerRack(playerRack.filter((_, i) => i !== selectedTile));
    setSelectedTile(null);
    const newPlaced = new Map(placedCells);
    newPlaced.set(key, true);
    setPlacedCells(newPlaced);
  };

  // Validate the player's current placement and return the main word + score (or invalid)
  const findPlayerPlay = (): { valid: boolean; word: string; cells: [number, number][]; score: number; reason?: string } => {
    const cells = Array.from(placedKeys).map(k => k.split(',').map(Number) as [number, number]);
    if (cells.length === 0) return { valid: false, word: '', cells: [], score: 0, reason: 'Place at least one tile' };

    const rows = cells.map(c => c[0]);
    const cols = cells.map(c => c[1]);
    const sameRow = rows.every(r => r === rows[0]);
    const sameCol = cols.every(c => c === cols[0]);
    if (!sameRow && !sameCol) return { valid: false, word: '', cells: [], score: 0, reason: 'Tiles must be in a straight line' };

    const dir: Direction = sameRow ? 'H' : 'V';
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
    else while (sr > 0 && board[sr - 1]?.[sc]) sr--;

    const wordCells: [number, number][] = [];
    let wr = sr, wc = sc;
    if (sameRow) while (wc < SIZE && board[wr][wc]) { wordCells.push([wr, wc]); wc++; }
    else while (wr < SIZE && board[wr][wc]) { wordCells.push([wr, wc]); wr++; }

    const word = wordCells.map(([r, c]) => board[r][c]).join('');
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
    return { valid: true, word, cells: wordCells, score: mainScore + crossBonus + all7Bonus };
  };

  const advanceAfterMove = useCallback((nextPlayer: 'player' | 'ai', newTurn: number, pScore: number, aScore: number) => {
    setCurrentPlayer(nextPlayer);
    onProgress(Math.min(newTurn / maxTurns, 1));
    if (newTurn >= maxTurns && nextPlayer === 'player') {
      // Both players finished their last turn
      finishGame(pScore, aScore);
    }
  }, [maxTurns, onProgress, finishGame]);

  const handleSubmit = () => {
    if (currentPlayer !== 'player') return;
    const result = findPlayerPlay();
    if (!result.valid) {
      onMessage(result.reason || 'Invalid placement');
      return;
    }
    const newPlayerScore = playerScore + result.score;
    setPlayerScore(newPlayerScore);
    onScore(result.score);
    setLastWord(`You: ${result.word} = ${result.score}`);
    onMessage(`+${result.score} for "${result.word}"!`);

    const newLocked = new Set(lockedCells);
    for (const k of placedKeys) newLocked.add(k);
    setLockedCells(newLocked);
    setPlacedCells(new Map());
    setIsFirstMove(false);

    const { rack: newRack, pool: newPool } = drawUpTo7(playerRack, pool);
    setPlayerRack(newRack);
    setPool(newPool);

    advanceAfterMove('ai', turn, newPlayerScore, aiScore);
  };

  // AI turn — runs when currentPlayer flips to 'ai'
  useEffect(() => {
    if (currentPlayer !== 'ai' || endedRef.current) return;
    setAiThinking(true);
    onMessage('AI is thinking...');

    schedule(() => {
      // Generate moves on a snapshot
      const moves = generateAiMoves(board, aiRack, false);
      const move = pickAiMove(moves, aiDifficulty);
      setAiThinking(false);

      if (!move) {
        // AI passes — exchange (just draw fresh)
        onMessage('AI passes this turn');
        setLastWord('AI: pass');
        const newTurn = turn + 1;
        setTurn(newTurn);
        advanceAfterMove('player', newTurn, playerScore, aiScore);
        return;
      }

      // Apply AI move to board
      const newBoard = board.map(row => [...row]);
      const newLocked = new Set(lockedCells);
      const usedLetters: string[] = [];
      for (const nc of move.newCells) {
        newBoard[nc.r][nc.c] = nc.letter;
        newLocked.add(`${nc.r},${nc.c}`);
        usedLetters.push(nc.letter);
      }
      // Remove used letters from AI rack (one occurrence each)
      const newAiRack = [...aiRack];
      for (const l of usedLetters) {
        const idx = newAiRack.indexOf(l);
        if (idx >= 0) newAiRack.splice(idx, 1);
      }
      const { rack: refilled, pool: newPool } = drawUpTo7(newAiRack, pool);

      const newAiScore = aiScore + move.score;
      setBoard(newBoard);
      setLockedCells(newLocked);
      setAiRack(refilled);
      setPool(newPool);
      setAiScore(newAiScore);
      setLastWord(`AI: ${move.word} = ${move.score}`);
      onMessage(`AI played "${move.word}" for ${move.score}`);
      setIsFirstMove(false);

      const newTurn = turn + 1;
      setTurn(newTurn);
      advanceAfterMove('player', newTurn, playerScore, newAiScore);
    }, 900);
   
  }, [currentPlayer]);

  const handleClear = () => {
    if (currentPlayer !== 'player') return;
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
    setPlayerRack([...playerRack, ...letters]);
    setPlacedCells(new Map());
    setSelectedTile(null);
  };

  const handleShuffle = () => {
    if (currentPlayer !== 'player') return;
    const shuffled = [...playerRack];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setPlayerRack(shuffled);
  };

  const handlePass = () => {
    if (currentPlayer !== 'player') return;
    // Return any placed tiles to rack first
    handleClear();
    onMessage('You passed your turn');
    setLastWord('You: pass');
    advanceAfterMove('ai', turn, playerScore, aiScore);
  };

  return (
    <div className="h-full w-full flex flex-col items-center px-2 pt-1 pb-2 gap-1.5 overflow-hidden">
      {/* Score bar */}
      <div className="flex gap-1.5 text-[10px] items-center flex-wrap justify-center flex-shrink-0">
        <span className="bg-accent/20 text-accent rounded-md px-1.5 py-0.5 font-bold">You: {playerScore}</span>
        <span className="bg-danger/20 text-danger rounded-md px-1.5 py-0.5 font-bold">AI: {aiScore}</span>
        <span className="bg-card rounded-md px-1.5 py-0.5 text-text-muted">Turn {turn + (currentPlayer === 'ai' ? 1 : 1)}/{maxTurns}</span>
        <span className="bg-card rounded-md px-1.5 py-0.5 text-text-muted">Target: {targetScore}</span>
        <span className="bg-card rounded-md px-1.5 py-0.5 text-text-dim">{pool.length} left</span>
        {lastWord && <span className="text-accent font-medium">{lastWord}</span>}
      </div>

      {/* Board */}
      <div
        className="flex-1 min-h-0 w-full overflow-hidden"
        style={{ display: 'grid', placeItems: 'center' }}
      >
        <div
          className="grid gap-[1px] bg-white/5 rounded-md overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${SIZE}, minmax(0, 1fr))`,
            aspectRatio: '1 / 1',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          {board.map((row, r) => row.map((_cell, c) => {
            const key = `${r},${c}`;
            const cell = board[r][c];
            const bonus = BONUS_MAP.get(key);
            const isPlaced = placedKeys.has(key);
            const bs = bonus ? BONUS_STYLE[bonus] : null;

            return (
              <button
                key={key}
                onClick={() => handleBoardClick(r, c)}
                disabled={currentPlayer !== 'player'}
                className={`relative flex items-center justify-center transition-all text-[7px] sm:text-[9px] font-bold leading-none ${
                  cell
                    ? isPlaced
                      ? 'bg-amber-200 text-amber-900 ring-1 ring-accent/60'
                      : 'bg-amber-100 text-amber-800'
                    : bs
                      ? `${bs.bg} ${bs.text}`
                      : 'bg-card hover:bg-card-hover'
                } ${currentPlayer !== 'player' ? 'opacity-90 cursor-not-allowed' : ''}`}
              >
                {cell ? (
                  <>
                    <span>{cell}</span>
                    <span className="absolute bottom-0 right-px text-[4px] sm:text-[5px] opacity-50 leading-none">
                      {TILE_SCORES[cell]}
                    </span>
                  </>
                ) : bs ? (
                  <span className="text-[4px] sm:text-[6px] font-semibold opacity-70 leading-none select-none">
                    {bs.label}
                  </span>
                ) : null}
              </button>
            );
          }))}
        </div>
      </div>

      {/* Status / Actions */}
      <div className="flex items-center justify-center gap-2 flex-shrink-0 flex-wrap">
        {aiThinking ? (
          <span className="text-text-muted text-[10px] animate-pulse">🤖 AI thinking...</span>
        ) : (
          <div className="flex gap-1.5">
            <button
              onClick={handleSubmit}
              disabled={placedKeys.size < 1 || currentPlayer !== 'player'}
              className="bg-accent text-bg font-bold px-3 py-1 rounded-md text-[10px] disabled:opacity-30 active:scale-95 transition-all"
            >
              Submit
            </button>
            <button
              onClick={handleClear}
              disabled={placedKeys.size === 0 || currentPlayer !== 'player'}
              className="bg-card text-text font-semibold px-3 py-1 rounded-md text-[10px] disabled:opacity-30 active:scale-95 transition-all"
            >
              Clear
            </button>
            <button
              onClick={handleShuffle}
              disabled={playerRack.length === 0 || currentPlayer !== 'player'}
              className="bg-card text-text-muted font-semibold px-2 py-1 rounded-md text-[10px] disabled:opacity-30 active:scale-95 transition-all"
            >
              Shuffle
            </button>
            <button
              onClick={handlePass}
              disabled={currentPlayer !== 'player'}
              className="bg-card text-text-muted font-semibold px-2 py-1 rounded-md text-[10px] disabled:opacity-30 active:scale-95 transition-all"
            >
              Pass
            </button>
          </div>
        )}
      </div>

      {/* Tile rack */}
      <div className="flex justify-center gap-1 flex-shrink-0 pt-1.5">
        {playerRack.map((tile, i) => {
          const pts = TILE_SCORES[tile];
          return (
            <button
              key={`${tile}-${i}`}
              onClick={() => handleRackClick(i)}
              disabled={currentPlayer !== 'player'}
              className={`relative w-10 h-11 rounded-lg font-bold text-base flex flex-col items-center justify-center transition-all shadow-sm ${
                selectedTile === i
                  ? 'bg-accent text-bg ring-2 ring-accent scale-110 -translate-y-1'
                  : 'bg-amber-200 text-amber-900 hover:bg-amber-300 active:scale-95'
              } ${currentPlayer !== 'player' ? 'opacity-60' : ''}`}
            >
              <span className="leading-none">{tile}</span>
              <span className={`text-[8px] leading-none mt-0.5 font-semibold ${
                selectedTile === i ? 'text-bg/70' : 'text-amber-700'
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
