# vhdl-linter
## Assumptions

This is a VHDL linter which assumes:
- you open VS Code at the root of your source directory tree
- all VHDL code is underneed this directory (or its subdirectories)

## How it works
After opening the folder in VS code, the extension will start parsing all VHDL file (ending in .vhd or .vhdl). If you have a large code base, this can take some seconds.
When the parsing is done, click on any VHDL file to see the results. At that moment, VS Code understands your code and will:
- show the declaration of anything (type, component, signal, variable, constant, ...) in a pop-up if you put your cursor on it
- show an outline of your code in the outline window
- pressing F12 on a anything will go to the place where it is defined (even if it is in another file). 
- pressing SHIFT+F12 will show all places where your object is used. Doing it multiple times will cycle through the different places
- propose fixes for problems (not always, depends on the actual error).
- the checking process project wide works with data on disk. This means that changes which are not yet saved, are not visible outside the file itself. So if you add a constant to a package, inside the package, the constant is recognised immediately. In any other file, it will only be recognized once the modified packge file has been saved.
- show an overview of all issues in the problem tab of VS Code (View - Problems). If auto-fixes are available, you can activate them by :
   - right clicking on the problem in the problem view
   - clicking on the light bulb at the beginning of the line
   - clicking on the Quick-fix text in the pop-up describing the problem
- the linter also provides Deltatec coding style compliant VHDL templates with the following shortcuts:

| shortcut  | Description
|-----------|--------------------------------------------------------|
|  hdr      | inserts  the deltatec header                           | 
|  ent      | inserts standard libs and the entity declaration       |
|  arch     | inserts the architecture template                      |
|  enta     | same as ent and arch after each other                  |
|  nf       | (new file): inserts a complete template for a VHDL file|
|  cas      | inserts a case template                                |
|  rec      | inserts a record template                              |
|  forl     | inserts a for loop template                            |
|  forg     | inserts a for generate template                        |
|  if       | inserts an if template                                 |
|  func     | inserts a function template                            |
|  proc     | process template                                       |
|  slv      | std_logic_vector                                       |
|  uns      | unsigned                                               |
|  var      | variable                                               |
|  int      | integer                                                |
|  dt       | downto                                                 |
|  sig      | signal                                                 |
|  pack     | complete package template  (with header)               |
|  while    | while template                                         |
|  pro      | a combinatorial process                                |
|  spro     | a synchronous process                                  |


## What is checked
 The following checks are done:
 - DT coding rules
 - for case statements:
     - with enum types: are all defined states used in the case statement (unused defined states are shown with a warning)
     - without enum types: if the select signal is defined as x downto y with x and y integers (no constants, no 'high etc), it checks the size of the select signal against each selection
- detects undeclared signals, constants, variables, components, ports
- the statement 'library work;' will cause a warning as it is not really needed
- a comment starting with TODO will appear in the problems view as an information message. Like that, you get an overview of your todo's per file
- if a signal is used on a different clock as the one used to assign it, it will generate an error since it is a clock crossing (plan is to have a magical comment to suppress this error to indicate intended use)
- checks that all signals of a clocked process are reset
- checks that each clocked process has a reset
- checks that processes without sensitivity list have at least one wait statement in it.
- checks the completeness (missing signals as well as signal which are not needed) of a process sensitivity list
- detects signals which are not used at all, only assigned or only used.
- detects signals which are declared twice
- detects multiple drivers on the same signal
- detects creation of new files (as soon as a .vhd(l) file is saved) 
- detects when files are removed (and updates the open editors accordingly)
- semi-automatic declaration for anything which respects the coding rules (types, signals, variables, ports, generics)
- 

## Configuration
The linter doesn't need any configuration file if the code is written as described by the Deltatec FPGA methodology. To support legacy code, two options are possible:
- use magical comments in each file to change the behavior of the linter
- use a configuration file to determine the linter settings for all files.

### Magical comments
The linter supports the following "magical comments" in a VHDL file. It can be put anywhere in the file.
```
--vhdl_toolbox_check_coding_rules true/false   : to enable (true) or disable (false) the code rule checkings in the current file
--vhdl_toolbox_check_process_reset true/false  : to enable (true) or disable (false) the error stating that a signal is not reset 
--vhdl_toolbox_check_std_logic_arith true/false : to enable (true) or disable (false) the error on the use of std_logic_arith_forbidden/unsigned
--vhdl_toolbox_check_clock_crossing true/false : to enable (true) or disable (false) the clock crossings. Can also be used on a part of the file: the part between the false and true won't be checked.
```

# Known issues/limitations
- when a lot of VHDL files are detected, the colorization of the files (yellow for warnings, red for errors, blue for information only) is not working correctly
- external libs (e.g. unisim.vcomponents) are not (yet) supported
- when a custom type is added (typed) and afterwards a signal of this type is defined, the tool doesn't know about the freshly defined type (and it can't be fixed otherwize than restarting VS Code)
- a file is only taken into account in other design files when saved to disk. Changes in one file are instantaneously taken into account within that file.

# Debug support
The extension is tested on CSIMBA code, the UVVM code base and 2 .TV projects and seems to be more or less stable. 

In case you would come across a file which makes the extension crash, it would be interesting to be notified of this crash and supply KV with the source code triggering the bug.

