'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/components/store-provider';
import { ApiError, apiRequest } from '@/lib/api';
import { formatCents, toCents } from '@/lib/money';
import { useCartReconciliation } from '@/lib/use-cart-reconciliation';
import type { Order } from '@/lib/types';
import { z } from 'zod';

const IDEMPOTENCY_STORAGE_KEY = 'cupcake-store-checkout-pending';
const paymentMethodSchema = z.enum(['PIX', 'CARTAO', 'DINHEIRO']);
type PaymentMethod = z.infer<typeof paymentMethodSchema>;
const checkoutPayloadSchema = z.object({
  items: z.array(z.object({
    produto_id: z.number().int().positive(),
    quantidade: z.number().int().positive().max(999),
    preco_unitario_esperado: z.string().regex(/^\d{1,8}\.\d{2}$/),
  })).min(1).max(50),
  forma_pagamento: paymentMethodSchema,
});
const pendingRequestSchema = z.object({
  key: z.string().uuid(),
  fingerprint: z.string(),
  payload: checkoutPayloadSchema,
}).refine((request) => request.fingerprint === JSON.stringify(request.payload));
type PendingRequest = z.infer<typeof pendingRequestSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart, user, authLoading } = useStore();
  const { needsReview, loading: checkingCart } = useCartReconciliation();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [pendingLoaded, setPendingLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
      if (!saved) return;
      const parsed: unknown = JSON.parse(saved);
      const result = pendingRequestSchema.safeParse(parsed);
      if (result.success) setPendingRequest(result.data);
      else {
        try {
          window.sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
        } catch {
          setError('Os dados da tentativa anterior estavam inválidos e não puderam ser removidos desta aba.');
        }
        setError('Os dados da tentativa anterior estavam inválidos. Revise o carrinho antes de continuar.');
      }
    } catch {
      setError('Não foi possível recuperar uma tentativa de checkout salva nesta aba.');
    } finally {
      setPendingLoaded(true);
    }
  }, []);

  function createPayload(method: PaymentMethod) {
    return {
      items: cart.map(({ product, quantity }) => ({
        produto_id: product.id,
        quantidade: quantity,
        preco_unitario_esperado: product.preco,
      })).sort((left, right) => left.produto_id - right.produto_id),
      forma_pagamento: method,
    };
  }

  async function sendOrder(request: PendingRequest) {
    setError('');
    setSubmitting(true);
    try {
      const order = await apiRequest<Order>('/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': request.key },
        body: JSON.stringify(request.payload),
      });
      try {
        window.sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
      } catch {
        setError('Pedido confirmado. A chave salva não pôde ser removida desta aba.');
      }
      setPendingRequest(null);
      const currentPayload = paymentMethod ? JSON.stringify(createPayload(paymentMethod)) : '';
      if (currentPayload === JSON.stringify(request.payload)) clearCart();
      router.replace(`/orders/${order.id}?created=1`);
    } catch (cause) {
      const definitiveRejection = cause instanceof ApiError &&
        cause.status >= 400 &&
        cause.status < 500 &&
        cause.status !== 429;
      if (definitiveRejection) {
        let message = cause.message;
        try {
          window.sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
          setPendingRequest(null);
        } catch {
          message += ' A tentativa salva não pôde ser removida desta aba.';
        }
        setError(message);
      }
      if (!definitiveRejection) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível finalizar o pedido.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (needsReview || !paymentMethod || submitting) return;
    const payload = createPayload(paymentMethod);
    if (pendingRequest) {
      const fingerprint = JSON.stringify(payload);
      if (pendingRequest.fingerprint !== fingerprint) {
        setError('Há uma tentativa anterior que pode ter sido concluída. Repita a tentativa salva antes de enviar alterações.');
        return;
      }
      void sendOrder(pendingRequest);
      return;
    }
    const request = {
      key: window.crypto.randomUUID(),
      payload,
      fingerprint: JSON.stringify(payload),
    };
    try {
      window.sessionStorage.setItem(IDEMPOTENCY_STORAGE_KEY, JSON.stringify(request));
      setPendingRequest(request);
    } catch {
      setError('Não foi possível guardar a chave de segurança do pedido. Tente novamente neste navegador.');
      return;
    }
    void sendOrder(request);
  }

  function retryPendingRequest() {
    if (!pendingRequest || submitting) return;
    void sendOrder(pendingRequest);
  }

  if (authLoading) {
    return <main className="form-page"><p className="notice">Verificando sua sessão...</p></main>;
  }

  if (!user) {
    return (
      <main className="form-page">
        <section className="form-card">
          <p className="eyebrow">Quase lá</p>
          <h1>Entre para finalizar</h1>
          <p className="form-intro">Seu carrinho está salvo neste navegador. Entre ou crie uma conta para fazer o pedido.</p>
          <Link className="primary-button button-link full-width" href="/login?next=/checkout">Entrar</Link>
          <p className="form-switch">Primeira vez por aqui? <Link href="/register?next=/checkout">Criar conta</Link></p>
        </section>
      </main>
    );
  }

  if (user.perfil !== 'CLIENTE') {
    return <main className="form-page"><section className="form-card"><h1>Checkout indisponível</h1><p>Contas administrativas usam o painel e não fazem pedidos de cliente.</p><Link href="/admin" className="text-link">Ir para o painel</Link></section></main>;
  }

  if (cart.length === 0) {
    return <main className="form-page"><section className="form-card"><h1>Carrinho vazio</h1><p>Adicione produtos ao carrinho antes de finalizar.</p><Link href="/" className="text-link">Voltar ao cardápio</Link></section></main>;
  }

  const subtotalCents = cart.reduce(
    (sum, line) =>
      sum +
      toCents(line.product.preco) * line.quantity,
    0,
  );
  const subtotal = formatCents(subtotalCents);

  return (
    <main className="form-page">
      <section className="form-card">
        <p className="eyebrow">Pagamento demonstrativo</p>
        <h1>Finalizar pedido</h1>
        <p className="form-intro">Nenhuma cobrança será realizada. O método escolhido serve apenas para registro da demonstração.</p>
        <div className="checkout-total"><span>Total</span><strong>{subtotal}</strong></div>
        <p className="checkout-address"><strong>Endereço cadastrado</strong><br />{[user.endereco.logradouro, user.endereco.numero, user.endereco.bairro, user.endereco.cidade, user.endereco.uf, user.endereco.cep].filter(Boolean).join(' · ')}<br /><Link href="/account?returnTo=/checkout">Alterar endereço</Link></p>
        {checkingCart && <p className="notice">Conferindo preço e estoque dos produtos...</p>}
        {!checkingCart && needsReview && (
          <p className="notice notice-error" role="alert">O carrinho precisa de revisão antes do pagamento. <Link href="/cart">Revisar carrinho</Link></p>
        )}
        {pendingRequest && (
          <p className="notice" role="status">Existe uma tentativa de pedido salva nesta aba. Repeti-la com a mesma chave é seguro e evita duplicidade.</p>
        )}
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Forma de pagamento
            <select
              required
              value={paymentMethod}
              onChange={(event) => {
                const result = paymentMethodSchema.safeParse(event.target.value);
                setPaymentMethod(result.success ? result.data : '');
              }}
            >
              <option value="" disabled>Selecione uma forma de pagamento</option>
              <option value="PIX">PIX demonstrativo</option>
              <option value="CARTAO">Cartão demonstrativo</option>
              <option value="DINHEIRO">Dinheiro</option>
            </select>
          </label>
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={!pendingLoaded || submitting || checkingCart || needsReview || Boolean(pendingRequest)} type="submit">
            {submitting ? 'Finalizando...' : pendingRequest ? 'Tentativa de pedido pendente' : 'Confirmar pedido'}
          </button>
          {pendingRequest && <button className="secondary-button" disabled={submitting} onClick={retryPendingRequest} type="button">Repetir tentativa salva com segurança</button>}
          <Link className="text-link center-text" href="/cart">Voltar ao carrinho</Link>
        </form>
      </section>
    </main>
  );
}
