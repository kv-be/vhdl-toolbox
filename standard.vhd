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

end STANDARD;   
