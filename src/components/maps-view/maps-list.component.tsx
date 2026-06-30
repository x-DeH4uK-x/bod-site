import { Checkbox, Space } from 'antd';
import type { MapKey } from './enums/map-key.enum';
import { MapsListOption } from './maps-list-option.component';
import type { TBodMapItem } from './maps-view.types';

type TProps = {
  className?: string;
  maps: Array<TBodMapItem>;
  selectedMaps: Array<MapKey>;
  mapsColors: Record<MapKey, `#${string}`>;
  onChange: (checkedValue: Array<MapKey>) => void;
  onChangeColor: (key: MapKey, color: `#${string}`) => void;
};

export function MapsList({
  className,
  maps,
  selectedMaps,
  mapsColors,
  onChange,
  onChangeColor,
}: TProps) {
  return (
    <Checkbox.Group
      className={className}
      value={selectedMaps}
      onChange={onChange}
    >
      <Space size="small" vertical>
        {maps.map((map) => (
          <MapsListOption
            key={map.key}
            value={map.key}
            name={map.name}
            description={map.key}
            color={mapsColors[map.key]}
            onChangeColor={onChangeColor}
          />
        ))}
      </Space>
    </Checkbox.Group>
  );
}
