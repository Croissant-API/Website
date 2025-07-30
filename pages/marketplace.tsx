import React, { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth";
import Link from "next/link";
import styles from "../styles/Marketplace.module.css";
import CachedImage from "../components/CachedImage";

interface Item {
    itemId: string;
    name: string;
    description: string;
    iconHash?: string;
    price?: number;
    rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

interface Sale {
    id: string;
    sellerUserId: string;
    itemId: string;
    uniqueId?: string;
    price: number;
    status: string;
    createdAt: string;
    sellerUsername?: string;
    itemName?: string;
    iconHash?: string;
    rarity?: string;
}

interface BuyOrder {
    id: string;
    buyerUserId: string;
    itemId: string;
    maxPrice: number;
    status: string;
    createdAt: string;
    buyerUsername?: string;
    itemName?: string;
    iconHash?: string;
    rarity?: string;
}

interface Transaction {
    saleId: string;
    buyOrderId: string;
    sellerUserId: string;
    buyerUserId: string;
    itemId: string;
    uniqueId?: string;
    price: number;
    completedAt: string;
    itemName?: string;
    iconHash?: string;
    sellerUsername?: string;
    buyerUsername?: string;
}

interface SellableItem extends Item {
    sellableAmount?: number;
    itemsWithMetadata?: number;
}

const Marketplace = () => {
    const { user } = useAuth();

    // Main states
    const [activeView, setActiveView] = useState<'browse' | 'sell' | 'orders' | 'history'>('browse');
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Item[]>([]);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);

    // Data states
    const [itemSales, setItemSales] = useState<Sale[]>([]);
    const [itemBuyOrders, setItemBuyOrders] = useState<BuyOrder[]>([]);
    const [mySales, setMySales] = useState<Sale[]>([]);
    const [myBuyOrders, setMyBuyOrders] = useState<BuyOrder[]>([]);
    const [history, setHistory] = useState<Transaction[]>([]);
    const [sellableItems, setSellableItems] = useState<SellableItem[]>([]);

    // UI states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Modal states
    const [showQuickSellModal, setShowQuickSellModal] = useState(false);
    const [showBuyOrderModal, setShowBuyOrderModal] = useState(false);
    const [sellPrice, setSellPrice] = useState("");
    const [buyOrderPrice, setBuyOrderPrice] = useState("");

    // Ajouter ces nouveaux states
    const [selectedUniqueItems, setSelectedUniqueItems] = useState<any[]>([]);
    const [showUniqueItemModal, setShowUniqueItemModal] = useState(false);
    const [selectedUniqueItem, setSelectedUniqueItem] = useState<any>(null);

    useEffect(() => {
        if (user) {
            loadMySales();
            loadMyBuyOrders();
            if (activeView === 'sell') {
                loadSellableItems();
            }
        }
    }, [user, activeView]);

    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    const searchItems = async () => {
        if (!searchQuery.trim()) return;

        try {
            setLoading(true);
            const res = await fetch(`/api/marketplace/search?q=${encodeURIComponent(searchQuery)}`);
            if (res.ok) {
                const items = await res.json();
                setSearchResults(items);
            }
        } catch (err) {
            setError("Error searching items");
        } finally {
            setLoading(false);
        }
    };

    const loadItemDetails = async (item: Item) => {
        setSelectedItem(item);
        try {
            const res = await fetch(`/api/marketplace/item/${item.itemId}`);
            if (res.ok) {
                const data = await res.json();
                setItemSales(data.sales);
                setItemBuyOrders(data.buyOrders);
            }
        } catch (err) {
            setError("Error loading item details");
        }
    };

    const loadMySales = async () => {
        try {
            const res = await fetch('/api/marketplace/my-sales');
            if (res.ok) {
                const sales = await res.json();
                setMySales(sales);
            }
        } catch (err) {
            setError("Error loading your sales");
        }
    };

    const loadMyBuyOrders = async () => {
        try {
            const res = await fetch('/api/marketplace/my-buy-orders');
            if (res.ok) {
                const orders = await res.json();
                setMyBuyOrders(orders);
            }
        } catch (err) {
            setError("Error loading your orders");
        }
    };

    const loadHistory = async () => {
        try {
            const res = await fetch('/api/marketplace/history');
            if (res.ok) {
                const historyData = await res.json();
                setHistory(historyData);
            }
        } catch (err) {
            setError("Error loading transaction history");
        }
    };

    const loadSellableItems = async () => {
        try {
            const res = await fetch('/api/marketplace/my-sellable-items');
            if (res.ok) {
                const items = await res.json();
                setSellableItems(items);
            }
        } catch (err) {
            setError("Error loading your items");
        }
    };

    const handleQuickSell = async (item: SellableItem) => {
        setSelectedItem(item);
        setShowQuickSellModal(true);
    };

    const handleSell = async () => {
        if (!selectedItem || !sellPrice || !user) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch('/api/marketplace/sell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: selectedItem.itemId,
                    price: parseFloat(sellPrice)
                })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(`${selectedItem.name} listed for ${formatPrice(parseFloat(sellPrice))}!`);
                setShowQuickSellModal(false);
                setSellPrice("");
                loadMySales();
                loadSellableItems();
            } else {
                setError(data.message || "Failed to list item");
            }
        } catch (err) {
            setError("Error listing item for sale");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBuyOrder = async () => {
        if (!selectedItem || !buyOrderPrice || !user) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch('/api/marketplace/buy-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: selectedItem.itemId,
                    maxPrice: parseFloat(buyOrderPrice)
                })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(`Buy order created for ${selectedItem.name}!`);
                setShowBuyOrderModal(false);
                setBuyOrderPrice("");
                loadMyBuyOrders();
                loadItemDetails(selectedItem);
            } else {
                setError(data.message || "Failed to create buy order");
            }
        } catch (err) {
            setError("Error creating buy order");
        } finally {
            setLoading(false);
        }
    };

    const cancelSale = async (saleId: string) => {
        try {
            const res = await fetch(`/api/marketplace/sales/${saleId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setSuccess("Sale cancelled successfully");
                loadMySales();
                loadSellableItems();
            } else {
                const data = await res.json();
                setError(data.message || "Failed to cancel sale");
            }
        } catch (err) {
            setError("Error cancelling sale");
        }
    };

    const cancelBuyOrder = async (orderId: string) => {
        try {
            const res = await fetch(`/api/marketplace/buy-orders/${orderId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setSuccess("Buy order cancelled successfully");
                loadMyBuyOrders();
            } else {
                const data = await res.json();
                setError(data.message || "Failed to cancel order");
            }
        } catch (err) {
            setError("Error cancelling buy order");
        }
    };

    const handleSellUniqueItem = async (item: SellableItem) => {
        // Pour les items uniques, on doit d'abord récupérer la liste détaillée
        // des instances avec leurs métadonnées
        try {
            setLoading(true);
            const res = await fetch(`/api/inventory/detailed/${item.itemId}`);
            if (res.ok) {
                const detailedItems = await res.json();
                // Filtrer seulement les items avec métadonnées
                const uniqueItems = detailedItems.filter((di: any) => di.metadata);
                
                if (uniqueItems.length > 0) {
                    setSelectedUniqueItems(uniqueItems);
                    setSelectedItem(item);
                    setShowUniqueItemModal(true);
                }
            }
        } catch (err) {
            setError("Error loading unique items");
        } finally {
            setLoading(false);
        }
    };

    const handleSellUniqueItemConfirm = async () => {
        if (!selectedUniqueItem || !sellPrice || !user) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch('/api/marketplace/sell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: selectedUniqueItem.itemId,
                    uniqueId: selectedUniqueItem.metadata?._unique_id,
                    price: parseFloat(sellPrice)
                })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(`Unique ${selectedItem?.name} listed for ${formatPrice(parseFloat(sellPrice))}!`);
                setShowUniqueItemModal(false);
                setSelectedUniqueItem(null);
                setSellPrice("");
                loadMySales();
                loadSellableItems();
            } else {
                setError(data.message || "Failed to list unique item");
            }
        } catch (err) {
            setError("Error listing unique item for sale");
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price: number) => {
        return price?.toLocaleString() + " credits";
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString)?.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRarityClass = (rarity?: string) => {
        if (!rarity) return styles.common;
        return styles[rarity] || styles.common;
    };

    if (!user) {
        return (
            <div className={styles.loginPrompt}>
                <div className={styles.loginCard}>
                    <h2>🏛️ Auction House</h2>
                    <p>You must be logged in to access the marketplace.</p>
                    <Link href="/login" className={styles.loginButton}>
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.marketplace}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>🏛️ Auction House</h1>
                <div className={styles.userInfo}>
                    <span className={styles.credits}>💰 {user?.balance?.toLocaleString() || 0} credits</span>
                </div>
            </div>

            {/* Notifications */}
            {error && (
                <div className={`${styles.notification} ${styles.error}`}>
                    <span>⚠️</span>
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}
            {success && (
                <div className={`${styles.notification} ${styles.success}`}>
                    <span>✅</span>
                    {success}
                    <button onClick={() => setSuccess(null)}>×</button>
                </div>
            )}

            {/* Navigation */}
            <div className={styles.navigation}>
                <button
                    className={`${styles.navButton} ${activeView === 'browse' ? styles.active : ''}`}
                    onClick={() => setActiveView('browse')}
                >
                    🔍 Browse & Buy
                </button>
                <button
                    className={`${styles.navButton} ${activeView === 'sell' ? styles.active : ''}`}
                    onClick={() => setActiveView('sell')}
                >
                    💰 Quick Sell
                </button>
                <button
                    className={`${styles.navButton} ${activeView === 'orders' ? styles.active : ''}`}
                    onClick={() => setActiveView('orders')}
                >
                    📋 My Orders
                </button>
                <button
                    className={`${styles.navButton} ${activeView === 'history' ? styles.active : ''}`}
                    onClick={() => {
                        setActiveView('history');
                        loadHistory();
                    }}
                >
                    📜 History
                </button>
            </div>

            <div className={styles.content}>
                {/* Browse & Buy View */}
                {activeView === 'browse' && (
                    <div className={styles.browseView}>
                        <div className={styles.searchSection}>
                            <div className={styles.searchBar}>
                                <input
                                    type="text"
                                    placeholder="Search for items to buy..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && searchItems()}
                                    className={styles.searchInput}
                                />
                                <button
                                    onClick={searchItems}
                                    className={styles.searchButton}
                                    disabled={loading}
                                >
                                    {loading ? "⏳" : "🔍"} Search
                                </button>
                            </div>

                            {/* Afficher les items populaires ou récents si pas de recherche */}
                            {searchResults.length === 0 && !searchQuery && (
                                <div className={styles.featuredItems}>
                                    <h3>🔥 Featured Items on Sale</h3>
                                    <div className={styles.itemGrid}>
                                        {/* Ces items seront chargés depuis le backend */}
                                        <div className={styles.emptyState}>
                                            <span>🏪</span>
                                            <p>Browse available items by searching above</p>
                                            <p>Or check out the quick sell section to list your items!</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {searchResults.length > 0 && (
                                <div className={styles.searchResults}>
                                    <h3>Search Results ({searchResults.length})</h3>
                                    <div className={styles.itemGrid}>
                                        {searchResults.map(item => (
                                            <div
                                                key={item.itemId}
                                                className={`${styles.itemCard} ${getRarityClass(item.rarity)}`}
                                                onClick={() => loadItemDetails(item)}
                                            >
                                                <div className={styles.itemIcon}>
                                                    <CachedImage
                                                        src={`/items-icons/${item.iconHash || item.itemId}`}
                                                        alt={item.name}
                                                    />
                                                </div>
                                                <div className={styles.itemInfo}>
                                                    <h4 className={styles.itemName}>{item.name}</h4>
                                                    <p className={styles.itemDescription}>{item.description}</p>
                                                    {item.price && (
                                                        <div className={styles.basePrice}>
                                                            Base: {formatPrice(item.price)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedItem && (
                                <div className={styles.itemDetails}>
                                    <div className={styles.itemHeader}>
                                        <CachedImage
                                            src={`/items-icons/${selectedItem.iconHash || selectedItem.itemId}`}
                                            alt={selectedItem.name}
                                            className={styles.selectedItemIcon}
                                        />
                                        <div className={styles.itemMeta}>
                                            <h2>{selectedItem.name}</h2>
                                            <p>{selectedItem.description}</p>
                                            <button
                                                onClick={() => setShowBuyOrderModal(true)}
                                                className={styles.buyOrderButton}
                                            >
                                                📋 Create Buy Order
                                            </button>
                                        </div>
                                    </div>

                                    <div className={styles.marketData}>
                                        <div className={styles.salesColumn}>
                                            <h3>🏪 Available for Purchase</h3>
                                            {itemSales.length > 0 ? (
                                                <div className={styles.marketList}>
                                                    {itemSales.map(sale => (
                                                        <div key={sale.id} className={styles.marketListCard}>
                                                            <div className={styles.marketListContent}>
                                                                <div className={styles.marketListPrice}>{formatPrice(sale.price)}</div>
                                                                <div className={styles.marketListSeller}>by {sale.sellerUsername}</div>
                                                                <div className={styles.marketListTime}>{formatDate(sale.createdAt)}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className={styles.emptyState}>
                                                    <span>🚫</span>
                                                    <p>No items for sale</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className={styles.ordersColumn}>
                                            <h3>📋 Wanted (Buy Orders)</h3>
                                            {itemBuyOrders.length > 0 ? (
                                                <div className={styles.marketList}>
                                                    {itemBuyOrders.map(order => (
                                                        <div key={order.id} className={styles.marketListCard}>
                                                            <div className={styles.marketListContent}>
                                                                <div className={styles.marketListPrice}>Up to {formatPrice(order.maxPrice)}</div>
                                                                <div className={styles.marketListBuyer}>by {order.buyerUsername}</div>
                                                                <div className={styles.marketListTime}>{formatDate(order.createdAt)}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className={styles.emptyState}>
                                                    <span>🚫</span>
                                                    <p>No buy orders</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Quick Sell View - Style TradePanel avec items uniques */}
                {activeView === 'sell' && (
                    <div className={styles.sellView}>
                        <div className={styles.sellHeader}>
                            <h2>💰 Quick Sell Your Items</h2>
                            <p>Select items from your inventory to sell instantly</p>
                        </div>

                        {sellableItems.length > 0 ? (
                            <div className={styles.sellInventorySection}>
                                {/* Items normaux vendables */}
                                <div className={styles.sellCategory}>
                                    <h3>📦 Regular Items</h3>
                                    <div className={styles.tradeInventoryGrid}>
                                        {sellableItems
                                            .filter(item => (item.sellableAmount || 0) > 0)
                                            .map(item => (
                                                <div
                                                    key={item.itemId}
                                                    className={`${styles.tradeInventoryItem} ${getRarityClass(item.rarity)}`}
                                                    onClick={() => handleQuickSell(item)}
                                                    title={`Sell ${item.name}`}
                                                >
                                                    <CachedImage
                                                        src={`/items-icons/${item.iconHash || item.itemId}`}
                                                        alt={item.name}
                                                    />
                                                    <div className={styles.itemAmount}>x{item.sellableAmount}</div>
                                                    <div className={styles.itemName}>{item.name}</div>
                                                    {item.price && (
                                                        <div className={styles.basePrice}>
                                                            Base: {formatPrice(item.price)}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>

                                {/* Items uniques avec métadonnées */}
                                {sellableItems.some(item => (item.itemsWithMetadata || 0) > 0) && (
                                    <div className={styles.sellCategory}>
                                        <h3>✨ Unique Items</h3>
                                        <div className={styles.tradeInventoryGrid}>
                                            {sellableItems
                                                .filter(item => (item.itemsWithMetadata || 0) > 0)
                                                .map(item => (
                                                    <div
                                                        key={`unique-${item.itemId}`}
                                                        className={`${styles.tradeInventoryItem} ${styles.uniqueItem} ${getRarityClass(item.rarity)}`}
                                                        onClick={() => handleSellUniqueItem(item)}
                                                        title={`Sell unique ${item.name}`}
                                                    >
                                                        <CachedImage
                                                            src={`/items-icons/${item.iconHash || item.itemId}`}
                                                            alt={item.name}
                                                        />
                                                        <div className={styles.uniqueBadge}>✨</div>
                                                        <div className={styles.itemAmount}>x{item.itemsWithMetadata}</div>
                                                        <div className={styles.itemName}>{item.name}</div>
                                                        <div className={styles.uniqueLabel}>Unique</div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIcon}>📦</div>
                                <h3>No Sellable Items</h3>
                                <p>You don't have any items available for sale in your inventory.</p>
                                <p className={styles.emptyHint}>Play games and complete quests to earn sellable items!</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Orders View - LIST style from search.tsx */}
                {activeView === 'orders' && (
                    <div className={styles.ordersView}>
                        <div className={styles.ordersSection}>
                            <h2>💰 My Active Sales</h2>
                            {mySales.filter(sale => sale.status === 'active').length > 0 ? (
                                <div className={styles.ordersList}>
                                    {mySales.filter(sale => sale.status === 'active').map(sale => (
                                        <div key={sale.id} className={styles.orderListCard}>
                                            <CachedImage
                                                src={`/items-icons/${sale.iconHash || sale.itemId}`}
                                                alt={sale.itemName}
                                                className={styles.orderListIcon}
                                            />
                                            <div className={styles.orderListContent}>
                                                <div className={styles.orderListName}>{sale.itemName}</div>
                                                <div className={styles.orderListDetails}>
                                                    <span className={styles.orderListPrice}>{formatPrice(sale.price)}</span>
                                                    <span className={styles.orderListStatus}>🟢 Active</span>
                                                </div>
                                                <div className={styles.orderListTime}>Listed {formatDate(sale.createdAt)}</div>
                                            </div>
                                            <button
                                                onClick={() => cancelSale(sale.id)}
                                                className={styles.orderListAction}
                                            >
                                                ❌ Cancel
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <span>🏪</span>
                                    <p>No active sales</p>
                                </div>
                            )}
                        </div>

                        <div className={styles.ordersSection}>
                            <h2>📋 My Buy Orders</h2>
                            {myBuyOrders.filter(order => order.status === 'active').length > 0 ? (
                                <div className={styles.ordersList}>
                                    {myBuyOrders.filter(order => order.status === 'active').map(order => (
                                        <div key={order.id} className={styles.orderListCard}>
                                            <CachedImage
                                                src={`/items-icons/${order.iconHash || order.itemId}`}
                                                alt={order.itemName}
                                                className={styles.orderListIcon}
                                            />
                                            <div className={styles.orderListContent}>
                                                <div className={styles.orderListName}>{order.itemName}</div>
                                                <div className={styles.orderListDetails}>
                                                    <span className={styles.orderListPrice}>Max: {formatPrice(order.maxPrice)}</span>
                                                    <span className={styles.orderListStatus}>🟢 Active</span>
                                                </div>
                                                <div className={styles.orderListTime}>Created {formatDate(order.createdAt)}</div>
                                            </div>
                                            <button
                                                onClick={() => cancelBuyOrder(order.id)}
                                                className={styles.orderListAction}
                                            >
                                                ❌ Cancel
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <span>📋</span>
                                    <p>No active buy orders</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* History View - LIST style from search.tsx */}
                {activeView === 'history' && (
                    <div className={styles.historyView}>
                        <h2>📜 Transaction History</h2>
                        {history.length > 0 ? (
                            <div className={styles.historyList}>
                                {history.map((transaction, index) => (
                                    <div key={index} className={styles.historyListCard}>
                                        <CachedImage
                                            src={`/items-icons/${transaction.iconHash || transaction.itemId}`}
                                            alt={transaction.itemName}
                                            className={styles.historyListIcon}
                                        />
                                        <div className={styles.historyListContent}>
                                            <div className={styles.historyListName}>{transaction.itemName}</div>
                                            <div className={styles.historyListDetails}>
                                                <span className={styles.historyListPrice}>{formatPrice(transaction.price)}</span>
                                                <span className={styles.historyListType}>
                                                    {transaction.sellerUserId === user.user_id ?
                                                        `🔨 Sold to ${transaction.buyerUsername}` :
                                                        `🛒 Bought from ${transaction.sellerUsername}`
                                                    }
                                                </span>
                                            </div>
                                            <div className={styles.historyListTime}>{formatDate(transaction.completedAt)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <span>📜</span>
                                <p>No transaction history yet</p>
                                <p>Your trades will appear here</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Browse market data - LIST style from search.tsx */}
                {selectedItem && (
                    <div className={styles.itemDetails}>
                        <div className={styles.itemHeader}>
                            <CachedImage
                                src={`/items-icons/${selectedItem.iconHash || selectedItem.itemId}`}
                                alt={selectedItem.name}
                                className={styles.selectedItemIcon}
                            />
                            <div className={styles.itemMeta}>
                                <h2>{selectedItem.name}</h2>
                                <p>{selectedItem.description}</p>
                                <button
                                    onClick={() => setShowBuyOrderModal(true)}
                                    className={styles.buyOrderButton}
                                >
                                    📋 Create Buy Order
                                </button>
                            </div>
                        </div>

                        <div className={styles.marketData}>
                            <div className={styles.salesColumn}>
                                <h3>🏪 Available for Purchase</h3>
                                {itemSales.length > 0 ? (
                                    <div className={styles.marketList}>
                                        {itemSales.map(sale => (
                                            <div key={sale.id} className={styles.marketListCard}>
                                                <div className={styles.marketListContent}>
                                                    <div className={styles.marketListPrice}>{formatPrice(sale.price)}</div>
                                                    <div className={styles.marketListSeller}>by {sale.sellerUsername}</div>
                                                    <div className={styles.marketListTime}>{formatDate(sale.createdAt)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        <span>🚫</span>
                                        <p>No items for sale</p>
                                    </div>
                                )}
                            </div>

                            <div className={styles.ordersColumn}>
                                <h3>📋 Wanted (Buy Orders)</h3>
                                {itemBuyOrders.length > 0 ? (
                                    <div className={styles.marketList}>
                                        {itemBuyOrders.map(order => (
                                            <div key={order.id} className={styles.marketListCard}>
                                                <div className={styles.marketListContent}>
                                                    <div className={styles.marketListPrice}>Up to {formatPrice(order.maxPrice)}</div>
                                                    <div className={styles.marketListBuyer}>by {order.buyerUsername}</div>
                                                    <div className={styles.marketListTime}>{formatDate(order.createdAt)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        <span>🚫</span>
                                        <p>No buy orders</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Sell Modal */}
                {showQuickSellModal && selectedItem && (
                    <div className={styles.modalOverlay} onClick={() => setShowQuickSellModal(false)}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                <h3>💰 Sell {selectedItem.name}</h3>
                                <button onClick={() => setShowQuickSellModal(false)}>×</button>
                            </div>
                            <div className={styles.modalContent}>
                                <div className={styles.modalItem}>
                                    <div className={styles.modalItemIcon}>
                                        <CachedImage
                                            src={`/items-icons/${selectedItem.iconHash || selectedItem.itemId}`}
                                            alt={selectedItem.name}
                                        />
                                    </div>
                                    <div className={styles.modalItemInfo}>
                                        <h4>{selectedItem.name}</h4>
                                        <p>{selectedItem.description}</p>
                                    </div>
                                </div>
                                <div className={styles.priceInput}>
                                    <label className={styles.inputLabel}>Sale Price (credits)</label>
                                    <input
                                        type="number"
                                        placeholder="Enter price..."
                                        value={sellPrice}
                                        onChange={(e) => setSellPrice(e.target.value)}
                                        min="1"
                                        className={styles.input}
                                    />
                                </div>
                            </div>
                            <div className={styles.modalActions}>
                                <button
                                    onClick={handleSell}
                                    disabled={loading || !sellPrice}
                                    className={`${styles.modalButton} ${styles.primary}`}
                                >
                                    {loading ? "⏳ Listing..." : "💰 List for Sale"}
                                </button>
                                <button
                                    onClick={() => setShowQuickSellModal(false)}
                                    className={`${styles.modalButton} ${styles.secondary}`}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Buy Order Modal */}
                {showBuyOrderModal && selectedItem && (
                    <div className={styles.modalOverlay} onClick={() => setShowBuyOrderModal(false)}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                <h3>📋 Buy Order: {selectedItem.name}</h3>
                                <button onClick={() => setShowBuyOrderModal(false)}>×</button>
                            </div>
                            <div className={styles.modalContent}>
                                <div className={styles.modalItem}>
                                    <div className={styles.modalItemIcon}>
                                        <CachedImage
                                            src={`/items-icons/${selectedItem.iconHash || selectedItem.itemId}`}
                                            alt={selectedItem.name}
                                        />
                                    </div>
                                    <div className={styles.modalItemInfo}>
                                        <h4>{selectedItem.name}</h4>
                                        <p>{selectedItem.description}</p>
                                    </div>
                                </div>
                                <div className={styles.priceInput}>
                                    <label className={styles.inputLabel}>Maximum Price (credits)</label>
                                    <input
                                        type="number"
                                        placeholder="Maximum you're willing to pay..."
                                        value={buyOrderPrice}
                                        onChange={(e) => setBuyOrderPrice(e.target.value)}
                                        min="1"
                                        className={styles.input}
                                    />
                                    <p className={styles.inputHelp}>
                                        Your order will trigger automatically when someone sells at this price or lower.
                                    </p>
                                </div>
                            </div>
                            <div className={styles.modalActions}>
                                <button
                                    onClick={handleCreateBuyOrder}
                                    disabled={loading || !buyOrderPrice || (user.balance || 0) < parseFloat(buyOrderPrice || "0")}
                                    className={`${styles.modalButton} ${styles.primary}`}
                                >
                                    {loading ? "⏳ Creating..." : "📋 Create Order"}
                                </button>
                                <button
                                    onClick={() => setShowBuyOrderModal(false)}
                                    className={`${styles.modalButton} ${styles.secondary}`}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Unique Item Selection Modal */}
                {showUniqueItemModal && selectedItem && (
                    <div className={styles.modalOverlay} onClick={() => setShowUniqueItemModal(false)}>
                      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                          <h3>✨ Select Unique {selectedItem.name} to Sell</h3>
                          <button onClick={() => setShowUniqueItemModal(false)}>×</button>
                        </div>
                        <div className={styles.modalContent}>
                          <div className={styles.uniqueItemsGrid}>
                            {selectedUniqueItems.map((uniqueItem, index) => (
                              <div
                                key={uniqueItem.metadata?._unique_id || index}
                                className={`${styles.uniqueItemCard} ${selectedUniqueItem?.metadata?._unique_id === uniqueItem.metadata?._unique_id ? styles.selected : ''}`}
                                onClick={() => setSelectedUniqueItem(uniqueItem)}
                              >
                                <CachedImage
                                  src={`/items-icons/${uniqueItem.iconHash || uniqueItem.itemId}`}
                                  alt={selectedItem.name}
                                />
                                <div className={styles.uniqueBadge}>✨</div>
                                <div className={styles.uniqueItemInfo}>
                                  <h5>{selectedItem.name}</h5>
                                  {uniqueItem.metadata && (
                                    <div className={styles.metadataDisplay}>
                                      {Object.entries(uniqueItem.metadata)
                                        .filter(([key]) => key !== '_unique_id')
                                        .map(([key, value]) => (
                                          <div key={key} className={styles.metadataRow}>
                                            <span className={styles.metadataKey}>{key}:</span>
                                            <span className={styles.metadataValue}>{String(value)}</span>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {selectedUniqueItem && (
                            <div className={styles.priceInput}>
                              <label className={styles.inputLabel}>Sale Price (credits)</label>
                              <input
                                type="number"
                                placeholder="Enter price..."
                                value={sellPrice}
                                onChange={(e) => setSellPrice(e.target.value)}
                                min="1"
                                className={styles.input}
                              />
                            </div>
                          )}
                        </div>
                        <div className={styles.modalActions}>
                          <button
                            onClick={handleSellUniqueItemConfirm}
                            disabled={loading || !sellPrice || !selectedUniqueItem}
                            className={`${styles.modalButton} ${styles.primary}`}
                          >
                            {loading ? "⏳ Listing..." : "💰 List Unique Item"}
                          </button>
                          <button
                            onClick={() => {
                              setShowUniqueItemModal(false);
                              setSelectedUniqueItem(null);
                              setSellPrice("");
                            }}
                            className={`${styles.modalButton} ${styles.secondary}`}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
            </div>
        </div>
    );
};

export default Marketplace;