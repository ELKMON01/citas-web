import { beforeEach, describe, expect, it, vi } from 'vitest';

const response = (body: unknown, status = 200) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('lifecycleApi', () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks(); });

  it('envía filtros y decisiones por las rutas S4 aprobadas', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(response([]))); vi.stubGlobal('fetch', fetchMock);
    const { lifecycleApi } = await import('./schedulingApi');
    await lifecycleApi.myAppointments({ status: 'APPROVED', from: '2026-09-01', to: '2026-09-30' });
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8080/api/v1/user/appointments?status=APPROVED&from=2026-09-01&to=2026-09-30');
    await lifecycleApi.pendingReschedules({ locationId: '3', professionalId: '8', specialtyId: '4', date: '2026-09-25' });
    expect(fetchMock.mock.calls[1][0]).toContain('/api/v1/admin/rescheduling-requests?locationId=3&professionalId=8&specialtyId=4&date=2026-09-25');
    await lifecycleApi.decideReschedule('r-1', 'REJECT', 'No hay disponibilidad');
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ decision: 'REJECT', reason: 'No hay disponibilidad' }) });
  });

  it('envía filtros de agenda, bearer auth cuando existe y cierre como PATCH JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(undefined, 204)); vi.stubGlobal('fetch', fetchMock);
    const { lifecycleApi } = await import('./schedulingApi');
    await lifecycleApi.professionalAppointments({ from: '2026-09-25', to: '2026-09-25', locationId: '2' });
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/professional/appointments?from=2026-09-25&to=2026-09-25&locationId=2');
    await lifecycleApi.closeAppointment('a-1', 'NO_SHOW');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ status: 'NO_SHOW' }) });
  });

  it('consulta disponibilidad para la misma sede, especialidad y profesional al reprogramar', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([])); vi.stubGlobal('fetch', fetchMock);
    const { lifecycleApi } = await import('./schedulingApi');
    await lifecycleApi.rescheduleAvailability({ locationId: '2', specialtyId: '3', professionalId: '9', date: '2026-09-26' });
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/availability?locationId=2&specialtyId=3&professionalId=9&date=2026-09-26');
  });

  it.each([403, 409])('preserva Problem Details para HTTP %s', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ detail: 'No permitido o conflicto' }, status)));
    const { lifecycleApi, SchedulingApiError } = await import('./schedulingApi');
    await expect(lifecycleApi.myAppointments()).rejects.toMatchObject({ name: 'SchedulingApiError', status, message: 'No permitido o conflicto' });
    expect(SchedulingApiError).toBeDefined();
  });
});
