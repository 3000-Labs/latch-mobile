import AsyncStorage from '@react-native-async-storage/async-storage';
import Reactotron from 'reactotron-react-native';

const reactotron = Reactotron.setAsyncStorageHandler(AsyncStorage) // AsyncStorage would either come from `react-native` or `@react-native-community/async-storage` depending on where you get it from
  .configure({
    name: 'latch',
  })
  .useReactNative({
    asyncStorage: true,
    editor: false,
    errors: { veto: () => false },
    networking: {
      ignoreUrls: /symbolicate/,
    },
    overlay: false,
  })
  .connect();

export default reactotron;
