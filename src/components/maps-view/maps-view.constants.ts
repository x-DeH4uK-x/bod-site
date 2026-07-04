import { MapKey } from './enums/map-key.enum';
import type { TBodMapItem } from './maps-view.types';

export const MAPS: Array<TBodMapItem> = [
  {
    key: MapKey.Tutorial,
    name: 'Tutorial',
    objLoadPath: 'obj-maps/tutorial.glb',
  },
  {
    key: MapKey.Barb_M1,
    name: 'Kashgar',
    objLoadPath: 'obj-maps/m1.glb',
  },
  {
    key: MapKey.Ragnar_M2,
    name: 'Tabriz',
    objLoadPath: 'obj-maps/m2.glb',
  },
  {
    key: MapKey.Dwarf_M3,
    name: 'Kazel Zalam',
    objLoadPath: 'obj-maps/m3.glb',
  },
  {
    key: MapKey.Ruins_M4,
    name: 'Marakamda',
    objLoadPath: 'obj-maps/m4.glb',
  },
  {
    key: MapKey.Mine_M5,
    name: 'Mines of Kelbegen',
    objLoadPath: 'obj-maps/m5.glb',
  },
  {
    key: MapKey.Labyrinth_M6,
    name: 'Fortress of Tell Halaf',
    objLoadPath: 'obj-maps/m6.glb',
  },
  {
    key: MapKey.Tomb_M7,
    name: 'Tombs of Ephyra',
    objLoadPath: 'obj-maps/m7.glb',
  },
  {
    key: MapKey.Island_M8,
    name: 'Island of Karum',
    objLoadPath: 'obj-maps/m8.glb',
  },
  {
    key: MapKey.Orc_M9,
    name: 'Shalatuwar Fortress',
    objLoadPath: 'obj-maps/m9.glb',
  },
  {
    key: MapKey.Orlok_M10,
    name: 'Gorge of Orlok',
    objLoadPath: 'obj-maps/m10.glb',
  },
  {
    key: MapKey.Ice_M11,
    name: 'Fortress of Nemrut',
    objLoadPath: 'obj-maps/m11.glb',
  },
  {
    key: MapKey.Btomb_M12,
    name: 'Oasis of Nejeb',
    objLoadPath: 'obj-maps/m12.glb',
  },
  {
    key: MapKey.Desert_M13,
    name: 'Temple of Al Farum',
    objLoadPath: 'obj-maps/m13.glb',
  },
  {
    key: MapKey.Volcano_M14,
    name: 'Forge of Xshathra',
    objLoadPath: 'obj-maps/m14.glb',
  },
  {
    key: MapKey.Palace_M15,
    name: 'Temple of Ianna',
    objLoadPath: 'obj-maps/m15.glb',
  },
  {
    key: MapKey.Tower_M16,
    name: 'Tower of Dal Gurak',
    objLoadPath: 'obj-maps/m16.glb',
  },
  {
    key: MapKey.Chaos_M17,
    name: 'The Abyss',
    objLoadPath: 'obj-maps/m17.glb',
  },
];

export const INITIAL_SELECTED_MAPS: Array<MapKey> = [
  MapKey.Tutorial,
  MapKey.Island_M8,
  MapKey.Btomb_M12,
  MapKey.Palace_M15,
];

export const INITIAL_MAPS_COLORS: Record<MapKey, `#${string}`> = {
  [MapKey.Tutorial]: '#597EF7',
  [MapKey.Barb_M1]: '#FFC069',
  [MapKey.Ragnar_M2]: '#2F54EB',
  [MapKey.Dwarf_M3]: '#B37FEB',
  [MapKey.Ruins_M4]: '#95DE64',
  [MapKey.Mine_M5]: '#73D13D',
  [MapKey.Labyrinth_M6]: '#A6B9C7',
  [MapKey.Tomb_M7]: '#40A9FF',
  [MapKey.Island_M8]: '#13C2C2',
  [MapKey.Orc_M9]: '#FF85C0',
  [MapKey.Orlok_M10]: '#E3F2FD',
  [MapKey.Ice_M11]: '#36CFC9',
  [MapKey.Btomb_M12]: '#F759AB',
  [MapKey.Desert_M13]: '#FFEC3D',
  [MapKey.Volcano_M14]: '#FF4D4F',
  [MapKey.Palace_M15]: '#FFA940',
  [MapKey.Tower_M16]: '#FF7875',
  [MapKey.Chaos_M17]: '#9254DE',
};

export const FRUSTUM_RADIUS = 200;
export const ZOOM_SPEED = 0.05;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 10.0;
export const CAMERA_FAR = 1000;
export const CAMERA_NEAR = 0.1;
export const CAMERA_INIT_POSITION_Y = 500;

export const JOYSTICK_RADIUS = 40;
