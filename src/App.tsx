/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  History, 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  TrendingUp, 
  DollarSign, 
  Tag, 
  Image as ImageIcon,
  Loader2,
  X,
  ChevronRight,
  ArrowRight,
  Menu,
  ShoppingBag,
  Upload,
  Moon,
  Sun,
  Languages,
  Globe,
  LogOut,
  Settings as SettingsIcon,
  Users,
  Pencil,
  Printer,
  FileText,
  Download,
  Wallet,
  Store,
  Clock,
  List,
  Pause
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { collection, doc, setDoc, deleteDoc, updateDoc, writeBatch, onSnapshot, increment } from 'firebase/firestore';
import { db } from './firebase';
import { useFirebaseSync } from './firebase-hooks';
import * as htmlToImage from 'html-to-image';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface Product {
  id: string;
  name: string;
  cost: number;
  price: number;
  stock: number;
  image?: string;
  category: string;
  ram?: string;
  storage?: string;
  color?: string;
  barcode?: string;
  description?: string;
  lastRestocked?: string;
  branchId?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt: number;
  debt?: number;
}

interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  cost: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}

interface Sale {
  id: string;
  timestamp: number;
  items: SaleItem[];
  totalAmount: number;
  totalCost: number;
  profit: number;
  discountType?: 'percentage' | 'fixed';
  discount?: number;
  deliveryFee?: number;
  paymentMethod?: string;
  paidAmount?: number;
  paymentStatus?: 'paid' | 'credit';
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  branchId?: string;
}

interface HeldCart {
  id: string;
  timestamp: number;
  items: SaleItem[];
  discountType?: 'percentage' | 'fixed';
  discount?: number;
  deliveryFee?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  branchId?: string;
}

interface Expense {
  id: string;
  timestamp: number;
  description: string;
  amount: number;
  category: string;
  branchId?: string;
}

interface Branch {
  id: string;
  name: string;
}

// --- Constants ---

const DEFAULT_CATEGORIES = ['General', 'Electronics', 'Food', 'Clothing', 'Home', 'Beauty'];
const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];
const IMAGE_SIZES = ["1K", "2K", "4K"];

const TRANSLATIONS = {
  en: {
    dashboard: 'Dashboard',
    products: 'Products',
    pos: 'POS',
    history: 'History',
    totalSales: 'Total Sales',
    totalCost: 'Total Cost',
    totalProfit: 'Total Profit',
    inventoryValue: 'Inventory Value',
    recentSales: 'Recent Sales',
    lowStock: 'Low Stock Alerts',
    addProduct: 'Add Product',
    searchProducts: 'Search products...',
    allCategories: 'All Categories',
    addToCart: 'Add to Cart',
    outOfStock: 'Out of Stock',
    cart: 'Shopping Cart',
    clearAll: 'Clear All',
    subtotal: 'Subtotal',
    tax: 'Tax',
    total: 'Total',
    checkout: 'Checkout',
    emptyCart: 'Your cart is empty',
    productName: 'Product Name',
    cost: 'Cost',
    price: 'Price',
    stock: 'Stock',
    category: 'Category',
    productImage: 'Product Image',
    noImage: 'No image selected',
    uploadDevice: 'Upload from Device',
    aiGenerator: 'AI Image Generator',
    aspectRatio: 'Aspect Ratio',
    size: 'Size',
    generateAI: 'Generate with Gemini',
    saveProduct: 'Save Product',
    generating: 'Generating with AI...',
    profit: 'Profit',
    items: 'Items',
    date: 'Date',
    branch: 'Branch',
    allBranches: 'All Branches',
    manageBranches: 'Manage Branches',
    addBranch: 'Add Branch',
    branchName: 'Branch Name',
    noSales: 'No sales recorded yet.',
    noProducts: 'No products found. Add some to get started!',
    alertName: 'Please enter product name first.',
    alertSize: 'Image size should be less than 10MB.',
    settings: 'Settings',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    language: 'Language',
    mm: 'Myanmar',
    en: 'English',
    sale: 'Sale',
    noSalesYet: 'No sales yet',
    left: 'left',
    allItemsInStock: 'All items in stock',
    inStock: 'in stock',
    noProductsFound: 'No products found',
    inventory: 'Inventory',
    product: 'Product',
    profitUnit: 'Profit/Unit',
    actions: 'Actions',
    noProductsInventory: 'No products in inventory',
    salesHistory: 'Sales History',
    order: 'Order',
    noSalesHistory: 'No sales history found',
    totalOrders: 'Total Orders',
    viewAll: 'View All',
    restock: 'Restock',
    addStock: 'Add Stock',
    quantityToAdd: 'Quantity to add',
    cancel: 'Cancel',
    confirm: 'Confirm',
    loginTitle: 'Welcome Back',
    enterUsername: 'Enter Username',
    enterPassword: 'Enter Password',
    login: 'Login',
    incorrectCredentials: 'Incorrect username or password. Please try again.',
    logout: 'Logout',
    adminSettings: 'Admin Settings',
    changeUsername: 'Change Username',
    changePassword: 'Change Password',
    newUsername: 'New Username',
    newPassword: 'New Password',
    saveChanges: 'Save Changes',
    credentialsUpdated: 'Credentials updated successfully',
    forgotPassword: 'Forgot Password?',
    recoveryCode: 'Recovery Code',
    resetCredentials: 'Reset Credentials',
    credentialsResetSuccess: 'Credentials reset to admin / admin123 successfully.',
    invalidRecoveryCode: 'Invalid recovery code.',
    backToLogin: 'Back to Login',
    enterRecoveryCode: 'Enter recovery code to reset credentials',
    staffAccounts: 'Staff Accounts',
    addStaff: 'Add Staff',
    staffUsername: 'Staff Username',
    staffPassword: 'Staff Password',
    noStaffAccounts: 'No staff accounts yet.',
    deleteStaff: 'Delete Staff',
    staffAdded: 'Staff account added successfully',
    staffDeleted: 'Staff account deleted',
    role: 'Role',
    admin: 'Admin',
    staff: 'Staff',
    allMonths: 'All Months',
    allDays: 'All Days',
    month: 'Month',
    deleteSale: 'Delete Sale?',
    deleteSaleConfirm: 'Are you sure you want to delete this sale? The items will be returned to stock.',
    deleteProduct: 'Delete Product?',
    deleteProductConfirm: 'Are you sure you want to delete this product? This action cannot be undone.',
    clearCart: 'Clear Cart?',
    clearCartConfirm: 'Are you sure you want to remove all items from the cart?',
    delete: 'Delete',
    receipt: 'Receipt',
    print: 'Print',
    close: 'Close',
    thankYou: 'Thank you for your purchase!',
    orderId: 'Order ID',
    customerCopy: 'Customer Copy',
    shopName: 'Z SHOP POS',
    address: 'Yangon, Myanmar',
    phone: '09-123456789',
    barcode: 'Barcode',
    description: 'Description',
    discount: 'Discount',
    paymentMethod: 'Payment Method',
    customerName: 'Customer Name',
    customerPhone: 'Customer Phone',
    cash: 'Cash',
    kpay: 'KPay',
    wavepay: 'WavePay',
    bankTransfer: 'Bank Transfer',
    transactionDetails: 'Transaction Details',
    kyatsOnly: 'Kyats Only',
    currency: 'MMK',
    phoneLabel: 'PHONE',
    save: 'Save',
    deliveryFee: 'Delivery Fee',
    shopLogo: 'Shop Logo',
    uploadLogo: 'Upload Logo',
    removeLogo: 'Remove Logo',
    allPaymentMethods: 'All Payment Methods',
    filterByCustomer: 'Filter by Customer...',
    showShopName: 'Show Shop Name',
    showThankYou: 'Show Thank You Message',
    saveReceiptSettings: 'Save Receipt Settings',
    exportReports: 'Export Reports',
    exportCSV: 'Export CSV',
    downloading: 'Downloading...',
    expenses: 'Expenses',
    netProfit: 'Net Profit',
    totalExpenses: 'Total Expenses',
    addExpense: 'Add Expense',
    expenseCategory: 'Category',
    expenseAmount: 'Amount',
    expenseDescription: 'Description',
    staffCost: 'Staff Cost',
    rent: 'Rent',
    electricity: 'Electricity',
    generalExpense: 'General Expense',
    noExpenses: 'No expenses recorded yet.',
    deleteExpense: 'Delete Expense?',
    deleteExpenseConfirm: 'Are you sure you want to delete this expense record?',
    deleteBranch: 'Delete Branch?',
    deleteBranchConfirm: 'Are you sure you want to delete this branch? This action cannot be undone.',
    selectBranch: 'Select Branch',
    branchAdded: 'Branch added successfully',
    branchDeleted: 'Branch deleted',
    assignBranch: 'Assign Branch',
    mainBranch: 'Main Branch',
    customers: 'Customers',
    addCustomer: 'Add Customer',
    deleteCustomer: 'Delete Customer?',
    deleteCustomerConfirm: 'Are you sure you want to delete this customer? This action cannot be undone.',
    customerEmail: 'Email Address',
    customerAddress: 'Address',
    purchaseHistory: 'Purchase History',
    totalSpent: 'Total Spent',
    noCustomers: 'No customers found.',
    selectCustomer: 'Select Customer',
    walkInCustomer: 'Walk-in Customer'
  },
  mm: {
    dashboard: 'ပင်မစာမျက်နှာ',
    products: 'ပစ္စည်းများ',
    pos: 'အရောင်းဆိုင်',
    history: 'အရောင်းမှတ်တမ်း',
    totalSales: 'စုစုပေါင်းရောင်းရငွေ',
    totalCost: 'စုစုပေါင်းရင်းနှီးငွေ',
    totalProfit: 'စုစုပေါင်းအမြတ်ငွေ',
    inventoryValue: 'ပစ္စည်းတန်ဖိုးစုစုပေါင်း',
    recentSales: 'လတ်တလောအရောင်းများ',
    lowStock: 'လက်ကျန်နည်းနေသောပစ္စည်းများ',
    addProduct: 'ပစ္စည်းအသစ်ထည့်ရန်',
    searchProducts: 'ပစ္စည်းရှာဖွေရန်...',
    allCategories: 'အမျိုးအစားအားလုံး',
    addToCart: 'ခြင်းတောင်းထဲထည့်ရန်',
    outOfStock: 'ပစ္စည်းပြတ်နေသည်',
    cart: 'ဈေးဝယ်ခြင်းတောင်း',
    clearAll: 'အားလုံးဖျက်ရန်',
    subtotal: 'စုစုပေါင်း',
    tax: 'အခွန်',
    total: 'စုစုပေါင်းကျသင့်ငွေ',
    checkout: 'ငွေရှင်းမည်',
    emptyCart: 'ခြင်းတောင်းထဲတွင် ဘာမှမရှိသေးပါ',
    productName: 'ပစ္စည်းအမည်',
    cost: 'မူလတန်ဖိုး',
    price: 'ရောင်းဈေး',
    stock: 'လက်ကျန်',
    category: 'အမျိုးအစား',
    productImage: 'ပစ္စည်းပုံ',
    noImage: 'ပုံမရွေးရသေးပါ',
    uploadDevice: 'စက်ထဲမှပုံတင်ရန်',
    aiGenerator: 'AI ဖြင့်ပုံထုတ်ရန်',
    aspectRatio: 'ပုံချိုး',
    size: 'အရွယ်အစား',
    generateAI: 'Gemini ဖြင့်ပုံထုတ်မည်',
    saveProduct: 'ပစ္စည်းသိမ်းဆည်းမည်',
    generating: 'AI ဖြင့်ပုံထုတ်နေသည်...',
    profit: 'အမြတ်',
    items: 'ခုရေ',
    date: 'နေ့စွဲ',
    branch: 'ဆိုင်ခွဲ',
    allBranches: 'ဆိုင်ခွဲအားလုံး',
    manageBranches: 'ဆိုင်ခွဲများ စီမံရန်',
    addBranch: 'ဆိုင်ခွဲအသစ်ထည့်ရန်',
    branchName: 'ဆိုင်ခွဲအမည်',
    noSales: 'အရောင်းမှတ်တမ်း မရှိသေးပါ။',
    noProducts: 'ပစ္စည်းများ မရှိသေးပါ။ ပစ္စည်းအသစ်ထည့်ပါ။',
    alertName: 'ပစ္စည်းအမည် အရင်ထည့်ပေးပါ။',
    alertSize: 'ပုံအရွယ်အစား ၁၀MB ထက်မကျော်ရပါ။',
    settings: 'ဆက်တင်များ',
    darkMode: 'အမှောင်မုဒ်',
    lightMode: 'အလင်းမုဒ်',
    language: 'ဘာသာစကား',
    mm: 'မြန်မာ',
    en: 'အင်္ဂလိပ်',
    sale: 'အရောင်း',
    noSalesYet: 'အရောင်းမှတ်တမ်း မရှိသေးပါ',
    left: 'ခုကျန်',
    allItemsInStock: 'ပစ္စည်းအားလုံး လက်ကျန်ရှိပါသည်',
    inStock: 'ခုရှိသည်',
    noProductsFound: 'ပစ္စည်းရှာမတွေ့ပါ',
    inventory: 'ပစ္စည်းစာရင်း',
    product: 'ပစ္စည်း',
    profitUnit: 'အမြတ်/ခု',
    actions: 'လုပ်ဆောင်ချက်များ',
    noProductsInventory: 'ပစ္စည်းစာရင်းထဲတွင် ဘာမှမရှိသေးပါ',
    salesHistory: 'အရောင်းမှတ်တမ်းများ',
    order: 'အော်ဒါ',
    noSalesHistory: 'အရောင်းမှတ်တမ်း ရှာမတွေ့ပါ',
    totalOrders: 'စုစုပေါင်းအော်ဒါများ',
    viewAll: 'အားလုံးကြည့်ရန်',
    restock: 'အသစ်ဖြည့်မည်',
    addStock: 'ပစ္စည်းဖြည့်ရန်',
    quantityToAdd: 'ထည့်မည့်အရေအတွက်',
    cancel: 'ပယ်ဖျက်မည်',
    confirm: 'အတည်ပြုမည်',
    loginTitle: 'ပြန်လည်ကြိုဆိုပါတယ်',
    enterUsername: 'အသုံးပြုသူအမည်ထည့်ပါ',
    enterPassword: 'စကားဝှက်ထည့်ပါ',
    login: 'ဝင်မည်',
    incorrectCredentials: 'အသုံးပြုသူအမည် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်။ ပြန်လည်ကြိုးစားကြည့်ပါ။',
    logout: 'အကောင့်ထွက်မည်',
    adminSettings: 'စီမံခန့်ခွဲသူ ဆက်တင်များ',
    changeUsername: 'အသုံးပြုသူအမည်ပြောင်းရန်',
    changePassword: 'စကားဝှက်ပြောင်းရန်',
    newUsername: 'အသုံးပြုသူအမည်သစ်',
    newPassword: 'စကားဝှက်သစ်',
    saveChanges: 'ပြောင်းလဲမှုများကိုသိမ်းဆည်းမည်',
    credentialsUpdated: 'အသုံးပြုသူအမည်နှင့်စကားဝှက်ကို အောင်မြင်စွာပြောင်းလဲပြီးပါပြီ',
    forgotPassword: 'စကားဝှက်မေ့နေပါသလား?',
    recoveryCode: 'ပြန်လည်ရယူရန် ကုဒ်',
    resetCredentials: 'အကောင့်အချက်အလက်များကို မူလအတိုင်းပြန်ထားမည်',
    credentialsResetSuccess: 'အကောင့်အချက်အလက်များကို admin / admin123 သို့ အောင်မြင်စွာ ပြန်လည်သတ်မှတ်ပြီးပါပြီ။',
    invalidRecoveryCode: 'ပြန်လည်ရယူရန် ကုဒ် မှားယွင်းနေပါသည်။',
    backToLogin: 'နောက်သို့',
    enterRecoveryCode: 'အကောင့်အချက်အလက်များ ပြန်လည်ရယူရန် ကုဒ်ထည့်ပါ',
    staffAccounts: 'ဝန်ထမ်း အကောင့်များ',
    addStaff: 'ဝန်ထမ်းအသစ်ထည့်မည်',
    staffUsername: 'ဝန်ထမ်း အမည်',
    staffPassword: 'ဝန်ထမ်း စကားဝှက်',
    noStaffAccounts: 'ဝန်ထမ်း အကောင့်များ မရှိသေးပါ',
    deleteStaff: 'ဖျက်မည်',
    staffAdded: 'ဝန်ထမ်းအကောင့် အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ',
    staffDeleted: 'ဝန်ထမ်းအကောင့် ဖျက်လိုက်ပါပြီ',
    role: 'ရာထူး',
    admin: 'စီမံခန့်ခွဲသူ',
    staff: 'ဝန်ထမ်း',
    allMonths: 'လအားလုံး',
    allDays: 'နေ့ရက်အားလုံး',
    month: 'လ',
    deleteSale: 'အရောင်းမှတ်တမ်း ဖျက်မည်',
    deleteSaleConfirm: 'ဒီအရောင်းမှတ်တမ်းကို ဖျက်မှာ သေချာပြီလား? ရောင်းရပစ္စည်းအရေအတွက်တွေ စာရင်းထဲ ပြန်ဝင်သွားပါမယ်။',
    deleteProduct: 'ပစ္စည်း ဖျက်မည်',
    deleteProductConfirm: 'ဒီပစ္စည်းကို ဖျက်မှာ သေချာပြီလား? ဖျက်ပြီးပါက ပြန်ယူ၍မရနိုင်ပါ။',
    clearCart: 'ခြင်းတောင်း ရှင်းမည်',
    clearCartConfirm: 'ခြင်းတောင်းထဲရှိ ပစ္စည်းအားလုံးကို ဖယ်ရှားမှာ သေချာပြီလား?',
    delete: 'ဖျက်မည်',
    receipt: 'ဘောက်ချာ',
    print: 'ပရင့်ထုတ်မည်',
    close: 'ပိတ်မည်',
    thankYou: 'ဝယ်ယူအားပေးမှုကို ကျေးဇူးတင်ပါသည်!',
    orderId: 'အော်ဒါနံပါတ်',
    customerCopy: 'ဝယ်ယူသူမိတ္တူ',
    shopName: 'Z SHOP POS',
    address: 'ရန်ကုန်မြို့၊ မြန်မာနိုင်ငံ',
    phone: '၀၉-၁၂၃၄၅၆၇၈၉',
    barcode: 'ဘားကုဒ်',
    description: 'အကြောင်းအရာ',
    discount: 'လျှော့စျေး',
    paymentMethod: 'ငွေပေးချေမှုပုံစံ',
    customerName: 'ဝယ်သူအမည်',
    customerPhone: 'ဝယ်သူဖုန်းနံပါတ်',
    cash: 'ငွေသား',
    kpay: 'KPay',
    wavepay: 'WavePay',
    bankTransfer: 'ဘဏ်လွှဲ',
    transactionDetails: 'ငွေပေးချေမှု အသေးစိတ်',
    kyatsOnly: 'ကျပ်တိတိ',
    currency: 'ကျပ်',
    phoneLabel: 'ဖုန်း',
    save: 'သိမ်းမည်',
    deliveryFee: 'ပို့ဆောင်ခ',
    shopLogo: 'ဆိုင်တံဆိပ် (Logo)',
    uploadLogo: 'Logo တင်မည်',
    removeLogo: 'Logo ဖယ်ရှားမည်',
    allPaymentMethods: 'ငွေပေးချေမှု အားလုံး',
    filterByCustomer: 'ဝယ်သူအမည်ဖြင့် ရှာရန်...',
    showShopName: 'ဆိုင်အမည် ပြသမည်',
    showThankYou: 'ကျေးဇူးတင်လွှာ ပြသမည်',
    saveReceiptSettings: 'ဘောက်ချာ ဆက်တင်များ သိမ်းဆည်းမည်',
    exportReports: 'အစီရင်ခံစာ ထုတ်ယူခြင်း',
    exportCSV: 'CSV ထုတ်ယူမည်',
    downloading: 'ဒေါင်းလုဒ်ဆွဲနေသည်...',
    expenses: 'အသုံးစရိတ်များ',
    netProfit: 'အသားတင်အမြတ်',
    totalExpenses: 'စုစုပေါင်းအသုံးစရိတ်',
    addExpense: 'အသုံးစရိတ်ထည့်ရန်',
    expenseCategory: 'အမျိုးအစား',
    expenseAmount: 'ပမာဏ',
    expenseDescription: 'အကြောင်းအရာ',
    staffCost: 'ဝန်ထမ်းစရိတ်',
    rent: 'ဆိုင်လခ',
    electricity: 'မီးခ',
    generalExpense: 'အထွေထွေစရိတ်',
    noExpenses: 'အသုံးစရိတ်မှတ်တမ်း မရှိသေးပါ။',
    deleteExpense: 'အသုံးစရိတ်ဖျက်မည်',
    deleteExpenseConfirm: 'ဒီအသုံးစရိတ်မှတ်တမ်းကို ဖျက်မှာ သေချာပြီလား?',
    deleteBranch: 'ဆိုင်ခွဲဖျက်မည်',
    deleteBranchConfirm: 'ဒီဆိုင်ခွဲကို ဖျက်မှာ သေချာပြီလား? ဖျက်ပြီးပါက ပြန်ယူ၍မရနိုင်ပါ။',
    selectBranch: 'ဆိုင်ခွဲရွေးချယ်ရန်',
    branchAdded: 'ဆိုင်ခွဲအသစ်ထည့်ပြီးပါပြီ',
    branchDeleted: 'ဆိုင်ခွဲကို ဖျက်လိုက်ပါပြီ',
    assignBranch: 'ဆိုင်ခွဲသတ်မှတ်ရန်',
    mainBranch: 'ပင်မဆိုင်ခွဲ',
    customers: 'ဝယ်သူများ',
    addCustomer: 'ဝယ်သူအသစ်ထည့်ရန်',
    deleteCustomer: 'ဝယ်သူဖျက်မည်',
    deleteCustomerConfirm: 'ဒီဝယ်သူကို ဖျက်မှာ သေချာပြီလား? ဖျက်ပြီးပါက ပြန်ယူ၍မရနိုင်ပါ။',
    customerEmail: 'အီးမေးလ်',
    customerAddress: 'လိပ်စာ',
    purchaseHistory: 'ဝယ်ယူမှုမှတ်တမ်း',
    totalSpent: 'စုစုပေါင်းသုံးစွဲငွေ',
    noCustomers: 'ဝယ်သူမှတ်တမ်း မရှိသေးပါ။',
    selectCustomer: 'ဝယ်သူရွေးချယ်ရန်',
    walkInCustomer: 'အပြင်ဝယ်သူ'
  }
};

