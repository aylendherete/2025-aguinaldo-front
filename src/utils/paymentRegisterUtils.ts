import { dayjsArgentina } from "./dateTimeUtils";

const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "long" });

  export const getStatusPaymentLabel = (status?: string | null) => {
    if (!status) {
      return "Sin información de pago";
    }
    
    switch (status) {
      case "PENDING":
        return "Pendiente";
      case "PAID":
        return "Pagado";
      case "HEALTH INSURANCE":
        return "Obra Social";
      case "BONUS":
        return "Bonificado";
      case "CANCELED":
        return "Cancelado";
      default:
        return status;
    }
  };

export interface PaymentFormInput {
    paymentStatus: string;
    method: string;
    paymentAmount: string;
    copaymentAmount: string;
}

export interface PaymentTurnViewModel {
    paymentStatus: string;
    isCanceledPayment: boolean;
    canEditPayment: boolean;
    canDeletePayment: boolean;
    formState: PaymentFormInput;
    copaymentAmount: number;
    paymentAmount: number;
    coverage: number;
}

export const getMonthLabel= (monthIndex:number,selectedYear:number)=>{
        const label=monthFormatter.format(new Date(selectedYear, monthIndex, 1));
        return label.charAt(0).toUpperCase() + label.slice(1);
}



export const currencyFormatter = (amount: number ) => {
        return new Intl.NumberFormat("es-AR", {style: "currency",currency: "ARS",maximumFractionDigits: 2}).format(amount);
    };

export const getMethodLabel = (method: string) => {
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
            case "HEALTH INSURANCE":
                return "Obra social";
                                                    
        }  return method || "Sin registrar";   
    }

export const getPaymentRegisterYears = (turns: any[], currentYear: number): number[] => {
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
        yearSet.add(currentYear);
    }

    return Array.from(yearSet).sort((a, b) => b - a);
};

export const getPaymentRegisterMonths = (
    turns: any[],
    selectedYear: number,
    currentMonth: number,
) => {
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
        monthSet.add(currentMonth);
    }

    return Array.from(monthSet).sort((a, b) => a - b);
};

