use <threads.scad>
include <BOSL2/std.scad>

/* multi-line
   block comment, not a group */
url = "http://example.com/a;b"; // not a hint
quote = "say \"hi\" // [1:2]";
points = [
  1, // first
  2,
  3,
]; // [0:10]
a = 1; b = 2; // [0:5]

// applies to nothing

derived = a * 2;
ref = a;
neg_expr = -a;
range = [0:10];
nested = [[1, 2], [3, 4]];
mixed = [1, "a"];
empty = [];
call = sin(30);
undef_value = undef;

if (a > 0) {
  inner = 5;
}
echo("x = 1; // [0:1]");

// Described after a block
after_block = 7;
a = 9;

/* [Hidden] */
secret = 1;
/* [Shown Again] */
shown = 2;

function f(x) = x * 2;
after_function = 1;
