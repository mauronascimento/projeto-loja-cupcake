'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/components/store-provider';
import type { Address, User } from '@/lib/types';

const emptyAddress: Address = {
  cep: '',
  logradouro: '',
  numero: '',
  complemento: null,
  bairro: '',
  cidade: '',
  uf: '',
};

export default function AccountPage() {
  const router = useRouter();
  const { user, authLoading, refreshUser } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [addressMessage, setAddressMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setName(user.nome_completo);
    setPhone(user.telefone);
    setAddress(user.endereco);
  }, [user]);

  function updateAddress(field: keyof Address, value: string) {
    setAddress((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    setError('');
    try {
      await apiRequest<User>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          nome_completo: name.trim(),
          telefone: phone.replace(/\D/g, ''),
        }),
      });
      await refreshUser();
      setProfileMessage('Dados pessoais atualizados.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar os dados pessoais.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAddress(true);
    setAddressMessage('');
    setError('');
    try {
      await apiRequest<User>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          endereco: {
            ...address,
            cep: address.cep.replace(/\D/g, ''),
            complemento: address.complemento?.trim() || null,
            uf: address.uf.toUpperCase(),
          },
        }),
      });
      await refreshUser();
      const requestedReturn = new URLSearchParams(window.location.search).get('returnTo');
      const destination =
        requestedReturn === '/checkout' ||
        requestedReturn === '/orders'
          ? requestedReturn
          : '/account';
      if (destination !== '/account') {
        router.replace(destination);
        return;
      }
      setAddressMessage('Endereço atualizado para os próximos pedidos.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o endereço.');
    } finally {
      setSavingAddress(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage('');
    setError('');
    if (newPassword !== passwordConfirmation) {
      setError('A nova senha e a confirmação não coincidem.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('A nova senha deve ser diferente da senha atual.');
      return;
    }
    setSavingPassword(true);
    try {
      await apiRequest<void>('/users/me/password', {
        method: 'PUT',
        body: JSON.stringify({
          senha_atual: currentPassword,
          nova_senha: newPassword,
        }),
      });
      setPasswordMessage('Senha alterada. Entre novamente com sua nova senha.');
      router.replace('/login?reason=password_changed');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível alterar a senha.');
    } finally {
      setSavingPassword(false);
    }
  }

  if (authLoading) {
    return <main className="page-shell"><p className="notice">Verificando sua sessão...</p></main>;
  }
  if (!user) {
    return (
      <main className="form-page">
        <section className="form-card">
          <h1>Entre para acessar sua conta</h1>
          <Link className="primary-button button-link" href="/login?next=/account">Entrar</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="content-heading">
        <p className="eyebrow">Seus dados</p>
        <h1>Minha conta</h1>
        <p>Atualize seus dados e o endereço que será usado nos próximos pedidos.</p>
      </section>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <div className="account-sections">
        <form className="admin-form-card form-stack" onSubmit={saveProfile}>
          <h2>Dados pessoais</h2>
          <label>Nome completo
            <input autoComplete="name" maxLength={150} minLength={3} required value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>E-mail
            <input autoComplete="email" readOnly value={user.email} />
          </label>
          <label>Telefone
            <input autoComplete="tel" inputMode="numeric" maxLength={11} minLength={10} pattern="[0-9]{10,11}" required value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 11))} />
          </label>
          {profileMessage && <p className="notice notice-success" role="status">{profileMessage}</p>}
          <button className="primary-button" disabled={savingProfile} type="submit">{savingProfile ? 'Salvando...' : 'Salvar dados pessoais'}</button>
        </form>

        <form className="admin-form-card form-stack" onSubmit={saveAddress}>
          <h2>Endereço de entrega</h2>
          <div className="form-row">
            <label>CEP
              <input autoComplete="postal-code" inputMode="numeric" maxLength={8} pattern="[0-9]{8}" required value={address.cep} onChange={(event) => updateAddress('cep', event.target.value.replace(/\D/g, '').slice(0, 8))} />
            </label>
            <label>UF
              <input autoComplete="address-level1" maxLength={2} minLength={2} required value={address.uf} onChange={(event) => updateAddress('uf', event.target.value.toUpperCase().slice(0, 2))} />
            </label>
          </div>
          <div className="form-row">
            <label>Logradouro
              <input autoComplete="address-line1" maxLength={150} required value={address.logradouro} onChange={(event) => updateAddress('logradouro', event.target.value)} />
            </label>
            <label>Número
              <input maxLength={20} required value={address.numero} onChange={(event) => updateAddress('numero', event.target.value)} />
            </label>
          </div>
          <div className="form-row">
            <label>Complemento <span className="field-hint">(opcional)</span>
              <input autoComplete="address-line2" maxLength={100} value={address.complemento ?? ''} onChange={(event) => updateAddress('complemento', event.target.value)} />
            </label>
            <label>Bairro
              <input maxLength={100} required value={address.bairro} onChange={(event) => updateAddress('bairro', event.target.value)} />
            </label>
          </div>
          <label>Cidade
            <input autoComplete="address-level2" maxLength={100} required value={address.cidade} onChange={(event) => updateAddress('cidade', event.target.value)} />
          </label>
          {addressMessage && <p className="notice notice-success" role="status">{addressMessage}</p>}
          <button className="primary-button" disabled={savingAddress} type="submit">{savingAddress ? 'Salvando...' : 'Salvar endereço'}</button>
        </form>

        <form className="admin-form-card form-stack account-password" onSubmit={changePassword}>
          <h2>Segurança</h2>
          <label>Senha atual
            <input autoComplete="current-password" minLength={1} required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </label>
          <label>Nova senha <span className="field-hint">(mínimo de 12 caracteres)</span>
            <input autoComplete="new-password" minLength={12} required type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </label>
          <label>Confirmar nova senha
            <input autoComplete="new-password" minLength={12} required type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
          </label>
          {passwordMessage && <p className="notice notice-success" role="status">{passwordMessage}</p>}
          <p className="field-hint">A troca de senha encerra todas as sessões existentes.</p>
          <button className="primary-button" disabled={savingPassword} type="submit">{savingPassword ? 'Alterando...' : 'Alterar senha'}</button>
        </form>
      </div>
    </main>
  );
}
