import React, { useState } from "react";
import { Avatar, Box, Typography,Card,CardContent,Button,TextField,MenuItem,CircularProgress} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { AccountBalanceWalletOutlined,PaidOutlined,LocalHospitalOutlined,ReceiptLongOutlined,
PendingActionsOutlined,SummarizeOutlined,EventNoteOutlined,LocalAtm } from '@mui/icons-material';
import { useMachines } from "#/providers/MachineProvider";
import { useDataMachine } from "#/providers/DataProvider";
import { dayjsArgentina, nowArgentina } from "#/utils/dateTimeUtils";
import { PaymentRegisterService } from "../../../service/payment-register.service";
import "./PaymentRegister.css";

const PaymentRegister: React.FC = () => {
    const { paymentRegisterState, paymentRegisterSend } = useMachines();
    const { dataState, dataSend } = useDataMachine();
    const dataContext = dataState.context;
    const turns = dataContext.myTurns || [];
    const accessToken = dataContext.accessToken as string | null;
    const paymentRegisterContext = paymentRegisterState.context;

    const currentDate = nowArgentina();
    const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.month());
    const [selectedYear, setSelectedYear] = useState<number>(currentDate.year());
    const [savingTurnId, setSavingTurnId] = useState<string | null>(null);
    const [errorByTurnId, setErrorByTurnId] = useState<Record<string, string>>({});
    const [formByTurnId, setFormByTurnId] = useState<Record<string, {
        paymentStatus: string;
        method: string;
        paymentAmount: string;
        copaymentAmount: string;
    }>>({});

    const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "long" });


    const getMonthLabel= (monthIndex:number)=>{
        const label=monthFormatter.format(new Date(selectedYear, monthIndex, 1));
        return label.charAt(0).toUpperCase() + label.slice(1);
    }

    const years = (() => {
        const yearSet = new Set<number>();
        turns.forEach((turn: any) => {
            if (turn?.scheduledAt) {
                yearSet.add(dayjsArgentina(turn.scheduledAt).year());
            }
            const paidAt = turn?.paymentRegister?.paidAt;
            if (paidAt) {
                yearSet.add(dayjsArgentina(paidAt).year());
            }
        });
        if (yearSet.size === 0) {
            yearSet.add(currentDate.year());
        }
        return Array.from(yearSet).sort((a, b) => b - a);
    })();

    const months =  (() => {
        const monthSet = new Set<number>();
        turns.forEach((turn: any) => {
            if (turn?.scheduledAt) {
                const date = dayjsArgentina(turn.scheduledAt);
                if (date.year() === selectedYear) {
                    monthSet.add(date.month());
                }
            }
            const paidAt = turn?.paymentRegister?.paidAt;
            if (paidAt) {
                const date = dayjsArgentina(paidAt);
                if (date.year() === selectedYear) {
                    monthSet.add(date.month());
                }
            }
        });
        if (monthSet.size === 0) {
            monthSet.add(currentDate.month());
        }
        return Array.from(monthSet)
            .sort((a, b) => a - b)
            .map((month) => ({ value: month, label: getMonthLabel(month) }));
    })();

    const periodTurns = turns.filter((turn: any) => {
        const payment = turn?.paymentRegister;
        const status = payment?.paymentStatus;
        const paidAt = payment?.paidAt;
        const baseDate = status && status !== "PENDING" && paidAt ? paidAt : turn?.scheduledAt;

        if (!baseDate) {
            return false;
        }

        const turnDate = dayjsArgentina(baseDate);
        return turnDate.month() === selectedMonth && turnDate.year() === selectedYear;
    });

    const paymentTurns = periodTurns.filter((turn: any) => turn.paymentRegister);

    const summary = (() => {
        const totals = {
            totalBilled: 0,
            totalCollected: 0,
            totalCopayment: 0,
            totalCovered: 0,
            totalPayments: 0,
            pendingCount: 0,
            paidCount: 0,
            healthInsuranceCount: 0,
            bonusCount: 0,
            completedCount: 0,
            canceledCount: 0
        };

        periodTurns.forEach((turn: any) => {
            if (turn.status === "COMPLETED") {
                totals.completedCount += 1;
            }
            if (turn.status === "CANCELED" || turn.status === "CANCELLED") {
                totals.canceledCount += 1;
            }

            const payment = turn.paymentRegister;
            if (!payment) {
                return;
            }

            totals.totalPayments += 1;

            const paymentAmount = Number(payment.paymentAmount ?? 0);
            const copaymentAmount = Number(payment.copaymentAmount ?? 0);
            const status = payment.paymentStatus;

            totals.totalBilled += paymentAmount;
            totals.totalCopayment += copaymentAmount;

            if (status && status !== "PENDING" && payment.method !== "BONUS" && payment.method !== "HEALTH INSURANCE") {
                totals.totalCollected += paymentAmount;
            }

            if (status === "HEALTH INSURANCE") {
                totals.healthInsuranceCount += 1;
                const covered = paymentAmount - copaymentAmount;
                totals.totalCovered += covered > 0 ? covered : 0;
            }

            if (status === "PENDING") {
                totals.pendingCount += 1;
            }

            if (status === "PAID") {
                totals.paidCount += 1;
            }

            if (status === "BONUS") {
                totals.bonusCount += 1;
            }
        });

        return totals;
    })();

    const currencyFormatter = (amount: number ) => {
        return new Intl.NumberFormat("es-AR", {style: "currency",currency: "ARS",maximumFractionDigits: 2}).format(amount);
    };

    const handleUpdateForm = (turnId: string, updates: Partial<{ paymentStatus: string; method: string; paymentAmount: string; copaymentAmount: string; }>) => {
        const lockedMethod = updates.paymentStatus === "BONUS"
            ? "BONUS"
            : updates.paymentStatus === "HEALTH INSURANCE"
                ? "HEALTH INSURANCE"
                : undefined;

        setFormByTurnId((prev) => ({
            ...prev,
            [turnId]: {
                paymentStatus: prev[turnId]?.paymentStatus ?? "PAID",
                method: prev[turnId]?.method ?? "CASH",
                paymentAmount: prev[turnId]?.paymentAmount ?? "",
                copaymentAmount: prev[turnId]?.copaymentAmount ?? "",
                ...updates,
                ...(lockedMethod ? { method: lockedMethod } : {}),
                ...(updates.paymentStatus && updates.paymentStatus !== "HEALTH INSURANCE"
                    ? { copaymentAmount: "" }
                    : {})
            }
        }));
    };

    const handleSavePayment = async (turnId: string) => {
        if (!accessToken) {
            setErrorByTurnId((prev) => ({ ...prev, [turnId]: "Sesión expirada. Volvé a iniciar sesión." }));
            return;
        }
        
        const form = formByTurnId[turnId];
        if (!form) {
            setErrorByTurnId((prev) => ({ ...prev, [turnId]: "Completá los datos del pago." }));
            return;
        }

        if (!form.paymentStatus || form.paymentStatus === "PENDING") {
            setErrorByTurnId((prev) => ({ ...prev, [turnId]: "Seleccioná un estado de pago válido." }));
            return;
        }

        if (!form.method) {
            setErrorByTurnId((prev) => ({ ...prev, [turnId]: "Seleccioná un medio de pago." }));
            return;
        }

        if (!form.paymentAmount) {
            setErrorByTurnId((prev) => ({ ...prev, [turnId]: "Ingresá el monto abonado." }));
            return;
        }

        setSavingTurnId(turnId);
        setErrorByTurnId((prev) => ({ ...prev, [turnId]: "" }));

        const paidAtValue = new Date().toISOString();
        const copaymentValue = form.paymentStatus === "HEALTH INSURANCE" && form.copaymentAmount !== ""
            ? Number(form.copaymentAmount)
            : null;

        try {
            await PaymentRegisterService.updatePaymentRegister({
                accessToken,
                turnId,
                payload: {
                    paymentStatus: form.paymentStatus,
                    method: form.method,
                    paymentAmount: Number(form.paymentAmount),
                    copaymentAmount: copaymentValue,
                    paidAt: paidAtValue,
                },
            });

            dataSend({ type: "LOAD_MY_TURNS" });
            paymentRegisterSend({ type: "LOAD_PAYMENT_REGISTER" });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error al registrar el pago";
            setErrorByTurnId((prev) => ({ ...prev, [turnId]: message }));
        } finally {
            setSavingTurnId(null);
        }
    };

    const getMethodLabel = (method: string) => {
        switch (method) {
            case "CASH":
                return "Efectivo";
            case "CREDIT CARD":
                return "Tarjeta de crédito";
            case "DEBIT_CARD":
                return "Tarjeta de débito";
            case "ONLINE_PAYMENT":
                return "Pago online";
            case "TRANSFER":
                return "Transferencia";
            case "BONUS":
                return "Bonificado";
            case "HEALTH_INSURANCE":
                return "Obra social";
                                                   
        }  return method || "Sin registrar";   
    }
    
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            {paymentRegisterContext.loading && (
                <Box className="loading-overlay">
                    <Box className="loading-overlay-card">
                        <CircularProgress size={28} />
                        <Typography variant="body2">Cargando registros...</Typography>
                    </Box>
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
                            onChange={(event) => setSelectedMonth(Number(event.target.value))}
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
                            onChange={(event) => setSelectedYear(Number(event.target.value))}
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
                        <Box className="paid-summary-card">
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

                        <Box className="paid-summary-card">
                            <Box className="paid-summary-card-header">
                                <Box className="paid-summary-card-icon paid-summary-icon-success">
                                    <ReceiptLongOutlined color="success" />
                                </Box>
                                <Typography className="paid-summary-card-title">Copago total</Typography>
                            </Box>
                            <Typography className="paid-summary-card-value">
                                {currencyFormatter(summary.totalCopayment)}
                            </Typography>
                        </Box>

                        <Box className="paid-summary-card">
                            <Box className="paid-summary-card-header">
                                <Box className="paid-summary-card-icon paid-summary-icon-info">
                                    <LocalHospitalOutlined color="info" />
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

                        <Box className="paid-summary-card">
                            <Box className="paid-summary-card-header">
                                <Box className="paid-summary-card-icon paid-summary-icon-success">
                                    <PaidOutlined color="success" />
                                </Box>
                                <Typography className="paid-summary-card-title">Total cobrado</Typography>
                            </Box>
                            <Typography className="paid-summary-card-value">
                                {currencyFormatter(summary.totalCollected)}
                            </Typography>
                        </Box>

                        <Box className="paid-summary-card">
                            <Box className="paid-summary-card-header">
                                <Box className="paid-summary-card-icon paid-summary-icon-primary">
                                    <PaidOutlined color="success" />
                                </Box>
                                <Typography className="paid-summary-card-title">Pagos registrados</Typography>
                            </Box>
                            <Typography className="paid-summary-card-value">
                                {summary.totalPayments}
                            </Typography>
                        </Box>

                        <Box className="paid-summary-card">
                            <Box className="paid-summary-card-header">
                                <Box className="paid-summary-card-icon paid-summary-icon-warning">
                                    <PendingActionsOutlined color="warning" />
                                </Box>
                                <Typography className="paid-summary-card-title">Pagos pendientes</Typography>
                            </Box>
                            <Typography className="paid-summary-card-value">
                                {summary.pendingCount}
                            </Typography>
                        </Box>

                        <Box className="paid-summary-card">
                            <Box className="paid-summary-card-header">
                                <Box className="paid-summary-card-icon paid-summary-icon-primary">
                                    <AccountBalanceWalletOutlined color="primary" />
                                </Box>
                                <Typography className="paid-summary-card-title">Pagos completados</Typography>
                            </Box>
                            <Typography className="paid-summary-card-value">
                                {summary.paidCount + summary.bonusCount}
                            </Typography>
                            <Typography className="paid-summary-card-caption">
                                {summary.paidCount} pagado(s) · {summary.bonusCount} bonificado(s)
                            </Typography>
                        </Box>
                    </Box>

                    <Box display="flex" flexDirection="column" gap={2}>
                        <Typography variant="h6">Detalle de pagos</Typography>
                        {paymentTurns.map((turn: any) => {
                            const payment = turn.paymentRegister;
                            const paymentStatus = payment?.paymentStatus || "PENDING";
                            const formState = formByTurnId[turn.id] || {
                                paymentStatus: paymentStatus === "PENDING" ? "PAID" : paymentStatus,
                                method: payment?.method || "CASH",
                                paymentAmount: payment?.paymentAmount != null ? String(payment.paymentAmount) : "",
                                copaymentAmount: payment?.copaymentAmount != null ? String(payment.copaymentAmount) : ""
                            };
                            const copaymentAmount = Number(payment?.copaymentAmount ?? 0);
                            const paymentAmount = Number(payment?.paymentAmount ?? 0);
                            const coverage = paymentStatus === "HEALTH INSURANCE"
                                ? Math.max(paymentAmount - copaymentAmount, 0)
                                : 0;

                            return (
                                <Card key={turn.id} variant="outlined">
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={2}>
                                            <Box>
                                                <Typography variant="subtitle1">
                                                    Paciente: {turn.patientName || "Paciente"}
                                                </Typography>
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

                                        {(paymentStatus === "PENDING" && turn.status==="COMPLETED")&& (
                                            <Box mt={2} display="flex" flexWrap="wrap" gap={2} rowGap={2} columnGap={2} alignItems="center"
                                                justifyContent="space-evenly" width="100%" sx={{backgroundColor: "#efdacb", padding: 5, borderRadius: 5}}>
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
                                                    <MenuItem value="CASH">Efectivo</MenuItem>
                                                    <MenuItem value="CREDIT CARD">Tarjeta de crédito</MenuItem>
                                                    <MenuItem value="DEBIT CARD">Tarjeta de débito</MenuItem>
                                                    <MenuItem value="ONLINE PAYMENT">Pago online</MenuItem>
                                                    <MenuItem value="TRANSFER">Transferencia</MenuItem>
                                                    <MenuItem value="BONUS">Bonificado</MenuItem>
                                                    <MenuItem value="HEALTH INSURANCE">Obra social</MenuItem>
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
                                                    disabled={savingTurnId === turn.id}
                                                    className="add-payment-register-btn"
                                                >
                                                    {savingTurnId === turn.id ? (
                                                        <CircularProgress size={18} color="inherit" />
                                                    ) : (
                                                        "Registrar pago"
                                                    )}
                                                </Button>
                                                {errorByTurnId[turn.id] && (
                                                    <Typography variant="body2" color="error">
                                                        {errorByTurnId[turn.id]}
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