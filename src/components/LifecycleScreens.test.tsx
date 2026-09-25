import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SchedulingApiError } from '../api/schedulingApi';
import { AdminReschedulingQueue, ProfessionalAgenda, UserAppointments } from './LifecycleScreens';
import type { LifecycleAppointment } from '../types';

const api = vi.hoisted(() => ({
  myAppointments: vi.fn(), myAppointment: vi.fn(), cancel: vi.fn(), reschedule: vi.fn(), rescheduleAvailability: vi.fn(),
  pendingReschedules: vi.fn(), decideReschedule: vi.fn(), professionalAppointments: vi.fn(),
  closeAppointment: vi.fn(), statusHistory: vi.fn(), locations: vi.fn(),
}));

vi.mock('../api/schedulingApi', () => ({
  catalogsApi: { locations: api.locations },
  lifecycleApi: {
    myAppointments: api.myAppointments, myAppointment: api.myAppointment, cancel: api.cancel,
    reschedule: api.reschedule, rescheduleAvailability: api.rescheduleAvailability, pendingReschedules: api.pendingReschedules,
    decideReschedule: api.decideReschedule, professionalAppointments: api.professionalAppointments,
    closeAppointment: api.closeAppointment, statusHistory: api.statusHistory,
  },
  SchedulingApiError: class SchedulingApiError extends Error {
    constructor(public readonly status: number, message = 'Request failed') { super(message); }
  },
  schedulingErrorMessage: (error: unknown) => error instanceof Error ? error.message : 'Unexpected error',
}));

const appointment = {
  id: '42', location: { id: '2', name: 'HIC' }, professional: { id: '9', displayName: 'Dra. Ana Ruiz' },
  specialty: { id: '3', name: 'Cardiología' }, date: '2099-05-14', startTime: '14:00', endTime: '14:30',
  durationMinutes: 30, status: 'APPROVED' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.myAppointments.mockResolvedValue([]);
  api.myAppointment.mockResolvedValue(appointment);
  api.cancel.mockResolvedValue(undefined);
  api.reschedule.mockResolvedValue({ id: 'r1', appointmentId: '42', requestedDate: '2099-05-15', requestedStartTime: '15:00', requestedEndTime: '15:30', status: 'PENDING' });
  api.rescheduleAvailability.mockResolvedValue([{ professionalId: 9, professionalName: 'Dra. Ana Ruiz', startAt: '2099-05-15T15:00:00', endAt: '2099-05-15T15:30:00' }]);
  api.pendingReschedules.mockResolvedValue([]);
  api.decideReschedule.mockResolvedValue(undefined);
  api.professionalAppointments.mockResolvedValue([]);
  api.closeAppointment.mockResolvedValue(undefined);
  api.statusHistory.mockResolvedValue([]);
  api.locations.mockResolvedValue([{ id: '2', name: 'HIC' }]);
});

