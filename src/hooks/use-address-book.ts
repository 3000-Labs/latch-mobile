import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const ADDRESS_BOOK_KEY = 'latch_address_book';

export interface AddressEntry {
  id: string;
  network: string;
  label: string;
  address: string;
}

export function useAddressBook() {
  const [entries, setEntries] = useState<AddressEntry[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(ADDRESS_BOOK_KEY).then((stored) => {
      if (stored) {
        try { setEntries(JSON.parse(stored)); } catch { setEntries([]); }
      }
    });
  }, []);

  const addEntry = (entry: Omit<AddressEntry, 'id'>) => {
    setEntries((prev) => {
      const next = [...prev, { ...entry, id: Date.now().toString() }];
      AsyncStorage.setItem(ADDRESS_BOOK_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      AsyncStorage.setItem(ADDRESS_BOOK_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { entries, addEntry, removeEntry };
}
