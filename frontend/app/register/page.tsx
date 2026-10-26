'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/components/store-provider';

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser } = useStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
  });

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (form.password !== form.password_confirmation) {
        setError('As senhas não coincidem.');
        return;
      }
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          nome_completo: form.name,
          email: form.email,
          telefone: form.phone,
          senha: form.password,
          endereco: {
            cep: form.zip_code,
            logradouro: form.address,
            numero: form.number,
            complemento: form.complement || null,
            bairro: form.neighborhood,
            cidade: form.city,
            uf: form.state,
          },
        }),
      });
      await refreshUser();
      const destination = new URLSearchParams(window.location.search).get('next');
      router.replace(destination === '/checkout' ? destination : '/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar sua conta.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="form-page">
      <section className="form-card form-card-wide">
        <p className="eyebrow">Seu próximo momento doce começa aqui</p>
        <h1>Criar uma conta</h1>
        <p className="form-intro">Preencha seus dados para fazer pedidos e acompanhar cada etapa.</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>Nome completo<input autoComplete="name" minLength={3} required value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
          <div className="form-row">
            <label>E-mail<input autoComplete="email" type="email" required value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
            <label>Telefone<input autoComplete="tel" inputMode="tel" pattern="[0-9]{10,11}" title="Informe DDD e número, com 10 ou 11 dígitos." required value={form.phone} onChange={(event) => update('phone', event.target.value.replace(/\D/g, '').slice(0, 11))} /></label>
          </div>
          <label>Senha <span className="field-hint">(mínimo de 12 caracteres)</span><input autoComplete="new-password" type="password" minLength={12} required value={form.password} onChange={(event) => update('password', event.target.value)} /></label>
          <label>Confirmar senha<input autoComplete="new-password" type="password" minLength={12} required value={form.password_confirmation} onChange={(event) => update('password_confirmation', event.target.value)} /></label>
          <fieldset className="address-fields">
            <legend>Endereço</legend>
            <div className="form-row">
              <label>CEP<input autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{8}" title="Informe os 8 dígitos do CEP." required value={form.zip_code} onChange={(event) => update('zip_code', event.target.value.replace(/\D/g, '').slice(0, 8))} /></label>
              <label>Estado (UF)<input autoComplete="address-level1" maxLength={2} required value={form.state} onChange={(event) => update('state', event.target.value.toUpperCase().slice(0, 2))} /></label>
            </div>
            <div className="form-row">
              <label>Logradouro<input autoComplete="address-line1" required value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
              <label>Número<input required value={form.number} onChange={(event) => update('number', event.target.value)} /></label>
            </div>
            <div className="form-row">
              <label>Complemento <span className="field-hint">(opcional)</span><input autoComplete="address-line2" value={form.complement} onChange={(event) => update('complement', event.target.value)} /></label>
              <label>Bairro<input required value={form.neighborhood} onChange={(event) => update('neighborhood', event.target.value)} /></label>
            </div>
            <label>Cidade<input autoComplete="address-level2" required value={form.city} onChange={(event) => update('city', event.target.value)} /></label>
          </fieldset>
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>
        <p className="form-switch">Já tem cadastro? <Link href="/login">Entrar</Link></p>
      </section>
    </main>
  );
}
