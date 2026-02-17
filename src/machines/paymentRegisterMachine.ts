import { createMachine, assign, fromPromise } from "xstate";
import { PaymentRegisterService } from "../service/payment-register.service";
import type { PaymentRegisterResponse } from "#/models/Turn";

export const PAYMENT_REGISTER_MACHINE_ID = "payment_register";
export const PAYMENT_REGISTER_MACHINE_EVENT_TYPES = [
  "SET_AUTH",
  "LOGOUT",
  "LOAD_PAYMENT_REGISTER",
  "SAVE_PAYMENT_REGISTER",
  "UPDATE_PAYMENT_REGISTER", 
  "DEACTIVATE_ACCOUNT",
  "UPDATE_FORM",
  "UPDATE_LOCAL_FORM",
  "UPDATE_PERIOD",
  "SET_SAVING_PAYMENT",
  "SET_PAYMENT_ERROR",
  "CLEAR_PAYMENT_ERROR",
  "INIT_PAYMENT_PAGE",
  "CLEAR_ERROR"
];

export interface PaymentRegisterTurnForm {
    paymentStatus: string;
    method: string;
    paymentAmount: string;
    copaymentAmount: string;
}

export interface PaymentRegisterMachineContext {
  paymentRegister: PaymentRegisterResponse | null;
  updatingPaymentRegister: boolean;
  accessToken: string | null;
  turnId: string | null;
  formValues: {
    paymentStatus: string;
    method: string;
    paidAt: string | null;
    paymentAmount: number | null;
    copaymentAmount: number | null;
  };
    savingPaymentId: string | null;
    errorByPaymentId: Record<string, string>;
    formByPaymentId: Record<string, PaymentRegisterTurnForm>;
    periodMonth: number;
    periodYear: number;
  loading: boolean;
  error: string | null;
}

const now = new Date();

export const PaymentRegisterMachineDefaultContext: PaymentRegisterMachineContext = {
  paymentRegister: null,
  updatingPaymentRegister: false,
  accessToken: null,
  turnId: null,
  formValues: {
    paymentStatus: "",
    method: "",
    paidAt: null,
    paymentAmount: null,
    copaymentAmount: null,
  },
    savingPaymentId: null,
    errorByPaymentId: {},
    formByPaymentId: {},
    periodMonth: now.getMonth(),
    periodYear: now.getFullYear(),
  loading: false,
  error: null,
}

export type PaymentRegisterMachineEvent =
    { type: "SET_AUTH"; accessToken: string; turnId: string }
    | { type: "LOGOUT" }
    | { type: "LOAD_PAYMENT_REGISTER" }
    | { type: "SAVE_PAYMENT_REGISTER" }
    | { type: "UPDATE_PAYMENT_REGISTER" }
    | { type: "DEACTIVATE_ACCOUNT" }
    | { type: "UPDATE_FORM"; key: string; value: any }
    | { type: "UPDATE_LOCAL_FORM"; paymentId: string; updates: Partial<PaymentRegisterTurnForm> }
    | { type: "UPDATE_PERIOD"; month?: number; year?: number }
    | { type: "SET_SAVING_PAYMENT"; paymentId: string | null }
    | { type: "SET_PAYMENT_ERROR"; paymentId: string; message: string }
    | { type: "CLEAR_PAYMENT_ERROR"; paymentId: string }
    | { type: "INIT_PAYMENT_PAGE" }
    | { type: "CLEAR_ERROR" };


