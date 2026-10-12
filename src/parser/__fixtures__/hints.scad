before_header = 3;

/* [Numbers] */
plain = 12.5;
// Wall thickness in mm
wall = 2; // [1:5]
stepped = 2.5; // [0:0.5:10]
max_only = 30; // [100]
spin_step = 1.5; // 0.5
negative = -4; // [-10:10]
sci = 1e-3;

/* [Dropdowns] */
count = 4; // [2, 4, 8]
size = 20; // [10:Small, 20:Medium, 30:Large]
shape = "hex"; // [hex, round, square]
finish = "m"; // [m:Matte, g:Glossy]

/* [Text and toggles] */
name = "Vishu";
tag = "abc"; // 8
enabled = true;
rounded = false; // [ignored:hint]

/* [Vectors] */
offset = [1, 2, 3];
dims = [10, 20, 30]; // [0:100]
fine = [0.5, 1.5]; // [0:0.25:5]
