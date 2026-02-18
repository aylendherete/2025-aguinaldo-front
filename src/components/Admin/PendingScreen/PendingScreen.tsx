import { PendingDoctor } from "#/models/Admin";
import { SignInResponse } from "#/models/Auth";
import { useAuthMachine } from "#/providers/AuthProvider";
import { useMachines } from "#/providers/MachineProvider";
import { 
  Box, 
  Typography,
  Paper,
  Avatar,
  Chip
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import PendingCard from "#/components/shared/PendingCard/PendingCard";
import "../AdminDashboard.css";
import "./PendingScreen.css";


export default function PendingScreen() {
  const { authState } = useAuthMachine();
  const user = authState.context.authResponse as SignInResponse | null;
  const { adminUserState, adminUserSend } = useMachines();
  const adminContext = adminUserState.context;

  const pendingDoctors = adminContext.pendingDoctors || [];

    return (
    <Box className="pending-main-container">
      {/* Header Section */}
      <Box className="shared-header">
        <Box className="shared-header-layout">
          <Box className="shared-header-content">
            <Avatar className="shared-header-icon">
              <PendingActionsIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" className="shared-header-title">
                Solicitudes Pendientes
              </Typography>
              <Typography variant="h6" className="shared-header-subtitle">
                Gestionar solicitudes de registro de médicos
              </Typography>
            </Box>
          </Box>
          <Box className="shared-header-spacer"></Box>
        </Box>
      </Box>

      <Box maxWidth="lg" className="pending-content-container" sx={{ mx: 'auto', px: 3 }}>
        {/* Pending Doctors List */}
        {pendingDoctors.length > 0 ? (
          <Box>
            <Box className="pending-status-chip-container">
              <Chip 
                label={`${pendingDoctors.length} solicitud(es) pendiente(s)`}
                className="pending-status-chip"
              />
            </Box>
            
            <Box className="pending-cards-container">
              {pendingDoctors.map((doctor: PendingDoctor) => (
                <PendingCard
                  key={doctor.id}
                  id={doctor.id}
                  title={`${doctor.gender === "FEMALE" ? "Dra. " : "Dr. "} ${doctor.name} ${doctor.surname}`}
                  avatarContent={<PersonIcon sx={{ fontSize: 28 }} />}
                  onApprove={(id) => adminUserSend({ 
                    type: 'APPROVE_DOCTOR', 
                    doctorId: id,
                    accessToken: user?.accessToken
                  })}
                  onReject={(id) => adminUserSend({ 
                    type: 'REJECT_DOCTOR', 
                    doctorId: id,
                    accessToken: user?.accessToken
                  })}
                  isLoading={adminUserState.matches('approvingDoctor') || adminUserState.matches('rejectingDoctor')}
                >
                  <Typography variant="body2" color="text.secondary">
                    <strong>Email:</strong> {doctor.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Especialidad:</strong> {doctor.specialty}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Matrícula:</strong> {doctor.medicalLicense}
                  </Typography>
                </PendingCard>
              ))}
            </Box>
          </Box>
        ) : (
          <Paper elevation={2} className="pending-empty-state">
            <Box className="pending-empty-emoji">📋</Box>
            <Typography variant="h5" className="pending-empty-title">
              No hay solicitudes pendientes
            </Typography>
            <Typography variant="body1" className="pending-empty-subtitle">
              Todas las solicitudes de médicos han sido procesadas
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
    );
}