'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import type { Product } from '@/lib/types';

export default function NewAdminProductPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [initialStock, setInitialStock] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const product = await apiRequest<Product>('/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          nome: name.trim(),
          descricao: description.trim(),
          preco: price.replace(',', '.'),
          quantidade_inicial: Number(initialStock),
        }),
      });
      router.replace(`/admin/products/${product.id}/edit?created=1`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível cadastrar o produto.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-content">
      <div className="admin-page-heading">
        <div><h2>Novo produto</h2><p>O estoque inicial gera um movimento auditável.</p></div>
        <Link className="text-link" href="/admin/products">Voltar para produtos</Link>
      </div>
      <form className="admin-form-card form-stack" onSubmit={submit}>
        <label>Nome do produto<input maxLength={150} minLength={2} required value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Descrição<textarea maxLength={2000} minLength={5} required rows={5} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <div className="form-row">
          <label>Preço (R$)<input inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" required value={price} onChange={(event) => setPrice(event.target.value)} /></label>
          <label>Estoque inicial<input min="0" max="2147483647" type="number" required value={initialStock} onChange={(event) => setInitialStock(event.target.value)} /></label>
        </div>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <div className="admin-form-actions">
          <Link className="secondary-button button-link" href="/admin/products">Cancelar</Link>
          <button className="primary-button" disabled={saving} type="submit">{saving ? 'Salvando...' : 'Cadastrar produto'}</button>
        </div>
      </form>
    </section>
  );
}
