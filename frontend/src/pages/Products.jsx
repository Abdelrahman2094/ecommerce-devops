import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState({});
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
  });

  const { addItem } = useCart();
  const { isAdmin } = useAuth();

  async function loadProducts() {
    try {
      setError('');
      const { data } = await api.get('/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Load products error:', err.response?.data || err.message);
      setError('Failed to load products. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter(product => {
      const name = String(product?.name ?? '').toLowerCase();
      const description = String(product?.description ?? '').toLowerCase();
      const stock = Number(product?.stock ?? 0);

      const matchesSearch =
        !normalizedSearch ||
        name.includes(normalizedSearch) ||
        description.includes(normalizedSearch);

      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'in-stock' && stock > 0) ||
        (stockFilter === 'out-of-stock' && stock === 0);

      return matchesSearch && matchesStock;
    });
  }, [products, search, stockFilter]);

  function handleAdd(product) {
    if (!product || Number(product.stock) <= 0) return;

    addItem(product);
    setAdded(prev => ({ ...prev, [product.id]: true }));

    setTimeout(() => {
      setAdded(prev => ({ ...prev, [product.id]: false }));
    }, 1200);
  }

  function getProductTag(product) {
    const stock = Number(product?.stock ?? 0);
    const price = Number(product?.price ?? 0);

    if (stock === 0) return 'Unavailable';
    if (stock <= 3) return 'Limited';
    if (price >= 1000) return 'Premium';
    return 'Available';
  }

  function getStockLabel(stock) {
    const safeStock = Number(stock ?? 0);

    if (safeStock === 0) return 'Out of stock';
    if (safeStock <= 3) return `${safeStock} left`;
    return `${safeStock} in stock`;
  }

  function handleNewProductChange(field) {
    return e => {
      setNewProduct(prev => ({
        ...prev,
        [field]: e.target.value,
      }));

      if (formError) setFormError('');
      if (formSuccess) setFormSuccess('');
    };
  }

  function validateNewProduct() {
    if (!newProduct.name.trim()) return 'Product name is required.';
    if (!newProduct.description.trim()) return 'Product description is required.';
    if (newProduct.price === '' || Number.isNaN(Number(newProduct.price))) {
      return 'Please enter a valid price.';
    }
    if (Number(newProduct.price) < 0) return 'Price cannot be negative.';
    if (newProduct.stock === '' || Number.isNaN(Number(newProduct.stock))) {
      return 'Please enter a valid stock value.';
    }
    if (Number(newProduct.stock) < 0) return 'Stock cannot be negative.';
    return null;
  }

  async function handleCreateProduct(e) {
    e.preventDefault();

    if (creatingProduct) return;

    setFormError('');
    setFormSuccess('');

    const validationError = validateNewProduct();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setCreatingProduct(true);

    try {
      const payload = {
        name: newProduct.name.trim(),
        description: newProduct.description.trim(),
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
      };

      console.log('Creating product payload:', payload);

      const { data } = await api.post('/products', payload);
      console.log('Create product response:', data);

      await loadProducts();

      setNewProduct({
        name: '',
        description: '',
        price: '',
        stock: '',
      });

      setFormSuccess('Product created successfully.');
      setShowAddForm(false);
    } catch (err) {
      console.error('Create product error:', err.response?.data || err.message);

      setFormError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Failed to create product.'
      );
    } finally {
      setCreatingProduct(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-loading">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="hero-card">
        <h1 className="hero-title">
          Secure shopping starts with <span className="highlight">trust</span>.
        </h1>
        <p className="hero-text">
          Browse products through a protected storefront with role-aware navigation,
          safe rendering, and a cleaner payment flow.
        </p>

        <div className="info-grid">
          <div className="info-card">
            <h3>{products.length} Products</h3>
            <p>Browse the current catalog fetched securely from the backend API.</p>
          </div>

          <div className="info-card">
            <h3>Protected Access</h3>
            <p>Only authenticated users can access products, cart, and payment routes.</p>
          </div>

          <div className="info-card">
            <h3>{isAdmin ? 'Admin View Enabled' : 'Customer View'}</h3>
            <p>
              {isAdmin
                ? 'You are viewing the storefront with admin-aware product management.'
                : 'You are viewing the standard customer storefront experience.'}
            </p>
          </div>
        </div>
      </section>

      <div className="page-header section-spacing">
        <div>
          <h1>Products</h1>
          <p className="page-subtitle">
            {filteredProducts.length} of {products.length} items shown
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowAddForm(prev => !prev);
              setFormError('');
              setFormSuccess('');
            }}
          >
            {showAddForm ? 'Close Form' : 'Add Product'}
          </button>
        )}
      </div>

      {formSuccess && !showAddForm && (
        <div className="alert alert-success section-spacing">{formSuccess}</div>
      )}

      {isAdmin && showAddForm && (
        <div className="surface-card section-spacing" style={{ padding: '1rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Add New Product</h2>

          {formError && <div className="alert alert-error">{formError}</div>}

          <form onSubmit={handleCreateProduct} noValidate>
            <div className="form-group">
              <label htmlFor="new-name">Product name</label>
              <input
                id="new-name"
                type="text"
                value={newProduct.name}
                onChange={handleNewProductChange('name')}
                placeholder="Enter product name"
                disabled={creatingProduct}
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-description">Description</label>
              <textarea
                id="new-description"
                value={newProduct.description}
                onChange={handleNewProductChange('description')}
                placeholder="Enter product description"
                disabled={creatingProduct}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="new-price">Price</label>
                <input
                  id="new-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProduct.price}
                  onChange={handleNewProductChange('price')}
                  placeholder="0.00"
                  disabled={creatingProduct}
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-stock">Stock</label>
                <input
                  id="new-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={newProduct.stock}
                  onChange={handleNewProductChange('stock')}
                  placeholder="0"
                  disabled={creatingProduct}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-success"
              disabled={creatingProduct}
            >
              {creatingProduct ? 'Saving...' : 'Save Product'}
            </button>
          </form>
        </div>
      )}

      <div className="surface-card section-spacing" style={{ padding: '1rem' }}>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="product-search">Search products</label>
            <input
              id="product-search"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or description"
              autoComplete="off"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="stock-filter">Availability</label>
            <select
              id="stock-filter"
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value)}
            >
              <option value="all">All products</option>
              <option value="in-stock">In stock only</option>
              <option value="out-of-stock">Out of stock only</option>
            </select>
          </div>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="empty-state section-spacing">
          No matching products found. Try changing your search or stock filter.
        </div>
      ) : (
        <div className="product-grid section-spacing">
          {filteredProducts.map(product => {
            const stock = Number(product?.stock ?? 0);
            const price = Number(product?.price ?? 0);
            const productName = String(product?.name ?? 'Unnamed product');
            const productDescription =
              String(product?.description ?? '').trim() || 'No description provided.';
            const isOutOfStock = stock === 0;

            return (
              <article key={product.id} className="product-card">
                <div className="product-top">
                  <span className="product-tag">{getProductTag(product)}</span>

                  <span
                    className={`status-pill ${
                      isOutOfStock ? 'danger' : stock <= 3 ? 'warning' : 'success'
                    }`}
                  >
                    {getStockLabel(stock)}
                  </span>
                </div>

                <div className="product-body">
                  <h2 className="product-name">{productName}</h2>
                  <p className="product-desc">{productDescription}</p>

                  <div className="product-meta">
                    <span className="product-price">${price.toFixed(2)}</span>
                    <span className={`product-stock ${isOutOfStock ? 'out-of-stock' : ''}`}>
                      {isOutOfStock ? 'Unavailable' : 'Ready to order'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className={`btn ${added[product.id] ? 'btn-success' : 'btn-primary'} btn-full`}
                  onClick={() => handleAdd(product)}
                  disabled={isOutOfStock}
                >
                  {isOutOfStock
                    ? 'Out of stock'
                    : added[product.id]
                    ? 'Added!'
                    : 'Add to cart'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}