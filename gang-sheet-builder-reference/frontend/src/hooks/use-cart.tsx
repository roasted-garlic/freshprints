import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  cartCreate,
  cartLinesAdd,
  cartLinesUpdate,
  cartLinesRemove,
  getShopifyCart,
  getProductByHandle,
  ShopifyCart,
  ShopifyCartLine,
  CartLineInput,
} from '@/lib/shopify';

const GANG_SHEET_HANDLE = 'created-gang-sheet';
// Module-level cache: undefined = not fetched yet, null = fetch failed/no image
let _gangSheetProductImageUrl: string | null | undefined = undefined;

async function fetchGangSheetProductImage(): Promise<string | null> {
  if (_gangSheetProductImageUrl !== undefined) return _gangSheetProductImageUrl;
  try {
    const product = await getProductByHandle(GANG_SHEET_HANDLE);
    _gangSheetProductImageUrl = product.images.edges[0]?.node.url ?? null;
  } catch {
    _gangSheetProductImageUrl = null;
  }
  return _gangSheetProductImageUrl;
}

const SHOPIFY_CART_ID_KEY = 'radical-prints-shopify-cart-id';
const LOCAL_CART_KEY = 'radical-prints-local-cart';
const IMAGE_OVERRIDES_KEY = 'radical-prints-image-overrides';

