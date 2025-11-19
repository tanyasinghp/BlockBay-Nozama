import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import ListingsView from './components/ListingsView'
import OrdersView from './components/OrdersView'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('listings')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Nozama</h1>
          <p className="text-sm text-gray-600 mt-1">Blockchain E-Commerce Platform</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="listings">Browse Products</TabsTrigger>
            <TabsTrigger value="orders">My Orders</TabsTrigger>
          </TabsList>
          
          <TabsContent value="listings" className="mt-6">
            <ListingsView />
          </TabsContent>
          
          <TabsContent value="orders" className="mt-6">
            <OrdersView />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>Powered by Ethereum Smart Contracts</p>
          <p className="mt-1 text-xs">Using Hardhat Local Network</p>
        </div>
      </footer>
    </div>
  )
}

export default App

