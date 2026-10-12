// Rounded storage box with an optional friction-fit lid.

/* [Box] */
// Inside width, depth and height, mm
inner_size = [60, 40, 25]; // [10:200]
// Wall and floor thickness, mm
wall = 1.6; // [0.8:0.4:4]
// Corner radius, mm
corner_radius = 4; // [0:0.5:15]
// Dividers along the width
compartments = 2; // [1, 2, 3, 4]

/* [Lid] */
// What to generate
part = "both"; // [both:Box and lid, box:Box only, lid:Lid only]
// Depth of the lid rim, mm
lid_rim = 5; // [2:0.5:12]
// Gap between lid rim and box, mm
lid_clearance = 0.2; // [0:0.05:0.6]
// Cut a finger notch in the lid rim
finger_notch = true;

/* [Quality] */
$fn = 48; // [16:8:128]

/* [Hidden] */
outer = [inner_size[0] + 2 * wall, inner_size[1] + 2 * wall, inner_size[2] + wall];
r_outer = min(corner_radius + wall, min(outer[0], outer[1]) / 2 - 0.01);

module rounded_block(size, r) {
  rr = max(r, 0.01);
  hull()
    for (x = [rr, size[0] - rr], y = [rr, size[1] - rr])
      translate([x, y, 0]) cylinder(r = rr, h = size[2]);
}

module box() {
  difference() {
    rounded_block(outer, r_outer);
    translate([wall, wall, wall]) rounded_block([inner_size[0], inner_size[1], inner_size[2] + 1], r_outer - wall);
  }
  if (compartments > 1)
    for (i = [1:compartments - 1])
      translate([wall + i * inner_size[0] / compartments - wall / 2, wall / 2, 0])
        cube([wall, outer[1] - wall, outer[2] - 1]);
}

module lid() {
  gap = wall + lid_clearance;
  size = [outer[0] + 2 * gap, outer[1] + 2 * gap, wall + lid_rim];
  difference() {
    rounded_block(size, r_outer + gap);
    translate([wall, wall, wall])
      rounded_block([outer[0] + 2 * lid_clearance, outer[1] + 2 * lid_clearance, lid_rim + 1], r_outer + lid_clearance);
    if (finger_notch)
      translate([size[0] / 2, -1, wall + lid_rim]) rotate([-90, 0, 0]) cylinder(d = min(18, size[0] / 2), h = wall + 2);
  }
}

if (part != "lid") box();
if (part != "box") translate([part == "both" ? outer[0] + 8 : 0, 0, 0]) lid();