export type CartItem = {
  id: string;
  name: string;
  type: 'print' | 'gang-sheet' | 'custom-sheet';
  size: string;
  quantity: number;
  price: number;
  image?: string;
  variantId?: string;
  productHandle?: string;
  extraAttributes?: Array<{ key: string; value: string }>;
  attributes?: Array<{ key: string; value: string }>;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => Promise<string | null>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  checkoutUrl: string | null;
  isCartLoading: boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

function mapLine(
  line: ShopifyCartLine,
  imageOverrides: Record<string, string>,
  gangSheetProductImage?: string | null,
): CartItem {
  const type = (line.attributes.find(a => a.key === '_type')?.value ?? 'print') as CartItem['type'];
  const calcPrice = line.attributes.find(a => a.key === '_calculated_price')?.value;
  const attrImage = line.attributes.find(a => a.key === '_image_url')?.value;
  const productImage = line.merchandise.product.images.edges[0]?.node.url;
  // For gang sheets, prefer the static Shopify product image over the per-order print file URL
  const image =
    type === 'custom-sheet'
      ? (productImage || gangSheetProductImage || imageOverrides[line.id] || attrImage)
      : (imageOverrides[line.id] || attrImage || productImage);
  return {
    id: line.id,
    name: line.merchandise.product.title,
    type,
    size: line.merchandise.title,
    quantity: line.quantity,
    price: calcPrice ? parseFloat(calcPrice) : parseFloat(line.merchandise.price.amount),
    image: image || undefined,
    variantId: line.merchandise.id,
    productHandle: (line.merchandise.product as any).handle,
    attributes: line.attributes,
  };
}

function syncFromCart(
  cart: ShopifyCart,
  imageOverrides: Record<string, string>,
  setShopifyItems: React.Dispatch<React.SetStateAction<CartItem[]>>,
  setCheckoutUrl: React.Dispatch<React.SetStateAction<string | null>>,
  cartIdRef: React.MutableRefObject<string | null>,
  gangSheetProductImage?: string | null,
) {
  setShopifyItems(cart.lines.edges.map(e => mapLine(e.node, imageOverrides, gangSheetProductImage)));
  setCheckoutUrl(cart.checkoutUrl);
  cartIdRef.current = cart.id;
  localStorage.setItem(SHOPIFY_CART_ID_KEY, cart.id);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cartIdRef = useRef<string | null>(localStorage.getItem(SHOPIFY_CART_ID_KEY));

  const imageOverridesRef = useRef<Record<string, string>>(
    (() => {
      try {
        const saved = sessionStorage.getItem(IMAGE_OVERRIDES_KEY);
        return saved ? JSON.parse(saved) : {};
      } catch { return {}; }
    })()
  );

  const persistImageOverrides = () => {
    try {
      sessionStorage.setItem(IMAGE_OVERRIDES_KEY, JSON.stringify(imageOverridesRef.current));
    } catch {}
  };

  const setImageOverride = (lineId: string, imageUrl: string) => {
    imageOverridesRef.current[lineId] = imageUrl;
    persistImageOverrides();
  };

  const removeImageOverride = (lineId: string) => {
    delete imageOverridesRef.current[lineId];
    persistImageOverrides();
  };

  const gangSheetImageRef = useRef<string | null | undefined>(undefined);

  const [shopifyItems, setShopifyItems] = useState<CartItem[]>([]);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);

  const items = [...shopifyItems, ...localItems];

  // Fetch the static Shopify product image for "Created Gang Sheet" once on mount
  useEffect(() => {
    fetchGangSheetProductImage().then(url => {
      gangSheetImageRef.current = url;
    });
  }, []);

  // On mount: check if a pending draft order has been paid and clear the cart if so
  useEffect(() => {
    const pendingId = localStorage.getItem('radical-prints-pending-draft-order');
    if (!pendingId) return;

    const apiBase = import.meta.env.BASE_URL.replace(/\/$/, '').replace(/^\//, '');
    const base = apiBase ? `/${apiBase}` : '';
    const statusUrl = `${base}/api/draft-checkout/status/${pendingId}`;

    fetch(statusUrl)
      .then(r => r.json())
      .then((data: { paid?: boolean }) => {
        if (data.paid) {
          localStorage.removeItem('radical-prints-pending-draft-order');
          setLocalItems([]);
          setShopifyItems([]);
          setCheckoutUrl(null);
          localStorage.removeItem(SHOPIFY_CART_ID_KEY);
          localStorage.removeItem(LOCAL_CART_KEY);
          cartIdRef.current = null;
          imageOverridesRef.current = {};
          try { sessionStorage.removeItem(IMAGE_OVERRIDES_KEY); } catch {}
        }
      })
      .catch(() => { /* silent — try again next load */ });
  }, []);

  useEffect(() => {
    const id = cartIdRef.current;
    if (!id) return;
    getShopifyCart(id)
      .then(cart => {
        if (!cart) {
          localStorage.removeItem(SHOPIFY_CART_ID_KEY);
          cartIdRef.current = null;
          return;
        }
        syncFromCart(cart, imageOverridesRef.current, setShopifyItems, setCheckoutUrl, cartIdRef, gangSheetImageRef.current);
      })
      .catch(() => {
        localStorage.removeItem(SHOPIFY_CART_ID_KEY);
        cartIdRef.current = null;
      });
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(localItems));
  }, [localItems]);

  const addItem = async (item: Omit<CartItem, 'id'>): Promise<string | null> => {
    if (!item.variantId) {
      const id = Math.random().toString(36).substr(2, 9);
      setLocalItems(prev => [...prev, { ...item, id }]);
      setIsCartOpen(true);
      return null;
    }

    setIsCartLoading(true);
    try {
      const attributes = [{ key: '_type', value: item.type }];
      attributes.push({ key: '_calculated_price', value: item.price.toFixed(2) });
      if (item.extraAttributes) {
        attributes.push(...item.extraAttributes);
      }

      const line: CartLineInput = {
        merchandiseId: item.variantId,
        quantity: item.quantity,
        attributes,
      };
      const currentCartId = cartIdRef.current;
      const cart = currentCartId
        ? await cartLinesAdd(currentCartId, [line])
        : await cartCreate([line]);

      if (item.image) {
        const allLines = cart.lines.edges.filter(
          e => e.node.merchandise.id === item.variantId
        );
        const matchingLine = allLines[allLines.length - 1];
        if (matchingLine) {
          setImageOverride(matchingLine.node.id, item.image);
        }
      }

      syncFromCart(cart, imageOverridesRef.current, setShopifyItems, setCheckoutUrl, cartIdRef, gangSheetImageRef.current);
      return cart.checkoutUrl;
    } catch (err) {
      console.error('Failed to add item to Shopify cart:', err);
      if (cartIdRef.current) {
        try {
          const attributes = [{ key: '_type', value: item.type }];
          attributes.push({ key: '_calculated_price', value: item.price.toFixed(2) });
          if (item.extraAttributes) {
            attributes.push(...item.extraAttributes);
          }

          const line: CartLineInput = {
            merchandiseId: item.variantId,
            quantity: item.quantity,
            attributes,
          };
          const cart = await cartCreate([line]);

          if (item.image) {
            const allLines = cart.lines.edges.filter(
              e => e.node.merchandise.id === item.variantId
            );
            const matchingLine = allLines[allLines.length - 1];
            if (matchingLine) {
              setImageOverride(matchingLine.node.id, item.image);
            }
          }

          syncFromCart(cart, imageOverridesRef.current, setShopifyItems, setCheckoutUrl, cartIdRef, gangSheetImageRef.current);
          return cart.checkoutUrl;
        } catch (e2) {
          console.error('Failed to create new cart:', e2);
        }
      }
      return null;
    } finally {
      setIsCartLoading(false);
    }
  };

  const removeItem = async (id: string) => {
    if (id.startsWith('gid://') && cartIdRef.current) {
      setIsCartLoading(true);
      try {
        removeImageOverride(id);
        const cart = await cartLinesRemove(cartIdRef.current, [id]);
        syncFromCart(cart, imageOverridesRef.current, setShopifyItems, setCheckoutUrl, cartIdRef, gangSheetImageRef.current);
      } catch (err) {
        console.error('Failed to remove Shopify cart line:', err);
      } finally {
        setIsCartLoading(false);
      }
    } else {
      setLocalItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity < 1) return;
    if (id.startsWith('gid://') && cartIdRef.current) {
      setIsCartLoading(true);
      try {
        const cart = await cartLinesUpdate(cartIdRef.current, [{ id, quantity }]);
        syncFromCart(cart, imageOverridesRef.current, setShopifyItems, setCheckoutUrl, cartIdRef, gangSheetImageRef.current);
      } catch (err) {
        console.error('Failed to update Shopify cart line:', err);
      } finally {
        setIsCartLoading(false);
      }
    } else {
      setLocalItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
    }
  };

  const clearCart = () => {
    setLocalItems([]);
    setShopifyItems([]);
    setCheckoutUrl(null);
    localStorage.removeItem(SHOPIFY_CART_ID_KEY);
    localStorage.removeItem(LOCAL_CART_KEY);
    cartIdRef.current = null;
    imageOverridesRef.current = {};
    try { sessionStorage.removeItem(IMAGE_OVERRIDES_KEY); } catch {}
  };

  const cartTotal = items.reduce((t, i) => t + i.price * i.quantity, 0);
  const cartCount = items.reduce((c, i) => c + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      cartTotal,
      cartCount,
      isCartOpen,
      setIsCartOpen,
      checkoutUrl,
      isCartLoading,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
