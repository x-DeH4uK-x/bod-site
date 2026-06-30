import { Descriptions, Divider } from 'antd';
import { useCallback, useState } from 'react';
import { CanvasMaps } from './canvas-maps.component';
import type { MapKey } from './enums/map-key.enum';
import { MapsList } from './maps-list.component';
import {
  INITIAL_MAPS_COLORS,
  INITIAL_SELECTED_MAPS,
  MAPS,
} from './maps-view.constants';
import styles from './maps-view.module.scss';

export function MapsView() {
  const [selectedMaps, setSelectedMaps] = useState(INITIAL_SELECTED_MAPS);
  const [mapsColors, setMapsColors] = useState(INITIAL_MAPS_COLORS);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  const handleChangeColor = useCallback((key: MapKey, color: `#${string}`) => {
    setMapsColors((state) => ({ ...state, [key]: color }));
  }, []);

  const descriptionsItems = [
    { key: 'x', label: 'X', children: cursorPosition.x.toFixed(3) },
    { key: 'y', label: 'Y', children: cursorPosition.y.toFixed(3) },
  ];

  return (
    <div className={styles.container}>
      <CanvasMaps
        maps={MAPS}
        selectedMaps={selectedMaps}
        mapsColors={mapsColors}
        setCursorPosition={setCursorPosition}
      />
      <div className={styles.sidebar}>
        <Descriptions
          className={styles.descriptions}
          title="Cursor coordinates"
          items={descriptionsItems}
          column={2}
        />
        <Divider size="small" />
        <MapsList
          className={styles.list}
          maps={MAPS}
          selectedMaps={selectedMaps}
          mapsColors={mapsColors}
          onChange={setSelectedMaps}
          onChangeColor={handleChangeColor}
        />
      </div>
    </div>
  );
}
