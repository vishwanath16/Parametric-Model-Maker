import type { ProjectFiles } from '../lib/files'
import adapterPresets from './mic_to_camera_adapter.json?raw'
import adapterSource from './mic_to_camera_adapter.scad?raw'
import nameTagSource from './name_tag.scad?raw'
import roundedBoxSource from './rounded_box.scad?raw'

export interface Example {
  id: string
  title: string
  description: string
  files: ProjectFiles
}

export const EXAMPLES: readonly Example[] = [
  {
    id: 'mic-adapter',
    title: 'Mic Arm 3/8" to Camera 1/4" Adapter',
    description: 'Threaded adapter with fit clearance, knurled body, socket and stud settings. Includes presets.',
    files: {
      'mic_to_camera_adapter.scad': adapterSource,
      'mic_to_camera_adapter.json': adapterPresets,
    },
  },
  {
    id: 'rounded-box',
    title: 'Rounded Box with Lid',
    description: 'Storage box sized by a width / depth / height vector, with compartments and a friction-fit lid.',
    files: { 'rounded_box.scad': roundedBoxSource },
  },
  {
    id: 'name-tag',
    title: 'Name Tag',
    description: 'Key fob with raised or engraved text. Shows text, dropdown and toggle parameters.',
    files: { 'name_tag.scad': nameTagSource },
  },
]
