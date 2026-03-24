import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const CART_STORAGE_KEY = 'securecart_cart';

function loadStoredCart() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = JSON.parse(saved || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => loadStoredCart());

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function addItem(product) {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      const maxStock = Number(product?.stock ?? 0);

      if (maxStock <= 0) return prev;

      if (existing) {
        return prev.map(i => {
          if (i.id !== product.id) return i;

          const nextQuantity = Math.min(Number(i.quantity) + 1, maxStock);
          return { ...i, quantity: nextQuantity };
        });
      }

      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function removeItem(productId) {
    setItems(prev => prev.filter(i => i.id !== productId));
  }

  function updateQuantity(productId, qty) {
    setItems(prev =>
      prev.flatMap(item => {
        if (item.id !== productId) return [item];

        const maxStock = Number(item?.stock ?? 0);
        const safeQty = Number(qty);

        if (!Number.isFinite(safeQty) || safeQty < 1) {
          return [];
        }

        if (maxStock <= 0) {
          return [];
        }

        return [
          {
            ...item,
            quantity: Math.min(safeQty, maxStock),
          },
        ];
      })
    );
  }

  function clearCart() {
    setItems([]);
  }

  const total = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0),
    [items]
  );

  const count = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.quantity), 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      total,
      count,
    }),
    [items, total, count]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}