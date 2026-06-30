import { App as AntApp, ConfigProvider, theme } from 'antd';
import { MapsView } from '../maps-view/maps-view.component';
import styles from './app.module.scss';

const App = () => {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, cssVar: {} }}>
      <AntApp className={styles.app}>
        <MapsView />
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
