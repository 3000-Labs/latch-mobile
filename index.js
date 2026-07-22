// DO NOT reorder these imports — see polyfills.js for why.
import './polyfills';

// Reads the persisted network choice and stashes it on `global` *before*
// requiring the rest of the app (via require(), not a static import — a static
// `import 'expo-router/entry'` would resolve before this async read finishes).
// config.ts reads this synchronously the moment it's first evaluated, so every
// module that derives a value from ACTIVE_NETWORK at its own top level gets the
// right one on the very first import, not just after a later re-render.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACTIVE_NETWORK_STORAGE_KEY } from './src/constants/network-storage-key';

AsyncStorage.getItem(ACTIVE_NETWORK_STORAGE_KEY)
  .catch(() => null)
  .then((stored) => {
    global.__LATCH_NETWORK_OVERRIDE__ = stored;
    require('expo-router/entry');
  });
