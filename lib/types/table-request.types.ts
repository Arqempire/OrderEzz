import { TableRow } from './database.types';

export type RequestType = 'waiter' | 'water';
export type RequestStatus = 'pending' | 'acknowledged' | 'resolved';

export interface TableRequest {
  id: string;
  table_id: string;
  type: RequestType;
  status: RequestStatus;
  created_at: string;
  resolved_at?: string | null;
  table?: TableRow;
}
