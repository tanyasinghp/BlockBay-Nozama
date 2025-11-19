import axios from 'axios';

const API_BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Default buyer address (first Hardhat account)
export const DEFAULT_BUYER_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

export const listingsAPI = {
  getAll: () => api.get('/listings'),
  getById: (id) => api.get(`/listings/${id}`),
};

export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  pay: (id) => api.post(`/orders/${id}/pay`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  confirmDelivery: (id) => api.post(`/orders/${id}/confirm-delivery`),
  cancel: (id, data) => api.post(`/orders/${id}/cancel`, data),
};

export const escrowAPI = {
  getByOrderId: (orderId) => api.get(`/escrow/order/${orderId}`),
  getById: (escrowId) => api.get(`/escrow/${escrowId}`),
};

export default api;

