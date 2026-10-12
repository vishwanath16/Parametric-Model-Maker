// Mic arm 3/8"-16 to camera 1/4"-20 adapter (parser fixture)

/* [Fit - radial clearance per side, mm] */
ext_clear = 0.20;
int_clear = 0.25;

/* [Body] */
// Outer diameter of the knurled body
body_d = 22; // [14:0.5:40]
body_h = 14; // [8:30]
knurl = true;
knurl_count = 24; // [8:2:48]

/* [3/8"-16 socket (bottom, female)] */
socket_depth = 10; // [5:0.5:20]
socket_chamfer = 0.8;

/* [1/4"-20 stud (top, male)] */
stud_len = 8; // [4:0.5:15]
stud_tip = "chamfer"; // [chamfer:Chamfered, flat:Flat, round:Rounded]

/* [Quality] */
$fn = 64; // [16:8:128]
thread_steps = 32; // [16, 32, 48, 64]

/* [Hidden] */
INCH = 25.4;
socket_major = 0.375 * INCH;

module adapter() {
  inside_module = 1;
  cylinder(d = body_d, h = body_h);
}

adapter();
after_module = 5;
