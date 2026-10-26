'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import { MAX_ORDER_QUANTITY } from '@/lib/cart';
import { useStore } from '@/components/store-provider';
import type { Product } from '@/lib/types';

type ReconciliationIssue =
  | { kind: 'unavailable'; message: string }
  | { kind: 'request'; message: string };

export function useCartReconciliation() {
  const { cart, updateCartProduct } = useStore();
  const [currentProducts, setCurrentProducts] = useState<Record<number, Product>>({});
  const [issues, setIssues] = useState<Record<number, ReconciliationIssue>>({});
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    if (cart.length === 0) {
      setCurrentProducts({});
      setIssues({});
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    const checkProducts = async () => {
      const current: Record<number, Product> = {};
      const failures: Record<number, ReconciliationIssue> = {};
      await Promise.all(cart.map(async ({ product }) => {
        try {
          current[product.id] = await apiRequest<Product>(
            `/products/${encodeURIComponent(product.slug)}`,
          );
        } catch (cause) {
          failures[product.id] = cause instanceof ApiError && cause.status === 404
            ? { kind: 'unavailable', message: 'Este produto não está mais disponível.' }
            : { kind: 'request', message: 'Não foi possível verificar preço e estoque.' };
        }
      }));
      if (!active) return;
      setCurrentProducts(current);
      setIssues(failures);
      setLoading(false);
    };
    void checkProducts();
    return () => {
      active = false;
    };
  }, [cart, retryKey]);

  const acceptCurrentProduct = useCallback((productId: number) => {
    const current = currentProducts[productId];
    if (current) updateCartProduct(current);
  }, [currentProducts, updateCartProduct]);

  const retry = useCallback(() => setRetryKey((current) => current + 1), []);
  const hasUnresolvedIssue = Object.keys(issues).length > 0;
  const needsReview = cart.some(({ product, quantity }) => {
    const current = currentProducts[product.id];
    return Boolean(
      issues[product.id] ||
      !current ||
      current.preco !== product.preco ||
      quantity > current.quantidade_estoque ||
      quantity > MAX_ORDER_QUANTITY,
    );
  });

  return {
    currentProducts,
    issues,
    loading,
    retry,
    acceptCurrentProduct,
    needsReview: loading || hasUnresolvedIssue || needsReview,
  };
}
