import { useEffect, useState } from 'react';
import { adminApi, catalogsApi, schedulingErrorMessage } from '../api/schedulingApi';
import type { CatalogItem, Professional, Specialty } from '../types';

type FormValues = {
  firstName: string; lastName: string; documentType: string; documentNumber: string;
  email: string; phone: string; temporaryPassword: string; professionalCode: string; licenseNumber: string;
};
const emptyForm: FormValues = { firstName: '', lastName: '', documentType: '', documentNumber: '', email: '', phone: '', temporaryPassword: '', professionalCode: '', licenseNumber: '' };
const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm';
const normalizeProfessional = (item: Professional): Professional => ({ ...item, id: String(item.id) });
const normalizeCatalogId = <T extends CatalogItem>(item: T): T => ({ ...item, id: String(item.id) });

export function AdminProfessionals() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [locations, setLocations] = useState<CatalogItem[]>([]);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [specialtyIds, setSpecialtyIds] = useState<string[]>([]);
  const [primarySpecialtyId, setPrimarySpecialtyId] = useState('');
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [createdId, setCreatedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    const [people, availableSpecialties, availableLocations] = await Promise.all([
      adminApi.professionals(), adminApi.specialties(), catalogsApi.locations(),
    ]);
    setProfessionals(people.map(normalizeProfessional));
    setSpecialties(availableSpecialties.map(normalizeCatalogId).filter((item) => item.active !== false));
    setLocations(availableLocations.map(normalizeCatalogId).filter((item) => item.active !== false));
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([adminApi.professionals(), adminApi.specialties(), catalogsApi.locations()])
      .then(([people, availableSpecialties, availableLocations]) => {
        if (!mounted) return;
        setProfessionals(people.map(normalizeProfessional));
        setSpecialties(availableSpecialties.map(normalizeCatalogId).filter((item) => item.active !== false));
        setLocations(availableLocations.map(normalizeCatalogId).filter((item) => item.active !== false));
      })
      .catch((cause: unknown) => { if (mounted) setError(schedulingErrorMessage(cause)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const assign = async (id: string) => {
    if (!specialtyIds.length || !primarySpecialtyId || !specialtyIds.includes(primarySpecialtyId)) {
      throw new Error('Selecciona al menos una especialidad y marca una como principal.');
    }
    if (!locationIds.length || locationIds.length > 2) throw new Error('Selecciona una o dos sedes.');
    await adminApi.assignSpecialties(id, specialtyIds, primarySpecialtyId);
    await adminApi.assignLocations(id, locationIds);
    await load();
    setCreatedId('');
    setForm(emptyForm);
    setSpecialtyIds([]);
    setPrimarySpecialtyId('');
    setLocationIds([]);
    setNotice(`Profesional ${id} creado y asignado correctamente.`);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setNotice('');
    if (!specialtyIds.length || !primarySpecialtyId || !specialtyIds.includes(primarySpecialtyId)) { setError('Selecciona especialidades y una especialidad principal.'); return; }
    if (!locationIds.length || locationIds.length > 2) { setError('Selecciona una o dos sedes.'); return; }
    setBusy(true);
    let id = '';
    try {
      const created = await adminApi.createProfessional({ ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), documentType: form.documentType.trim(), documentNumber: form.documentNumber.trim(), email: form.email.trim(), phone: form.phone.trim(), professionalCode: form.professionalCode.trim(), licenseNumber: form.licenseNumber.trim() });
      id = String(created.id);
      setCreatedId(id);
      setForm((current) => ({ ...current, temporaryPassword: '' }));
      await assign(id);
    } catch (cause) {
      setError(cause instanceof Error && !(cause instanceof TypeError) ? cause.message : schedulingErrorMessage(cause));
      if (id) setNotice(`El profesional ${id} ya existe. Puedes reintentar sus asignaciones sin crearlo de nuevo.`);
    } finally { setBusy(false); }
  };

  const retryAssignments = async () => {
    if (!createdId) return;
    setBusy(true); setError(''); setNotice('');
    try { await assign(createdId); }
    catch (cause) { setError(cause instanceof Error && !(cause instanceof TypeError) ? cause.message : schedulingErrorMessage(cause)); setNotice(`El profesional ${createdId} ya existe; corrige o reintenta las asignaciones.`); }
    finally { setBusy(false); }
  };

  const toggleLocation = (id: string) => setLocationIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : current);
  const toggleSpecialty = (id: string) => setSpecialtyIds((current) => {
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    if (!next.includes(primarySpecialtyId)) setPrimarySpecialtyId(next[0] ?? '');
    return next;
  });

  const toggleActive = async (professional: Professional) => {
    setBusy(true); setError(''); setNotice('');
    try { await adminApi.setActive(String(professional.id), professional.active === false); await load(); setNotice(`${professional.name}: ${professional.active === false ? 'activado' : 'desactivado'}.`); }
    catch (cause) { setError(schedulingErrorMessage(cause)); }
    finally { setBusy(false); }
  };

  return <section className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5" aria-labelledby="admin-professionals-title">
    <header><h2 id="admin-professionals-title" className="text-lg font-bold">Profesionales</h2><p className="mt-1 text-sm text-slate-500">Crea la cuenta profesional y asígnale especialidades y hasta dos sedes.</p></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-xs text-slate-600">Nombres<input required maxLength={80} disabled={Boolean(createdId)} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={`${inputClass} mt-1 block disabled:bg-slate-50`} /></label>
      <label className="text-xs text-slate-600">Apellidos<input required maxLength={80} disabled={Boolean(createdId)} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={`${inputClass} mt-1 block disabled:bg-slate-50`} /></label>
      <label className="text-xs text-slate-600">Tipo de documento<input required maxLength={20} disabled={Boolean(createdId)} placeholder="CC, CE…" value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })} className={`${inputClass} mt-1 block disabled:bg-slate-50`} /></label>
      <label className="text-xs text-slate-600">Número de documento<input required maxLength={40} disabled={Boolean(createdId)} value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} className={`${inputClass} mt-1 block disabled:bg-slate-50`} /></label>
      <label className="text-xs text-slate-600">Correo<input required type="email" maxLength={160} autoComplete="off" disabled={Boolean(createdId)} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputClass} mt-1 block disabled:bg-slate-50`} /></label>
      <label className="text-xs text-slate-600">Teléfono<input required maxLength={30} disabled={Boolean(createdId)} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${inputClass} mt-1 block disabled:bg-slate-50`} /></label>
      <label className="text-xs text-slate-600">Código profesional<input required disabled={Boolean(createdId)} value={form.professionalCode} onChange={(e) => setForm({ ...form, professionalCode: e.target.value })} className={`${inputClass} mt-1 block disabled:bg-slate-50`} /></label>
      <label className="text-xs text-slate-600">Número de licencia<input required disabled={Boolean(createdId)} value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} className={`${inputClass} mt-1 block disabled:bg-slate-50`} /></label>
      <label className="text-xs text-slate-600">Contraseña inicial<input required={!createdId} type="password" autoComplete="new-password" value={form.temporaryPassword} onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })} className={`${inputClass} mt-1 block`} disabled={Boolean(createdId)} /></label>

      <fieldset className="rounded-xl border border-slate-200 p-3 sm:col-span-2 lg:col-span-3"><legend className="px-1 text-xs font-medium text-slate-700">Especialidades · selecciona al menos una</legend>{specialties.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{specialties.map((specialty) => <label key={specialty.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={specialtyIds.includes(specialty.id)} onChange={() => toggleSpecialty(specialty.id)} disabled={busy || Boolean(createdId)} />{specialty.name}</label>)}</div> : <p className="text-sm text-slate-500">No hay especialidades activas.</p>}<label className="mt-3 block text-xs text-slate-600">Especialidad principal<select required value={primarySpecialtyId} onChange={(e) => setPrimarySpecialtyId(e.target.value)} className={`${inputClass} mt-1 block max-w-md`} disabled={busy || Boolean(createdId)}><option value="">Selecciona una especialidad</option>{specialties.filter((item) => specialtyIds.includes(item.id)).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></fieldset>

      <fieldset className="rounded-xl border border-slate-200 p-3 sm:col-span-2 lg:col-span-3"><legend className="px-1 text-xs font-medium text-slate-700">Sedes · selecciona una o dos</legend>{locations.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{locations.map((location) => <label key={location.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={locationIds.includes(location.id)} onChange={() => toggleLocation(location.id)} disabled={busy || Boolean(createdId) || (!locationIds.includes(location.id) && locationIds.length >= 2)} />{location.name}</label>)}</div> : <p className="text-sm text-slate-500">No hay sedes activas.</p>}</fieldset>

      {createdId ? <button type="button" onClick={() => void retryAssignments()} disabled={busy} className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2 lg:col-span-3">{busy ? 'Guardando asignaciones…' : `Reintentar asignaciones del profesional ${createdId}`}</button> : <button type="submit" disabled={busy || loading || !specialties.length || !locations.length} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2 lg:col-span-3">{busy ? 'Creando profesional…' : 'Crear profesional y asignar'}</button>}
    </form>
    <div className="border-t border-slate-100 pt-4"><h3 className="mb-3 text-sm font-semibold">Profesionales registrados</h3>{loading ? <p role="status" className="text-sm text-slate-500">Cargando profesionales…</p> : professionals.length ? <ul className="divide-y divide-slate-100">{professionals.map((professional) => <li key={professional.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium text-slate-800">{professional.name} <span className="font-normal text-slate-500">· ID {professional.id}</span></p><p className="text-xs text-slate-500">{professional.email} · Código {professional.professionalCode} · Licencia {professional.licenseNumber}</p></div><button type="button" disabled={busy} onClick={() => void toggleActive(professional)} className={`rounded-lg px-3 py-2 text-xs font-medium ${professional.active === false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{professional.active === false ? 'Activar' : 'Desactivar'}</button></li>)}</ul> : <p className="text-sm text-slate-500">Aún no hay profesionales registrados.</p>}</div>
  </section>;
}
