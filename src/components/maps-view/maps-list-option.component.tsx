import { Checkbox, ColorPicker, Flex, Typography } from 'antd';
import type { MapKey } from './enums/map-key.enum';

const { Text } = Typography;

type TProps = {
  value: MapKey;
  name: string;
  description: string;
  color: `#${string}`;
  onChangeColor: (key: MapKey, color: `#${string}`) => void;
};

export function MapsListOption({
  value,
  name,
  description,
  color,
  onChangeColor,
}: TProps) {
  return (
    <Flex align="center" justify="space-between" gap={8}>
      <Checkbox value={value} style={{ width: '100%' }}>
        <Flex vertical>
          <Text>{name}</Text>
          <Text type="secondary">{description}</Text>
        </Flex>
      </Checkbox>
      <ColorPicker
        value={color}
        onChange={(val) => onChangeColor(value, `#${val.toHex()}`)}
        disabledAlpha
      />
    </Flex>
  );
}
