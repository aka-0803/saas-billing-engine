export interface ISubscription {
  id: number;
  tenant_id: number;
  plan_id: number;
  status: string;
  current_usage: number;
  start_date: Date;
  end_date: Date;
}
