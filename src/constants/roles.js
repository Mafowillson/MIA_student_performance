// Plain constants (no React import) so both the data layer and the context
// layer can depend on this without the data layer reaching into UI code.
export const ROLES = {
  REGIONAL_SUPERVISOR: 'regional_supervisor',
  REGIONAL_COORDINATOR: 'regional_coordinator',
  HOD: 'hod',
  CENTER_COORDINATOR: 'center_coordinator',
  MENTOR: 'mentor',
};