export const paymentRegisterMachine = createMachine({
    id:"payment_register",
    initial: "idle",
    context: PaymentRegisterMachineDefaultContext,
    types:{
        context: {} as PaymentRegisterMachineContext,
        events: {} as PaymentRegisterMachineEvent
    },
    states:{
        idle:{
            on:{
                SET_AUTH:{
                    actions:assign({
                        accessToken:({event})=>event.accessToken,
                        turnId:({event})=>event.turnId
                    })
                },
                LOGOUT:{
                    actions:assign(()=>({
                        ...PaymentRegisterMachineDefaultContext
                    })),
                },
                LOAD_PAYMENT_REGISTER:{
                    target:"loadingPaymentRegister",
                    guard:({context})=> !!context.accessToken && !!context.turnId,
                },
                SAVE_PAYMENT_REGISTER:{
                    target:"updatingPaymentRegister",
                    guard:({context})=> !!context.accessToken && !!context.turnId,
                },
                UPDATE_PAYMENT_REGISTER:{
                    target:"updatingPaymentRegister",
                    guard:({context})=> 
                    !!context.accessToken && 
                    !!context.turnId,
                },
                INIT_PAYMENT_PAGE:{
                    target:"loadingPaymentRegister",
                    guard:({context})=> !!context.accessToken && !!context.turnId,
                },
                UPDATE_FORM:{
                    actions:assign(({ context, event })=> {
                        const updatedFormValues = {
                            ...context.formValues,
                            [event.key]: event.value
                        };
                        return {
                            formValues: updatedFormValues
                        }
                            
                    })
                },
                UPDATE_LOCAL_FORM: {
                    actions: assign(({ context, event }) => {
                        const updateEvent = event as Extract<PaymentRegisterMachineEvent, { type: "UPDATE_LOCAL_FORM" }>;
                        const updates = updateEvent.updates;
                        const paymentId = updateEvent.paymentId;
                        const previousForm = context.formByPaymentId[paymentId] || {
                            paymentStatus: "PENDING",
                            method: "",
                            paymentAmount: "",
                            copaymentAmount: "",
                        };

                        const lockedMethod = updates.paymentStatus === "BONUS"
                            ? "BONUS"
                            : updates.paymentStatus === "HEALTH INSURANCE"
                                ? "HEALTH INSURANCE"
                                : undefined;

                        const nextForm = {
                            ...previousForm,
                            ...updates,
                            ...(lockedMethod ? { method: lockedMethod } : {}),
                            ...(updates.paymentStatus && updates.paymentStatus !== "HEALTH INSURANCE"
                                ? { copaymentAmount: "" }
                                : {})
                        };

                        return {
                            formByPaymentId: {
                                ...context.formByPaymentId,
                                [paymentId]: nextForm,
                            }
                        };
                    })
                },
                UPDATE_PERIOD: {
                    actions: assign(({ context, event }) => ({
                        periodMonth: event.month ?? context.periodMonth,
                        periodYear: event.year ?? context.periodYear,
                    }))
                },
                SET_SAVING_PAYMENT: {
                    actions: assign(({ event }) => ({
                        savingPaymentId: (event as { paymentId: string | null }).paymentId,
                    }))
                },
                SET_PAYMENT_ERROR: {
                    actions: assign(({ context, event }) => {
                        const errorEvent = event as { paymentId: string; message: string };
                        return {
                            errorByPaymentId: {
                                ...context.errorByPaymentId,
                                [errorEvent.paymentId]: errorEvent.message,
                            }
                        };
                    })
                },
                CLEAR_PAYMENT_ERROR: {
                    actions: assign(({ context, event }) => {
                        const clearEvent = event as { paymentId: string };
                        return {
                            errorByPaymentId: {
                                ...context.errorByPaymentId,
                                [clearEvent.paymentId]: "",
                            }
                        };
                    })
                },
                CLEAR_ERROR:{
                    actions:assign({
                        error:null
                    })
                }
            }
        },
        loadingPaymentRegister:{
            entry: assign({
                loading: true,
                error: null
            }),
            invoke:{
                src: fromPromise(async ({ input }: { input: { accessToken: string; turnId: string } }) => {
                    return await PaymentRegisterService.loadPaymentRegister(input);
                }),
                input: ({ context }) => ({
                    accessToken: context.accessToken!,
                    turnId: context.turnId!
                }),
                onDone: {
                    target: "idle",
                    actions: assign(({ event }) => ({
                        paymentRegister: event.output,
                        formValues: {
                            paymentStatus: event.output?.paymentStatus || "",
                            method: event.output?.method || "",
                            paidAt: event.output?.paidAt || null,
                            paymentAmount: event.output?.paymentAmount ?? null,
                            copaymentAmount: event.output?.copaymentAmount ?? null,
                        },
                        loading: false
                    }))
                },
                onError: {
                    target: "idle",
                    actions: assign(({ event }) => ({
                        loading: false,
                        error: event.error instanceof Error ? event.error.message : "Error al cargar el registro de pagos"
                    }))
                }
            }
        },
        updatingPaymentRegister:{
            entry: assign({
                updatingPaymentRegister: true,
                error: null
            }),
            invoke: {
                src: fromPromise(async ({ input }: { input: { accessToken: string; turnId: string; payload: any } }) => {
                    return await PaymentRegisterService.updatePaymentRegister(input);
                }),
                input: ({ context }) => ({
                    accessToken: context.accessToken!,
                    turnId: context.turnId!,
                    payload: {
                        paymentStatus: context.formValues.paymentStatus || null,
                        method: context.formValues.method || null,
                        paidAt: context.formValues.paidAt,
                        paymentAmount: context.formValues.paymentAmount,
                        copaymentAmount: context.formValues.copaymentAmount
                    }
                }),
                onDone: {
                    target: "idle",
                    actions: assign(({ event }) => ({
                        paymentRegister: event.output,
                        formValues: {
                            paymentStatus: event.output?.paymentStatus || "",
                            method: event.output?.method || "",
                            paidAt: event.output?.paidAt || null,
                            paymentAmount: event.output?.paymentAmount ?? null,
                            copaymentAmount: event.output?.copaymentAmount ?? null,
                        },
                        updatingPaymentRegister: false
                    }))
                },
                onError: {
                    target: "idle",
                    actions: assign(({ event }) => ({
                        updatingPaymentRegister: false,
                        error: event.error instanceof Error ? event.error.message : "Error al actualizar el registro de pagos"
                    }))
                }
            }
        }
    
    }
})