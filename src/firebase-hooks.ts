import { useEffect } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // In hooks, we might not want to throw and crash the whole app, but logging is essential.
}

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
    }, (error) => handleFirestoreError(error, OperationType.GET, 'products'));

    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      salesData.sort((a: any, b: any) => b.timestamp - a.timestamp);
      setSales(salesData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'sales'));

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      expensesData.sort((a: any, b: any) => b.timestamp - a.timestamp);
      setExpenses(expensesData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'expenses'));

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      customersData.sort((a: any, b: any) => b.createdAt - a.createdAt);
      setCustomers(customersData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'customers'));

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
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/general'));

    const unsubBranches = onSnapshot(collection(db, 'branches'), (snapshot) => {
      const branchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBranches(branchesData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'branches'));

    const unsubStaff = onSnapshot(collection(db, 'staffAccounts'), (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaffAccounts(staffData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'staffAccounts'));

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
