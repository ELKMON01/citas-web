export type ScreenType = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'dashboard';
export type UserRole = 'USER' | 'ADMIN' | 'PROFESSIONAL';

export interface User { id: string; name: string; email: string; phone?: string; roles?: string[]; }
export interface Affiliation { id: string; membershipNumber: string; plan: CatalogItem; eps: CatalogItem; regime: CatalogItem; }
export interface Profile extends User { firstName: string; lastName: string; documentType: string; documentNumber: string; affiliation?: Affiliation | null; }
export interface CatalogItem { id: string; name: string; code?: string; active?: boolean; }
export interface Specialty extends CatalogItem { durationMinutes: 30 | 60; appointmentType?: 'GENERAL' | 'SPECIALIZED'; }
export interface Professional extends CatalogItem { email?: string; active?: boolean; professionalCode?: string; licenseNumber?: string; specialties?: Specialty[]; locationIds?: string[]; }
export interface AvailabilitySlot { startAt: string; endAt?: string; }
export interface AvailableProfessional { id: string; name: string; slots: AvailabilitySlot[]; }
export type AppointmentStatus = 'APPROVED' | 'REQUESTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export interface Appointment { id: string; status: AppointmentStatus; professionalName: string; specialtyName: string; locationName: string; startAt: string; durationMinutes: number; rejectionReason?: string; }
export interface LifecycleAppointment {
  id: string;
  location: { id: string; name: string };
  professional: { id: string; displayName: string };
  specialty: { id: string; name: string };
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: AppointmentStatus;
  rejectionReason?: string;
}
export interface AppointmentStatusHistory {
  newStatus: AppointmentStatus;
  actorId: string | null;
  source: 'SYSTEM' | 'USER' | 'ADMIN';
  timestamp: string;
  reason?: string;
}
export interface ReschedulingRequest {
  id: string;
  appointmentId: string;
  requestedDate: string;
  requestedStartTime: string;
  requestedEndTime: string;
  status: string;
  reason?: string;
  createdAt?: string;
  decidedAt?: string;
}
export interface AvailabilityBlock { id: string; locationId: string; locationName?: string; startAt: string; endAt: string; }
