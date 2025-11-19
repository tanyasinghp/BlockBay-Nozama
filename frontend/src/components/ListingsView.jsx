import { useState, useEffect } from 'react'
import { listingsAPI } from '@/lib/api'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import OrderDialog from './OrderDialog'
import { Package, Loader2 } from 'lucide-react'

export default function ListingsView() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedListing, setSelectedListing] = useState(null)
  const [orderDialogOpen, setOrderDialogOpen] = useState(false)

  useEffect(() => {
    fetchListings()
  }, [])

  const fetchListings = async () => {
    try {
      setLoading(true)
      const response = await listingsAPI.getAll()
      setListings(response.data.listings)
    } catch (error) {
      console.error('Failed to fetch listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBuyClick = (listing) => {
    setSelectedListing(listing)
    setOrderDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading products...</span>
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">No products available</h3>
        <p className="text-gray-600 mt-2">Check back later for new listings</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((listing) => (
          <Card key={listing.listingId} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl">{listing.name}</CardTitle>
              <CardDescription>
                Seller: {listing.seller.address.substring(0, 10)}...
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-grow">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Price:</span>
                  <span className="text-lg font-bold">{listing.price} {listing.currency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Stock:</span>
                  <Badge variant={listing.stock > 10 ? 'default' : 'destructive'}>
                    {listing.stock} available
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge variant={listing.active ? 'default' : 'secondary'}>
                    {listing.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                onClick={() => handleBuyClick(listing)}
                disabled={!listing.active || listing.stock === 0}
                className="w-full"
              >
                {listing.stock === 0 ? 'Out of Stock' : 'Buy Now'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {selectedListing && (
        <OrderDialog
          listing={selectedListing}
          open={orderDialogOpen}
          onOpenChange={setOrderDialogOpen}
        />
      )}
    </>
  )
}

