
# vhdl-toolbox

## Assumptions

This is a VHDL linter with some utilities which assumes:

- you open VS Code at the root of your source directory tree
- all VHDL code is underneed this directory (or its subdirectories)
- one file contains:

  - one entity (and architecture)
  - one package (and body)

- each entity has one architecture

## How it works

After opening the folder in VS code, the extension will start parsing all VHDL file (ending in .vhd or .vhdl). If you have a large code base, this can take some seconds.
If the tool finds (assumed) parser errors, it stops parsing the file and shows the parser error. All files containing parsing errors are marked after parsing in the file list and problems view. Everything defined in a file with a parser error is not seen by the VHDL toolbox. This means that a parser error might break the hierarchy view (see later) in an unexpected way. Correcting the parser errors resolves this.

When the parsing is done, click on any VHDL file to see the results. At that moment, VS Code understands your code and will:

- show the declaration of anything (type, component, signal, variable, constant, ...) in a pop-up if you put your cursor on it
- show an outline of the current file in the outline window
- pressing `F12` (or Ctrl click) on a anything will go to the place where it is defined (even if it is in another file).
- pressing `Shift+F12` will show all places where your object is used. Doing it multiple times will cycle through the different places
- the tool proposes code fixes for problems (not always, depends on the actual error).
- the project wide checking process works with data on disk. This means that changes which are not yet saved, are not visible outside the file itself. So if you add a constant to a package, inside the package, the constant is recognised immediately. In any other file, it will only be recognized once the modified packge file has been saved.
- show an overview of all issues in the problem tab of VS Code (View - Problems). If auto-fixes are available, you can activate them by :

  - right clicking on the problem in the problem view
  - clicking on the light bulb at the beginning of the line
  - clicking on the Quick-fix text in the pop-up describing the problem

## What is checked

 The following checks are done:

- coding rules
- for case statements:

  - with enum types: are all defined states used in the case statement (unused defined states are shown with a warning)
  - without enum types: if the select signal is defined as x downto y with x and y integers (no constants, no 'high etc), it checks the size of the select signal against each selection

- detects undeclared signals, constants, variables, components, ports
- the statement 'library work;' will cause a warning as it is not really needed
- a comment starting with TODO will appear in the problems view as an information message. Like that, you get an overview of your todo's per file
- if a signal is used on a different clock as the one used to assign it, it will generate an error since it is a clock crossing 
- checks that all signals of a clocked process are reset (can be disabled in the settings)
- checks that each clocked process has a reset (can be disabled in the settings)
- checks the completeness (missing signals as well as signal which are not needed) of a process sensitivity list
- detects signals which are not used at all, only assigned or only used.
- detects signals which are declared twice
- detects creation of new files (as soon as a .vhd(l) file is saved)
- detects when files are removed (and updates the open editors accordingly)

## Handy extras

- semi-automatic declaration for anything which respects the coding rules (types, signals, variables, ports, generics). The declaration is automatically inserted at the correct place (certainly if the DT coding rules are followed).
- semi-automatic instantiation of an entity. Type the name of the entity to instantiate and press `Ctrl+Alt+d` followed by `Ctrl+Alt+i`. It will insert an instantiation template of the entity which can be easily completed.
- List of all entities in the project (`Ctrl+Alt+d`, `Ctrl+Alt+l`)
- automatic listing of TODOs bases on a comment starting with TODO
- command to insert "mark_debug" and "keep" attributes of any signal. If the attribute is not yet defined, the definition will be added automatically. If one tries to add twice the same attribute on a signal, it is detected.
- command to extract an enumerated type based on a case statement. This command will define the enumerated type and declare the signal used in the case statement being of this type. All of this only works if the DT coding rules are followed ;-)!
- There is a hierarchical view of the code available in the hierarchy view. This view detects automatically all roots in the code base and shows the complete hierarchy of each root in a foldable view. On any member in this view, right clicking will allow to :

  - copy the full hierarchical path to the clipboard (handy for putting constraints!)
  - open the file

  The hierarchical view is handy to detect code which is no longer used (listed as root)