export const getPeriodTurns = (turns: any[], selectedMonth: number, selectedYear: number) => {
    return turns.filter((turn: any) => {
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
};

export const getPaymentTurns = (periodTurns: any[]) => {
    return periodTurns
        .filter((turn: any) => turn.paymentRegister)
        .sort((a: any, b: any) => {
            const aIsPendingCompleted = a?.status === "COMPLETED" && a?.paymentRegister?.paymentStatus === "PENDING";
            const bIsPendingCompleted = b?.status === "COMPLETED" && b?.paymentRegister?.paymentStatus === "PENDING";

            if (aIsPendingCompleted === bIsPendingCompleted) {
                return 0;
            }

            return aIsPendingCompleted ? -1 : 1;
        });
};

export const buildPaymentSummary = (periodTurns: any[]) => {
    const totals = {
        totalBilled: 0,
        totalCollected: 0,
        totalCopayment: 0,
        totalCovered: 0,
        totalPayments: 0,
        canceledPaymentCount: 0,
        pendingCount: 0,
        paidCount: 0,
        healthInsuranceCount: 0,
        bonusCount: 0,
        completedCount: 0,
        canceledCount: 0,
        totalBonus:0,
        totalAccountsReceivable:0,
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
        

        const paymentAmount = Number(payment.paymentAmount ?? 0);
        const copaymentAmount = Number(payment.copaymentAmount ?? 0);
        const status = payment.paymentStatus;
        const isCanceledPayment = status === "CANCELED";

        if (!isCanceledPayment) {
            totals.totalBilled += paymentAmount;
            totals.totalCopayment += copaymentAmount;
        }

        if (status !== "PENDING" && !isCanceledPayment) {
            totals.totalPayments += 1;
        }

        if (isCanceledPayment) {
            totals.canceledPaymentCount += 1;
        }

        const isBonusMethod = payment.method === "BONUS";
        const isHealthInsuranceMethod = payment.method === "HEALTH INSURANCE" || payment.method === "HEALTH_INSURANCE";

        if (status === "PAID" && !isBonusMethod && !isHealthInsuranceMethod) {
            totals.totalCollected += paymentAmount;
        }


        if (status === "HEALTH INSURANCE") {
            totals.healthInsuranceCount += 1;
            const covered = paymentAmount - copaymentAmount;
            totals.totalCovered += covered > 0 ? covered : 0;
            totals.totalCollected += copaymentAmount;
        }

        if (status === "PENDING" && turn.status === "COMPLETED") {
            totals.pendingCount += 1;
        }

        if (status === "PAID") {
            totals.paidCount += 1;
        }

        if (status === "BONUS") {
            totals.bonusCount += 1;
            totals.totalBonus += paymentAmount;
        }

        if (status==="PENDING"){
            totals.totalAccountsReceivable+=1;
        }
    });

    return totals;
};

export const validatePaymentForm = (form?: PaymentFormInput): string | null => {

    if (!form) {
        return "Completá los datos del pago.";
    }

    if (!form.paymentStatus || form.paymentStatus === "PENDING") {
        return "Seleccioná un estado de pago válido.";
    }

    if (!form.method) {
        return "Seleccioná un medio de pago.";
    }

    if (form.paymentStatus === "BONUS" && form.method !== "BONUS") {
            return "El medio de pago debe ser Bonificado cuando el estado de pago es Bonificado.";
    }

    if (form.paymentStatus === "HEALTH INSURANCE" && form.method !== "HEALTH INSURANCE") {
            return "El medio de pago debe ser Obra Social cuando el estado de pago es Obra Social.";
    }

    if (form.paymentStatus !== "BONUS" && form.method === "BONUS") {
            return "El estado de pago debe ser Bonificado cuando el medio de pago es Bonificado.";
    }

    if (form.paymentStatus !== "HEALTH INSURANCE" && form.method === "HEALTH INSURANCE") {
            return "El estado de pago debe ser Obra Social cuando el medio de pago es Obra Social.";
    }

    if (!form.paymentAmount) {
        return "Ingresá el monto abonado.";
    }

    const paymentAmount = Number(form.paymentAmount);
    if (Number.isNaN(paymentAmount) || !Number.isFinite(paymentAmount)) {
        return "Ingresá un monto abonado válido.";
    }

    if (paymentAmount > 9999999.99) {
        return "El monto del pago debe ser menor que 10 millones.";
    }

    if (paymentAmount <= 0) {
        if (form.paymentStatus === "BONUS") {
                return "El monto del pago debe ser mayor que cero cuando el estado de pago es Bonificado.";
        }
        return "El monto del pago debe ser mayor que cero.";
    }

    if (form.paymentStatus === "HEALTH INSURANCE") {
        if (form.copaymentAmount === "") {
            return "El copago es obligatorio y debe ser mayor o igual que cero cuando el estado de pago es Obra Social.";
        }

        const copaymentAmount = Number(form.copaymentAmount);

        if (Number.isNaN(copaymentAmount) || !Number.isFinite(copaymentAmount)) {
            return "Ingresá un copago válido.";
        }

        if (copaymentAmount > 9999999.99) {
            return "El copago debe ser menor que 10 millones.";
        }

        if (copaymentAmount < 0) {
                return "El copago es obligatorio y debe ser mayor o igual que cero cuando el estado de pago es Obra Social.";
        }

        if (copaymentAmount > paymentAmount) {
                return "El copago debe ser menor o igual al monto del pago.";
        }
    }

    return null;
};

export const buildPaymentUpdatePayload = (form: PaymentFormInput, paidAt: string) => {
    const copaymentValue = form.paymentStatus === "HEALTH INSURANCE" && form.copaymentAmount !== ""
        ? Number(form.copaymentAmount)
        : null;

    return {
        paymentStatus: form.paymentStatus,
        method: form.method,
        paymentAmount: Number(form.paymentAmount),
        copaymentAmount: copaymentValue,
        paidAt,
    };
};

export const buildPaymentTurnViewModel = (
    turn: any,
    savedForm?: Partial<PaymentFormInput>
): PaymentTurnViewModel => {
    const payment = turn?.paymentRegister;
    const paymentStatus = payment?.paymentStatus || "PENDING";
    const isCanceledPayment = paymentStatus === "CANCELED";
    const canEditPayment = turn?.status === "COMPLETED" && (paymentStatus === "PENDING" || isCanceledPayment);
    const canDeletePayment = turn?.status === "COMPLETED" && paymentStatus !== "PENDING" && !isCanceledPayment;

    const formState: PaymentFormInput = {
        paymentStatus: savedForm?.paymentStatus ?? (isCanceledPayment ? "PENDING" : paymentStatus),
        method: savedForm?.method ?? (isCanceledPayment ? "" : (payment?.method || "")),
        paymentAmount: savedForm?.paymentAmount ?? (isCanceledPayment ? "" : (payment?.paymentAmount != null ? String(payment.paymentAmount) : "")),
        copaymentAmount: savedForm?.copaymentAmount ?? (isCanceledPayment ? "" : (payment?.copaymentAmount != null ? String(payment.copaymentAmount) : "")),
    };

    const copaymentAmount = Number(payment?.copaymentAmount ?? 0);
    const paymentAmount = Number(payment?.paymentAmount ?? 0);
    const coverage = paymentStatus === "HEALTH INSURANCE"
        ? Math.max(paymentAmount - copaymentAmount, 0)
        : 0;

    return {
        paymentStatus,
        isCanceledPayment,
        canEditPayment,
        canDeletePayment,
        formState,
        copaymentAmount,
        paymentAmount,
        coverage,
    };
};