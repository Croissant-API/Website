import React, { useState, useEffect } from "react";
import { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import CachedImage from "../components/CachedImage";
import useAuth from "../hooks/useAuth";

const endpoint = "/api";

interface MarketplaceSale {
  id: string;
  seller_user_id: string;
  item_id: string;
  unique_id?: string;
  price: number;
  status: 'active' | 'sold' | 'cancelled';
  created_at: string;
  sold_at?: string;
  buyer_user_id?: string;
  item_name: string;
  item_description?: string;
  item_icon_hash?: string;
  seller_username: string;
  buyer_username?: string;
  metadata?: { [key: string]: unknown };
}

interface MarketplaceBuyOrder {
  id: string;
  buyer_user_id: string;
  item_id: string;
  max_price: number;
  status: 'active' | 'filled' | 'cancelled';
  created_at: string;
  filled_at?: string;
  sale_id?: string;
  item_name: string;
  item_description?: string;
  item_icon_hash?: string;
  buyer_username: string;
}

interface InventoryItem {
  item_id: string;
  quantity: number;
  metadata?: { [key: string]: unknown };
  sellable: boolean;
  purchase_price?: number;
  item_name: string;
  item_description?: string;
  item_icon_hash?: string;
  unique_id?: string;
}

// Fonction pour formater les métadonnées pour l'affichage
const formatMetadata = (metadata?: { [key: string]: unknown }) => {
  if (!metadata) return null;
  const displayMetadata = Object.entries(metadata)
    .filter(([key]) => key !== "_unique_id")
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
  return displayMetadata || null;
};

// Composant pour un item sellable avec tooltip
function SellableInventoryItem({
  item,
  onSell,
}: {
  item: InventoryItem;
  onSell: (item: InventoryItem) => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const formattedMetadata = formatMetadata(item.metadata);

  const handleMouseEnter = (e: React.MouseEvent) => {
    setShowTooltip(true);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setMousePos({ x: rect.left, y: rect.top });
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <div 
      className="sellable-inventory-item"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: "relative" }}
    >
      <CachedImage
        src={`/items-icons/${item.item_icon_hash || item.item_id || 'default.png'}`}
        alt={item.item_name}
        className="sellable-item-img"
      />
      <div className="sellable-item-quantity">x{item.quantity}</div>
      <div className="sellable-item-name">{item.item_name}</div>
      
      {/* Indicateur visuel pour les items avec métadonnées */}
      {item.metadata && (
        <div className="sellable-item-metadata-badge">★</div>
      )}

      {/* Tooltip avec métadonnées */}
      {showTooltip && mousePos && (
        <div
          className="sellable-tooltip"
          style={{
            position: "fixed",
            left: mousePos.x,
            top: mousePos.y - 10,
            backgroundColor: "var(--background-color)",
            border: "2px solid var(--border-color)",
            color: "var(--text-color-primary)",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "14px",
            zIndex: 1000,
            maxWidth: "250px",
            wordWrap: "break-word",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{item.item_name}</div>
          <div style={{ fontSize: "12px", color: "var(--text-color-secondary)", marginBottom: "8px" }}>
            {item.item_description}
          </div>
          {formattedMetadata && (
            <div
              style={{
                color: "var(--gold-color)",
                fontSize: "12px",
                marginBottom: "4px",
                fontStyle: "italic",
              }}
            >
              {formattedMetadata}
            </div>
          )}
          {item.purchase_price && (
            <div style={{ fontSize: "11px", color: "var(--text-color-secondary)" }}>
              Purchase price: {item.purchase_price}
              <CachedImage src="/assets/credit.png" style={{ width: 14, verticalAlign: "middle", marginLeft: 4 }} />
            </div>
          )}
        </div>
      )}

      <button
        className="sellable-sell-btn"
        onClick={() => onSell(item)}
      >
        Sell
      </button>
    </div>
  );
}

const MarketplacePage: NextPage = () => {
  const { user, token } = useAuth();
  const router = useRouter();
  
  // States for tabs
  const [activeTab, setActiveTab] = useState<'browse' | 'sell' | 'orders' | 'history'>('browse');
  
  // States for browse tab
  const [sales, setSales] = useState<MarketplaceSale[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("price_asc");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  
  // States for sell tab
  const [sellableItems, setSellableItems] = useState<InventoryItem[]>([]);
  const [mySales, setMySales] = useState<MarketplaceSale[]>([]);
  const [sellLoading, setSellLoading] = useState(false);
  
  // States for orders tab
  const [myOrders, setMyOrders] = useState<MarketplaceBuyOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  // States for history tab
  const [history, setHistory] = useState<{
    sales: MarketplaceSale[];
    purchases: MarketplaceSale[];
    buyOrders: MarketplaceBuyOrder[];
  }>({ sales: [], purchases: [], buyOrders: [] });
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // States for modals
  const [sellModal, setSellModal] = useState<{ item: InventoryItem; price: string } | null>(null);
  const [buyOrderModal, setBuyOrderModal] = useState<{ item_id: string; item_name: string; max_price: string; quantity: string } | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  const itemsPerPage = 20;

  useEffect(() => {
    if (activeTab === 'browse') {
      loadSales();
    }
  }, [activeTab, searchQuery, sortBy, minPrice, maxPrice, currentPage]);

  useEffect(() => {
    if (activeTab === 'sell' && token) {
      loadSellableItems();
      loadMySales();
    }
  }, [activeTab, token]);

  useEffect(() => {
    if (activeTab === 'orders' && token) {
      loadMyOrders();
    }
  }, [activeTab, token]);

  useEffect(() => {
    if (activeTab === 'history' && token) {
      loadHistory();
    }
  }, [activeTab, token]);

  const loadSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: (currentPage * itemsPerPage).toString(),
        sort_by: sortBy,
      });
      
      if (searchQuery) params.append('query', searchQuery);
      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);

      const response = await fetch(`${endpoint}/marketplace/search?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setSales(data.sales);
        setTotalCount(data.total_count);
      } else {
        setAlert(data.message);
      }
    } catch (error) {
      setAlert("Failed to load marketplace");
    } finally {
      setLoading(false);
    }
  };

  const loadSellableItems = async () => {
    setSellLoading(true);
    try {
      const response = await fetch(`${endpoint}/inventory/@me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        const sellable = data.inventory.filter((item: InventoryItem) => item.sellable);
        setSellableItems(sellable);
      }
    } catch (error) {
      console.error("Failed to load sellable items:", error);
    } finally {
      setSellLoading(false);
    }
  };

  const loadMySales = async () => {
    try {
      const response = await fetch(`${endpoint}/marketplace/my-sales`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        setMySales(data);
      }
    } catch (error) {
      console.error("Failed to load my sales:", error);
    }
  };

  const loadMyOrders = async () => {
    setOrdersLoading(true);
    try {
      const response = await fetch(`${endpoint}/marketplace/my-buy-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        setMyOrders(data);
      }
    } catch (error) {
      console.error("Failed to load my orders:", error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`${endpoint}/marketplace/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        setHistory(data);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSellItem = async () => {
    if (!sellModal || !token) return;
    
    const price = parseFloat(sellModal.price);
    if (isNaN(price) || price <= 0) {
      setAlert("Please enter a valid price");
      return;
    }

    try {
      const response = await fetch(`${endpoint}/marketplace/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          item_id: sellModal.item.item_id,
          unique_id: sellModal.item.unique_id,
          price: price
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setAlert("Item listed for sale successfully!");
        setSellModal(null);
        loadSellableItems();
        loadMySales();
      } else {
        setAlert(data.message);
      }
    } catch (error) {
      setAlert("Failed to list item for sale");
    }
  };

  const handleCreateBuyOrder = async () => {
    if (!buyOrderModal || !token) return;
    
    const maxPrice = parseFloat(buyOrderModal.max_price);
    const quantity = parseInt(buyOrderModal.quantity);
    
    if (isNaN(maxPrice) || maxPrice <= 0) {
      setAlert("Please enter a valid max price");
      return;
    }
    
    if (isNaN(quantity) || quantity <= 0) {
      setAlert("Please enter a valid quantity");
      return;
    }

    try {
      const response = await fetch(`${endpoint}/marketplace/buy-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          item_id: buyOrderModal.item_id,
          max_price: maxPrice,
          quantity: quantity
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setAlert(`${data.orders.length} buy order(s) created successfully!`);
        setBuyOrderModal(null);
        loadMyOrders();
      } else {
        setAlert(data.message);
      }
    } catch (error) {
      setAlert("Failed to create buy order");
    }
  };

  const handleCancelSale = async (saleId: string) => {
    if (!token) return;
    
    try {
      const response = await fetch(`${endpoint}/marketplace/sales/${saleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setAlert("Sale cancelled successfully!");
        loadMySales();
        loadSellableItems();
      } else {
        const data = await response.json();
        setAlert(data.message);
      }
    } catch (error) {
      setAlert("Failed to cancel sale");
    }
  };

  const handleCancelBuyOrder = async (orderId: string) => {
    if (!token) return;
    
    try {
      const response = await fetch(`${endpoint}/marketplace/buy-orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setAlert("Buy order cancelled successfully!");
        loadMyOrders();
      } else {
        const data = await response.json();
        setAlert(data.message);
      }
    } catch (error) {
      setAlert("Failed to cancel buy order");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <>
      <Head>
        <title>Marketplace - Croissant</title>
        <meta name="description" content="Buy and sell items on the Croissant marketplace" />
      </Head>

      <div className="marketplace-container">
        {/* Header */}
        <div className="marketplace-header">
          <h1 className="marketplace-title">Marketplace</h1>
          <div className="marketplace-tabs">
            <button
              className={`marketplace-tab ${activeTab === 'browse' ? 'active' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              Browse
            </button>
            {user && (
              <>
                <button
                  className={`marketplace-tab ${activeTab === 'sell' ? 'active' : ''}`}
                  onClick={() => setActiveTab('sell')}
                >
                  Sell Items
                </button>
                <button
                  className={`marketplace-tab ${activeTab === 'orders' ? 'active' : ''}`}
                  onClick={() => setActiveTab('orders')}
                >
                  Buy Orders
                </button>
                <button
                  className={`marketplace-tab ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  History
                </button>
              </>
            )}
          </div>
        </div>

        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <div className="marketplace-browse">
            {/* Filters */}
            <div className="marketplace-filters">
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="marketplace-search"
              />
              <input
                type="number"
                placeholder="Min price"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="marketplace-price-filter"
              />
              <input
                type="number"
                placeholder="Max price"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="marketplace-price-filter"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="marketplace-sort"
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
              </select>
            </div>

            {/* Results info */}
            <div className="marketplace-results-info">
              Showing {sales.length} of {totalCount} items
            </div>

            {/* Items list */}
            {loading ? (
              <div className="marketplace-loading">Loading...</div>
            ) : (
              <>
                <div className="marketplace-sales-list">
                  {sales.map((sale) => (
                    <div key={sale.id} className="marketplace-sale-card">
                      <CachedImage
                        src={`/items-icons/${sale.item_icon_hash || sale.item_id || 'default.png'}`}
                        alt={sale.item_name}
                        className="marketplace-sale-icon"
                      />
                      <div className="marketplace-sale-content">
                        <div className="marketplace-sale-header">
                          <div className="marketplace-sale-name">
                            {sale.item_name}
                            {sale.metadata && <span className="marketplace-metadata-star">★</span>}
                          </div>
                          <div className="marketplace-sale-price">
                            {sale.price}
                            <CachedImage
                              src="/assets/credit.png"
                              alt="credits"
                              className="marketplace-credit-icon"
                            />
                          </div>
                        </div>
                        <div className="marketplace-sale-description">
                          {sale.item_description}
                        </div>
                        <div className="marketplace-sale-seller">
                          Sold by {sale.seller_username}
                        </div>
                        <div className="marketplace-sale-metadata">
                          {formatMetadata(sale.metadata) && (
                            <div className="marketplace-metadata-display">
                              {formatMetadata(sale.metadata)}
                            </div>
                          )}
                        </div>
                        <div className="marketplace-sale-actions">
                          {user && (
                            <button
                              className="marketplace-buy-order-btn"
                              onClick={() => setBuyOrderModal({
                                item_id: sale.item_id,
                                item_name: sale.item_name,
                                max_price: sale.price.toString(),
                                quantity: "1"
                              })}
                            >
                              Create Buy Order
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="marketplace-pagination">
                    <button
                      disabled={currentPage === 0}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      className="marketplace-page-btn"
                    >
                      Previous
                    </button>
                    <span className="marketplace-page-info">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <button
                      disabled={currentPage >= totalPages - 1}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      className="marketplace-page-btn"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Sell Tab */}
        {activeTab === 'sell' && user && (
          <div className="marketplace-sell">
            <div className="marketplace-section">
              <h2>Your Sellable Items</h2>
              {sellLoading ? (
                <div className="marketplace-loading">Loading...</div>
              ) : (
                <div className="sellable-inventory-grid">
                  {sellableItems.map((item, index) => (
                    <SellableInventoryItem
                      key={`${item.item_id}-${item.unique_id || index}`}
                      item={item}
                      onSell={(item) => setSellModal({ item, price: "" })}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="marketplace-section">
              <h2>Your Active Sales</h2>
              <div className="marketplace-my-sales-list">
                {mySales.filter(sale => sale.status === 'active').map((sale) => (
                  <div key={sale.id} className="marketplace-my-sale-card">
                    <CachedImage
                      src={`/items-icons/${sale.item_icon_hash || sale.item_id || 'default.png'}`}
                      alt={sale.item_name}
                      className="marketplace-my-sale-icon"
                    />
                    <div className="marketplace-my-sale-content">
                      <div className="marketplace-my-sale-name">
                        {sale.item_name}
                        {sale.metadata && <span className="marketplace-metadata-star">★</span>}
                      </div>
                      <div className="marketplace-my-sale-price">
                        {sale.price}
                        <CachedImage src="/assets/credit.png" className="marketplace-credit-icon" />
                      </div>
                      <div className="marketplace-my-sale-date">Listed {formatDate(sale.created_at)}</div>
                      {formatMetadata(sale.metadata) && (
                        <div className="marketplace-metadata-display">
                          {formatMetadata(sale.metadata)}
                        </div>
                      )}
                    </div>
                    <button
                      className="marketplace-cancel-btn"
                      onClick={() => handleCancelSale(sale.id)}
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && user && (
          <div className="marketplace-orders">
            <h2>Your Buy Orders</h2>
            {ordersLoading ? (
              <div className="marketplace-loading">Loading...</div>
            ) : (
              <div className="marketplace-orders-list">
                {myOrders.filter(order => order.status === 'active').map((order) => (
                  <div key={order.id} className="marketplace-order-card">
                    <div className="marketplace-order-content">
                      <div className="marketplace-order-name">{order.item_name}</div>
                      <div className="marketplace-order-price">
                        Max: {order.max_price}
                        <CachedImage src="/assets/credit.png" className="marketplace-credit-icon" />
                      </div>
                      <div className="marketplace-order-date">Created {formatDate(order.created_at)}</div>
                    </div>
                    <button
                      className="marketplace-cancel-btn"
                      onClick={() => handleCancelBuyOrder(order.id)}
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && user && (
          <div className="marketplace-history">
            {historyLoading ? (
              <div className="marketplace-loading">Loading...</div>
            ) : (
              <>
                <div className="marketplace-section">
                  <h2>Completed Sales</h2>
                  <div className="marketplace-history-list">
                    {history.sales.filter(sale => sale.status === 'sold').map((sale) => (
                      <div key={sale.id} className="marketplace-history-card">
                        <CachedImage
                          src={`/items-icons/${sale.item_icon_hash || sale.item_id || 'default.png'}`}
                          alt={sale.item_name}
                          className="marketplace-history-icon"
                        />
                        <div className="marketplace-history-content">
                          <div className="marketplace-history-name">
                            {sale.item_name}
                            {sale.metadata && <span className="marketplace-metadata-star">★</span>}
                          </div>
                          <div className="marketplace-history-price">
                            Sold for {sale.price}
                            <CachedImage src="/assets/credit.png" className="marketplace-credit-icon" />
                          </div>
                          <div className="marketplace-history-buyer">to {sale.buyer_username}</div>
                          <div className="marketplace-history-date">{formatTime(sale.sold_at!)}</div>
                          {formatMetadata(sale.metadata) && (
                            <div className="marketplace-metadata-display">
                              {formatMetadata(sale.metadata)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="marketplace-section">
                  <h2>Your Purchases</h2>
                  <div className="marketplace-history-list">
                    {history.purchases.map((purchase) => (
                      <div key={purchase.id} className="marketplace-history-card">
                        <CachedImage
                          src={`/items-icons/${purchase.item_icon_hash || purchase.item_id || 'default.png'}`}
                          alt={purchase.item_name}
                          className="marketplace-history-icon"
                        />
                        <div className="marketplace-history-content">
                          <div className="marketplace-history-name">
                            {purchase.item_name}
                            {purchase.metadata && <span className="marketplace-metadata-star">★</span>}
                          </div>
                          <div className="marketplace-history-price">
                            Bought for {purchase.price}
                            <CachedImage src="/assets/credit.png" className="marketplace-credit-icon" />
                          </div>
                          <div className="marketplace-history-seller">from {purchase.seller_username}</div>
                          <div className="marketplace-history-date">{formatTime(purchase.sold_at!)}</div>
                          {formatMetadata(purchase.metadata) && (
                            <div className="marketplace-metadata-display">
                              {formatMetadata(purchase.metadata)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="marketplace-section">
                  <h2>Filled Buy Orders</h2>
                  <div className="marketplace-history-list">
                    {history.buyOrders.filter(order => order.status === 'filled').map((order) => (
                      <div key={order.id} className="marketplace-history-card">
                        <div className="marketplace-history-content">
                          <div className="marketplace-history-name">{order.item_name}</div>
                          <div className="marketplace-history-price">
                            Max price: {order.max_price}
                            <CachedImage src="/assets/credit.png" className="marketplace-credit-icon" />
                          </div>
                          <div className="marketplace-history-date">{formatTime(order.filled_at!)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Sell Modal */}
        {sellModal && (
          <div className="marketplace-modal-overlay">
            <div className="marketplace-modal">
              <h3>Sell Item</h3>
              <div className="marketplace-modal-item">
                <CachedImage
                  src={`/items-icons/${sellModal.item.item_icon_hash || sellModal.item.item_id || 'default.png'}`}
                  alt={sellModal.item.item_name}
                  className="marketplace-modal-img"
                />
                <div>
                  <div className="marketplace-modal-name">
                    {sellModal.item.item_name}
                    {sellModal.item.metadata && <span className="marketplace-metadata-star">★</span>}
                  </div>
                  {sellModal.item.item_description && (
                    <div className="marketplace-modal-desc">{sellModal.item.item_description}</div>
                  )}
                  {formatMetadata(sellModal.item.metadata) && (
                    <div className="marketplace-metadata-display">
                      {formatMetadata(sellModal.item.metadata)}
                    </div>
                  )}
                </div>
              </div>
              <div className="marketplace-modal-form">
                <label>
                  Price:
                  <input
                    type="number"
                    value={sellModal.price}
                    onChange={(e) => setSellModal({ ...sellModal, price: e.target.value })}
                    className="marketplace-modal-input"
                    placeholder="Enter price..."
                    min="0"
                    step="0.01"
                  />
                </label>
              </div>
              <div className="marketplace-modal-buttons">
                <button onClick={handleSellItem} className="marketplace-modal-confirm">
                  List for Sale
                </button>
                <button onClick={() => setSellModal(null)} className="marketplace-modal-cancel">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Buy Order Modal */}
        {buyOrderModal && (
          <div className="marketplace-modal-overlay">
            <div className="marketplace-modal">
              <h3>Create Buy Order</h3>
              <div className="marketplace-modal-item">
                <div>
                  <div className="marketplace-modal-name">{buyOrderModal.item_name}</div>
                  <div className="marketplace-modal-desc">
                    Create a buy order to automatically purchase this item when it becomes available at your target price.
                  </div>
                </div>
              </div>
              <div className="marketplace-modal-form">
                <label>
                  Max Price:
                  <input
                    type="number"
                    value={buyOrderModal.max_price}
                    onChange={(e) => setBuyOrderModal({ ...buyOrderModal, max_price: e.target.value })}
                    className="marketplace-modal-input"
                    placeholder="Maximum price per item..."
                    min="0"
                    step="0.01"
                  />
                </label>
                <label>
                  Quantity:
                  <input
                    type="number"
                    value={buyOrderModal.quantity}
                    onChange={(e) => setBuyOrderModal({ ...buyOrderModal, quantity: e.target.value })}
                    className="marketplace-modal-input"
                    placeholder="Number of items..."
                    min="1"
                    max="100"
                  />
                </label>
              </div>
              <div className="marketplace-modal-buttons">
                <button onClick={handleCreateBuyOrder} className="marketplace-modal-confirm">
                  Create Buy Order
                </button>
                <button onClick={() => setBuyOrderModal(null)} className="marketplace-modal-cancel">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alert Modal */}
        {alert && (
          <div className="marketplace-alert-overlay">
            <div className="marketplace-alert">
              <div className="marketplace-alert-message">{alert}</div>
              <button onClick={() => setAlert(null)} className="marketplace-alert-ok">
                OK
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .marketplace-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          background: var(--background-color);
          color: var(--text-color-primary);
          min-height: calc(100vh - 100px);
        }

        .marketplace-header {
          margin-bottom: 30px;
        }

        .marketplace-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--text-color-primary);
          margin-bottom: 20px;
        }

        .marketplace-tabs {
          display: flex;
          gap: 10px;
          border-bottom: 2px solid var(--border-color);
          padding-bottom: 10px;
        }

        .marketplace-tab {
          padding: 12px 24px;
          background: var(--background-medium);
          border: 2px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-color-secondary);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .marketplace-tab:hover {
          background: var(--background-light);
          color: var(--text-color-primary);
        }

        .marketplace-tab.active {
          background: var(--gold-color);
          color: #000;
          border-color: var(--gold-color);
        }

        .marketplace-filters {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .marketplace-search {
          flex: 2;
          min-width: 300px;
          padding: 12px 16px;
          background: var(--background-medium);
          border: 2px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-color-primary);
          font-size: 16px;
        }

        .marketplace-price-filter {
          flex: 1;
          min-width: 120px;
          padding: 12px 16px;
          background: var(--background-medium);
          border: 2px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-color-primary);
          font-size: 16px;
        }

        .marketplace-sort {
          flex: 1;
          min-width: 200px;
          padding: 12px 16px;
          background: var(--background-medium);
          border: 2px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-color-primary);
          font-size: 16px;
        }

        .marketplace-results-info {
          margin-bottom: 20px;
          color: var(--text-color-secondary);
          font-size: 16px;
        }

        /* Browse - List style like search.tsx */
        .marketplace-sales-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 30px;
        }

        .marketplace-sale-card {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 16px;
          borderRadius: 12px;
          background: var(--background-medium);
          border: 2px solid var(--border-color);
          transition: all 0.2s;
        }

        .marketplace-sale-card:hover {
          border-color: var(--gold-color);
          box-shadow: 0 4px 16px rgba(0,0,0,0.28);
        }

        .marketplace-sale-icon {
          width: 64px;
          height: 64px;
          object-fit: contain;
          border-radius: 12px;
          background: #23232a;
          border: 2px solid #888;
        }

        .marketplace-sale-content {
          flex: 1;
        }

        .marketplace-sale-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 4px;
        }

        .marketplace-sale-name {
          font-weight: 700;
          font-size: 20px;
          color: var(--text-color-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .marketplace-sale-price {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--gold-color);
          font-weight: 700;
          font-size: 18px;
        }

        .marketplace-sale-description {
          color: var(--text-color-secondary);
          font-size: 15px;
          margin-bottom: 4px;
          min-height: 18px;
          max-height: 36px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .marketplace-sale-seller {
          color: var(--text-color-secondary);
          font-size: 14px;
          margin-bottom: 8px;
        }

        .marketplace-metadata-star {
          color: var(--gold-color);
          font-size: 16px;
        }

        .marketplace-metadata-display {
          color: var(--gold-color);
          font-size: 12px;
          font-style: italic;
          margin-bottom: 8px;
        }

        .marketplace-sale-actions {
          display: flex;
          gap: 12px;
        }

        .marketplace-buy-order-btn {
          background: #4caf50;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }

        .marketplace-buy-order-btn:hover {
          background: #45a049;
        }

        .marketplace-credit-icon {
          width: 18px;
          height: 18px;
          vertical-align: middle;
        }

        /* Sell - Grid style like TradePanel.tsx */
        .sellable-inventory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 16px;
          margin-bottom: 30px;
        }

        .sellable-inventory-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px;
          background: var(--background-medium);
          border: 2px solid var(--border-color);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .sellable-inventory-item:hover {
          border-color: var(--gold-color);
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        }

        .sellable-item-img {
          width: 64px;
          height: 64px;
          object-fit: contain;
          border-radius: 6px;
          background: #23232a;
          border: 1px solid #444;
          margin-bottom: 8px;
        }

        .sellable-item-quantity {
          font-size: 12px;
          color: var(--text-color-secondary);
          margin-bottom: 4px;
        }

        .sellable-item-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-color-primary);
          text-align: center;
          margin-bottom: 8px;
          line-height: 1.2;
        }

        .sellable-item-metadata-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: var(--gold-color);
          color: #000;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
        }

        .sellable-sell-btn {
          background: var(--gold-color);
          color: #000;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
          transition: opacity 0.2s;
        }

        .sellable-sell-btn:hover {
          opacity: 0.8;
        }

        /* My Sales List */
        .marketplace-my-sales-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .marketplace-my-sale-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--background-medium);
          border: 2px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
        }

        .marketplace-my-sale-icon {
          width: 48px;
          height: 48px;
          object-fit: contain;
          border-radius: 6px;
          background: #23232a;
          border: 1px solid #444;
        }

        .marketplace-my-sale-content {
          flex: 1;
        }

        .marketplace-my-sale-name {
          font-weight: 600;
          color: var(--text-color-primary);
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .marketplace-my-sale-price {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--gold-color);
          font-weight: 600;
          margin-bottom: 2px;
        }

        .marketplace-my-sale-date {
          color: var(--text-color-secondary);
          font-size: 14px;
        }

        .marketplace-section {
          margin-bottom: 40px;
        }

        .marketplace-section h2 {
          font-size: 1.8rem;
          color: var(--text-color-primary);
          margin-bottom: 20px;
          border-bottom: 2px solid var(--border-color);
          padding-bottom: 10px;
        }

        .marketplace-orders-list,
        .marketplace-history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .marketplace-order-card,
        .marketplace-history-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--background-medium);
          border: 2px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
        }

        .marketplace-history-icon {
          width: 48px;
          height: 48px;
          object-fit: contain;
          border-radius: 6px;
          background: #23232a;
          border: 1px solid #444;
        }

        .marketplace-order-content,
        .marketplace-history-content {
          flex: 1;
        }

        .marketplace-order-name,
        .marketplace-history-name {
          font-weight: 600;
          color: var(--text-color-primary);
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .marketplace-order-price,
        .marketplace-history-price {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--gold-color);
          font-weight: 600;
          margin-bottom: 2px;
        }

        .marketplace-order-date,
        .marketplace-history-date,
        .marketplace-history-buyer,
        .marketplace-history-seller {
          color: var(--text-color-secondary);
          font-size: 14px;
        }

        .marketplace-cancel-btn {
          background: #f44336;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }

        .marketplace-cancel-btn:hover {
          background: #d32f2f;
        }

        .marketplace-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          margin-top: 30px;
        }

        .marketplace-page-btn {
          padding: 10px 20px;
          background: var(--background-medium);
          border: 2px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-color-primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .marketplace-page-btn:hover:not(:disabled) {
          background: var(--gold-color);
          color: #000;
        }

        .marketplace-page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .marketplace-page-info {
          color: var(--text-color-secondary);
          font-weight: 600;
        }

        .marketplace-loading {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-color-secondary);
          font-size: 18px;
        }

        /* Modals */
        .marketplace-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .marketplace-modal {
          background: var(--background-color);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          padding: 24px;
          min-width: 400px;
          max-width: 90vw;
        }

        .marketplace-modal h3 {
          color: var(--text-color-primary);
          margin-bottom: 20px;
          font-size: 1.5rem;
        }

        .marketplace-modal-item {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
          padding: 12px;
          background: var(--background-medium);
          border-radius: 8px;
        }

        .marketplace-modal-img {
          width: 64px;
          height: 64px;
          object-fit: contain;
          border-radius: 8px;
          background: #23232a;
          border: 2px solid #444;
        }

        .marketplace-modal-name {
          font-weight: 700;
          font-size: 18px;
          color: var(--text-color-primary);
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .marketplace-modal-desc {
          color: var(--text-color-secondary);
          font-size: 14px;
          line-height: 1.4;
        }

        .marketplace-modal-form {
          margin-bottom: 20px;
        }

        .marketplace-modal-form label {
          display: block;
          margin-bottom: 15px;
          color: var(--text-color-primary);
          font-weight: 600;
        }

        .marketplace-modal-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--background-medium);
          border: 2px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-color-primary);
          font-size: 16px;
          margin-top: 8px;
        }

        .marketplace-modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .marketplace-modal-confirm {
          background: var(--gold-color);
          color: #000;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: opacity 0.2s;
        }

        .marketplace-modal-confirm:hover {
          opacity: 0.8;
        }

        .marketplace-modal-cancel {
          background: var(--background-medium);
          color: var(--text-color-primary);
          border: 2px solid var(--border-color);
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .marketplace-modal-cancel:hover {
          background: var(--background-light);
        }

        .marketplace-alert-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1001;
        }

        .marketplace-alert {
          background: var(--background-color);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          padding: 24px;
          min-width: 300px;
          max-width: 90vw;
          text-align: center;
        }

        .marketplace-alert-message {
          color: var(--text-color-primary);
          margin-bottom: 20px;
          font-size: 16px;
          line-height: 1.4;
        }

        .marketplace-alert-ok {
          background: var(--gold-color);
          color: #000;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: opacity 0.2s;
        }

        .marketplace-alert-ok:hover {
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .marketplace-container {
            padding: 15px;
          }

          .marketplace-title {
            font-size: 2rem;
          }

          .marketplace-filters {
            flex-direction: column;
          }

          .marketplace-search,
          .marketplace-price-filter,
          .marketplace-sort {
            flex: none;
            min-width: auto;
          }

          .marketplace-tabs {
            flex-wrap: wrap;
          }

          .marketplace-tab {
            flex: 1;
            min-width: 120px;
            text-align: center;
          }

          .sellable-inventory-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 12px;
          }

          .marketplace-sale-card {
            flex-direction: column;
            text-align: center;
          }

          .marketplace-sale-header {
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }
        }
      `}</style>
    </>
  );
};

export default MarketplacePage;