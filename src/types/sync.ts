export interface SyncPayload {
  uuid: string;
  type: 'HARVEST' | 'PROCESSING' | 'CONSIGNMENT';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  offline_created_at: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  error_message?: string;
}
