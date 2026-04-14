import { useState, useCallback, useEffect, useMemo } from 'react';
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

// Build the standard bonus map (symmetric)
function buildBonusMap(): Map<string, BonusType> {
  const m = new Map<string, BonusType>();
  const set = (r: number, c: number, b: BonusType) => {
    // Mirror across both axes for full symmetry
    for (const [mr, mc] of [[r,c],[r,14-c],[14-r,c],[14-r,14-c]]) {
      m.set(`${mr},${mc}`, b);
    }
  };
  // Triple Word
  set(0, 0, 'TW'); set(0, 7, 'TW');
  // Double Word (diagonal)
  set(1, 1, 'DW'); set(2, 2, 'DW'); set(3, 3, 'DW'); set(4, 4, 'DW');
  // Triple Letter
  set(1, 5, 'TL'); set(5, 1, 'TL'); set(5, 5, 'TL');
  // Double Letter
  set(0, 3, 'DL'); set(2, 6, 'DL'); set(3, 0, 'DL'); set(3, 7, 'DL');
  set(6, 2, 'DL'); set(6, 6, 'DL'); set(7, 3, 'DL');
  // Center
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

// ── Word list ──────────────────────────────────────────────────────────
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
  'DALE','DAME','DAMP','DARE','DARK','DARN','DART','DASH','DATA','DATE','DAWN','DEAD','DEAF','DEAL','DEAR','DEBT','DECK','DEED','DEEM','DEEP','DEER','DEMO','DENT','DENY','DESK','DIAL','DICE','DIET','DIGS','DIME','DINE','DIRE','DIRT','DISC','DISH','DISK','DOCK','DOES','DOLE','DOLL','DOME','DONE','DOOM','DOOR','DOSE','DOVE','DOWN','DOZE','DRAB','DRAG','DRAW','DREW','DRIP','DROP','DRUM','DUAL','DUCK','DUEL','DUFF','DUKE','DULL','DUMB','DUMP','DUNE','DUNG','DUNK','DUSK','DUST','DUTY',
  'EACH','EARL','EARN','EASE','EAST','EASY','EDGE','EDIT','ELSE','EMIT','EPIC','EVEN','EVER','EVIL','EXAM','EXIT',
  'FACE','FACT','FADE','FAIL','FAIR','FAKE','FALL','FAME','FANG','FARE','FARM','FAST','FATE','FAWN','FEAR','FEAT','FEED','FEEL','FELL','FELT','FEND','FERN','FEST','FILE','FILL','FILM','FIND','FINE','FIRE','FIRM','FISH','FIST','FLAG','FLAK','FLAM','FLAN','FLAP','FLAT','FLAW','FLEA','FLED','FLEW','FLIP','FLIT','FLOG','FLOP','FLOW','FLUE','FLUX','FOAM','FOCI','FOIL','FOLD','FOLK','FOND','FONT','FOOD','FOOL','FOOT','FORD','FORE','FORK','FORM','FORT','FOUL','FOUR','FOWL','FREE','FRET','FROM','FROG','FUEL','FULL','FUME','FUND','FUNK','FURY','FUSE','FUSS','FUZZ',
  'GAIT','GALE','GALL','GAME','GANG','GAPE','GARB','GASH','GASP','GATE','GAVE','GAWK','GAZE','GEAR','GERM','GIFT','GILD','GILL','GILT','GIST','GIVE','GLAD','GLEE','GLEN','GLIB','GLOB','GLOM','GLOW','GLUE','GLUM','GLUT','GNAT','GNAW','GOAT','GOES','GOLD','GOLF','GONE','GOOD','GORE','GORY','GOWN','GRAB','GRAM','GRAY','GREW','GRID','GRIM','GRIN','GRIP','GRIT','GROW','GRUB','GULF','GULL','GULP','GUNG','GURU','GUSH','GUST','GUTS',
  'HACK','HAIL','HAIR','HALE','HALF','HALL','HALT','HAND','HANG','HARD','HARE','HARM','HARP','HASH','HASP','HASTE','HATE','HAUL','HAVE','HAWK','HAZE','HAZY','HEAD','HEAL','HEAP','HEAR','HEAT','HEED','HEEL','HELD','HELL','HELM','HELP','HEMP','HERD','HERE','HERO','HIGH','HIKE','HILL','HILT','HIND','HINT','HIRE','HISS','HIVE','HOAX','HOLD','HOLE','HOLY','HOME','HONE','HOOD','HOOK','HOOP','HOPE','HORN','HOSE','HOST','HOUR','HOWL','HUFF','HUGE','HULL','HUMP','HUNG','HUNK','HUNT','HURL','HURT','HUSH','HYMN',
  'ICON','IDEA','IDLE','INCH','INTO','IRON','ISLE','ITEM',
  'JACK','JADE','JAIL','JAMB','JAPE','JAZZ','JEAN','JEER','JERK','JEST','JILT','JINX','JIVE','JOBS','JOCK','JOIN','JOKE','JOLT','JOSH','JOWL','JUDO','JUGS','JUMP','JUNE','JUNK','JURY','JUST','JUTE',
  'KALE','KEEN','KEEP','KELP','KEPT','KETO','KEYS','KICK','KIDS','KILL','KILT','KIND','KING','KISS','KITE','KNAB','KNEE','KNEW','KNIT','KNOB','KNOT','KNOW',
  'LACE','LACK','LACY','LAID','LAIN','LAIR','LAKE','LAME','LAMP','LAND','LANE','LARD','LARK','LASH','LASS','LAST','LATE','LAUD','LAWN','LAZY','LEAD','LEAF','LEAK','LEAN','LEAP','LEER','LEFT','LEND','LENS','LENT','LESS','LICK','LIEU','LIFE','LIFT','LIKE','LIMB','LIME','LIMP','LINE','LINK','LINT','LION','LIST','LIVE','LOAD','LOAF','LOAM','LOAN','LOBE','LOCK','LODE','LOFT','LOFTY','LOGO','LONE','LONG','LOOK','LOOM','LOOP','LOOT','LORD','LORE','LOSE','LOSS','LOST','LOTS','LOUD','LOVE','LUCK','LULL','LUMP','LURE','LURK','LUSH','LUST',
  'MACE','MADE','MAIL','MAIN','MAKE','MALE','MALL','MALT','MANE','MANY','MARE','MARK','MARS','MASH','MASK','MASS','MAST','MATE','MAZE','MEAD','MEAL','MEAN','MEAT','MEEK','MEET','MELD','MELT','MEMO','MEND','MENU','MERE','MESH','MESS','MICE','MILD','MILE','MILK','MILL','MIME','MIND','MINE','MINT','MIRE','MISS','MIST','MITE','MOAT','MOCK','MODE','MOLD','MOLE','MOLT','MONK','MOOD','MOON','MOOR','MOOT','MORE','MORN','MOSS','MOST','MOTH','MOVE','MUCH','MUCK','MUFF','MULE','MULL','MURK','MUSE','MUSH','MUSK','MUST','MUTE','MUTT',
  'NAIL','NAME','NAPE','NAVY','NEAR','NEAT','NECK','NEED','NEST','NEWS','NEXT','NICE','NICK','NINE','NODE','NONE','NOOK','NOON','NORM','NOSE','NOTE','NOUN','NUDE','NULL','NUMB',
  'OAFS','OAKS','OATH','OBEY','ODDS','ODOR','OINK','OKAY','OMEN','OMIT','ONCE','ONLY','ONTO','OOZE','OPEN','OPUS','ORAL','OVEN','OVER','OWED','OWLS','OWNS',
  'PACE','PACK','PACT','PAGE','PAID','PAIL','PAIN','PAIR','PALE','PALM','PANE','PANG','PANT','PARE','PARK','PART','PASS','PAST','PATH','PAVE','PAWN','PAYS','PEAK','PEAL','PEAR','PEAT','PECK','PEEK','PEEL','PEER','PELT','PEND','PERK','PEST','PICK','PIER','PIKE','PILE','PILL','PINE','PINK','PINS','PINT','PIPE','PLAN','PLAY','PLEA','PLOD','PLOT','PLOW','PLOY','PLUG','PLUM','PLUS','POCK','POET','POKE','POLE','POLL','POLO','POMP','POND','PONY','POOL','POOR','POPE','POPS','PORE','PORK','PORT','POSE','POST','POUR','POUT','PRAY','PREP','PREY','PRIG','PRIM','PROD','PROP','PROW','PRYS','PUCK','PUFF','PULL','PULP','PUMP','PUNK','PURE','PUSH','PUTS','PUTT',
  'QUAD','QUAY','QUIT','QUIZ',
  'RACE','RACK','RAFT','RAGE','RAID','RAIL','RAIN','RAKE','RAMP','RANG','RANK','RANT','RARE','RASH','RASP','RATE','RAVE','RAYS','RAZE','READ','REAL','REAM','REAP','REAR','REED','REEF','REEL','REIN','RELY','REND','RENT','REST','RICE','RICH','RIDE','RIFT','RILE','RILL','RIND','RING','RIOT','RISE','RISK','RITE','ROAD','ROAM','ROAR','ROBE','ROCK','RODE','ROLE','ROLL','ROOF','ROOM','ROOT','ROPE','ROSE','ROSY','ROTE','ROUT','ROVE','RUDE','RUIN','RULE','RUMP','RUNE','RUNG','RUNT','RUSE','RUSH','RUST',
  'SACK','SAFE','SAGA','SAGE','SAID','SAIL','SAKE','SALE','SALT','SAME','SAND','SANE','SANG','SANK','SASH','SAVE','SAYS','SCAB','SCAM','SCAN','SCAR','SEAL','SEAM','SEAR','SEAS','SEAT','SECT','SEED','SEEK','SEEM','SEEN','SELF','SELL','SEMI','SEND','SENT','SEPT','SHED','SHIN','SHIP','SHOD','SHOE','SHOO','SHOP','SHOT','SHOW','SHUT','SICK','SIDE','SIFT','SIGH','SIGN','SILK','SILL','SILT','SING','SINK','SIRE','SITE','SIZE','SKIT','SLAB','SLAG','SLAP','SLAT','SLAW','SLAY','SLED','SLEW','SLID','SLIM','SLIT','SLOB','SLOP','SLOT','SLOW','SLUG','SLUM','SLUR','SMOG','SNAP','SNAG','SNIP','SNOB','SNOT','SNOW','SNUB','SNUG','SOAK','SOAP','SOAR','SOCK','SODA','SOFA','SOFT','SOIL','SOLD','SOLE','SOLO','SOME','SONG','SOON','SOOT','SORE','SORT','SOUL','SOUP','SOUR','SPAN','SPAR','SPEC','SPED','SPIN','SPIT','SPOT','SPRY','SPUD','SPUN','SPUR','STAB','STAG','STAR','STAY','STEM','STEP','STEW','STIR','STOP','STUB','STUD','STUN','SUCK','SUIT','SULK','SUMP','SUNG','SUNK','SURE','SURF','SWAB','SWAM','SWAN','SWAP','SWAY','SWIM',
  'TABS','TACK','TACT','TAIL','TAKE','TALE','TALK','TALL','TAME','TANG','TANK','TAPE','TAPS','TARN','TART','TASK','TAXI','TEAK','TEAL','TEAM','TEAR','TEEM','TELL','TEMP','TEND','TENS','TENT','TERM','TERN','TEST','TEXT','THAN','THAT','THAW','THEM','THEN','THEY','THIN','THIS','THUD','THUG','THUS','TICK','TIDE','TIDY','TIED','TIER','TIES','TIFF','TILE','TILL','TILT','TIME','TINE','TINY','TIPS','TIRE','TOAD','TOCK','TOED','TOIL','TOLD','TOLL','TOMB','TOME','TONE','TOOK','TOOL','TOPS','TORE','TORN','TORT','TOSS','TOUR','TOWN','TOYS','TRAP','TRAY','TREE','TREK','TRIM','TRIO','TRIP','TROD','TROT','TRUE','TSAR','TUBA','TUBE','TUCK','TUFT','TUNA','TUNE','TURF','TURN','TUSK','TUTU','TWIG','TWIN','TYPE',
  'UGLY','UNDO','UNIT','UNTO','UPON','URGE','USED','USER',
  'VAIN','VALE','VANE','VARY','VASE','VAST','VEAL','VEER','VEIL','VEIN','VENT','VERB','VERY','VEST','VETO','VICE','VIDE','VIEW','VILE','VINE','VOID','VOLE','VOLT','VOTE','VOWL',
  'WADE','WAGE','WAIL','WAIT','WAKE','WALK','WALL','WAND','WANT','WARD','WARM','WARN','WARP','WART','WARY','WASH','WASP','WAVE','WAVY','WAXY','WAYS','WEAK','WEAN','WEAR','WEED','WEEK','WEEP','WELD','WELL','WELT','WENT','WEPT','WERE','WEST','WHAT','WHEN','WHIM','WHIP','WHOM','WICK','WIDE','WIFE','WILD','WILL','WILT','WILY','WIMP','WIND','WINE','WING','WINK','WIPE','WIRE','WISE','WISH','WISP','WITH','WOKE','WOLF','WOMB','WOOD','WOOL','WORD','WORE','WORK','WORM','WORN','WOVE','WRAP','WREN','WRIT',
  'YANK','YARD','YARN','YAWN','YEAR','YELL','YOGA','YOKE','YOUR',
  'ZEAL','ZERO','ZEST','ZINC','ZING','ZONE','ZOOM',
  // 5-letter (common)
  'ABOUT','ABOVE','ABUSE','ADMIT','ADOPT','AFTER','AGAIN','AGENT','AGREE','AHEAD','ALARM','ALIEN','ALIGN','ALIVE','ALLOW','ALONE','ALONG','ALTER','AMONG','ANGEL','ANGER','ANGLE','ANGRY','ANIME','ANKLE','APART','APPLE','APPLY','ARENA','ARGUE','ARISE','ASIDE','ASSET',
  'BASIC','BATCH','BEACH','BEGIN','BEING','BELOW','BENCH','BLACK','BLADE','BLAME','BLAND','BLANK','BLAST','BLAZE','BLEED','BLEND','BLESS','BLIND','BLINK','BLISS','BLOCK','BLOOD','BLOWN','BOARD','BOAST','BONUS','BOOTH','BOUND','BRAIN','BRAND','BRAVE','BREAD','BREAK','BREED','BRICK','BRIDE','BRIEF','BRING','BROAD','BROKE','BROWN','BRUSH','BUILD','BURST','BUYER',
  'CABIN','CANDY','CARRY','CATCH','CAUSE','CHAIN','CHAIR','CHALK','CHAMP','CHAOS','CHARM','CHART','CHASE','CHEAP','CHEAT','CHECK','CHEEK','CHEER','CHESS','CHEST','CHIEF','CHILD','CHINA','CHUNK','CIVIC','CIVIL','CLAIM','CLASH','CLASS','CLEAN','CLEAR','CLERK','CLICK','CLIMB','CLING','CLOCK','CLONE','CLOSE','CLOTH','CLOUD','COACH','COAST','COLOR','COMET','CORAL','COUNT','COURT','COVER','CRACK','CRAFT','CRANE','CRASH','CRAZY','CREAM','CRIME','CROSS','CROWD','CROWN','CRUEL','CRUSH','CURVE','CYCLE',
  'DAILY','DANCE','DEBUT','DELAY','DELTA','DEPTH','DOING','DOUBT','DOUGH','DOZEN','DRAFT','DRAIN','DRAMA','DRANK','DRAWN','DREAM','DRESS','DRIED','DRIFT','DRILL','DRINK','DRIVE','DROWN','DYING',
  'EAGER','EARLY','EARTH','EIGHT','ELDER','ELECT','ELITE','EMPTY','ENEMY','ENJOY','ENTER','EQUAL','ERROR','EVENT','EVERY','EXACT','EXILE','EXIST','EXTRA',
  'FAINT','FAITH','FALSE','FANCY','FAULT','FEAST','FENCE','FEWER','FIBER','FIELD','FIFTH','FIFTY','FIGHT','FINAL','FLAME','FLASH','FLESH','FLOAT','FLOOD','FLOOR','FLOUR','FLUID','FLUTE','FOCUS','FORCE','FORGE','FORTH','FORUM','FOUND','FRAME','FRANK','FRAUD','FRESH','FRONT','FROST','FRUIT','FULLY',
  'GIANT','GIVEN','GLARE','GLASS','GLOBE','GLOOM','GLORY','GLOVE','GOING','GRACE','GRADE','GRAIN','GRAND','GRANT','GRAPE','GRAPH','GRASP','GRASS','GRAVE','GREAT','GREEN','GREET','GRIEF','GRILL','GRIND','GROAN','GROOM','GROUP','GROVE','GROWN','GUARD','GUESS','GUEST','GUIDE','GUILD','GUILT',
  'HAPPY','HARSH','HEART','HEAVY','HENCE','HOBBY','HONOR','HORSE','HOTEL','HOUSE','HUMAN','HUMOR',
  'IMAGE','IMPLY','INDEX','INDIE','INNER','INPUT','ISSUE','IVORY',
  'JELLY','JEWEL','JOINT','JOKER','JUICE','JUICY',
  'KNIFE','KNOCK','KNOWN',
  'LABEL','LABOR','LARGE','LASER','LATER','LAUGH','LAYER','LEARN','LEASE','LEAVE','LEGAL','LEMON','LEVEL','LIGHT','LIMIT','LINEN','LIVER','LOCAL','LODGE','LOGIC','LOOSE','LOVER','LOWER','LOYAL','LUCKY','LUNAR','LUNCH',
  'MAGIC','MAJOR','MANOR','MAPLE','MARCH','MASON','MATCH','MAYOR','MEDIA','MERCY','MERGE','MERIT','METAL','METER','MIGHT','MINOR','MINUS','MODEL','MONEY','MONTH','MORAL','MOTOR','MOUNT','MOUSE','MOUTH','MOVED','MOVIE','MUSIC','MYTHS',
  'NAIVE','NERVE','NEVER','NIGHT','NOBLE','NOISE','NORTH','NOTED','NOVEL','NURSE',
  'OCEAN','OFFER','OFTEN','OLIVE','ONSET','OPERA','ORDER','OTHER','OUTER','OWNER',
  'PAINT','PANEL','PANIC','PARTY','PASTA','PATCH','PAUSE','PEACE','PEACH','PEARL','PENNY','PHASE','PHONE','PHOTO','PIANO','PIECE','PILOT','PITCH','PIXEL','PLACE','PLAIN','PLANE','PLANT','PLATE','PLAZA','PLEAD','PLUMB','PLUME','PLUMP','POINT','POLAR','POUND','POWER','PRESS','PRICE','PRIDE','PRIME','PRINT','PRIOR','PRIZE','PROBE','PROOF','PROUD','PROVE','PROXY','PULSE','PUNCH','PUPIL','PURSE','QUEEN','QUEST','QUEUE','QUICK','QUIET','QUITE','QUOTA','QUOTE',
  'RADAR','RADIO','RAISE','RALLY','RANCH','RANGE','RAPID','RATIO','REACH','REACT','REALM','REBEL','REIGN','RELAX','REPLY','RIDER','RIDGE','RIFLE','RIGHT','RIGID','RISKY','RIVAL','RIVER','ROBIN','ROBOT','ROCKY','ROGER','ROMAN','ROUGH','ROUND','ROUTE','ROVER','ROYAL','RULER','RUMOR','RURAL',
  'SAINT','SALAD','SAUCE','SCALE','SCARE','SCENE','SCENT','SCOPE','SCORE','SCOUT','SHADE','SHALL','SHAME','SHAPE','SHARE','SHARK','SHARP','SHEAR','SHEEP','SHEER','SHEET','SHELF','SHELL','SHIFT','SHINE','SHIRT','SHOCK','SHORE','SHORT','SHOUT','SHOWN','SIGHT','SINCE','SIXTY','SIZED','SKILL','SKULL','SLASH','SLATE','SLAVE','SLEEP','SLICE','SLIDE','SLOPE','SMALL','SMART','SMELL','SMILE','SMOKE','SOLAR','SOLID','SOLVE','SORRY','SOUND','SOUTH','SPACE','SPARE','SPARK','SPEAK','SPEED','SPEND','SPENT','SPICE','SPIKE','SPINE','SPLIT','SPOKE','SPORT','SPRAY','SQUAD','STACK','STAFF','STAGE','STAIN','STAKE','STALE','STALL','STAMP','STAND','STARE','START','STATE','STAYS','STEAK','STEAL','STEAM','STEEL','STEEP','STEER','STICK','STIFF','STILL','STOCK','STOLE','STONE','STOOD','STOOL','STORE','STORM','STORY','STOVE','STRIP','STUCK','STUDY','STUFF','STUMP','STYLE','SUGAR','SUITE','SURGE','SWAMP','SWEEP','SWEET','SWIFT','SWING','SWIRL','SWORD',
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
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

// ── Component ──────────────────────────────────────────────────────────
function ScrabbleGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const [board, setBoard] = useState<(string | null)[][]>(
    () => Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  );
  const [rack, setRack] = useState<string[]>([]);
  const [pool, setPool] = useState<string[]>(() => buildTilePool());
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [placedCells, setPlacedCells] = useState<Map<string, true>>(new Map());
  const [lockedCells, setLockedCells] = useState<Set<string>>(new Set());
  const [totalScore, setTotalScore] = useState(0);
  const [turn, setTurn] = useState(0);
  const [lastWord, setLastWord] = useState('');
  const maxTurns = 10;
  const targetScore = stage * 30;

  const drawTiles = useCallback((currentRack: string[], currentPool: string[]) => {
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

  // Memoize placed cell keys for quick lookup
  const placedKeys = useMemo(() => new Set(placedCells.keys()), [placedCells]);

  const handleRackClick = (idx: number) => {
    setSelectedTile(prev => prev === idx ? null : idx);
  };

  const handleBoardClick = (r: number, c: number) => {
    const key = `${r},${c}`;
    // Can't touch locked (previously submitted) cells
    if (lockedCells.has(key)) return;

    if (selectedTile === null) {
      // Pick up a placed tile
      if (board[r][c] && placedKeys.has(key)) {
        const letter = board[r][c]!;
        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = null;
        setBoard(newBoard);
        setRack(prev => [...prev, letter]);
        const newPlaced = new Map(placedCells);
        newPlaced.delete(key);
        setPlacedCells(newPlaced);
      }
      return;
    }
    if (board[r][c]) return;

    const letter = rack[selectedTile];
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = letter;
    setBoard(newBoard);
    setRack(rack.filter((_, i) => i !== selectedTile));
    setSelectedTile(null);
    const newPlaced = new Map(placedCells);
    newPlaced.set(key, true);
    setPlacedCells(newPlaced);
  };

  const findWord = (): { valid: boolean; word: string; cells: [number, number][]; score: number } => {
    const cells = Array.from(placedKeys).map(k => k.split(',').map(Number) as [number, number]);
    if (cells.length < 2) return { valid: false, word: '', cells: [], score: 0 };

    const rows = cells.map(c => c[0]);
    const cols = cells.map(c => c[1]);
    const sameRow = rows.every(r => r === rows[0]);
    const sameCol = cols.every(c => c === cols[0]);
    if (!sameRow && !sameCol) return { valid: false, word: '', cells: [], score: 0 };

    // Sort by position
    const sorted = sameRow
      ? [...cells].sort((a, b) => a[1] - b[1])
      : [...cells].sort((a, b) => a[0] - b[0]);

    // Check contiguous (allow existing tiles in between)
    if (sameRow) {
      for (let c = sorted[0][1]; c <= sorted[sorted.length - 1][1]; c++) {
        if (!board[sorted[0][0]][c]) return { valid: false, word: '', cells: [], score: 0 };
      }
    } else {
      for (let r = sorted[0][0]; r <= sorted[sorted.length - 1][0]; r++) {
        if (!board[r][sorted[0][1]]) return { valid: false, word: '', cells: [], score: 0 };
      }
    }

    // Expand to include adjacent locked tiles
    let sr = sorted[0][0], sc = sorted[0][1];
    if (sameRow) {
      while (sc > 0 && board[sr][sc - 1]) sc--;
    } else {
      while (sr > 0 && board[sr - 1]?.[sc]) sr--;
    }

    const wordCells: [number, number][] = [];
    let wr = sr, wc = sc;
    if (sameRow) {
      while (wc < SIZE && board[wr][wc]) { wordCells.push([wr, wc]); wc++; }
    } else {
      while (wr < SIZE && board[wr][wc]) { wordCells.push([wr, wc]); wr++; }
    }

    const word = wordCells.map(([r, c]) => board[r][c]).join('');
    if (word.length < 2) return { valid: false, word: '', cells: [], score: 0 };

    // Score with bonuses (only new tiles trigger bonuses)
    let wordMult = 1;
    let letterTotal = 0;
    for (const [r, c] of wordCells) {
      const bonus = BONUS_MAP.get(`${r},${c}`);
      const ls = TILE_SCORES[board[r][c]!] || 0;
      const isNew = placedKeys.has(`${r},${c}`);
      if (isNew && bonus === 'DL') letterTotal += ls * 2;
      else if (isNew && bonus === 'TL') letterTotal += ls * 3;
      else letterTotal += ls;
      if (isNew && bonus === 'DW') wordMult *= 2;
      if (isNew && (bonus === 'TW' || bonus === 'ST')) wordMult *= 3;
    }
    // Bonus for using all 7 tiles
    const allTilesBonus = cells.length === 7 ? 50 : 0;

    return { valid: true, word, cells: wordCells, score: letterTotal * wordMult + allTilesBonus };
  };

  const handleSubmit = () => {
    const result = findWord();
    if (!result.valid) {
      onMessage('Place 2+ tiles in a straight line');
      return;
    }
    if (!VALID_WORDS.has(result.word.toUpperCase())) {
      onMessage(`"${result.word}" is not in the dictionary`);
      return;
    }

    const newScore = totalScore + result.score;
    setTotalScore(newScore);
    onScore(result.score);
    setLastWord(`${result.word} = ${result.score} pts`);
    onMessage(`+${result.score} for "${result.word}"!`);

    // Lock placed tiles
    const newLocked = new Set(lockedCells);
    for (const k of placedKeys) newLocked.add(k);
    setLockedCells(newLocked);
    setPlacedCells(new Map());

    const newTurn = turn + 1;
    setTurn(newTurn);
    const { rack: newRack, pool: newPool } = drawTiles(rack, pool);
    setRack(newRack);
    setPool(newPool);
    onProgress(newTurn / maxTurns);

    if (newTurn >= maxTurns) {
      const stars = newScore >= targetScore ? 3 : newScore >= targetScore * 0.6 ? 2 : 1;
      setTimeout(() => onEnd({ score: newScore, stars, summary: `Scored ${newScore} in Scrabble!` }), 800);
    }
  };

  const handleClear = () => {
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
    setRack([...rack, ...letters]);
    setPlacedCells(new Map());
    setSelectedTile(null);
  };

  const handleShuffle = () => {
    const shuffled = [...rack];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setRack(shuffled);
  };

  return (
    <div className="h-full flex flex-col items-center p-1.5 overflow-hidden">
      {/* Score bar */}
      <div className="flex gap-1.5 mb-1 text-[10px] items-center flex-wrap justify-center flex-shrink-0">
        <span className="bg-accent/20 text-accent rounded-md px-1.5 py-0.5 font-bold">{totalScore} pts</span>
        <span className="bg-card rounded-md px-1.5 py-0.5 text-text-muted">Turn {turn}/{maxTurns}</span>
        <span className="bg-card rounded-md px-1.5 py-0.5 text-text-muted">Target: {targetScore}</span>
        <span className="bg-card rounded-md px-1.5 py-0.5 text-text-dim">{pool.length} left</span>
        {lastWord && <span className="text-accent font-medium">{lastWord}</span>}
      </div>

      {/* Board — fills available space, square, centered */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0 mb-1">
        <div
          className="grid gap-[1px] bg-white/5 rounded-md overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
            width: 'min(100%, min(60vh, 420px))',
            height: 'min(100%, min(60vh, 420px))',
            aspectRatio: '1',
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
                className={`relative flex items-center justify-center transition-all text-[7px] sm:text-[9px] font-bold leading-none ${
                  cell
                    ? isPlaced
                      ? 'bg-amber-200 text-amber-900 ring-1 ring-accent/60'
                      : 'bg-amber-100 text-amber-800'
                    : bs
                      ? `${bs.bg} ${bs.text}`
                      : 'bg-card hover:bg-card-hover'
                }`}
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

      {/* Legend + Actions row — compact */}
      <div className="flex items-center justify-center gap-2 mb-1 flex-shrink-0 flex-wrap">
        <div className="flex gap-2 text-[7px] sm:text-[8px] text-text-dim">
          {(['TW','DW','TL','DL'] as const).map(b => (
            <span key={b} className="flex items-center gap-0.5">
              <span className={`w-2 h-2 rounded-sm ${BONUS_STYLE[b].bg}`} />
              <span>{b}</span>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={handleSubmit}
            disabled={placedKeys.size < 2}
            className="bg-accent text-bg font-bold px-3 py-1 rounded-md text-[10px] disabled:opacity-30 active:scale-95 transition-all"
          >
            Submit
          </button>
          <button
            onClick={handleClear}
            disabled={placedKeys.size === 0}
            className="bg-card text-text font-semibold px-3 py-1 rounded-md text-[10px] disabled:opacity-30 active:scale-95 transition-all"
          >
            Clear
          </button>
          <button
            onClick={handleShuffle}
            disabled={rack.length === 0}
            className="bg-card text-text-muted font-semibold px-2 py-1 rounded-md text-[10px] disabled:opacity-30 active:scale-95 transition-all"
          >
            Shuffle
          </button>
        </div>
      </div>

      {/* Tile rack */}
      <div className="flex justify-center gap-1 flex-shrink-0 pb-1">
        {rack.map((tile, i) => (
          <button
            key={`${tile}-${i}`}
            onClick={() => handleRackClick(i)}
            className={`relative w-9 h-10 rounded-lg font-bold text-sm flex items-center justify-center transition-all shadow-sm ${
              selectedTile === i
                ? 'bg-accent text-bg ring-2 ring-accent scale-110 -translate-y-1'
                : 'bg-amber-200 text-amber-900 hover:bg-amber-300 active:scale-95'
            }`}
          >
            <span>{tile}</span>
            <span className="absolute bottom-0.5 right-0.5 text-[6px] font-normal opacity-50">
              {TILE_SCORES[tile]}
            </span>
          </button>
        ))}
        {rack.length === 0 && (
          <span className="text-text-muted text-[10px] py-2">No tiles</span>
        )}
      </div>
    </div>
  );
}

export default ScrabbleGame;
