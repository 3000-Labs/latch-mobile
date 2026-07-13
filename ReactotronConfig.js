import AsyncStorage from '@react-native-async-storage/async-storage';
import Reactotron from 'reactotron-react-native';

const reactotron = Reactotron.setAsyncStorageHandler(AsyncStorage) // AsyncStorage would either come from `react-native` or `@react-native-community/async-storage` depending on where you get it from
  .configure({
    name: 'latch',
  })
  .useReactNative({
    asyncStorage: false,
    editor: false,

    // there are more options to editor
    errors: { veto: () => false },
    // there are more options to the async storage.
    networking: {
      // optionally, you can turn it off with false.
      ignoreUrls: /symbolicate/,
    }, // or turn it off with false
    overlay: false, // just turning off overlay
  })
  .connect();

export default reactotron;
