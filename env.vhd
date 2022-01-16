package Env is
    procedure Stop (Status : Integer);
    procedure Stop;
  
    procedure Finish (status : Integer);
    procedure Finish;
  
    function Resolution_Limit return integer;
end package Env;