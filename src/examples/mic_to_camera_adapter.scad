// Mic arm 3/8"-16 to camera 1/4"-20 adapter.
// Screws onto a microphone arm's 3/8"-16 stud and gives you a 1/4"-20 camera stud.
// Print upright (socket down), no supports needed.
//
// ext_clear shrinks the 1/4"-20 stud; int_clear enlarges the 3/8"-16 socket.
// Raise them if the threads bind, lower them if they wobble.

/* [Fit - radial clearance per side, mm] */
ext_clear = 0.20; // [0:0.05:0.6]
int_clear = 0.25; // [0:0.05:0.6]

/* [Body] */
// Outer diameter, mm
body_d = 22; // [16:0.5:40]
// Height, mm
body_h = 14; // [8:0.5:40]
// Grip grooves around the body
knurl = true;
knurl_count = 24; // [8:2:48]
knurl_depth = 0.8; // [0.2:0.1:2]
// Bevel on the top and bottom edges, mm
body_chamfer = 1; // [0:0.25:3]

/* [3/8"-16 socket (bottom, female)] */
// Thread depth, mm
socket_depth = 10; // [5:0.5:30]
// Lead-in bevel at the opening, mm
socket_chamfer = 0.8; // [0:0.1:2]

/* [1/4"-20 stud (top, male)] */
// Length above the body, mm
stud_len = 8; // [4:0.5:20]
// Bevel at the tip, mm
stud_chamfer = 0.6; // [0:0.1:1.5]

/* [Quality] */
// Facets on round surfaces
$fn = 64; // [24:8:160]
// Segments per thread turn
thread_steps = 36; // [16:4:96]

/* [Hidden] */
INCH = 25.4;
STUD_D = 0.25 * INCH;
STUD_PITCH = INCH / 20;
SOCKET_D = 0.375 * INCH;
SOCKET_PITCH = INCH / 16;
EPS = 0.01;

// Sweeps a closed [radius, z] profile along a right-hand helix.
module helix_sweep(profile, pitch, turns, steps) {
  n = len(profile);
  total = ceil(turns * steps);
  points = [
    for (i = [0:total])
      let (a = 360 * i / steps, dz = pitch * i / steps)
        for (p = profile) [p[0] * cos(a), p[0] * sin(a), p[1] + dz]
  ];
  sides = [
    for (i = [0:total - 1], j = [0:n - 1])
      [i * n + j, (i + 1) * n + j, (i + 1) * n + (j + 1) % n, i * n + (j + 1) % n]
  ];
  start_cap = [[for (j = [0:n - 1]) j]];
  end_cap = [[for (j = [n - 1:-1:0]) total * n + j]];
  polyhedron(points, concat(sides, start_cap, end_cap), convexity = 10);
}

// Solid external thread with the standard 60 degree unified profile, from z = 0 to z = length.
// `offset` grows (+) or shrinks (-) the whole profile radially for fit.
module thread_rod(d, pitch, length, offset = 0) {
  r_major = d / 2 + offset;
  r_minor = r_major - 0.541266 * pitch;
  overlap = 0.05 * pitch;
  r_core = r_minor - overlap;
  slope = tan(30);
  tooth = [
    [r_core, 0.25 * pitch - overlap * slope],
    [r_major, 0.5625 * pitch],
    [r_major, 0.6875 * pitch],
    [r_core, pitch + overlap * slope],
  ];
  intersection() {
    union() {
      cylinder(r = r_minor, h = length);
      translate([0, 0, -pitch]) helix_sweep(tooth, pitch, length / pitch + 2, thread_steps);
    }
    cylinder(r = r_major + 1, h = length);
  }
}

module body() {
  c = min(body_chamfer, body_h / 3);
  difference() {
    hull() {
      cylinder(d = body_d - 2 * c, h = body_h);
      translate([0, 0, c]) cylinder(d = body_d, h = body_h - 2 * c);
    }
    if (knurl)
      for (i = [0:knurl_count - 1])
        rotate([0, 0, 360 * i / knurl_count])
          translate([body_d / 2, 0, -EPS])
            rotate([0, 0, 45])
              cube([knurl_depth * sqrt(2), knurl_depth * sqrt(2), body_h + 2 * EPS]);
  }
}

module socket() {
  // Never cut through the top: keep at least 2 mm of solid body above the socket.
  depth = min(socket_depth, body_h - 2);
  r = SOCKET_D / 2 + int_clear;
  translate([0, 0, -EPS]) thread_rod(SOCKET_D, SOCKET_PITCH, depth + EPS, int_clear);
  if (socket_chamfer > 0)
    translate([0, 0, -EPS]) cylinder(r1 = r + socket_chamfer, r2 = r, h = socket_chamfer);
}

module stud() {
  r = STUD_D / 2 - ext_clear;
  c = min(stud_chamfer, r / 2);
  intersection() {
    thread_rod(STUD_D, STUD_PITCH, stud_len, -ext_clear);
    union() {
      cylinder(r = r + 1, h = stud_len - c);
      translate([0, 0, stud_len - c]) cylinder(r1 = r, r2 = r - c, h = c);
    }
  }
}

difference() {
  union() {
    body();
    translate([0, 0, body_h - EPS]) stud();
  }
  socket();
}
