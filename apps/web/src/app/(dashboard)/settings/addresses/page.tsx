'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAddresses } from '@/hooks/useAddresses';
import type { UserAddress } from '@/hooks/useAddresses';

export default function AddressSettingsPage() {
  const { addresses, loading, error, createAddress, updateAddress, deleteAddress, setCurrentAddress, saving } = useAddresses();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: 'Home',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    isCurrent: false,
  });

  function resetForm() {
    setForm({ label: 'Home', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: '', isCurrent: false });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(addr: UserAddress) {
    setForm({
      label: addr.label,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      city: addr.city,
      state: addr.state || '',
      postalCode: addr.postalCode || '',
      country: addr.country,
      isCurrent: addr.isCurrent,
    });
    setEditingId(addr.id);
    setShowForm(true);
  }

  const handleSave = useCallback(async () => {
    try {
      if (editingId) {
        await updateAddress({
          id: editingId,
          label: form.label,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2 || undefined,
          city: form.city,
          state: form.state || undefined,
          postalCode: form.postalCode || undefined,
          country: form.country,
          isCurrent: form.isCurrent,
        });
      } else {
        await createAddress({
          label: form.label,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2 || undefined,
          city: form.city,
          state: form.state || undefined,
          postalCode: form.postalCode || undefined,
          country: form.country,
          isCurrent: form.isCurrent,
        });
      }
      resetForm();
    } catch {
      // Error handled by Apollo
    }
  }, [form, editingId, createAddress, updateAddress]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteAddress(id);
    } catch {
      // Error handled by Apollo
    }
  }, [deleteAddress]);

  const handleSetCurrent = useCallback(async (id: string) => {
    try {
      await setCurrentAddress(id);
    } catch {
      // Error handled by Apollo
    }
  }, [setCurrentAddress]);

  if (loading) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/settings" className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-hover transition-colors">
              <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-text-primary">My Addresses</h1>
              <p className="text-2xs text-text-muted">Manage your saved addresses.</p>
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-4 animate-pulse"><div className="h-4 bg-bg-secondary rounded w-1/2" /></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/settings" className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-hover transition-colors">
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-text-primary">My Addresses</h1>
            <p className="text-2xs text-text-muted">Manage your saved addresses. Your current address is used for nearby provider discovery.</p>
          </div>
        </div>

        {error && <div className="card p-3 border border-status-error/30 bg-status-error/5 text-status-error text-sm">{error.message}</div>}

        {/* Address List */}
        <div className="space-y-2">
          {addresses.map((addr: UserAddress) => (
            <div key={addr.id} className={`card p-4 ${addr.isCurrent ? 'border-accent-blue/40 bg-accent-blue/5' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">{addr.label}</span>
                    {addr.isCurrent && (
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-accent-blue/10 text-accent-blue font-medium">Current</span>
                    )}
                  </div>
                  <p className="text-2xs text-text-secondary mt-1">
                    {[addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!addr.isCurrent && (
                    <button
                      onClick={() => handleSetCurrent(addr.id)}
                      disabled={saving}
                      className="text-2xs px-2 py-1 rounded bg-bg-secondary text-text-secondary hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"
                    >
                      Set Current
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(addr)}
                    className="text-2xs px-2 py-1 rounded bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    disabled={saving}
                    className="text-2xs px-2 py-1 rounded bg-bg-secondary text-text-secondary hover:text-status-error hover:bg-status-error/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {addresses.length === 0 && !showForm && (
            <div className="card p-6 text-center">
              <p className="text-sm text-text-muted">No addresses saved yet.</p>
              <p className="text-2xs text-text-muted mt-1">Add an address to enable nearby provider discovery.</p>
            </div>
          )}
        </div>

        {/* Add/Edit Form */}
        {showForm ? (
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">{editingId ? 'Edit Address' : 'Add New Address'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-2xs text-text-muted mb-1">Label</label>
                <select
                  value={form.label}
                  onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-bg-input border border-border-primary rounded-lg text-text-primary focus:border-accent-blue focus:outline-none"
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-2xs text-text-muted mb-1">Country</label>
                <input
                  value={form.country}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                  placeholder="e.g. India"
                  className="w-full px-3 py-2 text-sm bg-bg-input border border-border-primary rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-2xs text-text-muted mb-1">Address Line 1</label>
                <input
                  value={form.addressLine1}
                  onChange={(e) => setForm((p) => ({ ...p, addressLine1: e.target.value }))}
                  placeholder="Street address"
                  className="w-full px-3 py-2 text-sm bg-bg-input border border-border-primary rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-2xs text-text-muted mb-1">Address Line 2 (optional)</label>
                <input
                  value={form.addressLine2}
                  onChange={(e) => setForm((p) => ({ ...p, addressLine2: e.target.value }))}
                  placeholder="Apartment, suite, floor"
                  className="w-full px-3 py-2 text-sm bg-bg-input border border-border-primary rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-2xs text-text-muted mb-1">City</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="City"
                  className="w-full px-3 py-2 text-sm bg-bg-input border border-border-primary rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-2xs text-text-muted mb-1">State / Region</label>
                <input
                  value={form.state}
                  onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                  placeholder="State"
                  className="w-full px-3 py-2 text-sm bg-bg-input border border-border-primary rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-2xs text-text-muted mb-1">Postal Code</label>
                <input
                  value={form.postalCode}
                  onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))}
                  placeholder="Postal code"
                  className="w-full px-3 py-2 text-sm bg-bg-input border border-border-primary rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isCurrent"
                  checked={form.isCurrent}
                  onChange={(e) => setForm((p) => ({ ...p, isCurrent: e.target.checked }))}
                  className="rounded border-border-primary"
                />
                <label htmlFor="isCurrent" className="text-2xs text-text-secondary">Set as current address</label>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.addressLine1 || !form.city || !form.country}
                className="px-4 py-2 text-sm font-medium bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add Address'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium bg-bg-secondary text-text-secondary rounded-lg hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full card p-3 text-sm text-accent-blue hover:bg-accent-blue/5 transition-colors text-center font-medium"
          >
            + Add New Address
          </button>
        )}
      </div>
    </div>
  );
}