describe('lifecycle screens', () => {
  it('shows loading then an empty state for the USER appointment list', async () => {
    let resolve!: (items: LifecycleAppointment[]) => void;
    api.myAppointments.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    render(<UserAppointments />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tus citas');
    resolve([]);
    expect(await screen.findByText('No encontramos citas con estos filtros.')).toBeInTheDocument();
  });

  it('filters the USER appointment list by status and date', async () => {
    const user = userEvent.setup();
    render(<UserAppointments />);
    await screen.findByText('No encontramos citas con estos filtros.');
    await user.selectOptions(screen.getByLabelText('Estado'), 'APPROVED');
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2099-05-01' } });
    await waitFor(() => expect(api.myAppointments).toHaveBeenLastCalledWith({ status: 'APPROVED', from: '2099-05-01', to: undefined }));
  });

  it('submits a rescheduling request and leaves the old appointment visible', async () => {
    const user = userEvent.setup();
    api.myAppointments.mockResolvedValue([appointment]);
    render(<UserAppointments />);
    await screen.findByText('Cardiología');
    fireEvent.change(screen.getByLabelText('Nueva fecha'), { target: { value: '2099-05-15' } });
    await user.selectOptions(await screen.findByLabelText('Nuevo horario'), '15:00');
    await user.click(screen.getByRole('button', { name: 'Solicitar cambio' }));
    expect(await screen.findByText(/tu horario actual se conserva/i)).toBeInTheDocument();
    expect(api.rescheduleAvailability).toHaveBeenCalledWith({ locationId: '2', specialtyId: '3', professionalId: '9', date: '2099-05-15' });
    expect(api.reschedule).toHaveBeenCalledWith('42', '2099-05-15', '15:00');
    expect(screen.getByRole('article')).toHaveTextContent(/2099-05-14.*14:00.*14:30.*30 min/);
  });

  it('shows a 403 access error instead of an empty success state', async () => {
    api.myAppointments.mockRejectedValueOnce(new SchedulingApiError(403, 'Forbidden'));
    render(<UserAppointments />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso');
  });

  it('shows a 409 conflict when rescheduling loses a slot race', async () => {
    const user = userEvent.setup();
    api.myAppointments.mockResolvedValue([appointment]);
    api.reschedule.mockRejectedValueOnce(new SchedulingApiError(409, 'Conflict'));
    render(<UserAppointments />);
    await screen.findByText('Cardiología');
    fireEvent.change(screen.getByLabelText('Nueva fecha'), { target: { value: '2099-05-15' } });
    await user.selectOptions(await screen.findByLabelText('Nuevo horario'), '15:00');
    await user.click(screen.getByRole('button', { name: 'Solicitar cambio' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/La cita o franja/);
  });

  it('lets a USER cancel and read the appointment history', async () => {
    const user = userEvent.setup();
    api.myAppointments.mockResolvedValue([appointment]);
    api.statusHistory.mockResolvedValue([{ newStatus: 'APPROVED', actorId: null, source: 'SYSTEM', timestamp: '2099-05-01T12:00:00Z' }]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<UserAppointments />);
    await screen.findByText('Cardiología');
    await user.click(screen.getByRole('button', { name: 'Historial' }));
    expect(await screen.findByText('Historial de estados')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar cita' }));
    await waitFor(() => expect(api.cancel).toHaveBeenCalledWith('42'));
    expect(await screen.findByText('Cita cancelada.')).toBeInTheDocument();
  });

  it('queries the PROFESSIONAL agenda for a day or a week at the selected location', async () => {
    const user = userEvent.setup();
    render(<ProfessionalAgenda />);
    await waitFor(() => expect(api.professionalAppointments).toHaveBeenCalled());
    await user.selectOptions(await screen.findByLabelText('Sede'), '2');
    await user.click(screen.getByRole('button', { name: 'Semana' }));
    await waitFor(() => expect(api.professionalAppointments).toHaveBeenLastCalledWith(expect.objectContaining({ locationId: '2' })));
    const filters = api.professionalAppointments.mock.lastCall?.[0];
    expect(filters.to >= filters.from).toBe(true);
  });

  it('requires a reason before ADMIN can reject a pending reschedule', async () => {
    const user = userEvent.setup();
    api.pendingReschedules.mockResolvedValue([{ id: 'r1', appointmentId: '42', requestedDate: '2099-05-15', requestedStartTime: '15:00', requestedEndTime: '15:30', status: 'PENDING' }]);
    render(<AdminReschedulingQueue />);
    await screen.findByText('Solicitudes de reprogramación');
    const reject = screen.getByRole('button', { name: 'Rechazar' });
    expect(reject).toBeDisabled();
    await user.type(screen.getByLabelText('Motivo para solicitud r1'), 'Agenda no disponible');
    await user.click(reject);
    await waitFor(() => expect(api.decideReschedule).toHaveBeenCalledWith('r1', 'REJECT', 'Agenda no disponible'));
  });

  it('closes only ended approved appointments in the PROFESSIONAL agenda', async () => {
    const user = userEvent.setup();
    api.professionalAppointments.mockResolvedValue([{
      ...appointment, date: '2000-01-01', status: 'APPROVED',
    }]);
    render(<ProfessionalAgenda />);
    await screen.findByText('Cardiología');
    await user.click(screen.getByRole('button', { name: 'Marcar completada' }));
    await waitFor(() => expect(api.closeAppointment).toHaveBeenCalledWith('42', 'COMPLETED'));
  });

  it('does not allow cancelling or rescheduling an appointment that has already started', async () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const started = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(Date.now() - 15 * 60_000));
    api.myAppointments.mockResolvedValue([{ ...appointment, date: today, startTime: started, endTime: '23:59' }]);
    render(<UserAppointments />);
    await screen.findByRole('article');
    expect(screen.queryByRole('button', { name: 'Cancelar cita' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Solicitar cambio' })).not.toBeInTheDocument();
  });
});
