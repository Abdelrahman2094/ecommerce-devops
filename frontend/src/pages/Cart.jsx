import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const navigate = useNavigate();

  function handleDecrease(item) {
    const currentQuantity = Number(item.quantity) || 1;
    if (currentQuantity <= 1) return;
    updateQuantity(item.id, currentQuantity - 1);
  }

  function handleIncrease(item) {
    const currentQuantity = Number(item.quantity) || 1;
    const maxStock = Number(item.stock) || 0;

    if (currentQuantity >= maxStock) return;
    updateQuantity(item.id, currentQuantity + 1);
  }

  function handleRemove(item) {
    if (window.confirm(`Remove "${item.name}" from cart?`)) {
      removeItem(item.id);
    }
  }

  function handleClearCart() {
    if (window.confirm('Are you sure you want to clear your entire cart?')) {
      clearCart();
    }
  }

  if (items.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Your cart</h1>
        </div>

        <div className="empty-state">
          <p>Your cart is currently empty.</p>

          <button
            className="btn btn-primary"
            onClick={() => navigate('/products')}
            type="button"
          >
            Browse products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Your cart</h1>
          <p className="page-subtitle">
            Review your selected items before proceeding to payment
          </p>
        </div>

        <button className="btn btn-ghost" onClick={handleClearCart} type="button">
          Clear cart
        </button>
      </div>

      <div className="cart-layout">
        <div className="cart-items">
          {items.map(item => {
            const price = Number(item.price) || 0;
            const quantity = Number(item.quantity) || 1;
            const stock = Number(item.stock) || 0;
            const reachedStockLimit = quantity >= stock;

            return (
              <div key={item.id} className="cart-row">
                <div className="cart-info">
                  <span className="cart-name">{item.name}</span>
                  <span className="cart-unit">${price.toFixed(2)} each</span>
                  <span className={`product-stock ${stock === 0 ? 'out-of-stock' : ''}`}>
                    {stock > 0 ? `${stock} available in stock` : 'Out of stock'}
                  </span>
                </div>

                <div className="cart-controls">
                  <button
                    className="qty-btn"
                    onClick={() => handleDecrease(item)}
                    disabled={quantity <= 1}
                    type="button"
                  >
                    −
                  </button>

                  <span className="qty-value">{quantity}</span>

                  <button
                    className="qty-btn"
                    onClick={() => handleIncrease(item)}
                    disabled={reachedStockLimit || stock === 0}
                    type="button"
                    title={reachedStockLimit ? 'You reached the available stock limit' : 'Increase quantity'}
                  >
                    +
                  </button>

                  <span className="cart-line-total">
                    ${(price * quantity).toFixed(2)}
                  </span>

                  <button
                    className="btn-remove"
                    onClick={() => handleRemove(item)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="cart-summary">
          <h2>Order summary</h2>

          <div className="summary-row">
            <span>Items</span>
            <span>{items.length}</span>
          </div>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <div className="summary-divider" />

          <div className="summary-row summary-total">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={() => navigate('/payment')}
            type="button"
          >
            Proceed to payment
          </button>

          <button
            className="btn btn-ghost btn-full"
            onClick={() => navigate('/products')}
            type="button"
          >
            Continue shopping
          </button>

          <p className="secure-note">
            Quantity cannot exceed the available stock shown by the product catalog.
          </p>
        </div>
      </div>
    </div>
  );
}