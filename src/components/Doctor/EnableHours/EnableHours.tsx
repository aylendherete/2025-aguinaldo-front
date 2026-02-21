import React, { useCallback } from "react";
import { 
  Avatar, 
  Box, 
  Button, 
  Typography,
  Card,
  CardContent,
  TextField,
  Switch,
  Alert,
  IconButton,
  CircularProgress
} from "@mui/material"
import { LocalizationProvider } from "@mui/x-date-pickers"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { 
  CalendarMonthOutlined, 
  CheckCircle,
  Add,
  Delete,
  KeyboardArrowUp,
  KeyboardArrowDown
} from '@mui/icons-material'
import { motion, AnimatePresence } from "framer-motion"
import { useMachines } from "#/providers/MachineProvider"
import './EnableHours.css'



const RangeRow = motion.create(Box);

const EnableHours: React.FC = () => {
    const { uiSend, doctorState, doctorSend, uiState } = useMachines();
    const uiContext = uiState.context;
    const doctorContext = doctorState.context;
    const availability = doctorContext.availability || [];
    const enabledDays = availability.filter((day: any) => day.enabled).length;
    const totalRanges = availability.reduce((total: any, day: any) => total + (day.enabled ? day.ranges.length : 0), 0);
    const isMinimizedHoursWarning = uiContext.toggleStates?.['MinimizedHoursWarning'] || false;

    const saveAvailability = () => {
        if (!doctorContext.accessToken || !doctorContext.doctorId) {
            console.error("Authentication required to save availability");
            return;
        }

        if (enabledDays === 0) {
            doctorSend({ type: "SAVE_AVAILABILITY" });
            return;
        }
        
        const slotDurationMin = doctorContext.slotDurationMin || 30;
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        let hasValidData = false;
        const errors: string[] = [];
        
        availability.forEach((day: any) => {
            if (day.enabled) {
                if (!day.ranges || day.ranges.length === 0) {
                    errors.push(`${day.day}: No hay rangos de horarios configurados`);
                } else {
                    const validRangesForOverlap: { startTime: number; endTime: number; rangeIndex: number }[] = [];

                    day.ranges.forEach((range: any, rangeIndex: number) => {
                        if (!range.start || !range.end) {
                            errors.push(`${day.day} - Rango ${rangeIndex + 1}: Falta hora de inicio o fin`);
                        } else {
                            if (!timeRegex.test(range.start)) {
                                errors.push(`${day.day} - Rango ${rangeIndex + 1}: Hora de inicio inválida (${range.start}). Use formato HH:MM`);
                            }
                            if (!timeRegex.test(range.end)) {
                                errors.push(`${day.day} - Rango ${rangeIndex + 1}: Hora de fin inválida (${range.end}). Use formato HH:MM`);
                            }
                            if (timeRegex.test(range.start) && timeRegex.test(range.end)) {
                                const [startHour, startMin] = range.start.split(':').map(Number);
                                const [endHour, endMin] = range.end.split(':').map(Number);
                                const startTime = startHour * 60 + startMin;
                                const endTime = endHour * 60 + endMin;
                                const duration = endTime - startTime;
                                
                                if (startTime >= endTime) {
                                    errors.push(`${day.day} - Rango ${rangeIndex + 1}: La hora de inicio debe ser menor que la hora de fin`);
                                } else if (startTime % slotDurationMin !== 0 || endTime % slotDurationMin !== 0 || duration % slotDurationMin !== 0) {
                                    errors.push(`${day.day} - Rango ${rangeIndex + 1}: Debe ser múltiplo de ${slotDurationMin} min`);
                                } else {
                                    hasValidData = true;
                                    validRangesForOverlap.push({ startTime, endTime, rangeIndex });
                                }
                            }
                        }
                    });

                    if (validRangesForOverlap.length > 1) {
                        const sortedRanges = [...validRangesForOverlap].sort((a, b) => a.startTime - b.startTime);

                        for (let i = 1; i < sortedRanges.length; i++) {
                            const previous = sortedRanges[i - 1];
                            const current = sortedRanges[i];

                            if (current.startTime < previous.endTime) {
                                errors.push(`${day.day}: Los rangos ${previous.rangeIndex + 1} y ${current.rangeIndex + 1} se superponen`);
                            }
                        }
                    }
                }
            }
        });
        
        if (errors.length > 0) {
            console.error("Errores de validación:", errors);
            uiSend({type: "OPEN_SNACKBAR", message: "Errores encontrados:\n" + errors.join("\n"), severity: "error"});
            return;
        }
        
        if (!hasValidData) {
            console.warn("No hay días habilitados con horarios válidos configurados");
            uiSend({type: "OPEN_SNACKBAR", message: "Debe configurar al menos un día con horarios válidos", severity: "warning"});
            return;
        }
        
        doctorSend({ type: "SAVE_AVAILABILITY" });
    };

    const handleToggleDay = useCallback((dayIndex: number) => {
        doctorSend({ type: "TOGGLE_DAY", index: dayIndex });
    }, [doctorSend]);

    const handleAddRange = useCallback((dayIndex: number) => {
        doctorSend({ type: "ADD_RANGE", dayIndex });
    }, [doctorSend]);

    const handleRemoveRange = useCallback((dayIndex: number, rangeIndex: number) => {
        doctorSend({ type: "REMOVE_RANGE", dayIndex, rangeIndex });
    }, [doctorSend]);

    const handleUpdateRange = useCallback((dayIndex: number, rangeIndex: number, field: "start" | "end", value: string) => {
        doctorSend({
            type: "UPDATE_RANGE",
            dayIndex,
            rangeIndex,
            field,
            value,
        });
    }, [doctorSend]);
    
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box className="enablehours-container">
                <Box className="shared-header">
                    <Box className="shared-header-layout">
                        
                        <Box className="shared-header-content">
                            <Avatar className="shared-header-icon">
                                <CalendarMonthOutlined className="enablehours-calendar-icon" />
                            </Avatar>
                            <Box>
                                <Typography variant="h4" component="h1" className="shared-header-title">
                                    Configurar Horarios
                                </Typography>
                                <Typography variant="h6" className="shared-header-subtitle">
                                    Establece tus días y horarios de atención 
                                </Typography>
                            </Box>
                        </Box>
                        <Box className="shared-header-spacer"></Box>
                    </Box>

                    {/* Error Alert */}
                    {doctorContext.availabilityError && (
                        <Alert severity="error" sx={{ mt: 2, maxWidth: '1000px', margin: '16px auto 0' }}>
                            {doctorContext.availabilityError}
                        </Alert>
                    )}
                </Box>

                <Box className="enablehours-content">
                 
                    {enabledDays === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Card className="enablehours-no-config-card">
                                <CardContent className="enablehours-no-config-content">
                                    <AnimatePresence>
                                        {!isMinimizedHoursWarning && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <Box className="enablehours-no-config-layout">
                                                    <Box className="enablehours-no-config-left">
                                                        <Box className="enablehours-no-config-icon">
                                                            <CalendarMonthOutlined className="enablehours-no-config-calendar" />
                                                        </Box>
                                                        <Typography variant="h4" className="enablehours-no-config-title">
                                                            ¡Configura tu disponibilidad!
                                                        </Typography>
                                                        <Typography variant="body1" className="enablehours-no-config-description">
                                                            Actualmente no tienes días configurados para atender pacientes.
                                                        </Typography>                                                
                                                    </Box>
                                                    <Box className="enablehours-no-config-divider"></Box>
                                                    <Box className="enablehours-no-config-right">
                                                        <Box className="enablehours-no-config-steps">
                                                            <Box className="enablehours-step-card">
                                                                <Box className="enablehours-step-number">1</Box>
                                                                <Typography variant="body2" className="enablehours-step-text">
                                                                    Activa el interruptor del día que deseas configurar
                                                                </Typography>
                                                            </Box>
                                                            <Box className="enablehours-step-card">
                                                                <Box className="enablehours-step-number">2</Box>
                                                                <Typography variant="body2" className="enablehours-step-text">
                                                                    Configura uno o más rangos de horarios
                                                                </Typography>
                                                            </Box>
                                                            <Box className="enablehours-step-card">
                                                                <Box className="enablehours-step-number">3</Box>
                                                                <Typography variant="body2" className="enablehours-step-text">
                                                                    Guarda tu disponibilidad
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <Box className="enablehours-minimize-container">
                                        <Button 
                                            onClick={() => uiSend({ type: "TOGGLE", key: "MinimizedHoursWarning" })} 
                                            size="small" 
                                            startIcon={isMinimizedHoursWarning ? <KeyboardArrowDown /> : <KeyboardArrowUp />}
                                            variant="text"
                                            sx={{ color: '#c2410c', textTransform: 'none' }}
                                        >
                                            {isMinimizedHoursWarning ? 'Expandir' : 'Minimizar'}
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Days Configuration */}
                    <Box className="enablehours-days-container">
                        {availability.map((day: any, dayIndex: number) => (
                            <Box key={day.day} className="enablehours-day-container">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    whileHover={{ scale: 1.01, y: -2 }}
                                    transition={{ duration: 0.25, delay: dayIndex * 0.05 }}
                                >
                                    <Card 
                                        variant="outlined" 
                                        className={`enablehours-day-card enablehours-day-card-styled ${day.enabled ? 'enabled' : 'disabled'}`}
                                    >
                                        <CardContent>
                                            {/* Day Header */}
                                            <Box className="enablehours-day-header">
                                                <Box className="enablehours-day-info">
                                                    <Box className="enablehours-day-details">
                                                        <Typography variant="h6" className="enablehours-day-title">
                                                            {day.day}
                                                        </Typography>
                                                        <Typography variant="caption" className="enablehours-day-status">
                                                            {day.enabled ? `Activo - ${day.ranges.length} horario(s)` : 'Inactivo'}
                                                        </Typography>
                                                    </Box>
                                                    {day.enabled && day.ranges.length > 0 && (
                                                        <Box className="enablehours-ranges-preview">
                                                            {day.ranges.map((range: any, idx: number) => (
                                                                <Typography key={idx} variant="body2" color="text.secondary">
                                                                    {range.start && range.end ? `${range.start} - ${range.end}` : 'Sin configurar'}
                                                                </Typography>
                                                            ))}
                                                        </Box>
                                                    )}
                                                </Box>
                                                <Switch
                                                    checked={day.enabled}
                                                    onChange={() => handleToggleDay(dayIndex)}
                                                    size="medium"
                                                    className="enablehours-switch"
                                                />
                                            </Box>

                                            {/* Time Range */}
                                            <AnimatePresence>
                                                {day.enabled && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="enablehours-time-section"
                                                    >
                                                        <Box className="enablehours-time-box">
                                                            {day.ranges.length === 0 ? (
                                                                <Box textAlign="center" py={2}>
                                                                    <Typography variant="body2" color="text.secondary" mb={2}>
                                                                        No hay horarios configurados
                                                                    </Typography>
                                                                    <Button
                                                                        startIcon={<Add />}
                                                                        onClick={() => handleAddRange(dayIndex)}
                                                                        variant="contained"
                                                                        size="small"
                                                                        color="success"
                                                                        className="enablehours-add-first-button"
                                                                    >
                                                                        Agregar primer horario
                                                                    </Button>
                                                                </Box>
                                                            ) : (
                                                                <>
                                                                    {day.ranges.map((range: any, rangeIndex: number) => (
                                                                        <RangeRow
                                                                            key={rangeIndex}
                                                                            initial={{ opacity: 0, x: -10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            exit={{ opacity: 0, x: 10 }}
                                                                            transition={{ duration: 0.2 }}
                                                                            className="enablehours-range-row"
                                                                        >
                                                                            <TextField
                                                                                type="time"
                                                                                size="small"
                                                                                label="Inicio"
                                                                                value={range.start || ""}
                                                                                onChange={(e) => handleUpdateRange(dayIndex, rangeIndex, "start", e.target.value)}
                                                                                InputLabelProps={{
                                                                                    shrink: true,
                                                                                }}
                                                                                className="enablehours-time-input"
                                                                            />
                                                                            <TextField
                                                                                type="time"
                                                                                size="small"
                                                                                label="Fin"
                                                                                value={range.end || ""}
                                                                                onChange={(e) => handleUpdateRange(dayIndex, rangeIndex, "end", e.target.value)}
                                                                                InputLabelProps={{
                                                                                    shrink: true,
                                                                                }}
                                                                                className="enablehours-time-input"
                                                                            />
                                                                            <IconButton
                                                                                onClick={() => handleRemoveRange(dayIndex, rangeIndex)}
                                                                                size="small"
                                                                                className="enablehours-delete-button"
                                                                            >
                                                                                <Delete color="error" fontSize="small" />
                                                                            </IconButton>
                                                                        </RangeRow>
                                                                    ))}

                                                                    <Button
                                                                        startIcon={<Add />}
                                                                        onClick={() => handleAddRange(dayIndex)}
                                                                        variant="outlined"
                                                                        size="small"
                                                                        fullWidth
                                                                        className="enablehours-add-range-button"
                                                                    >
                                                                        Agregar otro horario
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </Box>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </Box>
                        ))}
                    </Box>

                    {(enabledDays === 0 || totalRanges === 0) && (
                        <Alert severity="warning" className="enablehours-warning">
                            Si no activas ningún día, se guardará tu agenda como "sin disponibilidad" toda la semana.
                        </Alert>
                    )}

                    {/* Save Button */}
                    <Box className="enablehours-actions">
                        <Button
                            variant="contained"
                            color="success"
                            onClick={saveAvailability}
                            size="large"
                            startIcon={doctorContext.isSavingAvailability ? <CircularProgress size={16} /> : <CheckCircle />}
                            disabled={doctorContext.isSavingAvailability}
                            className="enablehours-save-button"
                        >
                            {doctorContext.isSavingAvailability ? 'Guardando...' : 'Guardar Disponibilidad'}
                        </Button>
                    </Box>

                    
                </Box>
            </Box>
        </LocalizationProvider>
    )
}

export default EnableHours