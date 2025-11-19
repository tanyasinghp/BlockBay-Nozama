import { useState, useEffect } from 'react'
import { ordersAPI, DEFAULT_BUYER_ADDRESS } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Package, RefreshCw } from 'lucide-react'

const STATUS_COLORS = {
  pending: 'secondary',
  paid: 'default',
  shipped: 'default',
  delivered: 'default',
  cancelled: 'destructive',
  disputed: 'destructive',
  refunded: 'secondary',
}

export default function OrdersView() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await ordersAPI.getAll({
        buyer: DEFAULT_BUYER_ADDRESS,
      })
      setOrders(response.data.orders)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelivery = async (orderId) => {
    try {
      setActionLoading(orderId)
      await ordersAPI.confirmDelivery(orderId)
      await fetchOrders()
    } catch (error) {
      console.error('Failed to confirm delivery:', error)
      alert('Failed to confirm delivery: ' + (error.response?.data?.message || error.message))
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return
    }

    try {
      setActionLoading(orderId)
      await ordersAPI.cancel(orderId, { reason: 'Cancelled by buyer' })
      await fetchOrders()
    } catch (error) {
      console.error('Failed to cancel order:', error)
      alert('Failed to cancel order: ' + (error.response?.data?.message || error.message))
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading orders...</span>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">No orders yet</h3>
        <p className="text-gray-600 mt-2">Your orders will appear here after you make a purchase</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Orders</h2>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {orders.map((order) => (
        <Card key={order.orderId}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{order.listingName}</CardTitle>
                <CardDescription className="font-mono text-xs mt-1">
                  {order.orderId}
                </CardDescription>
              </div>
              <Badge variant={STATUS_COLORS[order.status]}>
                {order.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Quantity</p>
                <p className="font-medium">{order.quantity}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Amount</p>
                <p className="font-medium">{order.totalAmount} {order.currency}</p>
              </div>
              <div>
                <p className="text-gray-600">Seller</p>
                <p className="font-mono text-xs">{order.seller.address.substring(0, 16)}...</p>
              </div>
              <div>
                <p className="text-gray-600">Escrow</p>
                <p className="font-mono text-xs">
                  {order.escrowId ? order.escrowId.substring(0, 16) + '...' : 'N/A'}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex gap-2">
              {order.status === 'shipped' && (
                <Button 
                  size="sm"
                  onClick={() => handleConfirmDelivery(order.orderId)}
                  disabled={actionLoading === order.orderId}
                >
                  {actionLoading === order.orderId && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Confirm Delivery
                </Button>
              )}
              
              {(order.status === 'pending' || order.status === 'paid') && (
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCancelOrder(order.orderId)}
                  disabled={actionLoading === order.orderId}
                >
                  {actionLoading === order.orderId && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Cancel Order
                </Button>
              )}

              {order.status === 'delivered' && (
                <Badge variant="default">Payment released to seller</Badge>
              )}

              {order.status === 'refunded' && (
                <Badge variant="secondary">Payment refunded</Badge>
              )}
            </div>

            <div className="mt-3 text-xs text-gray-500">
              <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
              <p>Updated: {new Date(order.updatedAt).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

