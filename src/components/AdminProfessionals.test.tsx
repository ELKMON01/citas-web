import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProfessionals } from './AdminProfessionals';

const api = vi.hoisted(() => ({
  professionals: vi.fn(), specialties: vi.fn(), createProfessional: vi.fn(),
  assignSpecialties: vi.fn(), assignLocations: vi.fn(), setActive: vi.fn(),
  locations: vi.fn(),
}));

vi.mock('../api/schedulingApi', () => ({
  adminApi: {
    professionals: api.professionals,
    specialties: api.specialties,
    createProfessional: api.createProfessional,
    assignSpecialties: api.assignSpecialties,
    assignLocations: api.assignLocations,
    setActive: api.setActive,
  },
  catalogsApi: { locations: api.locations },
  schedulingErrorMessage: () => 'No fue posible completar la operación.',
}));

describe('AdminProfessionals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.professionals.mockResolvedValue([]);
    api.specialties.mockResolvedValue([{ id: '11', name: 'Medicina general', active: true }]);
    api.locations.mockResolvedValue([{ id: '5', name: 'Sede central', active: true }]);
    api.createProfessional.mockResolvedValue({ id: 42 });
    api.assignSpecialties.mockResolvedValue(undefined);
    api.assignLocations.mockResolvedValue(undefined);
    api.setActive.mockResolvedValue(undefined);
  });

  async function fillForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Nombres'), 'Ada');
    await user.type(screen.getByLabelText('Apellidos'), 'Prueba');
    await user.type(screen.getByLabelText('Tipo de documento'), 'CC');
    await user.type(screen.getByLabelText('Número de documento'), 'SYNTHETIC-42');
    await user.type(screen.getByLabelText('Correo'), 'ada@example.test');
    await user.type(screen.getByLabelText('Teléfono'), '3000000000');
    await user.type(screen.getByLabelText('Código profesional'), 'PRO-42');
    await user.type(screen.getByLabelText('Número de licencia'), 'LIC-42');
    await user.type(screen.getByLabelText('Contraseña inicial'), 'synthetic-local-password');
    await user.click(screen.getByLabelText('Medicina general'));
    await user.selectOptions(screen.getByLabelText('Especialidad principal'), '11');
    await user.click(screen.getByLabelText('Sede central'));
  }

  it('crea un profesional y le asigna especialidad principal y sede', async () => {
    const user = userEvent.setup();
    render(<AdminProfessionals />);
    await screen.findByText('Aún no hay profesionales registrados.');
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Crear profesional y asignar' }));

    await screen.findByText('Profesional 42 creado y asignado correctamente.');
    expect(api.createProfessional).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'Ada', lastName: 'Prueba', email: 'ada@example.test', temporaryPassword: 'synthetic-local-password',
    }));
    expect(api.assignSpecialties).toHaveBeenCalledWith('42', ['11'], '11');
    expect(api.assignLocations).toHaveBeenCalledWith('42', ['5']);
  });

  it('permite reintentar asignaciones sin crear un segundo profesional', async () => {
    const user = userEvent.setup();
    api.assignLocations.mockRejectedValueOnce(new Error('Fallo de prueba'));
    render(<AdminProfessionals />);
    await screen.findByText('Aún no hay profesionales registrados.');
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Crear profesional y asignar' }));

    const retry = await screen.findByRole('button', { name: 'Reintentar asignaciones del profesional 42' });
    expect(await screen.findByText(/ya existe/)).toBeInTheDocument();
    await user.click(retry);
    await screen.findByText('Profesional 42 creado y asignado correctamente.');
    expect(api.createProfessional).toHaveBeenCalledTimes(1);
    expect(api.assignLocations).toHaveBeenCalledTimes(2);
  });

  it('permite activar y desactivar una cuenta desde el listado ADMIN', async () => {
    const user = userEvent.setup();
    api.professionals.mockResolvedValue([{ id: '7', name: 'Dra. Sintética', email: 'doctor@example.test', professionalCode: 'PRO-7', licenseNumber: 'LIC-7', active: true }]);
    render(<AdminProfessionals />);
    await screen.findByText('Dra. Sintética');
    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(api.setActive).toHaveBeenCalledWith('7', false));
  });
});
