
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useCart } from '../context/CartContext';

export default function Payment() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const orderItemsCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items]
  );

  const hasLocalProducts = useMemo(
    () => items.some(item => String(item?.id ?? '').startsWith('local-')),
    [items]
  );

  function update(field) {
    return e => {
      let val = e.target.value;

      if (field === 'cardNumber') {
        val = val
          .replace(/\D/g, '')
          .slice(0, 16)
          .replace(/(.{4})/g, '$1 ')
          .trim();
      }

      if (field === 'expiry') {
        val = val
          .replace(/\D/g, '')
          .slice(0, 4)
          .replace(/^(\d{2})(\d)/, '$1/$2');
      }

      if (field === 'cvv') {
        val = val.replace(/\D/g, '').slice(0, 3);
      }

      setForm(prev => ({ ...prev, [field]: val }));

      if (fieldErrors[field]) {
        setFieldErrors(prev => ({ ...prev, [field]: '' }));
      }

      if (error) setError('');
    };
  }

  function isExpiryValid(expiry) {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;

    const [monthStr, yearStr] = expiry.split('/');
    const month = Number(monthStr);
    const year = Number(`20${yearStr}`);

    if (month < 1 || month > 12) return false;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
  }

  function validate() {
    const errors = {};
    const trimmedCardName = form.cardName.trim();
    const cardDigits = form.cardNumber.replace(/\s/g, '');

    if (!trimmedCardName) {
      errors.cardName = 'Cardholder name is required.';
    } else if (trimmedCardName.length < 3) {
      errors.cardName = 'Cardholder name must be at least 3 characters.';
    }

    if (cardDigits.length !== 16) {
      errors.cardNumber = 'Card number must be exactly 16 digits.';
    }

    if (!isExpiryValid(form.expiry)) {
      errors.expiry = 'Enter a valid future expiry date.';
    }

    if (!/^\d{3}$/.test(form.cvv)) {
      errors.cvv = 'CVV must be exactly 3 digits.';
    }

    if (items.length === 0) {
      errors.cart = 'Your cart is empty.';
    }

    if (hasLocalProducts) {
      errors.cart =
        'Your cart contains admin-added local products that are not stored in the backend database. Remove them before checkout.';
    }

    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading || success) return;

    setError('');
    setSuccess('');

    const validationErrors = validate();
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.cart) setError(validationErrors.cart);
      return;
    }

    setLoading(true);

    try {
      const orderPayload = {
        items: items.map(item => ({
          productId: Number(item.id),
          quantity: Number(item.quantity),
          unitPrice: Number(item.price),
        })),
        total: Number(total),
      };

      const { data: orderData } = await api.post('/orders', orderPayload);

      const createdOrderId =
        orderData?.orderId ||
        orderData?.id ||
        orderData?.order?.id ||
        orderData?.order?.orderId;

      if (!createdOrderId) {
        throw new Error('Order ID was not returned by the backend.');
      }

      const cardLast4 = form.cardNumber.replace(/\s/g, '').slice(-4);

      await api.post('/payments', {
        orderId: createdOrderId,
        cardLast4,
      });

      setSuccess('Payment successful!');
      clearCart();

      setTimeout(() => {
        navigate('/products');
      }, 1500);
    } catch (err) {
      console.error('Full payment error:', err);
      console.error('Response data:', err.response?.data);
      console.error('Response status:', err.response?.status);

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Payment failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0 && !success) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Checkout</h1>
        </div>

        <div className="empty-state">
          <p>Your cart is empty.</p>
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
          <h1>Checkout</h1>
          <p className="page-subtitle">
            Complete your order with validated payment details and secure submission
          </p>
        </div>
      </div>

      <div className="checkout-layout">
        <div className="checkout-form-card">
          <h2>Payment details</h2>

          <p className="checkout-security-note">
            Your full card details are not stored and only the last 4 digits are sent to the server.
          </p>

          {hasLocalProducts && (
            <div className="alert alert-warning">
              Checkout is disabled for locally added products because they do not exist in the backend database yet.
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="cardName">Cardholder name</label>
              <input
                id="cardName"
                type="text"
                value={form.cardName}
                onChange={update('cardName')}
                placeholder="Ahmed Nasreldin"
                autoComplete="cc-name"
                disabled={loading || hasLocalProducts}
                className={fieldErrors.cardName ? 'input-error' : ''}
                aria-invalid={!!fieldErrors.cardName}
              />
              {fieldErrors.cardName && (
                <span className="field-error">{fieldErrors.cardName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="cardNumber">Card number</label>
              <input
                id="cardNumber"
                type="text"
                value={form.cardNumber}
                onChange={update('cardNumber')}
                placeholder="1234 5678 9012 3456"
                autoComplete="cc-number"
                inputMode="numeric"
                disabled={loading || hasLocalProducts}
                className={fieldErrors.cardNumber ? 'input-error' : ''}
                aria-invalid={!!fieldErrors.cardNumber}
              />
              {fieldErrors.cardNumber && (
                <span className="field-error">{fieldErrors.cardNumber}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="expiry">Expiry date</label>
                <input
                  id="expiry"
                  type="text"
                  value={form.expiry}
                  onChange={update('expiry')}
                  placeholder="MM/YY"
                  autoComplete="cc-exp"
                  inputMode="numeric"
                  disabled={loading || hasLocalProducts}
                  className={fieldErrors.expiry ? 'input-error' : ''}
                  aria-invalid={!!fieldErrors.expiry}
                />
                {fieldErrors.expiry && (
                  <span className="field-error">{fieldErrors.expiry}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="cvv">CVV</label>
                <input
                  id="cvv"
                  type="password"
                  value={form.cvv}
                  onChange={update('cvv')}
                  placeholder="•••"
                  autoComplete="cc-csc"
                  inputMode="numeric"
                  maxLength={3}
                  disabled={loading || hasLocalProducts}
                  className={fieldErrors.cvv ? 'input-error' : ''}
                  aria-invalid={!!fieldErrors.cvv}
                />
                {fieldErrors.cvv && (
                  <span className="field-error">{fieldErrors.cvv}</span>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !!success || hasLocalProducts}
            >
              {hasLocalProducts
                ? 'Remove local products to continue'
                : loading
                ? 'Processing payment...'
                : `Pay $${Number(total).toFixed(2)}`}
            </button>

            <p className="secure-note">
              Client-side validation improves usability, while order and payment authorization remain enforced by the backend.
            </p>
          </form>
        </div>

        <div className="checkout-summary">
          <h2>Order summary</h2>

          <div className="summary-row">
            <span>Items</span>
            <span>{orderItemsCount}</span>
          </div>

          {items.map(item => {
            const isLocal = String(item?.id ?? '').startsWith('local-');

            return (
              <div key={item.id} className="summary-item">
                <span>
                  {item.name} × {item.quantity}
                  {isLocal ? ' (local)' : ''}
                </span>
                <span>
                  ${(Number(item.price) * Number(item.quantity)).toFixed(2)}
                </span>
              </div>
            );
          })}

          <div className="summary-divider" />

          <div className="summary-row summary-total">
            <span>Total</span>
            <span>${Number(total).toFixed(2)}</span>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-full"
            onClick={() => navigate('/cart')}
            disabled={loading}
          >
            Back to cart
          </button>
        </div>
      </div>
    </div>
  );
}