- VHDL2008 support
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
  |  ifwe     | inserts an if - else template                          |
  |  ifg      | inserts an if - generate template                      |
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
  |  o0       | (others => '0')                                        |
  |  o1       | (others => '1')                                        |
  
## Shortcuts

All shortcuts for this extension start with `Ctrl+Alt+d` followed by the following key combinations:

| shortcut  | Description
|-----------|--------------------------------------------------------|
|  `Ctrl+Alt+s`      | inserts the declaration of whatever is under the cursor (and is coding rules compliant)              |
|  `Ctrl+Alt+d`      | inserts attribute 'mark_debug' for whatever is under the cursor              |
|  `Ctrl+Alt+k`      | inserts attribute 'keep' for whatever is under the cursor              |
|  `Ctrl+Alt+e`      | detects a case statement in the selected text and <ul><li>defines a type based on the case signal containing all enums in the case</li><li>defined the case signal as a signal of the type above</li></ul>|
|  `Ctrl+Alt+i`      | inserts an instantiation (generic and port maps) of the entity just before the cursor           |
|  `Ctrl+Alt+l`      | shows a list of all entities in the project. Pressing enter on any of them inserts the name into the editor   |

## Configuration

The VHDL toolbox settings allow to define the behaviour of the tool (even per workspace):

### Configure the automatic checks

The following checks can be enabled/disabled

- checks on process reset can be disabled (enabled by default)
- checks on the DT coding style can be disabled (enabled by default)
- checks on the use of std_logic_arith variants can be disabled (enabled by default)
To offer full flexibility, these checks can also be enabled/disabled in the code. This can be practical in project having both legacy code and fully DT coding rules compliant code. To do this, add the following comment anywhere in the file:
--vhdl_toolbox_\<switch\> \<true/false\>

The table below shows which \<switches\> are supported.

| switch               | check                            |
|----------------------|----------------------------------|
|check_coding_rules    | coding rule checker              |
|check_process_reset   | all checks on reset of a process |
|check_std_logic_arith | use of std_logic_arith variants  |

So

```vhdl
--vhdl_toolbox_check_coding_rules false 
```

will disable the coding rules checker for each file containing this comment

In a similar way, the clock crossing checks can be disabled (in a part of the file). The concept is the same as above.

```vhdl
--vhdl_toolbox_check_clock_crossing false
```

will disable all clock crossing checks which comes after this line until

```vhdl
--vhdl_toolbox_check_clock_crossing true
```

is deteced. If the last comment is not added in the file, the checks are cancelled till the end of the file.

### Determine which files to use

In order to speed up the parsing process, one can define one (or more) regular expression(s) indicating:

- which vhd(l) files to skip during the parsing (e.g. the Xilinx instantiation templates generated for IP)
- which files to only partially parse. In this case, only the entity declaration or the package declaration part (not the body) will be parsed. This can be handy for large library files.

### Toplevel patterns

The 'Toplevel Select Pattern' allows entering a filter for the toplevels shown in the hierarchy view. Please notice that the filter is run on the autodetected toplevels. It is not possible to define a lower level as toplevel.

# Known issues/limitations

- external libs (e.g. unisim.vcomponents) are not (yet) supported
- a file is only taken into account in other design files when saved to disk. Changes in one file are instantaneously taken into account within that file.
- multiple architectures for the same entity are not supported (and generate a parsing error)
- file containing a package and an entity declaration are not supported
- when a custom type is added (typed) and afterwards a signal of this type is defined, the tool doesn't know about the freshly defined type (and it can't be fixed otherwize than restarting VS Code)

# Debug support

The extension is tested on CSIMBA code, Xenics Wildcat code, the UVVM code base, 2 .TV projects, the OSVVM code base and some open source larger VHDL projects. Itseems to be stable.

In case you would come across a file which makes the extension crash, it would be interesting to be notified of this crash and supply KV with the source code triggering the bug.

# Credits

vhdl linter by g0t00 : https://github.com/g0t00/vhdl-linter