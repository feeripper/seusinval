export type Subscription = {
  id: string;
  userId: string;
  indicatorId: string;
  indicatorName?: string;
  email: string;
  events: string[];
  frequency: 'immediate' | 'daily' | 'weekly';
  active: boolean;
  paused: boolean;
  createdAt: string;
  updatedAt: string;
  lastNotifiedAt?: string;
};

export type NotificationLog = {
  id: string;
  subscriptionId: string;
  indicatorId: string;
  indicatorName?: string;
  eventType: string;
  subject: string;
  status: string;
  simulated: boolean;
  sentAt: string;
};

export const EVENT_OPTIONS = [
  { value: 'data_update', label: 'Nova atualização de dados' },
  { value: 'criticality_change', label: 'Mudança de criticidade' },
  { value: 'became_critical', label: 'Entrada em estado crítico' },
  { value: 'trend_decline', label: 'Piora relevante na tendência' },
  { value: 'forecast_available', label: 'Nova previsão disponível' },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: 'immediate', label: 'Imediatamente' },
  { value: 'daily', label: 'Resumo diário' },
  { value: 'weekly', label: 'Resumo semanal' },
] as const;

export function eventLabel(value: string) {
  return EVENT_OPTIONS.find(e => e.value === value)?.label ?? value;
}

export function frequencyLabel(value: string) {
  return FREQUENCY_OPTIONS.find(f => f.value === value)?.label ?? value;
}
