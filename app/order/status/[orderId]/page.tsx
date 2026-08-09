import React from 'react';
import { OrderStatusClient } from './order-status-client';

export function generateStaticParams() {
  return [{ orderId: 'live' }];
}

export default function OrderStatusPage() {
  return <OrderStatusClient />;
}
