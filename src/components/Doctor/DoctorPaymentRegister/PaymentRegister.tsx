import React from "react";
import { Avatar, Box, Typography,Card,CardContent,Button,TextField,MenuItem,CircularProgress} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { AccountBalanceWalletOutlined,PaidOutlined,LocalHospitalOutlined,ReceiptLongOutlined,
PendingActionsOutlined,SummarizeOutlined,EventNoteOutlined,LocalAtm,PriceCheck,DeleteOutline } from '@mui/icons-material';
import { useMachines } from "#/providers/MachineProvider";
import { useDataMachine } from "#/providers/DataProvider";
import { dayjsArgentina, nowArgentina } from "#/utils/dateTimeUtils";
import { PaymentRegisterService } from "../../../service/payment-register.service";
import "./PaymentRegister.css";
import {getMonthLabel,currencyFormatter,getMethodLabel,getPaymentRegisterYears,getPaymentRegisterMonths,getPeriodTurns,getPaymentTurns,buildPaymentSummary,validatePaymentForm,buildPaymentUpdatePayload,buildPaymentTurnViewModel,} from "#/utils/paymentRegisterUtils";

const PaymentRegister: React.FC = () => {
    const { paymentRegisterState, paymentRegisterSend } = useMachines();
    const { dataState, dataSend } = useDataMachine();
    const dataContext = dataState.context;
    const turns = dataContext.myTurns || [];
    const accessToken = dataContext.accessToken as string | null;
    const paymentRegisterContext = paymentRegisterState.context;

    const currentDate = nowArgentina();
    const selectedMonth = paymentRegisterContext.periodMonth ?? currentDate.month();
    const selectedYear = paymentRegisterContext.periodYear ?? currentDate.year();
    const isLoadingPaymentRegister = paymentRegisterContext.loading || !!paymentRegisterContext.savingPaymentId;
    

    const years = getPaymentRegisterYears(turns, currentDate.year());
    const months = getPaymentRegisterMonths(turns, selectedYear, currentDate.month())
        .map((month) => ({ value: month, label: getMonthLabel(month, selectedYear) }));

    const periodTurns = getPeriodTurns(turns, selectedMonth, selectedYear);
    const paymentTurns = getPaymentTurns(periodTurns);
    const summary = buildPaymentSummary(periodTurns);


    const handleUpdateForm = (turnId: string, updates: Partial<{ paymentStatus: string; method: string; paymentAmount: string; copaymentAmount: string; }>) => {
        paymentRegisterSend({ type: "UPDATE_LOCAL_FORM", paymentId: turnId, updates });
        paymentRegisterSend({ type: "CLEAR_PAYMENT_ERROR", paymentId: turnId });
    };

    const handleSavePayment = async (turnId: string) => {
        if (!accessToken) {
            paymentRegisterSend({ type: "SET_PAYMENT_ERROR", paymentId: turnId, message: "Sesión expirada. Volvé a iniciar sesión." });
            return;
        }
        
        const form = paymentRegisterContext.formByPaymentId[turnId];
        const validationError = validatePaymentForm(form);
        if (validationError) {
            paymentRegisterSend({ type: "SET_PAYMENT_ERROR", paymentId: turnId, message: validationError });
            return;
        }

        paymentRegisterSend({ type: "UPDATE_PAYMENT_REGISTER"})
        paymentRegisterSend({ type: "SET_SAVING_PAYMENT", paymentId: turnId });
        paymentRegisterSend({ type: "CLEAR_PAYMENT_ERROR", paymentId: turnId });

        const paidAtValue = new Date().toISOString();
        const payload = buildPaymentUpdatePayload(form!, paidAtValue);

        try {
            await PaymentRegisterService.updatePaymentRegister({
                accessToken,
                turnId,
                payload,
            });

            dataSend({ type: "LOAD_MY_TURNS" });
            paymentRegisterSend({ type: "LOAD_PAYMENT_REGISTER" });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error al registrar el pago";
            paymentRegisterSend({ type: "SET_PAYMENT_ERROR", paymentId: turnId, message });
        } finally {
            paymentRegisterSend({ type: "SET_SAVING_PAYMENT", paymentId: null });
        }
    };

    const handleCancelPayment = async (turnId: string) => {
        if (!accessToken) {
            paymentRegisterSend({ type: "SET_PAYMENT_ERROR", paymentId: turnId, message: "Sesión expirada. Volvé a iniciar sesión." });
            return;
        }

        paymentRegisterSend({ type: "SET_SAVING_PAYMENT", paymentId: turnId });
        paymentRegisterSend({ type: "CLEAR_PAYMENT_ERROR", paymentId: turnId });

        try {
            await PaymentRegisterService.cancelPaymentRegister({ accessToken, turnId });
            dataSend({ type: "LOAD_MY_TURNS" });
            paymentRegisterSend({ type: "LOAD_PAYMENT_REGISTER" });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error al eliminar el registro de pago";
            paymentRegisterSend({ type: "SET_PAYMENT_ERROR", paymentId: turnId, message });
        } finally {
            paymentRegisterSend({ type: "SET_SAVING_PAYMENT", paymentId: null });
        }
    };

    
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            {isLoadingPaymentRegister && (
                <Box className="loading-overlay">
                        <CircularProgress size={55} />
                  
                </Box>
            )}
            <Box className="shared-container">
                <Box className="shared-header">
                    <Box className="shared-header-layout">
                        <Box className="shared-header-content">
                            <Avatar className="shared-header-icon">
                                <AccountBalanceWalletOutlined />
                            </Avatar>
                            <Box>
                                <Typography variant="h4" component="h1" className="shared-header-title">
                                    Registro de Pagos
                                </Typography>
                                <Typography variant="h6" className="shared-header-subtitle">
                                    Resumen de facturación y cobertura
                                </Typography>
                            </Box>
                        </Box>
                        <Box className="shared-header-spacer"></Box>
                    </Box>
                </Box>

                <Box sx={{maxWidth: 1200,margin: "0 auto",padding: "0 24px 32px",display: "flex",flexDirection: "column",gap: 3}}>
                    <Box sx={{ display: "flex", flexWrap: "wrap",gap: 2,alignItems: "center"}}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <EventNoteOutlined color="primary" />
                            <Typography variant="subtitle1">Período</Typography>
                        </Box>
                        <TextField
                            select
                            label="Mes"
                            size="small"
                            value={selectedMonth}
                            onChange={(event) => paymentRegisterSend({ type: "UPDATE_PERIOD", month: Number(event.target.value) })}
                            sx={{ minWidth: 160 }}
                        >
                            {months.map((month) => (
                                <MenuItem key={month.value} value={month.value}>
                                    {month.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label="Año"
                            size="small"
                            value={selectedYear}
                            onChange={(event) => paymentRegisterSend({ type: "UPDATE_PERIOD", year: Number(event.target.value) })}
                            sx={{ minWidth: 120 }}
                        >
                            {years.map((year) => (
                                <MenuItem key={year} value={year}>
                                    {year}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>

                    <Box className="paid-summary-grid">
                        <Box className="paid-summary-card total-billed-card">
                            <Box className="paid-summary-card-header">
                                <Box className="paid-summary-card-icon">
                                    <SummarizeOutlined color="primary" />
                                </Box>
                                <Typography className="paid-summary-card-title">Total facturado</Typography>
                            </Box>
                            <Typography className="paid-summary-card-value">
                                {currencyFormatter(summary.totalBilled)}
                            </Typography>
                            <Typography className="paid-summary-card-caption">
                                {summary.completedCount} consultas realizadas · {summary.canceledCount} canceladas
                            </Typography>
                        </Box>

                        <Box className="paid-summary-card total-payment-card">
                            <Box className="paid-summary-card-header">
                                <Box className="paid-summary-card-icon paid-summary-icon-total">
                                    <PaidOutlined color="success" />
                                </Box>
                                <Typography className="paid-summary-card-title">Total cobrado</Typography>
                            </Box>
                            <Typography className="paid-summary-card-value">
                                {currencyFormatter(summary.totalCollected)}
                            </Typography>
                        </Box>

                        <Box className="paid-summary-card total-payment-card">
                            <Box className="paid-summary-card-header">
                                <Box className="paid-summary-card-icon paid-summary-icon-total">
                                    <ReceiptLongOutlined color="success" />
                                </Box>
                                <Typography className="paid-summary-card-title">Copago total (Obra Social)</Typography>
                            </Box>
                            <Typography className="paid-summary-card-value">
                                {currencyFormatter(summary.totalCopayment)}
                            </Typography>
                        </Box>

                        <Box className="paid-summary-card total-payment-card">
                            <Box className="paid-summary-card-header">
                                <Box className="paid-summary-card-icon paid-summary-icon-total">
                                    <PriceCheck color="success" />
                                </Box>
                                <Typography className="paid-summary-card-title">Bonificación total </Typography>
                            </Box>
                            <Typography className="paid-summary-card-value">
                                {currencyFormatter(summary.totalBonus)}
                            </Typography>
                        </Box>

                        <Box className="paid-summary-card total-payment-card">
                            <Box className="paid-summary-card-header">
                                <Box className="paid-summary-card-icon paid-summary-icon-total">
                                    <LocalHospitalOutlined color="success" />
                                </Box>
                                <Typography className="paid-summary-card-title">Cubierto por obra social</Typography>
                            </Box>
                            <Typography className="paid-summary-card-value">
                                {currencyFormatter(summary.totalCovered)}
                            </Typography>
                            <Typography className="paid-summary-card-caption">
                                {summary.healthInsuranceCount} turno(s) con obra social
                            </Typography>
                        </Box>

                        

                        <Box className="paid-summary-card info-count-card">
                            <Box className="paid-summary-card-header">
                                <Box className="paid-summary-card-icon paid-summary-icon-info">
                                    <AccountBalanceWalletOutlined color="warning" />
                                </Box>
                                <Typography className="paid-summary-card-title">Pagos registrados</Typography>
                            </Box>
                            <Typography className="paid-summary-card-value">
                                {summary.totalPayments}
                            </Typography>
                            <Typography className="paid-summary-card-caption">
                                {summary.paidCount} pagado(s) · {summary.bonusCount} bonificado(s) · {summary.healthInsuranceCount} obra social · {summary.canceledPaymentCount} eliminado(s)
                            </Typography>
                        </Box>

                        <Box className="paid-summary-card info-count-card">
                            <Box className="paid-summary-card-header">
                                <Box className="paid-summary-card-icon paid-summary-icon-info">
                                    <PendingActionsOutlined color="warning" />
                                </Box>
                                <Typography className="paid-summary-card-title">Pagos pendientes</Typography>
                            </Box>
                            <Typography className="paid-summary-card-value">
                                {summary.pendingCount}
                            </Typography>
                        </Box>


                        <Box className="paid-summary-card info-count-card">
                        <Box className="paid-summary-card-header">
                            <Box className="paid-summary-card-icon paid-summary-icon-info">
                                <PaidOutlined color="warning" />
                            </Box>
                            <Typography className="paid-summary-card-title">Cantidad de pagos por cobrar</Typography>
                        </Box>
                        <Typography className="paid-summary-card-value">
                            {summary.totalAccountsReceivable}
                        </Typography>
                    </Box>
                    </Box>

                    <Box display="flex" flexDirection="column" gap={2}>
                        <Typography variant="h6">Detalle de pagos</Typography>
                        {paymentTurns.map((turn: any) => {
                            const payment = turn.paymentRegister;
                            const {
                                isCanceledPayment,
                                canEditPayment,
                                canDeletePayment,
                                formState,
                                copaymentAmount,
                                paymentAmount,
                                coverage,
                            } = buildPaymentTurnViewModel(turn, paymentRegisterContext.formByPaymentId[turn.id]);

                            const liveValidationError = canEditPayment ? validatePaymentForm(formState) : null;
                            const displayedError = liveValidationError || paymentRegisterContext.errorByPaymentId[turn.id];
                            const isSaveDisabled =
                                paymentRegisterContext.savingPaymentId === turn.id ||
                                !!liveValidationError ||
                                !canEditPayment;

                            return (
                                <Card key={turn.id} variant="outlined" className={isCanceledPayment ? "payment-register-card-canceled" : ""}>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={2}>
                                            <Box>
                                                <Typography variant="subtitle1">
                                                    Paciente: {turn.patientName || "Paciente"}
                                                </Typography>
                                                {isCanceledPayment && (
                                                    <Typography variant="caption" className="payment-register-canceled-badge">
                                                        Registro eliminado
                                                    </Typography>
                                                )}
                                                <Typography variant="body2" color="text.secondary">
                                                    Fecha del pago: {payment.paymentStatus!="PENDING"? dayjsArgentina(payment.paidAt).format("DD/MM/YYYY") : "-"}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Fecha del turno registrado: {dayjsArgentina(turn.scheduledAt).format("DD/MM/YYYY (HH:mm)")}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Medio: {getMethodLabel(payment?.method)}
                                                </Typography>
                                            </Box>
                                            <Box style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px"}}>
                                                <Typography variant="subtitle2">Monto abonado</Typography>
                                                <Typography variant="h6">
                                                    {paymentAmount ? currencyFormatter(paymentAmount) : "-"}
                                                </Typography>
                                            </Box>
                                            <Box style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px"}}>
                                                <Typography variant="subtitle2">Copago</Typography>
                                                <Typography variant="body1">
                                                    {copaymentAmount ? currencyFormatter(copaymentAmount) : "-"}
                                                </Typography>
                                            </Box>
                                            <Box style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px"}}>
                                                <Typography variant="subtitle2">Cobertura obra social</Typography>
                                                <Typography variant="body1">
                                                    {coverage ? currencyFormatter(coverage) : "-"}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {canDeletePayment && (
                                            <Box mt={2} display="flex" justifyContent="flex-end">
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    onClick={() => handleCancelPayment(turn.id)}
                                                    endIcon={<DeleteOutline />}
                                                    disabled={paymentRegisterContext.savingPaymentId === turn.id}
                                                >
                                                    {paymentRegisterContext.savingPaymentId === turn.id ? (
                                                        <CircularProgress size={18} color="inherit" />
                                                    ) : (
                                                        "Eliminar registro"
                                                    )}
                                                </Button>
                                            </Box>
                                        )}

                                        {canEditPayment && (
                                            <Box mt={2} display="flex" flexWrap="wrap" gap={2} rowGap={2} columnGap={2} alignItems="center"
                                                justifyContent="space-evenly" width="100%" sx={{backgroundColor: "#efdacb", padding: 5, borderRadius: 5}}>
                                                {isCanceledPayment && (
                                                    <Typography variant="body2" className="payment-register-canceled-info">
                                                        Este registro fue eliminado. Podés volver a registrar el pago.
                                                    </Typography>
                                                )}
                                                <TextField
                                                    select
                                                    label="Estado de pago"
                                                    size="small"
                                                    value={formState.paymentStatus}
                                                    onChange={(event) => handleUpdateForm(turn.id, { paymentStatus: event.target.value })}
                                                    variant="filled"
                                                    className="payment-input"
                                                    sx={{ minWidth: 200 }}
                                                >
                                                    <MenuItem value="PENDING" disabled>
                                                        Seleccioná estado
                                                    </MenuItem>
                                                    <MenuItem value="PAID">Pagado</MenuItem>
                                                    <MenuItem value="HEALTH INSURANCE">Obra social</MenuItem>
                                                    <MenuItem value="BONUS">Bonificado</MenuItem>
                                                </TextField>
                                                <TextField
                                                    select
                                                    label="Medio"
                                                    size="small"
                                                    value={formState.method}
                                                    onChange={(event) => handleUpdateForm(turn.id, { method: event.target.value })}
                                                    variant="filled"
                                                    className="payment-input"
                                                    sx={{ minWidth: 200 }}
                                                    disabled={formState.paymentStatus === "BONUS" || formState.paymentStatus === "HEALTH INSURANCE"}
                                                >
                                                    <MenuItem value="" disabled>Seleccioná medio</MenuItem>
                                                    <MenuItem value="CASH">Efectivo</MenuItem>
                                                    <MenuItem value="CREDIT CARD">Tarjeta de crédito</MenuItem>
                                                    <MenuItem value="DEBIT CARD">Tarjeta de débito</MenuItem>
                                                    <MenuItem value="ONLINE PAYMENT">Pago online</MenuItem>
                                                    <MenuItem value="TRANSFER">Transferencia</MenuItem>
                                                </TextField>
                                                <TextField
                                                    label="Monto abonado"
                                                    size="small"
                                                    type="number"
                                                    value={formState.paymentAmount}
                                                    onChange={(event) => handleUpdateForm(turn.id, { paymentAmount: event.target.value })}
                                                    variant="filled"
                                                    className="payment-input"
                                                    sx={{ minWidth: 160 }}
                                                />
                                                {formState.paymentStatus === "HEALTH INSURANCE" && (
                                                    <TextField
                                                        label="Copago"
                                                        size="small"
                                                        type="number"
                                                        value={formState.copaymentAmount}
                                                        onChange={(event) => handleUpdateForm(turn.id, { copaymentAmount: event.target.value })}
                                                        variant="filled"
                                                        className="payment-input"
                                                        sx={{ minWidth: 140 }}
                                                    />
                                                )}
                                                <Button
                                                    variant="contained"
                                                    onClick={() => handleSavePayment(turn.id)}
                                                    endIcon={<LocalAtm />}
                                                    disabled={isSaveDisabled}
                                                    className={`add-payment-register-btn ${isSaveDisabled ? "disabled" : ""}`}
                                                >
                                                    {paymentRegisterContext.savingPaymentId === turn.id ? (
                                                        <CircularProgress size={18} color="inherit" />
                                                    ) : (
                                                        isCanceledPayment ? "Volver a registrar pago" : "Registrar pago"
                                                    )}
                                                </Button>
                                                {displayedError && (
                                                    <Typography variant="body2" color="error">
                                                        {displayedError}
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>

                    {paymentTurns.length === 0 && (
                        <Typography variant="body2" color="text.secondary" align="center">
                            No hay registros de pago disponibles todavía.
                        </Typography>
                    )}
                </Box>
            </Box>
        </LocalizationProvider>
    )
}

export default PaymentRegister