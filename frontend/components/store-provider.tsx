'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import { MAX_ORDER_QUANTITY } from '@/lib/cart';
import type { Product, User } from '@/lib/types';
import { z } from 'zod';

type CartLine = { product: Product; quantity: number };
const productSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string(),
  nome: z.string(),
  descricao: z.string(),
  preco: z.string(),
  imagem_url: z.string(),
  quantidade_estoque: z.number().int().nonnegative(),
  ativo: z.boolean(),
});
const storedCartSchema = z.object({
  version: z.literal(1),
  items: z.array(z.object({
    product: productSchema,
    quantity: z.number().int().positive().max(999),
  })),
});
type StoreContextValue = {
  cart: CartLine[];
  cartCount: number;
  cartError: string;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartProduct: (product: Product) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  user: User | null;
  authError: string;
  authLoading: boolean;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const StoreContext = createContext<StoreContextValue | null>(null);
const CART_STORAGE_KEY = 'cupcake-store-cart';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [cartError, setCartError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(saved);
        } catch {
          parsed = null;
        }
        const candidate = Array.isArray(parsed) ? { version: 1, items: parsed } : parsed;
        const result = storedCartSchema.safeParse(candidate);
        if (!result.success) {
          let removalFailed = false;
          try {
            window.localStorage.removeItem(CART_STORAGE_KEY);
          } catch {
            removalFailed = true;
          }
          setCartError(removalFailed
            ? 'O carrinho salvo estava inválido e não pôde ser removido deste navegador.'
            : 'O carrinho salvo estava inválido e foi limpo. Escolha os produtos novamente.');
        } else {
          const merged = new Map<number, CartLine>();
          for (const line of result.data.items) {
            const existing = merged.get(line.product.id);
            const quantity = (existing?.quantity ?? 0) + line.quantity;
            if (!Number.isSafeInteger(quantity)) {
              setCartError('O carrinho salvo excede os limites de quantidade e foi limpo.');
              window.localStorage.removeItem(CART_STORAGE_KEY);
              setCart([]);
              return;
            }
            merged.set(line.product.id, { product: line.product, quantity });
          }
          setCart([...merged.values()]);
        }
      }
    } catch {
      setCartError('Não foi possível ler o carrinho salvo neste navegador.');
    } finally {
      setCartLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (cartLoaded) {
      try {
        window.localStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify({ version: 1, items: cart }),
        );
      } catch {
        setCartError('Não foi possível salvar o carrinho neste navegador.');
      }
    }
  }, [cart, cartLoaded]);

  const refreshUser = useCallback(async () => {
    try {
      const result = await apiRequest<User>('/auth/me');
      setUser(result);
      setAuthError('');
      return result;
    } catch (cause) {
      setUser(null);
      if (cause instanceof ApiError && cause.status === 401) {
        setAuthError('');
      } else {
        setAuthError('Não foi possível verificar sua sessão. Atualize a página ou tente novamente.');
      }
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    setCart((current) => {
      if (!Number.isSafeInteger(quantity) || quantity <= 0) return current;
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id
            ? {
                ...line,
                product,
                quantity: Math.min(
                  line.quantity + quantity,
                  MAX_ORDER_QUANTITY,
                  product.quantidade_estoque,
                ),
              }
            : line,
        );
      }
      return product.quantidade_estoque > 0
        ? [...current, {
            product,
            quantity: Math.min(quantity, MAX_ORDER_QUANTITY, product.quantidade_estoque),
          }]
        : current;
    });
  }, []);

  const updateCartProduct = useCallback((product: Product) => {
    setCart((current) =>
      current.map((line) =>
        line.product.id === product.id ? { ...line, product } : line,
      ),
    );
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    if (!Number.isSafeInteger(quantity)) return;
    setCart((current) =>
      quantity <= 0
        ? current.filter((line) => line.product.id !== productId)
        : current.map((line) =>
            line.product.id === productId
              ? {
                  ...line,
                  quantity: Math.min(
                    quantity,
                    MAX_ORDER_QUANTITY,
                    line.product.quantidade_estoque,
                  ),
                }
              : line,
          ),
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const logout = useCallback(async () => {
    await apiRequest<void>('/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      cart,
      cartCount: cart.reduce((sum, line) => sum + line.quantity, 0),
      cartError,
      addToCart,
      updateCartProduct,
      setQuantity,
      clearCart,
      user,
      authError,
      authLoading,
      refreshUser,
      logout,
    }),
    [addToCart, authError, authLoading, cart, cartError, clearCart, logout, refreshUser, setQuantity, updateCartProduct, user],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore precisa ser usado dentro de StoreProvider.');
  }
  return context;
}
