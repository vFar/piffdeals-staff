import { createContext, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { mozelloService } from '../services/mozelloService';
import { App } from 'antd';

const GlobalBarcodeScannerContext = createContext(undefined);

export const useGlobalBarcodeScanner = () => {
  const context = useContext(GlobalBarcodeScannerContext);
  if (context === undefined) {
    throw new Error('useGlobalBarcodeScanner must be used within GlobalBarcodeScannerProvider');
  }
  return context;
};

/**
 * Global Barcode Scanner Provider
 * Listens for barcode scans from anywhere in the app
 * When a barcode is scanned, navigates to CreateInvoice with the product pre-added
 */
export const GlobalBarcodeScannerProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { message } = App.useApp();
  
  // Scanner state
  const scannerInputRef = useRef('');
  const scannerTimeoutRef = useRef(null);
  const lastKeyTimeRef = useRef(0);
  const availableProductsRef = useRef([]);
  const isProcessingRef = useRef(false);

  // Fetch products when user is authenticated
  const fetchProducts = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const data = await mozelloService.getProducts();
      const products = data.products || [];
      
      // Filter products that CAN BE PURCHASED (same logic as CreateInvoice)
      const purchasableProducts = products.filter(product => {
        if (!product.visible) return false;
        
        const hasValidStock = product.stock === null || product.stock > 0;
        const productPrice = product.sale_price || product.price;
        const hasProductPrice = productPrice && parseFloat(productPrice) > 0;
        
        const hasVariantPrice = product.variants && product.variants.length > 0 && 
          product.variants.some(variant => {
            const variantPrice = variant.sale_price || variant.price;
            const hasPrice = variantPrice && parseFloat(variantPrice) > 0;
            const hasStock = variant.stock === null || variant.stock > 0;
            return hasPrice && hasStock;
          });
        
        return hasValidStock && (hasProductPrice || hasVariantPrice);
      });
      
      availableProductsRef.current = purchasableProducts;
    } catch (error) {
      // Error fetching products
    }
  }, [currentUser]);

  // Fetch products on mount and when user changes
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Search product by SKU/barcode (same logic as CreateInvoice)
  const findProductBySKU = useCallback((sku, products) => {
    if (!products || products.length === 0) return null;
    
    return products.find(product => {
      // Check product level SKU/barcode
      if (product.sku && product.sku.toLowerCase() === sku.toLowerCase()) return true;
      if (product.barcode && product.barcode.toLowerCase() === sku.toLowerCase()) return true;
      if (product.code && product.code.toLowerCase() === sku.toLowerCase()) return true;
      if (product.handle && product.handle.toLowerCase() === sku.toLowerCase()) return true;
      
      // Check variant level SKU/barcode
      if (product.variants && product.variants.length > 0) {
        return product.variants.some(variant => {
          if (variant.sku && variant.sku.toLowerCase() === sku.toLowerCase()) return true;
          if (variant.barcode && variant.barcode.toLowerCase() === sku.toLowerCase()) return true;
          if (variant.code && variant.code.toLowerCase() === sku.toLowerCase()) return true;
          return false;
        });
      }
      
      return false;
    });
  }, []);

  // Get product title (same logic as CreateInvoice)
  const getProductTitle = useCallback((product) => {
    if (typeof product.title === 'string') return product.title;
    if (typeof product.title === 'object') {
      return product.title.lv || product.title.en || product.title[Object.keys(product.title)[0]] || 'Bez nosaukuma';
    }
    return 'Bez nosaukuma';
  }, []);

  // Get product price (same logic as CreateInvoice)
  const getProductPrice = useCallback((product) => {
    const price = product.sale_price || product.price || 0;
    return parseFloat(price) || 0;
  }, []);

  // Handle barcode scan
  const handleBarcodeScan = useCallback(async (scannedCode) => {
    // Prevent multiple simultaneous scans
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      // Check if user is authenticated
      if (!currentUser) {
        message.warning('Lūdzu, piesakieties, lai izmantotu barcode skeneri');
        return;
      }

      // Wait for products to load if needed
      if (availableProductsRef.current.length === 0) {
        message.info('Ielādē produktus...');
        await fetchProducts();
        
        // If still no products after fetch, show error
        if (availableProductsRef.current.length === 0) {
          message.error('Produkti nav pieejami');
          return;
        }
      }

      // Search for product
      const product = findProductBySKU(scannedCode, availableProductsRef.current);
      
      if (!product) {
        message.warning(`Produkts ar SKU "${scannedCode}" nav atrasts`);
        return;
      }

      // Prepare product data for CreateInvoice
      const productTitle = getProductTitle(product);
      const productPrice = getProductPrice(product);
      const productStock = product.stock;

      // Navigate to CreateInvoice with scanned product
      navigate('/invoices/create', {
        state: {
          scannedProduct: {
            productHandle: product.handle,
            name: productTitle,
            price: productPrice,
            stock: productStock,
            quantity: 1,
          }
        }
      });

      message.success(`${productTitle} pievienots rēķinam`);
    } catch (error) {
      message.error('Kļūda apstrādājot barcode');
    } finally {
      isProcessingRef.current = false;
    }
  }, [currentUser, navigate, message, findProductBySKU, getProductTitle, getProductPrice, fetchProducts]);

  // Global barcode scanner listener
  useEffect(() => {
    // Don't listen on login page or CreateInvoice page (it has its own scanner)
    if (
      location.pathname === '/login' || 
      location.pathname === '/reset-password' ||
      location.pathname === '/invoices/create' ||
      location.pathname.startsWith('/invoices/edit/')
    ) {
      return;
    }

    const handleKeyDown = (e) => {
      const currentTime = Date.now();
      const timeSinceLastKey = currentTime - lastKeyTimeRef.current;
      
      // Reset scanner input if too much time passed (user is typing manually)
      if (timeSinceLastKey > 100) {
        scannerInputRef.current = '';
      }
      
      lastKeyTimeRef.current = currentTime;
      
      // Ignore if user is typing in an input field
      const activeElement = document.activeElement;
      const isInputField = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable ||
        activeElement.closest('.ant-select-dropdown') ||
        activeElement.closest('.ant-modal') // Ignore when modal is open
      );
      
      // If Enter key is pressed and we have scanner input, process it
      if (e.key === 'Enter' && scannerInputRef.current.length > 0 && !isInputField) {
        e.preventDefault();
        const scannedCode = scannerInputRef.current.trim();
        scannerInputRef.current = '';
        
        if (scannedCode.length > 0) {
          handleBarcodeScan(scannedCode);
        }
        return;
      }
      
      // Accumulate characters for scanner input (only if not in input field)
      if (!isInputField && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only accept alphanumeric and common barcode characters
        if (/^[a-zA-Z0-9\-_]+$/.test(e.key)) {
          scannerInputRef.current += e.key;
          
          // Clear timeout if exists
          if (scannerTimeoutRef.current) {
            clearTimeout(scannerTimeoutRef.current);
          }
          
          // Reset scanner input after 300ms of no input (user finished typing)
          scannerTimeoutRef.current = setTimeout(() => {
            scannerInputRef.current = '';
          }, 300);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
  }, [location.pathname, handleBarcodeScan]);

  const value = useMemo(() => ({}), []);

  return (
    <GlobalBarcodeScannerContext.Provider value={value}>
      {children}
    </GlobalBarcodeScannerContext.Provider>
  );
};

