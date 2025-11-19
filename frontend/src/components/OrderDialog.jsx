import { useState } from 'react'
import { ordersAPI, DEFAULT_BUYER_ADDRESS } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function OrderDialog({ listing, open, onOpenChange }) {
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [orderCreated, setOrderCreated] = useState(null)
  const [error, setError] = useState(null)

  const totalPrice = (parseFloat(listing.price) * quantity).toFixed(4)

  const handleCreateOrder = async () => {
    try {
      setLoading(true)
      setError(null)

      // Step 1: Create order
      const orderResponse = await ordersAPI.create({
        listingId: listing.listingId,
        quantity,
        buyerAddress: DEFAULT_BUYER_ADDRESS,
      })

      const orderId = orderResponse.data.orderId

      // Step 2: Pay for order
      await ordersAPI.pay(orderId)

      setOrderCreated(orderId)
    } catch (err) {
      console.error('Order creation failed:', err)
      setError(err.response?.data?.message || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOrderCreated(null)
    setError(null)
    setQuantity(1)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{listing.name}</DialogTitle>
          <DialogDescription>
            Complete your purchase on the blockchain
          </DialogDescription>
        </DialogHeader>

        {!orderCreated && !error && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                min="1"
                max={listing.stock}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(listing.stock, parseInt(e.target.value) || 1)))}
                className="mt-1"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Price per item:</span>
                <span className="font-medium">{listing.price} {listing.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Quantity:</span>
                <span className="font-medium">{quantity}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-lg">{totalPrice} {listing.currency}</span>
              </div>
            </div>

            <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
              <p className="font-medium text-blue-900 mb-1">Blockchain Protection:</p>
              <p>Funds will be held in escrow until delivery is confirmed.</p>
            </div>
          </div>
        )}

        {orderCreated && (
          <div className="text-center py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Order Created Successfully!</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your order has been placed and payment is secured in escrow.
            </p>
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p className="font-medium">Order ID:</p>
              <p className="font-mono text-xs mt-1">{orderCreated}</p>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Check "My Orders" tab to track your order status
            </p>
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Order Failed</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <DialogFooter>
          {!orderCreated && !error && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleCreateOrder} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Processing...' : 'Confirm & Pay'}
              </Button>
            </>
          )}
          {(orderCreated || error) && (
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

