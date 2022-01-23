-- The sven STANDARD package.
-- This design unit contains some special tokens, which are only
-- recognized by the analyzer when it is in special "bootstrap" mode.

package STANDARD is

  -- predefined enumeration types:

  type boolean is (false, true);

  type bit is ('0', '1');

  type CHARACTER is (
	NUL,	SOH,	STX,	ETX,	EOT,	ENQ,	ACK,	BEL,
	BS,	HT,	LF,	VT,	FF,	CR,	SO,	SI,
	DLE,	DC1,	DC2,	DC3,	DC4,	NAK,	SYN,	ETB,
	CAN,	EM,	SUB,	ESC,	FSP,	GSP,	RSP,	USP,

	' ',	'!',	'"',	'#',	'$',	'%',	'&',	''',
	'*',	'+',	',',	'-',	'.',	'/',
	'0',	'1',	'2',	'3',	'4',	'5',	'6',	'7',
	'8',	'9',	':',	'<',	'=',	'>',	'?',

	'@',	'A',	'B',	'C',	'D',	'E',	'F',	'G',
	'H',	'I',	'J',	'K',	'L',	'M',	'N',	'O',
	'P',	'Q',	'R',	'S',	'T',	'U',	'V',	'W',
	'X',	'Y',	'Z',	'[',	'\',	']',	'^',	'_',

	'`',	'a',	'b',	'c',	'd',	'e',	'f',	'g',
	'h',	'i',	'j',	'k',	'l',	'm',	'n',	'o',
	'p',	'q',	'r',	's',	't',	'u',	'v',	'w',
	'x',	'y',	'z',	'{',	'|',	'}',	'~',	DEL,
    C128,   C129,   C130,   C131,   C132,   C133,   C134,   C135,
    C136,   C137,   C138,   C139,   C140,   C141,   C142,   C143,
    C144,   C145,   C146,   C147,   C148,   C149,   C150,   C151,
    C152,   C153,   C154,   C155,   C156,   C157,   C158,   C159,
   '�',  '�', '�', '�', '�', '�', '�', '�',
   '�',  '�', '�', '�', '�', '�', '�', '�',
   '�',  '�', '�', '�', '�', '�', '�', '�',
   '�', '�', '�',  '�', '�', '�', '�', '�',  
   '�', '�', '�',  '�', '�', '�', '�', '�',
   '�',  '�', '�', '�', '�', '�', '�', '�',
   '�',  '�', '�', '�', '�', '�', '�',  '�',
   '�',  '�', '�', '�', '�', '�', '�', '�',
   '�',  '�', '�', '�', '�', '�', '�', '�',
   '�',  '�', '�', '�', '�', '�', '�', '�',
   '�',  '�', '�', '�', '�', '�', '�', '�',
   '�',  '�', '�', '�', '�', '�', '�', '�'); 
     
    


  type severity_level is (note, warning, error, failure);

  -- predefined numeric types:

  -- Do INTEGER first to aid implicit declarations of "**".
  type integer is range -2147483647 to 2147483647;
  type integer_vector is array (natural range <>) of integer;
  type boolean_vector is array (natural range <>) of boolean;
  type real_vector is array (natural range <>) of integer;

  function "*" (left : $UNIVERSAL_REAL; right : $UNIVERSAL_INTEGER)
    return UNIVERSAL_REAL;

  function "*" (left : $UNIVERSAL_INTEGER; right : $UNIVERSAL_REAL)
    return UNIVERSAL_REAL;

  function "/" (left : $UNIVERSAL_REAL; right : $UNIVERSAL_INTEGER)
    return  UNIVERSAL_REAL;

  type real is range $-. to $+.;

  -- predefined type TIME:

  type time is range                 --implementation defined-- ;
    units
      fs;                               -- femtosecond
      ps = 1000 fs;                     -- picosecond
      ns = 1000 ps;                     -- nanosecond
      us = 1000 ns;                     -- microsecond
      ms = 1000 us;                     -- millisecond
      sec = 1000 ms;                    -- second
      min = 60 sec;                     -- minute
      hr = 60 min;                      -- hour
    end  units ;
  -- subtype used internally for checking time expressions for non-negativness:


  subtype delay_length is time range 0 fs to time'high;

  -- function that returns the current simulation time:

  impure function NOW return time;

  -- predefined numeric subtypes:

  subtype natural is integer range 0 to integer'high;

  subtype positive is integer range 1 to integer'high;

  -- predefined array types:

  type string is array (positive range <>) of character;

  type bit_vector is array (natural range <>) of bit;

  type time_vector is array (natural range <>) of time;

--type FILE_OPEN_KIND is (READ_OPEN, WRITE_OPEN, APPEND_OPEN);

  type file_open_kind is (read_mode, write_mode, append_mode);

  type file_open_status is (open_ok, status_error, name_error, mode_error);

  attribute FOREIGN : string;


  function "?=" (L, R  : BOOLEAN) return BOOLEAN;
  function "?/=" (L, R : BOOLEAN) return BOOLEAN;
  function "?<" (L, R  : BOOLEAN) return BOOLEAN;
  function "?<=" (L, R : BOOLEAN) return BOOLEAN;
  function "?>" (L, R  : BOOLEAN) return BOOLEAN;
  function "?>=" (L, R : BOOLEAN) return BOOLEAN;

  function MINIMUM (L, R : BOOLEAN) return BOOLEAN;
  function MAXIMUM (L, R : BOOLEAN) return BOOLEAN;

  function RISING_EDGE (signal S  : BOOLEAN) return BOOLEAN;
  function FALLING_EDGE (signal S : BOOLEAN) return BOOLEAN;

  function "?=" (L, R  : BIT) return BIT;
  function "?/=" (L, R : BIT) return BIT;
  function "?<" (L, R  : BIT) return BIT;
  function "?<=" (L, R : BIT) return BIT;
  function "?>" (L, R  : BIT) return BIT;
  function "?>=" (L, R : BIT) return BIT;

  function MINIMUM (L, R : BIT) return BIT;
  function MAXIMUM (L, R : BIT) return BIT;

  function "??" (L : BIT) return BOOLEAN;

  function RISING_EDGE (signal S  : BIT) return BOOLEAN;
  function FALLING_EDGE (signal S : BIT) return BOOLEAN;

  function MINIMUM (L, R : CHARACTER) return CHARACTER;
  function MAXIMUM (L, R : CHARACTER) return CHARACTER;

  function MINIMUM (L, R : SEVERITY_LEVEL) return SEVERITY_LEVEL;
  function MAXIMUM (L, R : SEVERITY_LEVEL) return SEVERITY_LEVEL;

  function MINIMUM (L, R : INTEGER) return INTEGER;
  function MAXIMUM (L, R : INTEGER) return INTEGER;

  function MINIMUM (L, R : REAL) return REAL;
  function MAXIMUM (L, R : REAL) return REAL;

  function "mod" (L, R : TIME) return TIME;
  function "rem" (L, R : TIME) return TIME;

  function MINIMUM (L, R : TIME) return TIME;
  function MAXIMUM (L, R : TIME) return TIME;

  function MINIMUM (L, R : STRING) return STRING;
  function MAXIMUM (L, R : STRING) return STRING;

  function MINIMUM (L : STRING) return CHARACTER;
  function MAXIMUM (L : STRING) return CHARACTER;

  type BOOLEAN_VECTOR is array (NATURAL range <>) of BOOLEAN;

  -- The predefined operations for this type are as follows:

  function "and" (L, R  : BOOLEAN_VECTOR) return BOOLEAN_VECTOR;
  function "or" (L, R   : BOOLEAN_VECTOR) return BOOLEAN_VECTOR;
  function "nand" (L, R : BOOLEAN_VECTOR) return BOOLEAN_VECTOR;
  function "nor" (L, R  : BOOLEAN_VECTOR) return BOOLEAN_VECTOR;
  function "xor" (L, R  : BOOLEAN_VECTOR) return BOOLEAN_VECTOR;
  function "xnor" (L, R : BOOLEAN_VECTOR) return BOOLEAN_VECTOR;

  function "not" (L : BOOLEAN_VECTOR) return BOOLEAN_VECTOR;

  function "and" (L : BOOLEAN_VECTOR; R : BOOLEAN)
    return BOOLEAN_VECTOR;
  function "and" (L : BOOLEAN; R : BOOLEAN_VECTOR)
    return BOOLEAN_VECTOR;
  function "or" (L : BOOLEAN_VECTOR; R : BOOLEAN)
    return BOOLEAN_VECTOR;
  function "or" (L : BOOLEAN; R : BOOLEAN_VECTOR)
    return BOOLEAN_VECTOR;
  function "nand" (L : BOOLEAN_VECTOR; R : BOOLEAN)
    return BOOLEAN_VECTOR;
  function "nand" (L : BOOLEAN; R : BOOLEAN_VECTOR)
    return BOOLEAN_VECTOR;
  function "nor" (L : BOOLEAN_VECTOR; R : BOOLEAN)
    return BOOLEAN_VECTOR;
  function "nor" (L : BOOLEAN; R : BOOLEAN_VECTOR)
    return BOOLEAN_VECTOR;
  function "xor" (L : BOOLEAN_VECTOR; R : BOOLEAN)
    return BOOLEAN_VECTOR;
  function "xor" (L : BOOLEAN; R : BOOLEAN_VECTOR)
    return BOOLEAN_VECTOR;
  function "xnor" (L : BOOLEAN_VECTOR; R : BOOLEAN)
    return BOOLEAN_VECTOR;
  function "xnor" (L : BOOLEAN; R : BOOLEAN_VECTOR)
    return BOOLEAN_VECTOR;

  function and_reduce (L  : BOOLEAN_VECTOR) return BOOLEAN;
  function or_reduce (L  : BOOLEAN_VECTOR) return BOOLEAN;
  function nand_reduce (L  : BOOLEAN_VECTOR) return BOOLEAN;
  function nor_reduce (L  : BOOLEAN_VECTOR) return BOOLEAN;
  function xor_reduce (L  : BOOLEAN_VECTOR) return BOOLEAN;
  function xnor_reduce (L  : BOOLEAN_VECTOR) return BOOLEAN;

  function "sll" (L : BOOLEAN_VECTOR; R : INTEGER)
    return BOOLEAN_VECTOR;
  function "srl" (L : BOOLEAN_VECTOR; R : INTEGER)
    return BOOLEAN_VECTOR;
  function "sla" (L : BOOLEAN_VECTOR; R : INTEGER)
    return BOOLEAN_VECTOR;
  function "sra" (L : BOOLEAN_VECTOR; R : INTEGER)
    return BOOLEAN_VECTOR;
  function "rol" (L : BOOLEAN_VECTOR; R : INTEGER)
    return BOOLEAN_VECTOR;
  function "ror" (L : BOOLEAN_VECTOR; R : INTEGER)
    return BOOLEAN_VECTOR;

--  function "=" (L, R  : BOOLEAN_VECTOR) return BOOLEAN;
--  function "/=" (L, R : BOOLEAN_VECTOR) return BOOLEAN;
--  function "<" (L, R  : BOOLEAN_VECTOR) return BOOLEAN;
--  function "<=" (L, R : BOOLEAN_VECTOR) return BOOLEAN;
--  function ">" (L, R  : BOOLEAN_VECTOR) return BOOLEAN;
--  function ">=" (L, R : BOOLEAN_VECTOR) return BOOLEAN;

  function "?=" (L, R  : BOOLEAN_VECTOR) return BOOLEAN;
  function "?/=" (L, R : BOOLEAN_VECTOR) return BOOLEAN;

--  function "&" (L : BOOLEAN_VECTOR; R : BOOLEAN_VECTOR)
    -- return BOOLEAN_VECTOR;
--  function "&" (L : BOOLEAN_VECTOR; R : BOOLEAN) -- return BOOLEAN_VECTOR;
--  function "&" (L : BOOLEAN; R : BOOLEAN_VECTOR) -- return BOOLEAN_VECTOR;
--  function "&" (L : BOOLEAN; R : BOOLEAN) -- return BOOLEAN_VECTOR;

  function MINIMUM (L, R : BOOLEAN_VECTOR) return BOOLEAN_VECTOR;
  function MAXIMUM (L, R : BOOLEAN_VECTOR) return BOOLEAN_VECTOR;

  function MINIMUM (L : BOOLEAN_VECTOR) return BOOLEAN;
  function MAXIMUM (L : BOOLEAN_VECTOR) return BOOLEAN;

  function "and" (L  : BIT_VECTOR; R : BIT) return BIT_VECTOR;
  function "and" (L  : BIT; R : BIT_VECTOR) return BIT_VECTOR;
  function "or" (L   : BIT_VECTOR; R : BIT) return BIT_VECTOR;
  function "or" (L   : BIT; R : BIT_VECTOR) return BIT_VECTOR;
  function "nand" (L : BIT_VECTOR; R : BIT) return BIT_VECTOR;
  function "nand" (L : BIT; R : BIT_VECTOR) return BIT_VECTOR;
  function "nor" (L  : BIT_VECTOR; R : BIT) return BIT_VECTOR;
  function "nor" (L  : BIT; R : BIT_VECTOR) return BIT_VECTOR;
  function "xor" (L  : BIT_VECTOR; R : BIT) return BIT_VECTOR;
  function "xor" (L  : BIT; R : BIT_VECTOR) return BIT_VECTOR;
  function "xnor" (L : BIT_VECTOR; R : BIT) return BIT_VECTOR;
  function "xnor" (L : BIT; R : BIT_VECTOR) return BIT_VECTOR;

  function and_reduce (L  : BIT_VECTOR) return BIT;
  function or_reduce (L  : BIT_VECTOR) return BIT;
  function nand_reduce (L  : BIT_VECTOR) return BIT;
  function nor_reduce (L  : BIT_VECTOR) return BIT;
  function xor_reduce (L  : BIT_VECTOR) return BIT;
  function xnor_reduce (L  : BIT_VECTOR) return BIT;

  function "?=" (L, R  : BIT_VECTOR) return BIT;
  function "?/=" (L, R : BIT_VECTOR) return BIT;

  function MINIMUM (L, R : BIT_VECTOR) return BIT_VECTOR;
  function MAXIMUM (L, R : BIT_VECTOR) return BIT_VECTOR;

  function MINIMUM (L : BIT_VECTOR) return BIT;
  function MAXIMUM (L : BIT_VECTOR) return BIT;

  function TO_STRING (VALUE : BIT_VECTOR) return STRING;

  alias TO_BSTRING is TO_STRING [BIT_VECTOR return STRING];
  alias TO_BINARY_STRING is TO_STRING [BIT_VECTOR return STRING];
  function TO_OSTRING (VALUE : BIT_VECTOR) return STRING;
  alias TO_OCTAL_STRING is TO_OSTRING [BIT_VECTOR return STRING];
  function TO_HSTRING (VALUE : BIT_VECTOR) return STRING;
  alias TO_HEX_STRING is TO_HSTRING [BIT_VECTOR return STRING];

  type INTEGER_VECTOR is array (NATURAL range <>) of INTEGER;

  -- The predefined operations for this type are as follows:
  function "=" (L, R  : INTEGER_VECTOR) return BOOLEAN;
  function "/=" (L, R  : INTEGER_VECTOR) return BOOLEAN;
  function "<" (L, R  : INTEGER_VECTOR) return BOOLEAN;
  function "<=" (L, R  : INTEGER_VECTOR) return BOOLEAN;
  function ">" (L, R  : INTEGER_VECTOR) return BOOLEAN;
  function ">=" (L, R  : INTEGER_VECTOR) return BOOLEAN;

--  function "&" (L : INTEGER_VECTOR; R : INTEGER_VECTOR)
--    return INTEGER_VECTOR;
--  function "&" (L : INTEGER_VECTOR; R : INTEGER) return INTEGER_VECTOR;
--  function "&" (L : INTEGER; R : INTEGER_VECTOR) return INTEGER_VECTOR;
--  function "&" (L : INTEGER; R : INTEGER) return INTEGER_VECTOR;

  function MINIMUM (L, R : INTEGER_VECTOR) return INTEGER_VECTOR;
  function MAXIMUM (L, R : INTEGER_VECTOR) return INTEGER_VECTOR;

  function MINIMUM (L : INTEGER_VECTOR) return INTEGER;
  function MAXIMUM (L : INTEGER_VECTOR) return INTEGER;

  type REAL_VECTOR is array (NATURAL range <>) of REAL;

  -- The predefined operations for this type are as follows:
  function "=" (L, R  : REAL_VECTOR) return BOOLEAN;
  function "/=" (L, R  : REAL_VECTOR) return BOOLEAN;
  function "<" (L, R  : REAL_VECTOR) return BOOLEAN;
  function "<=" (L, R  : REAL_VECTOR) return BOOLEAN;
  function ">" (L, R  : REAL_VECTOR) return BOOLEAN;
  function ">=" (L, R  : REAL_VECTOR) return BOOLEAN;

--  function "&" (L : REAL_VECTOR; R : REAL_VECTOR)
--    return REAL_VECTOR;
--  function "&" (L : REAL_VECTOR; R : REAL) return REAL_VECTOR;
--  function "&" (L : REAL; R : REAL_VECTOR) return REAL_VECTOR;
--  function "&" (L : REAL; R : REAL) return REAL_VECTOR;

  function MINIMUM (L, R : REAL_VECTOR) return REAL_VECTOR;
  function MAXIMUM (L, R : REAL_VECTOR) return REAL_VECTOR;

  function MINIMUM (L : REAL_VECTOR) return REAL;
  function MAXIMUM (L : REAL_VECTOR) return REAL;

  type TIME_VECTOR is array (NATURAL range <>) of TIME;

  -- The predefined operations for this type are as follows:
  function "=" (L, R  : TIME_VECTOR) return BOOLEAN;
  function "/=" (L, R  : TIME_VECTOR) return BOOLEAN;
  function "<" (L, R  : TIME_VECTOR) return BOOLEAN;
  function "<=" (L, R  : TIME_VECTOR) return BOOLEAN;
  function ">" (L, R  : TIME_VECTOR) return BOOLEAN;
  function ">=" (L, R  : TIME_VECTOR) return BOOLEAN;

--  function "&" (L : TIME_VECTOR; R : TIME_VECTOR)
--    return TIME_VECTOR;
--  function "&" (L : TIME_VECTOR; R : TIME) return TIME_VECTOR;
--  function "&" (L : TIME; R : TIME_VECTOR) return TIME_VECTOR;
--  function "&" (L : TIME; R : TIME) return TIME_VECTOR;

  function MINIMUM (L, R : TIME_VECTOR) return TIME_VECTOR;
  function MAXIMUM (L, R : TIME_VECTOR) return TIME_VECTOR;

  function MINIMUM (L : TIME_VECTOR) return TIME;
  function MAXIMUM (L : TIME_VECTOR) return TIME;

  function MINIMUM (L, R : FILE_OPEN_KIND) return FILE_OPEN_KIND;
  function MAXIMUM (L, R : FILE_OPEN_KIND) return FILE_OPEN_KIND;

  function MINIMUM (L, R : FILE_OPEN_STATUS) return FILE_OPEN_STATUS;
  function MAXIMUM (L, R : FILE_OPEN_STATUS) return FILE_OPEN_STATUS;

  -- predefined TO_STRING operations on scalar types
  function TO_STRING (VALUE : BOOLEAN) return STRING;
  function TO_STRING (VALUE : BIT) return STRING;
  function TO_STRING (VALUE : CHARACTER) return STRING;
  function TO_STRING (VALUE : SEVERITY_LEVEL) return STRING;
  function TO_STRING (VALUE : INTEGER) return STRING;
  function TO_STRING (VALUE : REAL) return STRING;
  function TO_STRING (VALUE : TIME) return STRING;
  function TO_STRING (VALUE : FILE_OPEN_KIND) return STRING;
  function TO_STRING (VALUE : FILE_OPEN_STATUS) return STRING;

  -- predefined overloaded TO_STRING operations
  function TO_STRING (VALUE : REAL; DIGITS : NATURAL) return STRING;
  function TO_STRING (VALUE : REAL; FORMAT : STRING) return STRING;
  function TO_STRING (VALUE : TIME; UNIT : TIME) return STRING;


end STANDARD;   
