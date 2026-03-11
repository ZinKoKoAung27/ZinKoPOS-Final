import { useEffect } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export function useFirebaseSync(
  setProducts: any,
  setSales: any,
  setCategories: any,
  setStaffAccounts: any,
  setAdminCredentials: any
) {
  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
    });

    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      salesData.sort((a: any, b: any) => b.timestamp - a.timestamp);
      setSales(salesData);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.categories) setCategories(data.categories);
        if (data.adminCredentials) setAdminCredentials(data.adminCredentials);
      } else {
        // Initialize settings if they don't exist
        setDoc(doc(db, 'settings', 'general'), {
          categories: ['General', 'Electronics', 'Food', 'Clothing', 'Home', 'Beauty'],
          adminCredentials: { username: 'admin', password: 'admin123' }
        });
      }
    });

    const unsubStaff = onSnapshot(collection(db, 'staffAccounts'), (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaffAccounts(staffData);
    });

    return () => {
      unsubProducts();
      unsubSales();
      unsubSettings();
      unsubStaff();
    };
  }, [setProducts, setSales, setCategories, setStaffAccounts, setAdminCredentials]);
}
