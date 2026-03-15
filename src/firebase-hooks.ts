import { useEffect } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export function useFirebaseSync(
  setProducts: any,
  setSales: any,
  setCategories: any,
  setStaffAccounts: any,
  setAdminCredentials: any,
  setExpenses: any,
  setBranches: any,
  setCustomers: any
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

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      expensesData.sort((a: any, b: any) => b.timestamp - a.timestamp);
      setExpenses(expensesData);
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      customersData.sort((a: any, b: any) => b.createdAt - a.createdAt);
      setCustomers(customersData);
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

    const unsubBranches = onSnapshot(collection(db, 'branches'), (snapshot) => {
      const branchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBranches(branchesData);
    });

    const unsubStaff = onSnapshot(collection(db, 'staffAccounts'), (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaffAccounts(staffData);
    });

    return () => {
      unsubProducts();
      unsubSales();
      unsubExpenses();
      unsubCustomers();
      unsubSettings();
      unsubBranches();
      unsubStaff();
    };
  }, [setProducts, setSales, setCategories, setStaffAccounts, setAdminCredentials, setExpenses, setBranches, setCustomers]);
}