// --- Components ---

const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

const exportToCSV = (data: Sale[], t: any) => {
  if (data.length === 0) return;

  const headers = [
    t.orderId,
    t.date,
    t.customerName,
    t.customerPhone,
    t.items,
    t.totalAmount,
    t.totalCost,
    t.profit,
    t.discount,
    t.deliveryFee,
    t.paymentMethod
  ];

  const rows = data.map(sale => [
    sale.id,
    new Date(sale.timestamp).toLocaleString(),
    sale.customerName || '-',
    sale.customerPhone || '-',
    sale.items.map(item => `${item.name} (${item.quantity})`).join('; '),
    sale.totalAmount,
    sale.totalCost,
    sale.profit,
    sale.discount || 0,
    sale.deliveryFee || 0,
    sale.paymentMethod || '-'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportProductsToCSV = (data: Product[], t: any) => {
  if (data.length === 0) return;

  const headers = [
    t.productName,
    t.category,
    t.cost,
    t.price,
    t.stock,
    t.profit,
    t.barcode,
    t.description
  ];

  const rows = data.map(p => [
    p.name,
    p.category,
    p.cost,
    p.price,
    p.stock,
    p.price - p.cost,
    p.barcode || '-',
    p.description || '-'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportExpensesToCSV = (data: Expense[], t: any, branches: Branch[]) => {
  if (data.length === 0) return;

  const headers = [
    t.date,
    t.expenseCategory,
    t.expenseDescription,
    t.expenseAmount,
    t.branch
  ];

  const rows = data.map(e => [
    new Date(e.timestamp).toLocaleString(),
    e.category === 'Staff' ? t.staffCost : 
    e.category === 'Rent' ? t.rent : 
    e.category === 'Electricity' ? t.electricity : t.generalExpense,
    e.description,
    e.amount,
    e.branchId === 'main' ? t.mainBranch : (branches.find(b => b.id === e.branchId)?.name || 'Unknown Branch')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `expenses_report_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem('pos_auth');
    return saved ? JSON.parse(saved) : false;
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [recoveryError, setRecoveryError] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const [adminCredentials, setAdminCredentials] = useState({ username: 'admin', password: 'admin123' });
  const [receiptSettings, setReceiptSettings] = useState({ 
    shopName: 'Z SHOP POS', 
    address: 'Yangon, Myanmar', 
    phone: '09-123456789',
    logo: '',
    showShopName: true,
    showThankYou: true
  });
  const [currentUser, setCurrentUser] = useState<{ username: string, role: 'admin' | 'staff', branchId?: string } | null>(() => {
    const saved = localStorage.getItem('pos_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [staffAccounts, setStaffAccounts] = useState<any[]>([]);
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [staffActionSuccess, setStaffActionSuccess] = useState('');
  const [newStaffBranchId, setNewStaffBranchId] = useState('');

  const [newBranchName, setNewBranchName] = useState('');
  const [branchActionSuccess, setBranchActionSuccess] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'pos' | 'history' | 'settings' | 'expenses' | 'customers'>('pos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('pos_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [language, setLanguage] = useState<'en' | 'mm'>(() => {
    const saved = localStorage.getItem('pos_language');
    return (saved as 'en' | 'mm') || 'mm';
  });

  const t = TRANSLATIONS[language];

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    setIsAddCustomerOpen(false);
    try {
      const newCustomerRef = doc(collection(db, 'customers'));
      await setDoc(newCustomerRef, {
        ...customerData,
        createdAt: Date.now()
      });
    } catch (error) {
      console.error("Error adding customer: ", error);
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (error) {
      console.error("Error deleting customer: ", error);
    }
  };

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'timestamp'>) => {
    setIsAddExpenseOpen(false);
    try {
      const newExpenseRef = doc(collection(db, 'expenses'));
      await setDoc(newExpenseRef, {
        ...expenseData,
        timestamp: Date.now(),
        branchId: expenseData.branchId || (selectedBranchId === 'all' ? 'main' : selectedBranchId)
      });
    } catch (error) {
      console.error("Error adding expense: ", error);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (error) {
      console.error("Error deleting expense: ", error);
    }
  };
  
  // Cart state
  const [cart, setCart] = useState<{ [id: string]: { qty: number, discountType?: 'percentage' | 'fixed', discountValue?: number } }>({});
  const [checkoutDiscountType, setCheckoutDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [checkoutDiscount, setCheckoutDiscount] = useState<number>(0);
  const [checkoutDeliveryFee, setCheckoutDeliveryFee] = useState<number>(0);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<string>('Cash');
  const [checkoutPaidAmount, setCheckoutPaidAmount] = useState<number>(0);
  const [checkoutCustomerId, setCheckoutCustomerId] = useState<string>('');
  const [checkoutCustomerName, setCheckoutCustomerName] = useState<string>('');
  const [checkoutCustomerPhone, setCheckoutCustomerPhone] = useState<string>('');
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [isHeldCartsOpen, setIsHeldCartsOpen] = useState(false);
  const [isDebtPaymentOpen, setIsDebtPaymentOpen] = useState(false);
  const [selectedCustomerForDebt, setSelectedCustomerForDebt] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('');
  const [filterCustomerName, setFilterCustomerName] = useState<string>('');
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);
  const [isClearCartConfirmOpen, setIsClearCartConfirmOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  
  // Modal states
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockProductId, setRestockProductId] = useState<string | null>(null);
  const [restockQuantity, setRestockQuantity] = useState<string>('');

  
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  // Sync data with Firebase
  useFirebaseSync(setProducts, setSales, setCategories, setStaffAccounts, setAdminCredentials, setExpenses, setBranches, setCustomers);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.receiptSettings) setReceiptSettings(data.receiptSettings);
      }
    });
    return () => unsubSettings();
  }, []);

  // Persist data
  useEffect(() => {
    localStorage.setItem('pos_dark_mode', JSON.stringify(darkMode));
    console.log('Dark mode changed:', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('pos_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('pos_auth', JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    if (currentUser?.role === 'staff' && currentUser.branchId) {
      setSelectedBranchId(currentUser.branchId);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pos_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('pos_current_user');
    }
  }, [currentUser]);

  // --- Calculations ---

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => selectedBranchId === 'all' || e.branchId === selectedBranchId);
  }, [expenses, selectedBranchId]);

  const stats = useMemo(() => {
    const branchSales = selectedBranchId === 'all' ? sales : sales.filter(s => s.branchId === selectedBranchId);
    const branchProducts = selectedBranchId === 'all' ? products : products.filter(p => p.branchId === selectedBranchId);
    const branchExpenses = filteredExpenses;

    const totalSales = branchSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalCost = branchSales.reduce((sum, s) => sum + s.totalCost, 0);
    const totalProfit = totalSales - totalCost;
    const inventoryValue = branchProducts.reduce((sum, p) => sum + (p.cost * p.stock), 0);
    const totalExpenses = branchExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalProfit - totalExpenses;
    
    return { totalSales, totalCost, totalProfit, inventoryValue, totalExpenses, netProfit };
  }, [sales, products, filteredExpenses, selectedBranchId]);

  const cartItems = useMemo(() => {
    return Object.entries(cart).map(([id, data]) => {
      const product = products.find(p => p.id === id);
      return { 
        product, 
        qty: data.qty,
        discountType: data.discountType || 'fixed',
        discountValue: data.discountValue || 0
      };
    }).filter(item => item.product !== undefined) as { product: Product, qty: number, discountType: 'percentage' | 'fixed', discountValue: number }[];
  }, [cart, products]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      let itemTotal = item.product.price * item.qty;
      if (item.discountValue) {
        if (item.discountType === 'percentage') {
          itemTotal -= itemTotal * (item.discountValue / 100);
        } else {
          itemTotal -= item.discountValue;
        }
      }
      return sum + Math.max(0, itemTotal);
    }, 0);
  }, [cartItems]);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // Branch filter
      if (selectedBranchId !== 'all' && sale.branchId !== selectedBranchId) return false;

      // Date filter
      let matchesDate = true;
      if (selectedDate) {
        const date = new Date(sale.timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        matchesDate = dateStr === selectedDate;
      }

      // Payment Method filter
      let matchesPayment = true;
      if (filterPaymentMethod) {
        matchesPayment = sale.paymentMethod === filterPaymentMethod;
      }

      // Customer Name filter
      let matchesCustomer = true;
      if (filterCustomerName) {
        matchesCustomer = sale.customerName?.toLowerCase().includes(filterCustomerName.toLowerCase()) || false;
      }

      return matchesDate && matchesPayment && matchesCustomer;
    });
  }, [sales, selectedDate, filterPaymentMethod, filterCustomerName, selectedBranchId]);

  const historyStats = useMemo(() => {
    const totalSales = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalCost = filteredSales.reduce((sum, s) => sum + s.totalCost, 0);
    const totalProfit = totalSales - totalCost;
    return { totalSales, totalProfit };
  }, [filteredSales]);

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    sales.forEach(sale => {
      const date = new Date(sale.timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dates.add(`${year}-${month}-${day}`);
    });
    return Array.from(dates).sort().reverse();
  }, [sales]);

  // --- Handlers ---

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    const currentQty = cart[productId]?.qty || 0;
    if (!product || product.stock <= currentQty) return;
    
    setCart(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || { discountType: 'fixed', discountValue: 0 }),
        qty: currentQty + 1
      }
    }));

    // Trigger a small haptic-like feedback or animation
    if (window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[productId] && newCart[productId].qty > 1) {
        newCart[productId] = { ...newCart[productId], qty: newCart[productId].qty - 1 };
      } else {
        delete newCart[productId];
      }
      return newCart;
    });
  };

  const updateCartItemDiscount = (productId: string, discountType: 'percentage' | 'fixed', discountValue: number) => {
    setCart(prev => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          discountType,
          discountValue
        }
      };
    });
  };

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const calculateTotalAmount = () => {
    let discountAmount = 0;
    if (checkoutDiscountType === 'percentage') {
      discountAmount = cartTotal * (checkoutDiscount / 100);
    } else {
      discountAmount = checkoutDiscount;
    }
    return Math.max(0, cartTotal - discountAmount) + checkoutDeliveryFee;
  };

  const printCart = () => {
    if (cartItems.length === 0) return;

    const totalAmount = calculateTotalAmount();
    const totalCost = cartItems.reduce((sum, item) => sum + (item.product.cost * item.qty), 0);
    const profit = totalAmount - totalCost;

    const draftSaleId = "DRAFT-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const draftSale: Sale = {
      id: draftSaleId,
      timestamp: Date.now(),
      items: cartItems.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.qty,
        price: item.product.price,
        cost: item.product.cost,
        discountType: item.discountType,
        discountValue: item.discountValue
      })),
      totalAmount,
      totalCost,
      profit,
      discountType: checkoutDiscountType,
      discount: checkoutDiscount,
      deliveryFee: checkoutDeliveryFee,
      paymentMethod: checkoutPaymentMethod,
      paidAmount: checkoutPaymentMethod === 'Credit' ? checkoutPaidAmount : totalAmount,
      paymentStatus: checkoutPaymentMethod === 'Credit' ? 'credit' : 'paid',
      customerId: checkoutCustomerId || undefined,
      customerName: checkoutCustomerName,
      customerPhone: checkoutCustomerPhone,
      branchId: selectedBranchId === 'all' ? 'main' : selectedBranchId
    };

    setLastSale(draftSale);
    setIsReceiptOpen(true);
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isCheckingOut) {
      timeout = setTimeout(() => {
        setIsCheckingOut(false);
        setCheckoutError("Checkout timed out. Please try again.");
      }, 15000); // 15 seconds safety timeout
    }
    return () => clearTimeout(timeout);
  }, [isCheckingOut]);

  const checkout = async () => {
    if (cartItems.length === 0 || isCheckingOut) return;
    setCheckoutError(null);

    if (checkoutPaymentMethod === 'Credit' && !checkoutCustomerId) {
      setCheckoutError("Please select a customer for credit payments.");
      return;
    }

    setIsCheckingOut(true);
    try {
      const totalAmount = calculateTotalAmount();
      const totalCost = cartItems.reduce((sum, item) => sum + (item.product.cost * item.qty), 0);
      const profit = totalAmount - totalCost;

      const finalPaidAmount = checkoutPaymentMethod === 'Credit' ? checkoutPaidAmount : totalAmount;
      const debtIncurred = totalAmount - finalPaidAmount;

      const newSaleId = Math.random().toString(36).substr(2, 9);
      const newSale: Sale = {
        id: newSaleId,
        timestamp: Date.now(),
        items: cartItems.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.qty,
          price: item.product.price,
          cost: item.product.cost,
          discountType: item.discountType,
          discountValue: item.discountValue
        })),
        totalAmount,
        totalCost,
        profit,
        discountType: checkoutDiscountType,
        discount: checkoutDiscount,
        deliveryFee: checkoutDeliveryFee,
        paymentMethod: checkoutPaymentMethod,
        paidAmount: finalPaidAmount,
        paymentStatus: checkoutPaymentMethod === 'Credit' ? 'credit' : 'paid',
        customerId: checkoutCustomerId || "",
        customerName: checkoutCustomerName || "",
        customerPhone: checkoutCustomerPhone || "",
        branchId: (selectedBranchId === 'all' ? 'main' : selectedBranchId) || "main"
      };

      const batch = writeBatch(db);
      
      // Add sale
      batch.set(doc(db, 'sales', newSaleId), newSale);
      
      // Update stock
      cartItems.forEach(item => {
        const productRef = doc(db, 'products', item.product.id);
        batch.update(productRef, {
          stock: increment(-item.qty)
        });
      });

      // Update customer debt if applicable
      if (debtIncurred > 0 && checkoutCustomerId && customers) {
        const customer = customers.find(c => c.id === checkoutCustomerId);
        if (customer) {
          const customerRef = doc(db, 'customers', checkoutCustomerId);
          batch.update(customerRef, {
            debt: increment(debtIncurred)
          });
        }
      }

      await batch.commit();
      
      // Clear cart and show receipt only after successful save
      setLastSale(newSale);
      setCart({});
      setCheckoutDiscount(0);
      setCheckoutDeliveryFee(0);
      setCheckoutPaymentMethod('Cash');
      setCheckoutPaidAmount(0);
      setCheckoutCustomerId('');
      setCheckoutCustomerName('');
      setCheckoutCustomerPhone('');
      setIsReceiptOpen(true);
      setIsCheckingOut(false);
    } catch (error: any) {
      console.error("Detailed Checkout Error:", error);
      let errorMessage = "An error occurred during checkout.";
      if (error?.code === 'permission-denied') {
        errorMessage = "Permission denied. Please check your Firestore security rules.";
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      setCheckoutError(errorMessage);
      setIsCheckingOut(false);
    }
  };

  const holdCart = () => {
    if (cartItems.length === 0) return;
    
    const newHeldCart: HeldCart = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      items: cartItems.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.qty,
        price: item.product.price,
        cost: item.product.cost,
        discountType: item.discountType,
        discountValue: item.discountValue
      })),
      discountType: checkoutDiscountType,
      discount: checkoutDiscount,
      deliveryFee: checkoutDeliveryFee,
      customerId: checkoutCustomerId || undefined,
      customerName: checkoutCustomerName,
      customerPhone: checkoutCustomerPhone,
      branchId: selectedBranchId === 'all' ? 'main' : selectedBranchId
    };

    setHeldCarts(prev => [...prev, newHeldCart]);
    setCart({});
    setCheckoutDiscount(0);
    setCheckoutDeliveryFee(0);
    setCheckoutPaymentMethod('Cash');
    setCheckoutPaidAmount(0);
    setCheckoutCustomerId('');
    setCheckoutCustomerName('');
    setCheckoutCustomerPhone('');
  };

  const retrieveCart = (heldCart: HeldCart) => {
    const newCart: { [id: string]: { qty: number, discountType?: 'percentage' | 'fixed', discountValue?: number } } = {};
    heldCart.items.forEach(item => {
      newCart[item.productId] = {
        qty: item.quantity,
        discountType: item.discountType,
        discountValue: item.discountValue
      };
    });
    setCart(newCart);
    setCheckoutDiscountType(heldCart.discountType || 'fixed');
    setCheckoutDiscount(heldCart.discount || 0);
    setCheckoutDeliveryFee(heldCart.deliveryFee || 0);
    setCheckoutCustomerId(heldCart.customerId || '');
    setCheckoutCustomerName(heldCart.customerName || '');
    setCheckoutCustomerPhone(heldCart.customerPhone || '');
    setHeldCarts(prev => prev.filter(c => c.id !== heldCart.id));
    setIsHeldCartsOpen(false);
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    const newProductId = Math.random().toString(36).substr(2, 9);
    const newProduct: Product = {
      ...product,
      id: newProductId,
      lastRestocked: new Date().toISOString(),
      branchId: product.branchId || (selectedBranchId === 'all' ? 'main' : selectedBranchId)
    };
    // Close modal immediately for better UX
    setIsAddProductOpen(false);
    try {
      await setDoc(doc(db, 'products', newProductId), newProduct);
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Error adding product. Please try again.");
      // Re-open modal if failed? Maybe just a toast is better, but let's keep it simple.
    }
  };

  const updateProduct = async (product: Omit<Product, 'id'>) => {
    if (!editingProduct) return;
    const productId = editingProduct.id;
    const oldStock = editingProduct.stock;
    // Close modal immediately
    setEditingProduct(null);
    try {
      const updateData: Partial<Product> = { ...product };
      // If stock increased, update lastRestocked
      if (product.stock > oldStock) {
        updateData.lastRestocked = new Date().toISOString();
      }
      await updateDoc(doc(db, 'products', productId), updateData);
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Error updating product. Please try again.");
    }
  };

  // --- Render Helpers ---

  const normalizeText = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  const searchTerms = searchQuery.trim().toLowerCase().split(/\s+/).map(normalizeText).filter(t => t.length > 0);

  const filteredProducts = products.filter(p => {
    if (selectedBranchId !== 'all' && p.branchId !== selectedBranchId) return false;
    const searchableText = normalizeText(
      `${p.name} ${p.category} ${p.ram || ''} ${p.storage || ''} ${p.color || ''} ${p.price} ${p.barcode || ''} ${p.description || ''}`
    );

    return searchTerms.every(term => searchableText.includes(term));
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#0f172a] overflow-hidden relative perspective-1000">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-purple-500/20 blur-[120px] animate-pulse" />
          <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 blur-[100px] animate-pulse delay-1000" />
          <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[100px] animate-pulse delay-2000" />
        </div>

        {/* Floating Small 3D Cubes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none perspective-1000 hidden lg:block">
          {/* Cube 1 - Medium (Purple/Indigo) */}
          <motion.div 
            animate={{ rotateX: 360, rotateY: 360, y: [0, -30, 0] }}
            transition={{ 
              rotateX: { duration: 8, repeat: Infinity, ease: "linear" },
              rotateY: { duration: 10, repeat: Infinity, ease: "linear" },
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute right-[15%] top-[20%] w-24 h-24 [transform-style:preserve-3d]"
          >
            <div className="absolute inset-0 bg-purple-500/40 backdrop-blur-sm border border-white/20 [transform:translateZ(48px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={40} />
            </div>
            <div className="absolute inset-0 bg-indigo-500/40 backdrop-blur-sm border border-white/20 [transform:rotateY(180deg)_translateZ(48px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={40} />
            </div>
            <div className="absolute inset-0 bg-violet-500/40 backdrop-blur-sm border border-white/20 [transform:rotateY(90deg)_translateZ(48px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={40} />
            </div>
            <div className="absolute inset-0 bg-fuchsia-500/40 backdrop-blur-sm border border-white/20 [transform:rotateY(-90deg)_translateZ(48px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={40} />
            </div>
            <div className="absolute inset-0 bg-purple-400/40 backdrop-blur-sm border border-white/20 [transform:rotateX(90deg)_translateZ(48px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={40} />
            </div>
            <div className="absolute inset-0 bg-indigo-400/40 backdrop-blur-sm border border-white/20 [transform:rotateX(-90deg)_translateZ(48px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={40} />
            </div>
          </motion.div>

          {/* Cube 2 - Small (Blue/Cyan) */}
          <motion.div 
            animate={{ rotateX: -360, rotateY: 360, y: [0, 40, 0] }}
            transition={{ 
              rotateX: { duration: 12, repeat: Infinity, ease: "linear" },
              rotateY: { duration: 15, repeat: Infinity, ease: "linear" },
              y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }
            }}
            className="absolute right-[25%] top-[45%] w-16 h-16 [transform-style:preserve-3d]"
          >
            <div className="absolute inset-0 bg-blue-500/40 backdrop-blur-sm border border-white/20 [transform:translateZ(32px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={24} />
            </div>
            <div className="absolute inset-0 bg-cyan-500/40 backdrop-blur-sm border border-white/20 [transform:rotateY(180deg)_translateZ(32px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={24} />
            </div>
            <div className="absolute inset-0 bg-sky-500/40 backdrop-blur-sm border border-white/20 [transform:rotateY(90deg)_translateZ(32px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={24} />
            </div>
            <div className="absolute inset-0 bg-teal-500/40 backdrop-blur-sm border border-white/20 [transform:rotateY(-90deg)_translateZ(32px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={24} />
            </div>
            <div className="absolute inset-0 bg-blue-400/40 backdrop-blur-sm border border-white/20 [transform:rotateX(90deg)_translateZ(32px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={24} />
            </div>
            <div className="absolute inset-0 bg-cyan-400/40 backdrop-blur-sm border border-white/20 [transform:rotateX(-90deg)_translateZ(32px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={24} />
            </div>
          </motion.div>

          {/* Cube 3 - Tiny (Pink/Rose) */}
          <motion.div 
            animate={{ rotateX: 360, rotateY: -360, y: [0, -20, 0] }}
            transition={{ 
              rotateX: { duration: 6, repeat: Infinity, ease: "linear" },
              rotateY: { duration: 8, repeat: Infinity, ease: "linear" },
              y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
            }}
            className="absolute right-[8%] top-[60%] w-12 h-12 [transform-style:preserve-3d]"
          >
            <div className="absolute inset-0 bg-pink-500/40 backdrop-blur-sm border border-white/20 [transform:translateZ(24px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={16} />
            </div>
            <div className="absolute inset-0 bg-rose-500/40 backdrop-blur-sm border border-white/20 [transform:rotateY(180deg)_translateZ(24px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={16} />
            </div>
            <div className="absolute inset-0 bg-red-500/40 backdrop-blur-sm border border-white/20 [transform:rotateY(90deg)_translateZ(24px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={16} />
            </div>
            <div className="absolute inset-0 bg-orange-500/40 backdrop-blur-sm border border-white/20 [transform:rotateY(-90deg)_translateZ(24px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={16} />
            </div>
            <div className="absolute inset-0 bg-pink-400/40 backdrop-blur-sm border border-white/20 [transform:rotateX(90deg)_translateZ(24px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={16} />
            </div>
            <div className="absolute inset-0 bg-rose-400/40 backdrop-blur-sm border border-white/20 [transform:rotateX(-90deg)_translateZ(24px)] flex items-center justify-center text-white/50">
              <ShoppingBag size={16} />
            </div>
          </motion.div>
        </div>

        {/* Moving Shopping Cart */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div
            animate={{ x: ['-20vw', '120vw'] }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-10 left-0 text-white/10"
          >
            <ShoppingCart size={160} />
          </motion.div>
        </div>

        {/* 3D Login Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-3xl blur-xl transform -rotate-6 scale-105 opacity-50" />
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            
            {/* Glossy reflection effect */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            <div className="flex justify-center mb-8 relative">
              <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <ShoppingCart size={32} className="drop-shadow-md" />
              </div>
              <div className="absolute -bottom-2 w-16 h-4 bg-black/30 blur-md rounded-full" />
            </div>

            <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-tight">
              {isForgotPassword ? t.forgotPassword : "Welcome Back"}
            </h2>
            <p className="text-center text-slate-400 mb-8 text-sm">
              {isForgotPassword ? "Enter your recovery code to reset" : "Sign in to access your POS dashboard"}
            </p>
            
            {isForgotPassword ? (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (recoveryCodeInput === 'pos-reset-123') {
                  const defaultCredentials = { username: 'admin', password: 'admin123' };
                  try {
                    await setDoc(doc(db, 'settings', 'general'), { adminCredentials: defaultCredentials }, { merge: true });
                    setRecoverySuccess(true);
                    setRecoveryError(false);
                    setTimeout(() => {
                      setRecoverySuccess(false);
                      setIsForgotPassword(false);
                      setRecoveryCodeInput('');
                    }, 3000);
                  } catch (error) {
                    console.error("Error resetting credentials:", error);
                  }
                } else {
                  setRecoveryError(true);
                }
              }} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider ml-1">
                    {t.enterRecoveryCode}
                  </label>
                  <div className="relative group/input">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-20 group-hover/input:opacity-40 transition-opacity" />
                    <input
                      type="text"
                      value={recoveryCodeInput}
                      onChange={(e) => setRecoveryCodeInput(e.target.value)}
                      className="relative w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white placeholder:text-slate-600 outline-none"
                      autoFocus
                    />
                  </div>
                  {recoveryError && (
                    <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-red-400 flex items-center gap-1 font-medium bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                      <AlertCircle size={14} />
                      {t.invalidRecoveryCode}
                    </motion.p>
                  )}
                  {recoverySuccess && (
                    <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-emerald-400 flex items-center gap-1 font-medium bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 size={14} />
                      {t.credentialsResetSuccess}
                    </motion.p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                >
                  {t.resetCredentials}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setRecoveryCodeInput('');
                    setRecoveryError(false);
                    setRecoverySuccess(false);
                  }}
                  className="w-full py-3.5 bg-white/5 text-slate-300 rounded-xl font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2 border border-white/5"
                >
                  {t.backToLogin}
                </button>
              </form>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                if (usernameInput === adminCredentials.username && passwordInput === adminCredentials.password) {
                  setIsAuthenticated(true);
                  setCurrentUser({ username: usernameInput, role: 'admin' });
                  setLoginError(false);
                  setUsernameInput('');
                  setPasswordInput('');
                  setActiveTab('dashboard');
                } else {
                  const staff = staffAccounts.find(s => s.username === usernameInput && s.password === passwordInput);
                  if (staff) {
                    setIsAuthenticated(true);
                    const user = { username: usernameInput, role: 'staff' as const, branchId: staff.branchId };
                    setCurrentUser(user);
                    if (staff.branchId) {
                      setSelectedBranchId(staff.branchId);
                    }
                    setLoginError(false);
                    setUsernameInput('');
                    setPasswordInput('');
                    setActiveTab('pos');
                  } else {
                    setLoginError(true);
                  }
                }
              }} className="space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider ml-1">
                      {t.enterUsername}
                    </label>
                    <div className="relative group/input">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-20 group-hover/input:opacity-40 transition-opacity" />
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        className="relative w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white placeholder:text-slate-600 outline-none"
                        placeholder="username"
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider ml-1">
                      {t.enterPassword}
                    </label>
                    <div className="relative group/input">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-20 group-hover/input:opacity-40 transition-opacity" />
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="relative w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white placeholder:text-slate-600 outline-none"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <motion.p 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs text-red-400 flex items-center gap-2 font-medium bg-red-500/10 p-3 rounded-xl border border-red-500/20"
                    >
                      <AlertCircle size={16} className="shrink-0" />
                      {t.incorrectCredentials}
                    </motion.p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs font-medium text-slate-400 hover:text-white transition-colors hover:underline decoration-indigo-500 decoration-2 underline-offset-4"
                  >
                    {t.forgotPassword}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2 relative overflow-hidden group/btn"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                  <span className="relative flex items-center gap-2">
                    {t.login}
                    <ArrowRight size={18} />
                  </span>
                </button>
              </form>
            )}
          </div>
        </motion.div>

        <div className="absolute bottom-6 left-0 right-0 text-center z-10">
          <p className="text-xs text-slate-500 font-medium tracking-wider uppercase">
            Developed by <span className="text-slate-300 font-bold">Zin Ko Ko Aung</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-[100dvh] bg-slate-50 dark:bg-slate-950 overflow-hidden relative", darkMode && "dark")}>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-white/10 flex flex-col z-50 transition-transform duration-300 lg:relative lg:translate-x-0 shadow-2xl",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center text-white border border-white/30 shadow-lg">
              <ShoppingCart size={18} />
            </div>
            Z SHOP POS
          </h1>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-full text-white/70">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-4 space-y-2 overflow-y-auto">
          {currentUser?.role === 'admin' && branches.length > 0 && (
            <div className="px-2 mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.branch}</p>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-white/30 transition-all cursor-pointer"
              >
                <option value="all" className="text-slate-900">{t.allBranches}</option>
                <option value="main" className="text-slate-900">{t.mainBranch}</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id} className="text-slate-900">{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {(currentUser?.role === 'admin') && (
            <SidebarItem 
              icon={<LayoutDashboard size={20} />} 
              label={t.dashboard} 
              active={activeTab === 'dashboard'} 
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
              badge={products.filter(p => p.stock < 10).length}
            />
          )}
          <SidebarItem 
            icon={<ShoppingCart size={20} />} 
            label={t.pos} 
            active={activeTab === 'pos'} 
            onClick={() => { setActiveTab('pos'); setIsSidebarOpen(false); }} 
          />
          {(currentUser?.role === 'admin') && (
            <SidebarItem 
              icon={<Package size={20} />} 
              label={t.products} 
              active={activeTab === 'products'} 
              onClick={() => { setActiveTab('products'); setIsSidebarOpen(false); }} 
              badge={products.filter(p => p.stock < 10).length}
            />
          )}
          <SidebarItem 
            icon={<History size={20} />} 
            label={t.history} 
            active={activeTab === 'history'} 
            onClick={() => { setActiveTab('history'); setIsSidebarOpen(false); }} 
          />
          {(currentUser?.role === 'admin') && (
            <SidebarItem 
              icon={<Wallet size={20} />} 
              label={t.expenses} 
              active={activeTab === 'expenses'} 
              onClick={() => { setActiveTab('expenses'); setIsSidebarOpen(false); }} 
            />
          )}
          <SidebarItem 
            icon={<Users size={20} />} 
            label={t.customers} 
            active={activeTab === 'customers'} 
            onClick={() => { setActiveTab('customers'); setIsSidebarOpen(false); }} 
          />
          {(currentUser?.role === 'admin') && (
            <SidebarItem 
              icon={<SettingsIcon size={20} />} 
              label={t.adminSettings} 
              active={activeTab === 'settings'} 
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} 
            />
          )}
        </div>

        <div className="p-4 space-y-4 border-t border-white/10">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.settings}</p>

            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Globe size={14} />
                {t.language}
              </span>
              <div className="flex bg-white/10 rounded-lg p-0.5">
                <button 
                  onClick={() => setLanguage('mm')}
                  className={cn(
                    "px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                    language === 'mm' ? "bg-white text-slate-900 shadow-lg" : "text-slate-400"
                  )}
                >
                  MM
                </button>
                <button 
                  onClick={() => setLanguage('en')}
                  className={cn(
                    "px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                    language === 'en' ? "bg-white text-indigo-900 shadow-lg" : "text-slate-400"
                  )}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => {
              setIsAuthenticated(false);
              setCurrentUser(null);
              localStorage.removeItem('pos_auth');
              localStorage.removeItem('pos_current_user');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-4 bg-red-500/20 hover:bg-red-500/30 text-red-100 rounded-xl transition-colors text-sm font-medium border border-red-500/30"
          >
            <LogOut size={16} />
            {t.logout}
          </button>

          <div className="mt-6 text-center border-t border-white/10 pt-4">
            <p className="text-[10px] text-white/40 font-medium tracking-wider uppercase">
              Developed by
            </p>
            <p className="text-xs text-white/70 font-bold tracking-wide mt-0.5">
              Zin Ko Ko Aung
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden w-full bg-slate-50 dark:bg-slate-950">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden text-slate-600 dark:text-slate-400"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white capitalize hidden sm:block">
              {t[activeTab as keyof typeof t] || activeTab}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400 transition-colors"
              title={darkMode ? t.lightMode : t.darkMode}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="relative flex-1 max-w-xs sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder={t.searchProducts} 
                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 w-full transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">{currentUser?.username}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{currentUser?.role === 'admin' ? t.admin : t.staff}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-sm">
                {currentUser?.username?.charAt(0).toUpperCase()}
              </div>
            </div>
            {activeTab === 'pos' && (
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full lg:hidden hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ShoppingBag size={24} />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                    {cartItems.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 lg:space-y-8 h-full overflow-y-auto p-4 lg:p-8"
              >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                  <StatCard title={t.totalSales} value={stats.totalSales} icon={<DollarSign size={24} />} color="sky" unit="MMK" />
                  {currentUser?.role === 'admin' && (
                    <>
                      <StatCard title={t.totalProfit} value={stats.totalProfit} icon={<TrendingUp size={24} />} color="emerald" unit="MMK" />
                      <StatCard title={t.totalExpenses} value={stats.totalExpenses} icon={<Wallet size={24} />} color="rose" unit="MMK" />
                      <StatCard title={t.netProfit} value={stats.netProfit} icon={<CheckCircle2 size={24} />} color="indigo" unit="MMK" />
                    </>
                  )}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                  <StatCard title={t.inventoryValue} value={stats.inventoryValue} icon={<Package size={24} />} color="amber" unit="MMK" />
                  <StatCard title={t.totalOrders} value={sales.length} icon={<ShoppingBag size={24} />} color="violet" unit={t.items} />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:gap-8">
                  <div className="glass-panel p-8 rounded-none neo-3d border-t-4 border-rose-500 shadow-[0_30px_60px_rgba(244,63,94,0.15)] bg-gradient-to-br from-rose-500/5 to-transparent">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="p-2 bg-rose-500 rounded-none text-white shadow-lg">
                          <AlertCircle size={20} />
                        </div>
                        {t.lowStock}
                      </h3>
                      <span className="px-3 py-1 bg-rose-500 text-white text-[10px] font-black rounded-none uppercase tracking-widest">
                        {products.filter(p => p.stock < 10).length} {t.items}
                      </span>
                    </div>
                    <div className="space-y-5">
                      {products.filter(p => p.stock < 10).map(product => (
                        <div key={product.id} className="flex items-center justify-between p-5 bg-white/80 dark:bg-slate-800/80 rounded-none neo-3d hover:neo-3d-pressed transition-all duration-300 border border-white/20">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-900 rounded-none overflow-hidden shrink-0 shadow-inner neo-3d">
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-700"><ImageIcon size={24} /></div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 dark:text-white truncate">{product.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">{product.category}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <div className={cn(
                              "px-4 py-2 rounded-none font-black text-sm neo-3d-pressed",
                              product.stock === 0 ? "bg-red-500/10 text-red-600" : "bg-rose-500/10 text-rose-600"
                            )}>
                              {product.stock} {t.left}
                            </div>
                          </div>
                        </div>
                      ))}
                      {products.filter(p => p.stock < 10).length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 neo-3d">
                            <CheckCircle2 className="text-emerald-500" size={32} />
                          </div>
                          <p className="text-emerald-600 dark:text-emerald-400 font-bold italic">{t.allItemsInStock}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'pos' && (
              <motion.div 
                key="pos"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col lg:flex-row gap-6 lg:gap-8 h-full overflow-hidden p-4 lg:p-8"
              >
                {/* Product Selection */}
                <div className="flex-1 space-y-6 overflow-y-auto pr-0 lg:pr-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                    {filteredProducts.map(product => (
                      <motion.button 
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => addToCart(product.id)}
                        disabled={product.stock === 0}
                        className={cn(
                          "bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 text-left group relative flex flex-col transition-all duration-200 shadow-sm hover:shadow-lg hover:border-indigo-500/50 dark:hover:border-indigo-500/50",
                          product.stock === 0 && "opacity-60 grayscale cursor-not-allowed"
                        )}
                      >
                        <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl mb-1.5 overflow-hidden relative w-full border border-slate-100 dark:border-slate-700">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                              <ImageIcon size={28} />
                            </div>
                          )}
                        </div>
                        <div className="px-0.5 flex flex-col flex-1 min-h-0">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight mb-0.5 line-clamp-2 h-8" title={product.name}>{product.name}</h4>
                          
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{product.category}</p>
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded-md font-bold",
                              product.stock > 10 
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                            )}>
                              {product.stock} {t.left}
                            </span>
                          </div>
                          
                          {(product.ram || product.storage || product.color) && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {product.ram && <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md font-medium">{product.ram}</span>}
                              {product.storage && <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md font-medium">{product.storage}</span>}
                              {product.color && <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md font-medium">{product.color}</span>}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-slate-100 dark:border-slate-800/50">
                            <p className="text-indigo-600 dark:text-indigo-400 font-extrabold text-base">
                              {product.price.toLocaleString()} <span className="text-[10px] font-bold text-indigo-400 dark:text-indigo-500">MMK</span>
                            </p>
                            <div className="w-7 h-7 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200 shadow-sm">
                              <Plus size={16} strokeWidth={3} />
                            </div>
                          </div>
                        </div>
                        {product.stock === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] rounded-2xl z-10">
                            <span className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider shadow-lg transform -rotate-6">{t.outOfStock}</span>
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                  {filteredProducts.length === 0 && (
                    <div className="text-center py-20">
                      <Package className="mx-auto text-slate-200 dark:text-slate-800 mb-4" size={64} />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">{t.noProductsFound}</p>
                    </div>
                  )}
                </div>

                {/* Cart (Desktop) */}
                <div className="hidden lg:flex w-80 xl:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex-col overflow-hidden shrink-0">
                  <CartContent 
                    cartItems={cartItems} 
                    cartTotal={cartTotal} 
                    onRemove={removeFromCart} 
                    onAdd={addToCart} 
                    onClear={() => setIsClearCartConfirmOpen(true)} 
                    onCheckout={checkout} 
                    isCheckingOut={isCheckingOut}
                    checkoutError={checkoutError}
                    t={t}
                    lastSale={lastSale}
                    onViewReceipt={() => setIsReceiptOpen(true)}
                    onPrintCart={printCart}
                    checkoutDiscount={checkoutDiscount}
                    setCheckoutDiscount={setCheckoutDiscount}
                    checkoutDiscountType={checkoutDiscountType}
                    setCheckoutDiscountType={setCheckoutDiscountType}
                    checkoutDeliveryFee={checkoutDeliveryFee}
                    setCheckoutDeliveryFee={setCheckoutDeliveryFee}
                    checkoutPaymentMethod={checkoutPaymentMethod}
                    setCheckoutPaymentMethod={setCheckoutPaymentMethod}
                    checkoutPaidAmount={checkoutPaidAmount}
                    setCheckoutPaidAmount={setCheckoutPaidAmount}
                    checkoutCustomerId={checkoutCustomerId}
                    setCheckoutCustomerId={setCheckoutCustomerId}
                    checkoutCustomerName={checkoutCustomerName}
                    setCheckoutCustomerName={setCheckoutCustomerName}
                    checkoutCustomerPhone={checkoutCustomerPhone}
                    setCheckoutCustomerPhone={setCheckoutCustomerPhone}
                    customers={customers}
                    onHoldCart={holdCart}
                    heldCartsCount={heldCarts.length}
                    onViewHeldCarts={() => setIsHeldCartsOpen(true)}
                    updateCartItemDiscount={updateCartItemDiscount}
                  />
                </div>

                {/* Cart (Mobile/Tablet Modal) */}
                <AnimatePresence>
                  {isCartOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsCartOpen(false)}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                      />
                      <motion.div 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="absolute inset-y-0 right-0 w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
                      >
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <ShoppingCart size={20} className="text-slate-700 dark:text-slate-300" />
                            Current Order
                          </h3>
                          <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
                            <X size={20} />
                          </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <CartContent 
                            cartItems={cartItems} 
                            cartTotal={cartTotal} 
                            onRemove={removeFromCart} 
                            onAdd={addToCart} 
                            onClear={() => setIsClearCartConfirmOpen(true)} 
                            onCheckout={checkout} 
                            isCheckingOut={isCheckingOut}
                            checkoutError={checkoutError}
                            t={t}
                            lastSale={lastSale}
                            onViewReceipt={() => setIsReceiptOpen(true)}
                            onPrintCart={printCart}
                            checkoutDiscount={checkoutDiscount}
                            setCheckoutDiscount={setCheckoutDiscount}
                            checkoutDiscountType={checkoutDiscountType}
                            setCheckoutDiscountType={setCheckoutDiscountType}
                            checkoutDeliveryFee={checkoutDeliveryFee}
                            setCheckoutDeliveryFee={setCheckoutDeliveryFee}
                            checkoutPaymentMethod={checkoutPaymentMethod}
                            setCheckoutPaymentMethod={setCheckoutPaymentMethod}
                            checkoutPaidAmount={checkoutPaidAmount}
                            setCheckoutPaidAmount={setCheckoutPaidAmount}
                            checkoutCustomerId={checkoutCustomerId}
                            setCheckoutCustomerId={setCheckoutCustomerId}
                            checkoutCustomerName={checkoutCustomerName}
                            setCheckoutCustomerName={setCheckoutCustomerName}
                            checkoutCustomerPhone={checkoutCustomerPhone}
                            setCheckoutCustomerPhone={setCheckoutCustomerPhone}
                            customers={customers}
                            onHoldCart={holdCart}
                            heldCartsCount={heldCarts.length}
                            onViewHeldCarts={() => setIsHeldCartsOpen(true)}
                            updateCartItemDiscount={updateCartItemDiscount}
                          />
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeTab === 'products' && (
              <motion.div 
                key="products"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 h-full overflow-y-auto p-4 lg:p-8"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t.inventory}</h3>
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => exportProductsToCSV(filteredProducts, t)}
                      className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-full font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={20} />
                      {t.exportCSV}
                    </button>
                    <button 
                      onClick={() => setIsAddProductOpen(true)}
                      className="bg-slate-800 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-slate-100 dark:shadow-none"
                    >
                      <Plus size={20} />
                      {t.addProduct}
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900/80 rounded-xl border-2 border-slate-300 dark:border-slate-800 shadow-sm overflow-hidden backdrop-blur-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-200 dark:bg-slate-800/20 border-b-2 border-slate-300 dark:border-slate-700/50">
                          <th className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">{t.product}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">{t.category}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">{t.cost}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">{t.price}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">{t.stock}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Restocked</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">{t.profitUnit}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider text-right">{t.actions}</th>
                        </tr>
                      </thead>
                    <tbody className="divide-y-2 divide-slate-300 dark:divide-slate-800/60">
                        {products.map(product => (
                          <tr key={product.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-lg overflow-hidden shrink-0 shadow-sm border border-slate-300 dark:border-slate-700">
                                  {product.image ? (
                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600"><ImageIcon size={20} /></div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold text-slate-900 dark:text-white truncate block max-w-[200px]">{product.name}</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {product.ram && <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded border border-slate-200 dark:border-slate-700">{product.ram}</span>}
                                    {product.storage && <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded border border-slate-200 dark:border-slate-700">{product.storage}</span>}
                                    {product.color && <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded border border-slate-200 dark:border-slate-700">{product.color}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700">
                                {product.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">{product.cost.toLocaleString()}</td>
                            <td className="px-6 py-4 text-slate-900 dark:text-white font-semibold text-sm">{product.price.toLocaleString()}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "font-semibold text-sm px-2.5 py-1 rounded-md inline-block min-w-[3rem] text-center",
                                product.stock < 10 
                                  ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50" 
                                  : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50"
                              )}>
                                {product.stock}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {product.lastRestocked ? (
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {new Date(product.lastRestocked).toLocaleDateString(language === 'mm' ? 'my-MM' : 'en-US')}
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {new Date(product.lastRestocked).toLocaleTimeString(language === 'mm' ? 'my-MM' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-400 dark:text-slate-500">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                                +{(product.price - product.cost).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-500 dark:text-slate-400 block max-w-[200px] truncate" title={product.description}>
                                {product.description || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => setEditingProduct(product)}
                                  className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-200 dark:border-indigo-800/50"
                                  title="Edit Product"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button 
                                  onClick={() => setRestockProductId(product.id)}
                                  className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                                  title={t.restock}
                                >
                                  <Plus size={16} />
                                </button>
                                <button 
                                  onClick={() => setProductToDelete(product.id)}
                                  className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-800/50"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                  </table>
                  {products.length === 0 && (
                    <div className="text-center py-20">
                      <Package className="mx-auto text-slate-200 dark:text-slate-800 mb-4" size={64} />
                      <p className="text-slate-400 font-bold italic">{t.noProductsInventory}</p>
                    </div>
                  )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 h-full overflow-y-auto p-4 lg:p-8"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">{t.salesHistory}</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="glass-panel px-6 py-3 rounded-none neo-3d border-t border-indigo-500/20 flex items-center gap-3">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">{t.totalSales}:</span>
                        <span className="font-black text-slate-700 dark:text-slate-300 text-sm">{historyStats.totalSales.toLocaleString()} MMK</span>
                      </div>
                      {currentUser?.role === 'admin' && (
                        <div className="glass-panel px-6 py-3 rounded-none neo-3d border-t border-emerald-500/20 flex items-center gap-3">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">{t.totalProfit}:</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{historyStats.totalProfit.toLocaleString()} MMK</span>
                        </div>
                      )}
                      <button 
                        onClick={() => exportToCSV(filteredSales, t)}
                        className="glass-panel px-6 py-3 rounded-none neo-3d border-t border-indigo-500/20 flex items-center gap-3 hover:bg-indigo-500/10 transition-colors"
                      >
                        <Download size={18} className="text-indigo-500" />
                        <span className="text-[10px] text-slate-700 dark:text-slate-300 uppercase font-black tracking-widest">{t.exportCSV}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div 
                      className="relative cursor-pointer" 
                      onClick={() => {
                        const input = dateInputRef.current;
                        if (!input) return;
                        const inputAny = input as any;
                        if ('showPicker' in inputAny) {
                          try {
                            inputAny.showPicker();
                          } catch (e) {
                            inputAny.click();
                          }
                        } else {
                          inputAny.click();
                        }
                      }}
                    >
                      <input
                        ref={dateInputRef}
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-full text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer transition-all"
                      />
                      {!selectedDate && (
                        <div className="absolute inset-0 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-full flex items-center px-4 pointer-events-none">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{t.allDays}</span>
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <select
                        value={filterPaymentMethod}
                        onChange={(e) => setFilterPaymentMethod(e.target.value)}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-full text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer transition-all"
                      >
                        <option value="">{t.allPaymentMethods}</option>
                        <option value="Cash">{t.cash}</option>
                        <option value="KPay">{t.kpay}</option>
                        <option value="WavePay">{t.wavepay}</option>
                        <option value="Bank Transfer">{t.bankTransfer}</option>
                      </select>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={filterCustomerName}
                        onChange={(e) => setFilterCustomerName(e.target.value)}
                        placeholder={t.filterByCustomer}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-full text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>

                    <button 
                      onClick={() => {
                        setSelectedDate('');
                        setFilterPaymentMethod('');
                        setFilterCustomerName('');
                      }}
                      className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm font-bold flex items-center justify-center gap-2 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
                    >
                      <X size={18} />
                      {t.clearAll}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredSales.map(sale => (
                    <div key={sale.id} className="glass-panel rounded-none neo-3d border-l-4 border-indigo-500 overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-none flex items-center justify-center text-slate-700 dark:text-slate-300 neo-3d-pressed">
                            <ShoppingBag size={20} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 max-w-[150px] sm:max-w-md">
                              {sale.items.map((item, index) => (
                                <span key={`${item.name}-${index}`} className="text-sm font-black text-slate-900 dark:text-white tracking-tight inline-flex items-center gap-1">
                                  {item.name}
                                  {item.quantity > 1 && (
                                    <span className="text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-md shadow-sm">
                                      x{item.quantity}
                                    </span>
                                  )}
                                  {index < sale.items.length - 1 && <span className="text-slate-400 font-normal">,</span>}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{new Date(sale.timestamp).toLocaleString()}</p>
                              {sale.paymentMethod && (
                                <span className="text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  {sale.paymentMethod}
                                </span>
                              )}
                              {sale.customerName && (
                                <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-wider truncate max-w-[100px]">
                                  {sale.customerName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-1 px-4 hidden md:block">
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {t.order} #{sale.id}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                          <div className="text-right">
                            <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">{sale.totalAmount.toLocaleString()} MMK</p>
                            {currentUser?.role === 'admin' && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">{t.profit}: +{sale.profit.toLocaleString()}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setLastSale(sale);
                                setIsReceiptOpen(true);
                              }}
                              className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-none hover:bg-indigo-500 hover:text-white transition-all neo-3d"
                              title="View Receipt"
                            >
                              <Printer size={18} />
                            </button>
                            <button 
                              onClick={() => setSaleToDelete(sale.id)}
                              className="p-3 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-none hover:bg-red-500 hover:text-white transition-all neo-3d"
                              title="Delete sale and restore stock"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredSales.length === 0 && (
                    <div className="text-center py-20 glass-panel rounded-none neo-3d">
                      <History className="mx-auto text-slate-200 dark:text-slate-800 mb-6" size={64} />
                      <p className="text-slate-400 font-bold italic uppercase tracking-widest text-xs">{t.noSalesHistory}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'expenses' && (
              <motion.div 
                key="expenses"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 h-full overflow-y-auto p-4 lg:p-8"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">{t.expenses}</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="glass-panel px-6 py-3 rounded-none neo-3d border-t border-rose-500/20 flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">{t.totalExpenses}:</span>
                      <span className="font-black text-rose-600 dark:text-rose-400 text-sm">{stats.totalExpenses.toLocaleString()} MMK</span>
                    </div>
                    <button 
                      onClick={() => exportExpensesToCSV(filteredExpenses, t, branches)}
                      className="glass-panel px-6 py-3 rounded-none neo-3d border-t border-emerald-500/20 flex items-center gap-3 hover:bg-emerald-500/10 transition-colors"
                    >
                      <Download size={18} className="text-emerald-500" />
                      <span className="text-[10px] text-slate-700 dark:text-slate-300 uppercase font-black tracking-widest">{t.exportCSV}</span>
                    </button>
                    <button 
                      onClick={() => setIsAddExpenseOpen(true)}
                      className="glass-panel px-6 py-3 rounded-none neo-3d border-t border-indigo-500/20 flex items-center gap-3 hover:bg-indigo-500/10 transition-colors"
                    >
                      <Plus size={18} className="text-indigo-500" />
                      <span className="text-[10px] text-slate-700 dark:text-slate-300 uppercase font-black tracking-widest">{t.addExpense}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {filteredExpenses.map((expense) => (
                    <div 
                      key={expense.id}
                      className="glass-panel p-6 rounded-none neo-3d border-l-4 border-rose-500 bg-white dark:bg-slate-900/50 group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest border border-rose-200 dark:border-rose-800">
                              {expense.category === 'Staff' ? t.staffCost : 
                               expense.category === 'Rent' ? t.rent : 
                               expense.category === 'Electricity' ? t.electricity : t.generalExpense}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              {new Date(expense.timestamp).toLocaleString()}
                            </span>
                            {expense.branchId && expense.branchId !== 'main' && (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-md">
                                {branches.find(b => b.id === expense.branchId)?.name || 'Unknown Branch'}
                              </span>
                            )}
                            {(!expense.branchId || expense.branchId === 'main') && (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-md">
                                {t.mainBranch}
                              </span>
                            )}
                          </div>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white">{expense.description}</h4>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{t.expenseAmount}</p>
                            <p className="text-xl font-black text-rose-600 dark:text-rose-400">-{expense.amount.toLocaleString()} MMK</p>
                          </div>
                          <button 
                            onClick={() => setExpenseToDelete(expense.id)}
                            className="p-3 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-none hover:bg-red-500 hover:text-white transition-all neo-3d opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <div className="text-center py-20 glass-panel rounded-none neo-3d">
                      <Wallet className="mx-auto text-slate-200 dark:text-slate-800 mb-6" size={64} />
                      <p className="text-slate-400 font-bold italic uppercase tracking-widest text-xs">{t.noExpenses}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'customers' && (
              <motion.div 
                key="customers"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 h-full overflow-y-auto p-4 lg:p-8"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">{t.customers}</h3>
                  <button 
                    onClick={() => setIsAddCustomerOpen(true)}
                    className="glass-panel px-6 py-3 rounded-none neo-3d border-t border-indigo-500/20 flex items-center gap-3 hover:bg-indigo-500/10 transition-colors"
                  >
                    <Plus size={18} className="text-indigo-500" />
                    <span className="text-[10px] text-slate-700 dark:text-slate-300 uppercase font-black tracking-widest">{t.addCustomer}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {customers.map((customer) => {
                    const customerSales = sales.filter(s => s.customerId === customer.id);
                    const totalSpent = customerSales.reduce((sum, s) => sum + s.totalAmount, 0);
                    return (
                      <div 
                        key={customer.id}
                        className="glass-panel p-6 rounded-none neo-3d border-l-4 border-indigo-500 bg-white dark:bg-slate-900/50 group"
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h4 className="text-lg font-black text-slate-900 dark:text-white">{customer.name}</h4>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1"><Users size={14} /> {customer.phone}</span>
                              {customer.email && <span className="flex items-center gap-1">@ {customer.email}</span>}
                              {customer.address && <span className="flex items-center gap-1"><Store size={14} /> {customer.address}</span>}
                            </div>
                            <div className="pt-2 flex flex-wrap items-center gap-4">
                              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-800">
                                {t.purchaseHistory}: {customerSales.length}
                              </span>
                              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-800">
                                {t.totalSpent}: {totalSpent.toLocaleString()} MMK
                              </span>
                              {(customer.debt || 0) > 0 && (
                                <span className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest border border-rose-200 dark:border-rose-800">
                                  Debt: {(customer.debt || 0).toLocaleString()} MMK
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(customer.debt || 0) > 0 && (
                              <button 
                                onClick={() => {
                                  setSelectedCustomerForDebt(customer);
                                  setIsDebtPaymentOpen(true);
                                }}
                                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                              >
                                Pay Debt
                              </button>
                            )}
                            <button 
                              onClick={() => setCustomerToDelete(customer.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {customers.length === 0 && (
                    <div className="text-center py-20 glass-panel rounded-none neo-3d">
                      <Users className="mx-auto text-slate-200 dark:text-slate-800 mb-6" size={64} />
                      <p className="text-slate-400 font-bold italic uppercase tracking-widest text-xs">{t.noCustomers}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full space-y-6 max-w-2xl mx-auto h-full overflow-y-auto p-4 lg:p-8 pb-48 min-h-0"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-white shadow-lg neo-3d">
                    <SettingsIcon size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-widest">{t.adminSettings}</h3>
                </div>

                <div className="glass-panel p-4 sm:p-8 rounded-2xl neo-3d border-t-2 border-slate-500/20">
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (newUsername && newPassword) {
                      const newCredentials = { username: newUsername, password: newPassword };
                      try {
                        await setDoc(doc(db, 'settings', 'general'), { adminCredentials: newCredentials }, { merge: true });
                        setSettingsSuccess(true);
                        setNewUsername('');
                        setNewPassword('');
                        setTimeout(() => setSettingsSuccess(false), 3000);
                      } catch (error) {
                        console.error("Error updating credentials:", error);
                      }
                    }
                  }} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                        {t.newUsername}
                      </label>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white font-medium"
                        placeholder={adminCredentials.username}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                        {t.newPassword}
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white font-medium"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    
                    {settingsSuccess && (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={20} />
                        <p className="font-medium text-sm">{t.credentialsUpdated}</p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <button 
                        type="submit"
                        className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-lg neo-3d uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <SettingsIcon size={18} />
                        {t.saveChanges}
                      </button>
                    </div>
                  </form>
                </div>



                {/* Receipt Customization */}
                <div className="glass-panel p-4 sm:p-8 rounded-2xl neo-3d border-t-2 border-slate-500/20 mt-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-300">
                      <ShoppingBag size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t.receipt} Customization</h3>
                  </div>
                  
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await setDoc(doc(db, 'settings', 'general'), { receiptSettings }, { merge: true });
                      setSettingsSuccess(true);
                      setTimeout(() => setSettingsSuccess(false), 3000);
                    } catch (error) {
                      console.error("Error updating receipt settings:", error);
                    }
                  }} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.shopLogo}</label>
                      <div className="flex items-center gap-4">
                        {receiptSettings.logo ? (
                          <div className="relative group">
                            <img 
                              src={receiptSettings.logo} 
                              alt="Shop Logo" 
                              className="w-20 h-20 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => setReceiptSettings(prev => ({ ...prev, logo: '' }))}
                              className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <Upload size={20} className="text-slate-400 mb-1" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{t.uploadLogo}</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const compressed = await compressImage(file, 400, 400, 0.8);
                                    setReceiptSettings(prev => ({ ...prev, logo: compressed }));
                                  } catch (error) {
                                    console.error("Error compressing logo:", error);
                                  }
                                }
                              }}
                            />
                          </label>
                        )}
                        <div className="flex-1">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            Recommended: Square image, transparent background. Max size 500KB.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.shopName}</label>
                      <input
                        type="text"
                        value={receiptSettings.shopName}
                        onChange={(e) => setReceiptSettings(prev => ({ ...prev, shopName: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.address}</label>
                      <input
                        type="text"
                        value={receiptSettings.address}
                        onChange={(e) => setReceiptSettings(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.phone}</label>
                      <input
                        type="text"
                        value={receiptSettings.phone}
                        onChange={(e) => setReceiptSettings(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={receiptSettings.showShopName}
                            onChange={(e) => setReceiptSettings(prev => ({ ...prev, showShopName: e.target.checked }))}
                          />
                          <div className={`w-10 h-5 rounded-full transition-colors ${receiptSettings.showShopName ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                          <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${receiptSettings.showShopName ? 'translate-x-5' : ''}`} />
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider group-hover:text-indigo-500 transition-colors">{t.showShopName}</span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={receiptSettings.showThankYou}
                            onChange={(e) => setReceiptSettings(prev => ({ ...prev, showThankYou: e.target.checked }))}
                          />
                          <div className={`w-10 h-5 rounded-full transition-colors ${receiptSettings.showThankYou ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                          <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${receiptSettings.showThankYou ? 'translate-x-5' : ''}`} />
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider group-hover:text-indigo-500 transition-colors">{t.showThankYou}</span>
                      </label>
                    </div>

                    <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-lg neo-3d uppercase tracking-widest flex items-center justify-center gap-2">
                      <CheckCircle2 size={18} />
                      {t.saveReceiptSettings}
                    </button>
                  </form>
                </div>

                {/* Branch Management */}
                <div className="glass-panel p-4 sm:p-8 rounded-2xl neo-3d border-t-2 border-slate-500/20 mt-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-300">
                      <Store size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t.manageBranches}</h3>
                  </div>
                  
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newBranchName) return;
                    const name = newBranchName;
                    setNewBranchName(''); // Clear immediately
                    try {
                      const newBranchRef = doc(collection(db, 'branches'));
                      await setDoc(newBranchRef, { name: name, id: newBranchRef.id });
                      setBranchActionSuccess(t.branchAdded);
                      setTimeout(() => setBranchActionSuccess(''), 3000);
                    } catch (error) {
                      console.error("Error adding branch:", error);
                    }
                  }} className="space-y-4 mb-8">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.branchName}</label>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <input
                          type="text"
                          value={newBranchName}
                          onChange={(e) => setNewBranchName(e.target.value)}
                          className="flex-1 px-4 py-3 sm:py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-medium"
                          required
                        />
                        <button type="submit" className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-md flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
                          <Plus size={16} />
                          {t.addBranch}
                        </button>
                      </div>
                    </div>
                    {branchActionSuccess && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-medium">
                        <CheckCircle2 size={16} />
                        {branchActionSuccess}
                      </p>
                    )}
                  </form>

                  <div className="space-y-3">
                    {[{ id: 'main', name: t.mainBranch }, ...branches].map(branch => (
                      <div key={branch.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-lg shrink-0">
                            {branch.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{branch.name}</p>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{t.branch}</p>
                          </div>
                        </div>
                        {branch.id !== 'main' && (
                          <button
                            onClick={() => setBranchToDelete(branch.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Staff Accounts Management */}
                <div className="glass-panel p-4 sm:p-8 rounded-2xl neo-3d border-t-2 border-slate-500/20 mt-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-300">
                      <Users size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t.staffAccounts}</h3>
                  </div>
                  
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newStaffUsername || !newStaffPassword || !newStaffBranchId) return;
                    if (staffAccounts.some(s => s.username === newStaffUsername) || newStaffUsername === adminCredentials.username) {
                      alert('Username already exists');
                      return;
                    }
                    const newStaff = { 
                      username: newStaffUsername, 
                      password: newStaffPassword,
                      branchId: newStaffBranchId
                    };
                    // Clear inputs immediately
                    setNewStaffUsername('');
                    setNewStaffPassword('');
                    setNewStaffBranchId('');
                    try {
                      await setDoc(doc(db, 'staffAccounts', Date.now().toString()), newStaff);
                      setStaffActionSuccess(t.staffAdded);
                      setTimeout(() => setStaffActionSuccess(''), 3000);
                    } catch (error) {
                      console.error("Error adding staff:", error);
                    }
                  }} className="space-y-4 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.staffUsername}</label>
                        <input
                          type="text"
                          value={newStaffUsername}
                          onChange={(e) => setNewStaffUsername(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-medium"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.staffPassword}</label>
                        <input
                          type="password"
                          value={newStaffPassword}
                          onChange={(e) => setNewStaffPassword(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-medium"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.assignBranch}</label>
                        <select
                          value={newStaffBranchId}
                          onChange={(e) => setNewStaffBranchId(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-medium"
                          required
                        >
                          <option value="main">{t.mainBranch}</option>
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-md flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
                      <Plus size={16} />
                      {t.addStaff}
                    </button>
                    {staffActionSuccess && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-medium">
                        <CheckCircle2 size={16} />
                        {staffActionSuccess}
                      </p>
                    )}
                  </form>

                  <div className="space-y-3">
                    {staffAccounts.length === 0 ? (
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.noStaffAccounts}</p>
                    ) : (
                      staffAccounts.map(staff => (
                        <div key={staff.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-lg shrink-0">
                              {staff.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">{staff.username}</p>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                {t.staff} • {staff.branchId === 'main' ? t.mainBranch : (branches.find(b => b.id === staff.branchId)?.name || 'No Branch')}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              const staffId = staff.id;
                              try {
                                await deleteDoc(doc(db, 'staffAccounts', staffId));
                                setStaffActionSuccess(t.staffDeleted);
                                setTimeout(() => setStaffActionSuccess(''), 3000);
                              } catch (error) {
                                console.error("Error deleting staff:", error);
                              }
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            title={t.deleteStaff}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddCustomerOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-none neo-3d border-t-8 border-indigo-600 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-widest">{t.addCustomer}</h3>
                  <button onClick={() => setIsAddCustomerOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <AddCustomerForm 
                  onSave={addCustomer} 
                  onCancel={() => setIsAddCustomerOpen(false)} 
                  t={t} 
                />
              </div>
            </motion.div>
          </div>
        )}

        {isAddExpenseOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-none neo-3d border-t-8 border-indigo-600 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-widest">{t.addExpense}</h3>
                  <button onClick={() => setIsAddExpenseOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <AddExpenseForm 
                  onSave={addExpense} 
                  onCancel={() => setIsAddExpenseOpen(false)} 
                  t={t} 
                  branches={branches}
                  selectedBranchId={selectedBranchId}
                />
              </div>
            </motion.div>
          </div>
        )}

        {isHeldCartsOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHeldCartsOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <Clock className="text-indigo-500" />
                  Held Carts
                </h3>
                <button onClick={() => setIsHeldCartsOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {heldCarts.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    No held carts.
                  </div>
                ) : (
                  heldCarts.map(cart => (
                    <div key={cart.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {cart.customerName || 'Walk-in Customer'} 
                          <span className="text-xs text-slate-500 ml-2 font-normal">
                            {new Date(cart.timestamp).toLocaleTimeString()}
                          </span>
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {cart.items.length} items • {cart.items.reduce((sum, item) => sum + item.quantity, 0)} total qty
                        </p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => {
                            setHeldCarts(prev => prev.filter(c => c.id !== cart.id));
                          }}
                          className="px-4 py-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl font-bold hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors flex-1 sm:flex-none text-center"
                        >
                          Discard
                        </button>
                        <button
                          onClick={() => retrieveCart(cart)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex-1 sm:flex-none text-center"
                        >
                          Retrieve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}

        {isDebtPaymentOpen && selectedCustomerForDebt && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsDebtPaymentOpen(false);
                setSelectedCustomerForDebt(null);
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Pay Debt</h3>
                <button 
                  onClick={() => {
                    setIsDebtPaymentOpen(false);
                    setSelectedCustomerForDebt(null);
                  }} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const paymentAmount = Number(formData.get('amount'));
                
                if (paymentAmount > 0 && paymentAmount <= (selectedCustomerForDebt.debt || 0)) {
                  try {
                    await updateDoc(doc(db, 'customers', selectedCustomerForDebt.id), {
                      debt: (selectedCustomerForDebt.debt || 0) - paymentAmount
                    });
                    setIsDebtPaymentOpen(false);
                    setSelectedCustomerForDebt(null);
                  } catch (error) {
                    console.error("Error updating debt:", error);
                    alert("Failed to update debt.");
                  }
                } else {
                  alert("Invalid payment amount.");
                }
              }} className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Customer</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedCustomerForDebt.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Current Debt</p>
                  <p className="font-bold text-rose-500 text-lg">{(selectedCustomerForDebt.debt || 0).toLocaleString()} MMK</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Payment Amount (MMK)</label>
                  <input 
                    type="number" 
                    name="amount"
                    required 
                    min="1"
                    max={selectedCustomerForDebt.debt || 0}
                    defaultValue={selectedCustomerForDebt.debt || 0}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsDebtPaymentOpen(false);
                      setSelectedCustomerForDebt(null);
                    }}
                    className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30"
                  >
                    Confirm Payment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAddProductOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddProductOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800"
            >
              <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add New Product</h3>
                <button onClick={() => setIsAddProductOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <AddProductForm 
                  onAdd={addProduct} 
                  t={t}
                  categories={categories}
                  branches={branches}
                  selectedBranchId={selectedBranchId}
                  onAddCategory={async (newCategory) => {
                    try {
                      if (!categories.includes(newCategory)) {
                        const newCategories = [...categories, newCategory];
                        await setDoc(doc(db, 'settings', 'general'), { categories: newCategories }, { merge: true });
                      }
                    } catch (error) {
                      console.error("Error adding category:", error);
                    }
                  }}
                  onDeleteCategory={async (categoryToDelete) => {
                    try {
                      const newCategories = categories.filter(c => c !== categoryToDelete);
                      await setDoc(doc(db, 'settings', 'general'), { categories: newCategories }, { merge: true });
                    } catch (error) {
                      console.error("Error deleting category:", error);
                    }
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingProduct(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800"
            >
              <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Product</h3>
                <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <AddProductForm 
                  key={editingProduct.id}
                  initialData={editingProduct}
                  onAdd={updateProduct} 
                  t={t}
                  categories={categories}
                  branches={branches}
                  selectedBranchId={selectedBranchId}
                  onAddCategory={async (newCategory) => {
                    try {
                      if (!categories.includes(newCategory)) {
                        const newCategories = [...categories, newCategory];
                        await setDoc(doc(db, 'settings', 'general'), { categories: newCategories }, { merge: true });
                      }
                    } catch (error) {
                      console.error("Error adding category:", error);
                    }
                  }}
                  onDeleteCategory={async (categoryToDelete) => {
                    try {
                      const newCategories = categories.filter(c => c !== categoryToDelete);
                      await setDoc(doc(db, 'settings', 'general'), { categories: newCategories }, { merge: true });
                    } catch (error) {
                      console.error("Error deleting category:", error);
                    }
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Restock Modal */}
      <AnimatePresence>
        {restockProductId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setRestockProductId(null);
                setRestockQuantity('');
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-none shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800"
            >
              <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t.addStock}</h3>
                <button 
                  onClick={() => {
                    setRestockProductId(null);
                    setRestockQuantity('');
                  }} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {products.find(p => p.id === restockProductId)?.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.inStock}: {products.find(p => p.id === restockProductId)?.stock}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.quantityToAdd}</label>
                    <input 
                      type="number" 
                      min="1"
                      value={restockQuantity}
                      onChange={e => setRestockQuantity(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                      placeholder="e.g. 10"
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 lg:p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setRestockProductId(null);
                    setRestockQuantity('');
                  }}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={async () => {
                    const qty = parseInt(restockQuantity);
                    if (qty > 0 && restockProductId) {
                      try {
                        const productRef = doc(db, 'products', restockProductId);
                        const product = products.find(p => p.id === restockProductId);
                        if (product) {
                          await updateDoc(productRef, { 
                            stock: product.stock + qty,
                            lastRestocked: new Date().toISOString()
                          });
                        }
                        setRestockProductId(null);
                        setRestockQuantity('');
                      } catch (error) {
                        console.error("Error restocking product:", error);
                      }
                    }
                  }}
                  disabled={!restockQuantity || parseInt(restockQuantity) <= 0}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.confirm}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        
        {/* Delete Sale Modal */}
        {saleToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-none neo-3d p-6 max-w-sm w-full border-t-4 border-red-500"
            >
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">{t.deleteSale}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-8">
                {t.deleteSaleConfirm}
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setSaleToDelete(null)}
                  className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors uppercase tracking-widest"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={async () => {
                    const saleId = saleToDelete;
                    const sale = sales.find(s => s.id === saleId);
                    setSaleToDelete(null); // Close immediately
                    if (sale) {
                      try {
                        const batch = writeBatch(db);
                        // Delete sale
                        batch.delete(doc(db, 'sales', sale.id));
                        // Return stock
                        sale.items.forEach(item => {
                          const product = products.find(p => p.id === item.productId);
                          if (product) {
                            const productRef = doc(db, 'products', product.id);
                            batch.update(productRef, { stock: product.stock + item.quantity });
                          }
                        });
                        await batch.commit();
                      } catch (error) {
                        console.error("Error deleting sale:", error);
                      }
                    }
                  }}
                  className="px-6 py-3 text-sm font-black bg-red-500 text-white hover:bg-red-600 rounded-none transition-colors uppercase tracking-widest neo-3d"
                >
                  {t.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Product Modal */}
        {productToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-none neo-3d p-6 max-w-sm w-full border-t-4 border-red-500"
            >
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">{t.deleteProduct}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-8">
                {t.deleteProductConfirm}
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors uppercase tracking-widest"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={async () => {
                    const productId = productToDelete;
                    setProductToDelete(null); // Close immediately
                    try {
                      await deleteDoc(doc(db, 'products', productId));
                    } catch (error) {
                      console.error("Error deleting product:", error);
                    }
                  }}
                  className="px-6 py-3 text-sm font-black bg-red-500 text-white hover:bg-red-600 rounded-none transition-colors uppercase tracking-widest neo-3d"
                >
                  {t.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Customer Modal */}
        {customerToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-none neo-3d p-6 max-w-sm w-full border-t-4 border-red-500"
            >
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">{t.deleteCustomer}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-8">
                {t.deleteCustomerConfirm}
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setCustomerToDelete(null)}
                  className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors uppercase tracking-widest"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={async () => {
                    const customerId = customerToDelete;
                    setCustomerToDelete(null); // Close immediately
                    try {
                      await deleteCustomer(customerId);
                    } catch (error) {
                      console.error("Error deleting customer:", error);
                    }
                  }}
                  className="px-6 py-3 text-sm font-black bg-red-500 text-white hover:bg-red-600 rounded-none transition-colors uppercase tracking-widest neo-3d"
                >
                  {t.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Expense Modal */}
        {expenseToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-none neo-3d p-6 max-w-sm w-full border-t-4 border-red-500"
            >
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">{t.deleteExpense}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-8">
                {t.deleteExpenseConfirm}
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setExpenseToDelete(null)}
                  className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors uppercase tracking-widest"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={async () => {
                    const expenseId = expenseToDelete;
                    setExpenseToDelete(null); // Close immediately
                    try {
                      await deleteExpense(expenseId);
                    } catch (error) {
                      console.error("Error deleting expense:", error);
                    }
                  }}
                  className="px-6 py-3 text-sm font-black bg-red-500 text-white hover:bg-red-600 rounded-none transition-colors uppercase tracking-widest neo-3d"
                >
                  {t.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Branch Modal */}
        {branchToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-none neo-3d p-6 max-w-sm w-full border-t-4 border-red-500"
            >
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">{t.deleteBranch}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-8">
                {t.deleteBranchConfirm}
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setBranchToDelete(null)}
                  className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors uppercase tracking-widest"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={async () => {
                    const branchId = branchToDelete;
                    setBranchToDelete(null); // Close immediately
                    try {
                      await deleteDoc(doc(db, 'branches', branchId));
                      setBranchActionSuccess(t.branchDeleted);
                      setTimeout(() => setBranchActionSuccess(''), 3000);
                    } catch (error) {
                      console.error("Error deleting branch:", error);
                    }
                  }}
                  className="px-6 py-3 text-sm font-black bg-red-500 text-white hover:bg-red-600 rounded-none transition-colors uppercase tracking-widest neo-3d"
                >
                  {t.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Clear Cart Modal */}
        {isClearCartConfirmOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-none neo-3d p-6 max-w-sm w-full border-t-4 border-red-500"
            >
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">{t.clearCart}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-8">
                {t.clearCartConfirm}
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setIsClearCartConfirmOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors uppercase tracking-widest"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={() => {
                    setCart({});
                    setIsClearCartConfirmOpen(false);
                  }}
                  className="px-6 py-3 text-sm font-black bg-red-500 text-white hover:bg-red-600 rounded-none transition-colors uppercase tracking-widest neo-3d"
                >
                  {t.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}


        {/* Receipt Modal */}
        <AnimatePresence>
          {isReceiptOpen && lastSale && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsReceiptOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-[320px] max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10"
              >
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                    {t.receipt}
                  </h3>
                  <button onClick={() => setIsReceiptOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 relative">
                  <div id="receipt-content" className="p-4 relative bg-white dark:bg-slate-900">
                    {/* Decorative Paper Texture Overlay */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] dark:invert" />
                  
                  <div className="text-center mb-4 relative z-10">
                    {receiptSettings.logo ? (
                      <div className="mb-3">
                        <img 
                          src={receiptSettings.logo} 
                          alt="Shop Logo" 
                          className="h-16 w-auto mx-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-slate-900 mx-auto mb-3 shadow-2xl rotate-3">
                        <ShoppingBag size={24} />
                      </div>
                    )}
                    {receiptSettings.showShopName && (
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter mb-1 leading-none">{receiptSettings.shopName}</h2>
                    )}
                    <div className="flex flex-col items-center gap-1">
                      {receiptSettings.address && (
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-[0.2em] max-w-[200px] leading-relaxed">{receiptSettings.address}</p>
                      )}
                      {receiptSettings.phone && (
                        <>
                          <div className="h-px w-8 bg-slate-200 dark:bg-slate-800 my-1" />
                          <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mt-0.5">
                            {t.phoneLabel} - <span className="text-sm tracking-widest">{receiptSettings.phone.replace(/^(Phone|Ph|ဖုန်း)[\s:-]*/i, '')}</span>
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="relative mb-4">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200 dark:bg-slate-800 -translate-y-1/2" />
                    <div className="relative flex justify-center">
                      <span className="bg-white dark:bg-slate-900 px-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">{t.transactionDetails}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      <span>{t.orderId}</span>
                      <span className="text-slate-900 dark:text-white">#{lastSale.id}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      <span>{t.date}</span>
                      <span className="text-slate-900 dark:text-white">{new Date(lastSale.timestamp).toLocaleString()}</span>
                    </div>
                    {lastSale.paymentMethod && (
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        <span>{t.paymentMethod}</span>
                        <span className="text-slate-900 dark:text-white">
                          {lastSale.paymentMethod === 'Cash' ? t.cash : 
                           lastSale.paymentMethod === 'KPay' ? t.kpay : 
                           lastSale.paymentMethod === 'WavePay' ? t.wavepay : 
                           lastSale.paymentMethod === 'Bank Transfer' ? t.bankTransfer : 
                           lastSale.paymentMethod}
                        </span>
                      </div>
                    )}
                    {lastSale.customerName && (
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        <span>{t.customerName}</span>
                        <span className="text-slate-900 dark:text-white">{lastSale.customerName}</span>
                      </div>
                    )}
                    {lastSale.customerPhone && (
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        <span>{t.customerPhone}</span>
                        <span className="text-slate-900 dark:text-white">{lastSale.customerPhone}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    {lastSale.items.map((item, idx) => {
                      let itemTotal = item.price * item.quantity;
                      if (item.discountValue) {
                        if (item.discountType === 'percentage') {
                          itemTotal -= itemTotal * (item.discountValue / 100);
                        } else {
                          itemTotal -= item.discountValue;
                        }
                      }
                      return (
                      <div key={`${item.name}-${idx}`} className="group">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">{item.name}</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {Math.max(0, itemTotal).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            {item.quantity} x {item.price.toLocaleString()} {t.currency}
                            {item.discountValue ? ` (-${item.discountType === 'percentage' ? `${item.discountValue}%` : `${item.discountValue} ${t.currency}`})` : ''}
                          </span>
                          <div className="flex-1 border-t border-dotted border-slate-200 dark:border-slate-800" />
                        </div>
                      </div>
                    )})}
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      <span>{t.subtotal}</span>
                      <span>{(lastSale.totalAmount + (lastSale.discount || 0) - (lastSale.deliveryFee || 0)).toLocaleString()} {t.currency}</span>
                    </div>
                    {lastSale.discount && lastSale.discount > 0 ? (
                      <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        <span>{t.discount}</span>
                        <span>-{lastSale.discount.toLocaleString()} {t.currency}</span>
                      </div>
                    ) : null}
                    {lastSale.deliveryFee && lastSale.deliveryFee > 0 ? (
                      <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        <span>{t.deliveryFee}</span>
                        <span>+{lastSale.deliveryFee.toLocaleString()} {t.currency}</span>
                      </div>
                    ) : null}
                    <div className="h-px bg-slate-900 dark:bg-white" />
                    <div className="flex justify-between items-end">
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em]">{t.total}</span>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tighter leading-none">
                          {lastSale.totalAmount.toLocaleString()}
                        </p>
                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mt-0.5">{t.kyatsOnly}</p>
                      </div>
                    </div>
                  </div>

                  {receiptSettings.showThankYou && (
                    <div className="space-y-4 text-center relative z-10 mt-6">
                      <div className="space-y-1.5 pt-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">{t.thankYou}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  <button 
                    onClick={async () => {
                      const content = document.getElementById('receipt-content');
                      if (content) {
                        try {
                          const dataUrl = await htmlToImage.toPng(content, {
                            pixelRatio: 4,
                            backgroundColor: 'white',
                          });
                          const link = document.createElement('a');
                          link.href = dataUrl;
                          link.download = `receipt-${lastSale.id}.png`;
                          link.click();
                        } catch (error) {
                          console.error("Error saving receipt:", error);
                          alert("Failed to save receipt as image.");
                        }
                      }
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Download size={14} />
                    {t.save}
                  </button>
                  <button 
                    onClick={() => {
                      const content = document.getElementById('receipt-content');
                      if (content) {
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Receipt - ${lastSale.id}</title>
                                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                                <style>
                                  @media print {
                                    body { padding: 0; margin: 0; }
                                    .no-print { display: none; }
                                  }
                                  body { 
                                    font-family: 'Inter', sans-serif; 
                                    -webkit-print-color-adjust: exact;
                                  }
                                  .receipt-container {
                                    max-width: 320px;
                                    margin: 0 auto;
                                    padding: 20px;
                                    background: white;
                                  }
                                </style>
                              </head>
                              <body class="bg-white text-black">
                                <div class="receipt-container">
                                  ${content.innerHTML}
                                </div>
                                <script>
                                  window.onload = () => {
                                    setTimeout(() => {
                                      window.print();
                                      window.close();
                                    }, 800);
                                  };
                                </script>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                        }
                      }
                    }}
                    className="flex-1 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Printer size={14} />
                    {t.print}
                  </button>
                  <button 
                    onClick={() => setIsReceiptOpen(false)}
                    className="flex-1 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                  >
                    {t.close}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---

function CartContent({ 
  cartItems, 
  cartTotal, 
  onRemove, 
  onAdd, 
  onClear, 
  onCheckout,
  t,
  lastSale,
  onViewReceipt,
  onPrintCart,
  checkoutDiscount,
  setCheckoutDiscount,
  checkoutDiscountType,
  setCheckoutDiscountType,
  checkoutDeliveryFee,
  setCheckoutDeliveryFee,
  checkoutPaymentMethod,
  setCheckoutPaymentMethod,
  checkoutPaidAmount,
  setCheckoutPaidAmount,
  checkoutCustomerId,
  setCheckoutCustomerId,
  checkoutCustomerName,
  setCheckoutCustomerName,
  checkoutCustomerPhone,
  setCheckoutCustomerPhone,
  customers,
  onHoldCart,
  heldCartsCount,
  onViewHeldCarts,
  updateCartItemDiscount,
  isCheckingOut,
  checkoutError
}: { 
  cartItems: { product: Product, qty: number, discountType: 'percentage' | 'fixed', discountValue: number }[], 
  cartTotal: number, 
  onRemove: (id: string) => void, 
  onAdd: (id: string) => void, 
  onClear: () => void, 
  onCheckout: () => void,
  t: any,
  lastSale?: Sale | null,
  onViewReceipt?: () => void,
  onPrintCart?: () => void,
  checkoutDiscount: number,
  setCheckoutDiscount: (v: number) => void,
  checkoutDiscountType: 'percentage' | 'fixed',
  setCheckoutDiscountType: (v: 'percentage' | 'fixed') => void,
  checkoutDeliveryFee: number,
  setCheckoutDeliveryFee: (v: number) => void,
  checkoutPaymentMethod: string,
  setCheckoutPaymentMethod: (v: string) => void,
  checkoutPaidAmount: number,
  setCheckoutPaidAmount: (v: number) => void,
  checkoutCustomerId?: string,
  setCheckoutCustomerId?: (v: string) => void,
  checkoutCustomerName: string,
  setCheckoutCustomerName: (v: string) => void,
  checkoutCustomerPhone: string,
  setCheckoutCustomerPhone: (v: string) => void,
  customers?: Customer[],
  onHoldCart: () => void,
  heldCartsCount: number,
  onViewHeldCarts: () => void,
  updateCartItemDiscount: (id: string, type: 'percentage' | 'fixed', val: number) => void,
  isCheckingOut?: boolean,
  checkoutError?: string | null
}) {
  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md">
            <ShoppingCart size={18} />
          </div>
          {t.cart}
        </h3>
        <div className="flex items-center gap-2">
          {lastSale && onViewReceipt && (
            <button 
              onClick={onViewReceipt}
              className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors px-2 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md flex items-center gap-1"
              title="Print Last Receipt"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Receipt</span>
            </button>
          )}
          <button 
            onClick={onClear}
            className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
          >
            {t.clearAll}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence initial={false}>
          {cartItems.map(({ product, qty, discountType, discountValue }) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-3 group hover:border-indigo-500/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-700 relative">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600"><ImageIcon size={20} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 dark:text-white truncate text-xs tracking-tight">{product.name}</p>
                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                    {(() => {
                      let itemTotal = product.price * qty;
                      if (discountValue) {
                        if (discountType === 'percentage') {
                          itemTotal -= itemTotal * (discountValue / 100);
                        } else {
                          itemTotal -= discountValue;
                        }
                      }
                      return Math.max(0, itemTotal).toLocaleString();
                    })()} MMK
                    {discountValue > 0 && (
                      <span className="text-slate-400 line-through ml-2">
                        {(product.price * qty).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button 
                    onClick={() => onRemove(product.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-900 dark:text-white font-black shadow-sm text-xs"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-black text-xs text-slate-900 dark:text-white">{qty}</span>
                  <button 
                    onClick={() => onAdd(product.id)}
                    disabled={product.stock <= qty}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-all font-black shadow-md text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
              
              {/* Item Discount Controls */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => updateCartItemDiscount(product.id, 'percentage', discountValue)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${discountType === 'percentage' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    %
                  </button>
                  <button
                    onClick={() => updateCartItemDiscount(product.id, 'fixed', discountValue)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${discountType === 'fixed' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    MMK
                  </button>
                </div>
                <input
                  type="number"
                  value={discountValue || ''}
                  onChange={(e) => updateCartItemDiscount(product.id, discountType, Number(e.target.value))}
                  placeholder="Discount"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  min="0"
                  max={discountType === 'percentage' ? "100" : undefined}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {cartItems.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-slate-200 dark:border-slate-700 border-dashed">
              <ShoppingCart className="text-slate-300 dark:text-slate-600" size={24} />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t.emptyCart}</p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 relative flex flex-col shrink-0 max-h-[75vh]">
        <div className="p-4 pb-2 overflow-y-auto space-y-3 custom-scrollbar">
          {customers && customers.length > 0 && setCheckoutCustomerId && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t.selectCustomer}</label>
              <select 
                value={checkoutCustomerId || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  setCheckoutCustomerId(id);
                  if (id) {
                    const customer = customers.find(c => c.id === id);
                    if (customer) {
                      setCheckoutCustomerName(customer.name);
                      setCheckoutCustomerPhone(customer.phone);
                    }
                  } else {
                    setCheckoutCustomerName('');
                    setCheckoutCustomerPhone('');
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-900 dark:text-white transition-all"
              >
                <option value="">{t.walkInCustomer}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t.customerName}</label>
              <input 
                type="text" 
                value={checkoutCustomerName}
                onChange={(e) => setCheckoutCustomerName(e.target.value)}
                disabled={!!checkoutCustomerId}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-900 dark:text-white disabled:opacity-50 transition-all"
                placeholder="Name"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t.customerPhone}</label>
              <input 
                type="text" 
                value={checkoutCustomerPhone}
                onChange={(e) => setCheckoutCustomerPhone(e.target.value)}
                disabled={!!checkoutCustomerId}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-900 dark:text-white disabled:opacity-50 transition-all"
                placeholder="Phone"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t.paymentMethod}</label>
              <select 
                value={checkoutPaymentMethod}
                onChange={(e) => setCheckoutPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-900 dark:text-white transition-all"
              >
                <option value="Cash">{t.cash}</option>
                <option value="KPay">{t.kpay}</option>
                <option value="WavePay">{t.wavepay}</option>
                <option value="Bank Transfer">{t.bankTransfer}</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t.discount}</label>
              <div className="flex gap-1">
                <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 shrink-0">
                  <button
                    onClick={() => setCheckoutDiscountType('percentage')}
                    className={`px-1.5 py-1 text-[9px] font-bold rounded-md transition-colors ${checkoutDiscountType === 'percentage' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    %
                  </button>
                  <button
                    onClick={() => setCheckoutDiscountType('fixed')}
                    className={`px-1.5 py-1 text-[9px] font-bold rounded-md transition-colors ${checkoutDiscountType === 'fixed' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    MMK
                  </button>
                </div>
                <input 
                  type="number" 
                  min="0"
                  max={checkoutDiscountType === 'percentage' ? "100" : undefined}
                  value={checkoutDiscount || ''}
                  onChange={(e) => setCheckoutDiscount(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t.deliveryFee}</label>
              <input 
                type="number" 
                min="0"
                value={checkoutDeliveryFee || ''}
                onChange={(e) => setCheckoutDeliveryFee(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-900 dark:text-white transition-all"
                placeholder="0"
              />
            </div>
            {checkoutPaymentMethod === 'Credit' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Paid Amount</label>
                <input 
                  type="number" 
                  min="0"
                  value={checkoutPaidAmount || ''}
                  onChange={(e) => setCheckoutPaidAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-900 dark:text-white transition-all"
                  placeholder="0"
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 pt-2 space-y-3 shrink-0">
          {checkoutError && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-2 text-rose-600 dark:text-rose-400 text-[10px] font-bold"
            >
              <AlertCircle size={14} />
              {checkoutError}
            </motion.div>
          )}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>{t.subtotal}</span>
              <span>{cartTotal.toLocaleString()} MMK</span>
            </div>
            {checkoutDiscount > 0 && (
              <div className="flex justify-between text-xs font-bold text-rose-500 dark:text-rose-400">
                <span>{t.discount} {checkoutDiscountType === 'percentage' ? `(${checkoutDiscount}%)` : ''}</span>
                <span>-{checkoutDiscountType === 'percentage' ? (cartTotal * (checkoutDiscount / 100)).toLocaleString() : checkoutDiscount.toLocaleString()} MMK</span>
              </div>
            )}
            {checkoutDeliveryFee > 0 && (
              <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                <span>{t.deliveryFee}</span>
                <span>+{checkoutDeliveryFee.toLocaleString()} MMK</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-black text-slate-900 dark:text-white pt-2 border-t-2 border-slate-100 dark:border-slate-800">
              <span>{t.total}</span>
              <span className="text-indigo-600 dark:text-indigo-400">{(() => {
                let discountAmount = 0;
                if (checkoutDiscountType === 'percentage') {
                  discountAmount = cartTotal * (checkoutDiscount / 100);
                } else {
                  discountAmount = checkoutDiscount;
                }
                return (Math.max(0, cartTotal - discountAmount) + checkoutDeliveryFee).toLocaleString();
              })()} MMK</span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1">
              <button 
                onClick={onViewHeldCarts}
                className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center border border-slate-200 dark:border-slate-700 relative"
                title="View Held Carts"
              >
                <Clock size={16} />
                {heldCartsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                    {heldCartsCount}
                  </span>
                )}
              </button>
              <button 
                onClick={onHoldCart}
                disabled={cartItems.length === 0}
                className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center border border-slate-200 dark:border-slate-700"
                title="Hold Cart"
              >
                <Pause size={16} />
              </button>
              {onPrintCart && (
                <button 
                  onClick={onPrintCart}
                  disabled={cartItems.length === 0}
                  className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center border border-slate-200 dark:border-slate-700"
                  title="View/Save Draft Receipt"
                >
                  <FileText size={16} />
                </button>
              )}
            </div>
            <button 
              onClick={onCheckout}
              disabled={cartItems.length === 0 || isCheckingOut}
              className="flex-1 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-indigo-500 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isCheckingOut ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {t.checkout}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// --- Sub-components ---

function SidebarItem({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-[calc(100%-16px)] mx-2 flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 font-bold tracking-tight relative group overflow-hidden mb-1",
        active 
          ? "bg-white/15 text-white shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/20 backdrop-blur-md translate-x-1" 
          : "text-slate-300 hover:text-white hover:bg-white/5 hover:translate-x-1"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn(
          "shrink-0 transition-transform duration-300 group-hover:scale-110",
          active ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" : "text-slate-400 group-hover:text-slate-200"
        )}>
          {icon}
        </span>
        <span className={cn(
          "truncate text-sm transition-colors",
          active ? "text-white" : "text-slate-300 group-hover:text-white"
        )}>{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="shrink-0 ml-2 px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)]">
          {badge}
        </span>
      )}
      {active && (
        <motion.div 
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"
        />
      )}
    </button>
  );
}

function StatCard({ title, value, icon, color, unit = "MMK" }: { title: string, value: number, icon: React.ReactNode, color: string, unit?: string }) {
  const colors: { [key: string]: string } = {
    emerald: "bg-emerald-500 border-emerald-600 shadow-emerald-500/20",
    amber: "bg-amber-500 border-amber-600 shadow-amber-500/20",
    indigo: "bg-indigo-500 border-indigo-600 shadow-indigo-500/20",
    rose: "bg-rose-500 border-rose-600 shadow-rose-500/20",
    violet: "bg-violet-500 border-violet-600 shadow-violet-500/20",
    sky: "bg-sky-500 border-sky-600 shadow-sky-500/20",
  };

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      className={cn(
        "p-4 rounded-2xl border-b-4 transition-all duration-300 group relative overflow-hidden shadow-lg",
        colors[color] || "bg-slate-500 border-slate-600"
      )}
    >
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
      
      <div className="flex items-start justify-between mb-2 relative z-10">
        <div className={cn(
          "p-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-inner",
        )}>
          {icon}
        </div>
        <div className="text-right">
          <span className="text-[9px] font-black text-white/70 uppercase tracking-[0.2em]">{title}</span>
        </div>
      </div>
      
      <div className="relative z-10">
        <p className="text-xl sm:text-2xl font-black text-white tracking-tighter leading-none mb-1">
          {value.toLocaleString()}
        </p>
        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{unit}</p>
      </div>
    </motion.div>
  );
}

function AddProductForm({ 
  onAdd, 
  t,
  categories,
  onAddCategory,
  onDeleteCategory,
  initialData,
  branches,
  selectedBranchId
}: { 
  onAdd: (p: Omit<Product, 'id'>) => void,
  t: any,
  categories: string[],
  onAddCategory: (c: string) => void,
  onDeleteCategory: (c: string) => void,
  initialData?: Product,
  branches: Branch[],
  selectedBranchId: string
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    cost: initialData?.cost || '',
    price: initialData?.price || '',
    stock: initialData?.stock || '',
    category: initialData?.category || categories[0] || '',
    image: initialData?.image || '',
    ram: initialData?.ram || '',
    storage: initialData?.storage || '',
    color: initialData?.color || '',
    barcode: initialData?.barcode || '',
    description: initialData?.description || '',
    branchId: initialData?.branchId || (selectedBranchId === 'all' ? 'main' : selectedBranchId)
  });

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      onAddCategory(newCategory.trim());
      setFormData(prev => ({ ...prev, category: newCategory.trim() }));
      setNewCategory('');
      setIsAddingCategory(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      name: formData.name,
      cost: Number(formData.cost),
      price: Number(formData.price),
      stock: Number(formData.stock),
      category: formData.category,
      image: formData.image,
      ram: formData.ram,
      storage: formData.storage,
      color: formData.color,
      barcode: formData.barcode,
      description: formData.description,
      branchId: formData.branchId
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 800, 0.7);
        setFormData(prev => ({ ...prev, image: compressed }));
      } catch (error) {
        console.error("Error compressing image:", error);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.productName}</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Apple iPhone 15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.barcode || 'Barcode'}</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
              value={formData.barcode}
              onChange={e => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
              placeholder="e.g. 12345678"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.cost}</label>
            <input 
              required
              type="number" 
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
              value={formData.cost}
              onChange={e => setFormData(prev => ({ ...prev, cost: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.price}</label>
            <input 
              required
              type="number" 
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
              value={formData.price}
              onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.stock}</label>
            <input 
              required
              type="number" 
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
              value={formData.stock}
              onChange={e => setFormData(prev => ({ ...prev, stock: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.category}</label>
            {isAddingCategory ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  placeholder="New category..."
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    } else if (e.key === 'Escape') {
                      setIsAddingCategory(false);
                      setNewCategory('');
                    }
                  }}
                />
                <button 
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Save
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCategory('');
                  }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            ) : confirmDelete ? (
              <div className="flex gap-2 items-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1">
                <span className="text-sm text-red-600 dark:text-red-400 flex-1 truncate">Delete "{formData.category}"?</span>
                <button 
                  type="button"
                  onClick={() => {
                    onDeleteCategory(formData.category);
                    setFormData(prev => ({ ...prev, category: categories[0] === formData.category ? categories[1] || '' : categories[0] || '' }));
                    setConfirmDelete(false);
                  }}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Yes
                </button>
                <button 
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                >
                  No
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select 
                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                  {Array.from(new Set(categories)).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button 
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium flex items-center justify-center"
                  title="Add New Category"
                >
                  +
                </button>
                <button 
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={categories.length <= 1}
                  className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete Selected Category"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.branch}</label>
            <select 
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white font-medium"
              value={formData.branchId}
              onChange={e => setFormData(prev => ({ ...prev, branchId: e.target.value }))}
              disabled={!!initialData}
            >
              <option value="main">{t.mainBranch}</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {initialData && (
              <p className="text-[10px] text-slate-500 mt-1 italic">Branch cannot be changed after creation</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">RAM</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
              value={formData.ram}
              onChange={e => setFormData(prev => ({ ...prev, ram: e.target.value }))}
              placeholder="e.g. 8GB"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Storage</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
              value={formData.storage}
              onChange={e => setFormData(prev => ({ ...prev, storage: e.target.value }))}
              placeholder="e.g. 256GB"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
              value={formData.color}
              onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
              placeholder="e.g. Black"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { name: 'Black', hex: '#000000' },
                { name: 'White', hex: '#FFFFFF' },
                { name: 'Silver', hex: '#C0C0C0' },
                { name: 'Gold', hex: '#FFD700' },
                { name: 'Blue', hex: '#3B82F6' },
                { name: 'Red', hex: '#EF4444' },
                { name: 'Green', hex: '#10B981' },
                { name: 'Purple', hex: '#8B5CF6' },
                { name: 'Pink', hex: '#EC4899' },
                { name: 'Gray', hex: '#6B7280' },
              ].map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: c.name }))}
                  className={cn(
                    "w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm transition-all hover:scale-110",
                    formData.color === c.name ? "ring-2 ring-slate-500 ring-offset-2 dark:ring-offset-slate-800 scale-110" : ""
                  )}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.description || 'Description'}</label>
          <textarea 
            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-slate-900 dark:text-white resize-none h-24"
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Product details..."
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.productImage}</label>
          <div className="relative group w-32 h-32 sm:w-40 sm:h-40">
            <input 
              type="file" 
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="product-image-upload"
            />
            <label 
              htmlFor="product-image-upload"
              className={cn(
                "flex flex-col items-center justify-center w-full h-full rounded-2xl border-2 border-b-[6px] border-r-[6px] border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/10 text-slate-500 dark:text-slate-400 cursor-pointer transition-all duration-200",
                "hover:-translate-y-1 hover:translate-x-[-1px] hover:border-b-[8px] hover:border-r-[8px] hover:bg-slate-50 dark:hover:bg-slate-800/20",
                "active:border-b-[2px] active:border-r-[2px] active:translate-y-[4px] active:translate-x-[4px]",
                "overflow-hidden relative"
              )}
            >
              {formData.image ? (
                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <>
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border-b-[3px] border-r-[3px] border-black/10 mb-2 group-hover:rotate-6 transition-transform duration-300">
                    <Upload size={20} className="text-slate-500" />
                  </div>
                  <span className="text-xs font-bold tracking-wide text-center px-2">{t.uploadDevice}</span>
                </>
              )}
            </label>
            {formData.image && (
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); setFormData(prev => ({ ...prev, image: '' })); }}
                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-xl shadow-sm border-b-[3px] border-r-[3px] border-red-700 hover:-translate-y-0.5 hover:border-b-[4px] hover:border-r-[4px] active:translate-y-[2px] active:translate-x-[2px] active:border-b-[1px] active:border-r-[1px] transition-all z-10"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 pt-4 pb-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 mt-4">
        <button 
          type="submit"
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          {t.saveProduct}
        </button>
      </div>
    </form>
  );
}

function AddCustomerForm({ 
  onSave, 
  onCancel, 
  t 
}: { 
  onSave: (data: any) => void; 
  onCancel: () => void; 
  t: any;
}) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.customerName}</label>
          <input 
            required
            type="text" 
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.customerPhone}</label>
          <input 
            required
            type="tel" 
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
            value={formData.phone}
            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.customerEmail} (Optional)</label>
          <input 
            type="email" 
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
            value={formData.email}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.customerAddress} (Optional)</label>
          <textarea 
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-bold resize-none"
            rows={2}
            value={formData.address}
            onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button 
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          {t.addCustomer}
        </button>
      </div>
    </form>
  );
}

function AddExpenseForm({ 
  onSave, 
  onCancel, 
  t,
  branches,
  selectedBranchId
}: { 
  onSave: (data: any) => void; 
  onCancel: () => void; 
  t: any;
  branches: Branch[];
  selectedBranchId: string;
}) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'General',
    branchId: selectedBranchId === 'all' ? 'main' : selectedBranchId
  });

  const categories = [
    { id: 'Staff', label: t.staffCost },
    { id: 'Rent', label: t.rent },
    { id: 'Electricity', label: t.electricity },
    { id: 'General', label: t.generalExpense }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      description: formData.description,
      amount: Number(formData.amount),
      category: formData.category,
      branchId: formData.branchId
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.branch}</label>
          <select 
            required
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
            value={formData.branchId}
            onChange={e => setFormData(prev => ({ ...prev, branchId: e.target.value }))}
          >
            <option value="main">{t.mainBranch}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.expenseCategory}</label>
          <select 
            required
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
            value={formData.category}
            onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
          >
            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.expenseAmount}</label>
          <input 
            required
            type="number" 
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-bold"
            value={formData.amount}
            onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{t.expenseDescription}</label>
          <textarea 
            required
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white font-bold resize-none h-32"
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter details..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button 
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
        >
          {t.cancel}
        </button>
        <button 
          type="submit"
          className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
        >
          {t.save}
        </button>
      </div>
    </form>
  );
}
