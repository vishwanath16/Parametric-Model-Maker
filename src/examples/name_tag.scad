// Name tag / key fob with raised or engraved text.

/* [Text] */
// Up to 16 characters
label = "Vishu"; // 16
// Letter height, mm
text_size = 10; // [5:0.5:24]
font_name = "Liberation Sans"; // [Liberation Sans:Sans, Liberation Mono:Monospace]
bold = true;
// Raised letters stand out, engraved letters are cut in
engraved = false;
// Letter height above (or depth below) the surface, mm
text_depth = 1; // [0.4:0.2:3]

/* [Tag] */
shape = "rounded"; // [rounded:Rounded, pill:Pill, square:Square]
// Space around the text: [left/right, top/bottom], mm
padding = [5, 4]; // [1:15]
thickness = 2.4; // [1.2:0.2:6]
// Add a hole for a key ring
key_ring_hole = true;
hole_diameter = 4; // [2:0.5:8]

/* [Quality] */
$fn = 48; // [16:8:96]

/* [Hidden] */
// Approximate advance width per character for the bundled fonts.
char_width = text_size * 0.78;
text_width = max(len(label), 1) * char_width;
hole_space = key_ring_hole ? hole_diameter + 4 : 0;
tag = [text_width + 2 * padding[0] + hole_space, text_size + 2 * padding[1]];
font_style = bold && font_name == "Liberation Sans" ? str(font_name, ":style=Bold") : font_name;
radius = shape == "pill" ? tag[1] / 2 - 0.01 : shape == "rounded" ? min(3, tag[1] / 2 - 0.01) : 0.01;

module plate() {
  difference() {
    hull()
      for (x = [radius, tag[0] - radius], y = [radius, tag[1] - radius])
        translate([x, y, 0]) cylinder(r = radius, h = thickness);
    if (key_ring_hole)
      translate([hole_diameter / 2 + 3, tag[1] / 2, -1]) cylinder(d = hole_diameter, h = thickness + 2);
  }
}

module letters(height) {
  translate([hole_space + padding[0] + text_width / 2, tag[1] / 2, 0])
    linear_extrude(height)
      text(label, size = text_size, font = font_style, halign = "center", valign = "center");
}

if (engraved) {
  difference() {
    plate();
    translate([0, 0, thickness - min(text_depth, thickness - 0.4)]) letters(thickness);
  }
} else {
  plate();
  translate([0, 0, thickness - 0.01]) letters(text_depth + 0.01);
}
